import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { scheduleUserOnboardingJobs } from '../lib/queues/scheduler.js';

export async function enqueueOnboardingForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  await scheduleUserOnboardingJobs(user.id);
  return user;
}

type OnboardingRequest = {
  userId?: string;
  email?: string;
  name?: string | null;
};

export async function POST(request: Request): Promise<Response> {
  const payload = (await request.json()) as OnboardingRequest;

  if (!payload.userId && !payload.email) {
    return new Response(
      JSON.stringify({ error: 'Provide either userId or email to schedule onboarding.' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  let user = null;

  if (payload.userId) {
    user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found.' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
  } else if (payload.email) {
    user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {},
      create: {
        email: payload.email,
        name: payload.name ?? null,
        lastSeenAt: new Date(),
      },
    });
  }

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unable to find or create user.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  await scheduleUserOnboardingJobs(user.id);

  return new Response(
    JSON.stringify({ userId: user.id, queued: true }),
    {
      status: 201,
      headers: { 'content-type': 'application/json' },
    },
  );
}

export async function createUserWithOnboarding(email: string, name?: string | null) {
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      name: name ?? null,
      lastSeenAt: new Date(),
    },
  });

  await scheduleUserOnboardingJobs(user.id);
  return user;
}
