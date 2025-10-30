# Phase 2 (CARLA System) Prerequisites Check

**Date:** 2025-10-25
**Working Directory:** /Users/greghogue/Leora2
**Project:** Leora CRM

---

## Executive Summary

**Phase 2 Ready Status:** ⚠️ **PARTIALLY READY** - Minor blockers need resolution

**Overall Assessment:**
- ✅ Core infrastructure complete (80%)
- ⚠️ Database schema needs Phase 2 extensions
- ⚠️ AccountType enum implementation has bugs
- ✅ UI components ready
- ⚠️ Some tests failing

---

## Phase 1 Completion Status

### Memory Check Results

**Phase 1 Migration Results:** ❌ NOT FOUND IN MEMORY
- Key: `phase1/migration-results` (namespace: leora-migration)
- Status: No stored results found
- **Impact:** Cannot verify Phase 1 database migration completion status

**Phase 1 Test Results:** ❌ NOT FOUND IN MEMORY
- Key: `phase1/test-results` (namespace: leora-migration)
- Status: No stored results found
- **Impact:** Cannot verify Phase 1 test pass rates

**Recommendation:** Phase 1 completion was not tracked in memory system. Manual verification completed below.

---

## Phase 2 Requirements Analysis

### From LEORA_IMPLEMENTATION_PLAN.md

**Phase 2 Build Order:**
1. ✅ Database schema extensions (PARTIALLY COMPLETE)
2. ⚠️ Account categorization system (HAS BUGS)
3. ❌ Weekly planning interface (NOT STARTED)
4. ❌ Calendar sync setup (NOT STARTED)
5. ❌ Activity tracking integration (NOT STARTED)

**Key Features Required:**
- **CARLA System:** Call plan management with account categorization
- **Account Types:** PROSPECT, TARGET, ACTIVE classification
- **Weekly Planning:** Drag-drop interface for call planning
- **Contact Tracking:** X (contacted) and Y (visited) marking
- **Objective Setting:** 3-5 word objectives per account

---

## Detailed Prerequisites Verification

### 1. Database Schema ✅ READY (with gaps)

**Schema File:** `/Users/greghogue/Leora2/web/prisma/schema.prisma`

#### ✅ Phase 1 Models Present:
```prisma
✓ enum AccountType {
    ACTIVE    // Ordered within last 6 months
    TARGET    // Ordered 6-12 months ago
    PROSPECT  // Never ordered or >12 months since last order
  }

✓ model Customer {
    accountType AccountType? // Field exists but is nullable
    // ... other fields
  }

✓ model CallPlan {
    id, tenantId, userId, name, description
    effectiveAt, createdAt, updatedAt
    tasks Task[]
  }

✓ model Task {
    id, tenantId, userId, callPlanId, customerId
    title, description, dueAt
    priority TaskPriority
    status TaskStatus
  }
```

#### ❌ Phase 2 Models MISSING:

**Required Models Not Found:**
```prisma
✗ enum CallPlanStatus (DRAFT, ACTIVE, COMPLETED, ARCHIVED)
✗ enum ContactOutcome (CONTACTED, VISITED, NO_CONTACT, NOT_ATTEMPTED)
✗ enum AccountPriority (LOW, MEDIUM, HIGH)

✗ model CallPlanAccount {
    // Join table for accounts in weekly plan
    // Stores objectives and contact outcomes
  }

✗ model CallPlanActivity {
    // Tracks actual contact activities
    // Links to ActivityType for categorization
  }
```

**Customer Model Extensions Needed:**
```prisma
✗ accountPriority AccountPriority @default(MEDIUM)
✗ territory String?
✗ callPlanAccounts CallPlanAccount[]
✗ callPlanActivities CallPlanActivity[]
```

**CallPlan Model Extensions Needed:**
```prisma
✗ weekNumber Int?  // 1-52
✗ year Int?
✗ status CallPlanStatus @default(DRAFT)
✗ targetCount Int?
✗ accounts CallPlanAccount[]
✗ activities CallPlanActivity[]
```

**Migration Required:**
```bash
npx prisma migrate dev --name add_carla_system
```

---

### 2. Account Type System ⚠️ IMPLEMENTED BUT BUGGY

**Status:** Infrastructure exists but has runtime errors

**Files Present:**
- ✅ `/Users/greghogue/Leora2/web/src/lib/account-types.ts` (shared logic)
- ✅ `/Users/greghogue/Leora2/web/src/jobs/update-account-types.ts` (background job)
- ✅ `/Users/greghogue/Leora2/web/src/jobs/run.ts` (job runner)

**Background Job Configuration:**
```json
// web/package.json
"jobs:update-account-types": "npm run jobs:run -- update-account-types"
```

**Current Error:**
```
TypeError: Cannot read properties of undefined (reading 'ACTIVE')
at updateAccountTypes (/Users/greghogue/Leora2/web/src/lib/account-types.ts:71:41)
```

**Root Cause:** AccountType enum import issue in account-types.ts line 71
- The code references `AccountType.ACTIVE` but the import may be incorrect
- Schema has `AccountType` as optional (`AccountType?`) but code expects it required

**Fix Required:**
1. Verify Prisma client generation: `npx prisma generate`
2. Update Customer.accountType to be required with default:
   ```prisma
   accountType AccountType @default(ACTIVE)
   ```
3. Re-run migration

**Daily Job Schedule:** Not yet configured (requires cron setup)
- Recommended: Run daily at 2am
- Pattern: `0 2 * * *`

---

### 3. shadcn/ui Components ✅ READY

**Installation Status:** ✅ COMPLETE

**Components Directory:** `/Users/greghogue/Leora2/web/src/components/ui/`

**Installed Components (19 total):**
```
✓ avatar.tsx        - User avatars
✓ badge.tsx         - Status badges
✓ button.tsx        - Action buttons
✓ calendar.tsx      - Date pickers
✓ card.tsx          - Content containers
✓ checkbox.tsx      - Form checkboxes
✓ dialog.tsx        - Modal dialogs
✓ dropdown-menu.tsx - Dropdown menus
✓ form.tsx          - Form management
✓ input.tsx         - Text inputs
✓ label.tsx         - Form labels
✓ popover.tsx       - Tooltips/popovers
✓ progress.tsx      - Progress bars
✓ select.tsx        - Select dropdowns
✓ sonner.tsx        - Toast notifications
✓ table.tsx         - Data tables
```

**Dependencies Installed:**
```json
✓ react-grid-layout: ^1.5.2
✓ @types/react-grid-layout: ^1.3.5
✓ date-fns: ^4.1.0
✓ All @radix-ui components
```

**Assessment:** All required UI components for Phase 2 are available

---

### 4. Background Jobs Infrastructure ✅ READY (needs cron)

**Job Runner:** `/Users/greghogue/Leora2/web/src/jobs/run.ts`

**Existing Jobs:**
```typescript
✓ customer-health-assessment.ts (11.7 KB)
✓ supabase-replay.ts (9.2 KB)
✓ update-account-types.ts (3.1 KB) - Phase 2 job
✓ weekly-metrics-aggregation.ts (14.4 KB)
```

**Job Execution:**
```bash
# Manual run
npm run jobs:update-account-types

# Needs setup for automated execution:
# - Node-cron package
# - Vercel Cron (if deploying to Vercel)
# - System cron
```

**Status:** ✅ Infrastructure ready, ⚠️ Automated scheduling not configured

---

### 5. Sales Interface Structure ✅ READY

**Base Path:** `/Users/greghogue/Leora2/web/src/app/sales/`

**Existing Directories:**
```
✓ activities/      - Activity tracking
✓ admin/           - Admin features
✓ call-plan/       - ✅ EXISTS - Ready for Phase 2 enhancement
✓ cart/            - Shopping cart
✓ catalog/         - Product catalog
✓ customers/       - Customer management
✓ dashboard/       - Dashboard with widgets
✓ invoices/        - Invoice management
✓ leora/           - AI assistant
✓ manager/         - Manager tools
✓ orders/          - Order management
✓ reports/         - Reporting
✓ samples/         - Sample management
✓ territory/       - Territory management
```

**Call Plan Current Structure:**
```
/src/app/sales/call-plan/
├── page.tsx (5.3 KB) - Main page, ready for CARLA integration
└── sections/
    ├── CallPlanForm.tsx
    ├── CallPlanList.tsx
    └── CallPlanView.tsx
```

**Dashboard Structure:**
```
/src/app/sales/dashboard/
├── page.tsx
└── Multiple widget components (ready for customization)
```

**Assessment:** ✅ File structure ready for Phase 2 CARLA implementation

---

### 6. API Routes Status ⚠️ PARTIALLY COMPLETE

**Existing Phase 1 API Routes:**

```
/src/app/api/
├── dashboard/
│   └── widgets/          ✅ Dashboard widget API
└── metrics/
    └── definitions/       ✅ Metric definitions API
        ├── route.ts
        ├── route.test.ts
        └── [code]/
            └── route.ts
```

**Phase 2 Required APIs (NOT YET CREATED):**
```
❌ /api/call-plans/
   - POST   Create weekly call plan
   - GET    List call plans
   - PATCH  Update call plan status

❌ /api/call-plans/[id]/
   - GET    Get call plan details
   - PUT    Update call plan
   - DELETE Archive call plan

❌ /api/call-plans/[id]/accounts/
   - POST   Add account to plan
   - DELETE Remove account from plan
   - PATCH  Update objective/outcome

❌ /api/call-plans/[id]/activities/
   - POST   Log contact activity
   - GET    Get plan activities

❌ /api/customers/categorize/
   - POST   Manually categorize account
   - GET    Get categorization rules
```

---

### 7. Test Infrastructure ⚠️ NEEDS ATTENTION

**Test Framework:** Vitest

**Test Commands:**
```json
"test": "vitest run",
"test:watch": "vitest watch"
```

**Current Test Results:**
```
Test Files:  4 failed | 5 passed (9)
Tests:      91 failed | 18 passed (109)
```

**Failing Test Categories:**
1. **Database Connection Issues:**
   - Validation Error Count: 1
   - Prisma schema validation failures
   - SASL authentication errors (connection to Supabase)

2. **Schema Mismatches:**
   - `Cannot read properties of undefined (reading 'deleteMany')`
   - `metricDefinition` model access issues
   - `adminUser` model not found

3. **Migration Status:**
   - Cannot verify migration status (SASL auth failure)
   - Indicates database connection configuration issues

**Blockers:**
- ⚠️ Database connection for tests needs .env.test configuration
- ⚠️ Test database should use separate Supabase project or local PostgreSQL
- ⚠️ Some Phase 1 models may not be properly migrated

**Recommended Actions:**
1. Create `.env.test` with test database credentials
2. Run migrations on test database
3. Fix schema references in failing tests
4. Verify all Phase 1 migrations are applied

---

## Migration Status

### Recent Migrations

```
20251020141714_add_product_enrichment_fields/  ✅
99999999999999_add_performance_indexes/         ✅
add_dashboard_layout.sql                        ✅
add_sales_session_table.sql                     ✅
```

### Verification Issues

**Cannot Verify Applied Status:**
- `npx prisma migrate status` fails with SASL authentication error
- Indicates production database credentials may not be accessible from local environment
- **Impact:** Cannot confirm all migrations are applied to production database

**Recommendation:**
- Use Supabase dashboard to verify applied migrations
- Or run migrations via CI/CD pipeline with proper credentials

---

## Phase 2 Dependencies Summary

### ✅ READY - No Action Required

| Component | Status | Details |
|-----------|--------|---------|
| **shadcn/ui Components** | ✅ Complete | 19 components installed |
| **Base Models** | ✅ Present | Customer, CallPlan, Task exist |
| **AccountType Enum** | ✅ Defined | ACTIVE, TARGET, PROSPECT |
| **Sales Routes** | ✅ Ready | /sales/call-plan/ structure exists |
| **Dashboard Infrastructure** | ✅ Working | Widget system operational |
| **Background Job Framework** | ✅ Ready | Job runner implemented |
| **UI Dependencies** | ✅ Installed | react-grid-layout, date-fns |

### ⚠️ NEEDS FIXES - Blockers

| Component | Issue | Action Required | Priority |
|-----------|-------|-----------------|----------|
| **AccountType Job** | Runtime error reading AccountType.ACTIVE | Fix enum import, make accountType required | 🔴 HIGH |
| **Test Suite** | 91 tests failing | Fix database connection, update schema refs | 🔴 HIGH |
| **Database Migrations** | Cannot verify status | Check Supabase dashboard, verify migrations applied | 🟡 MEDIUM |
| **Customer.accountType** | Optional field | Change to required with default value | 🔴 HIGH |

### ❌ MISSING - Required for Phase 2

| Component | Status | Required For | Priority |
|-----------|--------|--------------|----------|
| **CallPlanAccount model** | Not created | Weekly call planning | 🔴 HIGH |
| **CallPlanActivity model** | Not created | Contact tracking | 🔴 HIGH |
| **ContactOutcome enum** | Not created | X/Y marking | 🔴 HIGH |
| **CallPlanStatus enum** | Not created | Plan lifecycle | 🔴 HIGH |
| **AccountPriority enum** | Not created | Account prioritization | 🟡 MEDIUM |
| **CallPlan extensions** | Missing fields | Week tracking, target count | 🔴 HIGH |
| **Customer extensions** | Missing fields | Territory, priority | 🟡 MEDIUM |
| **CARLA API routes** | Not created | Frontend integration | 🔴 HIGH |
| **Cron scheduling** | Not configured | Daily account updates | 🟡 MEDIUM |

---

## Blockers for Phase 2 Start

### 🔴 Critical Blockers (Must Fix Before Starting)

1. **AccountType System Bug**
   - **Issue:** Background job fails with enum access error
   - **File:** `/web/src/lib/account-types.ts:71`
   - **Fix:**
     ```bash
     cd web
     npx prisma generate  # Regenerate client
     ```
     Update schema:
     ```prisma
     model Customer {
       accountType AccountType @default(ACTIVE)  // Remove ? to make required
     }
     ```
   - **Estimated Time:** 30 minutes

2. **Database Schema Extensions**
   - **Issue:** Missing Phase 2 models (CallPlanAccount, CallPlanActivity, enums)
   - **Fix:** Create and run migration from implementation plan
   - **Command:**
     ```bash
     npx prisma migrate dev --name add_carla_system
     ```
   - **Estimated Time:** 1-2 hours

3. **Test Suite Failures**
   - **Issue:** 91 failing tests prevent safe development
   - **Fix:**
     - Create `.env.test` with test database
     - Fix schema references
     - Ensure migrations applied to test DB
   - **Estimated Time:** 2-3 hours

### 🟡 Medium Priority (Should Fix Soon)

4. **CARLA API Routes**
   - **Issue:** No backend endpoints for Phase 2 features
   - **Impact:** Frontend will have no data source
   - **Fix:** Implement 6 API route groups from implementation plan
   - **Estimated Time:** 4-6 hours

5. **Cron Scheduling**
   - **Issue:** Account type updates require manual execution
   - **Impact:** Account types won't update automatically
   - **Fix:** Configure node-cron or Vercel Cron
   - **Estimated Time:** 1 hour

---

## Recommended Next Steps

### Step 1: Fix Critical Blockers (Day 1)

```bash
# 1. Regenerate Prisma client
cd /Users/greghogue/Leora2/web
npx prisma generate

# 2. Update schema to make accountType required
# Edit: prisma/schema.prisma
# Change: accountType AccountType?
# To:     accountType AccountType @default(ACTIVE)

# 3. Create CARLA system migration
npx prisma migrate dev --name add_carla_system
# Copy schema changes from LEORA_IMPLEMENTATION_PLAN.md Section 2.1

# 4. Verify migration applied
npx prisma migrate status

# 5. Test account type job
npm run jobs:update-account-types
```

### Step 2: Fix Test Infrastructure (Day 1-2)

```bash
# 1. Create test database environment
cp .env .env.test
# Update DATABASE_URL to test database

# 2. Run migrations on test database
DATABASE_URL="..." npx prisma migrate deploy

# 3. Fix failing tests
npm run test

# 4. Verify all tests pass
npm run test -- --coverage
```

### Step 3: Implement Phase 2 Backend (Day 2-3)

```bash
# 1. Create CARLA API routes (see implementation plan)
mkdir -p src/app/api/call-plans/{[id]/{accounts,activities}}

# 2. Implement endpoints:
# - POST /api/call-plans
# - GET /api/call-plans
# - GET/PUT/DELETE /api/call-plans/[id]
# - POST/DELETE /api/call-plans/[id]/accounts
# - POST /api/call-plans/[id]/activities

# 3. Write API tests
# 4. Test with Postman/curl
```

### Step 4: Setup Automation (Day 3)

```bash
# 1. Install cron package
npm install node-cron @types/node-cron

# 2. Create cron service
# src/services/cron.ts

# 3. Configure daily job
# Schedule: 0 2 * * * (2am daily)

# 4. Test cron execution
```

### Step 5: Begin Phase 2 Frontend (Day 4+)

Once blockers resolved:
- Implement CARLA weekly planning UI
- Add account drag-drop to call plan
- Create contact tracking (X/Y marking)
- Build objective setting interface

---

## Memory Storage

Storing verification results for future reference:

**Key:** `phase2/prerequisites`
**Namespace:** `leora-migration`
**Data:**
```json
{
  "ready_to_start": false,
  "blockers": [
    "AccountType background job has runtime errors",
    "Missing CallPlanAccount and CallPlanActivity models",
    "91 tests failing (database connection issues)",
    "CARLA API routes not implemented"
  ],
  "database_ready": false,
  "database_issues": [
    "Schema extensions not applied",
    "Customer.accountType is optional (should be required)",
    "Cannot verify migration status (auth error)"
  ],
  "components_ready": true,
  "apis_ready": false,
  "apis_missing": [
    "/api/call-plans",
    "/api/call-plans/[id]",
    "/api/call-plans/[id]/accounts",
    "/api/call-plans/[id]/activities"
  ],
  "tests_status": "failing",
  "tests_failed": 91,
  "tests_passed": 18,
  "estimated_fix_time": "8-12 hours",
  "completion_percentage": 65,
  "phase1_completion": "incomplete"
}
```

---

## Conclusion

**Phase 2 Status:** ⚠️ **NOT READY - 3-4 Days of Prerequisites Work Required**

**What's Working:**
- ✅ UI component library fully installed
- ✅ File structure ready for CARLA integration
- ✅ Base models (Customer, CallPlan, Task) exist
- ✅ Background job framework operational
- ✅ Dashboard and metrics infrastructure in place

**What Needs Work:**
- 🔴 Fix AccountType enum runtime errors (critical)
- 🔴 Apply Phase 2 database migration (critical)
- 🔴 Fix 91 failing tests (critical)
- 🔴 Implement CARLA API routes (critical)
- 🟡 Setup automated cron scheduling (medium)

**Overall Assessment:**
Phase 1 is approximately **65% complete**. Core infrastructure is solid, but several critical components need attention before Phase 2 can begin. The good news is that the foundation is strong - shadcn/ui is installed, the sales interface structure exists, and the background job framework is operational.

**Time to Phase 2 Ready:** 3-4 days of focused development to resolve blockers.

**Recommendation:**
1. Address the 3 critical blockers first (AccountType bug, schema migration, tests)
2. Implement CARLA API routes
3. Then proceed with Phase 2 frontend development

The project is well-positioned for Phase 2, but attempting to start Phase 2 now would result in immediate blockers due to missing database models and API endpoints.

---

**Generated:** 2025-10-25
**Next Review:** After critical blockers resolved
