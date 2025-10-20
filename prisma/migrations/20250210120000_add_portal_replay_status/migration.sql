-- Create enum for replay run status
CREATE TYPE "ReplayRunStatus" AS ENUM ('COMPLETED', 'FAILED', 'RUNNING');

-- Create table storing the latest replay result per feed
CREATE TABLE "PortalReplayStatus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "feed" TEXT NOT NULL,
    "status" "ReplayRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "recordCount" INTEGER,
    "errorCount" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalReplayStatus_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PortalReplayStatus_tenantId_feed_key" UNIQUE ("tenantId", "feed"),
    CONSTRAINT "PortalReplayStatus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "PortalReplayStatus_tenantId_completedAt_idx"
    ON "PortalReplayStatus"("tenantId", "completedAt");
