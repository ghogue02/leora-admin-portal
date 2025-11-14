-- Migration: product-field-registry
-- Create ProductField registry tables for dynamic product metadata

-- Create enums (if not exists)
DO $$ BEGIN
  CREATE TYPE "ProductFieldScope" AS ENUM ('PRODUCT', 'SKU', 'PRICING', 'INVENTORY', 'SALES');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductFieldInputType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE', 'RICH_TEXT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ProductFieldDefinition table
CREATE TABLE "ProductFieldDefinition" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "key" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "section" TEXT,
  "scope" "ProductFieldScope" NOT NULL DEFAULT 'PRODUCT',
  "inputType" "ProductFieldInputType" NOT NULL DEFAULT 'TEXT',
  "supportsManualEntry" BOOLEAN NOT NULL DEFAULT true,
  "defaultVisibility" BOOLEAN NOT NULL DEFAULT true,
  "defaultRequired" BOOLEAN NOT NULL DEFAULT false,
  "defaultDisplayOrder" INTEGER,
  "showInPortalByDefault" BOOLEAN NOT NULL DEFAULT false,
  "filterableByDefault" BOOLEAN NOT NULL DEFAULT false,
  "defaultValue" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ProductFieldDefinition_scope_idx" ON "ProductFieldDefinition"("scope");

-- Create ProductFieldOption table
CREATE TABLE "ProductFieldOption" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fieldId" UUID NOT NULL REFERENCES "ProductFieldDefinition"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("fieldId", "value")
);

CREATE INDEX "ProductFieldOption_fieldId_sortOrder_idx" ON "ProductFieldOption"("fieldId", "sortOrder");

-- Create TenantProductFieldConfig table
CREATE TABLE "TenantProductFieldConfig" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "fieldId" UUID NOT NULL REFERENCES "ProductFieldDefinition"("id") ON DELETE CASCADE,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER,
  "showInPortal" BOOLEAN NOT NULL DEFAULT false,
  "filterable" BOOLEAN NOT NULL DEFAULT false,
  "customLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "fieldId")
);

CREATE INDEX "TenantProductFieldConfig_tenantId_idx" ON "TenantProductFieldConfig"("tenantId");
CREATE INDEX "TenantProductFieldConfig_fieldId_idx" ON "TenantProductFieldConfig"("fieldId");

-- Record migration in Prisma tracking
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid()::text,
  'product_field_registry_psql_application',
  NOW(),
  '20251113000000_product_field_registry',
  'Product field registry migration applied via psql',
  NULL,
  NOW(),
  1
);
