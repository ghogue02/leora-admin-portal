# Phase 1 Schema Extensions - Ready to Implement

**Status:** ✅ Analysis Complete - Ready for Implementation
**Date:** 2025-10-25
**Migration:** `add_phase1_foundation`

---

## Executive Summary

The existing Prisma schema at `/Users/greghogue/Leora2/web/prisma/schema.prisma` has been analyzed and is ready for Phase 1 extensions. **No conflicts detected.** All new models follow existing patterns and integrate cleanly with the current 58-model schema.

### What's Being Added
- **3 New Models:** MetricDefinition, DashboardWidget, Job
- **5 New Relations:** 3 to Tenant, 2 to User
- **8 New Indexes:** Optimized for common query patterns
- **0 Conflicts:** No naming, relation, or index conflicts

---

## Current Schema Analysis

### Structure Overview
```
📊 Current Schema (schema.prisma)
├── 58 Models
├── 10 Enums
├── 45 Tenant Relations
├── Multi-tenant: ✅ All models have tenantId
├── ID Strategy: UUID (@db.Uuid)
└── Database: PostgreSQL via Supabase
```

### Key Patterns Identified
1. **Consistent UUID Strategy** - All IDs use `@default(uuid()) @db.Uuid`
2. **Multi-tenant Isolation** - Every model has `tenantId` with cascade delete
3. **Temporal Tracking** - `createdAt` and `updatedAt` on most models
4. **JSON Flexibility** - Json fields for extensible configuration
5. **Proper Indexing** - Strategic indexes on foreign keys and query patterns

---

## Phase 1 New Models

### 1️⃣ MetricDefinition
**Purpose:** Version-controlled business metric definitions

```prisma
model MetricDefinition {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  code        String   // "at_risk_customer", "contacted_recently"
  name        String   // "At Risk Customer"
  description String   // Full definition
  formula     Json?    // { field: "lastOrderDate", operator: ">", value: "30 days" }
  version     Int      @default(1)
  effectiveAt DateTime @default(now())
  deprecatedAt DateTime?
  createdById String   @db.Uuid
  createdAt   DateTime @default(now())

  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy User   @relation(fields: [createdById], references: [id])

  @@unique([tenantId, code, version])
  @@index([tenantId, code])
  @@index([tenantId, effectiveAt])
}
```

**Use Cases:**
- Define what "at risk" means for customers
- Track metric definition changes over time
- Allow admins to customize business rules
- Audit trail for metric calculation changes

---

### 2️⃣ DashboardWidget
**Purpose:** User-customizable dashboard layout

```prisma
model DashboardWidget {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  userId      String?  @db.Uuid // null = tenant default
  widgetType  String   // "at_risk_customers", "revenue_trend"
  position    Int      // Display order
  size        String   @default("medium") // "small", "medium", "large"
  isVisible   Boolean  @default(true)
  config      Json?    // Widget-specific configuration
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, widgetType])
  @@index([tenantId, userId])
}
```

**Use Cases:**
- Reps customize their dashboard widgets
- Admins set tenant-wide defaults (userId = null)
- Drag-drop reordering (position field)
- Widget-specific settings (config JSON)

---

### 3️⃣ Job
**Purpose:** Background job queue for async processing

```prisma
model Job {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  type        String   // "image_extraction", "account_type_update"
  payload     Json
  status      String   @default("pending") // "pending", "processing", "completed", "failed"
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  result      Json?
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([status])
  @@index([type, status])
}
```

**Use Cases:**
- Image extraction (business card scanning) - avoids serverless timeouts
- Daily account type updates
- Batch metric calculations
- Sample revenue attribution (30-day window)

---

## Required Schema Updates

### Tenant Model (Lines 13-63)
**Add 3 Relations:**
```prisma
model Tenant {
  // ... existing 45 relations ...
  metricDefinitions MetricDefinition[]
  dashboardWidgets  DashboardWidget[]
  jobs              Job[]
  // ... rest of model ...
}
```

**Insert After:**
```prisma
  integritySnapshots  DataIntegritySnapshot[]
```

---

### User Model (Lines 114-138)
**Add 2 Relations:**
```prisma
model User {
  // ... existing relations ...
  metricDefinitions MetricDefinition[]
  dashboardWidgets  DashboardWidget[]
  // ... rest of model ...
}
```

**Insert After:**
```prisma
  auditLogs       AuditLog[]
```

---

## Implementation Steps

### Step 1: Update Schema File
```bash
# Edit /Users/greghogue/Leora2/web/prisma/schema.prisma

# 1. Add Phase 1 models after DataIntegritySnapshot (line 1069)
# 2. Update Tenant model (add 3 relations)
# 3. Update User model (add 2 relations)
```

See `/Users/greghogue/Leora2/docs/phase1-schema-additions.prisma` for ready-to-copy code.

---

### Step 2: Run Migration
```bash
cd /Users/greghogue/Leora2/web

# Create migration
npx prisma migrate dev --name add_phase1_foundation

# Generate Prisma Client
npx prisma generate

# Verify migration
npx prisma migrate status
```

---

### Step 3: Verify Database
```bash
# Check tables created
npx prisma db execute --stdin <<SQL
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('MetricDefinition', 'DashboardWidget', 'Job');
SQL

# Expected output:
# MetricDefinition
# DashboardWidget
# Job
```

---

## Integration Points

### API Routes to Create (Next Steps)

#### Metrics API
```
GET    /api/metrics/definitions          # List all metric definitions
POST   /api/metrics/definitions          # Create new metric version
GET    /api/metrics/definitions/[code]   # Get current definition
PATCH  /api/metrics/definitions/[code]   # Update (creates new version)
DELETE /api/metrics/definitions/[code]   # Deprecate definition
```

#### Dashboard API
```
GET    /api/dashboard/widgets            # Get user's widget layout
POST   /api/dashboard/widgets            # Add widget
PATCH  /api/dashboard/widgets/[id]       # Update widget
DELETE /api/dashboard/widgets/[id]       # Remove widget
```

#### Job Queue API
```
POST   /api/jobs/process                 # Process pending jobs (cron)
GET    /api/jobs/[id]                    # Get job status
```

---

## Conflict Analysis

### ✅ No Naming Conflicts
- `MetricDefinition` - New unique name
- `DashboardWidget` - New unique name
- `Job` - New unique name (no existing Job model)

### ✅ No Relation Conflicts
- All relation names follow existing patterns
- No circular dependencies
- Proper cascade deletes configured

### ✅ No Index Conflicts
- Unique constraints properly scoped by tenantId
- Composite indexes match existing patterns
- No duplicate index definitions

---

## Data Integrity Safeguards

### Cascade Delete Behavior
```
Tenant deleted → MetricDefinitions deleted
Tenant deleted → DashboardWidgets deleted
Tenant deleted → Jobs deleted
User deleted → DashboardWidgets deleted (where userId = user)
User deleted → MetricDefinitions kept (preserve audit trail)
```

### Unique Constraints
```
MetricDefinition: One version per (tenant, code, version)
DashboardWidget:  One widget per (tenant, user, widgetType)
Job:              No uniqueness required (queue items)
```

---

## Testing Checklist

### Post-Migration Tests
- [ ] Schema validation passes (`npx prisma validate`)
- [ ] Migration applied successfully
- [ ] All 3 new tables exist in database
- [ ] Tenant model has 48 relations (45 + 3)
- [ ] User model has relations to new models
- [ ] Foreign key constraints created
- [ ] Indexes created successfully
- [ ] No migration warnings

### Integration Tests
- [ ] Can create MetricDefinition with version 1
- [ ] Can create new version (v2) of same metric code
- [ ] Can create tenant-wide DashboardWidget (userId = null)
- [ ] Can create user-specific DashboardWidget
- [ ] Can enqueue Job with status "pending"
- [ ] Cascade delete works (delete tenant → all related records deleted)

---

## Files Created

### Documentation
1. `/Users/greghogue/Leora2/docs/phase1-schema-analysis.md`
   - Detailed analysis report
   - Model specifications
   - Implementation checklist

2. `/Users/greghogue/Leora2/docs/phase1-schema-additions.prisma`
   - Ready-to-copy Prisma code
   - Exact insertion points
   - Model relation updates

3. `/Users/greghogue/Leora2/docs/PHASE1_READY_TO_IMPLEMENT.md` (this file)
   - Executive summary
   - Implementation guide
   - Testing checklist

### Memory Storage
- `phase1/schema-analysis` - Analysis summary
- `phase1/implementation-status` - Current status

---

## Next Actions

### Immediate (Schema)
1. ✅ Schema analysis complete
2. ⏭️ Copy code from `phase1-schema-additions.prisma`
3. ⏭️ Update `schema.prisma`
4. ⏭️ Run migration: `npx prisma migrate dev --name add_phase1_foundation`
5. ⏭️ Verify: `npx prisma generate`

### Subsequent (API & UI)
6. Create Metrics API endpoints
7. Create Dashboard API endpoints
8. Create Job queue processor
9. Build UI components (shadcn/ui)
10. Seed default metric definitions

---

## Risk Assessment

### Low Risk ✅
- **Schema Changes:** Additive only, no breaking changes
- **Multi-tenant:** Follows existing patterns exactly
- **Indexes:** Strategic, improves query performance
- **Relations:** Proper cascade configuration

### Mitigations
- **Backup Database** before migration
- **Test in development** environment first
- **Prisma Migrate** handles schema versioning
- **Rollback Available** via Prisma migrate

---

## Success Criteria

Migration is successful when:

1. ✅ `npx prisma migrate dev` completes without errors
2. ✅ `npx prisma generate` succeeds
3. ✅ Database contains 61 tables (58 + 3 new)
4. ✅ Foreign key constraints verified
5. ✅ Indexes created on all specified columns
6. ✅ Cascade deletes work as expected
7. ✅ Multi-tenant isolation maintained

---

## Support Resources

### Prisma Documentation
- [Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Indexes](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes)

### Project Documentation
- Implementation Plan: `/Users/greghogue/Leora2/docs/LEORA_IMPLEMENTATION_PLAN.md`
- Current Schema: `/Users/greghogue/Leora2/web/prisma/schema.prisma`

---

**Status:** Ready to implement Phase 1 schema extensions. All analysis complete, no blockers identified.

**Next Step:** Apply schema changes and run migration.
