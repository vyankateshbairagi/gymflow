-- AlterTable
-- Adds Settings > Preferences fields to Organization. Additive only, both
-- with defaults, so existing rows (and existing code that constructs an
-- Organization without these fields) keep working unchanged.
ALTER TABLE "organizations" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "organizations" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
