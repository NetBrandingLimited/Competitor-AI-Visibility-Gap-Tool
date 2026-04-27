-- CreateTable
CREATE TABLE "VisibilityScoreSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "inputsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisibilityScoreSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VisibilityScoreSnapshot_organizationId_createdAt_idx" ON "VisibilityScoreSnapshot"("organizationId", "createdAt");
