# Order System Testing Checklist - Frontend Agent

**Date**: October 31, 2025
**Tester**: Frontend Agent
**System**: Travis Order System (HAL Workflow)
**Test Environment**: Local Development

---

## 🚀 SETUP INSTRUCTIONS

### 1. Start Local Development Server

```bash
cd /Users/greghogue/Leora2/web

# Start the server
npm run dev

# Server should start on: http://localhost:3000
# Wait for: "Ready in XXXms"
```

**Verify**:
- [ ] Server starts without errors
- [ ] Port 3000 is accessible
- [ ] No console errors in terminal

---

### 2. Login as Sales Rep

**Navigate to**: `http://localhost:3000/sales/login`

**Credentials**: Use existing sales rep account
- Email: `[Use existing from database]`
- Password: `[Use existing]`

**OR Create Test Account**:
```bash
# Check existing users:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.user.findMany({ include: { salesRepProfile: true }, take: 3 }).then(users => { users.forEach(u => console.log('Email:', u.email, '| Has SalesRep:', !!u.salesRepProfile)); }).finally(() => prisma.\$disconnect());"
```

**Verify**:
- [ ] Can login successfully
- [ ] Redirects to `/sales/dashboard`
- [ ] Navigation menu appears

---

## 📋 TEST SUITE 1: ORDER CREATION (BASIC)

### Test 1.1: Create Order with Sufficient Inventory

**Steps**:
1. Navigate to `/sales/orders`
2. Click **"New Order"** button (top right)
3. **Customer Selection**:
   - Select any customer from dropdown
   - Verify territory, payment terms auto-display
4. **Delivery Settings**:
   - Pick delivery date: Tomorrow's date
   - Verify warehouse auto-selected
   - Keep default time window: "Anytime"
5. **Leave PO and instructions blank** (for now)
6. **Skip adding products** (for basic test)
7. Observe form validation

**Expected Results**:
- [ ] "New Order" button visible and clickable
- [ ] Customer dropdown loads (may take a moment)
- [ ] Auto-fills: territory, payment terms, warehouse
- [ ] Date picker allows future dates
- [ ] Warehouse shows: Baltimore, Warrenton, or main
- [ ] Submit button is disabled (no products added yet)

**Report**:
```
✅ PASS / ❌ FAIL
Notes: _______________________
```

---

### Test 1.2: Add Products to Order

**Continuing from Test 1.1**:

1. Click **"Add Products"** button
2. **Verify Modal Opens**:
   - Should see product grid
   - Search box visible
   - Category filter visible
3. **Search for Product**:
   - Type "Chardonnay" in search
   - Wait for results to filter
4. **Check Inventory Display**:
   - Each product should show inventory badge
   - Look for color coding:
     - Green = sufficient stock
     - Yellow = low stock
     - Red = insufficient stock
   - Hover over badge → See tooltip with details
5. **Add Product**:
   - Find product with GREEN badge (sufficient inventory)
   - Set quantity: 12
   - Click **"Add"** button
6. **Verify Return to Form**:
   - Modal closes
   - Product appears in line items table
   - Quantity shows: 12
   - Price calculated
   - Total updated

**Expected Results**:
- [ ] Modal opens smoothly
- [ ] Product search works (filters as you type)
- [ ] Inventory badges visible (may show "Checking..." briefly)
- [ ] Can add product successfully
- [ ] Product appears in order form
- [ ] Submit button now enabled

**Report**:
```
✅ PASS / ❌ FAIL
Product added: _______________________
Inventory status: Green / Yellow / Red
Notes: _______________________
```

---

### Test 1.3: Submit Order (Sufficient Inventory)

**Continuing from Test 1.2**:

1. **Review Order Summary**:
   - Verify line items table shows product
   - Check total calculated correctly
   - No "Approval Required" banner should show
2. **Click "Create Order"** button
3. **Wait for submission**
4. **Check redirect**:
   - Should redirect to order detail page
   - URL format: `/sales/orders/[uuid]`
5. **Verify Success**:
   - Order appears on page
   - Status badge visible

**Expected Results**:
- [ ] Order submits without errors
- [ ] Redirects to order detail page within 2-3 seconds
- [ ] Order ID visible in URL
- [ ] Success (no error messages)
- [ ] Status should be: PENDING or READY_TO_DELIVER

**Report**:
```
✅ PASS / ❌ FAIL
Order ID: _______________________
Status: _______________________
Total: $_______________________
Notes: _______________________
```

---

## 📋 TEST SUITE 2: VALIDATION & WARNINGS

### Test 2.1: Same-Day Delivery Warning

**Steps**:
1. Start new order (repeat setup from Test 1.1)
2. Select customer
3. **Set delivery date to TODAY** (current date)
4. **Observe warning**

**Expected Results**:
- [ ] Warning modal appears
- [ ] Message: "You've selected today's date for delivery"
- [ ] Two buttons: "Change Date" and "Continue Anyway"
- [ ] Clicking "Change Date" → clears date, closes modal
- [ ] Clicking "Continue Anyway" → accepts date, closes modal, can proceed

**Report**:
```
✅ PASS / ❌ FAIL
Warning appeared: Yes / No
Can override: Yes / No
Notes: _______________________
```

---

### Test 2.2: PO Number Validation

**Steps**:
1. **Find customer requiring PO**:
   ```bash
   # Run this to find one:
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.customer.findFirst({ where: { requiresPO: true }, select: { id: true, name: true } }).then(c => console.log('Customer requiring PO:', c?.name || 'None found')).finally(() => prisma.\$disconnect());"
   ```

2. **If none found, create test**:
   ```bash
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.customer.update({ where: { id: 'FIRST_CUSTOMER_ID' }, data: { requiresPO: true } }).then(c => console.log('Updated:', c.name)).finally(() => prisma.\$disconnect());"
   ```

3. Start new order with that customer
4. **Verify**: "⚠ PO Number Required" badge shows
5. Try to submit **without** PO number
6. **Observe error**
7. Enter PO number: "TEST-PO-12345"
8. Submit again

**Expected Results**:
- [ ] Badge shows "PO Number Required" when customer selected
- [ ] Submit without PO → Error: "PO number is required for this customer"
- [ ] Submit with PO → Success

**Report**:
```
✅ PASS / ❌ FAIL
PO validation works: Yes / No
Error message shown: Yes / No
Notes: _______________________
```

---

### Test 2.3: Low Inventory - Approval Required

**Steps**:
1. **Find product with low inventory**:
   ```bash
   # Find SKUs with low available inventory:
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.findMany({ where: { onHand: { lte: 10 } }, include: { sku: { include: { product: true } } }, take: 3 }).then(inv => { inv.forEach(i => { const avail = i.onHand - i.allocated; console.log('Product:', i.sku.product.name, '| Available:', avail, '| SKU:', i.sku.code); }); }).finally(() => prisma.\$disconnect());"
   ```

2. **OR Manually set low inventory**:
   ```bash
   # Set a product to have low inventory:
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.update({ where: { id: 'INVENTORY_ID' }, data: { onHand: 5, allocated: 3 } }).then(() => console.log('Set to 5 onHand, 3 allocated = 2 available')).finally(() => prisma.\$disconnect());"
   ```

3. Start new order
4. Select customer
5. Add product with low inventory
6. Set quantity HIGHER than available (e.g., request 10 when only 2 available)
7. **Observe**:
   - Red inventory badge
   - "Manager Approval Required" banner appears
8. Submit order

**Expected Results**:
- [ ] Product shows RED badge when insufficient
- [ ] Banner appears: "⚠ Manager Approval Required"
- [ ] Submit button says "Submit for Approval"
- [ ] Order creates successfully
- [ ] Redirects to order page
- [ ] Order status = DRAFT
- [ ] Can see requiresApproval = true (check in UI or database)

**Report**:
```
✅ PASS / ❌ FAIL
Red badge shown: Yes / No
Approval banner shown: Yes / No
Order status: DRAFT / Other
Notes: _______________________
```

---

## 📋 TEST SUITE 3: MANAGER APPROVAL WORKFLOW

### Test 3.1: View Approval Queue

**Prerequisites**: Order created in Test 2.3 (status=DRAFT, requiresApproval=true)

**Steps**:
1. Navigate to `/sales/manager/approvals`
2. **Observe page**:
   - Should show list of orders
   - At least 1 order (from Test 2.3)
3. **Check order card shows**:
   - Customer name
   - Delivery date
   - Warehouse
   - Total amount
   - Line items with inventory shortfall

**Expected Results**:
- [ ] Page loads without errors
- [ ] Shows at least 1 order from Test 2.3
- [ ] Order card displays all details
- [ ] Shortfall highlighted in red/amber
- [ ] "Approve" and "Reject" buttons visible

**Report**:
```
✅ PASS / ❌ FAIL
Orders shown: ___ (count)
Details visible: Yes / No
Shortfall shown: Yes / No
Notes: _______________________
```

---

### Test 3.2: Approve Order

**Continuing from Test 3.1**:

1. Click **"Approve Order"** button on an order
2. Confirm in dialog
3. Wait for processing
4. **Observe**:
   - Order disappears from approval queue
   - Success message or redirect

**Expected Results**:
- [ ] Confirmation dialog appears
- [ ] Processing indicator shows ("Approving...")
- [ ] Order removed from queue after approval
- [ ] No errors displayed

**Verify in Database**:
```bash
# Check order status changed:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.findFirst({ where: { id: 'ORDER_ID_FROM_TEST' }, select: { status: true, requiresApproval: true, approvedById: true } }).then(o => console.log('Status:', o?.status, '| RequiresApproval:', o?.requiresApproval, '| ApprovedBy:', o?.approvedById ? 'SET' : 'NULL')).finally(() => prisma.\$disconnect());"
```

**Expected**:
- [ ] status = PENDING (was DRAFT)
- [ ] requiresApproval = false (was true)
- [ ] approvedById = [user-id] (was null)

**Report**:
```
✅ PASS / ❌ FAIL
Order approved successfully: Yes / No
Status changed to PENDING: Yes / No
Inventory allocated: Yes / No (check db)
Notes: _______________________
```

---

### Test 3.3: Reject Order

**Steps**:
1. Create another low-inventory order (repeat Test 2.3)
2. Go to `/sales/manager/approvals`
3. Click **"Reject"** button
4. Enter reason: "Insufficient inventory - recommend alternative"
5. Confirm
6. **Observe**:
   - Order disappears from queue
   - Success indication

**Expected Results**:
- [ ] Prompt asks for rejection reason
- [ ] Order removed from queue after reject
- [ ] No errors

**Verify in Database**:
- [ ] status = CANCELLED
- [ ] Activity log created with rejection reason

**Report**:
```
✅ PASS / ❌ FAIL
Rejection successful: Yes / No
Order cancelled: Yes / No
Notes: _______________________
```

---

## 📋 TEST SUITE 4: OPERATIONS QUEUE

### Test 4.1: View Operations Queue

**Prerequisites**: Create 2-3 orders and mark them as READY_TO_DELIVER

**Setup Orders**:
```bash
# Quick script to mark an order as READY_TO_DELIVER:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.update({ where: { id: 'ORDER_ID' }, data: { status: 'READY_TO_DELIVER' } }).then(() => console.log('Order marked READY_TO_DELIVER')).finally(() => prisma.\$disconnect());"
```

**Steps**:
1. Navigate to `/sales/operations/queue`
2. **Observe page layout**:
   - Filter section (delivery date, status, warehouse)
   - Order cards or table
   - Select all checkbox
   - Bulk action buttons (when orders selected)

**Expected Results**:
- [ ] Page loads without errors
- [ ] Shows orders with status = READY_TO_DELIVER (by default)
- [ ] Filter controls visible
- [ ] Order cards show: customer, delivery date, warehouse, total
- [ ] Special instructions highlighted if present
- [ ] Select checkboxes visible

**Report**:
```
✅ PASS / ❌ FAIL
Orders displayed: ___ (count)
Filters working: Yes / No
UI rendering correctly: Yes / No
Notes: _______________________
```

---

### Test 4.2: Filter Operations Queue

**Steps**:
1. **Test Date Filter**:
   - Set delivery date to tomorrow
   - Verify only tomorrow's orders show
   - Clear filter → All orders show

2. **Test Status Filter**:
   - Change to "Picked"
   - Verify only PICKED orders show (may be 0)
   - Change back to "Ready to Deliver"

3. **Test Warehouse Filter**:
   - Select "Baltimore"
   - Verify only Baltimore orders show
   - Select "All Warehouses"

4. **Click "Clear Filters"** button

**Expected Results**:
- [ ] Date filter works (orders filtered by delivery date)
- [ ] Status filter works (shows only selected status)
- [ ] Warehouse filter works (shows only selected warehouse)
- [ ] Clear filters resets all to defaults
- [ ] Order count updates as filters change

**Report**:
```
✅ PASS / ❌ FAIL
Date filter: Working / Not working
Status filter: Working / Not working
Warehouse filter: Working / Not working
Clear filters: Working / Not working
Notes: _______________________
```

---

### Test 4.3: Bulk Print Invoices

**Steps**:
1. Ensure at least 2-3 orders visible in queue
2. **Select orders**:
   - Click checkbox on first order
   - Click checkbox on second order
   - Verify "X orders selected" banner appears
3. Click **"Print Invoices (ZIP)"** button
4. Wait for processing
5. **Verify download**:
   - ZIP file downloads
   - Filename format: `invoices-YYYY-MM-DD.zip`
6. **Extract ZIP**:
   - Right-click → Extract
   - Open extracted folder
7. **Check contents**:
   - Should have 1 file per order
   - Files are .txt format (or .pdf if PDF generation enabled)
   - Open one file → Verify invoice content

**Expected Results**:
- [ ] Can select individual orders
- [ ] Selection banner appears showing count
- [ ] "Print Invoices (ZIP)" button enabled when orders selected
- [ ] Processing indicator shows ("Generating...")
- [ ] ZIP file downloads successfully
- [ ] ZIP contains correct number of files (1 per order)
- [ ] Invoice files contain order details

**Report**:
```
✅ PASS / ❌ FAIL
Orders selected: ___ (count)
ZIP downloaded: Yes / No
ZIP filename: _______________________
Files in ZIP: ___ (count)
Invoice content valid: Yes / No
Notes: _______________________
```

---

### Test 4.4: Bulk Mark as Picked

**Steps**:
1. Go back to `/sales/operations/queue`
2. Filter: Status = "Ready to Deliver"
3. Select 2-3 orders (or Select All)
4. Click **"Mark as Picked"** button
5. **Verify confirmation dialog**:
   - Message: "Mark X orders as Picked?"
   - Confirm button
   - Cancel button
6. Click **Confirm**
7. Wait for processing
8. **Observe result**:
   - Success message or toast
   - Orders update or disappear from view (if filter still on READY_TO_DELIVER)

**Expected Results**:
- [ ] Confirmation dialog appears
- [ ] Shows correct count of orders
- [ ] Can cancel or confirm
- [ ] Processing indicator shows
- [ ] Success message appears
- [ ] Orders status updated (verify by changing filter to "Picked")

**Verify in Database**:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.count({ where: { status: 'PICKED' } }).then(count => console.log('Orders with PICKED status:', count)).finally(() => prisma.\$disconnect());"
```

**Expected**: Count should increase by number of orders marked

**Report**:
```
✅ PASS / ❌ FAIL
Bulk picked successful: Yes / No
Orders updated: ___ (count)
Status changed: Yes / No
Notes: _______________________
```

---

### Test 4.5: Bulk Mark as Delivered

**Prerequisites**: Orders from Test 4.4 now in PICKED status

**Steps**:
1. **Change filter**: Status = "Picked"
2. Select same orders from Test 4.4
3. Click **"Mark as Delivered"** button
4. Confirm dialog
5. Wait for processing
6. **Observe**:
   - Success message
   - Orders disappear or status updates

**CRITICAL - Verify Inventory Decremented**:
```bash
# Before marking delivered - note inventory levels:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.findFirst({ where: { skuId: 'SKU_FROM_ORDER' }, select: { onHand: true, allocated: true } }).then(inv => console.log('BEFORE - OnHand:', inv?.onHand, '| Allocated:', inv?.allocated, '| Available:', (inv?.onHand || 0) - (inv?.allocated || 0))).finally(() => prisma.\$disconnect());"

# After marking delivered - check again:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.findFirst({ where: { skuId: 'SKU_FROM_ORDER' }, select: { onHand: true, allocated: true } }).then(inv => console.log('AFTER - OnHand:', inv?.onHand, '| Allocated:', inv?.allocated, '| Available:', (inv?.onHand || 0) - (inv?.allocated || 0))).finally(() => prisma.\$disconnect());"
```

**Expected Results**:
- [ ] Bulk delivered successful
- [ ] Orders status = DELIVERED
- [ ] **Inventory.onHand decreased** by order quantity
- [ ] **Inventory.allocated decreased** by order quantity
- [ ] Available inventory unchanged or increased

**Report**:
```
✅ PASS / ❌ FAIL
Bulk delivered successful: Yes / No
Inventory decremented: Yes / No
OnHand before: ___ | after: ___
Allocated before: ___ | after: ___
Calculation correct: Yes / No
Notes: _______________________
```

---

## 📋 TEST SUITE 5: TERRITORY & DELIVERY VALIDATION

### Test 5.1: Territory Delivery Days Admin

**Steps**:
1. Navigate to `/admin/territories/delivery-schedule`
2. **Observe page**:
   - List of sales reps with territories
   - Delivery days shown for each
3. **Edit schedule**:
   - Click "Edit Schedule" on a rep
   - Toggle days on/off (click Mon/Wed/Fri)
   - Click "Save"
4. Wait for save
5. Verify days updated on page

**Expected Results**:
- [ ] Page loads successfully
- [ ] Shows list of sales reps
- [ ] Can edit delivery schedule
- [ ] Days toggle on click
- [ ] Save button works
- [ ] Schedule persists after save

**Report**:
```
✅ PASS / ❌ FAIL
Page loads: Yes / No
Can edit schedule: Yes / No
Save successful: Yes / No
Days persist: Yes / No
Notes: _______________________
```

---

### Test 5.2: Delivery Day Validation in Order Form

**Prerequisites**: Configure sales rep delivery days in Test 5.1 (e.g., Mon/Wed/Fri only)

**Steps**:
1. Start new order as that sales rep
2. Select customer
3. **Check suggested dates**:
   - Below date picker, should show "Suggested:" with clickable date buttons
   - Dates should be Mon/Wed/Fri only (matching configured days)
4. **Pick a Tuesday** (non-delivery day)
5. **Observe warning**:
   - Modal appears
   - Shows: "This is not a typical delivery day for this territory"
   - Shows: "Normal delivery days: Monday, Wednesday, Friday"
6. Test both:
   - "Change Date" → clears selection
   - "Continue Anyway" → accepts Tuesday

**Expected Results**:
- [ ] Suggested dates shown below picker
- [ ] Suggested dates match configured delivery days
- [ ] Can click suggested date to auto-fill
- [ ] Non-delivery day triggers warning
- [ ] Warning shows correct delivery days
- [ ] Can override warning

**Report**:
```
✅ PASS / ❌ FAIL
Suggested dates shown: Yes / No
Dates match config: Yes / No
Non-delivery warning: Yes / No
Can override: Yes / No
Notes: _______________________
```

---

## 📋 TEST SUITE 6: BACKGROUND JOB & AUTOMATION

### Test 6.1: Reservation Expiration Job

**Setup**:
```bash
# Create a test order first, then manually expire it:
# 1. Create order via UI (any order)
# 2. Get the order ID
# 3. Set expiration to past:

npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Find recent order
prisma.order.findFirst({
  where: { status: 'PENDING' },
  orderBy: { createdAt: 'desc' },
  select: { id: true }
}).then(async (order) => {
  if (!order) {
    console.log('No PENDING orders found');
    return;
  }

  console.log('Setting expiration for order:', order.id);

  // Set reservation to expired (1 hour ago)
  const pastTime = new Date(Date.now() - 60 * 60 * 1000);

  await prisma.inventoryReservation.updateMany({
    where: { orderId: order.id },
    data: { expiresAt: pastTime }
  });

  console.log('✅ Reservation set to expired 1 hour ago');
  console.log('Order ID:', order.id);
}).finally(() => prisma.\$disconnect());
"
```

**Test**:
```bash
# Trigger the expiration job:
curl http://localhost:3000/api/jobs/reservation-expiration
```

**Expected Response**:
```json
{
  "success": true,
  "processed": 1,
  "ordersAffected": 1,
  "inventoryReleased": 12,
  "timestamp": "2025-10-31T..."
}
```

**Verify**:
```bash
# Check order was cancelled:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.findFirst({ where: { id: 'ORDER_ID' }, select: { status: true } }).then(o => console.log('Order status:', o?.status)).finally(() => prisma.\$disconnect());"

# Check reservation marked expired:
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventoryReservation.findMany({ where: { orderId: 'ORDER_ID' }, select: { status: true, releasedAt: true } }).then(r => console.log('Reservations:', r)).finally(() => prisma.\$disconnect());"

# Check inventory released:
# Compare allocated count before/after
```

**Expected Results**:
- [ ] API returns success with processed count
- [ ] Order status = CANCELLED
- [ ] InventoryReservation status = EXPIRED
- [ ] Inventory.allocated decreased
- [ ] Activity log created

**Report**:
```
✅ PASS / ❌ FAIL
Job executed: Yes / No
Order cancelled: Yes / No
Inventory released: Yes / No
Activity logged: Yes / No
Notes: _______________________
```

---

## 📋 TEST SUITE 7: EDGE CASES & ERROR HANDLING

### Test 7.1: Empty Order Submission

**Steps**:
1. Start new order
2. Select customer
3. Set delivery date
4. **Do NOT add any products**
5. Try to click "Create Order"

**Expected Results**:
- [ ] Submit button disabled (greyed out)
- [ ] OR error message: "Please add at least one product"
- [ ] Order NOT created

**Report**:
```
✅ PASS / ❌ FAIL
Prevented empty order: Yes / No
Notes: _______________________
```

---

### Test 7.2: Invalid Date Selection

**Steps**:
1. Start new order
2. Try to select **past date** (yesterday or earlier)

**Expected Results**:
- [ ] Date picker prevents past dates (min attribute)
- [ ] OR warning/error if past date selected
- [ ] Cannot submit with invalid date

**Report**:
```
✅ PASS / ❌ FAIL
Past dates prevented: Yes / No
Notes: _______________________
```

---

### Test 7.3: Duplicate Product Addition

**Steps**:
1. Start new order with customer and delivery date
2. Add a product (e.g., Chardonnay, quantity 12)
3. Click "Add Products" again
4. Try to add **same product** again

**Expected Results**:
- [ ] Product shows in "Add Products" modal greyed out or hidden
- [ ] OR can add but quantity combines
- [ ] OR shows warning "Product already in order"

**Report**:
```
✅ PASS / ❌ FAIL
Duplicate handling: Prevented / Combined / Warning shown
Behavior: _______________________
Notes: _______________________
```

---

### Test 7.4: Network Error Handling

**Steps**:
1. Start new order
2. Fill in all details
3. Add products
4. **Before submitting**: Open browser DevTools
5. Go to Network tab
6. **Throttle network**: Set to "Slow 3G" or "Offline"
7. Click "Create Order"
8. **Observe error handling**

**Expected Results**:
- [ ] Loading indicator shows
- [ ] Eventually shows error message
- [ ] Error message is user-friendly
- [ ] Form data preserved (can retry)
- [ ] No console errors crash the app

**Report**:
```
✅ PASS / ❌ FAIL
Error message shown: Yes / No
Message user-friendly: Yes / No
Can retry: Yes / No
Notes: _______________________
```

---

## 📋 TEST SUITE 8: INVENTORY ACCURACY

### Test 8.1: Real-Time Inventory Updates

**Steps**:
1. **Note current inventory**:
   ```bash
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.findFirst({ where: { location: 'main' }, include: { sku: { include: { product: true } } } }).then(inv => console.log('Product:', inv?.sku.product.name, '| OnHand:', inv?.onHand, '| Allocated:', inv?.allocated, '| Available:', (inv?.onHand || 0) - (inv?.allocated || 0))).finally(() => prisma.\$disconnect());"
   ```

2. **Create order** with that product (quantity: 5)
3. **Check inventory after order creation**:
   - Run same query as step 1
   - Compare allocated count

4. **Mark order as DELIVERED**:
   ```bash
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.update({ where: { id: 'ORDER_ID' }, data: { status: 'DELIVERED', deliveredAt: new Date() } }).then(() => console.log('Marked delivered')).finally(() => prisma.\$disconnect());"
   ```

5. **Trigger inventory decrement** (should happen automatically with status update)

6. **Check inventory final state**:
   - Run query again
   - Compare onHand and allocated

**Expected Results**:
- [ ] After order created: allocated +5
- [ ] After delivered: onHand -5, allocated -5
- [ ] Available inventory correct throughout
- [ ] No negative values

**Calculations to Verify**:
```
Initial: OnHand=100, Allocated=20, Available=80

After Order Created (qty 5):
  OnHand=100 (unchanged)
  Allocated=25 (+5) ✓
  Available=75 (80-5) ✓

After Delivered:
  OnHand=95 (-5) ✓
  Allocated=20 (-5) ✓
  Available=75 (unchanged) ✓
```

**Report**:
```
✅ PASS / ❌ FAIL
Allocated increases on order: Yes / No
OnHand decreases on delivery: Yes / No
Allocated decreases on delivery: Yes / No
Math correct: Yes / No
Before: OnHand=___ Allocated=___ Available=___
After Create: OnHand=___ Allocated=___ Available=___
After Deliver: OnHand=___ Allocated=___ Available=___
Notes: _______________________
```

---

## 📋 TEST SUITE 9: UI/UX QUALITY

### Test 9.1: Loading States

**Check these scenarios**:

1. **Customer dropdown loading**:
   - [ ] Shows "Loading customers..." while fetching
   - [ ] Disabled during load
   - [ ] Enables when loaded

2. **Product grid loading**:
   - [ ] Shows loading spinner or skeleton
   - [ ] "Checking..." text on inventory badges while loading
   - [ ] Products appear smoothly

3. **Order submission**:
   - [ ] Button shows "Creating Order..." during submit
   - [ ] Button disabled during submit
   - [ ] Can't double-submit

4. **Bulk operations**:
   - [ ] "Generating..." during bulk print
   - [ ] "Processing..." during bulk status update
   - [ ] Buttons disabled during processing

**Report**:
```
✅ PASS / ❌ FAIL
Loading states visible: Yes / No
Prevents double-submission: Yes / No
User feedback clear: Yes / No
Notes: _______________________
```

---

### Test 9.2: Responsive Design

**Test on different screen sizes**:

1. **Desktop** (current):
   - [ ] Layout looks good
   - [ ] Tables readable
   - [ ] Buttons accessible

2. **Tablet** (resize browser to ~768px width):
   - [ ] Layout adapts
   - [ ] No horizontal scroll
   - [ ] Touch targets adequate

3. **Mobile** (resize to ~375px width):
   - [ ] Forms usable
   - [ ] Product grid scrollable
   - [ ] Bulk buttons accessible

**Report**:
```
✅ PASS / ❌ FAIL
Desktop: Good / Issues
Tablet: Good / Issues
Mobile: Good / Issues
Notes: _______________________
```

---

### Test 9.3: Accessibility

**Quick checks**:

1. **Keyboard navigation**:
   - [ ] Can tab through form fields
   - [ ] Enter submits forms
   - [ ] Escape closes modals

2. **Screen reader labels**:
   - [ ] Form inputs have labels
   - [ ] Buttons have descriptive text
   - [ ] Error messages announced

3. **Color contrast**:
   - [ ] Text readable on backgrounds
   - [ ] Status badges have sufficient contrast

**Report**:
```
✅ PASS / ❌ FAIL
Keyboard nav: Working / Issues
Labels present: Yes / No
Contrast good: Yes / No
Notes: _______________________
```

---

## 📋 FINAL VERIFICATION

### Database Integrity Check

```bash
# Run all verification queries:

# 1. Count orders by status
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.order.groupBy({ by: ['status'], _count: { _all: true } }).then(results => { console.log('Orders by Status:'); results.forEach(r => console.log(\`  \${r.status}: \${r._count._all}\`)); }).finally(() => prisma.\$disconnect());"

# 2. Check warehouse locations are clean
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.findMany({ select: { location: true }, distinct: ['location'] }).then(locs => { console.log('Warehouse Locations:'); locs.forEach(l => console.log('  -', l.location)); }).finally(() => prisma.\$disconnect());"

# 3. Verify no negative inventory
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventory.count({ where: { OR: [{ onHand: { lt: 0 } }, { allocated: { lt: 0 } }] } }).then(count => console.log('Negative inventory records:', count, '(should be 0)')).finally(() => prisma.\$disconnect());"

# 4. Check active reservations
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.inventoryReservation.count({ where: { status: 'ACTIVE' } }).then(count => console.log('Active reservations:', count)).finally(() => prisma.\$disconnect());"
```

**Expected**:
- [ ] All order statuses present (9 values)
- [ ] Warehouses: Baltimore, Warrenton, main ONLY
- [ ] Zero negative inventory records
- [ ] Active reservations = number of pending orders (approximately)

**Report**:
```
✅ PASS / ❌ FAIL
All checks passed: Yes / No
Issues found: _______________________
```

---

## 📊 TEST RESULTS SUMMARY

### To Report Back:

**Overall Status**:
- Tests Passed: ___ / ___
- Tests Failed: ___ / ___
- Blockers Found: ___ (critical issues)
- Minor Issues: ___ (UX improvements)

**Critical Functionality**:
- [ ] ✅/❌ Order creation works
- [ ] ✅/❌ Inventory visibility accurate
- [ ] ✅/❌ Manager approval workflow functional
- [ ] ✅/❌ Operations queue operational
- [ ] ✅/❌ Bulk print works
- [ ] ✅/❌ Bulk status update works
- [ ] ✅/❌ Inventory decrements on delivery
- [ ] ✅/❌ Expiration job works

**Major Issues Found**: (list any)
1. _______________________
2. _______________________
3. _______________________

**Minor Issues Found**: (list any)
1. _______________________
2. _______________________

**Recommendations**:
- _______________________
- _______________________

**Overall Assessment**:
```
Production Ready: Yes / No / With Fixes
Recommended Action: Deploy / Fix Issues First / More Testing Needed
Confidence Level: High / Medium / Low
```

---

## 🎯 SUCCESS CRITERIA

**System is production-ready if**:
- ✅ All critical functionality tests pass (Suite 1-6)
- ✅ No blocker issues found
- ✅ Inventory math is accurate (Test 8.1)
- ✅ Bulk operations work (Tests 4.3-4.5)
- ✅ Build passes (0 TypeScript errors)
- ⚠️ Minor UI issues acceptable (can fix post-launch)

**If all tests pass**: ✅ **APPROVED FOR PRODUCTION DEPLOYMENT**

---

## 📞 Testing Support

**If you encounter issues**:

1. **Check browser console** (F12) for errors
2. **Check terminal** for server errors
3. **Check database** with `npx prisma studio`
4. **Review logs** in terminal output

**Common issues**:
- "Customer dropdown empty" → Database not seeded, check customer count
- "Inventory not showing" → Inventory records missing, check inventory table
- "Can't submit order" → Check console for validation errors

---

## ✅ Checklist Complete When:

- [ ] All 9 test suites executed
- [ ] Results documented for each test
- [ ] Overall assessment provided
- [ ] Screenshots taken of any issues
- [ ] Database queries run for verification

**Estimated Testing Time**: 60-90 minutes for thorough testing

---

**Ready to begin testing!** Start with Test Suite 1 and work through systematically. 🧪