-- ============================================================================
-- LEORA CRM - DEPLOY PHASES 3, 5, 6, 7
-- Complete database migration for all remaining phases
-- Execute in Supabase SQL Editor: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new
-- ============================================================================

-- ============================================================================
-- PHASE 3: SAMPLES & ANALYTICS
-- ============================================================================

-- Create SampleFeedbackTemplate table
CREATE TABLE IF NOT EXISTS "SampleFeedbackTemplate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("tenantId", "label")
);
CREATE INDEX IF NOT EXISTS "SampleFeedbackTemplate_tenantId_category_idx" ON "SampleFeedbackTemplate"("tenantId", "category");

-- Create SampleMetrics table
CREATE TABLE IF NOT EXISTS "SampleMetrics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "skuId" UUID NOT NULL REFERENCES "Sku"(id) ON DELETE CASCADE,
  "periodStart" TIMESTAMP NOT NULL,
  "periodEnd" TIMESTAMP NOT NULL,
  "totalSamplesGiven" INTEGER DEFAULT 0,
  "totalCustomersSampled" INTEGER DEFAULT 0,
  "samplesResultingInOrder" INTEGER DEFAULT 0,
  "conversionRate" DOUBLE PRECISION DEFAULT 0,
  "totalRevenue" DECIMAL(12,2),
  "avgRevenuePerSample" DECIMAL(12,2),
  "calculatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("tenantId", "skuId", "periodStart")
);
CREATE INDEX IF NOT EXISTS "SampleMetrics_tenantId_periodStart_idx" ON "SampleMetrics"("tenantId", "periodStart");
CREATE INDEX IF NOT EXISTS "SampleMetrics_conversionRate_idx" ON "SampleMetrics"("conversionRate");

-- Add fields to SampleUsage
ALTER TABLE "SampleUsage" ADD COLUMN IF NOT EXISTS "feedbackOptions" JSONB;
ALTER TABLE "SampleUsage" ADD COLUMN IF NOT EXISTS "customerResponse" TEXT;
ALTER TABLE "SampleUsage" ADD COLUMN IF NOT EXISTS "sampleSource" TEXT;

-- Create TriggerType enum
DO $$ BEGIN
  CREATE TYPE "TriggerType" AS ENUM ('SAMPLE_NO_ORDER', 'FIRST_ORDER_FOLLOWUP', 'CUSTOMER_TIMING', 'BURN_RATE_ALERT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create AutomatedTrigger table
CREATE TABLE IF NOT EXISTS "AutomatedTrigger" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "triggerType" "TriggerType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AutomatedTrigger_tenantId_triggerType_idx" ON "AutomatedTrigger"("tenantId", "triggerType");

-- Create TriggeredTask table
CREATE TABLE IF NOT EXISTS "TriggeredTask" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "triggerId" UUID NOT NULL REFERENCES "AutomatedTrigger"(id) ON DELETE CASCADE,
  "taskId" UUID NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  "customerId" UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "triggeredAt" TIMESTAMP DEFAULT NOW(),
  "completedAt" TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TriggeredTask_tenantId_triggerId_idx" ON "TriggeredTask"("tenantId", "triggerId");
CREATE INDEX IF NOT EXISTS "TriggeredTask_customerId_idx" ON "TriggeredTask"("customerId");

-- Add to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "doNotContactUntil" TIMESTAMP;

-- Create Job table for job queue
CREATE TABLE IF NOT EXISTS "Job" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "attempts" INTEGER DEFAULT 0,
  "error" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "completedAt" TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- ============================================================================
-- PHASE 5: OPERATIONS & WAREHOUSE
-- ============================================================================

-- Create enums
DO $$ BEGIN
  CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'PICKED', 'SHIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PickSheetStatus" AS ENUM ('DRAFT', 'READY', 'PICKING', 'PICKED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add to Inventory
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "aisle" TEXT;
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "row" INTEGER;
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "shelf" TEXT;
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "bin" TEXT;
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "status" "InventoryStatus" DEFAULT 'AVAILABLE';
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "pickOrder" INTEGER;

-- Create WarehouseConfig
CREATE TABLE IF NOT EXISTS "WarehouseConfig" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID UNIQUE NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "aisleCount" INTEGER DEFAULT 10,
  "rowsPerAisle" INTEGER DEFAULT 20,
  "shelfLevels" TEXT[] DEFAULT ARRAY['Top', 'Middle', 'Bottom'],
  "pickStrategy" TEXT DEFAULT 'aisle_then_row',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create PickSheet
CREATE TABLE IF NOT EXISTS "PickSheet" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "sheetNumber" TEXT NOT NULL,
  "status" "PickSheetStatus" DEFAULT 'DRAFT',
  "pickerName" TEXT,
  "createdById" UUID NOT NULL REFERENCES "User"(id),
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("tenantId", "sheetNumber")
);
CREATE INDEX IF NOT EXISTS "PickSheet_tenantId_status_idx" ON "PickSheet"("tenantId", "status");

-- Create PickSheetItem
CREATE TABLE IF NOT EXISTS "PickSheetItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "pickSheetId" UUID NOT NULL REFERENCES "PickSheet"(id) ON DELETE CASCADE,
  "orderLineId" UUID NOT NULL REFERENCES "OrderLine"(id) ON DELETE CASCADE,
  "skuId" UUID NOT NULL REFERENCES "Sku"(id),
  "customerId" UUID NOT NULL REFERENCES "Customer"(id),
  "quantity" INTEGER NOT NULL,
  "pickOrder" INTEGER NOT NULL,
  "isPicked" BOOLEAN DEFAULT false,
  "pickedAt" TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PickSheetItem_tenantId_pickSheetId_pickOrder_idx" ON "PickSheetItem"("tenantId", "pickSheetId", "pickOrder");
CREATE INDEX IF NOT EXISTS "PickSheetItem_pickSheetId_idx" ON "PickSheetItem"("pickSheetId");

-- Create DeliveryRoute
CREATE TABLE IF NOT EXISTS "DeliveryRoute" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "routeDate" TIMESTAMP NOT NULL,
  "routeName" TEXT NOT NULL,
  "driverName" TEXT NOT NULL,
  "truckNumber" TEXT,
  "startTime" TIMESTAMP NOT NULL,
  "estimatedEndTime" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("tenantId", "routeDate", "routeName")
);
CREATE INDEX IF NOT EXISTS "DeliveryRoute_tenantId_routeDate_idx" ON "DeliveryRoute"("tenantId", "routeDate");

-- Create RouteStop
CREATE TABLE IF NOT EXISTS "RouteStop" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "routeId" UUID NOT NULL REFERENCES "DeliveryRoute"(id) ON DELETE CASCADE,
  "orderId" UUID NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "stopNumber" INTEGER NOT NULL,
  "estimatedArrival" TIMESTAMP NOT NULL,
  "actualArrival" TIMESTAMP,
  "status" TEXT DEFAULT 'pending',
  "notes" TEXT,
  UNIQUE("routeId", "stopNumber")
);
CREATE INDEX IF NOT EXISTS "RouteStop_tenantId_routeId_idx" ON "RouteStop"("tenantId", "routeId");
CREATE INDEX IF NOT EXISTS "RouteStop_orderId_idx" ON "RouteStop"("orderId");

-- Create RouteExport
CREATE TABLE IF NOT EXISTS "RouteExport" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "exportDate" TIMESTAMP DEFAULT NOW(),
  "orderCount" INTEGER NOT NULL,
  "filename" TEXT NOT NULL,
  "exportedBy" UUID NOT NULL REFERENCES "User"(id)
);
CREATE INDEX IF NOT EXISTS "RouteExport_tenantId_exportDate_idx" ON "RouteExport"("tenantId", "exportDate");

-- Add to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickSheetStatus" TEXT DEFAULT 'not_picked';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickSheetId" UUID;

-- ============================================================================
-- PHASE 6: MAPS & TERRITORY
-- ============================================================================

-- Add geocoding to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "geocodedAt" TIMESTAMP;

-- Create Territory table
CREATE TABLE IF NOT EXISTS "Territory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "salesRepId" UUID REFERENCES "SalesRep"(id) ON DELETE SET NULL,
  "boundaries" JSONB,
  "color" TEXT DEFAULT '#3b82f6',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("tenantId", "name")
);
CREATE INDEX IF NOT EXISTS "Territory_tenantId_idx" ON "Territory"("tenantId");
CREATE INDEX IF NOT EXISTS "Territory_salesRepId_idx" ON "Territory"("salesRepId");

-- Create GeocodingCache table
CREATE TABLE IF NOT EXISTS "GeocodingCache" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "address" TEXT UNIQUE NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "formattedAddress" TEXT NOT NULL,
  "cachedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "GeocodingCache_address_idx" ON "GeocodingCache"("address");
CREATE INDEX IF NOT EXISTS "GeocodingCache_cachedAt_idx" ON "GeocodingCache"("cachedAt");

-- ============================================================================
-- PHASE 7: ADVANCED FEATURES
-- ============================================================================

-- Create ImageScan table
CREATE TABLE IF NOT EXISTS "ImageScan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id),
  "imageUrl" TEXT NOT NULL,
  "scanType" TEXT NOT NULL,
  "extractedData" JSONB NOT NULL DEFAULT '{}',
  "customerId" UUID REFERENCES "Customer"(id) ON DELETE SET NULL,
  "status" TEXT DEFAULT 'processing',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "completedAt" TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ImageScan_tenantId_userId_idx" ON "ImageScan"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "ImageScan_status_idx" ON "ImageScan"("status");

-- Create MailchimpSync table
CREATE TABLE IF NOT EXISTS "MailchimpSync" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "listId" TEXT NOT NULL,
  "listName" TEXT NOT NULL,
  "lastSyncAt" TIMESTAMP,
  "isActive" BOOLEAN DEFAULT true,
  "syncConfig" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("tenantId", "listId")
);
CREATE INDEX IF NOT EXISTS "MailchimpSync_tenantId_idx" ON "MailchimpSync"("tenantId");

-- Create EmailCampaign table
CREATE TABLE IF NOT EXISTS "EmailCampaign" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "mailchimpId" TEXT,
  "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "targetSegment" TEXT,
  "status" TEXT DEFAULT 'draft',
  "sentAt" TIMESTAMP,
  "createdById" UUID NOT NULL REFERENCES "User"(id),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "EmailCampaign_tenantId_status_idx" ON "EmailCampaign"("tenantId", "status");

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables created
SELECT 'Phase 3 Tables:' as check_type;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('SampleFeedbackTemplate', 'SampleMetrics', 'AutomatedTrigger', 'TriggeredTask', 'Job')
ORDER BY table_name;

SELECT 'Phase 5 Tables:' as check_type;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('WarehouseConfig', 'PickSheet', 'PickSheetItem', 'DeliveryRoute', 'RouteStop', 'RouteExport')
ORDER BY table_name;

SELECT 'Phase 6 Tables:' as check_type;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('Territory', 'GeocodingCache')
ORDER BY table_name;

SELECT 'Phase 7 Tables:' as check_type;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ImageScan', 'MailchimpSync', 'EmailCampaign')
ORDER BY table_name;

-- ============================================================================
-- COMPLETE!
-- Now run: npx prisma db pull && npx prisma generate
-- ============================================================================
