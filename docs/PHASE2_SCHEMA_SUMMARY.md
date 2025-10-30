# Phase 2.1 CARLA System - Schema Design Summary

**Created:** 2025-10-25
**Status:** ✅ Design Complete - Ready for Migration
**Migration:** Manual execution in Supabase Dashboard

---

## Quick Start

### 1. Execute Migration
```bash
# Open Supabase Dashboard → SQL Editor
# Copy and execute: /Users/greghogue/Leora2/docs/phase2-migration.sql
```

### 2. Update Prisma
```bash
cd /Users/greghogue/Leora2/web
npx prisma db pull
npx prisma generate
npm run typecheck
```

### 3. Verify
```bash
# Run verification queries from: /docs/phase2-verification-queries.sql
```

---

## Files Created

| File | Purpose | Location |
|------|---------|----------|
| **phase2-schema-additions.prisma** | Prisma schema additions with full documentation | `/docs/` |
| **phase2-migration.sql** | Complete SQL migration script for Supabase | `/docs/` |
| **phase2-schema-documentation.md** | Comprehensive schema design docs | `/docs/` |
| **phase2-verification-queries.sql** | 19 verification query sections | `/docs/` |
| **PHASE2_SCHEMA_SUMMARY.md** | This summary document | `/docs/` |

---

## Schema Changes Overview

### New Enums (3)

```prisma
enum AccountPriority {
  LOW, MEDIUM, HIGH
}

enum CallPlanStatus {
  DRAFT, ACTIVE, COMPLETED, ARCHIVED
}

enum ContactOutcome {
  NOT_ATTEMPTED, NO_CONTACT, CONTACTED, VISITED
}
```

### New Models (2)

#### CallPlanAccount
**Purpose:** Join table linking customers to weekly call plans

**Key Fields:**
- `objective` - 3-5 word weekly goal
- `contactOutcome` - X/Y/Blank tracking
- `contactedAt` - When contact occurred
- `notes` - Free-form contact details

**Unique Constraint:** One entry per account per call plan

#### CallPlanActivity
**Purpose:** Track activities performed during call plan execution

**Key Fields:**
- `activityTypeId` - Links to existing ActivityType
- `occurredAt` - When activity happened
- `notes` - Activity details

**Purpose:** Connects general activity tracking to specific call plans

### Extended Models (4)

#### Customer
```prisma
accountPriority  AccountPriority  @default(MEDIUM)
territory        String?
callPlanAccounts CallPlanAccount[]
callPlanActivities CallPlanActivity[]
```

#### CallPlan
```prisma
weekNumber   Int?            // 1-52
year         Int?
status       CallPlanStatus  @default(DRAFT)
targetCount  Int?            // Goal for week
accounts     CallPlanAccount[]
activities   CallPlanActivity[]
```

#### Tenant
```prisma
callPlanAccounts   CallPlanAccount[]
callPlanActivities CallPlanActivity[]
```

#### ActivityType
```prisma
callPlanActivities CallPlanActivity[]
```

---

## Database Objects Created

### Indexes (15 total)

**Customer:**
- `Customer_territory_idx`
- `Customer_accountPriority_idx`

**CallPlan:**
- `CallPlan_year_weekNumber_idx` (composite)
- `CallPlan_status_idx`

**CallPlanAccount:**
- Primary key on `id`
- Unique constraint on `(callPlanId, customerId)`
- Indexes: `tenantId`, `callPlanId`, `customerId`, `contactOutcome`, `contactedAt`

**CallPlanActivity:**
- Primary key on `id`
- Indexes: `tenantId`, `callPlanId`, `customerId`, `activityTypeId`, `occurredAt`

### Views (2)

**CallPlanSummary**
- Aggregated statistics per call plan
- Columns: totalAccounts, contactedCount, visitedCount, noContactCount, notAttemptedCount, completionPercentage

**AccountCallPlanHistory**
- Historical view of account call plan participation
- Sorted by year/week descending

### Functions (3)

**get_current_week_number()**
- Returns: INTEGER (1-52)
- Usage: Auto-populate weekNumber

**get_week_start_date(year, week)**
- Returns: DATE (Monday of week)
- Usage: Calculate date ranges

**categorize_account_type(lastOrderDate)**
- Returns: AccountType
- Logic: NULL→PROSPECT, <6mo→ACTIVE, 6-12mo→TARGET, >12mo→PROSPECT

### Security

**RLS Policies (2):**
- `CallPlanAccount tenant isolation`
- `CallPlanActivity tenant isolation`

**Permissions:**
- `authenticated` role: SELECT, INSERT, UPDATE, DELETE
- All sequences: USAGE granted

---

## Migration Details

### What Happens

1. **Creates 3 enums** for status tracking
2. **Adds 6 columns** to existing tables (Customer, CallPlan)
3. **Creates 2 new tables** with full constraints
4. **Creates 15 indexes** for query performance
5. **Enables RLS** with tenant isolation policies
6. **Creates 2 views** for reporting
7. **Creates 3 functions** for business logic
8. **Migrates existing data** - assigns priorities based on account type

### Cascade Behavior

**ON DELETE CASCADE:**
- Tenant deleted → All call plans, accounts, activities deleted
- CallPlan deleted → All related accounts and activities deleted
- Customer deleted → All related call plan entries deleted

**Rationale:** Maintains referential integrity, prevents orphaned records

---

## Key Design Decisions

### 1. Join Table Pattern
**Decision:** Use CallPlanAccount as join table vs. embedding in CallPlan
**Rationale:**
- Enables per-account objectives and notes
- Supports historical tracking
- Allows flexible contact outcome updates
- Scales to thousands of accounts per plan

### 2. Contact Outcome Enum
**Decision:** Four states (NOT_ATTEMPTED, NO_CONTACT, CONTACTED, VISITED)
**Rationale:**
- Maps to X/Y/Blank checkbox system
- Distinguishes "not tried" from "tried but failed"
- Enables completion percentage calculation
- Simple UI mapping

### 3. Separate Activity Tracking
**Decision:** CallPlanActivity separate from general Activity model
**Rationale:**
- Links activities explicitly to call plans
- Supports call-plan-specific reporting
- Maintains separation of concerns
- Enables performance analysis by plan

### 4. Week-Based Planning
**Decision:** weekNumber (1-52) + year instead of date ranges
**Rationale:**
- Simpler UI/UX (pick a week)
- Easy historical queries
- Aligns with sales planning cycles
- ISO week standard

### 5. Territory as String
**Decision:** Simple string field vs. Territory model
**Rationale:**
- Phase 2.1 scope - basic filtering only
- Can be refactored to Territory model in Phase 3
- Reduces initial complexity
- Flexible for various territory schemes

---

## Usage Examples

### Create Weekly Plan
```typescript
const plan = await prisma.callPlan.create({
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

### Add Accounts
```typescript
await prisma.callPlanAccount.createMany({
  data: highPriorityAccounts.map(customer => ({
    tenantId,
    callPlanId: plan.id,
    customerId: customer.id,
    objective: 'Follow up on last order',
  })),
});
```

### Update Contact Outcome
```typescript
await prisma.callPlanAccount.update({
  where: {
    callPlanId_customerId: { callPlanId, customerId }
  },
  data: {
    contactOutcome: 'CONTACTED',
    contactedAt: new Date(),
    notes: 'Spoke with buyer, interested in new vintage',
  }
});
```

### Get Weekly Summary
```typescript
const summary = await prisma.$queryRaw<CallPlanSummary[]>`
  SELECT * FROM "CallPlanSummary"
  WHERE "callPlanId" = ${callPlanId}
`;
```

---

## Verification Checklist

After running migration, verify:

- [ ] **Enums created** - 3 enums with correct values
- [ ] **Tables created** - CallPlanAccount, CallPlanActivity
- [ ] **Columns added** - Customer (2), CallPlan (4)
- [ ] **Indexes created** - 15 total across all tables
- [ ] **Foreign keys valid** - 7 constraints with CASCADE
- [ ] **RLS enabled** - 2 policies active
- [ ] **Views created** - CallPlanSummary, AccountCallPlanHistory
- [ ] **Functions created** - 3 helper functions
- [ ] **Data migrated** - Existing customers have priorities set
- [ ] **Permissions granted** - authenticated role has access

**Run:** `/docs/phase2-verification-queries.sql` for automated checks

---

## Performance Characteristics

### Expected Query Performance

**Call Plan List (with summary):**
- Query: Get all plans for rep with counts
- Expected: <50ms for 52 plans
- Index: Uses CallPlan_userId_idx, CallPlan_status_idx

**Account Selection (call plan builder):**
- Query: Filter by territory/priority, paginate
- Expected: <100ms for 1000 accounts
- Indexes: Customer_territory_idx, Customer_accountPriority_idx

**Weekly Tracking Grid:**
- Query: Load plan with all accounts and outcomes
- Expected: <200ms for 50 accounts
- Index: CallPlanAccount_callPlanId_idx

**Historical Reporting:**
- Query: Account call plan history (10 weeks)
- Expected: <100ms per account
- View: AccountCallPlanHistory pre-joins data

### Optimization Notes

- All primary query patterns have dedicated indexes
- Views use efficient JOINs with indexed columns
- RLS policies use indexed tenantId
- Composite indexes for multi-column queries

---

## Next Steps (Phase 2.2)

After successful migration:

1. **API Layer** - Create tRPC endpoints for call plan CRUD
2. **UI Components** - Build React components for call planning
3. **Testing** - Unit tests for business logic
4. **Seed Data** - Create sample call plans for demo
5. **Documentation** - API documentation for endpoints

---

## Rollback Procedure

If migration fails or issues found:

```sql
-- WARNING: This deletes all CARLA schema components
-- See /docs/phase2-verification-queries.sql section 19
```

**Steps:**
1. Drop views (CallPlanSummary, AccountCallPlanHistory)
2. Drop functions (get_current_week_number, etc.)
3. Drop tables (CallPlanActivity, CallPlanAccount)
4. Remove columns from Customer and CallPlan
5. Drop enums (ContactOutcome, CallPlanStatus, AccountPriority)

**Note:** Only rollback if schema has errors. Cannot rollback after users create data.

---

## Memory Storage

Schema design stored in ReasoningBank with key: `phase2/schema-design`

**Stored Data:**
- Models added: CallPlanAccount, CallPlanActivity
- Enums added: AccountPriority, CallPlanStatus, ContactOutcome
- Models extended: Customer, CallPlan, Tenant, ActivityType
- Relations created: 7 foreign keys
- Indexes created: 15
- Views created: 2
- Functions created: 3
- RLS policies: 2

**Retrieval:**
```bash
npx claude-flow@alpha memory retrieve "phase2/schema-design"
```

---

## Support & References

**Files:**
- Schema additions: `/docs/phase2-schema-additions.prisma`
- Migration SQL: `/docs/phase2-migration.sql`
- Full documentation: `/docs/phase2-schema-documentation.md`
- Verification queries: `/docs/phase2-verification-queries.sql`

**Implementation Plan:**
- Overall plan: `/docs/LEORA_IMPLEMENTATION_PLAN.md`
- Current phase: Phase 2.1 - Database Schema

**Questions:**
- Review schema documentation for detailed explanations
- Check verification queries for validation examples
- Consult implementation plan for business requirements

---

## Status: ✅ READY FOR MIGRATION

All schema design work for Phase 2.1 is complete. The migration script is comprehensive, well-documented, and includes:

- ✅ All required schema changes
- ✅ Data migration for existing records
- ✅ Security (RLS) policies
- ✅ Performance indexes
- ✅ Helper functions and views
- ✅ Comprehensive verification queries
- ✅ Rollback procedure

**Next Action:** Execute `/docs/phase2-migration.sql` in Supabase Dashboard SQL Editor

---

*Generated: 2025-10-25*
*System Architect: Claude Code*
*Memory ID: 3dcaf907-439e-4372-82a0-3da2342e99a7*
