import { randomUUID } from 'node:crypto';
import {
   EmotionValence,
   MessageRole,
   Prisma,
   PrismaClient,
   ReminderStatus,
   ReportType,
 } from '@prisma/client';
import { scheduleUserOnboardingJobs } from '../src/lib/queues/scheduler.js';

const prisma = new PrismaClient();


const demoEmail = 'demo.user@example.com';
let onboardingUserId: string | null = null;

function buildVector(dimension: number): number[] {
  return Array.from({ length: dimension }, (_, index) => {
    const radians = index / 10;
    const value = (Math.sin(radians) + 1) / 2; // normalize to [0,1]
    return Number(value.toFixed(6));
  });
}

function toVectorLiteral(values: number[]): string {
  return `[${values.map((value) => value.toFixed(6)).join(',')}]`;
}

async function insertEmbedding(
  tx: Prisma.TransactionClient,
  params: {
    messageId?: string | null;
    insightId?: string | null;
    reportId?: string | null;
    values?: number[];
  },
) {
  const id = randomUUID();
  const vectorValues = params.values ?? buildVector(VECTOR_DIMENSION);
  const dimension = vectorValues.length;
  const literal = toVectorLiteral(vectorValues);
  await tx.$executeRawUnsafe(
    'INSERT INTO "Embedding" ("id", "messageId", "insightId", "reportId", "vector", "dimension", "createdAt") VALUES ($1, $2, $3, $4, $5::vector, $6, $7)',
    id,
    params.messageId ?? null,
    params.insightId ?? null,
    params.reportId ?? null,
    literal,
    dimension,
    new Date(),
  );
}

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.embedding.deleteMany();
    await tx.user.deleteMany({ where: { email: demoEmail } });

    const user = await tx.user.create({
      data: {
        email: demoEmail,
        name: 'Demo User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
        lastSeenAt: new Date(),
      },
    });
    onboardingUserId = user.id;

    await tx.session.create({
      data: {
        userId: user.id,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const conversation = await tx.conversation.create({
      data: {
        userId: user.id,
        title: 'Onboarding with the AI coach',
        summary: 'Initial discussion about goals and wellbeing.',
      },
    });

    const userMessage = await tx.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        role: MessageRole.USER,
        content: 'I would like help staying consistent with my mindfulness practice.',
        metadata: {
          source: 'chat-ui',
        },
      },
    });

    const assistantMessage = await tx.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content:
          'Great! Let’s set a daily reminder and track how you feel before and after each session.',
        metadata: {
          model: 'coach-v1',
        },
      },
    });

    const insight = await tx.insight.create({
      data: {
        userId: user.id,
        conversationId: conversation.id,
        title: 'Mindfulness boosts evening energy',
        summary: 'User reports higher energy in evenings after practicing mindfulness.',
        details:
          'Encourage the user to continue the routine and note energy levels to track improvements.',
        tags: ['mindfulness', 'energy', 'consistency'],
      },
    });

    const goal = await tx.goal.create({
      data: {
        userId: user.id,
        title: 'Practice mindfulness 5 times per week',
        description: 'Use guided sessions to build a sustainable mindfulness routine.',
        targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: ReminderStatus.SCHEDULED,
        progress: 45,
      },
    });

    await tx.commitment.create({
      data: {
        userId: user.id,
        goalId: goal.id,
        description: 'Complete a 10-minute mindfulness session before bedtime.',
        status: ReminderStatus.SCHEDULED,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await tx.emotion.create({
      data: {
        userId: user.id,
        conversationId: conversation.id,
        valence: EmotionValence.POSITIVE,
        intensity: 7,
        note: 'Feeling optimistic after the coaching session.',
        recordedAt: new Date(),
      },
    });

    await tx.energyMetric.create({
      data: {
        userId: user.id,
        value: 7,
        note: 'Energy is higher in the evenings after mindfulness.',
        recordedAt: new Date(),
      },
    });

    await tx.consistencyMetric.create({
      data: {
        userId: user.id,
        score: new Prisma.Decimal('82.5'),
        windowDays: 7,
        note: 'User completed 5 of 7 planned sessions this week.',
      },
    });

    const report = await tx.report.create({
      data: {
        userId: user.id,
        type: ReportType.SEVEN_DAY,
        periodStart: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        summary: 'Weekly wellbeing report summarizing energy and consistency metrics.',
        data: {
          sessionsPlanned: 7,
          sessionsCompleted: 5,
          averageEnergy: 6.8,
          highlights: [
            'Mindfulness practice improves evening energy.',
            'User maintained commitment streak for three consecutive days.',
          ],
        },
      },
    });

    await insertEmbedding(tx, { messageId: assistantMessage.id });
    await insertEmbedding(tx, { insightId: insight.id });
    await insertEmbedding(tx, { reportId: report.id });
  });

  if (onboardingUserId) {
    try {
      await scheduleUserOnboardingJobs(onboardingUserId, { prisma });
      console.log('Queued onboarding BullMQ jobs for demo user.');
    } catch (error) {
      console.warn('Skipping queue scheduling during seed', error);
    }
  }
}

main()
  .then(async () => {
    console.log('Database seeded with demo data.');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Failed to seed database:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
