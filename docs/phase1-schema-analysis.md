# Phase 1 Schema Analysis Report
**Generated:** 2025-10-25
**Status:** ✅ Ready for Implementation
**Migration Name:** `add_phase1_foundation`

---

## Current Schema Structure

### Summary Statistics
- **Total Models:** 58
- **Tenant Relations:** 45 existing
- **Database Type:** PostgreSQL (Supabase)
- **ID Strategy:** UUID (@db.Uuid)
- **Multi-tenant:** Yes (all models have tenantId)
- **Preview Features:** postgresqlExtensions

### Existing Enums (10)
```prisma
PortalUserStatus, OrderStatus, InvoiceStatus, CartStatus,
ActivityOutcome, TaskStatus, TaskPriority, ComplianceStatus,
WebhookStatus, CustomerRiskStatus
```

---

## Phase 1 Additions Required

### New Models (3)

#### 1. MetricDefinition
**Purpose:** Track versioned definitions of business metrics (e.g., "at risk customer")

**Key Fields:**
- `code` - Metric identifier (e.g., "at_risk_customer")
- `version` - Version number for tracking changes over time
- `formula` - JSON formula for calculations
- `effectiveAt` / `deprecatedAt` - Temporal validity

**Relations:**
- `tenant` → Tenant (onDelete: Cascade)
- `createdBy` → User

**Indexes:**
- Unique: `[tenantId, code, version]`
- Index: `[tenantId, code]`, `[tenantId, effectiveAt]`

---

#### 2. DashboardWidget
**Purpose:** Store user dashboard customization (widget layout, visibility)

**Key Fields:**
- `userId` - Nullable (null = tenant default)
- `widgetType` - Widget identifier (e.g., "at_risk_customers")
- `position` - Display order
- `size` - "small", "medium", "large"
- `config` - JSON widget configuration

**Relations:**
- `tenant` → Tenant (onDelete: Cascade)
- `user` → User (optional, onDelete: Cascade)

**Indexes:**
- Unique: `[tenantId, userId, widgetType]`
- Index: `[tenantId, userId]`

---

#### 3. Job
**Purpose:** Background job queue for async processing (image extraction, batch updates)

**Key Fields:**
- `type` - Job type (e.g., "image_extraction")
- `status` - "pending", "processing", "completed", "failed"
- `attempts` / `maxAttempts` - Retry logic
- `payload` / `result` - JSON data
- `error` - Error message if failed

**Relations:**
- `tenant` → Tenant (onDelete: Cascade)

**Indexes:**
- Index: `[tenantId]`, `[status]`, `[type, status]`

---

## Required Schema Updates

### Tenant Model Updates (Lines 13-63)
**Add 3 Relations:**
```prisma
model Tenant {
  // ... existing 45 relations ...
  metricDefinitions MetricDefinition[]
  dashboardWidgets  DashboardWidget[]
  jobs              Job[]
}
```

### User Model Updates (Lines 114-138)
**Add 2 Relations:**
```prisma
model User {
  // ... existing relations ...
  metricDefinitions MetricDefinition[]
  dashboardWidgets  DashboardWidget[]
}
```

---

## Insertion Strategy

### Location
- **After:** `DataIntegritySnapshot` model (line 1069)
- **Before:** End of file (line 1070)
- **Section Comment:** Add header comment for Phase 1 models

### Order of Addition
1. Add Phase 1 section comment
2. Add `MetricDefinition` model
3. Add `DashboardWidget` model
4. Add `Job` model
5. Update `Tenant` model (add 3 relations)
6. Update `User` model (add 2 relations)

---

## Conflict Analysis

### ✅ No Naming Conflicts
- `MetricDefinition` - New model name
- `DashboardWidget` - New model name
- `Job` - New model name (no existing Job model)

### ✅ No Relation Conflicts
- All new relation names unique
- No circular dependencies
- Proper cascade deletion configured

### ✅ No Index Conflicts
- Unique constraints properly scoped by tenantId
- Index patterns match existing schema conventions

---

## Ready-to-Use Schema Code

```prisma
// ============================================================================
// PHASE 1: FOUNDATION & SETUP - METRIC DEFINITIONS & DASHBOARD
// ============================================================================

model MetricDefinition {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  code        String   // "at_risk_customer", "contacted_recently", etc.
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

model DashboardWidget {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  userId      String?  @db.Uuid // null = tenant default
  widgetType  String   // "at_risk_customers", "revenue_trend", "tasks_from_management"
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

model Job {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  type        String   // "image_extraction", "account_type_update", etc.
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

---

## Implementation Checklist

### Database Migration
- [ ] Add Phase 1 models to schema.prisma (lines 1070+)
- [ ] Update Tenant model with 3 new relations
- [ ] Update User model with 2 new relations
- [ ] Run: `npx prisma migrate dev --name add_phase1_foundation`
- [ ] Run: `npx prisma generate`

### Verification
- [ ] Schema validation passes
- [ ] No migration conflicts
- [ ] Relations properly configured
- [ ] Indexes created successfully

### Integration Points
- [ ] Metrics API routes (`/api/metrics/definitions/*`)
- [ ] Dashboard API routes (`/api/dashboard/widgets/*`)
- [ ] Job queue processor (`/api/jobs/process`)
- [ ] Background job scheduler (cron or Vercel)

---

## Next Steps After Migration

1. **API Layer:** Create CRUD endpoints for MetricDefinition and DashboardWidget
2. **Job Queue:** Implement job processing infrastructure
3. **UI Components:** Build dashboard customization interface
4. **Seed Data:** Initialize default metric definitions
5. **Testing:** Verify multi-tenant isolation and cascading deletes

---

## Notes

- All models follow existing schema patterns (UUID, tenantId, timestamps)
- Cascade deletes ensure data integrity on tenant/user deletion
- JSON fields provide flexibility for future extensions
- Indexes optimize common query patterns
- Version tracking enables audit trail for metric definitions

**Status:** Schema analysis complete. Ready to proceed with Phase 1 implementation.
