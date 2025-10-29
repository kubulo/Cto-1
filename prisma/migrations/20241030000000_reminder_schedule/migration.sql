-- Create reminder scheduling table to track BullMQ jobs
CREATE TABLE "ReminderSchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "queue" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cadenceDays" INTEGER,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReminderSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReminderSchedule_jobId_key" ON "ReminderSchedule" ("jobId");
CREATE INDEX "ReminderSchedule_userId_idx" ON "ReminderSchedule" ("userId");
CREATE INDEX "ReminderSchedule_queue_jobName_idx" ON "ReminderSchedule" ("queue", "jobName");

ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
