-- Add org-scoped connector identifiers so each tenant can configure its own properties.
ALTER TABLE "Organization" ADD COLUMN "gscSiteUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "ga4PropertyId" TEXT;
