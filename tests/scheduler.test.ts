import assert from 'node:assert/strict';
import test from 'node:test';
import { REPORT_CADENCE_DAYS, buildReportDefinitions, scheduleReportCadencesForUser, type QueueLike, type ScheduleContext } from '../src/lib/queues/scheduler.js';

class MockQueue implements QueueLike {
  jobs: Array<{ name: string; data: Record<string, unknown>; options?: unknown }> = [];

  async add(name: string, data: Record<string, unknown>, options?: unknown) {
    this.jobs.push({ name, data, options });
    return { id: (options as { jobId?: string } | undefined)?.jobId };
  }
}

test('buildReportDefinitions returns expected cadence', () => {
  const definitions = buildReportDefinitions('user-123');
  assert.equal(definitions.length, REPORT_CADENCE_DAYS.length);
  const cadences = definitions.map((def) => def.cadenceDays);
  assert.deepEqual(cadences, [...REPORT_CADENCE_DAYS]);
  assert.ok(definitions.every((def) => def.queueName === 'reports'));
});

test('scheduleReportCadencesForUser enqueues jobs and records metadata', async () => {
  const queue = new MockQueue();
  const upserts: unknown[] = [];
  const prismaMock = {
    reminderSchedule: {
      async upsert(args: unknown) {
        upserts.push(args);
      },
    },
  } as unknown as ScheduleContext['prisma'];

  const context: ScheduleContext = {
    prisma: prismaMock,
    queues: {
      reports: queue,
    },
  };

  await scheduleReportCadencesForUser('user-456', context);

  assert.equal(queue.jobs.length, REPORT_CADENCE_DAYS.length);
  assert.equal(upserts.length, REPORT_CADENCE_DAYS.length);

  const jobIds = queue.jobs.map((job) => (job.options as { jobId?: string }).jobId);
  assert.ok(jobIds.every((id) => typeof id === 'string' && id?.startsWith('report:user-456')));
});
