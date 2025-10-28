-- Add calendar sync fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarProvider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastCalendarSync" TIMESTAMP(3);

-- Add priority tier to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "priorityTier" TEXT DEFAULT 'C';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "annualRevenue" DECIMAL(12,2);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "productCategory" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastContactDate" TIMESTAMP(3);

-- Add geolocation to CustomerAddress (not Address)
ALTER TABLE "CustomerAddress" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,8);
ALTER TABLE "CustomerAddress" ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(11,8);

-- Add objectives to WeeklyCallPlanAccount
ALTER TABLE "WeeklyCallPlanAccount" ADD COLUMN IF NOT EXISTS "objectives" TEXT;

-- Create saved filters table
CREATE TABLE IF NOT EXISTS "SavedCallPlanFilter" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filterConfig" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavedCallPlanFilter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SavedCallPlanFilter_userId_idx" ON "SavedCallPlanFilter"("userId");

-- Add foreign key (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'SavedCallPlanFilter_userId_fkey'
  ) THEN
    ALTER TABLE "SavedCallPlanFilter"
      ADD CONSTRAINT "SavedCallPlanFilter_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
