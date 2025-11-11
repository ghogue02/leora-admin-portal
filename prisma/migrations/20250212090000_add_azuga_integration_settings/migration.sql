-- Create enums for Azuga integration tracking
CREATE TYPE "AzugaIntegrationStatus" AS ENUM ('PENDING', 'DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR');
CREATE TYPE "AzugaAuthType" AS ENUM ('CREDENTIALS', 'API_KEY');

-- Store per-tenant Azuga configuration and encrypted secrets
CREATE TABLE "AzugaIntegrationSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "status" "AzugaIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "authType" "AzugaAuthType" NOT NULL DEFAULT 'CREDENTIALS',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "loginUsername" TEXT,
    "encryptedLoginPassword" TEXT,
    "encryptedApiKey" TEXT,
    "encryptedWebhookSecret" TEXT,
    "webhookAuthType" TEXT DEFAULT 'BASIC',
    "webhookUrl" TEXT,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 1,
    "isTelematicsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isRouteExportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isRouteImportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isWebhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastConnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AzugaIntegrationSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AzugaIntegrationSettings_tenantId_key" UNIQUE ("tenantId"),
    CONSTRAINT "AzugaIntegrationSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "AzugaIntegrationSettings_tenantId_idx"
    ON "AzugaIntegrationSettings"("tenantId");
