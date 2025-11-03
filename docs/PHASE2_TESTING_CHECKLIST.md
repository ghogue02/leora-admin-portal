# Phase 2 Updates - Testing Checklist for Testing Agent

**Date:** November 3, 2025
**Testing Agent:** Please review ALL updates for accuracy and correctness
**Production URL:** https://web-omega-five-81.vercel.app
**Focus:** Invoice numbering + UX improvements + overall order flow validation

---

## 🎯 Testing Objectives

1. **Verify invoice numbering** follows Travis's exact format
2. **Test all Phase 2 UX improvements** work correctly
3. **Validate overall order flow** accuracy
4. **Check for regressions** from changes made
5. **Confirm error handling** improvements work
6. **Test edge cases** and data validation

---

## 📋 SECTION 1: Invoice Numbering System (CRITICAL)

### Test 1.1: Invoice Number Format Validation

**Test Cases:**

**Test Case 1: Virginia Customer, 2026 Delivery**
- [ ] Create order for VA customer
- [ ] Set delivery date: January 2, 2026
- [ ] Create invoice
- [ ] **EXPECT:** Invoice number = `VA260001`
- [ ] Verify format: 2 chars state + 2 digit year + 5 digit sequence

**Test Case 2: Second VA Invoice Same Year**
- [ ] Create another order for different VA customer
- [ ] Set delivery date: any date in 2026
- [ ] Create invoice
- [ ] **EXPECT:** Invoice number = `VA260002`
- [ ] Verify sequence incremented by 1

**Test Case 3: Tax Exempt Customer**
- [ ] Find or create tax exempt customer (isTaxExempt = true)
- [ ] Create order with delivery in 2026
- [ ] Create invoice
- [ ] **EXPECT:** Invoice number = `TE260001`
- [ ] Verify separate sequence from VA invoices

**Test Case 4: Maryland Customer**
- [ ] Create order for MD customer
- [ ] Set delivery date in 2026
- [ ] Create invoice
- [ ] **EXPECT:** Invoice number = `MD260001`
- [ ] Verify MD has independent sequence from VA and TE

**Test Case 5: Different Year**
- [ ] Create order for VA customer
- [ ] Set delivery date: January 1, 2027
- [ ] Create invoice
- [ ] **EXPECT:** Invoice number = `VA270001`
- [ ] Verify sequence resets for new year

**Test Case 6: Same Day, Multiple Invoices**
- [ ] Create 3 orders for VA customers, same delivery date
- [ ] Create all 3 invoices
- [ ] **EXPECT:** VA260001, VA260002, VA260003
- [ ] Verify NO duplicate numbers

---

### Test 1.2: Customer Invoice State Code

**Verify Customer Setup:**
- [ ] Open customer in admin panel
- [ ] **CHECK:** Does customer have `invoiceStateCode` field?
- [ ] **CHECK:** Default value matches customer's state?
- [ ] **CHECK:** If tax exempt, code is "TE"?

**Test Scenarios:**

**Virginia Customer:**
- [ ] Customer state = "VA"
- [ ] isTaxExempt = false
- [ ] **EXPECT:** invoiceStateCode = "VA"
- [ ] **EXPECT:** Invoices start with "VA"

**Tax Exempt Customer:**
- [ ] Customer isTaxExempt = true
- [ ] **EXPECT:** invoiceStateCode = "TE"
- [ ] **EXPECT:** Invoices start with "TE"

**Maryland Customer:**
- [ ] Customer state = "MD"
- [ ] isTaxExempt = false
- [ ] **EXPECT:** invoiceStateCode = "MD"
- [ ] **EXPECT:** Invoices start with "MD"

---

### Test 1.3: Invoice Sequence Integrity

**Critical Test:**
- [ ] Check database for duplicate invoice numbers:
  ```sql
  SELECT invoiceNumber, COUNT(*)
  FROM "Invoice"
  GROUP BY invoiceNumber
  HAVING COUNT(*) > 1;
  ```
- [ ] **EXPECT:** 0 rows (no duplicates)

**Sequence Gaps:**
- [ ] Delete an invoice (e.g., VA260002)
- [ ] Create new invoice
- [ ] **EXPECT:** Next number is VA260003 (not VA260002)
- [ ] **REASON:** Sequences should never reuse numbers

---

## 📋 SECTION 2: UX Improvements Testing

### Test 2.1: Column Sorting (Orders List Page)

**Navigate to:** `/sales/orders`

**Test Date Sorting:**
- [ ] Click "Order" column header
- [ ] **EXPECT:** Arrow appears (↓ desc by default)
- [ ] **VERIFY:** Newest orders appear first
- [ ] Click "Order" header again
- [ ] **EXPECT:** Arrow flips to (↑ asc)
- [ ] **VERIFY:** Oldest orders appear first

**Test Customer Sorting:**
- [ ] Click "Customer" column header
- [ ] **EXPECT:** Orders sorted alphabetically by customer name
- [ ] **VERIFY:** "ABC Corp" appears before "XYZ Inc"
- [ ] Click again for reverse

**Test Total Sorting:**
- [ ] Click "Totals" column header
- [ ] **EXPECT:** Orders sorted by dollar amount
- [ ] **VERIFY:** $10 order before $1,000 order (ascending)
- [ ] Click again for descending

**Sorting Persistence:**
- [ ] Sort by customer (ascending)
- [ ] Navigate to different page
- [ ] Return to orders list
- [ ] **VERIFY:** Does sort persist? (Implementation note: NOT persisted in current code - okay)

---

### Test 2.2: Product Grid Filtering

**Navigate to:** `/sales/orders/new` → Click "Add Products"

**Test Category Filter:**
- [ ] Open product selection modal
- [ ] Click "All Categories" dropdown
- [ ] **CHECK:** Shows list of unique categories?
- [ ] Select "Wine" (or any category)
- [ ] **EXPECT:** Only products in selected category shown
- [ ] **CHECK:** Result count updates (e.g., "45 of 234 products")

**Test Brand Filter:**
- [ ] Click "All Brands" dropdown
- [ ] **CHECK:** Shows list of unique brands?
- [ ] Select "Raywood" (or any brand)
- [ ] **EXPECT:** Only Raywood products shown
- [ ] **CHECK:** Works with category filter (AND logic)

**Test Combined Filters:**
- [ ] Select Category = "Wine"
- [ ] Select Brand = "Raywood"
- [ ] **EXPECT:** Only Raywood wines shown
- [ ] **CHECK:** Both filters active simultaneously

**Test Search:**
- [ ] Type "Chardonnay" in search box
- [ ] **EXPECT:** Only products with "Chardonnay" in name shown
- [ ] **CHECK:** Search works across: product name, SKU, brand, category
- [ ] **CHECK:** Search works WITH category/brand filters

**Test Clear Filters:**
- [ ] Apply category, brand, and search filters
- [ ] **CHECK:** "Clear Filters" button appears?
- [ ] Click "Clear Filters"
- [ ] **EXPECT:** All filters reset to "all"
- [ ] **EXPECT:** Search cleared
- [ ] **EXPECT:** Full product list shown

**Test Result Count:**
- [ ] With no filters: Shows "234 of 234 products"
- [ ] With filters: Shows "12 of 234 products"
- [ ] **VERIFY:** Count accurate

---

### Test 2.3: Smart Warehouse Defaults

**Test Sequence:**

**First Order:**
- [ ] Navigate to `/sales/orders/new`
- [ ] Select customer
- [ ] **CHECK:** Warehouse field - what's pre-filled?
- [ ] Select "West Warehouse"
- [ ] Complete order (or don't submit, just select)

**Second Order:**
- [ ] Navigate to `/sales/orders/new` again (new order)
- [ ] Select customer (different customer)
- [ ] **EXPECT:** Warehouse auto-filled with "West Warehouse"
- [ ] **REASON:** Should remember last-used warehouse

**Customer with Default:**
- [ ] Find customer with `defaultWarehouseLocation` set
- [ ] Create order for this customer
- [ ] **EXPECT:** Warehouse = customer's default
- [ ] **REASON:** Customer default overrides last-used

**Clear Browser Data:**
- [ ] Clear localStorage
- [ ] Start new order
- [ ] **EXPECT:** Warehouse defaults to "main"
- [ ] **REASON:** Fallback when no memory exists

---

### Test 2.4: Enhanced Error Messages

**Test Authentication Errors:**

**Test Case: No Session:**
- [ ] Clear all cookies
- [ ] Navigate to `/sales/orders`
- [ ] **EXPECT:** Error message shows
- [ ] **CHECK:** Message says "Not authenticated. Please log in to access this page."
- [ ] **CHECK:** "Log In Again" button appears
- [ ] Click "Log In Again"
- [ ] **EXPECT:** Redirects to `/sales/login`

**Test Case: Session Expired:**
- [ ] Login successfully
- [ ] Manually delete session cookie (browser dev tools)
- [ ] Try to load orders
- [ ] **EXPECT:** Error says "Your session has expired. Please log in again."
- [ ] **CHECK:** "Log In Again" button appears
- [ ] **CHECK:** Different message than "Not authenticated"

**Test Case: Missing Sales Rep Profile:**
- [ ] Login as user with no sales rep profile (if possible to create)
- [ ] Try to access `/sales/orders/new`
- [ ] **EXPECT:** Error says "Sales representative profile required"
- [ ] **CHECK:** Message says "Contact your administrator"
- [ ] **CHECK:** No "Log In Again" button (different error type)

---

## 📋 SECTION 3: Overall Order Flow Accuracy

### Test 3.1: Complete Order Creation Flow

**End-to-End Test:**

**Step 1: Customer Selection**
- [ ] Navigate to `/sales/orders/new`
- [ ] Search for customer (type partial name)
- [ ] **CHECK:** Autocomplete dropdown appears
- [ ] **CHECK:** Shows customer territory and account info
- [ ] Select customer
- [ ] **CHECK:** Customer name appears prominently
- [ ] **CHECK:** Warehouse auto-fills (smart default)

**Step 2: Delivery Settings**
- [ ] Click delivery date field
- [ ] **CHECK:** Calendar opens
- [ ] **CHECK:** Green dots show delivery days
- [ ] Select a Thursday (typical delivery day)
- [ ] **CHECK:** Date appears in field
- [ ] **CHECK:** Warehouse is pre-filled
- [ ] **CHECK:** Time window defaults to "Anytime"

**Step 3: Product Selection**
- [ ] Click "Add Products" button
- [ ] **CHECK:** Modal opens with product grid
- [ ] **CHECK:** Category filter dropdown visible
- [ ] **CHECK:** Brand filter dropdown visible
- [ ] **CHECK:** Search input visible
- [ ] Select category "Wine"
- [ ] **CHECK:** Only wines shown
- [ ] Select brand
- [ ] **CHECK:** Results further filtered
- [ ] Enter quantity (e.g., 12)
- [ ] Click "Add" button
- [ ] **CHECK:** Toast notification shows product added
- [ ] **CHECK:** Product appears in order summary sidebar
- [ ] **CHECK:** Inventory status shows (e.g., "15 available")
- [ ] Add second product
- [ ] **CHECK:** Button shows "Add Products (2)"

**Step 4: Order Summary Review**
- [ ] **CHECK:** Right sidebar shows:
  - Customer name
  - Delivery date
  - Warehouse location
  - All products with quantities
  - Subtotal
  - Estimated tax
  - Total
- [ ] **CHECK:** NO duplicate summary in left column
- [ ] **CHECK:** If low inventory, warning banner appears

**Step 5: Order Submission**
- [ ] **CHECK:** "Create Order" button enabled (all required fields filled)
- [ ] Click "Create Order"
- [ ] **CHECK:** Button shows loading spinner
- [ ] **CHECK:** Toast shows "Order created" with order number
- [ ] **EXPECT:** Redirects to order detail page

---

### Test 3.2: Order Detail Page Verification

**After Creating Order:**

**Check Order Information:**
- [ ] **CHECK:** Breadcrumb shows: Sales > Orders > Order #ABC
- [ ] **CHECK:** Order number displayed prominently
- [ ] **CHECK:** Customer name and date shown
- [ ] **CHECK:** All order items listed with:
  - Product name
  - SKU and size
  - Quantity
  - Unit price
  - Line total
- [ ] **CHECK:** Order total matches creation

**Check Invoice Section:**
- [ ] **CHECK:** Shows "No invoice created yet" OR existing invoice
- [ ] Click "Create Invoice"
- [ ] **CHECK:** Invoice created successfully
- [ ] **CHECK:** Invoice number follows format: `[STATE][YY][00000]`
- [ ] **VERIFY:** State matches customer's location
- [ ] **VERIFY:** Year matches delivery date (not current date)
- [ ] **VERIFY:** Sequence is sequential (00001, 00002, etc.)

**Check PDF Download:**
- [ ] Click "Preview" button
- [ ] **CHECK:** Modal opens with PDF preview
- [ ] **CHECK:** Invoice displays correctly in iframe
- [ ] Click "Download PDF"
- [ ] **CHECK:** PDF file downloads
- [ ] **VERIFY:** Filename includes invoice number
- [ ] **VERIFY:** PDF content matches order details

---

### Test 3.3: Orders List Functionality

**Navigate to:** `/sales/orders`

**Check Summary Statistics:**
- [ ] **CHECK:** "Total orders" shows count
- [ ] **CHECK:** "Open exposure" shows dollar amount
- [ ] **CHECK:** "Open order count" shows number
- [ ] **VERIFY:** Numbers are accurate (not obviously wrong)

**Check Search:**
- [ ] Type order ID (e.g., first 8 characters)
- [ ] **EXPECT:** Matching order appears
- [ ] Type customer name
- [ ] **EXPECT:** Orders for that customer appear
- [ ] **CHECK:** Search is case-insensitive

**Check Status Filter:**
- [ ] Select "SUBMITTED" from dropdown
- [ ] **EXPECT:** Only SUBMITTED orders shown
- [ ] Select "FULFILLED"
- [ ] **EXPECT:** Only FULFILLED orders shown
- [ ] Select "All Statuses"
- [ ] **EXPECT:** All orders shown

**Check Clear Filters:**
- [ ] Apply search + status filter
- [ ] Click "Clear" button
- [ ] **EXPECT:** Both filters reset
- [ ] **EXPECT:** All orders shown

---

### Test 3.4: Operations Queue

**Navigate to:** `/sales/operations/queue`

**Check Authentication:**
- [ ] Page loads successfully
- [ ] **IF ERROR:** Check error message is actionable
- [ ] **IF "Not authenticated":** Verify "Log In Again" button appears

**Check Bulk Operations:**
- [ ] Select multiple orders (checkboxes)
- [ ] **CHECK:** Bulk action buttons appear
- [ ] **CHECK:** "Print Invoices (ZIP)" button visible
- [ ] **CHECK:** "Update Status" button visible

---

### Test 3.5: Manager Approvals

**Navigate to:** `/sales/manager/approvals`

**Check Approval Queue:**
- [ ] Page loads successfully
- [ ] **CHECK:** Pending approvals shown (if any exist)
- [ ] **CHECK:** Each order shows reason for approval needed
- [ ] **CHECK:** Inventory status shown
- [ ] **CHECK:** Approve/Reject buttons visible

---

## 📋 SECTION 4: Phase 2 Specific Features

### Test 4.1: Brand Filtering in Product Grid

**Navigate to:** `/sales/orders/new` → "Add Products"

**Verify UI:**
- [ ] **CHECK:** Three filter controls visible:
  1. Search input
  2. Category dropdown
  3. **Brand dropdown** (NEW)
- [ ] **CHECK:** Dropdowns show "All Categories" and "All Brands"

**Test Brand Filter:**
- [ ] Click "All Brands" dropdown
- [ ] **VERIFY:** Shows list of unique brands from products
- [ ] **VERIFY:** Brands are sorted alphabetically
- [ ] Select a brand (e.g., "Raywood")
- [ ] **EXPECT:** Only products from that brand shown
- [ ] **CHECK:** Result count updates

**Test Combined Filters:**
- [ ] Select Category = "Wine"
- [ ] Select Brand = "Raywood"
- [ ] **EXPECT:** Only Raywood wines shown
- [ ] Type "Cabernet" in search
- [ ] **EXPECT:** Only Raywood Cabernet wines shown
- [ ] **CHECK:** All 3 filters work together (AND logic)

**Test Clear:**
- [ ] With filters active, click "Clear Filters" button
- [ ] **EXPECT:** All dropdowns reset to "all"
- [ ] **EXPECT:** Search cleared
- [ ] **EXPECT:** All products shown

---

### Test 4.2: Smart Warehouse Defaults

**Test Memory Functionality:**

**First Order:**
- [ ] Create new order
- [ ] Select customer
- [ ] **CHECK:** What warehouse is pre-filled?
- [ ] Change to "East Warehouse"
- [ ] **DO NOT complete order** (just change warehouse)
- [ ] Cancel or navigate away

**Second Order:**
- [ ] Click "New Order" again
- [ ] Select customer
- [ ] **EXPECT:** Warehouse pre-filled with "East Warehouse"
- [ ] **VERIFY:** Remembered from previous order

**Customer Default Override:**
- [ ] Find customer with `defaultWarehouseLocation = "West Warehouse"`
- [ ] Create order for this customer
- [ ] **EXPECT:** Warehouse = "West Warehouse"
- [ ] **VERIFY:** Customer default takes precedence over localStorage

**Clear Memory:**
- [ ] Open browser dev tools → Application → Local Storage
- [ ] Delete `lastUsedWarehouse` key
- [ ] Create new order
- [ ] Select customer without default
- [ ] **EXPECT:** Warehouse = "main" (fallback)

---

### Test 4.3: Enhanced Error Handling

**Test Error Recovery UI:**

**Scenario 1: API Failure**
- [ ] Navigate to `/sales/orders`
- [ ] (If possible) Disconnect from network or kill API
- [ ] **EXPECT:** Error message appears
- [ ] **CHECK:** Error says "We couldn't load orders right now"
- [ ] **CHECK:** Shows specific error reason
- [ ] **CHECK:** "Retry" button appears
- [ ] Restore network
- [ ] Click "Retry"
- [ ] **EXPECT:** Orders load successfully

**Scenario 2: Session Expired**
- [ ] Login successfully
- [ ] Delete session cookie (dev tools)
- [ ] Try to load page
- [ ] **EXPECT:** Error says "Your session has expired"
- [ ] **CHECK:** "Log In Again" button appears
- [ ] Click button
- [ ] **EXPECT:** Redirects to `/sales/login`

---

### Test 4.4: Column Sorting Edge Cases

**Empty Results:**
- [ ] Apply filters so 0 orders match
- [ ] Try to sort columns
- [ ] **EXPECT:** No errors
- [ ] **EXPECT:** Empty state message shown

**Large Dataset:**
- [ ] With all 7,406 orders visible
- [ ] Sort by "Total"
- [ ] **CHECK:** Sorting is fast (< 1 second)
- [ ] **CHECK:** UI doesn't freeze

**Null Values:**
- [ ] Find order with null total (if any)
- [ ] Sort by "Total"
- [ ] **EXPECT:** Null values sorted to end
- [ ] **CHECK:** No JavaScript errors in console

---

## 📋 SECTION 5: Regression Testing

### Test 5.1: Existing Features Still Work

**Critical Features to Re-test:**

**Search & Filtering (Already Existed):**
- [ ] Search by order ID
- [ ] **VERIFY:** Still works after sorting changes
- [ ] Filter by status
- [ ] **VERIFY:** Works with sorting

**Breadcrumbs (Already Existed):**
- [ ] Open order detail
- [ ] **VERIFY:** Breadcrumb shows "Sales > Orders > Order #..."
- [ ] Click "Orders" in breadcrumb
- [ ] **VERIFY:** Navigates to orders list

**Product Count (Already Existed):**
- [ ] Add 3 products to order
- [ ] **VERIFY:** Button shows "Add Products (3)"
- [ ] Remove 1 product
- [ ] **VERIFY:** Button updates to "Add Products (2)"

**Form Validation (Already Existed):**
- [ ] Try to submit order without customer
- [ ] **VERIFY:** Submit button disabled
- [ ] **VERIFY:** Red asterisk shows on required fields
- [ ] Fill all required fields
- [ ] **VERIFY:** Submit button enables

---

### Test 5.2: No New Bugs Introduced

**Check Console:**
- [ ] Open browser dev tools (F12)
- [ ] Navigate through order flow
- [ ] **CHECK:** No red errors in console
- [ ] **CHECK:** No TypeScript errors
- [ ] **CHECK:** No network request failures (except expected 401 if logged out)

**Check Performance:**
- [ ] Load orders list (7,406 orders)
- [ ] **CHECK:** Page loads in < 3 seconds
- [ ] Sort columns
- [ ] **CHECK:** Sorting is instant (< 1 second)
- [ ] Filter products (234 products)
- [ ] **CHECK:** Filtering is instant

**Check Layout:**
- [ ] **VERIFY:** No visual regressions
- [ ] **VERIFY:** Buttons still properly styled
- [ ] **VERIFY:** Forms still readable
- [ ] **VERIFY:** No overlapping text or broken layouts

---

## 📋 SECTION 6: Data Validation & Edge Cases

### Test 6.1: Invoice Number Edge Cases

**Test: Concurrent Invoice Creation**
- [ ] Create 5 orders simultaneously (if possible)
- [ ] Create invoices for all 5 at same time
- [ ] **CHECK:** All have unique invoice numbers
- [ ] **CHECK:** No gaps in sequence (00001, 00002, 00003, 00004, 00005)

**Test: Missing Customer State**
- [ ] Find customer with `state = null`
- [ ] Create order and invoice
- [ ] **EXPECT:** invoiceStateCode defaults to "VA"
- [ ] **VERIFY:** Invoice number like VA260001

**Test: Invalid Delivery Date**
- [ ] Try to create invoice with null delivery date
- [ ] **EXPECT:** Falls back to current date
- [ ] **VERIFY:** Invoice number uses current year

---

### Test 6.2: Product Filtering Edge Cases

**No Products Match:**
- [ ] Select Category = "Wine"
- [ ] Select Brand = "NonExistentBrand"
- [ ] **EXPECT:** "No products match your filters"
- [ ] **CHECK:** Clear filters button appears

**Only One Product Matches:**
- [ ] Apply very specific filters
- [ ] **EXPECT:** Shows "1 of 234 products"
- [ ] **VERIFY:** Single product displays correctly

**All Filters Applied:**
- [ ] Use search + category + brand together
- [ ] **VERIFY:** Results are correct intersection of all filters
- [ ] **VERIFY:** Clear button clears all 3

---

### Test 6.3: Warehouse Memory Edge Cases

**Multiple Browser Tabs:**
- [ ] Open Tab 1: Create order, select "East Warehouse"
- [ ] Open Tab 2: Create new order
- [ ] **EXPECT:** Tab 2 shows "East Warehouse"
- [ ] **VERIFY:** localStorage shared across tabs

**Private Browsing:**
- [ ] Open incognito/private window
- [ ] Create order, select warehouse
- [ ] Create second order
- [ ] **VERIFY:** Warehouse remembered (or localStorage blocked - document behavior)

---

## 📋 SECTION 7: Correctness Validation

### Test 7.1: Invoice Number Business Logic

**Verify Travis's Requirements:**

**State-Based Tracking:**
- [ ] **REQUIREMENT:** "Invoice would begin with state abbreviation"
- [ ] **TEST:** Create VA customer invoice
- [ ] **VERIFY:** Starts with "VA"

**Tax Exempt Handling:**
- [ ] **REQUIREMENT:** "Tax exempt customers use 'TE' prefix"
- [ ] **TEST:** Create tax exempt customer invoice
- [ ] **VERIFY:** Starts with "TE"

**Year from Delivery Date:**
- [ ] **REQUIREMENT:** "Last two digits of year delivery date is set for"
- [ ] **TEST:** Order with delivery date Jan 2, 2026
- [ ] **VERIFY:** Invoice number contains "26"
- [ ] **TEST:** Order with delivery date Dec 30, 2025
- [ ] **VERIFY:** Invoice number contains "25"

**Sequential Numbering:**
- [ ] **REQUIREMENT:** "Five digits in sequential order beginning at 0001"
- [ ] **TEST:** First VA invoice of 2026
- [ ] **VERIFY:** Ends with "00001"
- [ ] **TEST:** Second VA invoice
- [ ] **VERIFY:** Ends with "00002"

**Example Validation:**
- [ ] **REQUIREMENT:** "VA260001, VA260002, VA260003 for first 3 VA invoices in 2026"
- [ ] **TEST:** Create 3 invoices for VA customers, delivery Jan 2, 2026
- [ ] **VERIFY:** Exactly VA260001, VA260002, VA260003

---

### Test 7.2: Sorting Correctness

**Date Sorting:**
- [ ] Sort by date descending
- [ ] **VERIFY:** Most recent order first
- [ ] **CHECK:** Dates are actually in order (not just visual)

**Customer Alphabetical:**
- [ ] Sort by customer ascending
- [ ] **VERIFY:** Alphabetical order (A before B)
- [ ] **VERIFY:** Case-insensitive (ABC before XYZ, not lowercase after uppercase)

**Total Numeric:**
- [ ] Sort by total ascending
- [ ] **VERIFY:** $10.00 before $100.00 before $1,000.00
- [ ] **VERIFY:** Treats as numbers (not strings)

---

### Test 7.3: Filter Accuracy

**Search Accuracy:**
- [ ] Search "wine"
- [ ] **VERIFY:** Returns orders for "1 West DuPont Circle Wine and Liquor"
- [ ] **VERIFY:** Does NOT return "Beer distributor"

**Status Filter:**
- [ ] Filter by "FULFILLED"
- [ ] **VERIFY:** ALL orders shown have FULFILLED status
- [ ] **VERIFY:** No PENDING or SUBMITTED orders slip through

**Combined Accuracy:**
- [ ] Search "ABC" + Filter "FULFILLED"
- [ ] **VERIFY:** Shows only fulfilled orders for "ABC" customers
- [ ] **VERIFY:** AND logic (not OR)

---

## 📋 SECTION 8: Documentation Review

### Test 8.1: Code Comments

**Check New Files:**
- [ ] Open `invoice-number-generator.ts`
- [ ] **VERIFY:** Has comprehensive JSDoc comments
- [ ] **VERIFY:** Examples shown in comments
- [ ] **VERIFY:** Function parameters documented

**Check Modified Files:**
- [ ] Open `create-invoice/route.ts`
- [ ] **VERIFY:** Comments explain Travis's format
- [ ] **VERIFY:** Examples given (VA260001, etc.)

---

### Test 8.2: Error Messages

**Check Message Quality:**
- [ ] Trigger each error type
- [ ] **VERIFY:** Messages are:
  - Clear and specific (not "Error occurred")
  - Actionable (tell user what to do)
  - User-friendly (no tech jargon)
  - Accurate (match actual problem)

---

## 📋 SECTION 9: Performance Check

### Test 9.1: Load Times

**Measure:**
- [ ] Orders list page load: **Target < 2 seconds**
- [ ] Order detail page load: **Target < 1 second**
- [ ] Product grid modal open: **Target < 500ms**
- [ ] Invoice PDF generation: **Target < 3 seconds**

**Network:**
- [ ] Check Network tab in dev tools
- [ ] **VERIFY:** No redundant API calls
- [ ] **VERIFY:** No waterfall requests
- [ ] **VERIFY:** Reasonable payload sizes

---

### Test 9.2: Responsiveness

**Sorting Performance:**
- [ ] With 7,406 orders loaded
- [ ] Click sort column rapidly 10 times
- [ ] **VERIFY:** No lag or freezing
- [ ] **VERIFY:** Each click responds instantly

**Filtering Performance:**
- [ ] With 234 products in grid
- [ ] Type in search box
- [ ] **VERIFY:** Results update as you type (debounced)
- [ ] **VERIFY:** No lag

---

## 📋 SECTION 10: Final Acceptance Criteria

### Critical Requirements:

- [ ] **Invoice numbers follow Travis's format exactly**
  - Format: [STATE][YY][00000]
  - State from customer location or "TE"
  - Year from delivery date
  - Sequential by state+year

- [ ] **All Phase 2 features work:**
  - Brand filtering in product selection
  - Smart warehouse defaults
  - Column sorting on orders
  - Enhanced error messages
  - Test user setup script

- [ ] **No regressions:**
  - Search still works
  - Filtering still works
  - Breadcrumbs still work
  - PDF download still works
  - Order creation still works

- [ ] **Build succeeds:**
  - `npm run build` passes
  - No TypeScript errors
  - All 335 pages compile

- [ ] **Production deployment:**
  - Latest commit deployed
  - No deployment errors
  - Site accessible

---

## 📝 Testing Report Template

After completing all tests, provide a report with:

### **Executive Summary:**
- Total test cases: X
- Passed: X
- Failed: X
- Blocked: X

### **Critical Issues Found:**
1. [Issue description] - Severity: [CRITICAL/HIGH/MEDIUM/LOW]

### **Invoice Numbering Validation:**
- ✅ Format correct (VA260001)
- ✅ Sequences independent by state
- ✅ Year from delivery date
- ❌ [Any issues]

### **UX Improvements Validation:**
- ✅ Brand filtering works
- ✅ Warehouse memory works
- ✅ Column sorting works
- ❌ [Any issues]

### **Regressions Found:**
- [List any features that broke]
- [Or "None found" ✅]

### **Recommendations:**
- [Next steps or improvements needed]

### **Overall Assessment:**
- **Ready for Production?** YES / NO
- **Quality Score:** X/100
- **Confidence Level:** HIGH / MEDIUM / LOW

---

## 🎯 Success Criteria

**PASS if:**
- ✅ Invoice numbers match Travis's format 100%
- ✅ All Phase 2 features functional
- ✅ No critical regressions
- ✅ Build passes
- ✅ Core order flow works end-to-end

**Additional Notes:**
- Document any unexpected behavior (even if not a bug)
- Test on both desktop and mobile (if time permits)
- Include screenshots of any issues found
- Provide specific reproduction steps for failures

---

**Ready to begin comprehensive testing!** 🚀

**Estimated Testing Time:** 2-3 hours for complete checklist
