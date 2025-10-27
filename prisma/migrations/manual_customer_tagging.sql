-- Manual Migration: Add Customer Tagging System
-- Created: 2025-10-27
-- Description: Adds TagDefinition, CustomerTag tables and event sale fields to Order

-- Create TagDefinition table
CREATE TABLE "TagDefinition" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'SEGMENT',
    "color" TEXT,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TagDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "TagDefinition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TagDefinition"("id") ON DELETE SET NULL
);

-- Create CustomerTag table
CREATE TABLE "CustomerTag" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "tagDefinitionId" UUID,
    "tagType" TEXT NOT NULL,
    "tagValue" TEXT,
    "source" TEXT DEFAULT 'MANUAL',
    "addedBy" UUID,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "lastOrderAt" TIMESTAMP(3),
    CONSTRAINT "CustomerTag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE,
    CONSTRAINT "CustomerTag_tagDefinitionId_fkey" FOREIGN KEY ("tagDefinitionId") REFERENCES "TagDefinition"("id") ON DELETE SET NULL,
    CONSTRAINT "CustomerTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Add event sale fields to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isEventSale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "eventType" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "eventNotes" TEXT;

-- Create indexes for TagDefinition
CREATE UNIQUE INDEX "TagDefinition_tenantId_code_key" ON "TagDefinition"("tenantId", "code");
CREATE INDEX "TagDefinition_tenantId_idx" ON "TagDefinition"("tenantId");
CREATE INDEX "TagDefinition_category_idx" ON "TagDefinition"("category");
CREATE INDEX "TagDefinition_parentId_idx" ON "TagDefinition"("parentId");

-- Create indexes for CustomerTag
CREATE UNIQUE INDEX "CustomerTag_tenantId_customerId_tagType_removedAt_key" ON "CustomerTag"("tenantId", "customerId", "tagType", "removedAt");
CREATE INDEX "CustomerTag_tenantId_idx" ON "CustomerTag"("tenantId");
CREATE INDEX "CustomerTag_customerId_idx" ON "CustomerTag"("customerId");
CREATE INDEX "CustomerTag_tagType_idx" ON "CustomerTag"("tagType");
CREATE INDEX "CustomerTag_tagType_totalRevenue_idx" ON "CustomerTag"("tagType", "totalRevenue" DESC);
CREATE INDEX "CustomerTag_removedAt_idx" ON "CustomerTag"("removedAt");
CREATE INDEX "CustomerTag_tagDefinitionId_idx" ON "CustomerTag"("tagDefinitionId");

-- Create index for Order event sales
CREATE INDEX "Order_isEventSale_idx" ON "Order"("isEventSale");
