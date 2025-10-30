# CARLA System - Phase 2.1 Schema Design Documentation

## Overview

This document provides comprehensive documentation for the CARLA (Call Planning and Account Management) System database schema extensions implemented in Phase 2.1.

**Created:** 2025-10-25
**Migration Name:** `add_carla_system`
**Related Files:**
- `/docs/phase2-schema-additions.prisma` - Prisma schema additions
- `/docs/phase2-migration.sql` - SQL migration script
- `/docs/LEORA_IMPLEMENTATION_PLAN.md` - Overall implementation plan

---

## Architecture Overview

The CARLA System extends the existing Leora platform with weekly call planning capabilities for sales representatives. The design follows these principles:

1. **Multi-tenant isolation** - All data scoped to tenant using RLS policies
2. **Relational integrity** - Proper foreign keys and cascade behaviors
3. **Audit trail** - Created timestamps and activity tracking
4. **Performance** - Strategic indexes on query patterns
5. **Flexibility** - Extensible enums and optional fields

---

## Schema Components

### 1. New Enums

#### AccountPriority
Categorizes accounts by urgency/importance for call planning.

```prisma
enum AccountPriority {
  LOW       // Lower priority accounts
  MEDIUM    // Standard priority accounts (default)
  HIGH      // High priority requiring immediate attention
}
```

**Usage:**
- Assigned to customers for filtering and prioritization
- Defaults to MEDIUM for new accounts
- Can be manually adjusted by sales reps
- Used in call plan builder for account selection

**Migration Strategy:**
```sql
-- Existing accounts assigned priority based on accountType
ACTIVE -> HIGH
TARGET -> MEDIUM
PROSPECT -> LOW
```

---

#### CallPlanStatus
Tracks call plan lifecycle from creation through completion.

```prisma
enum CallPlanStatus {
  DRAFT      // Being created, not yet finalized
  ACTIVE     // Currently active for the week
  COMPLETED  // Week finished, ready for reporting
  ARCHIVED   // Historical record
}
```

**State Transitions:**
```
DRAFT → ACTIVE (when week starts or manually activated)
ACTIVE → COMPLETED (when week ends or manually completed)
COMPLETED → ARCHIVED (after reporting period)
```

**Business Rules:**
- Only one ACTIVE call plan per rep per week
- DRAFT plans can be edited freely
- COMPLETED plans are read-only for contact outcomes
- ARCHIVED plans are historical records only

---

#### ContactOutcome
Tracks contact attempts using the X/Y/Blank checkbox system.

```prisma
enum ContactOutcome {
  NOT_ATTEMPTED  // Default state, not yet tried
  NO_CONTACT     // Blank - Tried but couldn't reach
  CONTACTED      // X - Reached via email/phone/text
  VISITED        // Y - In-person visit completed
}
```

**UI Mapping:**
- NOT_ATTEMPTED: Empty checkbox (gray)
- NO_CONTACT: Blank checkbox (white)
- CONTACTED: X checkbox (blue)
- VISITED: Y checkbox (green)

**Workflow:**
```
NOT_ATTEMPTED (default)
    ↓
NO_CONTACT (attempted, failed)
OR
CONTACTED (remote success)
OR
VISITED (in-person success)
```

---

### 2. Extended Models

#### Customer Extensions

**New Fields:**
```prisma
accountPriority  AccountPriority  @default(MEDIUM)
territory        String?
```

**Purpose:**
- `accountPriority`: Enables filtering by urgency in call plan builder
- `territory`: Supports territory-based account assignment and filtering

**New Relations:**
```prisma
callPlanAccounts   CallPlanAccount[]    // Accounts in call plans
callPlanActivities CallPlanActivity[]   // Activities from call plans
```

**Indexes Added:**
```sql
CREATE INDEX "Customer_territory_idx" ON "Customer"("territory");
CREATE INDEX "Customer_accountPriority_idx" ON "Customer"("accountPriority");
```

**Use Cases:**
- Filter accounts by territory when building call plans
- Prioritize high-value accounts for weekly contact
- Track which call plans an account has been part of
- Historical analysis of account engagement

---

#### CallPlan Extensions

**New Fields:**
```prisma
weekNumber   Int?            // Week number of year (1-52)
year         Int?            // Year for the call plan
status       CallPlanStatus  @default(DRAFT)
targetCount  Int?            // Target # of accounts to contact
```

**Purpose:**
- `weekNumber` + `year`: Unique identification of planning period
- `status`: Lifecycle tracking (DRAFT → ACTIVE → COMPLETED)
- `targetCount`: Goal-setting for rep performance

**New Relations:**
```prisma
accounts    CallPlanAccount[]    // Accounts in this plan
activities  CallPlanActivity[]   // Activities executed
```

**Indexes Added:**
```sql
CREATE INDEX "CallPlan_year_weekNumber_idx" ON "CallPlan"("year", "weekNumber");
CREATE INDEX "CallPlan_status_idx" ON "CallPlan"("status");
```

**Use Cases:**
- Create weekly call plans with specific account targets
- Track completion percentage during the week
- Historical analysis of rep productivity
- Rollup reporting by week/month/quarter

---

### 3. New Models

#### CallPlanAccount

**Purpose:** Join table linking customers to call plans with contact tracking.

**Schema:**
```prisma
model CallPlanAccount {
  id              String          @id @default(uuid()) @db.Uuid
  tenantId        String          @db.Uuid
  callPlanId      String          @db.Uuid
  customerId      String          @db.Uuid
  objective       String?         // 3-5 word weekly objective
  addedAt         DateTime        @default(now())
  contactOutcome  ContactOutcome  @default(NOT_ATTEMPTED)
  contactedAt     DateTime?       // When contact/visit occurred
  notes           String?         // Notes from contact attempt

  // Relations
  tenant   Tenant   @relation(...)
  callPlan CallPlan @relation(...)
  customer Customer @relation(...)

  @@unique([callPlanId, customerId])  // One per account per plan
  @@index([tenantId])
  @@index([callPlanId])
  @@index([customerId])
  @@index([contactOutcome])
  @@index([contactedAt])
}
```

**Key Features:**
1. **Unique Constraint:** One entry per account per call plan
2. **Objective Field:** Short description of weekly goal for this account
3. **Contact Tracking:** Outcome and timestamp
4. **Flexible Notes:** Free-form text for contact details

**Indexes Strategy:**
- `tenantId`: Multi-tenant isolation
- `callPlanId`: List all accounts in a plan
- `customerId`: Account's call plan history
- `contactOutcome`: Filter by contact status
- `contactedAt`: Chronological queries

**Query Patterns:**
```typescript
// Get all accounts for a call plan
const accounts = await prisma.callPlanAccount.findMany({
  where: { callPlanId },
  include: { customer: true }
});

// Get contacted accounts this week
const contacted = await prisma.callPlanAccount.findMany({
  where: {
    callPlanId,
    contactOutcome: { in: ['CONTACTED', 'VISITED'] }
  }
});

// Account call plan history
const history = await prisma.callPlanAccount.findMany({
  where: { customerId },
  include: { callPlan: true },
  orderBy: { addedAt: 'desc' }
});
```

**Business Rules:**
- Must belong to exactly one call plan and one customer
- `contactedAt` required when outcome is CONTACTED or VISITED
- `objective` optional but recommended (3-5 words)
- Notes unlimited length for detailed context

---

#### CallPlanActivity

**Purpose:** Track activities performed as part of call plan execution.

**Schema:**
```prisma
model CallPlanActivity {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @db.Uuid
  callPlanId     String   @db.Uuid
  customerId     String   @db.Uuid
  activityTypeId String   @db.Uuid
  occurredAt     DateTime
  notes          String?
  createdAt      DateTime @default(now())

  // Relations
  tenant       Tenant       @relation(...)
  callPlan     CallPlan     @relation(...)
  customer     Customer     @relation(...)
  activityType ActivityType @relation(...)

  @@index([tenantId])
  @@index([callPlanId])
  @@index([customerId])
  @@index([activityTypeId])
  @@index([occurredAt])
}
```

**Key Features:**
1. **Links to ActivityType:** Reuses existing activity type system
2. **Call Plan Association:** Explicitly ties to weekly plan
3. **Temporal Tracking:** `occurredAt` for exact timing
4. **Audit Trail:** `createdAt` for record creation

**Relationship to Activity Model:**
- CallPlanActivity is a **specialized subset** of general activities
- Links activity execution back to originating call plan
- Enables call-plan-specific reporting
- Maintains separation from general CRM activities

**Indexes Strategy:**
- `callPlanId`: Activities for a specific plan
- `customerId`: Customer activity timeline
- `activityTypeId`: Filter by activity type (email, visit, etc.)
- `occurredAt`: Chronological analysis

**Query Patterns:**
```typescript
// Activities for a call plan
const activities = await prisma.callPlanActivity.findMany({
  where: { callPlanId },
  include: { activityType: true, customer: true },
  orderBy: { occurredAt: 'desc' }
});

// Customer activities this week
const customerActivities = await prisma.callPlanActivity.findMany({
  where: {
    customerId,
    callPlanId,
  },
  include: { activityType: true }
});

// Activity type breakdown
const activityBreakdown = await prisma.callPlanActivity.groupBy({
  by: ['activityTypeId'],
  where: { callPlanId },
  _count: true
});
```

**Business Rules:**
- Must reference valid ActivityType
- `occurredAt` can be backdated for logging past activities
- Notes optional but recommended for context
- Immutable once created (no updates, only inserts)

---

### 4. Database Views

#### CallPlanSummary

**Purpose:** Aggregated statistics for call plan performance tracking.

**Schema:**
```sql
CREATE VIEW "CallPlanSummary" AS
SELECT
  cp.id AS "callPlanId",
  cp."tenantId",
  cp.name,
  cp.year,
  cp."weekNumber",
  cp.status,
  cp."targetCount",
  COUNT(cpa.id) AS "totalAccounts",
  COUNT(CASE WHEN cpa."contactOutcome" = 'CONTACTED' THEN 1 END) AS "contactedCount",
  COUNT(CASE WHEN cpa."contactOutcome" = 'VISITED' THEN 1 END) AS "visitedCount",
  COUNT(CASE WHEN cpa."contactOutcome" = 'NO_CONTACT' THEN 1 END) AS "noContactCount",
  COUNT(CASE WHEN cpa."contactOutcome" = 'NOT_ATTEMPTED' THEN 1 END) AS "notAttemptedCount",
  ROUND(
    (COUNT(CASE WHEN cpa."contactOutcome" IN ('CONTACTED', 'VISITED') THEN 1 END)::NUMERIC /
     NULLIF(COUNT(cpa.id), 0) * 100),
    1
  ) AS "completionPercentage"
FROM "CallPlan" cp
LEFT JOIN "CallPlanAccount" cpa ON cpa."callPlanId" = cp.id
GROUP BY cp.id, cp."tenantId", cp.name, cp.year, cp."weekNumber", cp.status, cp."targetCount";
```

**Metrics Provided:**
- Total accounts in plan
- Contacted count (X)
- Visited count (Y)
- No contact count (Blank)
- Not attempted count
- Completion percentage

**Use Cases:**
- Dashboard summaries
- Weekly performance reports
- Manager oversight
- Rep self-monitoring
- Historical trend analysis

**Query Example:**
```typescript
// Get current week summary
const summary = await prisma.$queryRaw`
  SELECT * FROM "CallPlanSummary"
  WHERE year = ${currentYear}
    AND "weekNumber" = ${currentWeek}
    AND "tenantId" = ${tenantId}
`;
```

---

#### AccountCallPlanHistory

**Purpose:** Historical view of all call plan participations per account.

**Schema:**
```sql
CREATE VIEW "AccountCallPlanHistory" AS
SELECT
  c.id AS "customerId",
  c."tenantId",
  c.name AS "customerName",
  c."accountType",
  c."accountPriority",
  cp.id AS "callPlanId",
  cp.name AS "callPlanName",
  cp.year,
  cp."weekNumber",
  cpa."contactOutcome",
  cpa."contactedAt",
  cpa.objective,
  cpa.notes
FROM "Customer" c
INNER JOIN "CallPlanAccount" cpa ON cpa."customerId" = c.id
INNER JOIN "CallPlan" cp ON cp.id = cpa."callPlanId"
ORDER BY cp.year DESC, cp."weekNumber" DESC, c.name;
```

**Data Provided:**
- Customer details
- Call plan participation history
- Contact outcomes over time
- Objectives and notes

**Use Cases:**
- Account detail pages
- Engagement frequency analysis
- Rep effectiveness by account
- Identify under-contacted accounts

**Query Example:**
```typescript
// Get account's call plan history
const history = await prisma.$queryRaw`
  SELECT * FROM "AccountCallPlanHistory"
  WHERE "customerId" = ${customerId}
  ORDER BY year DESC, "weekNumber" DESC
  LIMIT 10
`;
```

---

### 5. Helper Functions

#### get_current_week_number()

**Purpose:** Returns current ISO week number (1-52).

```sql
CREATE FUNCTION get_current_week_number()
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Usage:**
```sql
-- Auto-populate weekNumber on call plan creation
INSERT INTO "CallPlan" (name, "weekNumber", year)
VALUES ('Weekly Plan', get_current_week_number(), EXTRACT(YEAR FROM CURRENT_DATE));
```

---

#### get_week_start_date(year, week)

**Purpose:** Returns Monday of given week/year.

```sql
CREATE FUNCTION get_week_start_date(p_year INTEGER, p_week INTEGER)
RETURNS DATE AS $$
BEGIN
  RETURN (DATE_TRUNC('year', make_date(p_year, 1, 1))
    + ((p_week - 1) * INTERVAL '7 days'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Usage:**
```sql
-- Get date range for a call plan
SELECT
  get_week_start_date(year, "weekNumber") AS week_start,
  get_week_start_date(year, "weekNumber") + INTERVAL '6 days' AS week_end
FROM "CallPlan"
WHERE id = 'plan-id';
```

---

#### categorize_account_type(lastOrderDate)

**Purpose:** Auto-categorize account based on order recency.

```sql
CREATE FUNCTION categorize_account_type(p_last_order_date TIMESTAMP)
RETURNS "AccountType" AS $$
BEGIN
  IF p_last_order_date IS NULL THEN
    RETURN 'PROSPECT';
  ELSIF p_last_order_date >= CURRENT_DATE - INTERVAL '6 months' THEN
    RETURN 'ACTIVE';
  ELSIF p_last_order_date >= CURRENT_DATE - INTERVAL '12 months' THEN
    RETURN 'TARGET';
  ELSE
    RETURN 'PROSPECT';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Business Logic:**
- No orders: PROSPECT
- Last order < 6 months: ACTIVE
- Last order 6-12 months: TARGET
- Last order > 12 months: PROSPECT

**Usage:**
```sql
-- Auto-categorize all customers
UPDATE "Customer"
SET "accountType" = categorize_account_type("lastOrderDate");
```

---

## Security

### Row Level Security (RLS)

All new tables have RLS enabled with tenant isolation:

```sql
-- CallPlanAccount tenant isolation
CREATE POLICY "CallPlanAccount tenant isolation"
  ON "CallPlanAccount"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id')::uuid);

-- CallPlanActivity tenant isolation
CREATE POLICY "CallPlanActivity tenant isolation"
  ON "CallPlanActivity"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id')::uuid);
```

**Requirements:**
- Application must set `app.current_tenant_id` in session
- All queries automatically filtered by tenant
- Prevents cross-tenant data access

**Implementation Example:**
```typescript
// Set tenant context for session
await prisma.$executeRaw`
  SELECT set_config('app.current_tenant_id', ${tenantId}, false)
`;
```

---

### Permissions

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON "CallPlanAccount" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "CallPlanActivity" TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

**Access Control:**
- `authenticated`: Users with valid session
- Application-level role checking for specific operations
- RLS ensures tenant isolation regardless of role

---

## Performance Considerations

### Index Strategy

**CallPlanAccount (9 indexes):**
1. Primary key (id) - automatic
2. tenantId - multi-tenant filtering
3. callPlanId - list accounts in plan
4. customerId - account history
5. contactOutcome - filter by status
6. contactedAt - chronological queries
7. Unique (callPlanId, customerId) - constraint
8. Customer.territory - territory filtering
9. Customer.accountPriority - priority filtering

**CallPlanActivity (6 indexes):**
1. Primary key (id) - automatic
2. tenantId - multi-tenant filtering
3. callPlanId - plan activities
4. customerId - customer timeline
5. activityTypeId - filter by type
6. occurredAt - date range queries

**Query Optimization:**
- Composite index on CallPlan (year, weekNumber) for weekly lookups
- Index on Customer.territory for territory-based filtering
- Indexes support both filtering and JOIN operations

---

### Query Patterns

**Efficient:**
```sql
-- Uses callPlanId index
SELECT * FROM "CallPlanAccount" WHERE "callPlanId" = $1;

-- Uses composite index
SELECT * FROM "CallPlan" WHERE year = $1 AND "weekNumber" = $2;

-- Uses contactOutcome index
SELECT * FROM "CallPlanAccount"
WHERE "callPlanId" = $1 AND "contactOutcome" IN ('CONTACTED', 'VISITED');
```

**Inefficient (avoid):**
```sql
-- Full table scan on large notes field
SELECT * FROM "CallPlanAccount" WHERE notes LIKE '%follow up%';

-- Without tenantId filter (RLS adds it, but explicit is better)
SELECT * FROM "CallPlanAccount" WHERE "callPlanId" = $1;
```

---

## Data Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│   Tenant    │
└──────┬──────┘
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
┌─────────────┐                    ┌─────────────┐
│  Customer   │                    │   CallPlan  │
│             │                    │             │
│ + territory │◄───────┐           │ + weekNum   │
│ + priority  │        │           │ + year      │
└─────────────┘        │           │ + status    │
       │               │           └──────┬──────┘
       │               │                  │
       │               │                  │
       │          ┌────┴───────────┐      │
       │          │                │      │
       │          │                │      │
       ▼          ▼                ▼      ▼
┌──────────────────────────────────────────────┐
│          CallPlanAccount (Join)              │
│  + objective                                 │
│  + contactOutcome (NOT_ATTEMPTED→CONTACTED)  │
│  + contactedAt                               │
│  + notes                                     │
└──────────────────────────────────────────────┘
       │
       │
       ▼
┌──────────────────┐          ┌────────────────┐
│ CallPlanActivity │────────► │ ActivityType   │
│                  │          │                │
│ + occurredAt     │          │ (existing)     │
│ + notes          │          └────────────────┘
└──────────────────┘
```

### Cascade Behavior

**ON DELETE CASCADE:**
- Tenant deleted → All call plans, accounts, activities deleted
- CallPlan deleted → All CallPlanAccount and CallPlanActivity deleted
- Customer deleted → All CallPlanAccount and CallPlanActivity deleted
- ActivityType deleted → All CallPlanActivity deleted

**Rationale:**
- Maintains referential integrity
- Prevents orphaned records
- Simplifies cleanup operations
- Aligns with multi-tenant isolation

---

## Migration Steps

### 1. Pre-Migration Checklist

- [ ] Backup database
- [ ] Review current schema state
- [ ] Verify AccountType enum exists
- [ ] Check for conflicting column names
- [ ] Confirm RLS policies exist on base tables

### 2. Execute Migration

```bash
# Option 1: Supabase Dashboard (Recommended)
# 1. Copy contents of phase2-migration.sql
# 2. Open Supabase Dashboard → SQL Editor
# 3. Paste and execute script
# 4. Review verification queries output

# Option 2: Command line (if direct access)
psql $DATABASE_URL -f docs/phase2-migration.sql
```

### 3. Post-Migration Steps

```bash
# 1. Introspect database to update Prisma schema
npx prisma db pull

# 2. Generate Prisma Client with new types
npx prisma generate

# 3. Verify schema in code
npm run typecheck
```

### 4. Verification

Run verification queries from migration script:
```sql
-- Check enums created
SELECT typname FROM pg_type WHERE typname LIKE '%account%' OR typname LIKE '%call%';

-- Check tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  AND tablename LIKE 'CallPlan%';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename IN
  ('CallPlanAccount', 'CallPlanActivity');
```

### 5. Seed Initial Data

```typescript
// Create activity types for call planning
await prisma.activityType.createMany({
  data: [
    { tenantId, name: 'Email Contact', code: 'email' },
    { tenantId, name: 'Phone Call', code: 'phone' },
    { tenantId, name: 'In-Person Visit', code: 'visit' },
    { tenantId, name: 'Text Message', code: 'text' },
  ]
});
```

---

## Usage Examples

### Create Weekly Call Plan

```typescript
const callPlan = await prisma.callPlan.create({
  data: {
    tenantId,
    userId: repId,
    name: `Week ${weekNum} - ${repName}`,
    weekNumber: weekNum,
    year: currentYear,
    status: 'DRAFT',
    targetCount: 25,
  }
});
```

### Add Accounts to Plan

```typescript
const accountsToAdd = await prisma.customer.findMany({
  where: {
    tenantId,
    salesRepId: repId,
    accountType: { in: ['ACTIVE', 'TARGET'] },
    accountPriority: 'HIGH',
  },
  take: 25,
});

await prisma.callPlanAccount.createMany({
  data: accountsToAdd.map(customer => ({
    tenantId,
    callPlanId: callPlan.id,
    customerId: customer.id,
    objective: 'Follow up on last order',
  })),
});
```

### Update Contact Outcome

```typescript
await prisma.callPlanAccount.update({
  where: {
    callPlanId_customerId: {
      callPlanId,
      customerId,
    }
  },
  data: {
    contactOutcome: 'CONTACTED',
    contactedAt: new Date(),
    notes: 'Spoke with buyer, interested in new vintage',
  }
});
```

### Track Activity

```typescript
await prisma.callPlanActivity.create({
  data: {
    tenantId,
    callPlanId,
    customerId,
    activityTypeId: emailActivityType.id,
    occurredAt: new Date(),
    notes: 'Sent catalog for spring releases',
  }
});
```

### Get Call Plan Summary

```typescript
const summary = await prisma.$queryRaw<CallPlanSummary[]>`
  SELECT * FROM "CallPlanSummary"
  WHERE "callPlanId" = ${callPlanId}
`;

console.log(`
  Completion: ${summary[0].completionPercentage}%
  Contacted: ${summary[0].contactedCount}
  Visited: ${summary[0].visitedCount}
  Remaining: ${summary[0].notAttemptedCount}
`);
```

---

## Future Enhancements

### Potential Additions

1. **CallPlanTemplate** - Reusable plan templates
2. **CallPlanGoal** - Specific goals per plan (revenue, visits, etc.)
3. **CallPlanNote** - Weekly notes and observations
4. **AccountEngagementScore** - Calculated engagement metric
5. **TerritoryAssignment** - Formal territory management

### Performance Optimizations

1. Materialized view for CallPlanSummary (if performance degrades)
2. Partitioning CallPlanActivity by date
3. Archival strategy for old call plans

### Analytics

1. Rep productivity trends
2. Account engagement patterns
3. Contact method effectiveness
4. Territory coverage analysis

---

## Troubleshooting

### Common Issues

**Issue: RLS policies blocking queries**
```sql
-- Check current tenant setting
SHOW app.current_tenant_id;

-- Set tenant context
SELECT set_config('app.current_tenant_id', 'tenant-uuid', false);
```

**Issue: Unique constraint violation on CallPlanAccount**
```typescript
// Check if account already in plan
const existing = await prisma.callPlanAccount.findUnique({
  where: {
    callPlanId_customerId: { callPlanId, customerId }
  }
});
```

**Issue: Foreign key violations**
```sql
-- Verify all foreign keys exist
SELECT * FROM "Customer" WHERE id = 'customer-uuid';
SELECT * FROM "CallPlan" WHERE id = 'plan-uuid';
SELECT * FROM "ActivityType" WHERE id = 'activity-uuid';
```

---

## References

- **Implementation Plan:** `/docs/LEORA_IMPLEMENTATION_PLAN.md`
- **Prisma Schema:** `/prisma/schema.prisma`
- **Migration SQL:** `/docs/phase2-migration.sql`
- **Prisma Documentation:** https://www.prisma.io/docs

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-25 | 1.0.0 | Initial schema design for Phase 2.1 | System Architect |

---

*This documentation is maintained as part of the CARLA System implementation and should be updated when schema changes occur.*
