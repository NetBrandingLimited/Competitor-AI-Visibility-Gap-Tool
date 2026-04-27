-- Cache connector credential test status on organization.
ALTER TABLE "Organization" ADD COLUMN "connectorTestedAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "connectorTestResultsJson" TEXT;
