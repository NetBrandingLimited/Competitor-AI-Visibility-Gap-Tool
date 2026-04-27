-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "query" TEXT NOT NULL,
    "limitPerConnector" INTEGER NOT NULL,
    "documentCount" INTEGER NOT NULL,
    "triggerCount" INTEGER NOT NULL,
    "clusterCount" INTEGER NOT NULL,
    "ingestionEventsRaw" TEXT NOT NULL,
    "documentsRaw" TEXT NOT NULL,
    "triggersRaw" TEXT NOT NULL,
    "clustersRaw" TEXT NOT NULL,
    CONSTRAINT "PipelineRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrendSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL,
    "totalMentions" INTEGER NOT NULL,
    "topBrand" TEXT NOT NULL,
    "topBrandMentions" INTEGER NOT NULL,
    CONSTRAINT "TrendSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchedulerJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "errorMessage" TEXT,
    CONSTRAINT "SchedulerJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PipelineRun_organizationId_createdAt_idx" ON "PipelineRun"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TrendSnapshot_organizationId_generatedAt_idx" ON "TrendSnapshot"("organizationId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrendSnapshot_organizationId_date_key" ON "TrendSnapshot"("organizationId", "date");

-- CreateIndex
CREATE INDEX "SchedulerJob_organizationId_completedAt_idx" ON "SchedulerJob"("organizationId", "completedAt");
