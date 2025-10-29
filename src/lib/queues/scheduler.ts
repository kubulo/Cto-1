import { JobsOptions } from 'bullmq';
import { Prisma } from '@prisma/client';
import { getImmediateQueue, getRemindersQueue, getReportsQueue, QUEUE_NAMES } from './index.js';
import { prisma } from '../prisma.js';

export const REPORT_CADENCE_DAYS = [2, 7, 21] as const;

const DAY_IN_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_IMMEDIATE_DELAY_MS = 60 * 60 * 1_000; // 1 hour

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type QueueLike = {
  add: (name: string, data: Record<string, unknown>, opts?: JobsOptions) => Promise<{ id?: string } | void>;
};

type ScheduleJobDefinition = {
  queueName: QueueName;
  jobName: string;
  jobId: string;
  data: Record<string, unknown>;
  options: JobsOptions;
  cadenceDays?: number;
  nextRunAt?: Date;
  metadata?: Record<string, unknown>;
  userId?: string;
};

export type ScheduleContext = {
  prisma?: typeof prisma;
  queues?: Partial<Record<QueueName, QueueLike>>;
};

function resolveQueue(name: QueueName, context?: ScheduleContext): QueueLike {
  const override = context?.queues?.[name];
  if (override) {
    return override;
  }

  switch (name) {
    case QUEUE_NAMES.immediate:
      return getImmediateQueue();
    case QUEUE_NAMES.reports:
      return getReportsQueue();
    case QUEUE_NAMES.reminders:
    default:
      return getRemindersQueue();
  }
}

function computeNextRun(options: JobsOptions | undefined): Date {
  if (options?.repeat?.every) {
    return new Date(Date.now() + options.repeat.every);
  }

  if (options?.delay) {
    return new Date(Date.now() + options.delay);
  }

  return new Date();
}

function buildScheduleUpsert(definition: ScheduleJobDefinition, nextRunAt: Date) {
  const metadata = (definition.metadata ?? definition.data) as Prisma.JsonValue;
  return {
    where: { jobId: definition.jobId },
    update: {
      userId: definition.userId ?? null,
      queue: definition.queueName,
      jobName: definition.jobName,
      cadenceDays: definition.cadenceDays ?? null,
      metadata,
      nextRunAt,
      lastStatus: 'scheduled',
    },
    create: {
      jobId: definition.jobId,
      userId: definition.userId ?? null,
      queue: definition.queueName,
      jobName: definition.jobName,
      cadenceDays: definition.cadenceDays ?? null,
      metadata,
      nextRunAt,
      lastStatus: 'scheduled',
    },
  } as const;
}

async function enqueueDefinition(definition: ScheduleJobDefinition, context?: ScheduleContext): Promise<void> {
  const queue = resolveQueue(definition.queueName, context);
  const nextRunAt = definition.nextRunAt ?? computeNextRun(definition.options);
  const db = context?.prisma ?? prisma;

  await queue.add(definition.jobName, definition.data, definition.options);
  await db.reminderSchedule.upsert(buildScheduleUpsert(definition, nextRunAt));
}

export function buildReportDefinitions(userId: string): ScheduleJobDefinition[] {
  return REPORT_CADENCE_DAYS.map((days) => {
    const every = days * DAY_IN_MS;
    const jobId = `report:${userId}:${days}`;

    return {
      queueName: QUEUE_NAMES.reports,
      jobName: 'generate-report',
      jobId,
      userId,
      cadenceDays: days,
      data: {
        userId,
        cadenceDays: days,
        scheduleKey: jobId,
      },
      metadata: {
        type: 'report',
        cadenceDays: days,
      },
      options: {
        jobId,
        repeat: {
          every,
        },
        removeOnComplete: true,
      },
    } satisfies ScheduleJobDefinition;
  });
}

export function buildImmediateReminder(userId: string, delayMs = DEFAULT_IMMEDIATE_DELAY_MS): ScheduleJobDefinition {
  const jobId = `reminder:immediate:${userId}`;

  return {
    queueName: QUEUE_NAMES.immediate,
    jobName: 'send-onboarding-reminder',
    jobId,
    userId,
    data: {
      userId,
      reason: 'onboarding',
      scheduleKey: jobId,
    },
    metadata: {
      type: 'reminder',
      reason: 'onboarding',
    },
    options: {
      jobId,
      delay: delayMs,
      removeOnComplete: true,
    },
  } satisfies ScheduleJobDefinition;
}

export function buildDailyReminder(userId: string): ScheduleJobDefinition {
  const jobId = `reminder:daily:${userId}`;

  return {
    queueName: QUEUE_NAMES.reminders,
    jobName: 'send-daily-reminder',
    jobId,
    userId,
    cadenceDays: 1,
    data: {
      userId,
      cadenceDays: 1,
      scheduleKey: jobId,
    },
    metadata: {
      type: 'reminder',
      cadenceDays: 1,
    },
    options: {
      jobId,
      repeat: {
        every: DAY_IN_MS,
      },
      removeOnComplete: true,
    },
  } satisfies ScheduleJobDefinition;
}

export async function scheduleReportCadencesForUser(userId: string, context?: ScheduleContext): Promise<void> {
  const definitions = buildReportDefinitions(userId);
  for (const definition of definitions) {
    await enqueueDefinition(definition, context);
  }
}

export async function scheduleReminderOnboarding(userId: string, context?: ScheduleContext): Promise<void> {
  const immediate = buildImmediateReminder(userId);
  const daily = buildDailyReminder(userId);

  await enqueueDefinition(immediate, context);
  await enqueueDefinition(daily, context);
}

export async function scheduleUserOnboardingJobs(userId: string, context?: ScheduleContext): Promise<void> {
  await scheduleReminderOnboarding(userId, context);
  await scheduleReportCadencesForUser(userId, context);
}
