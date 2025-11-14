-- Product Export job enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductExportFormat') THEN
    CREATE TYPE "ProductExportFormat" AS ENUM ('CSV', 'PDF', 'EXCEL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductExportStatus') THEN
    CREATE TYPE "ProductExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;
END $$;

-- ProductExportJob table
CREATE TABLE IF NOT EXISTS "ProductExportJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "jobId" UUID,
  "format" "ProductExportFormat" NOT NULL,
  "status" "ProductExportStatus" NOT NULL DEFAULT 'QUEUED',
  "filters" JSONB,
  "filePath" TEXT,
  "fileUrl" TEXT,
  "rowCount" INTEGER,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ProductExportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductExportJob_tenant_idx" ON "ProductExportJob" ("tenantId");
CREATE INDEX IF NOT EXISTS "ProductExportJob_createdBy_idx" ON "ProductExportJob" ("createdByUserId");
CREATE INDEX IF NOT EXISTS "ProductExportJob_job_idx" ON "ProductExportJob" ("jobId");

ALTER TABLE "ProductExportJob"
  ADD CONSTRAINT "ProductExportJob_tenant_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

ALTER TABLE "ProductExportJob"
  ADD CONSTRAINT "ProductExportJob_createdBy_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "ProductExportJob"
  ADD CONSTRAINT "ProductExportJob_job_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL;
