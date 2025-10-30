-- Create DataIntegritySnapshot table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "DataIntegritySnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalIssues" INTEGER NOT NULL,
    "criticalIssues" INTEGER NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "issuesByRule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataIntegritySnapshot_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "DataIntegritySnapshot_tenantId_idx"
ON "DataIntegritySnapshot"("tenantId");

CREATE INDEX IF NOT EXISTS "DataIntegritySnapshot_tenantId_snapshotDate_idx"
ON "DataIntegritySnapshot"("tenantId", "snapshotDate");

-- Add foreign key
ALTER TABLE "DataIntegritySnapshot"
ADD CONSTRAINT IF NOT EXISTS "DataIntegritySnapshot_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE;

-- Verify table was created
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'DataIntegritySnapshot'
ORDER BY ordinal_position;
