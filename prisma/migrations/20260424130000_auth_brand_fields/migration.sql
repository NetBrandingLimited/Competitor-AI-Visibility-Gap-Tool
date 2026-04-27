-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "brandName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "category" TEXT;
ALTER TABLE "Organization" ADD COLUMN "competitorA" TEXT;
ALTER TABLE "Organization" ADD COLUMN "competitorB" TEXT;
ALTER TABLE "Organization" ADD COLUMN "competitorC" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
