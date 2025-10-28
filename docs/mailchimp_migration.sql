-- Mailchimp Integration Migration
-- Run this SQL manually if automated migration fails

-- Create MailchimpSync table
CREATE TABLE "MailchimpSync" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "listId" TEXT NOT NULL,
    "listName" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailchimpSync_pkey" PRIMARY KEY ("id")
);

-- Create EmailCampaign table
CREATE TABLE "EmailCampaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mailchimpId" TEXT,
    "productIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "targetSegment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "MailchimpSync_tenantId_listId_key" ON "MailchimpSync"("tenantId", "listId");

-- Create regular indexes
CREATE INDEX "MailchimpSync_tenantId_idx" ON "MailchimpSync"("tenantId");
CREATE INDEX "MailchimpSync_isActive_idx" ON "MailchimpSync"("isActive");
CREATE INDEX "EmailCampaign_tenantId_status_idx" ON "EmailCampaign"("tenantId", "status");
CREATE INDEX "EmailCampaign_tenantId_createdAt_idx" ON "EmailCampaign"("tenantId", "createdAt");

-- Add foreign key constraints
ALTER TABLE "MailchimpSync" ADD CONSTRAINT "MailchimpSync_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add comments
COMMENT ON TABLE "MailchimpSync" IS 'Tracks Mailchimp list synchronization status per tenant';
COMMENT ON TABLE "EmailCampaign" IS 'Email marketing campaigns created via Mailchimp';

COMMENT ON COLUMN "MailchimpSync"."syncConfig" IS 'JSON configuration: { syncSegment, includeTags, customFields }';
COMMENT ON COLUMN "EmailCampaign"."productIds" IS 'Array of Product UUIDs featured in campaign';
COMMENT ON COLUMN "EmailCampaign"."targetSegment" IS 'ACTIVE, TARGET, PROSPECT, or custom segment ID';
COMMENT ON COLUMN "EmailCampaign"."status" IS 'Campaign status: draft, scheduled, sent';
