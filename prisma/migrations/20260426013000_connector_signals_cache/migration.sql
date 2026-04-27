-- Cache last fetched live connector signals per organization.
ALTER TABLE "Organization" ADD COLUMN "connectorSignalsFetchedAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "connectorSignalsJson" TEXT;
