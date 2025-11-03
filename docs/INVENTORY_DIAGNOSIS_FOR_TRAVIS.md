# Inventory Diagnosis Report - For Discussion with Travis

**Date**: November 3, 2025
**Prepared by**: Development Team
**Status**: 🔴 **310 SKUs Missing Inventory Records (25% of catalog)**

---

## Executive Summary

Our product catalog displays many items as "Out of stock (0 on hand)" not because inventory is zero, but because **310 SKUs (25%) have no inventory records in the database at all**. This affects the user experience when creating orders, as these products appear unavailable even if they might be in stock.

---

## Current Database State

### Overall Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total SKUs** | 1,241 | 100% |
| **Inventory Records** | 1,045 | - |
| **SKUs WITH Inventory** | 931 | 75% ✅ |
| **SKUs WITHOUT Inventory** | **310** | **25%** ❌ |

### Warehouse Location Distribution

| Location | Inventory Records |
|----------|-------------------|
| **Warrenton** | 893 (primary) |
| **main** | 94 |
| **Baltimore** | 58 |

---

## Impact on User Experience

### What Users See

When browsing the product catalog in the "Add Products to Order" modal:

**Products WITH Inventory** (75%):
```
✅ Skylark Alondra Chardonnay (CAL1054)
   739 units available in Warrenton

✅ Collina San Ponzio Barbera D'Alba (ITA1014)
   3,360 units available in Warrenton
```

**Products WITHOUT Inventory** (25%):
```
❌ Two Mountain Pet Nat (WAS1033)
   ● Out of stock (0 on hand)

❌ Orchard Lane Riesling (NWZ1004)
   ● Out of stock (0 on hand)
```

The system is **correctly reporting** the database state - these products genuinely have no inventory records.

---

## Examples of SKUs Without Inventory

Sample of the 310 SKUs missing inventory records:

1. **WAS1033** - Two Mountain Pet Nat
2. **NWZ1004** - Orchard Lane Riesling
3. **RIO1088** - Cepas Viejas
4. **CREDIT1** - Customer Credit *(special case - not a physical product)*
5. **POR1017** - Quinta do Mourao White 50 Year

*Note: Some may be discontinued products, special items, or products never fully onboarded into inventory system.*

---

## Options for Resolution

### Option 1: Create Default Inventory Records (Recommended)

**What**: Create inventory records for all 310 missing SKUs with default values (0 on hand)

**Pros**:
- Shows accurate "0 on hand" instead of no data
- "In Stock Only" filter will work correctly for all products
- Future inventory updates will have records to modify
- Provides complete audit trail when inventory arrives

**Cons**:
- Creates 310 new database records
- May expose discontinued products in catalog

**Implementation**:
```bash
npx tsx scripts/create-default-inventory.ts --location Warrenton
```

**Impact**: All products will show inventory status, even if 0

---

### Option 2: Filter Catalog to Hide Products Without Inventory

**What**: Update catalog API to only return SKUs that have inventory records

**Pros**:
- Cleaner product list (only show trackable products)
- Users won't see "Out of stock" for untracked items
- Reduces confusion

**Cons**:
- Hides 25% of catalog (310 products)
- May hide products that should be orderable
- Doesn't solve underlying data issue

**Implementation**: Add filter to catalog query:
```typescript
where: {
  inventories: { some: {} }  // Only SKUs with inventory
}
```

**Impact**: Catalog shrinks from 1,241 to 931 products

---

### Option 3: Import Inventory from External System

**What**: Identify source of truth for these 310 SKUs and import their inventory

**Note**: Cannot use HAL inventory CSV due to SKU misalignment (documented in CLAUDE.md)

**Pros**:
- Accurate inventory for all products
- Complete system visibility

**Cons**:
- Requires manual SKU mapping
- Time-consuming data validation
- Risk of importing incorrect data

---

### Option 4: Manual Inventory Entry via Admin Interface

**What**: Use existing admin tools to manually add inventory for needed products

**Pros**:
- Full control over data accuracy
- Can prioritize active/important products
- No bulk import risks

**Cons**:
- Time-intensive for 310 SKUs
- Ongoing maintenance burden
- May miss products

---

## Questions for Travis

### Business Questions

1. **Are these 310 SKUs active products?**
   - Should they be visible in the catalog?
   - Are they discontinued items?
   - Are they special items (like CREDIT1)?

2. **What's the source of truth for inventory?**
   - Does Wellcrafted maintain separate inventory system?
   - Should we sync from warehouse management system?
   - Are these products stocked but not tracked?

3. **What's the desired user experience?**
   - Show all products (even if 0 inventory)?
   - Hide products without inventory tracking?
   - Show with warning that inventory is not tracked?

### Technical Questions

4. **Default inventory initialization?**
   - Create records with 0 on hand for all missing SKUs?
   - Wait for actual inventory count before creating records?
   - Auto-create records when product is added to system?

5. **Inventory location strategy?**
   - Use "Warrenton" as default location?
   - Require location selection when creating inventory?
   - Support multi-location inventory from start?

6. **Ongoing inventory management?**
   - How will inventory be updated going forward?
   - Manual entry vs automated sync?
   - Integration with warehouse system?

---

## Recommendations

### Short-Term (Immediate)

1. **Use "In Stock Only" filter** (now deployed)
   - Users can filter to only products with available inventory
   - Reduces confusion when creating orders
   - Works with current data state

2. **Communicate to sales team**
   - Explain why some products show "Out of stock"
   - Provide list of affected SKUs
   - Set expectations until resolved

### Medium-Term (After Travis Decision)

Based on Travis's answers, implement chosen option:
- Create default inventory (Option 1) - 1 hour
- Filter catalog (Option 2) - 30 minutes
- Manual entry (Option 4) - ongoing

### Long-Term (Process Improvement)

1. **Automated inventory sync**
   - Establish source of truth system
   - Schedule regular sync (daily/weekly)
   - Alert on missing inventory records

2. **Inventory onboarding workflow**
   - When new SKU is created, auto-create inventory record
   - Prompt for initial inventory count
   - Require location assignment

3. **Reporting & alerts**
   - Dashboard showing SKUs without inventory
   - Alert when new products lack inventory data
   - Audit trail for inventory changes

---

## Technical Implementation Notes

**If Option 1 (Default Records) is chosen**:

Script will create inventory records like:
```sql
INSERT INTO "Inventory" (
  "tenantId", "skuId", "location",
  "onHand", "allocated", "status"
) VALUES (
  '58b8126a-2d2f-4f55-bc98-5b6784800bed',
  '<sku-id>',
  'Warrenton',
  0,
  0,
  'AVAILABLE'
);
```

**If Option 2 (Filter Catalog) is chosen**:

Update catalog API query:
```typescript
const skus = await db.sku.findMany({
  where: {
    tenantId,
    isActive: true,
    product: { isActive: true },
    inventories: { some: {} }  // ADD THIS LINE
  }
});
```

---

## Appendix: Detailed Diagnostic Output

### Sample SKUs WITH Inventory (working correctly):

1. **CAL1054** - Skylark Alondra Chardonnay
   - Location: Warrenton
   - Quantity: 739 on hand, 0 allocated, 739 available

2. **ITA1014** - Collina San Ponzio Barbera D'Alba
   - Location: Warrenton
   - Quantity: 3,360 on hand, 0 allocated, 3,360 available

3. **FRA1143** - Domaine Benedetti Cotes du Rhone
   - Location: Warrenton
   - Quantity: 19 on hand, 0 allocated, 19 available

### Sample SKUs WITHOUT Inventory (showing as out of stock):

1. **WAS1033** - Two Mountain Pet Nat
   - Status: NO INVENTORY RECORDS FOUND

2. **NWZ1004** - Orchard Lane Riesling
   - Status: NO INVENTORY RECORDS FOUND

3. **CREDIT1** - Customer Credit
   - Status: NO INVENTORY RECORDS FOUND
   - Note: This is likely a special SKU for credits, not a physical product

---

**Next Steps**: Schedule meeting with Travis to discuss options and determine preferred approach.
