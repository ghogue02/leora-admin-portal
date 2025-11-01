# Testing Phase 2 - Complete Remaining Tests

**Date**: October 31, 2025
**Status**: Inventory seeded ✅ - Ready for full testing
**Previous Results**: 8/12 suites passed, 4 pending due to inventory

---

## ✅ INVENTORY NOW AVAILABLE

**Just Added**:
- 50 products with 100 units each
- Available at all 3 warehouses (Baltimore, Warrenton, main)
- Products include: Malbec, Chardonnay, Pinot Noir, Cabernet, etc.

**Example Products Ready to Test**:
- Murdoch Hill Chardonnay: 90 available (100 on hand, 10 allocated)
- Lambert Estate Cabernet: 90 available
- Anko Malbec: 90 available
- Seppeltsfield Shiraz: 90 available

---

## 🎯 COMPLETE THESE REMAINING TESTS

### Test P2.1: Create Successful Order (NOW POSSIBLE)

**Steps**:
1. Refresh browser (inventory cache may need update)
2. Go to `/sales/orders` → "New Order"
3. Select any customer
4. Choose delivery date: Tomorrow
5. Warehouse: Baltimore (or any)
6. Click "Add Products"
7. Search "Malbec" or "Chardonnay"
8. **Should now see GREEN badges** (90 available)
9. Add product with quantity: 12
10. Submit → "Create Order" (not "Submit for Approval")
11. Should succeed!

**Expected Results**:
- [ ] Product shows GREEN badge (sufficient inventory)
- [ ] NO "Manager Approval Required" banner
- [ ] Submit button says "Create Order"
- [ ] Order creates successfully
- [ ] Redirects to order detail page
- [ ] Order status = PENDING

**Verify in Database**:
```bash
# Check order created:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.findFirst({ orderBy: { createdAt: 'desc' }, include: { customer: true, lines: true } }).then(o => { console.log('Latest Order:'); console.log('  ID:', o?.id.slice(0,8)); console.log('  Customer:', o?.customer.name); console.log('  Status:', o?.status); console.log('  Total:', o?.total); console.log('  Line items:', o?.lines.length); }).finally(() => prisma.\$disconnect());"

# Check inventory allocated:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.findFirst({ where: { location: 'Baltimore', sku: { code: { startsWith: 'ARG' } } } }).then(inv => { const avail = (inv?.onHand || 0) - (inv?.allocated || 0); console.log('Inventory Check:'); console.log('  OnHand:', inv?.onHand); console.log('  Allocated:', inv?.allocated); console.log('  Available:', avail); }).finally(() => prisma.\$disconnect());"
```

**Report**:
```
✅ PASS / ❌ FAIL
Order created successfully: Yes / No
Order ID: _______________________
Status: PENDING / Other
Inventory allocated: Yes / No
Notes: _______________________
```

---

### Test P2.2: Mark Order Ready to Deliver

**Prerequisites**: Order from Test P2.1

**Steps**:
1. Get order ID from Test P2.1
2. Update order status to READY_TO_DELIVER:
   ```bash
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.update({ where: { id: 'ORDER_ID_HERE' }, data: { status: 'READY_TO_DELIVER' } }).then(() => console.log('✅ Order marked READY_TO_DELIVER')).finally(() => prisma.\$disconnect());"
   ```

3. Refresh browser
4. Navigate to `/sales/operations/queue`
5. **Should now see the order!**

**Expected Results**:
- [ ] Order appears in operations queue
- [ ] Shows customer name, delivery date, warehouse
- [ ] Status badge shows "READY TO DELIVER"
- [ ] Can select the order (checkbox)

**Report**:
```
✅ PASS / ❌ FAIL
Order visible in queue: Yes / No
Details correct: Yes / No
Can select: Yes / No
Notes: _______________________
```

---

### Test P2.3: Bulk Print Invoices (CRITICAL)

**Prerequisites**: At least 2-3 orders from Test P2.2 in READY_TO_DELIVER status

**Create more test orders if needed**:
```bash
# Quick create 2 more orders manually:
# 1. Repeat Test P2.1 with different products
# 2. Mark each as READY_TO_DELIVER (Test P2.2)
# OR use API to create:
```

**Test Steps**:
1. Go to `/sales/operations/queue`
2. **Verify**: At least 2 orders visible
3. Click checkboxes to select orders
4. **Verify**: Blue banner appears: "X orders selected"
5. Click **"Print Invoices (ZIP)"** button
6. Wait for processing ("Generating...")
7. **Download should start**
8. Check Downloads folder for ZIP file
9. Extract ZIP
10. Verify contents

**Expected Results**:
- [ ] Selection works (checkboxes toggle)
- [ ] Banner shows correct count
- [ ] "Print Invoices (ZIP)" button enabled
- [ ] ZIP file downloads
- [ ] Filename: `invoices-YYYY-MM-DD.zip`
- [ ] ZIP contains 1 file per order
- [ ] Files are .txt format (text invoices)
- [ ] Each file contains order details

**Report**:
```
✅ PASS / ❌ FAIL
Bulk print works: Yes / No
ZIP downloaded: Yes / No
Files in ZIP: ___ (count - should match selected orders)
Invoice content valid: Yes / No
Notes: _______________________
```

---

### Test P2.4: Bulk Mark as Picked (CRITICAL)

**Prerequisites**: Orders from Test P2.3

**Steps**:
1. Return to `/sales/operations/queue`
2. Select same orders
3. Click **"Mark as Picked"** button
4. **Verify confirmation dialog**:
   - Shows: "Mark X orders as Picked?"
5. Click confirm
6. Wait for processing
7. **Observe**:
   - Success message or notification
   - Orders disappear from "Ready to Deliver" filter OR status changes

8. **Change filter** to Status = "Picked"
9. **Verify orders now show with PICKED status**

**Expected Results**:
- [ ] Confirmation dialog appears
- [ ] Processing indicator shows
- [ ] Success response
- [ ] Orders status updated to PICKED
- [ ] Orders visible when filtering by "Picked"
- [ ] No errors in console

**Verify in Database**:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.count({ where: { status: 'PICKED' } }).then(count => console.log('Orders with PICKED status:', count)).finally(() => prisma.\$disconnect());"
```

**Report**:
```
✅ PASS / ❌ FAIL
Bulk mark as picked works: Yes / No
Orders updated: ___ (count)
Confirmation dialog: Yes / No
Status filter works: Yes / No
Notes: _______________________
```

---

### Test P2.5: Bulk Mark as Delivered + Inventory Decrement (CRITICAL)

**Prerequisites**: Orders from Test P2.4 now in PICKED status

**IMPORTANT**: Note inventory BEFORE and AFTER

**Before Test - Record Inventory**:
```bash
# Get SKU from one of your orders:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.findFirst({ where: { status: 'PICKED' }, include: { lines: { include: { sku: true } } } }).then(o => { if (o && o.lines[0]) { console.log('Order:', o.id.slice(0,8)); console.log('SKU:', o.lines[0].sku.code); console.log('Quantity:', o.lines[0].quantity); return prisma.inventory.findFirst({ where: { skuId: o.lines[0].skuId, location: o.warehouseLocation || 'main' } }); } }).then(inv => { if (inv) { console.log('\\nBEFORE DELIVERY:'); console.log('  OnHand:', inv.onHand); console.log('  Allocated:', inv.allocated); console.log('  Available:', inv.onHand - inv.allocated); } }).finally(() => prisma.\$disconnect());"
```

**Record These Values**:
- OnHand BEFORE: ___
- Allocated BEFORE: ___
- Available BEFORE: ___
- Order Quantity: ___

**Test Steps**:
1. Go to `/sales/operations/queue`
2. Filter: Status = "Picked"
3. Select orders (1-3 orders)
4. Click **"Mark as Delivered"** button
5. Confirm dialog
6. Wait for processing
7. **Observe**: Success message

**After Test - Check Inventory**:
```bash
# Run same query as "BEFORE" - should show decremented values
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.findFirst({ where: { skuId: 'SKU_ID_FROM_ABOVE', location: 'WAREHOUSE_FROM_ABOVE' } }).then(inv => { console.log('AFTER DELIVERY:'); console.log('  OnHand:', inv?.onHand); console.log('  Allocated:', inv?.allocated); console.log('  Available:', (inv?.onHand || 0) - (inv?.allocated || 0)); }).finally(() => prisma.\$disconnect());"
```

**Expected Calculations**:
```
Example: Order qty = 12

BEFORE:
  OnHand: 100
  Allocated: 22 (12 for this order + 10 from others)
  Available: 78

AFTER (Expected):
  OnHand: 88 (100 - 12) ✓
  Allocated: 10 (22 - 12) ✓
  Available: 78 (88 - 10) ✓ (unchanged or increased)
```

**Expected Results**:
- [ ] Bulk delivered successful
- [ ] Orders status = DELIVERED
- [ ] **OnHand decreased** by order quantity
- [ ] **Allocated decreased** by order quantity
- [ ] Available correct
- [ ] Math is accurate
- [ ] No negative values

**Report**:
```
✅ PASS / ❌ FAIL
Bulk delivered successful: Yes / No
Orders status updated: Yes / No

INVENTORY MATH:
Before:  OnHand=___ Allocated=___ Available=___
After:   OnHand=___ Allocated=___ Available=___
Expected: OnHand=___ Allocated=___ Available=___
Math Correct: YES / NO

Critical: This test MUST pass for production!
Notes: _______________________
```

---

## 📊 FINAL TEST SUMMARY TEMPLATE

**After completing Phase 2 tests, report**:

```
TESTING PHASE 2 COMPLETE

New Tests Completed:
✅/❌ P2.1: Create successful order
✅/❌ P2.2: Mark ready to deliver
✅/❌ P2.3: Bulk print invoices
✅/❌ P2.4: Bulk mark as picked
✅/❌ P2.5: Bulk mark as delivered + inventory decrement

COMBINED RESULTS (Phase 1 + Phase 2):
Total Test Suites: 12
Passed: ___ / 12
Failed: ___ / 12

CRITICAL TESTS STATUS:
✅/❌ Order creation with inventory
✅/❌ Inventory visibility (already passed)
✅/❌ Manager approvals (already passed)
✅/❌ Bulk print (Phase 2)
✅/❌ Bulk status update (Phase 2)
✅/❌ Inventory decrement (Phase 2 - CRITICAL)

FINAL RECOMMENDATION:
□ APPROVED FOR PRODUCTION (all critical tests pass)
□ NEEDS FIXES (list critical issues)
□ MORE TESTING NEEDED (explain why)

Issues Remaining:
1. _______________________
2. _______________________

Overall Confidence: HIGH / MEDIUM / LOW
```

---

## 🚀 Quick Start for Phase 2

**Your frontend agent should**:

1. **Refresh the browser** (inventory cache needs update)
2. **Run Test P2.1** (create order - should succeed now with green badges)
3. **Run Test P2.2** (mark ready - use database command provided)
4. **Create 2-3 more orders** (repeat P2.1) for bulk testing
5. **Run Test P2.3** (bulk print)
6. **Run Test P2.4** (bulk mark picked)
7. **Run Test P2.5** (bulk delivered + **verify inventory math**)
8. **Report final results**

**Estimated Time**: 30-45 minutes for Phase 2

---

## 🎯 SUCCESS CRITERIA

**System is production-ready if**:
- ✅ P2.1 passes (order creation)
- ✅ P2.3 passes (bulk print)
- ✅ P2.4 passes (bulk picked)
- ✅ **P2.5 passes with correct inventory math** (CRITICAL!)

**If Test P2.5 passes**: System is 100% ready for production! ✅

---

**Inventory is now ready - agent can complete all remaining tests!** 🧪