-- CreateTable
CREATE TABLE "AiAnswerSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "trackedPromptId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "answerText" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAnswerSample_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiAnswerSample_trackedPromptId_fkey" FOREIGN KEY ("trackedPromptId") REFERENCES "TrackedPrompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiAnswerSample_organizationId_createdAt_idx" ON "AiAnswerSample"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAnswerSample_trackedPromptId_createdAt_idx" ON "AiAnswerSample"("trackedPromptId", "createdAt");
