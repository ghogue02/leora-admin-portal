-- Add columns to track auto vs manual account priority assignments
ALTER TABLE "Customer"
ADD COLUMN "accountPriorityAutoAssignedAt" TIMESTAMPTZ,
ADD COLUMN "accountPriorityManuallySet" BOOLEAN NOT NULL DEFAULT false;
