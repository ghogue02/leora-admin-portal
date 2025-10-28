# Customer Assignment Fix - Resolution Document

## Issue Summary

**Problem**: Customer page showed "No customers found" for Travis Vernon despite 4,838 customers existing in database.

**Root Cause**: All customers had `salesRepId = NULL`. The API filters customers by `salesRepId`, so unassigned customers were invisible to sales reps.

**Resolution Date**: 2025-10-26

---

## Investigation Results

### Database State (Before Fix)

```
Total Customers: 4,838
Assigned Customers: 0
Unassigned Customers: 4,838 (100%)
```

### Sales Reps in System

```
1. Kelly Neel (kelly@wellcraftedbeverage.com) - North Territory
2. Travis Vernon (travis@wellcraftedbeverage.com) - South Territory
3. Carolyn Vernon (carolyn@wellcraftedbeverage.com) - East Territory
4. Travis Vernon Admin (admin@wellcraftedbeverage.com) - Virginia Territory
5. Greg Hogue (greg.hogue@gmail.com) - NYC
6. Test Admin User (test@wellcrafted.com) - All Territories
```

### API Filtering Logic

File: `/web/src/app/api/sales/customers/route.ts`

```typescript
const where: Prisma.CustomerWhereInput = {
  tenantId,
  salesRepId: salesRep.id,  // ❌ This filtered out NULL assignments
  isPermanentlyClosed: false,
};
```

---

## Solution Implemented

### 1. Customer Assignment Script

**File**: `/web/scripts/assign-customers.ts`

**Strategy**:
- Assign customers to sales reps based on state/territory mapping
- VA customers → South Territory (Travis Vernon)
- MD customers → North Territory (Kelly Neel)
- DC customers → East Territory (Carolyn Vernon)
- Remaining customers → Load balanced across all reps

**Results**:
```
✅ Successfully assigned 4,838 customers

Distribution:
- North Territory (Kelly Neel): 1,202 customers
- South Territory (Travis Vernon): 1,907 customers
- East Territory (Carolyn Vernon): 538 customers
- Virginia Territory (Admin): 397 customers
- NYC (Greg Hogue): 397 customers
- All Territories (Test User): 397 customers
```

### 2. Added "All Customers" View

**Files Modified**:
- `/web/src/app/api/sales/customers/route.ts` - Added `showAll` query parameter
- `/web/src/app/sales/customers/page.tsx` - Added toggle between "My Customers" and "All Customers"

**Benefits**:
- Sales reps can view their assigned customers (default)
- Option to view all tenant customers across territories
- Useful for managers, reporting, and cross-territory visibility

**Implementation**:

```typescript
// API change
const showAll = searchParams.get("showAll") === "true";
const where: Prisma.CustomerWhereInput = {
  tenantId,
  ...(showAll ? {} : { salesRepId: salesRep.id }),
  isPermanentlyClosed: false,
};
```

```tsx
// UI Toggle
<button onClick={() => setShowAllCustomers(false)}>
  My Customers
</button>
<button onClick={() => setShowAllCustomers(true)}>
  All Customers
</button>
```

---

## How to Run the Fix

### Manual Assignment (If Needed Again)

```bash
cd /Users/greghogue/Leora2/web
npx tsx scripts/assign-customers.ts
```

### Verify Assignments

```bash
npx tsx scripts/verify-assignments.ts
```

### Expected Output

```
✅ VERIFICATION RESULTS
======================
Sales Rep: Travis Vernon (travis@wellcraftedbeverage.com)
Territory: South Territory
Customers Assigned: 1907

Sample Customers (first 5):
  1. Fireflies - Alexandria, VA
  2. Zorch Pizza - 2923 W Cary St, VA
  3. Gather Lounge - Unknown, VA
  4. Williamsburg Pottery - Williamsburg, VA
  5. ML Steak - Richmond, VA
```

---

## Prevention Steps

### 1. Update Seed Script to Run Assignments

The seed script at `/web/prisma/seed.ts` already contains assignment logic (lines 340-387) but it wasn't being executed.

**Ensure seed script runs**:
```bash
npm run db:seed
```

### 2. Add Database Constraint (Optional)

Consider making `salesRepId` required for active customers:

```prisma
model Customer {
  salesRepId String // Make required or add default
  // ... other fields
}
```

### 3. Add Assignment Validation

Add API validation to prevent creating customers without assignment:

```typescript
// In customer creation API
if (!data.salesRepId && !data.isPermanentlyClosed) {
  throw new Error("Active customers must be assigned to a sales rep");
}
```

### 4. Monitoring Query

Add this to your health checks:

```sql
SELECT COUNT(*) as unassigned_count
FROM "Customer"
WHERE "salesRepId" IS NULL
  AND "isPermanentlyClosed" = false;
```

Alert if count > 0.

---

## Files Created/Modified

### New Files
- `/web/scripts/assign-customers.ts` - Customer assignment fix script
- `/web/scripts/verify-assignments.ts` - Verification script
- `/web/docs/CUSTOMER_ASSIGNMENT_FIX.md` - This document

### Modified Files
- `/web/src/app/api/sales/customers/route.ts` - Added `showAll` parameter
- `/web/src/app/sales/customers/page.tsx` - Added customer view toggle

---

## Testing Checklist

- [x] Travis Vernon can see his 1,907 assigned customers
- [x] Customer filtering by risk status works
- [x] Search functionality works
- [x] Pagination works correctly
- [x] "My Customers" shows only assigned customers
- [x] "All Customers" shows all 4,838 customers
- [x] Summary stats display correctly
- [x] Customer risk status breakdown appears

---

## Success Metrics

**Before Fix**:
- Customers visible to Travis: 0
- User experience: "No customers found" error

**After Fix**:
- Customers visible to Travis: 1,907 (South Territory)
- All customers visible via toggle: 4,838
- User experience: Full customer management capabilities

---

## Related Issues

- Customer assignment should happen during:
  1. Initial data import/migration
  2. New customer creation
  3. Database seeding
  4. Territory changes

- Consider implementing:
  - Automatic assignment based on customer location
  - Bulk assignment tools for managers
  - Territory management UI
  - Assignment history tracking

---

## Contact

For questions about this fix:
- Check verification script: `npx tsx scripts/verify-assignments.ts`
- Review assignment logic in seed script: `/web/prisma/seed.ts` (lines 340-387)
- Check API implementation: `/web/src/app/api/sales/customers/route.ts`
