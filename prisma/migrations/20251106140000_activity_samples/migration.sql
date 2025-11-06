-- Sample list support for activity logging

-- Create table to store reusable sample lists per sales rep
CREATE TABLE "SampleList" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SampleList_tenant_idx" ON "SampleList"("tenantId");
CREATE INDEX "SampleList_salesRep_active_idx" ON "SampleList"("salesRepId", "isActive");

ALTER TABLE "SampleList"
  ADD CONSTRAINT "SampleList_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "SampleList"
  ADD CONSTRAINT "SampleList_salesRep_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE;

-- Items that belong to a sample list
CREATE TABLE "SampleListItem" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sampleListId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "notes" TEXT,
    "defaultFollowUp" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "SampleListItem_unique_sample" ON "SampleListItem"("sampleListId", "skuId");
CREATE INDEX "SampleListItem_sku_idx" ON "SampleListItem"("skuId");

ALTER TABLE "SampleListItem"
  ADD CONSTRAINT "SampleListItem_list_fkey" FOREIGN KEY ("sampleListId") REFERENCES "SampleList"("id") ON DELETE CASCADE;
ALTER TABLE "SampleListItem"
  ADD CONSTRAINT "SampleListItem_sku_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE;

-- Track sampled items captured while logging an activity
CREATE TABLE "ActivitySampleItem" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "activityId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "sampleListItemId" UUID,
    "feedback" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT FALSE,
    "followUpCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ActivitySampleItem_activity_idx" ON "ActivitySampleItem"("activityId");
CREATE INDEX "ActivitySampleItem_sku_idx" ON "ActivitySampleItem"("skuId");
CREATE INDEX "ActivitySampleItem_followup_idx" ON "ActivitySampleItem"("followUpNeeded", "followUpCompletedAt");

ALTER TABLE "ActivitySampleItem"
  ADD CONSTRAINT "ActivitySampleItem_activity_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE;
ALTER TABLE "ActivitySampleItem"
  ADD CONSTRAINT "ActivitySampleItem_sku_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE;
ALTER TABLE "ActivitySampleItem"
  ADD CONSTRAINT "ActivitySampleItem_sampleListItem_fkey" FOREIGN KEY ("sampleListItemId") REFERENCES "SampleListItem"("id") ON DELETE SET NULL;
