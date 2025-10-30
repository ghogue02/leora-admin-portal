# Admin Portal Testing Checklist

**Version**: 1.0
**Date**: 2025-10-19
**Portal URL**: http://localhost:3000/admin
**Tester Email**: travis@wellcraftedbeverage.com

---

## Pre-Testing Setup

- [ ] Logged in to sales portal at http://localhost:3000/sales/auth/login
- [ ] Verified user has `sales.admin` role (should see "Admin" in navigation)
- [ ] Dev server running on port 3000
- [ ] Browser console open (F12 → Console tab)
- [ ] Browser network tab open (F12 → Network tab)

---

## 1. DASHBOARD (/admin)

### Navigation
- [ ] Click "Admin" in the sales navigation bar
- [ ] Redirects to `/admin` successfully
- [ ] Admin sidebar visible on left side
- [ ] Breadcrumb shows "Admin / Dashboard"

### Metrics Display
- [ ] **Total Customers** metric displays (Expected: ~4863)
- [ ] **Total Orders** metric displays (Expected: ~2134)
- [ ] **This Week Revenue** metric displays with $ formatting
- [ ] **Active Users** metric displays (Expected: ~3348)
- [ ] **Pending Orders** metric displays (Expected: 0 or more)

### Data Integrity Alerts
- [ ] Alert section visible if issues exist
- [ ] Shows count badges for each alert type
- [ ] Click on alert navigates to filtered page
- [ ] Alerts include:
  - [ ] Customers without sales rep assignment
  - [ ] Fulfilled orders without invoice
  - [ ] Customers without email address

### Quick Actions
- [ ] "Manage Customers" card visible and clickable
- [ ] "Sales Territories" card visible and clickable
- [ ] "View Orders" card visible and clickable
- [ ] "User Accounts" card visible and clickable
- [ ] "Inventory" card visible and clickable
- [ ] "Audit Logs" card visible and clickable

### Recent Activity
- [ ] Recent activity section displays
- [ ] Shows placeholder or actual audit log entries

---

## 2. CUSTOMER MANAGEMENT (/admin/customers)

### Customer List View
- [ ] Click "Customers" in sidebar
- [ ] Page loads successfully
- [ ] Table displays customer data:
  - [ ] Customer Name column
  - [ ] Account Number column
  - [ ] Email column
  - [ ] Sales Rep column
  - [ ] Risk Status column (with colored badges)
  - [ ] Last Order Date column
  - [ ] Edit button per row

### Search Functionality
- [ ] Search box present at top
- [ ] Type customer name → results filter in real-time
- [ ] Type account number → results filter
- [ ] Type email → results filter
- [ ] Clear search → shows all customers

### Filters
- [ ] "Filters" button/section visible
- [ ] Territory dropdown populated with territories
- [ ] Sales Rep dropdown populated with rep names
- [ ] Risk Status checkboxes (Healthy, At Risk, Dormant, Closed)
- [ ] Apply filters → results update
- [ ] Clear filters → resets to all customers

### Pagination
- [ ] Pagination controls visible at bottom
- [ ] Shows "Page 1 of X"
- [ ] "Next" button navigates to page 2 (if >50 customers)
- [ ] "Previous" button works
- [ ] Displays "Showing X-Y of Z customers"

### Sorting
- [ ] Click "Name" column header → sorts ascending
- [ ] Click again → sorts descending
- [ ] Click "Account Number" → sorts work
- [ ] Click "Last Order Date" → sorts work
- [ ] Sort indicator (↑↓) shows on sorted column

### Bulk Actions
- [ ] Checkbox on each row
- [ ] "Select All" checkbox in header
- [ ] Select multiple customers → bulk action bar appears
- [ ] "Bulk Reassign" button visible
- [ ] "Export Selected" button visible

---

## 3. CREATE NEW CUSTOMER (/admin/customers/new)

- [ ] Click "Add New Customer" button
- [ ] Form displays with all fields:
  - [ ] Customer Name (required)
  - [ ] Email (required)
  - [ ] Phone
  - [ ] Street 1
  - [ ] Street 2
  - [ ] City (required)
  - [ ] State (required)
  - [ ] Postal Code (required)
  - [ ] Country (default "US")
  - [ ] Payment Terms
  - [ ] Sales Rep dropdown

### Create Customer Test
- [ ] Fill in required fields:
  - Name: "Test Customer XYZ"
  - Email: "testxyz@example.com"
  - Phone: "555-1234"
  - City: "New York"
  - State: "NY"
  - Postal Code: "10001"
- [ ] Click "Create Customer"
- [ ] Success message appears
- [ ] Redirects to customer detail page
- [ ] Account number auto-generated (e.g., CUST-004864)
- [ ] Customer appears in customer list

---

## 4. CUSTOMER DETAIL/EDIT (/admin/customers/[id])

### Navigation
- [ ] Click "Edit" on any customer in list
- [ ] Detail page loads without errors
- [ ] URL shows `/admin/customers/[uuid]`
- [ ] Breadcrumb shows "Admin / Customers / [Name]"

### Display Sections

**Section 1: Basic Information**
- [ ] Customer Name displays correctly
- [ ] Account Number displays (read-only)
- [ ] Email displays
- [ ] Phone displays
- [ ] Payment Terms displays
- [ ] Risk Status badge displays with correct color

**Section 2: Location & Territory**
- [ ] Street 1 displays
- [ ] Street 2 displays (if exists)
- [ ] City displays
- [ ] State displays
- [ ] Postal Code displays
- [ ] Country displays
- [ ] Current Sales Rep name displays
- [ ] "Reassign to Different Rep" button visible

**Section 3: Account Health (Read-Only)**
- [ ] Total Orders count displays
- [ ] Total Revenue displays with $ formatting
- [ ] Last Order Date displays (formatted)
- [ ] Days Since Last Order calculates correctly
- [ ] Next Expected Order Date displays (if available)
- [ ] Average Order Interval displays

**Section 4: Contact Persons**
- [ ] Table of portal users displays
- [ ] Shows: Name, Email, Status
- [ ] "No portal users" message if none

**Section 5: Financial**
- [ ] Total Open Invoices count displays
- [ ] Total Outstanding Amount displays
- [ ] Payment Terms displays

**Section 6: Actions**
- [ ] "Save Changes" button visible
- [ ] "Cancel" button visible
- [ ] "Archive Customer" button visible

### Edit Customer Test
- [ ] Change phone number to "555-9999"
- [ ] Click "Save Changes"
- [ ] Success alert appears: "Customer updated successfully"
- [ ] Refresh page → phone number persists
- [ ] **No errors in console**
- [ ] **No server 500 errors in network tab**

### Archive Customer Test
- [ ] Click "Archive Customer" button
- [ ] Confirmation prompt appears
- [ ] Enter reason: "Test archive"
- [ ] Customer marked as archived
- [ ] Risk status changes to "CLOSED"

---

## 5. INVENTORY & PRODUCTS (/admin/inventory)

### Inventory List View
- [ ] Click "Inventory & Products" in sidebar
- [ ] Table displays product data:
  - [ ] SKU Code column
  - [ ] Product Name column
  - [ ] Brand column
  - [ ] Category column
  - [ ] Current Price column
  - [ ] Inventory Level column
  - [ ] Status badges (In Stock/Low Stock/Out of Stock)

### Search & Filter
- [ ] Search by SKU code works
- [ ] Search by product name works
- [ ] Category filter dropdown populated
- [ ] Brand filter dropdown populated
- [ ] Status filter checkboxes work
- [ ] Apply filters → results update

### Bulk Actions
- [ ] Select multiple products
- [ ] "Activate Selected" button appears
- [ ] "Deactivate Selected" button appears

---

## 6. PRODUCT DETAIL/EDIT (/admin/inventory/[skuId])

### Navigation
- [ ] Click "Edit" on any product
- [ ] Detail page loads without "Product not found" error
- [ ] URL shows `/admin/inventory/[uuid]`

### Display Sections

**Section 1: Product Information**
- [ ] Product Name editable
- [ ] Brand editable
- [ ] Category editable
- [ ] Description displays
- [ ] Supplier dropdown populated
- [ ] "Sample Only" checkbox displays
- [ ] Active/Inactive toggle displays

**Section 2: SKU Details**
- [ ] SKU Code displays (read-only)
- [ ] Size displays
- [ ] Unit of Measure displays
- [ ] ABV displays
- [ ] Cases Per Pallet displays
- [ ] Price Per Unit displays

**Section 3: Inventory by Location**
- [ ] Table shows inventory locations
- [ ] On Hand quantity displays per location
- [ ] Allocated quantity displays
- [ ] Available (calculated) displays
- [ ] Total row shows sum across locations
- [ ] "Adjust" button per location

**Section 4: Pricing**
- [ ] Table of price list items displays
- [ ] Shows: Price List Name, Price, Min/Max Qty, Dates
- [ ] "Delete" button per price item
- [ ] "Add to Price List" button visible

**Section 5: Activity History**
- [ ] Recent changes display (if any)
- [ ] Shows: Date, User, Action, Reason

### Edit Product Test
- [ ] Change product name
- [ ] Click "Save"
- [ ] Success message appears
- [ ] Refresh → change persists
- [ ] No errors in console

### Inventory Adjustment Test
- [ ] Click "Adjust" for a location
- [ ] Modal opens
- [ ] Shows current quantity
- [ ] Select adjustment type (Add/Subtract/Set)
- [ ] Enter quantity: 10
- [ ] Enter reason: "Test adjustment"
- [ ] Click "Submit"
- [ ] Modal closes
- [ ] Inventory updates
- [ ] New quantity reflects change

---

## 7. SALES REPS & TERRITORIES (/sales/admin/sales-reps)

### Sales Reps List
- [ ] Click "Sales Reps & Territories" in sidebar
- [ ] Navigates to `/sales/admin/sales-reps`
- [ ] Table displays sales rep data:
  - [ ] Rep Name column
  - [ ] Email column
  - [ ] Territory column
  - [ ] Number of Customers column
  - [ ] YTD Revenue column
  - [ ] Quota Achievement % column
  - [ ] Status column

### Search & Filter
- [ ] Search by name works
- [ ] Search by email works
- [ ] Territory filter works
- [ ] Status filter (Active/Inactive) works

### Sales Rep Detail
- [ ] Click "Edit" on a sales rep
- [ ] Detail page loads
- [ ] Shows: Basic info, Quotas, Performance, Goals
- [ ] All fields editable
- [ ] "Save" button works
- [ ] Changes persist

---

## 8. ORDERS & INVOICES (/sales/admin/orders)

### Orders List
- [ ] Click "Orders & Invoices" in sidebar
- [ ] Navigates to `/sales/admin/orders`
- [ ] Table displays order data:
  - [ ] Order ID column
  - [ ] Customer Name column
  - [ ] Order Date column
  - [ ] Total Amount column
  - [ ] Status column
  - [ ] Invoice Status column

### Filters
- [ ] Order status filter (Draft, Submitted, Fulfilled, Cancelled)
- [ ] Invoice status filter (Paid, Unpaid, Overdue)
- [ ] Date range filter
- [ ] Sales rep filter
- [ ] Customer search
- [ ] Amount range filter

### Order Detail
- [ ] Click "Edit" on an order
- [ ] Detail page loads
- [ ] Shows: Order header, Line items, Invoice info
- [ ] Line items editable
- [ ] Can add new line items
- [ ] Can delete line items
- [ ] Order total recalculates
- [ ] "Save" button works

### Create Invoice
- [ ] Find fulfilled order without invoice
- [ ] Click "Create Invoice" button
- [ ] Invoice created successfully
- [ ] Invoice number auto-generated (INV-YYYYMM-####)
- [ ] Links back to order

---

## 9. ACCOUNTS & USERS (/admin/accounts)

### User Accounts List
- [ ] Click "Accounts & Users" in sidebar
- [ ] Navigates to `/admin/accounts`
- [ ] Tab navigation: "Internal Users" and "Portal Users"

### Internal Users Tab
- [ ] Table displays internal users (User table)
- [ ] Shows: Email, Name, Roles, Status
- [ ] Search works
- [ ] Filter by role works
- [ ] Filter by status works

### Portal Users Tab
- [ ] Click "Portal Users" tab
- [ ] Table displays portal users (PortalUser table)
- [ ] Shows: Email, Name, Customer, Roles, Status
- [ ] Search works
- [ ] Filters work

### Create New User
- [ ] Click "Add New User" button
- [ ] Form displays
- [ ] Can select user type (Internal or Portal)
- [ ] Required fields marked
- [ ] Create button works
- [ ] User created successfully

### Edit User
- [ ] Click "Edit" on a user
- [ ] Detail page loads
- [ ] Shows: Basic info, Roles, Permissions
- [ ] Can add/remove roles
- [ ] "Save" button works
- [ ] "Deactivate" button works

---

## 10. AUDIT LOGS (/admin/audit-logs)

### Audit Logs List
- [ ] Click "Audit Logs" in sidebar
- [ ] Page loads without errors
- [ ] **No 500 errors in console** ✅ (Fixed!)
- [ ] Shows empty state message if no logs: "No audit logs found"
- [ ] Table headers visible:
  - [ ] Date/Time, User, Action, Entity Type, Entity ID, Changed Fields

### After Creating Audit Logs (Edit a Customer First)
- [ ] Go back to customers, edit one, and save
- [ ] Return to audit logs
- [ ] Audit log entry appears
- [ ] Shows correct: Date, User (your name), Action (UPDATE), Entity Type (Customer)
- [ ] Click "View Details" button
- [ ] Modal opens showing:
  - [ ] User who made change
  - [ ] Timestamp
  - [ ] Before/after values for changed fields
  - [ ] Metadata (reason, IP if available)

### Filters
- [ ] Click "Filters" button
- [ ] Filter panel expands
- [ ] User dropdown populated (after some logs exist)
- [ ] Action checkboxes (CREATE, UPDATE, DELETE, STATUS_CHANGE)
- [ ] Entity Type dropdown populated
- [ ] Date range pickers work
- [ ] Apply filters → results update
- [ ] Clear filters → resets

### Export
- [ ] Click "Export to CSV" button
- [ ] CSV file downloads
- [ ] Open CSV → contains audit log data
- [ ] Columns: Date, User, Action, Entity Type, etc.

### Statistics
- [ ] Click "View Statistics" link (if exists)
- [ ] Navigate to `/admin/audit-logs/stats`
- [ ] Summary cards display
- [ ] Charts/graphs display (if logs exist)

---

## 11. BULK OPERATIONS (/admin/bulk-operations)

### Page Load
- [ ] Click "Bulk Operations" in sidebar
- [ ] Page loads successfully
- [ ] 4 operation sections visible and collapsible

### Section 1: Bulk Customer Reassignment
- [ ] Click "Expand" to open section
- [ ] Radio buttons: "Select from list" / "Upload CSV"
- [ ] **Select from list** mode:
  - [ ] Search box works
  - [ ] Customer list displays with checkboxes
  - [ ] Select 2-3 customers
  - [ ] Sales Rep dropdown populated
  - [ ] "Execute Reassignment" button enabled
  - [ ] Click execute → success message
  - [ ] Verify customers reassigned in customer list
- [ ] **Upload CSV** mode:
  - [ ] "Download CSV Template" link works
  - [ ] Upload CSV file
  - [ ] File name displays
  - [ ] Execute → processes CSV
  - [ ] Shows success/error count

### Section 2: Bulk Inventory Adjustment
- [ ] Expand section
- [ ] "Download CSV Template" link works
- [ ] Template has correct headers: skuCode, location, adjustmentType, quantity, reason
- [ ] Upload CSV with test data
- [ ] Preview table shows parsed data
- [ ] "Execute Adjustments" button enabled
- [ ] Click execute → processes adjustments
- [ ] Shows success/error counts
- [ ] Verify inventory updated in inventory list

### Section 3: Bulk Order Status Change
- [ ] Expand section
- [ ] Search for orders
- [ ] Select multiple orders with checkboxes
- [ ] New Status dropdown populated (SUBMITTED, FULFILLED, CANCELLED)
- [ ] Optional reason field
- [ ] "Execute Status Change" button works
- [ ] Success message displays
- [ ] Verify order statuses changed

### Section 4: Bulk User Management
- [ ] Expand section
- [ ] Radio toggle: Internal Users / Portal Users
- [ ] Search users
- [ ] Select multiple users
- [ ] Action dropdown: Activate, Deactivate, Add Role, Remove Role
- [ ] Role dropdown (if Add/Remove Role selected)
- [ ] Execute button works
- [ ] Users updated successfully

---

## 12. DATA INTEGRITY (/admin/data-integrity)

### Dashboard Load
- [ ] Click "Data Integrity" in sidebar
- [ ] Page loads without errors
- [ ] Summary cards display:
  - [ ] Quality Score (0-100%)
  - [ ] Total Issues count
  - [ ] Critical Issues count
  - [ ] Last Checked timestamp

### Run Check
- [ ] Click "Run Check Now" button
- [ ] Loading indicator appears
- [ ] Check completes
- [ ] Metrics update
- [ ] Alert cards display below

### Alert Cards
For each alert that has issues (count > 0):
- [ ] Alert card visible with colored badge
- [ ] Severity indicator (High/Medium/Low)
- [ ] Issue count badge
- [ ] Description text clear
- [ ] "View & Fix" button visible

### Common Alerts to Check:
- [ ] **Customers Without Sales Rep**
  - Count displays (Expected: 1+ from test customer)
  - Severity: HIGH
- [ ] **Orders Without Invoice**
  - Count displays (Expected: 8 from your data)
  - Severity: HIGH
- [ ] **Customers Without Email**
  - Count displays (Expected: 4821 from your data)
  - Severity: HIGH

### Fix Issues Test
- [ ] Click "View & Fix" on "Customers Without Sales Rep"
- [ ] Detail page loads
- [ ] Shows list of affected customers
- [ ] Select test customer created earlier
- [ ] Sales rep dropdown to assign
- [ ] Click "Fix Selected"
- [ ] Success message
- [ ] Return to data integrity dashboard
- [ ] Count decreased by 1

---

## 13. PRICE LIST MANAGEMENT (/admin/inventory/pricing)

- [ ] Navigate to `/admin/inventory/pricing`
- [ ] Price lists display in grid/card layout
- [ ] Shows: Name, Currency, Effective Date, Item Count
- [ ] "Default" badge on default price list
- [ ] "Create Price List" button visible
- [ ] Click "Manage" on a price list → detail page loads
- [ ] Shows all items in price list
- [ ] Can add/remove items
- [ ] Can edit price list settings
- [ ] "Delete" button works (with confirmation)

---

## 14. TERRITORIES (/sales/admin/territories)

- [ ] Navigate via sidebar or direct URL
- [ ] Territory list displays
- [ ] Shows: Territory Name, Primary Rep, Customer Count, Revenue
- [ ] Click on territory → detail modal/page opens
- [ ] Shows customers in territory
- [ ] Shows revenue by quarter
- [ ] Can view/edit territory info

---

## 15. RESPONSIVE DESIGN TESTING

### Desktop (>1024px)
- [ ] Sidebar always visible
- [ ] Tables display full width
- [ ] All columns visible
- [ ] No horizontal scrolling needed for navigation

### Tablet (768px - 1024px)
- [ ] Sidebar collapses to hamburger menu
- [ ] Tables scroll horizontally if needed
- [ ] Forms stack properly
- [ ] All features accessible

### Mobile (375px - 768px)
- [ ] Hamburger menu opens sidebar
- [ ] Tables scroll horizontally
- [ ] Forms single column
- [ ] Filters collapse to accordion
- [ ] Action buttons full-width
- [ ] Modals full-screen
- [ ] Touch-friendly hit areas

---

## 16. KEYBOARD SHORTCUTS

- [ ] Press `Ctrl+K` (Cmd+K on Mac) → search modal opens
- [ ] Press `Ctrl+/` (Cmd+/) → keyboard shortcuts help opens
- [ ] Press `Esc` → closes modals
- [ ] On a form, press `Ctrl+S` → saves form (if implemented)
- [ ] Shortcuts help modal shows all available shortcuts

---

## 17. GLOBAL SEARCH (Ctrl+K)

- [ ] Press `Ctrl+K`
- [ ] Search modal opens
- [ ] Type customer name → results appear
- [ ] Type order ID → results appear
- [ ] Type SKU code → results appear
- [ ] Type user email → results appear
- [ ] Results grouped by type (Customers, Orders, Products, Users)
- [ ] Click result → navigates to detail page
- [ ] Press `Esc` → closes search

---

## 18. SECURITY & PERMISSIONS

### Authentication
- [ ] Logout from sales portal
- [ ] Try to access `/admin` → redirects to login
- [ ] Login as non-admin user → cannot access `/admin`
- [ ] Login with `sales.admin` role → full access

### Role-Based Access
- [ ] Admin user sees all features
- [ ] Non-admin redirected or sees 403 error
- [ ] API endpoints return 401/403 without proper auth

---

## 19. ERROR HANDLING

### Network Errors
- [ ] Stop dev server mid-operation
- [ ] Try to save a form → error message displays
- [ ] Error message is user-friendly (not cryptic)
- [ ] Restart server → operations resume

### Validation Errors
- [ ] Try to create customer without email → validation error
- [ ] Try to set negative inventory → validation error
- [ ] Try to create order without line items → validation error
- [ ] Error messages are clear and actionable

### 404 Errors
- [ ] Navigate to `/admin/nonexistent` → 404 page
- [ ] Navigate to `/admin/customers/invalid-uuid` → "Not found" message

---

## 20. PERFORMANCE

### Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Customer list (1000+ records) loads in < 2 seconds
- [ ] Customer detail page loads in < 1 second
- [ ] Search returns results in < 500ms
- [ ] Bulk operations complete in reasonable time (<10s for 100 records)

### Pagination
- [ ] Large lists (>50 items) are paginated
- [ ] Page size selector works (25, 50, 100, 200)
- [ ] Page navigation smooth
- [ ] No lag when switching pages

---

## 21. DATA VALIDATION

### Customer Data
- [ ] Created customer appears in list
- [ ] Account number unique and sequential
- [ ] Email format validated
- [ ] Required fields enforced
- [ ] Cannot create duplicate emails

### Order Data
- [ ] Order totals match line items sum
- [ ] Cannot create order without line items
- [ ] Status transitions validated (can't go FULFILLED → DRAFT)

### Inventory Data
- [ ] Cannot set negative inventory
- [ ] Adjustments require reason
- [ ] Stock levels accurate

---

## 22. AUDIT TRAIL VERIFICATION

### After Making Changes
- [ ] Edit a customer → audit log created
- [ ] Reassign customer → audit log created
- [ ] Update order → audit log created
- [ ] Adjust inventory → audit log created
- [ ] Create invoice → audit log created

### Audit Log Content
- [ ] Shows correct user who made change
- [ ] Shows correct timestamp
- [ ] Shows before/after values for updates
- [ ] Shows reason (if provided)
- [ ] Entity ID links to record

---

## 23. EDGE CASES

- [ ] Create customer with very long name (>100 chars) → handles gracefully
- [ ] Search with special characters (quotes, apostrophes) → works
- [ ] Filter with no results → shows empty state
- [ ] Bulk operation with 0 selected → shows message
- [ ] Upload malformed CSV → shows validation errors
- [ ] Multiple browser tabs → data stays in sync (test refresh)

---

## 24. BROWSER CONSOLE CHECKS

Throughout testing, verify:
- [ ] **No React errors** in console
- [ ] **No 500 errors** in network tab
- [ ] **No unhandled promise rejections**
- [ ] **No "params.id" warnings** (Next.js 15)
- [ ] **No CORS errors**
- [ ] Only expected API calls (no unnecessary requests)

---

## EXPECTED vs ACTUAL TRACKING

As you test, document:

| Feature | Expected Behavior | Actual Behavior | Status | Notes |
|---------|-------------------|-----------------|--------|-------|
| Customer Edit | Saves successfully | | ✅/❌ | |
| Product Detail | Loads without error | | ✅/❌ | |
| Audit Logs | Displays empty state or logs | | ✅/❌ | |
| Data Integrity | Shows checks and counts | | ✅/❌ | |
| Bulk Operations | Processes multiple records | | ✅/❌ | |

---

## CRITICAL SUCCESS CRITERIA

Must pass all:
- [ ] Customer create/edit/view all work without errors
- [ ] Inventory create/edit/view all work without errors
- [ ] Orders create/edit/view all work without errors
- [ ] Audit logs display and track changes correctly
- [ ] Bulk operations process successfully
- [ ] Data integrity checks run and display results
- [ ] All navigation links work
- [ ] No console errors during normal usage
- [ ] No 500 errors in network tab
- [ ] Mobile responsive (test on phone or 375px browser)

---

## POST-TESTING ACTIONS

After completing checklist:
- [ ] Document all bugs found
- [ ] Prioritize: Critical, High, Medium, Low
- [ ] Report any features that don't match expected behavior
- [ ] Note any missing features from original requirements
- [ ] Suggest UX improvements
- [ ] Performance issues observed
- [ ] Security concerns

---

## NOTES FOR TESTER

- **Take screenshots** of any errors or unexpected behavior
- **Note exact steps** to reproduce any issues
- **Check server logs** when errors occur
- **Test with real data** (not just test records)
- **Try edge cases** (empty states, max values, special characters)
- **Test as different user roles** if possible

---

**End of Testing Checklist** ✅
