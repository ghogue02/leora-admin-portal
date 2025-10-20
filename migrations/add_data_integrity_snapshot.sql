-- Add DataIntegritySnapshot table for Phase 9: Data Integrity & Validation

CREATE TABLE IF NOT EXISTS "DataIntegritySnapshot" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalIssues" INTEGER NOT NULL,
    "criticalIssues" INTEGER NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "issuesByRule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataIntegritySnapshot_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "DataIntegritySnapshot_tenantId_idx"
    ON "DataIntegritySnapshot"("tenantId");

CREATE INDEX IF NOT EXISTS "DataIntegritySnapshot_tenantId_snapshotDate_idx"
    ON "DataIntegritySnapshot"("tenantId", "snapshotDate");

-- Add comment
COMMENT ON TABLE "DataIntegritySnapshot" IS 'Stores daily snapshots of data quality metrics and validation results';
