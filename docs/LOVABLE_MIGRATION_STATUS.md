# Lovable Database Migration Status
## Well Crafted → Lovable Data Migration Required

**Date:** 2025-10-22
**Discovery:** Lovable database is essentially EMPTY
**Action Required:** Full data migration from Well Crafted to Lovable

---

## 🔍 Current State Analysis

### Well Crafted Database (Source) ✅
**URL:** `zqezunzlyjkseugujkrl.supabase.co`
**Status:** Fully populated with all migration work

| Table | Rows | Status |
|-------|------|--------|
| Customer | 4,864 | ✅ Complete |
| Product | 3,140 | ✅ Complete (+1,261 new) |
| Sku | 2,607 | ✅ Complete (+1,322 new) |
| Order | 2,669 | ✅ Complete |
| OrderLine | 7,774 | ✅ Complete (NEW!) |
| Invoice | 2,126 | ✅ Complete |
| User | 5 | ✅ Complete |
| SalesRep | 5 | ✅ Complete |
| ImportedInvoices | 2,484 | ✅ Complete (reclassified) |
| SupplierInvoices | 409 | ✅ Complete |

### Lovable Database (Target) ❌
**URL:** `wlwqkblueezqydturcpv.supabase.co`
**Status:** EMPTY (only has 1,285 old SKUs)

| Table | Rows | Status |
|-------|------|--------|
| customers | 0 | ❌ Empty |
| products | 0 | ❌ Empty |
| skus | 1,285 | ⚠️ OLD SKUs only (missing 1,322 new) |
| orders | 0 | ❌ Empty |
| orderlines | 0 | ❌ Empty |
| invoices | 0 | ❌ Empty |
| users | 0 | ❌ Empty |
| sales_reps | 0 | ❌ Empty |

---

## 🚨 Critical Findings

### Issue #1: Wrong Database Used
All tonight's migration work was done on Well Crafted database instead of Lovable.

### Issue #2: Lovable Has No Data
The Lovable database is essentially a fresh, empty database (except for 1,285 old SKUs).

### Issue #3: Case Sensitivity
- Well Crafted uses: `Customer`, `Product`, `Order` (PascalCase)
- Lovable uses: `customers`, `products`, `orders` (lowercase)

**This is a schema difference that needs to be handled during migration!**

---

## 📋 Complete Migration Required

### What Needs to Migrate:

1. **All Tables** - Every table from Well Crafted → Lovable
2. **All Data** - Complete dataset (4,864 customers, etc.)
3. **Schema Mapping** - Handle PascalCase → lowercase
4. **SKU Updates** - Add 1,322 new SKUs to existing 1,285
5. **OrderLines** - Critical for revenue display (7,774 records)

---

## 🎯 Migration Strategy

### Recommended Approach: Supabase Client Migration

**Use Supabase JavaScript client to:**
1. Read from Well Crafted (source)
2. Transform data (PascalCase → lowercase)
3. Write to Lovable (target)
4. Handle batching for large tables

**Advantages:**
- ✅ Handles schema differences
- ✅ Works with Supabase Row Level Security
- ✅ Can transform data during migration
- ✅ Progress tracking
- ✅ Error handling per record

**Time Estimate:** 1-2 hours

---

## 📊 Migration Priority

### Phase 1: Core Business Data (CRITICAL)
1. Products (3,140) → products
2. SKUs (2,607) → skus
3. Customers (4,864) → customers
4. Orders (2,669) → orders
5. OrderLines (7,774) → orderlines **← Critical for revenue!**
6. Invoices (2,126) → invoices

### Phase 2: Users & Auth
7. Users (5) → users
8. SalesReps (5) → sales_reps

### Phase 3: Supporting Data
9. ImportedInvoices (2,484)
10. SupplierInvoices (409)
11. Other tables as needed

---

## 🔧 Schema Mapping

### Table Name Mapping:

| Well Crafted | Lovable |
|--------------|---------|
| Customer | customers |
| Product | products |
| Sku | skus |
| Order | orders |
| OrderLine | orderlines |
| Invoice | invoices |
| User | users |
| SalesRep | sales_reps |
| PortalUser | portal_users |
| Cart | carts |
| CartItem | cart_items |

---

## ⏱️ Estimated Timeline

### Total Migration Time: ~2 hours

- **Phase 1 (Core Data):** 60-90 minutes
  - Products: 5 min
  - SKUs: 10 min
  - Customers: 15 min
  - Orders: 10 min
  - OrderLines: 20 min (7,774 records)
  - Invoices: 10 min

- **Phase 2 (Users):** 10 minutes
- **Phase 3 (Supporting):** 20 minutes

---

## 🎯 Next Steps

### Immediate:
1. Create Supabase-to-Supabase migration script
2. Handle schema name transformations
3. Batch large tables (1000 records per batch)
4. Execute migration

### After Migration:
1. Verify all data copied correctly
2. Check row counts match
3. Test revenue display in UI
4. Update `.env.local` to use Lovable permanently

---

## 📄 Scripts to Create

**File:** `/web/src/scripts/migrate-wellcrafted-to-lovable.ts`

**What it will do:**
- Connect to both databases
- Read from Well Crafted
- Transform schema names
- Write to Lovable
- Report progress

---

**Status:** Ready to build migration script
**Waiting:** Confirmation to proceed with full data migration

---

**Document saved:** `/docs/LOVABLE_MIGRATION_STATUS.md`
