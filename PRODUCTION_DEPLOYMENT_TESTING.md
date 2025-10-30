# Production Deployment Testing Checklist

**Deployment URL**: https://web-hyzcyod60-gregs-projects-61e51c01.vercel.app
**Test Date**: 2025-10-20
**Tester**: Frontend Testing Agent
**Environment**: Production (Vercel)

---

## Pre-Testing Setup

- [ ] Deployment protection disabled in Vercel
- [ ] Site accessible without Vercel authentication
- [ ] Browser cache cleared (hard refresh: Cmd+Shift+R)
- [ ] Browser console open (F12 → Console)
- [ ] Network tab open (F12 → Network)
- [ ] Test credentials ready:
  - Email: travis@wellcraftedbeverage.com
  - Password: (your password)

---

## CRITICAL: Production Environment Checks

### Environment Validation
- [ ] All environment variables set in Vercel (check /settings/environment-variables)
- [ ] DATABASE_URL connects to production database
- [ ] No trailing spaces or newlines in Vercel secrets
- [ ] NEXT_PUBLIC_PORTAL_TENANT_SLUG set correctly

### Security Checks
- [ ] HTTPS enabled (URL starts with https://)
- [ ] No exposed secrets in browser console
- [ ] No database credentials visible in Network tab responses
- [ ] Session cookies are httpOnly and secure

---

## 1. ROOT PAGE & REDIRECTS

### Test Root URL (/)
- [ ] Visit: https://web-hyzcyod60-gregs-projects-61e51c01.vercel.app/
- [ ] **Expected**: Redirects to `/sales/login`
- [ ] **Actual**: ___________
- [ ] No errors in console
- [ ] No 404 or 500 errors

### Test Direct Access Without Login
- [ ] Try to access `/admin` without login
- [ ] **Expected**: Redirects to `/sales/login` or shows "Not authenticated"
- [ ] Try to access `/sales/dashboard` without login
- [ ] **Expected**: Redirects to login
- [ ] Try to access `/portal/leora` without login
- [ ] **Expected**: Redirects to portal login

---

## 2. AUTHENTICATION & LOGIN

### Sales Login Page (/sales/login)
- [ ] Page loads successfully
- [ ] Email input field present
- [ ] Password input field present
- [ ] "Login" button present
- [ ] No console errors
- [ ] Form styling looks correct

### Login Flow Test
- [ ] Enter email: travis@wellcraftedbeverage.com
- [ ] Enter password: (your password)
- [ ] Click "Login"
- [ ] **Expected**: Redirects to `/sales/dashboard`
- [ ] **Actual**: ___________
- [ ] Session cookie created (check Application → Cookies)
- [ ] Cookie name: `sales_session_id`
- [ ] No authentication errors

### Failed Login Test
- [ ] Enter wrong password
- [ ] **Expected**: Error message shown "Invalid credentials" or similar
- [ ] Does NOT redirect
- [ ] Error message is user-friendly

---

## 3. SALES DASHBOARD (Sales Rep View)

### Dashboard Load
- [ ] Navigate to `/sales/dashboard` after login
- [ ] Page loads without errors
- [ ] Navigation bar visible with all links
- [ ] Sales rep name/email displayed
- [ ] Dashboard metrics display
- [ ] No 500 errors in Network tab

### Navigation Links (Sales Nav)
- [ ] "Dashboard" → `/sales/dashboard` works
- [ ] "Customers" → `/sales/customers` works
- [ ] "Call Plan" → `/sales/call-plan` works
- [ ] "Activities" → `/sales/activities` works
- [ ] "Samples" → `/sales/samples` works
- [ ] "Orders" → `/sales/orders` works (shows ONLY your orders)
- [ ] "Catalog" → `/sales/catalog` works
- [ ] "Cart" → `/sales/cart` works
- [ ] "Admin" → `/admin` works (you have admin role)
- [ ] "Logout" button works

---

## 4. ADMIN PORTAL ACCESS

### Admin Portal Entry
- [ ] Click "Admin" in sales navigation
- [ ] Redirects to `/admin`
- [ ] Admin layout loads (sidebar on left)
- [ ] Admin sidebar shows all menu items:
  - Dashboard, Customers, Sales Reps & Territories, Orders & Invoices,
    Accounts & Users, Inventory & Products, Audit Logs, Bulk Operations, Data Integrity

### Admin Authorization Check
- [ ] You can access (have sales.admin role)
- [ ] URL shows `/admin` correctly
- [ ] No "Access denied" errors
- [ ] Session persists between sales and admin

---

## 5. ADMIN DASHBOARD (/admin)

### Metrics Display
- [ ] "Total Customers" metric shows number
- [ ] "Total Orders" metric shows number
- [ ] "This Week Revenue" shows dollar amount
- [ ] "Active Users" metric shows number
- [ ] "Pending Orders" metric shows number
- [ ] All metrics loaded from database (not showing 0 or "Loading...")

### Data Integrity Alerts
- [ ] Alerts section visible if issues exist
- [ ] Each alert shows:
  - Count badge
  - Description
  - "View & Fix" or "View Details" link
- [ ] Clicking alert navigates to detail page
- [ ] Alert counts match reality

### Quick Actions
- [ ] 6 quick action cards visible
- [ ] Each card clickable and navigates correctly:
  - Manage Customers → `/admin/customers`
  - Sales Territories → `/admin/sales-reps`
  - View Orders → `/admin/orders`
  - User Accounts → `/admin/accounts`
  - Inventory → `/admin/inventory`
  - Audit Logs → `/admin/audit-logs`

---

## 6. CUSTOMER MANAGEMENT (/admin/customers)

### List View
- [ ] Customer list loads (should show 4,800+ customers)
- [ ] Table columns: Name, Account #, Email, Sales Rep, Risk Status, Last Order, Total Orders
- [ ] Pagination shows correct total (e.g., "Page 1 of 98")
- [ ] Risk status badges color-coded:
  - Green: HEALTHY
  - Yellow: AT_RISK_CADENCE
  - Orange: AT_RISK_REVENUE
  - Red: DORMANT
  - Gray: CLOSED

### Search & Filter
- [ ] Search box works (type customer name)
- [ ] Territory filter dropdown populated
- [ ] Sales Rep filter dropdown populated
- [ ] Risk Status checkboxes work
- [ ] Date range filters present
- [ ] Apply Filters updates results
- [ ] Clear Filters resets to all

### Pagination & Sorting
- [ ] Next/Previous buttons work
- [ ] Shows "Showing X to Y of Z customers"
- [ ] Click column headers to sort
- [ ] Sort indicator (↑↓) shows on sorted column

### Create New Customer
- [ ] Click "+ Add New Customer" button
- [ ] Form loads at `/admin/customers/new`
- [ ] Required fields marked with *
- [ ] Fill in test customer:
  - Name: "Test Production Customer"
  - Email: "test-prod@example.com"
  - Phone: "555-0001"
  - Address fields
- [ ] Click "Create Customer"
- [ ] **Expected**: Success message, redirects to detail page
- [ ] Account number auto-generated (CUST-#####)
- [ ] Customer appears in list

### View Customer Detail
- [ ] Click "Edit" on any customer
- [ ] Detail page loads at `/admin/customers/[id]`
- [ ] All sections display:
  - Basic Information
  - Location & Territory
  - Account Health (metrics)
  - Contact Persons (portal users)
  - Financial (invoices)
- [ ] Account health metrics calculated correctly
- [ ] "Save Changes" button present

### Edit Customer
- [ ] Change phone number
- [ ] Click "Save Changes"
- [ ] **Expected**: Success message "Customer updated successfully"
- [ ] Refresh page → change persists
- [ ] No "Unable to validate session" error
- [ ] Audit log created (check /admin/audit-logs)

---

## 7. SALES REP MANAGEMENT (/admin/sales-reps)

### List View
- [ ] Sales reps list loads
- [ ] Shows all sales reps (Travis, Kelly, Carolyn, Greg if created)
- [ ] Table columns: Name, Email, Territory, Customers, YTD Revenue, Quota %, Status
- [ ] Performance metrics calculated (not showing 0 for all)
- [ ] Status badges: Active (green) or Inactive (gray)

### Search & Filter
- [ ] Search by name works
- [ ] Territory filter works
- [ ] Status filter works

### Create New Sales Rep
- [ ] Click "+ Create Sales Rep" button
- [ ] Form loads at `/admin/sales-reps/new`
- [ ] Shows "No available users" warning (all users have profiles)
- [ ] Click "+ Create New User Account"
- [ ] Inline user form appears with:
  - Full Name (required)
  - Email (required)
  - Password (required, visible text)
  - Phone (optional)
- [ ] Fill in new user details
- [ ] Click "Create User & Continue"
- [ ] **Expected**: User created, auto-selected in dropdown
- [ ] Fill in sales rep details:
  - Territory Name: "Test Territory"
  - Delivery Day: Monday
  - Quotas (optional)
- [ ] Click "Create Sales Rep"
- [ ] **Expected**: Redirects to sales rep detail page
- [ ] Sales rep appears in list

### View/Edit Sales Rep
- [ ] Click "Edit" on any sales rep
- [ ] Detail page loads at `/admin/sales-reps/[id]`
- [ ] Shows all sections:
  - Basic Info (territory, delivery day, status)
  - Quotas (weekly, monthly, quarterly, annual)
  - Performance (YTD revenue, customers, quota %)
  - Product Goals (table)
  - Linked User Account
- [ ] Edit territory name
- [ ] Click "Save"
- [ ] **Expected**: Success message, changes persist

---

## 8. ORDER MANAGEMENT (/admin/orders)

### List View
- [ ] Orders list loads
- [ ] Shows ALL orders from all sales reps (not filtered)
- [ ] Table columns: Order ID, Customer, Order Date, Total, Status, Invoice Status, Sales Rep
- [ ] Pagination works
- [ ] Status badges color-coded

### Filters
- [ ] Order Status filter (DRAFT, SUBMITTED, FULFILLED, CANCELLED)
- [ ] Invoice Status filter (PAID, UNPAID, OVERDUE)
- [ ] Date range filter
- [ ] Sales Rep filter (dropdown with all reps)
- [ ] Customer search
- [ ] Amount range (min/max)
- [ ] Apply filters updates results

### View Order Detail
- [ ] Click on any order ID
- [ ] Detail page loads at `/admin/orders/[id]`
- [ ] Shows order header: Customer, Date, Status, Sales Rep
- [ ] Line items table displays
- [ ] Shows pricing & totals
- [ ] Shows invoice info (if invoice exists)
- [ ] "Back to Orders" link → `/admin/orders` (not `/sales/orders`)

### Edit Order
- [ ] Can edit customer (dropdown)
- [ ] Can change status
- [ ] Can add/edit/delete line items
- [ ] Order total recalculates
- [ ] "Save" button works

### Create Invoice
- [ ] Find order with status FULFILLED but no invoice
- [ ] Click "Create Invoice" button
- [ ] **Expected**: Invoice created with auto-generated number (INV-YYYYMM-####)
- [ ] Invoice linked to order
- [ ] Invoice appears in order detail

---

## 9. USER ACCOUNT MANAGEMENT (/admin/accounts)

### List View
- [ ] Accounts page loads
- [ ] Two tabs: "Internal Users" and "Portal Users"
- [ ] Internal Users tab shows User records
- [ ] Portal Users tab shows PortalUser records
- [ ] Search works on both tabs
- [ ] Filters work (role, status)

### Create Internal User
- [ ] Click "+ Add New User"
- [ ] Form loads at `/admin/accounts/new`
- [ ] Fill in: Email, Full Name, Password, Roles
- [ ] Click "Create"
- [ ] **Expected**: User created, appears in list

### Edit User
- [ ] Click "Edit" on any user
- [ ] Detail page loads
- [ ] Can view/edit: Basic info, Roles, Linked sales rep (if applicable)
- [ ] Can add/remove roles
- [ ] "Save" button works
- [ ] "Deactivate" button works

---

## 10. INVENTORY & PRODUCTS (/admin/inventory)

### Product List
- [ ] Inventory list loads (1,200+ products)
- [ ] Table shows: SKU, Name, Brand, Category, Price, Inventory, Status
- [ ] Status badges: In Stock (green), Low Stock (yellow), Out of Stock (red)
- [ ] Search by SKU or name works
- [ ] Filters work (category, brand, status)
- [ ] Pagination works

### Product Detail
- [ ] Click "Edit" on any product
- [ ] Detail page loads at `/admin/inventory/[skuId]`
- [ ] Shows all sections:
  - Product Information (name, brand, category)
  - SKU Details (size, UOM, ABV, price)
  - Inventory by Location (table)
  - Price Lists (table)
  - Recent Activity
- [ ] Can edit product name
- [ ] Click "Save" → changes persist

### Inventory Adjustment
- [ ] Click "Adjust" on a location
- [ ] Modal appears (not gray/invisible)
- [ ] Shows: SKU, Location, Current Quantity
- [ ] Radio buttons: Add, Subtract, Set
- [ ] Quantity input field
- [ ] Reason text area (required)
- [ ] Preview shows old → new quantity
- [ ] Click "Adjust Inventory"
- [ ] **Expected**: Modal closes, inventory updated
- [ ] Refresh → new quantity shown

---

## 11. AUDIT LOGS (/admin/audit-logs)

### List View
- [ ] Audit logs page loads
- [ ] Shows recent changes (if any exist from testing)
- [ ] Table columns: Date/Time, User, Action, Entity Type, Entity ID, Changed Fields
- [ ] Action badges color-coded:
  - CREATE: Green
  - UPDATE: Blue
  - DELETE: Red
  - STATUS_CHANGE: Orange
- [ ] Pagination works

### View Log Details
- [ ] Click "View Details" on any log
- [ ] Modal opens showing:
  - User who made change
  - Timestamp
  - Entity Type and ID
  - Before/After values (for updates)
  - Metadata (reason, IP if available)
- [ ] "Changes" tab shows field-by-field comparison
- [ ] "Raw JSON" tab shows full JSON
- [ ] Modal closes properly

### Filters
- [ ] Click "Filters" button
- [ ] User dropdown populated (users who made changes)
- [ ] Action checkboxes work
- [ ] Entity Type dropdown populated
- [ ] Date range pickers work
- [ ] Apply filters → results update

### Export
- [ ] Click "Export to CSV" button
- [ ] CSV file downloads
- [ ] Open CSV → contains audit data
- [ ] Columns properly formatted
- [ ] No encoding issues (check special characters)

---

## 12. BULK OPERATIONS (/admin/bulk-operations)

### Page Load
- [ ] Bulk operations page loads
- [ ] Shows 4 sections (collapsed by default):
  1. Bulk Customer Reassignment
  2. Bulk Inventory Adjustment
  3. Bulk Order Status Change
  4. Bulk User Management

### Customer Reassignment
- [ ] Click "Expand" on Customer Reassignment
- [ ] Section expands without crashing
- [ ] Radio buttons: "Select from list" / "Upload CSV"
- [ ] **List mode**:
  - Search box present
  - Customer list loads
  - Can select multiple with checkboxes
  - Sales Rep dropdown populated
  - "Execute Reassignment" button present
- [ ] **CSV mode**:
  - "Download CSV Template" link works
  - File upload input present
  - Can upload CSV file

### Test Bulk Reassignment (Optional - if time permits)
- [ ] Select 2-3 test customers
- [ ] Choose different sales rep
- [ ] Click "Execute Reassignment"
- [ ] **Expected**: Success message with count
- [ ] Verify customers reassigned in customer list
- [ ] Audit logs created

### Inventory Adjustment
- [ ] Expand section
- [ ] "Download CSV Template" link works
- [ ] Template has correct headers
- [ ] Can upload CSV
- [ ] Preview shows parsed data

### Order Status Change
- [ ] Expand section
- [ ] Can search for orders
- [ ] Can select multiple orders
- [ ] New Status dropdown populated
- [ ] "Execute" button present

### User Management
- [ ] Expand section
- [ ] Radio toggle: Internal / Portal users
- [ ] Can search users
- [ ] Action dropdown: Activate, Deactivate, Add/Remove Role
- [ ] "Execute" button present

---

## 13. DATA INTEGRITY (/admin/data-integrity)

### Dashboard Load
- [ ] Data integrity page loads
- [ ] **No "Failed to fetch" error**
- [ ] Summary cards display:
  - Quality Score (0-100%)
  - Total Issues count
  - Critical Issues count
  - Last Checked timestamp

### Run Integrity Check
- [ ] Click "Run Check Now" button
- [ ] Loading indicator appears
- [ ] Check completes (may take 10-30 seconds)
- [ ] Metrics update
- [ ] Alert cards appear below

### Alert Cards
For each alert with issues (count > 0):
- [ ] Alert card visible
- [ ] Severity badge (High/Medium/Low) color-coded
- [ ] Issue count badge
- [ ] Description clear
- [ ] "View & Fix" or "View Details" button

### Common Alerts to Verify
- [ ] "Customers Missing Email" (should show 4,800+)
- [ ] "Orders Without Invoice" (should show ~8)
- [ ] "Customers Without Sales Rep" (should show 1-2)

### View Alert Details
- [ ] Click "View & Fix" on any alert
- [ ] Detail page loads
- [ ] Shows list of affected records (paginated)
- [ ] Can select records with checkboxes
- [ ] Fix button available (if auto-fix supported)

---

## 14. TERRITORIES (/admin/territories)

- [ ] Click "Sales Reps & Territories" → navigate to territories
- [ ] Territory list loads
- [ ] Shows: Territory Name, Primary Rep, Customer Count, Revenue
- [ ] Can click on territory for details
- [ ] Territory detail shows customers and revenue breakdown

---

## 15. PRODUCTION-SPECIFIC TESTS

### Performance
- [ ] Dashboard loads in < 5 seconds
- [ ] Customer list (5,000 records) loads in < 5 seconds
- [ ] Detail pages load in < 3 seconds
- [ ] No timeouts or extremely slow queries
- [ ] Pagination is fast (< 1 second per page)

### Database Connection
- [ ] All pages connect to production database successfully
- [ ] No "DATABASE_URL not found" errors
- [ ] No connection timeout errors
- [ ] Queries return production data (4,800+ customers, 2,100+ orders)

### Error Handling
- [ ] Navigate to non-existent page: `/admin/nonexistent`
- [ ] **Expected**: 404 page or redirect to dashboard
- [ ] Navigate to invalid UUID: `/admin/customers/invalid-id`
- [ ] **Expected**: "Not found" error page
- [ ] Try to access admin as non-admin user (if you can test)
- [ ] **Expected**: 403 Access Denied or redirect

### Console Errors
Throughout all testing:
- [ ] **No uncaught exceptions in console**
- [ ] **No 500 Internal Server Errors in Network tab**
- [ ] **No "Cannot read property of undefined" errors**
- [ ] **No CORS errors**
- [ ] **No missing asset errors (404s for JS/CSS)**

### Mobile Responsiveness
- [ ] Open Chrome DevTools (F12)
- [ ] Toggle device toolbar (Cmd+Shift+M)
- [ ] Test on iPhone SE (375px width):
  - [ ] Sidebar becomes hamburger menu
  - [ ] Tables scroll horizontally
  - [ ] Forms stack vertically
  - [ ] Buttons are full-width and touch-friendly
  - [ ] Modals are full-screen
  - [ ] All features accessible

---

## 16. CROSS-BROWSER TESTING

### Chrome (Primary)
- [ ] All features work as expected
- [ ] No browser-specific console errors

### Safari (if available)
- [ ] Login works
- [ ] Dashboard loads
- [ ] Core features work (customers, orders)
- [ ] No Safari-specific errors

### Firefox (if available)
- [ ] Login works
- [ ] Dashboard loads
- [ ] Core features work

---

## 17. SESSION & SECURITY

### Session Persistence
- [ ] Login to admin
- [ ] Navigate between pages
- [ ] Session persists (no random logouts)
- [ ] Refresh page → still logged in
- [ ] Close browser, reopen → session may expire (expected)

### Logout
- [ ] Click "Logout" button
- [ ] Redirected to login page
- [ ] Session cookie cleared
- [ ] Cannot access `/admin` without re-login

### Admin-Only Features
- [ ] Verify admin features only accessible with sales.admin role
- [ ] Non-admin users cannot access /admin (test if possible)

---

## 18. DATA CONSISTENCY

### Verify Production Data
- [ ] Customer count matches expected (~4,863)
- [ ] Order count matches expected (~2,134)
- [ ] Sales reps exist (Travis, Kelly, Carolyn)
- [ ] Products exist (1,200+ SKUs)
- [ ] Inventory data present

### Audit Trail
- [ ] Make a change (edit customer)
- [ ] Go to /admin/audit-logs
- [ ] Verify change logged with:
  - Correct user (travis@wellcraftedbeverage.com)
  - Correct timestamp
  - Correct entity (Customer)
  - Before/after values shown

---

## 19. CRITICAL SUCCESS CRITERIA

Must ALL pass for production approval:

- [ ] **Login works** without errors
- [ ] **Dashboard loads** with real metrics
- [ ] **Customer CRUD** works (create, view, edit)
- [ ] **Sales rep management** works (list, create, edit)
- [ ] **Order management** works (list, view, edit)
- [ ] **Audit logs display** and track changes
- [ ] **No 500 errors** during normal operation
- [ ] **No console errors** during normal usage
- [ ] **Session persists** across page navigation
- [ ] **All navigation links work**
- [ ] **Data from production database** displays correctly
- [ ] **Mobile responsive** on phone viewport
- [ ] **Performance acceptable** (< 5s page loads)

---

## 20. PRODUCTION ISSUES LOG

Document any issues found:

| Issue # | Page/Feature | Severity | Description | Steps to Reproduce | Expected | Actual |
|---------|--------------|----------|-------------|-------------------|----------|--------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

**Severity Levels:**
- **CRITICAL**: Site unusable, blocks core functionality
- **HIGH**: Major feature broken, workaround exists
- **MEDIUM**: Minor feature broken or UX issue
- **LOW**: Cosmetic issue or edge case

---

## FINAL CHECKLIST

After completing all tests:

- [ ] All CRITICAL success criteria passed
- [ ] Zero CRITICAL issues found
- [ ] Documented all HIGH/MEDIUM issues
- [ ] Verified production database connection works
- [ ] Verified authentication and session management work
- [ ] Verified no sensitive data exposed in console/network
- [ ] Tested on mobile viewport
- [ ] Tested key workflows end-to-end

---

## SIGN-OFF

**Tester Name**: ___________
**Test Date**: ___________
**Test Duration**: ___________
**Overall Status**: ⬜ PASS / ⬜ PASS WITH ISSUES / ⬜ FAIL

**Recommendation**:
- ⬜ Approved for production use
- ⬜ Approved with minor fixes needed
- ⬜ Not approved - critical issues must be resolved

**Notes**:
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

**End of Production Testing Checklist**
