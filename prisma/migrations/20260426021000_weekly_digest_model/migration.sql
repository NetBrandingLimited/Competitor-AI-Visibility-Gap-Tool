-- Weekly digest snapshots per organization.
CREATE TABLE "WeeklyDigest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "periodStart" TEXT NOT NULL,
  "periodEnd" TEXT NOT NULL,
  "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summaryJson" TEXT NOT NULL,
  CONSTRAINT "WeeklyDigest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WeeklyDigest_organizationId_generatedAt_idx"
  ON "WeeklyDigest"("organizationId", "generatedAt");
