import { Queue, JobsOptions } from 'bullmq';
import type { QueueOptions } from 'bullmq';
import { getSharedRedisConnection } from './redis.js';

export const QUEUE_NAMES = {
  reminders: 'reminders',
  reports: 'reports',
  immediate: 'immediate',
} as const;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1_000,
  },
  removeOnComplete: {
    age: 60 * 60,
  },
  removeOnFail: {
    age: 24 * 60 * 60,
  },
};

const queueCache = new Map<string, Queue>();

function buildQueueOptions(queueName: string): QueueOptions {
  return {
    connection: getSharedRedisConnection(),
    defaultJobOptions,
    prefix: `bull:${queueName}`,
  };
}

export function getQueue(name: string): Queue {
  const existing = queueCache.get(name);
  if (existing) {
    return existing;
  }

  const queue = new Queue(name, buildQueueOptions(name));
  queueCache.set(name, queue);
  return queue;
}

export function getRemindersQueue(): Queue {
  return getQueue(QUEUE_NAMES.reminders);
}

export function getReportsQueue(): Queue {
  return getQueue(QUEUE_NAMES.reports);
}

export function getImmediateQueue(): Queue {
  return getQueue(QUEUE_NAMES.immediate);
}
