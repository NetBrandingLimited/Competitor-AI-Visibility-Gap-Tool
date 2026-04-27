-- Encrypted per-org service account credentials (AES-GCM payload strings).
ALTER TABLE "Organization" ADD COLUMN "gscServiceAccountJsonEnc" TEXT;
ALTER TABLE "Organization" ADD COLUMN "ga4ServiceAccountJsonEnc" TEXT;
