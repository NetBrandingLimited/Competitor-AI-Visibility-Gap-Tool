-- Link scheduler runs to generated weekly digests.
ALTER TABLE "SchedulerJob" ADD COLUMN "weeklyDigestId" TEXT;
