-- Warehouse and Routing Models Migration
-- This migration adds warehouse configuration, pick sheets, and delivery routing

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "PickSheetStatus" AS ENUM ('DRAFT', 'READY', 'PICKING', 'PICKED', 'CANCELLED');
CREATE TYPE "OrderPickSheetStatus" AS ENUM ('NONE', 'ON_SHEET', 'PICKED');
CREATE TYPE "RouteExportStatus" AS ENUM ('PENDING', 'EXPORTED', 'IMPORTED');
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "StopStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- ============================================================================
-- WAREHOUSE CONFIGURATION
-- ============================================================================

CREATE TABLE "WarehouseConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "aisleCount" INTEGER NOT NULL DEFAULT 10,
    "rowsPerAisle" INTEGER NOT NULL DEFAULT 20,
    "shelfLevels" INTEGER NOT NULL DEFAULT 5,
    "pickStrategy" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseConfig_tenantId_key" ON "WarehouseConfig"("tenantId");
CREATE INDEX "WarehouseConfig_tenantId_idx" ON "WarehouseConfig"("tenantId");

ALTER TABLE "WarehouseConfig" ADD CONSTRAINT "WarehouseConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- INVENTORY LOCATION EXTENSIONS
-- ============================================================================

ALTER TABLE "Inventory" ADD COLUMN "aisle" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "row" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "shelf" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "bin" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "pickOrder" INTEGER;

CREATE INDEX "Inventory_pickOrder_idx" ON "Inventory"("pickOrder");

-- ============================================================================
-- PICK SHEETS
-- ============================================================================

CREATE TABLE "PickSheet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "sheetNumber" TEXT NOT NULL,
    "status" "PickSheetStatus" NOT NULL DEFAULT 'READY',
    "pickerName" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickSheet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PickSheet_tenantId_sheetNumber_key" ON "PickSheet"("tenantId", "sheetNumber");
CREATE INDEX "PickSheet_tenantId_status_idx" ON "PickSheet"("tenantId", "status");
CREATE INDEX "PickSheet_createdAt_idx" ON "PickSheet"("createdAt");

ALTER TABLE "PickSheet" ADD CONSTRAINT "PickSheet_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PICK SHEET ITEMS
-- ============================================================================

CREATE TABLE "PickSheetItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "pickSheetId" UUID NOT NULL,
    "orderLineId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "location" TEXT,
    "pickOrder" INTEGER,
    "isPicked" BOOLEAN NOT NULL DEFAULT false,
    "pickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickSheetItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PickSheetItem_tenantId_pickSheetId_idx" ON "PickSheetItem"("tenantId", "pickSheetId");
CREATE INDEX "PickSheetItem_pickOrder_idx" ON "PickSheetItem"("pickOrder");

ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_pickSheetId_fkey"
    FOREIGN KEY ("pickSheetId") REFERENCES "PickSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_skuId_fkey"
    FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickSheetItem" ADD CONSTRAINT "PickSheetItem_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- ORDER EXTENSIONS
-- ============================================================================

ALTER TABLE "Order" ADD COLUMN "pickSheetStatus" "OrderPickSheetStatus" NOT NULL DEFAULT 'NONE';
CREATE INDEX "Order_pickSheetStatus_idx" ON "Order"("pickSheetStatus");

-- ============================================================================
-- ROUTE EXPORTS
-- ============================================================================

CREATE TABLE "RouteExport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "status" "RouteExportStatus" NOT NULL DEFAULT 'PENDING',
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "exportedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),
    "csvData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RouteExport_tenantId_deliveryDate_idx" ON "RouteExport"("tenantId", "deliveryDate");
CREATE INDEX "RouteExport_status_idx" ON "RouteExport"("status");

ALTER TABLE "RouteExport" ADD CONSTRAINT "RouteExport_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- DELIVERY ROUTES
-- ============================================================================

CREATE TABLE "DeliveryRoute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "routeName" TEXT NOT NULL,
    "driverName" TEXT,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryRoute_tenantId_routeName_deliveryDate_key"
    ON "DeliveryRoute"("tenantId", "routeName", "deliveryDate");
CREATE INDEX "DeliveryRoute_tenantId_deliveryDate_idx" ON "DeliveryRoute"("tenantId", "deliveryDate");
CREATE INDEX "DeliveryRoute_status_idx" ON "DeliveryRoute"("status");

ALTER TABLE "DeliveryRoute" ADD CONSTRAINT "DeliveryRoute_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- ROUTE STOPS
-- ============================================================================

CREATE TABLE "RouteStop" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "stopNumber" INTEGER NOT NULL,
    "estimatedTime" TIMESTAMP(3),
    "actualTime" TIMESTAMP(3),
    "status" "StopStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RouteStop_routeId_stopNumber_key" ON "RouteStop"("routeId", "stopNumber");
CREATE INDEX "RouteStop_tenantId_routeId_idx" ON "RouteStop"("tenantId", "routeId");
CREATE INDEX "RouteStop_orderId_idx" ON "RouteStop"("orderId");
CREATE INDEX "RouteStop_status_idx" ON "RouteStop"("status");

ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "DeliveryRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE "WarehouseConfig" IS 'Warehouse layout configuration per tenant';
COMMENT ON TABLE "PickSheet" IS 'Pick sheets for warehouse order fulfillment';
COMMENT ON TABLE "PickSheetItem" IS 'Individual items on pick sheets, sorted by pickOrder';
COMMENT ON TABLE "RouteExport" IS 'Exported routes to Azuga for optimization';
COMMENT ON TABLE "DeliveryRoute" IS 'Delivery routes with optimized stop sequences';
COMMENT ON TABLE "RouteStop" IS 'Individual stops on delivery routes';

COMMENT ON COLUMN "Inventory"."pickOrder" IS 'Calculated as (aisle × 10000) + (row × 100) + shelf for optimal picking sequence';
COMMENT ON COLUMN "Order"."pickSheetStatus" IS 'Tracks order lifecycle through pick sheet process';
