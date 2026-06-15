-- Run once in Supabase → SQL Editor (PostgreSQL production schema)
-- Generated from prisma/schema.prisma via: prisma migrate diff --from-empty --to-schema-datamodel

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandName" TEXT,
    "category" TEXT,
    "competitorA" TEXT,
    "competitorB" TEXT,
    "competitorC" TEXT,
    "gscSiteUrl" TEXT,
    "ga4PropertyId" TEXT,
    "gscServiceAccountJsonEnc" TEXT,
    "ga4ServiceAccountJsonEnc" TEXT,
    "connectorTestedAt" TIMESTAMP(3),
    "connectorTestResultsJson" TEXT,
    "connectorSignalsFetchedAt" TIMESTAMP(3),
    "connectorSignalsJson" TEXT,
    "weeklyDigestScheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weeklyDigestScheduleDayUtc" INTEGER NOT NULL DEFAULT 1,
    "weeklyDigestScheduleHourUtc" INTEGER NOT NULL DEFAULT 9,
    "weeklyDigestRefreshPipelineFirst" BOOLEAN NOT NULL DEFAULT false,
    "weeklyDigestNotifyEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "query" TEXT NOT NULL,
    "limitPerConnector" INTEGER NOT NULL,
    "documentCount" INTEGER NOT NULL,
    "triggerCount" INTEGER NOT NULL,
    "clusterCount" INTEGER NOT NULL,
    "ingestionSource" TEXT,
    "gscIngestionDiagnosticsRaw" TEXT,
    "ingestionEventsRaw" TEXT NOT NULL,
    "documentsRaw" TEXT NOT NULL,
    "triggersRaw" TEXT NOT NULL,
    "clustersRaw" TEXT NOT NULL,

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "totalMentions" INTEGER NOT NULL,
    "topBrand" TEXT NOT NULL,
    "topBrandMentions" INTEGER NOT NULL,

    CONSTRAINT "TrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "weeklyDigestId" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "SchedulerJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisibilityScoreSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "inputsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisibilityScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyDigest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summaryJson" TEXT NOT NULL,

    CONSTRAINT "WeeklyDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedPrompt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "label" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "targetSurfacesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnswerSample" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trackedPromptId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "answerText" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnswerSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");
CREATE INDEX "PipelineRun_organizationId_createdAt_idx" ON "PipelineRun"("organizationId", "createdAt");
CREATE INDEX "TrendSnapshot_organizationId_generatedAt_idx" ON "TrendSnapshot"("organizationId", "generatedAt");
CREATE UNIQUE INDEX "TrendSnapshot_organizationId_date_key" ON "TrendSnapshot"("organizationId", "date");
CREATE INDEX "SchedulerJob_organizationId_completedAt_idx" ON "SchedulerJob"("organizationId", "completedAt");
CREATE INDEX "VisibilityScoreSnapshot_organizationId_createdAt_idx" ON "VisibilityScoreSnapshot"("organizationId", "createdAt");
CREATE INDEX "WeeklyDigest_organizationId_generatedAt_idx" ON "WeeklyDigest"("organizationId", "generatedAt");
CREATE INDEX "TrackedPrompt_organizationId_sortOrder_idx" ON "TrackedPrompt"("organizationId", "sortOrder");
CREATE INDEX "AiAnswerSample_organizationId_createdAt_idx" ON "AiAnswerSample"("organizationId", "createdAt");
CREATE INDEX "AiAnswerSample_trackedPromptId_createdAt_idx" ON "AiAnswerSample"("trackedPromptId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrendSnapshot" ADD CONSTRAINT "TrendSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerJob" ADD CONSTRAINT "SchedulerJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisibilityScoreSnapshot" ADD CONSTRAINT "VisibilityScoreSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyDigest" ADD CONSTRAINT "WeeklyDigest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackedPrompt" ADD CONSTRAINT "TrackedPrompt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAnswerSample" ADD CONSTRAINT "AiAnswerSample_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAnswerSample" ADD CONSTRAINT "AiAnswerSample_trackedPromptId_fkey" FOREIGN KEY ("trackedPromptId") REFERENCES "TrackedPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
