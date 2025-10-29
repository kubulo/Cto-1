import 'dotenv/config';
import { Worker, QueueScheduler, JobsOptions, Job } from 'bullmq';
import { createRedisConnection, closeSharedRedisConnection, getRedisUrl } from '../src/lib/queues/redis.js';
import { QUEUE_NAMES } from '../src/lib/queues/index.js';
import { prisma } from '../src/lib/prisma.js';
import { reportService } from '../src/services/report-service.js';

const schedulers: QueueScheduler[] = [];
const workers: Array<Worker<any, any, string>> = [];

function computeNextRun(job: Job, options?: JobsOptions): Date | null {
  const repeatEvery = options?.repeat?.every ?? job.opts.repeat?.every;
  if (repeatEvery) {
    return new Date(Date.now() + repeatEvery);
  }

  const delay = options?.delay ?? job.opts.delay;
  if (delay) {
    return new Date(Date.now() + delay);
  }

  return null;
}

async function markSchedule(job: Job, status: 'completed' | 'failed'): Promise<void> {
  const scheduleKey = (job.data?.scheduleKey as string | undefined) ?? job.id ?? undefined;
  if (!scheduleKey) {
    return;
  }

  const nextRunAt = computeNextRun(job);

  try {
    await prisma.reminderSchedule.update({
      where: { jobId: scheduleKey },
      data: {
        lastRunAt: new Date(),
        lastStatus: status,
        nextRunAt,
      },
    });
  } catch (error) {
    console.warn('[worker] unable to update reminder schedule', scheduleKey, error);
  }
}

async function startSchedulers(): Promise<void> {
  for (const name of Object.values(QUEUE_NAMES)) {
    const scheduler = new QueueScheduler(name, {
      connection: createRedisConnection(),
    });
    schedulers.push(scheduler);
    await scheduler.waitUntilReady();
  }
}

async function registerWorkers(): Promise<void> {
  const reminderWorker = new Worker(
    QUEUE_NAMES.reminders,
    async (job) => {
      const { userId, cadenceDays } = job.data as { userId: string; cadenceDays?: number };
      console.log(`[worker] sending reminder for user ${userId} (${cadenceDays ?? 'one-off'})`);
      await markSchedule(job, 'completed');
    },
    { connection: createRedisConnection(), concurrency: 4 },
  );

  const reportWorker = new Worker(
    QUEUE_NAMES.reports,
    async (job) => {
      const { userId, cadenceDays } = job.data as { userId: string; cadenceDays: number };
      console.log(`[worker] generating ${cadenceDays}-day report for user ${userId}`);
      const report = await reportService.generateCycleReport(userId, cadenceDays);
      console.log(`[worker] report ${report.id} created (${report.type})`);
      await markSchedule(job, 'completed');
      return { reportId: report.id };
    },
    { connection: createRedisConnection(), concurrency: 2 },
  );

  const immediateWorker = new Worker(
    QUEUE_NAMES.immediate,
    async (job) => {
      const { userId, reason } = job.data as { userId: string; reason?: string };
      console.log(`[worker] immediate reminder for user ${userId} (${reason ?? 'unspecified'})`);
      await markSchedule(job, 'completed');
    },
    { connection: createRedisConnection(), concurrency: 2 },
  );

  const onFailure = async (job: Job | undefined, error: Error) => {
    if (job) {
      await markSchedule(job, 'failed');
    }
    console.error('[worker] job failed', error);
  };

  for (const worker of [reminderWorker, reportWorker, immediateWorker]) {
    worker.on('failed', onFailure);
    workers.push(worker);
    await worker.waitUntilReady();
  }
}

async function shutdown(code = 0) {
  console.log('[worker] shutting down');
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all(schedulers.map((scheduler) => scheduler.close()));
  await closeSharedRedisConnection();
  await prisma.$disconnect();
  process.exit(code);
}

process.on('SIGINT', () => {
  void shutdown(0);
});

process.on('SIGTERM', () => {
  void shutdown(0);
});

process.on('unhandledRejection', (error) => {
  console.error('[worker] unhandled rejection', error);
  void shutdown(1);
});

process.on('uncaughtException', (error) => {
  console.error('[worker] uncaught exception', error);
  void shutdown(1);
});

async function main() {
  console.log('[worker] starting BullMQ worker');
  console.log(`[worker] redis url ${getRedisUrl()}`);
  await startSchedulers();
  await registerWorkers();
  console.log('[worker] workers ready');
}

main().catch((error) => {
  console.error('[worker] failed to start', error);
  void shutdown(1);
});
