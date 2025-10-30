# Phase 2.1 CARLA System - Complete Schema Package

**Status:** ✅ Design Complete - Ready for Implementation
**Created:** 2025-10-25
**Working Directory:** `/Users/greghogue/Leora2/web`

---

## 📦 Package Contents

This package contains all schema design artifacts for Phase 2.1 of the CARLA (Call Planning and Account Management) System.

### Core Files

| File | Size | Purpose |
|------|------|---------|
| **phase2-schema-additions.prisma** | 7.3K | Prisma schema additions (copy-paste ready) |
| **phase2-migration.sql** | 17K | Complete SQL migration script |
| **phase2-schema-documentation.md** | 24K | Full design documentation |
| **phase2-verification-queries.sql** | 17K | Comprehensive verification suite |
| **PHASE2_SCHEMA_SUMMARY.md** | 11K | Executive summary and quick start |

### Total Package
- **5 files**
- **75K total documentation**
- **2 new models**
- **3 new enums**
- **15 indexes**
- **2 views**
- **3 functions**

---

## 🚀 Quick Start

### 1. Review Schema Design
```bash
cd /Users/greghogue/Leora2/docs

# Quick overview
cat PHASE2_SCHEMA_SUMMARY.md

# Full documentation
cat phase2-schema-documentation.md

# Prisma schema additions
cat phase2-schema-additions.prisma
```

### 2. Execute Migration
```bash
# Open Supabase Dashboard → SQL Editor
# Copy and execute: phase2-migration.sql
```

### 3. Verify Migration
```bash
# In Supabase SQL Editor
# Execute queries from: phase2-verification-queries.sql
```

### 4. Update Prisma
```bash
cd /Users/greghogue/Leora2/web
npx prisma db pull
npx prisma generate
npm run typecheck
```

---

## 📋 Schema Overview

### New Enums (3)
- `AccountPriority` - LOW | MEDIUM | HIGH
- `CallPlanStatus` - DRAFT | ACTIVE | COMPLETED | ARCHIVED
- `ContactOutcome` - NOT_ATTEMPTED | NO_CONTACT | CONTACTED | VISITED

### New Models (2)
- `CallPlanAccount` - Join table linking customers to call plans with X/Y/Blank tracking
- `CallPlanActivity` - Activity tracking specific to call plan execution

### Extended Models (4)
- `Customer` - Added accountPriority, territory
- `CallPlan` - Added weekNumber, year, status, targetCount
- `Tenant` - Added relations to new models
- `ActivityType` - Added relation to CallPlanActivity

---

## 🗂️ File Guide

### 1. phase2-schema-additions.prisma
**Purpose:** Prisma schema additions in standard Prisma format
**Use Case:** Reference for updating `/prisma/schema.prisma`
**Contains:**
- Enum definitions
- Model definitions with full documentation
- Relation specifications
- Index definitions
- Migration notes

**When to Use:**
- Understanding Prisma data model
- Copy-paste schema additions
- Reference for tRPC endpoint types

---

### 2. phase2-migration.sql
**Purpose:** Complete SQL migration script for Supabase Dashboard
**Use Case:** Manual execution in Supabase SQL Editor
**Contains:**
- Enum creation (3 enums)
- Table alterations (2 tables extended)
- New table creation (2 tables)
- Index creation (15 indexes)
- RLS policy setup
- Helper function creation
- View creation
- Data migration
- Verification queries

**When to Use:**
- Executing the database migration
- Understanding SQL structure
- Troubleshooting migration issues
- Rollback procedures

**Execution:**
```sql
-- Copy entire file contents
-- Paste into Supabase Dashboard → SQL Editor
-- Execute (runs as single transaction)
```

---

### 3. phase2-schema-documentation.md
**Purpose:** Comprehensive design documentation
**Use Case:** Deep understanding of schema design decisions
**Contains:**
- Architecture overview
- Detailed component descriptions
- Design decision rationales
- Entity relationship diagrams
- Query patterns and performance
- Security considerations
- Usage examples
- Troubleshooting guide

**When to Use:**
- Understanding "why" behind design choices
- Learning query patterns
- Performance optimization
- Onboarding new developers
- Reference during implementation

**Sections:**
1. Schema Components (enums, models)
2. Database Objects (indexes, views, functions)
3. Security (RLS policies, permissions)
4. Performance Considerations
5. Data Relationships
6. Migration Steps
7. Usage Examples
8. Future Enhancements
9. Troubleshooting

---

### 4. phase2-verification-queries.sql
**Purpose:** Comprehensive post-migration verification
**Use Case:** Validate migration success and schema correctness
**Contains:**
- 19 verification query sections
- Enum verification
- Table structure validation
- Foreign key checks
- Index verification
- RLS policy validation
- View testing
- Function testing
- Data migration validation
- Performance testing
- Comprehensive summary query

**When to Use:**
- After executing migration
- Troubleshooting issues
- Performance testing
- Schema auditing

**Execution:**
```sql
-- Run individual sections as needed
-- Or run entire file for full validation
-- Check output against expected values
```

---

### 5. PHASE2_SCHEMA_SUMMARY.md
**Purpose:** Executive summary and quick reference
**Use Case:** High-level overview and quick start guide
**Contains:**
- Quick start instructions
- File inventory
- Schema changes overview
- Key design decisions
- Usage examples
- Verification checklist
- Next steps
- Rollback procedure

**When to Use:**
- First-time review
- Quick reference
- Status updates
- Planning next phase

---

## 🔍 Understanding the Schema

### Core Concept: Weekly Call Planning

The CARLA system enables sales reps to:

1. **Create weekly call plans** with specific account targets
2. **Select accounts** to contact based on priority and territory
3. **Track contact outcomes** using X/Y/Blank checkbox system
4. **Log activities** performed during plan execution
5. **Review performance** with completion percentages

### Data Flow

```
Rep creates CallPlan (week 42, 2025)
    ↓
Add accounts via CallPlanAccount
    ↓
Set objectives for each account
    ↓
Execute: Update contactOutcome (CONTACTED/VISITED)
    ↓
Log activities via CallPlanActivity
    ↓
Review via CallPlanSummary view
```

### X/Y/Blank Checkbox System

| UI | Enum Value | Meaning |
|-----|-----------|---------|
| ☐ (empty) | NOT_ATTEMPTED | Not yet tried |
| ☐ (blank) | NO_CONTACT | Tried but couldn't reach |
| ☑ X | CONTACTED | Reached via email/phone/text |
| ☑ Y | VISITED | In-person visit completed |

---

## 🏗️ Architecture Decisions

### 1. Why CallPlanAccount Join Table?

**Alternative Considered:** Embed accounts directly in CallPlan as JSON array

**Decision:** Separate join table

**Rationale:**
- Enables per-account objectives and notes
- Supports historical tracking
- Allows flexible contact outcome updates
- Better query performance for filtering
- Type-safe with Prisma relations

---

### 2. Why Separate CallPlanActivity?

**Alternative Considered:** Reuse existing Activity model only

**Decision:** Create CallPlanActivity linking to Activity

**Rationale:**
- Explicitly links activities to call plans
- Enables call-plan-specific reporting
- Maintains separation between general CRM and call planning
- Allows filtering activities by plan
- Supports performance analysis by week

---

### 3. Why Week Number + Year?

**Alternative Considered:** Date range (startDate, endDate)

**Decision:** weekNumber (1-52) + year

**Rationale:**
- Simpler UI/UX (pick a week vs. date range)
- Aligns with sales planning cycles
- Easy historical queries (week over week)
- ISO week standard
- More intuitive for reps

---

### 4. Why Territory as String?

**Alternative Considered:** Territory model with regions, hierarchies

**Decision:** Simple string field

**Rationale:**
- Phase 2.1 scope: basic filtering only
- Can be refactored to model in future phase
- Reduces initial complexity
- Flexible for different territory schemes
- Enables quick implementation

---

## 📊 Performance Profile

### Query Performance Targets

| Operation | Target | Scaling |
|-----------|--------|---------|
| List call plans | <50ms | 52 plans/year |
| Load plan with accounts | <200ms | 50 accounts |
| Filter accounts | <100ms | 1000 accounts |
| Update contact outcome | <50ms | Single update |
| Get account history | <100ms | 10 weeks |

### Index Strategy

**Primary Indexes (Query Performance):**
- `CallPlan(year, weekNumber)` - Week lookups
- `CallPlanAccount(callPlanId)` - Plan details
- `CallPlanAccount(customerId)` - Account history
- `Customer(territory)` - Territory filtering
- `Customer(accountPriority)` - Priority filtering

**Secondary Indexes (Filtering):**
- `CallPlan(status)` - Active plans only
- `CallPlanAccount(contactOutcome)` - Completion tracking
- `CallPlanActivity(occurredAt)` - Date range queries

---

## 🔒 Security

### Multi-Tenant Isolation

**Implementation:**
- RLS policies on all new tables
- Tenant ID in every query via `app.current_tenant_id`
- Automatic filtering by Supabase

**Setup Required:**
```typescript
// Set tenant context for session
await prisma.$executeRaw`
  SELECT set_config('app.current_tenant_id', ${tenantId}, false)
`;
```

### Permission Model

**Role: `authenticated`**
- SELECT, INSERT, UPDATE, DELETE on all tables
- Read access to views
- Execute access to functions

**Application Layer:**
- Additional role checking (admin vs. rep)
- Territory-based filtering
- Own data access only

---

## 🧪 Testing Strategy

### Post-Migration Tests

1. **Schema Validation** - Run phase2-verification-queries.sql
2. **Data Integrity** - Check foreign keys, unique constraints
3. **RLS Policies** - Verify tenant isolation
4. **Performance** - Run EXPLAIN ANALYZE on key queries
5. **View Accuracy** - Compare view output to manual aggregation

### Application Tests

1. **Unit Tests** - Model creation, updates, deletions
2. **Integration Tests** - API endpoints with database
3. **E2E Tests** - Full user workflows
4. **Performance Tests** - Load testing with realistic data

---

## 📈 Next Steps

### Immediate (Post-Migration)

1. ✅ Execute phase2-migration.sql
2. ✅ Run verification queries
3. ✅ Update Prisma schema (`npx prisma db pull`)
4. ✅ Generate Prisma client (`npx prisma generate`)
5. ✅ Verify types (`npm run typecheck`)

### Phase 2.2 (API Layer)

1. Create tRPC routers
   - `callPlan.create` - Create new call plan
   - `callPlan.list` - List plans for rep
   - `callPlan.get` - Get plan details
   - `callPlan.addAccounts` - Add accounts to plan
   - `callPlan.updateOutcome` - Update contact outcome
   - `callPlan.summary` - Get plan statistics

2. Create Zod schemas for validation
3. Add unit tests for business logic
4. Document API endpoints

### Phase 2.3 (UI Components)

1. Call plan builder interface
2. Weekly tracking grid (X/Y/Blank)
3. Account selection and filtering
4. Objective setting UI
5. Summary dashboard
6. PDF export for weekly plans

---

## 🐛 Troubleshooting

### Migration Fails

**Issue:** Foreign key constraint violation
**Solution:** Check that base tables (Customer, CallPlan, Tenant, ActivityType) exist

**Issue:** Enum already exists
**Solution:** Drop existing enum or rename in migration

**Issue:** RLS policy error
**Solution:** Ensure authenticated role exists in Supabase

### Prisma Issues

**Issue:** `npx prisma db pull` fails
**Solution:** Check DATABASE_URL, DIRECT_URL in .env

**Issue:** Type errors after migration
**Solution:** Re-run `npx prisma generate`

**Issue:** Query fails with RLS error
**Solution:** Set `app.current_tenant_id` in session

### Performance Issues

**Issue:** Slow call plan list query
**Solution:** Check indexes on (year, weekNumber, status)

**Issue:** Slow account history
**Solution:** Use AccountCallPlanHistory view instead of manual JOIN

---

## 🎯 Success Criteria

### Migration Success
- [ ] All verification queries return expected results
- [ ] Prisma introspection completes without errors
- [ ] TypeScript compilation succeeds
- [ ] No RLS policy violations in test queries

### Schema Quality
- [ ] All foreign keys have CASCADE behavior
- [ ] All query patterns have supporting indexes
- [ ] All tables have RLS policies enabled
- [ ] All enums have sensible default values

### Documentation
- [ ] Schema changes documented
- [ ] Design decisions recorded
- [ ] Usage examples provided
- [ ] Troubleshooting guide complete

---

## 📚 References

### Internal Documents
- Implementation Plan: `/docs/LEORA_IMPLEMENTATION_PLAN.md`
- Main Prisma Schema: `/prisma/schema.prisma`
- Prerequisites Check: `/docs/phase2-prerequisites-check.md`

### External Resources
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Enums](https://www.postgresql.org/docs/current/datatype-enum.html)
- [ISO Week Date](https://en.wikipedia.org/wiki/ISO_week_date)

---

## 💾 Memory Storage

Schema design stored in ReasoningBank for coordination:

**Key:** `phase2/schema-design`
**Memory ID:** `3dcaf907-439e-4372-82a0-3da2342e99a7`

**Retrieve:**
```bash
npx claude-flow@alpha memory retrieve "phase2/schema-design"
```

**Contains:**
- Models added: CallPlanAccount, CallPlanActivity
- Enums added: AccountPriority, CallPlanStatus, ContactOutcome
- Models extended: Customer, CallPlan, Tenant, ActivityType
- Relations created: 7 foreign keys
- Indexes: 15, Views: 2, Functions: 3

---

## 📞 Support

### Questions?
1. Review schema documentation for design details
2. Check verification queries for validation examples
3. Consult implementation plan for business requirements
4. Review this README for quick reference

### Issues?
1. Check troubleshooting section
2. Review verification query output
3. Consult schema documentation
4. Check Prisma/Supabase logs

---

## ✅ Status: READY FOR IMPLEMENTATION

All Phase 2.1 schema design work is complete and documented. The package includes:

- ✅ Complete schema design
- ✅ Production-ready migration script
- ✅ Comprehensive documentation
- ✅ Verification suite
- ✅ Usage examples
- ✅ Troubleshooting guide
- ✅ Performance optimization
- ✅ Security implementation

**Next Action:** Execute migration in Supabase Dashboard and proceed to Phase 2.2 (API Layer)

---

*Package Created: 2025-10-25*
*System Architect: Claude Code*
*Version: 1.0.0*
