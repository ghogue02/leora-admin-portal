# Frontend Testing Checklist - Order Management System

**Purpose**: Comprehensive testing checklist to verify order management workflow works as expected
**Last Updated**: November 3, 2025
**Version**: 1.1
**Related Docs**: See `TESTING_FINDINGS_2025-11-03.md` for investigation results

---

## ⚠️ CRITICAL: Understanding Frontend vs Backend Behavior

### Key Lesson from November 3, 2025 Testing

**Frontend shows ESTIMATES, Backend makes FINAL DECISIONS:**

| Aspect | Frontend (Preview) | Backend (Authoritative) |
|--------|-------------------|------------------------|
| **Prices** | Estimated from price lists | Recalculated with customer context |
| **Inventory** | Cached/stale availability | Real-time allocation attempt |
| **Approval** | Advisory warning only | Final requiresApproval decision |
| **Status** | Not determined | Sets DRAFT or PENDING |

**What This Means for Testing**:

1. ⚠️ **Frontend may show "needs approval" warning** even if order ultimately doesn't need approval
2. ⚠️ **Frontend prices may differ** from final saved prices (backend recalculates)
3. ⚠️ **Frontend inventory status** is advisory only (backend attempts actual allocation)
4. ✅ **Backend decisions are FINAL** - always verify database state

**Before Reporting Bugs**:
- [ ] Query database to verify what was actually saved
- [ ] Understand that frontend/backend discrepancies may be by design
- [ ] Backend is source of truth, not frontend display

---

## 🚨 Pre-Testing Requirements

### Before You Begin Testing

- [ ] **Clear browser cache completely**
  - Chrome/Edge: Settings → Privacy → Clear browsing data → Cached images and files
  - Safari: Develop → Empty Caches
  - Firefox: Settings → Privacy → Clear Data → Cached Web Content

- [ ] **Perform hard refresh** (every page test)
  - macOS: `Cmd + Shift + R`
  - Windows/Linux: `Ctrl + Shift + R`

- [ ] **Test in incognito/private window** (recommended)
  - Ensures no cached JavaScript bundles
  - Simulates fresh user experience

- [ ] **Check service worker status**
  - Chrome DevTools → Application → Service Workers
  - Click "Unregister" if one exists from old deployment
  - Refresh page

- [ ] **Verify you're on latest deployment**
  - Check footer or header for build version
  - Or check browser DevTools → Network → Check JS bundle filenames
  - Should NOT see old bundle hashes

---

## 📋 Order Management Workflow Tests

### Test 1: Product Grid UI (Sales Order Creation)

**URL**: `/sales/orders/new` → Click "Add Products to Order" button

#### ✅ Expected UI State

- [ ] **Search bar is present**
  - Placeholder text: "Search by product name, SKU, brand, or category..."
  - Can type to filter products
  - Search works across name, SKU, brand, category

- [ ] **"In Stock Only" checkbox is present**
  - Located next to search bar
  - Default state: Unchecked
  - Clicking it filters to only products with available inventory

- [ ] **Category dropdown is REMOVED**
  - Should NOT see "All Categories" dropdown
  - If present: ❌ FAIL - old code still cached

- [ ] **Brand dropdown is REMOVED**
  - Should NOT see "All Brands" dropdown
  - If present: ❌ FAIL - old code still cached

- [ ] **Clear Filters button appears when**:
  - Search has text, OR
  - "In Stock Only" is checked
  - Button clears both search and checkbox

- [ ] **Product count shows**:
  - Format: "X of Y products"
  - Example: "450 of 1237 products"
  - Updates as you filter

#### ✅ Expected Filtering Behavior

- [ ] **Search works across all fields**
  - Type "Chardonnay" → shows Chardonnay products
  - Type "SPA1074" → shows that SKU
  - Type "Abadia" → shows Abadia de Acon products
  - Search is case-insensitive

- [ ] **"In Stock Only" checkbox works**
  - Unchecked: Shows all products (including out of stock)
  - Checked: Hides products showing "Out of stock (0 on hand)"
  - Products with inventory >0 remain visible

- [ ] **Combining search + in-stock works**
  - Type "Cabernet" + check "In Stock Only"
  - Should only show Cabernet products that have inventory
  - Product count adjusts accordingly

#### ✅ Expected Inventory Display

- [ ] **Products WITH inventory show**:
  - Green "Available" badge, OR
  - Yellow "Low stock" badge, OR
  - Specific number like "739 available"

- [ ] **Products WITHOUT inventory show**:
  - Black badge: "● Out of stock (0 on hand)"
  - These should disappear when "In Stock Only" is checked

#### ❌ Failure Indicators

If you see any of these, **caching issue or deployment failed**:
- ❌ "All Categories" dropdown still visible
- ❌ "All Brands" dropdown still visible
- ❌ No "In Stock Only" checkbox
- ❌ Old bundle hash in Network tab
- ❌ Service worker serving old app shell

**Fix**: Hard refresh (Cmd+Shift+R), clear cache, unregister service worker

---

### Test 2: Admin Order Management Page

**URL**: `/admin/orders`

#### ✅ Expected Page State

- [ ] **Page loads successfully** (not blank)
  - Shows "Order Management" header
  - Shows filter controls
  - Shows orders table with data

- [ ] **Orders are visible**
  - Should show ALL tenant orders (not filtered by sales rep)
  - Expected count: ~34,000+ orders
  - Pagination shows "Showing X to Y of Z results"

- [ ] **Table columns present**:
  - [ ] Checkbox (for bulk selection)
  - [ ] Order ID (clickable link)
  - [ ] Customer (clickable link)
  - [ ] Order Date
  - [ ] **Total** (should show dollar amounts, NOT $0)
  - [ ] Order Status (badge)
  - [ ] Invoice Status (badge or "No Invoice")
  - [ ] Sales Rep (name or "—")
  - [ ] Last Modified
  - [ ] Actions (Edit link)

#### ✅ Expected Data Display

- [ ] **Order totals show correctly**
  - Should see dollar amounts like $887.76, $2,730.68, $1,679.88
  - Should NOT see all $0.00 amounts
  - If seeing $0: ❌ FAIL - calculation fix not applied

- [ ] **All orders visible to admin**
  - See orders from multiple sales reps
  - Not limited to single sales rep's customers
  - Can filter by sales rep (should show dropdown of all reps)

- [ ] **Invoice information present**
  - Invoice status badges (PAID, DRAFT, etc.)
  - Invoice numbers where applicable
  - "No Invoice" for orders without invoices

#### ✅ Expected Filtering Functionality

- [ ] **Customer search works**
  - Type customer name → filters results
  - Example: "Cheesetique" → shows Cheesetique orders only

- [ ] **Sales rep filter works**
  - Dropdown shows all sales reps
  - Selecting one filters to that rep's orders

- [ ] **Date range filter works**
  - Set "Date From" and "Date To"
  - Shows orders within that range only

- [ ] **Amount filters work**
  - Set "Min Amount" (e.g., 100)
  - Set "Max Amount" (e.g., 1000)
  - Shows orders within that amount range

- [ ] **Order status filter works**
  - Checkboxes for: DRAFT, SUBMITTED, FULFILLED, CANCELLED, PARTIALLY_FULFILLED
  - Checking one or more filters results

- [ ] **Invoice status filter works**
  - Checkboxes for: DRAFT, SENT, PAID, OVERDUE, VOID
  - Checking one or more filters results

#### ✅ Expected Sorting Functionality

- [ ] **Click column headers to sort**
  - Order ID, Customer, Order Date, Total, Last Modified
  - First click: Descending
  - Second click: Ascending
  - Visual indicator shows sort direction

#### ❌ Failure Indicators

- ❌ Page shows "No orders found" (wrong API endpoint)
- ❌ All totals show $0.00 (calculation fix not applied)
- ❌ Only see one sales rep's orders (wrong permission filter)
- ❌ Page is completely blank (auth issue or API error)

**Fix**:
1. Check browser console for API errors
2. Verify endpoint called: Should be `/api/sales/admin/orders`
3. Hard refresh and test in incognito mode

---

### Test 3: Sales Order List Page

**URL**: `/sales/orders`

#### ✅ Expected Page State

- [ ] **Page loads successfully**
  - Shows "At a glance" summary section
  - Shows orders table with data

- [ ] **Summary statistics show**:
  - Total orders count
  - Open exposure (dollar amount)
  - Open order count

- [ ] **Sales rep sees ONLY their orders**
  - Orders filtered to current sales rep's customers
  - Should NOT see all tenant orders
  - Smaller count than admin sees

- [ ] **Order totals display correctly**
  - Real dollar amounts (not $0)
  - Example: $887.76, $975.84, $1,211.70

#### ✅ Expected Functionality

- [ ] **Search works**
  - Type order ID → finds that order
  - Type customer name → shows that customer's orders

- [ ] **Status filter works**
  - Dropdown: All Statuses, Submitted, Partially Fulfilled, Fulfilled, Cancelled
  - Selecting one filters results

- [ ] **Cancel order button works** (for applicable statuses)
  - Shows "Cancel order" button for SUBMITTED/PARTIALLY_FULFILLED
  - Shows "—" for FULFILLED/CANCELLED
  - Clicking prompts confirmation
  - After confirming, order status updates

---

### Test 4: Order Creation Flow (End-to-End)

**URL**: `/sales/orders/new`

#### Step 1: Select Customer
- [ ] Customer dropdown loads with sales rep's customers
- [ ] Selecting customer enables warehouse location selection
- [ ] Customer-specific pricing loads correctly

#### Step 2: Add Products
- [ ] Click "Add Products to Order" button
- [ ] Modal opens with product grid
- [ ] Products load (should see 1,237 products initially)

#### Step 3: Filter Products
- [ ] Type in search box → products filter
- [ ] Click "In Stock Only" → out-of-stock products disappear
- [ ] Product count updates (e.g., "450 of 1237 products")
- [ ] Clear filters → shows all products again

#### Step 4: Select Products
- [ ] Adjust quantity for a product
- [ ] Click "Add" button
- [ ] Product appears in order line items
- [ ] Inventory badge shows availability
- [ ] Price calculated correctly based on customer price list

#### Step 5: Review Order
- [ ] Order total calculates correctly
  - Sum of (quantity × unit price) for all line items
- [ ] Inventory warnings show if applicable
  - "Low stock" for products near limits
  - "Insufficient inventory" for over-allocated products
- [ ] Delivery date can be selected
- [ ] Special instructions can be added

#### Step 6: Submit Order
- [ ] Click "Create Order" or "Submit" button
- [ ] Success message appears
- [ ] Redirects to order detail page
- [ ] New order appears in `/sales/orders` list

---

### Test 5: Admin/Sales Data Consistency

#### ✅ Same Order Appears on Both Sides

**Test Flow**:
1. Create new order as sales rep (note Order ID)
2. Navigate to `/sales/orders` → verify order appears
3. Note the order total (e.g., $1,234.56)
4. Navigate to `/admin/orders`
5. Search for same order ID

**Expected Results**:
- [ ] Order appears in admin view
- [ ] Order total MATCHES exactly ($1,234.56 in both)
- [ ] Customer name matches
- [ ] Order status matches
- [ ] Invoice status matches (if applicable)
- [ ] All line items match

**Failure Indicators**:
- ❌ Order not visible in admin view → permission/API issue
- ❌ Totals don't match → calculation inconsistency bug
- ❌ Different customer/status → data corruption

---

### Test 6: Order Detail Pages

**URLs**:
- Sales: `/sales/orders/[order-id]`
- Admin: `/admin/orders/[order-id]`

#### ✅ Expected Information Display

- [ ] **Order header shows**:
  - Order ID
  - Customer name
  - Order status badge
  - Order total
  - Created/updated dates

- [ ] **Line items table shows**:
  - Product name
  - SKU code
  - Quantity
  - Unit price
  - Line total
  - Sum of line items = order total

- [ ] **Customer information shows**:
  - Full name
  - Address
  - Contact info
  - Sales rep (admin view)

- [ ] **Actions available**:
  - Edit order (if not fulfilled)
  - Cancel order (if applicable)
  - View invoice (if exists)
  - Print/export options

---

## 🔍 Debugging Guide

### Issue: Changes Not Appearing After Deployment

**Checklist**:
1. [ ] Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)
2. [ ] Test in incognito/private window
3. [ ] Check browser DevTools → Network tab
   - Look for JS bundle requests
   - Verify bundle hash changed from previous version
4. [ ] Check Service Worker
   - DevTools → Application → Service Workers
   - Unregister any service workers
   - Hard refresh again
5. [ ] Clear browser cache completely
6. [ ] Check Vercel deployment status
   ```bash
   vercel ls --scope gregs-projects-61e51c01 | head -5
   ```
7. [ ] Verify latest deployment has "● Ready" status
8. [ ] Check git commit hash matches deployment

### Issue: API Returning Errors

**Checklist**:
1. [ ] Open browser DevTools → Console tab
2. [ ] Check for red error messages
3. [ ] Open Network tab → filter to XHR/Fetch
4. [ ] Look for failed API requests (red status codes)
5. [ ] Click failed request → Preview tab → read error message
6. [ ] Common errors:
   - **401 Unauthorized**: Session expired, need to log in again
   - **403 Forbidden**: Wrong user role (sales trying to access admin endpoint)
   - **404 Not Found**: Wrong API endpoint path
   - **500 Server Error**: Database or server issue

### Issue: Orders Not Appearing

**Diagnosis Steps**:
1. [ ] Check if orders exist in database:
   ```sql
   SELECT COUNT(*) FROM "Order" WHERE "tenantId" = '[tenant-id]';
   ```
2. [ ] Check API endpoint being called:
   - DevTools → Network → Find request
   - Should be `/api/sales/admin/orders` for admin
   - Should be `/api/sales/orders` for sales rep
3. [ ] Check response data:
   - Click request → Response tab
   - Verify `orders` array has items
   - Verify `pagination.total` > 0
4. [ ] Check UI rendering:
   - If API returns data but page blank → React rendering issue
   - Check browser console for React errors

---

## ✅ Test Scenarios & Expected Outcomes

### Scenario 1: Sales Rep Creates Order for Their Customer

**Steps**:
1. Log in as sales rep (e.g., Mike Allen)
2. Navigate to `/sales/orders/new`
3. Select one of your customers
4. Add 3 products to order
5. Submit order

**Expected Outcomes**:
- [ ] Order creation succeeds (success message)
- [ ] Redirects to order detail page
- [ ] Order appears in `/sales/orders` list
- [ ] Order total = sum of line items
- [ ] Order status = DRAFT or SUBMITTED

**Admin Visibility**:
- [ ] Navigate to `/admin/orders`
- [ ] Search for customer name
- [ ] Order appears in results
- [ ] Order total matches sales view exactly
- [ ] Can click to view order details

---

### Scenario 2: Admin Reviews All Orders

**Steps**:
1. Log in as admin
2. Navigate to `/admin/orders`
3. Observe order list

**Expected Outcomes**:
- [ ] Page shows orders table (not blank)
- [ ] Shows orders from MULTIPLE sales reps
- [ ] Total count shows ~34,000+ orders
- [ ] Order totals show real amounts (NOT all $0)
- [ ] Can see orders you didn't create

**Filtering Tests**:
- [ ] Filter by sales rep → shows only that rep's orders
- [ ] Filter by date range → shows orders in that range
- [ ] Filter by order status → shows matching statuses
- [ ] Clear all filters → shows all orders again

---

### Scenario 3: In-Stock Filtering

**Steps**:
1. Navigate to `/sales/orders/new`
2. Select a customer
3. Click "Add Products to Order"
4. Observe initial product list

**Without Filter**:
- [ ] Shows all 1,237 products
- [ ] Some show "● Out of stock (0 on hand)"
- [ ] Some show "X available"

**With "In Stock Only" Checked**:
- [ ] Click "In Stock Only" checkbox
- [ ] Product count decreases (should drop by ~25%)
- [ ] All "Out of stock" products disappear
- [ ] Only products with available inventory remain
- [ ] Product count shows filtered amount (e.g., "900 of 1237 products")

**Uncheck Filter**:
- [ ] Unclick "In Stock Only"
- [ ] All products reappear
- [ ] Count returns to full amount

---

### Scenario 4: Search Functionality

**Steps**:
1. Open "Add Products to Order" modal
2. Test search variations

**Search Tests**:

**By Product Name**:
- [ ] Type "Chardonnay" → shows Chardonnay wines
- [ ] Type "Cabernet" → shows Cabernet wines
- [ ] Partial match works: "Char" shows Chardonnay

**By SKU Code**:
- [ ] Type "CAL1054" → shows Skylark Alondra Chardonnay
- [ ] Type "SPA1074" → shows matching Spanish wine
- [ ] Partial SKU: "ITA" → shows Italian wines with ITA prefix

**By Brand**:
- [ ] Type "Abadia de Acon" → shows Abadia products
- [ ] Type "Ribera del Duero" → shows those products

**By Category**:
- [ ] Type category name → filters to that category
- [ ] Combined terms work (brand + category)

**Case Insensitive**:
- [ ] "chardonnay" = "Chardonnay" = "CHARDONNAY"

---

### Scenario 5: Admin vs Sales Totals Match

**Test Flow**:
1. Pick an existing order ID from `/sales/orders`
2. Note the total amount (e.g., Order #12345 = $1,500.00)
3. Navigate to `/admin/orders`
4. Search for same order ID (#12345)

**Expected Results**:
- [ ] Order appears in admin search results
- [ ] Admin total = $1,500.00 (SAME as sales)
- [ ] If you click into detail page:
  - [ ] Line items are identical
  - [ ] Sum of line items = order total
  - [ ] No discrepancies

**Failure Indicators**:
- ❌ Admin shows $0 but sales shows $1,500 → calculation bug
- ❌ Admin doesn't show order at all → visibility bug
- ❌ Different line items → data corruption

---

## 📊 Metrics to Verify

### Admin Dashboard (if exists)

**URL**: `/admin` or `/admin/dashboard`

**Check**:
- [ ] **MTD Revenue** shows real amount (NOT $0)
  - Should aggregate from recent orders
  - Example: "$64,655.17"
- [ ] **Order count** matches database
- [ ] **Charts/graphs** show data (not empty)

### Sales Dashboard

**URL**: `/sales/dashboard`

**Check**:
- [ ] Sales metrics for current rep
- [ ] Revenue totals
- [ ] Order counts
- [ ] All match data in `/sales/orders`

---

## 🚨 Critical Test Cases (Must Pass)

### Test Case 1: Admin Order Visibility
**MUST PASS**: Admin can see orders created by sales reps

- [ ] Create order as Sales Rep A
- [ ] Log in as Admin
- [ ] Navigate to `/admin/orders`
- [ ] Search for order
- [ ] **RESULT**: Order is visible ✅

### Test Case 2: Calculation Consistency
**MUST PASS**: Admin and sales show identical totals

- [ ] Pick any order ID
- [ ] Check total in `/sales/orders` (e.g., $1,234.56)
- [ ] Check same order in `/admin/orders`
- [ ] **RESULT**: Totals match exactly ✅

### Test Case 3: Product Filtering
**MUST PASS**: In-stock filter hides unavailable products

- [ ] Open "Add Products to Order" modal
- [ ] Check "In Stock Only"
- [ ] Verify no "Out of stock (0 on hand)" products visible
- [ ] **RESULT**: Only available inventory shown ✅

### Test Case 4: UI Simplification
**MUST PASS**: Redundant dropdowns removed

- [ ] Open "Add Products to Order" modal
- [ ] Verify NO "All Categories" dropdown
- [ ] Verify NO "All Brands" dropdown
- [ ] **RESULT**: Only search + in-stock checkbox present ✅

---

## 📸 Visual Testing Checklist

### Screenshot Comparison

**Before State** (your provided screenshots):
- ✅ "All Categories" dropdown visible
- ✅ "All Brands" dropdown visible
- ❌ No "In Stock Only" checkbox
- Products showing "Out of stock (0 on hand)"

**After State** (should see after hard refresh):
- ❌ NO "All Categories" dropdown
- ❌ NO "All Brands" dropdown
- ✅ "In Stock Only" checkbox present
- Same products showing stock status (accurate reporting)

---

## 🔄 Deployment Verification Protocol

### After Each Code Deployment

**Step-by-Step**:

1. [ ] **Verify Vercel deployment succeeded**
   ```bash
   vercel ls --scope gregs-projects-61e51c01 | head -3
   ```
   - Look for most recent deployment
   - Status should be "● Ready"
   - Not "● Error" or "● Canceled"

2. [ ] **Check git commit matches**
   - Note the git commit hash (e.g., `658bbf1`)
   - Verify Vercel deployed from this commit

3. [ ] **Wait for deployment to propagate**
   - Wait 30-60 seconds for edge network to update
   - CDN caches may take a moment to invalidate

4. [ ] **Test in incognito window FIRST**
   - Open production URL in incognito/private window
   - This bypasses all browser caching
   - If changes appear here but not regular window → cache issue

5. [ ] **Clear browser cache if needed**
   - If incognito works but regular browser doesn't
   - Clear cache completely
   - Hard refresh (Cmd+Shift+R)

6. [ ] **Verify build artifacts updated**
   - DevTools → Network → Check JS bundle filenames
   - Bundles should have different hash than before
   - Example: `page-8b76bbf175c8c783.js` vs `page-OLD-HASH.js`

7. [ ] **Check service worker status**
   - DevTools → Application → Service Workers
   - If service worker exists from old deployment:
     - Click "Unregister"
     - Hard refresh page
     - Verify new service worker registers (if enabled)

8. [ ] **Test all critical user flows**
   - Use this checklist to verify functionality
   - Document any failures immediately
   - Take screenshots of any issues

---

## 📝 Test Report Template

```markdown
# Frontend Test Report - [Date]

**Tester**: [Your Name]
**Deployment**: [Vercel URL]
**Git Commit**: [commit hash]
**Browser**: [Chrome/Safari/Firefox] [Version]

## Pre-Test Setup
- [ ] Hard refresh performed
- [ ] Browser cache cleared
- [ ] Tested in incognito: Yes/No
- [ ] Service worker unregistered: Yes/No/N/A

## Test Results

### Admin Order Management (/admin/orders)
- Orders visible: ✅ / ❌
- Order count: [number]
- Totals showing correctly: ✅ / ❌
- Example total: $[amount]
- Issues found: [describe or "None"]

### Product Grid UI (/sales/orders/new)
- Category dropdown removed: ✅ / ❌
- Brand dropdown removed: ✅ / ❌
- In Stock checkbox present: ✅ / ❌
- In Stock filter works: ✅ / ❌ / Not Tested
- Issues found: [describe or "None"]

### Calculation Consistency
- Sales order total: $[amount]
- Admin same order total: $[amount]
- Match: ✅ / ❌
- Issues found: [describe or "None"]

## Overall Assessment
[PASS / FAIL / PARTIAL]

## Notes
[Any additional observations]
```

---

## 🎯 Success Criteria

**All tests must pass for deployment to be considered successful:**

1. ✅ Admin orders page shows orders (not blank)
2. ✅ Admin sees ALL orders (not filtered by sales rep)
3. ✅ Order totals match between admin and sales
4. ✅ Admin MTD revenue NOT $0 (shows real amount)
5. ✅ Category dropdown removed from product grid
6. ✅ Brand dropdown removed from product grid
7. ✅ "In Stock Only" checkbox present and functional
8. ✅ Search works without dropdowns
9. ✅ Order creation flow works end-to-end
10. ✅ Database integrity maintained

**If ANY test fails**: Document the failure, check for caching issues, and report to development team.

---

## 📞 Support & Escalation

**If tests fail after hard refresh + incognito**:
1. Document failure with screenshots
2. Check browser console for errors
3. Check Network tab for failed API calls
4. Report to development team with:
   - Specific test case that failed
   - Expected vs actual behavior
   - Browser console errors
   - Network request/response data
   - Screenshots of issue

**Known Issues**:
- 310 SKUs missing inventory records (25%) - documented, pending Travis decision
- Service worker may cache old app shell - unregister and refresh

---

**Remember**: Hard refresh (Cmd+Shift+R) before testing EVERY page to ensure you're testing the latest code!
