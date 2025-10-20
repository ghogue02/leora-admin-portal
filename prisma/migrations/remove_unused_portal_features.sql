-- Migration: Remove Unused Portal Features
-- Date: 2025-10-18
-- Description: Removes database models that were claimed to be removed but still existed in schema
--
-- REMOVED MODELS:
-- - PortalFavorite
-- - PortalPaymentMethod
-- - PortalReplayStatus (and ReplayRunStatus enum)
-- - SupportTicket
-- - SupportTicketAttachment (and SupportTicketStatus enum)
--
-- IMPORTANT: Review this migration carefully before applying!
-- These tables may contain data that should be backed up first.

-- ============================================================================
-- STEP 1: BACKUP DATA (if any exists)
-- ============================================================================

-- Check if tables have data before dropping
-- SELECT COUNT(*) FROM "PortalFavorite";
-- SELECT COUNT(*) FROM "PortalPaymentMethod";
-- SELECT COUNT(*) FROM "PortalReplayStatus";
-- SELECT COUNT(*) FROM "SupportTicket";
-- SELECT COUNT(*) FROM "SupportTicketAttachment";

-- If you need to backup, uncomment and run:
-- CREATE TABLE "PortalFavorite_backup" AS SELECT * FROM "PortalFavorite";
-- CREATE TABLE "PortalPaymentMethod_backup" AS SELECT * FROM "PortalPaymentMethod";
-- CREATE TABLE "PortalReplayStatus_backup" AS SELECT * FROM "PortalReplayStatus";
-- CREATE TABLE "SupportTicket_backup" AS SELECT * FROM "SupportTicket";
-- CREATE TABLE "SupportTicketAttachment_backup" AS SELECT * FROM "SupportTicketAttachment";

-- ============================================================================
-- STEP 2: DROP TABLES
-- ============================================================================

-- Drop tables in order (respecting foreign key constraints)
DROP TABLE IF EXISTS "SupportTicketAttachment" CASCADE;
DROP TABLE IF EXISTS "SupportTicket" CASCADE;
DROP TABLE IF EXISTS "PortalReplayStatus" CASCADE;
DROP TABLE IF EXISTS "PortalPaymentMethod" CASCADE;
DROP TABLE IF EXISTS "PortalFavorite" CASCADE;

-- ============================================================================
-- STEP 3: DROP ENUMS
-- ============================================================================

DROP TYPE IF EXISTS "SupportTicketStatus";
DROP TYPE IF EXISTS "ReplayRunStatus";

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables are gone
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%Portal%';
-- SELECT typname FROM pg_type WHERE typname IN ('SupportTicketStatus', 'ReplayRunStatus');

-- ============================================================================
-- NOTES
-- ============================================================================
-- After applying this migration:
-- 1. Run: npx prisma generate
-- 2. Restart your Next.js dev server
-- 3. Verify no code references these models
-- 4. Remove backup tables after confirming everything works:
--    DROP TABLE "PortalFavorite_backup";
--    DROP TABLE "PortalPaymentMethod_backup";
--    DROP TABLE "PortalReplayStatus_backup";
--    DROP TABLE "SupportTicket_backup";
--    DROP TABLE "SupportTicketAttachment_backup";
