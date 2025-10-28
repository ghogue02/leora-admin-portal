-- Phase 3: Marketing & Communications System
-- Create enums for email and SMS statuses
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED');
CREATE TYPE "SMSDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "SMSStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RECEIVED');

-- EmailList table for managing customer email lists
CREATE TABLE "EmailList" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" UUID,
    "isSmartList" BOOLEAN NOT NULL DEFAULT false,
    "smartCriteria" JSONB,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailList_pkey" PRIMARY KEY ("id")
);

-- EmailListMember for list membership
CREATE TABLE "EmailListMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailListMember_pkey" PRIMARY KEY ("id")
);

-- EmailTemplate for reusable email templates
CREATE TABLE "EmailTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- EmailCampaignList for tracking campaign performance by list
CREATE TABLE "EmailCampaignList" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION,
    "clickRate" DOUBLE PRECISION,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaignList_pkey" PRIMARY KEY ("id")
);

-- EmailMessage for individual email tracking
CREATE TABLE "EmailMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "activityId" UUID,
    "templateId" UUID,
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- SMSConversation for grouping SMS messages by customer
CREATE TABLE "SMSConversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSConversation_pkey" PRIMARY KEY ("id")
);

-- SMSMessage for individual text messages
CREATE TABLE "SMSMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "direction" "SMSDirection" NOT NULL,
    "status" "SMSStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "activityId" UUID,
    "externalId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SMSMessage_pkey" PRIMARY KEY ("id")
);

-- SMSTemplate for reusable SMS templates
CREATE TABLE "SMSTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSTemplate_pkey" PRIMARY KEY ("id")
);

-- MailchimpConnection for OAuth integration
CREATE TABLE "MailchimpConnection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "accessToken" TEXT NOT NULL,
    "serverPrefix" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "audienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailchimpConnection_pkey" PRIMARY KEY ("id")
);

-- CommunicationPreference for opt-in/out management
CREATE TABLE "CommunicationPreference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferredTime" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationPreference_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "EmailList_tenantId_name_key" ON "EmailList"("tenantId", "name");
CREATE UNIQUE INDEX "EmailListMember_listId_customerId_key" ON "EmailListMember"("listId", "customerId");
CREATE UNIQUE INDEX "EmailTemplate_tenantId_name_key" ON "EmailTemplate"("tenantId", "name");
CREATE UNIQUE INDEX "EmailCampaignList_campaignId_listId_key" ON "EmailCampaignList"("campaignId", "listId");
CREATE UNIQUE INDEX "SMSConversation_tenantId_customerId_phoneNumber_key" ON "SMSConversation"("tenantId", "customerId", "phoneNumber");
CREATE UNIQUE INDEX "SMSTemplate_tenantId_name_key" ON "SMSTemplate"("tenantId", "name");
CREATE UNIQUE INDEX "MailchimpConnection_tenantId_key" ON "MailchimpConnection"("tenantId");
CREATE UNIQUE INDEX "CommunicationPreference_tenantId_customerId_key" ON "CommunicationPreference"("tenantId", "customerId");

-- Indexes for performance
CREATE INDEX "EmailList_tenantId_idx" ON "EmailList"("tenantId");
CREATE INDEX "EmailList_ownerId_idx" ON "EmailList"("ownerId");
CREATE INDEX "EmailListMember_tenantId_idx" ON "EmailListMember"("tenantId");
CREATE INDEX "EmailListMember_listId_idx" ON "EmailListMember"("listId");
CREATE INDEX "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");
CREATE INDEX "EmailCampaignList_tenantId_idx" ON "EmailCampaignList"("tenantId");
CREATE INDEX "EmailCampaignList_campaignId_idx" ON "EmailCampaignList"("campaignId");
CREATE INDEX "EmailMessage_tenantId_idx" ON "EmailMessage"("tenantId");
CREATE INDEX "EmailMessage_customerId_idx" ON "EmailMessage"("customerId");
CREATE INDEX "EmailMessage_status_idx" ON "EmailMessage"("status");
CREATE INDEX "EmailMessage_externalId_idx" ON "EmailMessage"("externalId");
CREATE INDEX "SMSConversation_tenantId_idx" ON "SMSConversation"("tenantId");
CREATE INDEX "SMSConversation_customerId_idx" ON "SMSConversation"("customerId");
CREATE INDEX "SMSMessage_tenantId_idx" ON "SMSMessage"("tenantId");
CREATE INDEX "SMSMessage_conversationId_idx" ON "SMSMessage"("conversationId");
CREATE INDEX "SMSMessage_externalId_idx" ON "SMSMessage"("externalId");
CREATE INDEX "SMSMessage_status_idx" ON "SMSMessage"("status");
CREATE INDEX "SMSTemplate_tenantId_idx" ON "SMSTemplate"("tenantId");
CREATE INDEX "SMSTemplate_category_idx" ON "SMSTemplate"("category");
CREATE INDEX "MailchimpConnection_tenantId_idx" ON "MailchimpConnection"("tenantId");
CREATE INDEX "CommunicationPreference_tenantId_idx" ON "CommunicationPreference"("tenantId");
CREATE INDEX "CommunicationPreference_customerId_idx" ON "CommunicationPreference"("customerId");

-- Foreign key constraints
ALTER TABLE "EmailList" ADD CONSTRAINT "EmailList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailListMember" ADD CONSTRAINT "EmailListMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailListMember" ADD CONSTRAINT "EmailListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "EmailList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailCampaignList" ADD CONSTRAINT "EmailCampaignList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailCampaignList" ADD CONSTRAINT "EmailCampaignList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "EmailList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SMSConversation" ADD CONSTRAINT "SMSConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SMSConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SMSTemplate" ADD CONSTRAINT "SMSTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailchimpConnection" ADD CONSTRAINT "MailchimpConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationPreference" ADD CONSTRAINT "CommunicationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
