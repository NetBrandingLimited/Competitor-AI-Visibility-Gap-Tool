-- Per-organization weekly digest schedule settings (UTC).
ALTER TABLE "Organization" ADD COLUMN "weeklyDigestScheduleEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "weeklyDigestScheduleDayUtc" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Organization" ADD COLUMN "weeklyDigestScheduleHourUtc" INTEGER NOT NULL DEFAULT 9;
