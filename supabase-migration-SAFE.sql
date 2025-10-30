-- Leora Sales Rep Portal - SAFE Database Migration
-- Date: 2025-10-18
-- This migration safely adds new models, skipping any that already exist

-- ==============================================================================
-- 1. CREATE NEW ENUM (IF NOT EXISTS)
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE "CustomerRiskStatus" AS ENUM (
        'HEALTHY',
        'AT_RISK_CADENCE',
        'AT_RISK_REVENUE',
        'DORMANT',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. ADD NEW COLUMNS TO EXISTING TABLES (IF NOT EXISTS)
-- ==============================================================================

-- Add sales rep fields to Customer table
DO $$ BEGIN
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastOrderDate" TIMESTAMP(3);
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "nextExpectedOrderDate" TIMESTAMP(3);
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "averageOrderIntervalDays" INTEGER;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "riskStatus" "CustomerRiskStatus" NOT NULL DEFAULT 'HEALTHY';
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "dormancySince" TIMESTAMP(3);
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "reactivatedDate" TIMESTAMP(3);
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isPermanentlyClosed" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "closedReason" TEXT;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "salesRepId" UUID;
END $$;

-- Add delivery tracking fields to Order table
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryWeek" INTEGER;
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isFirstOrder" BOOLEAN NOT NULL DEFAULT false;
END $$;

-- Add calendar sync fields to User table
DO $$ BEGIN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarProvider" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarAccessToken" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarRefreshToken" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastCalendarSync" TIMESTAMP(3);
END $$;

CREATE INDEX IF NOT EXISTS "User_calendarProvider_idx"
ON "User"("tenantId", "calendarProvider")
WHERE "calendarProvider" IS NOT NULL;

-- ==============================================================================
-- 3. CREATE NEW TABLES (IF NOT EXISTS)
-- ==============================================================================

-- SalesRep table
CREATE TABLE IF NOT EXISTS "SalesRep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "territoryName" TEXT NOT NULL,
    "deliveryDay" TEXT,
    "weeklyRevenueQuota" DECIMAL(12,2),
    "monthlyRevenueQuota" DECIMAL(12,2),
    "quarterlyRevenueQuota" DECIMAL(12,2),
    "annualRevenueQuota" DECIMAL(12,2),
    "weeklyCustomerQuota" INTEGER,
    "sampleAllowancePerMonth" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRep_pkey" PRIMARY KEY ("id")
);

-- CustomerAssignment table
CREATE TABLE IF NOT EXISTS "CustomerAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerAssignment_pkey" PRIMARY KEY ("id")
);

-- SampleUsage table
CREATE TABLE IF NOT EXISTS "SampleUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "tastedAt" TIMESTAMP(3) NOT NULL,
    "feedback" TEXT,
    "needsFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followedUpAt" TIMESTAMP(3),
    "resultedInOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleUsage_pkey" PRIMARY KEY ("id")
);

-- RepWeeklyMetric table
CREATE TABLE IF NOT EXISTS "RepWeeklyMetric" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL,
    "revenueLastYear" DECIMAL(14,2),
    "uniqueCustomerOrders" INTEGER NOT NULL,
    "newCustomersAdded" INTEGER NOT NULL DEFAULT 0,
    "dormantCustomersCount" INTEGER NOT NULL DEFAULT 0,
    "reactivatedCustomersCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryDaysInWeek" INTEGER NOT NULL DEFAULT 1,
    "inPersonVisits" INTEGER NOT NULL DEFAULT 0,
    "tastingAppointments" INTEGER NOT NULL DEFAULT 0,
    "emailContacts" INTEGER NOT NULL DEFAULT 0,
    "phoneContacts" INTEGER NOT NULL DEFAULT 0,
    "textContacts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepWeeklyMetric_pkey" PRIMARY KEY ("id")
);

-- RepProductGoal table
CREATE TABLE IF NOT EXISTS "RepProductGoal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "salesRepId" UUID NOT NULL,
    "skuId" UUID,
    "productCategory" TEXT,
    "targetRevenue" DECIMAL(12,2),
    "targetCases" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepProductGoal_pkey" PRIMARY KEY ("id")
);

-- TopProduct table
CREATE TABLE IF NOT EXISTS "TopProduct" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(14,2) NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "uniqueCustomers" INTEGER NOT NULL,
    "rankingType" TEXT NOT NULL,

    CONSTRAINT "TopProduct_pkey" PRIMARY KEY ("id")
);

-- SalesIncentive table
CREATE TABLE IF NOT EXISTS "SalesIncentive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "targetSkuId" UUID,
    "targetCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesIncentive_pkey" PRIMARY KEY ("id")
);

-- CalendarEvent table
CREATE TABLE IF NOT EXISTS "CalendarEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT,
    "customerId" UUID,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- ==============================================================================
-- 4. CREATE UNIQUE CONSTRAINTS (IF NOT EXISTS)
-- ==============================================================================

DO $$ BEGIN
    ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_tenantId_userId_key" UNIQUE ("tenantId", "userId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_userId_key" UNIQUE ("userId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RepWeeklyMetric" ADD CONSTRAINT "RepWeeklyMetric_tenantId_salesRepId_weekStartDate_key"
        UNIQUE ("tenantId", "salesRepId", "weekStartDate");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TopProduct" ADD CONSTRAINT "TopProduct_tenantId_calculatedAt_rankingType_rank_key"
        UNIQUE ("tenantId", "calculatedAt", "rankingType", "rank");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 5. CREATE INDEXES (IF NOT EXISTS)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "Customer_salesRepId_idx" ON "Customer"("salesRepId");
CREATE INDEX IF NOT EXISTS "Customer_riskStatus_idx" ON "Customer"("riskStatus");
CREATE INDEX IF NOT EXISTS "Order_deliveredAt_idx" ON "Order"("deliveredAt");
CREATE INDEX IF NOT EXISTS "Order_deliveryWeek_idx" ON "Order"("deliveryWeek");
CREATE INDEX IF NOT EXISTS "SalesRep_tenantId_idx" ON "SalesRep"("tenantId");
CREATE INDEX IF NOT EXISTS "SalesRep_isActive_idx" ON "SalesRep"("isActive");
CREATE INDEX IF NOT EXISTS "CustomerAssignment_tenantId_idx" ON "CustomerAssignment"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerAssignment_salesRepId_idx" ON "CustomerAssignment"("salesRepId");
CREATE INDEX IF NOT EXISTS "CustomerAssignment_customerId_idx" ON "CustomerAssignment"("customerId");
CREATE INDEX IF NOT EXISTS "SampleUsage_tenantId_idx" ON "SampleUsage"("tenantId");
CREATE INDEX IF NOT EXISTS "SampleUsage_salesRepId_tastedAt_idx" ON "SampleUsage"("salesRepId", "tastedAt");
CREATE INDEX IF NOT EXISTS "SampleUsage_customerId_idx" ON "SampleUsage"("customerId");
CREATE INDEX IF NOT EXISTS "RepWeeklyMetric_tenantId_idx" ON "RepWeeklyMetric"("tenantId");
CREATE INDEX IF NOT EXISTS "RepWeeklyMetric_salesRepId_idx" ON "RepWeeklyMetric"("salesRepId");
CREATE INDEX IF NOT EXISTS "RepWeeklyMetric_weekStartDate_idx" ON "RepWeeklyMetric"("weekStartDate");
CREATE INDEX IF NOT EXISTS "RepProductGoal_tenantId_idx" ON "RepProductGoal"("tenantId");
CREATE INDEX IF NOT EXISTS "RepProductGoal_salesRepId_idx" ON "RepProductGoal"("salesRepId");
CREATE INDEX IF NOT EXISTS "RepProductGoal_periodStart_periodEnd_idx" ON "RepProductGoal"("periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "TopProduct_tenantId_calculatedAt_rankingType_idx" ON "TopProduct"("tenantId", "calculatedAt", "rankingType");
CREATE INDEX IF NOT EXISTS "SalesIncentive_tenantId_idx" ON "SalesIncentive"("tenantId");
CREATE INDEX IF NOT EXISTS "SalesIncentive_isActive_startDate_endDate_idx" ON "SalesIncentive"("isActive", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "CalendarEvent_tenantId_userId_startTime_idx" ON "CalendarEvent"("tenantId", "userId", "startTime");
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_startTime_idx" ON "CalendarEvent"("userId", "startTime");

-- ==============================================================================
-- 6. ADD FOREIGN KEY CONSTRAINTS (IF NOT EXISTS)
-- ==============================================================================

DO $$ BEGIN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_salesRepId_fkey"
        FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_salesRepId_fkey"
        FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_salesRepId_fkey"
        FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SampleUsage" ADD CONSTRAINT "SampleUsage_skuId_fkey"
        FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RepWeeklyMetric" ADD CONSTRAINT "RepWeeklyMetric_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RepWeeklyMetric" ADD CONSTRAINT "RepWeeklyMetric_salesRepId_fkey"
        FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RepProductGoal" ADD CONSTRAINT "RepProductGoal_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RepProductGoal" ADD CONSTRAINT "RepProductGoal_salesRepId_fkey"
        FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RepProductGoal" ADD CONSTRAINT "RepProductGoal_skuId_fkey"
        FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TopProduct" ADD CONSTRAINT "TopProduct_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TopProduct" ADD CONSTRAINT "TopProduct_skuId_fkey"
        FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SalesIncentive" ADD CONSTRAINT "SalesIncentive_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SalesIncentive" ADD CONSTRAINT "SalesIncentive_targetSkuId_fkey"
        FOREIGN KEY ("targetSkuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- CARLA CALL PLAN SCHEDULING TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "CallPlanSchedule" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallPlanSchedule_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "CallPlanSchedule_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE,
    CONSTRAINT "CallPlanSchedule_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CallPlanSchedule_tenant_idx" ON "CallPlanSchedule"("tenantId");
CREATE INDEX IF NOT EXISTS "CallPlanSchedule_callPlanDate_idx" ON "CallPlanSchedule"("callPlanId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "CallPlanSchedule_customer_idx" ON "CallPlanSchedule"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "CallPlanSchedule_unique_slot"
    ON "CallPlanSchedule"("tenantId", "callPlanId", "customerId", "scheduledDate", "scheduledTime");

CREATE TABLE IF NOT EXISTS "TerritoryBlock" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "territory" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT TRUE,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TerritoryBlock_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "TerritoryBlock_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TerritoryBlock_unique_day"
    ON "TerritoryBlock"("tenantId", "callPlanId", "dayOfWeek", "territory");
CREATE INDEX IF NOT EXISTS "TerritoryBlock_tenant_idx" ON "TerritoryBlock"("tenantId");
CREATE INDEX IF NOT EXISTS "TerritoryBlock_callPlan_day_idx" ON "TerritoryBlock"("callPlanId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "TerritoryBlock_territory_idx" ON "TerritoryBlock"("territory");

CREATE TABLE IF NOT EXISTS "RecurringCallPlan" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "preferredTime" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringCallPlan_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "RecurringCallPlan_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "RecurringCallPlan_customer_idx" ON "RecurringCallPlan"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "RecurringCallPlan_frequency_idx" ON "RecurringCallPlan"("tenantId", "frequency", "active");

CREATE INDEX IF NOT EXISTS "Customer_lastOrderDate_idx" ON "Customer"("tenantId", "lastOrderDate" DESC);
CREATE INDEX IF NOT EXISTS "Customer_territory_lastOrder_idx" ON "Customer"("tenantId", "territory", "lastOrderDate" DESC);
CREATE INDEX IF NOT EXISTS "Order_customerId_orderedAt_idx" ON "Order"("customerId", "orderedAt" DESC);
CREATE INDEX IF NOT EXISTS "Customer_establishedRevenue_idx"
  ON "Customer"("tenantId", "establishedRevenue" DESC)
  WHERE "establishedRevenue" IS NOT NULL;

-- ==============================================================================
-- MIGRATION COMPLETE - ALL OPERATIONS ARE IDEMPOTENT
-- ==============================================================================

SELECT 'Migration completed successfully!' as status;
