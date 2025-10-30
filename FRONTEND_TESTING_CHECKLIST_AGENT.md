# 🧪 FRONTEND TESTING CHECKLIST - For Testing Agent
## Comprehensive UI/UX Testing - Sales & Admin Sections

**Target:** Leora CRM Frontend (Sales + Admin)
**Server:** http://localhost:3000
**Tester:** Frontend Coding Agent
**Test Count:** 150+ systematic checks

---

## 📋 **TESTING INSTRUCTIONS FOR AGENT**

### **How to Use This Checklist:**

1. **Login First:**
   - URL: http://localhost:3000/sales/login
   - User: travis@wellcraftedbeverage.com (or test@wellcrafted.com / test123)

2. **Test Systematically:**
   - Go through each section in order
   - Mark [ ] or [x] for each test
   - Document any failures with screenshots
   - Note page load times

3. **Reporting:**
   - Create summary report at end
   - List all failures with severity (P0/P1/P2)
   - Include screenshots of issues
   - Provide recommendations

4. **Pass Criteria:**
   - 95%+ tests passing = PASS
   - 85-94% = ACCEPTABLE (document issues)
   - <85% = FAIL (needs fixes)

---

## 🎯 **SECTION 1: SALES DASHBOARD**

**URL:** `/sales/dashboard`
**Critical:** YES - First page users see

### Visual Elements (10 tests)
- [ ] Page title "Sales Dashboard" displays
- [ ] Welcome message shows sales rep name (e.g., "Welcome back, Travis")
- [ ] Territory name displays (e.g., "South territory")
- [ ] Current week date shows
- [ ] All 5 metric cards visible (Quota, This Week, YTD, Customers, Total)
- [ ] YTD card has blue background (distinguishing color)
- [ ] "Metric Glossary" button visible in header
- [ ] "Customize Dashboard" button visible
- [ ] All metric values display (not $0 or blank)
- [ ] Page loads within 2 seconds

### Metric Cards (5 tests)
- [ ] Weekly Quota Progress shows percentage (0-100%)
- [ ] This Week Revenue shows dollar amount
- [ ] YTD Revenue (2025) shows in blue card
- [ ] YTD shows correct year (2025)
- [ ] Unique Customers shows number
- [ ] Total Revenue shows all-time amount

### Interactive Elements (5 tests)
- [ ] Click "Metric Glossary" - modal opens
- [ ] Metric glossary shows all definitions
- [ ] Click X to close glossary - modal closes
- [ ] Hover over metric cards - no errors
- [ ] Tooltip appears on metric help icons (?)

### Customer Health Section (5 tests)
- [ ] Customer Health Summary displays
- [ ] Shows 5 categories (Healthy, At Risk Cadence, At Risk Revenue, Dormant, Closed)
- [ ] Each category shows count
- [ ] Total count matches sum of categories
- [ ] Health percentages calculate correctly

### New Sections (10 tests)
- [ ] Top Products section displays
- [ ] Shows top 10 products by revenue
- [ ] Product names visible
- [ ] Revenue amounts shown
- [ ] Customer Balances section displays
- [ ] Shows past due amounts
- [ ] Aging buckets visible (0-30, 31-60, 61-90, 90+ days)
- [ ] New Customers metric displays
- [ ] Product Goals section displays
- [ ] Goals show progress bars

### Responsive Design (3 tests)
- [ ] Desktop (1920px): All cards in proper grid
- [ ] Tablet (768px): Cards stack appropriately
- [ ] Mobile (375px): Single column, readable

**Dashboard Score:** ___/38 tests passed

---

## 🎯 **SECTION 2: CUSTOMERS LIST**

**URL:** `/sales/customers`
**Critical:** YES - Core sales function

### Page Layout (8 tests)
- [ ] Page title "Customers" displays
- [ ] Search bar visible
- [ ] Filter buttons visible (All, Due to Order, Healthy, At Risk, Dormant)
- [ ] "My Customers" / "All Customers" toggle visible
- [ ] Customer count shows (should be 1,907 for Travis)
- [ ] Total revenue displays
- [ ] **YTD Revenue displays** (NEW - should show amount)
- [ ] Table headers visible

### Table Display (12 tests)
- [ ] Table shows customer rows
- [ ] Customer names display
- [ ] Location (city, state) displays
- [ ] Last order date shows
- [ ] Revenue column shows amounts
- [ ] **YTD Revenue column shows** (NEW)
- [ ] Status badges display (Healthy, At Risk, Dormant)
- [ ] "View Details" button on each row
- [ ] Pagination controls visible
- [ ] Sorting works (click column headers)
- [ ] At least 10 customers visible
- [ ] No loading spinners stuck

### Search & Filter (8 tests)
- [ ] Type in search - filters immediately
- [ ] Search finds customers by name
- [ ] Click "Healthy" filter - shows only healthy
- [ ] Click "At Risk" filter - shows only at risk
- [ ] Click "Dormant" filter - shows only dormant
- [ ] Click "All Customers" - shows all
- [ ] Filter count updates (e.g., "Healthy: 1907")
- [ ] Clear search works

### Quick Actions (5 tests)
- [ ] **"Sample" button appears on each row** (NEW - purple button)
- [ ] Click Sample - modal opens
- [ ] Can select sample product
- [ ] Can add notes
- [ ] Save creates activity

### Performance (2 tests)
- [ ] Page loads in < 2 seconds
- [ ] Table scrolling smooth (no lag)

**Customers List Score:** ___/35 tests passed

---

## 🎯 **SECTION 3: CUSTOMER DETAIL PAGE**

**URL:** `/sales/customers/[customerId]` (click any customer)
**Critical:** YES - Was slow (10+s), now should be < 2s

### Performance (5 tests - CRITICAL)
- [ ] **Page loads in < 2 seconds** (was 10+s before fix)
- [ ] No loading spinner for > 2 seconds
- [ ] Data appears progressively (not all at once)
- [ ] No UI freezing
- [ ] Works with customers having 100+ orders

### Basic Info Display (8 tests)
- [ ] Customer name displays prominently
- [ ] Address shows
- [ ] Phone number shows
- [ ] Email shows (if available)
- [ ] Account number displays
- [ ] Status badge shows (Healthy/At Risk/Dormant)
- [ ] Last order date displays
- [ ] Territory displays

### Revenue Metrics (5 tests)
- [ ] All-time revenue displays
- [ ] **YTD revenue displays** (NEW)
- [ ] Order count displays
- [ ] Average order value calculates
- [ ] Customer health score shows

### Order History (8 tests)
- [ ] Order history section displays
- [ ] Shows list of orders
- [ ] Order numbers visible
- [ ] Order dates display
- [ ] Order totals show
- [ ] Order status shows
- [ ] Can click order to see details
- [ ] Limited to 50 most recent (pagination)

### New Sections (15 tests)
- [ ] **Order Deep Dive section displays** (NEW)
- [ ] Shows product breakdown
- [ ] Lists what products they order
- [ ] Shows when last ordered each item
- [ ] Product frequency displays
- [ ] **Product History Reports tab** (NEW)
- [ ] Purchase timeline displays
- [ ] Seasonal patterns chart shows
- [ ] **AI Insights widget displays** (NEW)
- [ ] Recommendations shown
- [ ] Next order prediction displays
- [ ] Churn risk assessment shows
- [ ] **Quick Actions section** (NEW - Send Email, Log Activity, etc)
- [ ] All quick action buttons work
- [ ] Customer timeline visual displays

### Mobile Responsiveness (3 tests)
- [ ] Desktop: Multi-column layout
- [ ] Tablet: Adjusted layout
- [ ] Mobile: Single column, scrollable

**Customer Detail Score:** ___/44 tests passed

---

## 🎯 **SECTION 4: CALL PLAN (CARLA)**

**URL:** `/sales/call-plan/carla`
**Critical:** YES - Core weekly planning tool

### Header & Navigation (6 tests)
- [ ] Page title "Weekly Call Plan" displays
- [ ] Current week shows (e.g., "Oct 20 - Oct 26, 2025")
- [ ] Previous week button works
- [ ] Next week button works
- [ ] **"Select Accounts" button visible** (NEW - PRIMARY ACTION)
- [ ] Account counter displays (e.g., "0 of 75 accounts")

### Account Selection (12 tests - NEW FEATURE)
- [ ] Click "Select Accounts" - modal opens
- [ ] Modal shows customer list with checkboxes
- [ ] Search box works
- [ ] Territory filter works
- [ ] Priority filter works (A/B/C)
- [ ] Status filter works (Healthy/At Risk)
- [ ] Can select multiple customers
- [ ] "Select All" button works
- [ ] "Clear All" button works
- [ ] Counter updates as you select (e.g., "15 of 75")
- [ ] Counter turns green at 70-75 accounts
- [ ] "Add to Plan" button saves selections

### Weekly View (10 tests)
- [ ] Selected accounts display in calendar
- [ ] Each account shows as card
- [ ] Account name visible
- [ ] Contact buttons appear (X for contacted, Y for visited)
- [ ] Click X - marks as contacted
- [ ] Click Y - marks as visited
- [ ] Contacted count updates
- [ ] Visited count updates
- [ ] **Activity entry modal pops up** (NEW when marking contacted)
- [ ] Can remove account from plan

### Progress Tracking (5 tests)
- [ ] Weekly Progress section shows
- [ ] Total Activities count displays
- [ ] Completion Rate calculates (X contacted / total accounts)
- [ ] In-Person Activities % shows
- [ ] Electronic Contact % shows

### Mobile (3 tests)
- [ ] Mobile: Single column layout
- [ ] Touch-friendly contact buttons (50x50px)
- [ ] Swipe gestures work

**CARLA Score:** ___/36 tests passed

---

## 🎯 **SECTION 5: SAMPLES**

**URL:** `/sales/samples`
**Critical:** MEDIUM - Important feature

### Page Load (5 tests)
- [ ] Page loads without "Element type invalid" error (was broken)
- [ ] Page title "Sample Management" displays
- [ ] "View Analytics" button visible
- [ ] "Log Sample" button visible
- [ ] No console errors

### Tabs Display (8 tests)
- [ ] **3 tabs visible: Quick Assign, Pulled Samples, History** (was broken, now fixed)
- [ ] Tab 1: "Quick Assign" clickable
- [ ] Tab 2: "Pulled Samples" clickable
- [ ] Tab 3: "Sample History" clickable
- [ ] Click Quick Assign - content displays
- [ ] Click Pulled Samples - content displays
- [ ] Click History - content displays
- [ ] Tab switching works smoothly

### Sample Budget (5 tests)
- [ ] Sample Budget Tracker displays
- [ ] Shows month (e.g., "October 2025")
- [ ] Shows allowance (e.g., "0/60 used")
- [ ] Progress bar displays
- [ ] Budget percentage shows

### Conversion Funnel (5 tests)
- [ ] Conversion Funnel section displays
- [ ] Shows "Samples Given" count
- [ ] Shows "Customer Tastings" count
- [ ] Shows "Resulting Orders" count
- [ ] Shows conversion rates (Tasting Rate, Close Rate)

### Actions (3 tests)
- [ ] "Log Sample" button opens modal
- [ ] Can select customer
- [ ] Can select sample product

### Working Highlights (2025-10-28 run)
- Sample creation flow persists data correctly and updates budget tracking (latest run: `3/60 used`, `57 remaining`, 5% utilized).
- Conversion funnel metrics remain in sync across tabs (Tasting Rate 100%, Close Rate 33.3% after three samples).
- Quick Assign, Pulled Samples, and Sample History tabs load, switch, and reflect shared lifecycle states; status badges update instantly.

### Resolved Since Prior Run (2025-10-28 verification)
- Required field validation now surfaces inline helper text and red focus states on missing fields.
- Customer/product dropdowns open on click and can be keyboard navigated without pre-typing.
- Product labels now render without duplicate or numeric noise (e.g., `Cabernet NV` displays once).
- "View Analytics" loads successfully with populated metrics.

### Follow-up Findings (2025-10-28 run)
- **P2:** No way to view or edit an existing sample after logging it. Provide an edit or detail flow for updating feedback, quantities, and dates.
- **P2:** No delete capability for samples—add delete with confirmation to correct mistakes.
- **P2:** Converted samples cannot be reverted. Consider an "Undo" or "Revert" action for accidental conversions.

### Engineering Action Plan
- **P1-A (Product Label Formatting):** ✅ Implemented via shared `formatSkuLabel` helper with unit coverage.
- **P1-B (Analytics Endpoint):** ✅ Server route now backed by sample/order aggregates with integration tests; add Playwright assertion that analytics charts render.
- **P1-C (Regression Guardrails):** ✅ Added vitest coverage for formatter and analytics route; still consider end-to-end coverage for UI load.
- **P2-A (Edit Flow Scope):** Design modal or drawer for editing sample details with audit trail; confirm backend update endpoint availability.
- **P2-B (Delete Flow Scope):** Define soft-delete path with confirmation modal and analytics update; outline permissions checks.
- **P2-C (Revert Conversion Scope):** Explore state machine allowing revert from "Converted" with confirmation and audit logging; document edge cases (budget adjustments, funnel metrics).

**Samples Score:** ___/26 tests passed

---

## 🎯 **SECTION 6: ORDERS**

**URL:** `/sales/orders`
**Critical:** MEDIUM - Was broken, now fixed

### Page Load (5 tests)
- [ ] Page loads without application error (was broken)
- [ ] Page title "All orders in one place" displays
- [ ] Order count shows (should be 19,602)
- [ ] Open Exposure displays
- [ ] Open Order Count displays

### Orders Table (10 tests)
- [ ] Orders table displays
- [ ] Order ID column shows
- [ ] Customer name column shows
- [ ] Order total column shows
- [ ] Invoice total column shows
- [ ] Status column shows (FULFILLED, etc.)
- [ ] Updated date column shows
- [ ] At least 25 orders visible
- [ ] Status badges color-coded
- [ ] No duplicate orders

### Sorting & Filtering (3 tests)
- [ ] Table sortable by columns
- [ ] Can filter by status
- [ ] Pagination works

**Orders Score:** ___/18 tests passed

---

## 🎯 **SECTION 7: PRODUCT CATALOG**

**URL:** `/sales/catalog`
**Critical:** MEDIUM - Was broken, now fixed

### Page Load (5 tests)
- [ ] Page loads without runtime error (was broken)
- [ ] Page title "Browse the portfolio" displays
- [ ] SKU count shows (should be "2779 of 2779 SKUs")
- [ ] Search bar visible
- [ ] Category filters visible

### Product Grid (10 tests)
- [ ] Products display in grid
- [ ] Product images show (or placeholders)
- [ ] Product names display
- [ ] SKU codes display
- [ ] Brand names show (not "Brand TBD")
- [ ] Prices display
- [ ] Inventory count shows ("Available: X units")
- [ ] "Add to Cart" buttons visible
- [ ] At least 12 products visible
- [ ] Grid responsive (3-4 cols desktop, 2 tablet, 1 mobile)

### Search & Filter (8 tests)
- [ ] Search by product name works
- [ ] Search by SKU works
- [ ] Brand filter dropdown works
- [ ] Category filter works (Wine, Spirits)
- [ ] Filter count updates
- [ ] "Clear Filters" button works
- [ ] Multiple filters combine correctly
- [ ] Results update immediately

### Product Details (5 tests)
- [ ] Click product - detail modal opens
- [ ] **Tasting Notes tab displays** (NEW)
- [ ] **Technical Details tab displays** (NEW)
- [ ] Product specs show (ABV, vintage, etc.)
- [ ] Close modal works

**Catalog Score:** ___/28 tests passed

---

## 🎯 **SECTION 8: ACTIVITIES**

**URL:** `/sales/activities`
**Critical:** LOW - Supporting feature

### Page Display (5 tests)
- [ ] Page loads
- [ ] Activity list displays
- [ ] Activity count shows
- [ ] "Log Activity" button visible
- [ ] Filter dropdowns visible

### Activity Table (8 tests)
- [ ] Activity type column displays
- [ ] Subject column shows
- [ ] Customer column shows (linked)
- [ ] Date & time column shows
- [ ] Outcome column shows
- [ ] Order result shows (if applicable)
- [ ] Activities sorted by date (newest first)
- [ ] At least some activities visible

### Filtering (3 tests)
- [ ] Filter by activity type works
- [ ] Filter by customer works
- [ ] Search by subject/notes works

**Activities Score:** ___/16 tests passed

---

## 🎯 **SECTION 9: MANAGER DASHBOARD**

**URL:** `/sales/manager`
**Critical:** MEDIUM - Important for managers

### Team Overview (8 tests)
- [ ] Page title "Team Dashboard" displays
- [ ] Team stats display (Total Revenue, Customers, etc.)
- [ ] **Team YTD Revenue displays** (NEW)
- [ ] All-time revenue displays
- [ ] Week-over-week change shows
- [ ] Total customer count shows
- [ ] Active customers count shows
- [ ] At-risk customer count shows

### Sales Rep Performance Table (12 tests)
- [ ] Table shows all 6 sales reps
- [ ] Rep names display
- [ ] Email addresses show
- [ ] Territory names display
- [ ] This Week Revenue column shows
- [ ] **YTD Revenue column shows** (NEW)
- [ ] All-Time Revenue column shows
- [ ] Customer count shows per rep
- [ ] Activity count shows
- [ ] Quota attainment % shows
- [ ] **Rep names are clickable** (NEW - drill-down)
- [ ] Click rep - drill-down modal opens

### Territory Health (5 tests)
- [ ] Territory Health section displays
- [ ] Shows all territories (North, South, East, Virginia, NYC)
- [ ] Customer count per territory shows
- [ ] Healthy/At Risk/Dormant breakdown shows
- [ ] **Click territory - drill-down modal opens** (NEW)

### New Features (8 tests)
- [ ] **Performance Comparison section** (NEW)
- [ ] Comparison charts display
- [ ] Rep ranking shows (1st, 2nd, 3rd badges)
- [ ] **Revenue Forecast section** (NEW)
- [ ] Projected revenue displays
- [ ] Confidence level shows
- [ ] Forecast chart displays
- [ ] Toggle views work (Week/YTD/All-Time)

**Manager Score:** ___/33 tests passed

---

## 🎯 **SECTION 10: LEORA AI**

**URL:** `/sales/leora`
**Critical:** MEDIUM - AI assistant

### Main Interface (5 tests)
- [ ] Page loads
- [ ] "Ask LeorAI" input visible
- [ ] Auto-Insights dashboard displays
- [ ] Quick Questions section visible
- [ ] Chat interface functional

### Auto-Insights (8 tests)
- [ ] Total Revenue displays
- [ ] Total Orders displays
- [ ] Top Customer displays
- [ ] Healthy Customers count shows
- [ ] Top 5 Customers list displays
- [ ] Top 5 Products list displays
- [ ] Monthly Trend chart displays
- [ ] Sample Performance shows

### New Features (6 tests)
- [ ] **"Saved Queries" button visible** (NEW)
- [ ] **Query templates section** (NEW - should show 20+ templates)
- [ ] Click template - executes query
- [ ] **"Save Query" button appears after query** (NEW)
- [ ] **Query History shows** (NEW - last 10 queries)
- [ ] **Scheduled Reports section** (NEW)

**LeorAI Score:** ___/19 tests passed

---

## 🎯 **SECTION 11: ADMIN DASHBOARD**

**URL:** `/admin`
**Critical:** YES - Was broken, now fixed

### Page Load (5 tests)
- [ ] Page loads without application error (was broken)
- [ ] Page title "Admin Dashboard" displays
- [ ] No infinite redirects
- [ ] Loads in < 2 seconds
- [ ] No console errors

### Metrics Display (8 tests)
- [ ] Total Customers metric shows (should be 4,871)
- [ ] Total Orders metric shows (should be 30,300)
- [ ] **This Week Revenue shows correct amount** (was $0.00, now fixed)
- [ ] **Revenue is NOT $0.00** (CRITICAL - verify fix worked)
- [ ] Active Users metric shows (should be 3,349)
- [ ] Pending Orders shows
- [ ] All metrics have icons
- [ ] Color coding appropriate (blue, green, emerald, purple, orange)

### Data Integrity Alerts (5 tests)
- [ ] Data Integrity Alerts section displays
- [ ] Shows alert count (e.g., "3792 customers without email")
- [ ] Alert badge shows count
- [ ] Alerts are clickable
- [ ] Warning icon displays

### Quick Actions (9 tests)
- [ ] Quick Actions section displays
- [ ] 6 action cards visible
- [ ] "Manage Customers" card
- [ ] "Sales Territories" card
- [ ] "View Orders" card
- [ ] "User Accounts" card
- [ ] "Inventory" card
- [ ] "Audit Logs" card
- [ ] **"User Accounts" links to /admin/accounts** (was /admin/users, now fixed)

### Recent Activity (5 tests - NEW FIX)
- [ ] **Recent Activity section displays** (was empty placeholder)
- [ ] **Shows last 10 activities** (was "will be populated", now fixed)
- [ ] Activity entries show user, action, timestamp
- [ ] Action icons display (➕ ✏️ 🗑️)
- [ ] "View Full Audit Log" link works

### Sidebar Navigation (9 tests)
- [ ] Left sidebar visible
- [ ] 9 menu items visible:
  - [ ] Dashboard
  - [ ] Customers
  - [ ] Sales Reps & Territories
  - [ ] Orders & Invoices
  - [ ] Accounts & Users
  - [ ] Inventory & Products
  - [ ] Audit Logs
  - [ ] Bulk Operations
  - [ ] Data Integrity
- [ ] All menu items clickable

**Admin Dashboard Score:** ___/41 tests passed

---

## 🎯 **SECTION 12: NAVIGATION & BREADCRUMBS**

**Critical:** YES - Was inconsistent, now fixed

### Sales Section Navigation (8 tests)
- [ ] **Breadcrumbs display on all sales pages** (NEW - was inconsistent)
- [ ] Format: "Sales > Dashboard" or "Sales > Customers"
- [ ] Breadcrumbs on dashboard
- [ ] Breadcrumbs on customers list
- [ ] Breadcrumbs on customer detail (shows customer name)
- [ ] Breadcrumbs on CARLA
- [ ] Breadcrumbs clickable (go back)
- [ ] Mobile: Breadcrumbs collapse appropriately

### Admin Section Navigation (8 tests)
- [ ] **Breadcrumbs display on all admin pages** (NEW - was inconsistent)
- [ ] Format: "Admin > Section Name"
- [ ] Breadcrumbs on dashboard
- [ ] Breadcrumbs on customers page
- [ ] Breadcrumbs on other admin pages
- [ ] Breadcrumbs auto-generate from URL
- [ ] Custom breadcrumbs for dynamic routes
- [ ] Consistent separator (>)

### Cross-Section Navigation (4 tests)
- [ ] Can navigate sales → admin
- [ ] Can navigate admin → sales
- [ ] Logout works from both sections
- [ ] Back button behavior correct

**Navigation Score:** ___/20 tests passed

---

## 🎯 **SECTION 13: NEW FEATURES VERIFICATION**

### Operations (NEW Section - 8 tests)
- [ ] **`/sales/operations/picking` page loads** (NEW)
- [ ] Pick list generation works
- [ ] **`/sales/operations/routing` page loads** (NEW)
- [ ] Route creation interface displays
- [ ] **`/sales/operations/delivery-tracking` page loads** (NEW)
- [ ] Delivery status shows
- [ ] **`/sales/operations/locations` page loads** (NEW)
- [ ] Location management interface works

### Maps (NEW Section - 8 tests)
- [ ] **`/sales/map` page loads** (NEW)
- [ ] Map displays (Mapbox integration)
- [ ] Customer pins appear on map
- [ ] **Heat map layer works** (NEW)
- [ ] Color-coded by revenue
- [ ] **"Who's Closest" feature** (NEW)
- [ ] Distance calculations work
- [ ] **Route optimization** works (select customers, optimize)

### Marketing (NEW Section - 6 tests)
- [ ] **`/sales/marketing/lists` page loads** (NEW)
- [ ] Email list management displays
- [ ] Can create new list
- [ ] **Send Email feature works** (NEW)
- [ ] Email templates display
- [ ] SMS sending interface accessible

### Sales Funnel (NEW Section - 6 tests)
- [ ] **`/sales/leads` page loads** (NEW)
- [ ] Lead list displays
- [ ] Can create new lead
- [ ] **`/sales/funnel` page loads** (NEW - Kanban board)
- [ ] Pipeline visualization shows
- [ ] Drag-and-drop works

**New Features Score:** ___/28 tests passed

---

## 🎯 **SECTION 14: VISUAL CONSISTENCY**

**Critical:** MEDIUM - Professional appearance

### Design System (10 tests)
- [ ] Consistent color palette throughout
- [ ] Primary blue (#2563eb or similar)
- [ ] Success green (#10b981 or similar)
- [ ] Warning amber/yellow
- [ ] Danger red
- [ ] Consistent typography (font families)
- [ ] Heading hierarchy clear (h1, h2, h3)
- [ ] Consistent spacing (gaps, margins)
- [ ] Consistent button styles
- [ ] Consistent card shadows and borders

### Component Consistency (8 tests)
- [ ] All buttons same style across pages
- [ ] All metric cards same design
- [ ] All tables same styling
- [ ] All modals same design pattern
- [ ] All form inputs consistent
- [ ] All badges consistent
- [ ] Loading states consistent (spinners)
- [ ] Error states consistent

### Branding (5 tests)
- [ ] Logo displays (if applicable)
- [ ] Company name "Well Crafted Wine & Beverage" visible
- [ ] Consistent brand colors
- [ ] Professional appearance throughout
- [ ] No placeholder text visible ("Lorem ipsum", etc.)

**Visual Consistency Score:** ___/23 tests passed

---

## 🎯 **SECTION 15: RESPONSIVE DESIGN**

**Critical:** HIGH - Must work on all devices

### Desktop (1920x1080) - 8 tests
- [ ] All pages readable
- [ ] No horizontal scrolling
- [ ] Multi-column layouts used
- [ ] Tables fit screen
- [ ] Modals centered
- [ ] Navigation accessible
- [ ] Text readable (no tiny fonts)
- [ ] Images/charts display correctly

### Tablet (768px) - 8 tests)
- [ ] Responsive breakpoints work
- [ ] Columns stack appropriately
- [ ] Navigation collapses (hamburger menu if needed)
- [ ] Tables scroll horizontally if needed
- [ ] Touch targets adequate (44x44px)
- [ ] No text overflow
- [ ] Modals fit screen
- [ ] All features accessible

### Mobile (375px) - 8 tests
- [ ] Single column layout
- [ ] Text readable (min 16px)
- [ ] Touch targets large (50x50px)
- [ ] Navigation accessible
- [ ] Forms fill screen width
- [ ] No horizontal scroll
- [ ] Tables become cards/lists
- [ ] All critical features work

**Responsive Score:** ___/24 tests passed

---

## 🎯 **SECTION 16: ACCESSIBILITY**

**Critical:** MEDIUM - WCAG 2.1 compliance

### Keyboard Navigation (6 tests)
- [ ] Can tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Can navigate modals with keyboard
- [ ] Escape closes modals
- [ ] Enter activates buttons
- [ ] No keyboard traps

### Screen Reader (6 tests)
- [ ] All images have alt text
- [ ] Form labels associated with inputs
- [ ] ARIA labels on icon buttons
- [ ] Heading hierarchy logical (h1 → h2 → h3)
- [ ] Link text descriptive (not just "click here")
- [ ] Error messages announced

### Color Contrast (4 tests)
- [ ] Text readable (sufficient contrast)
- [ ] Status colors distinguishable
- [ ] Links visible
- [ ] Focus indicators visible

**Accessibility Score:** ___/16 tests passed

---

## 🎯 **SECTION 17: PERFORMANCE**

**Critical:** HIGH - User experience

### Page Load Times (10 tests)
- [ ] Dashboard: < 2 seconds
- [ ] Customers list: < 2 seconds
- [ ] **Customer detail: < 2 seconds** (was 10+s, CRITICAL FIX)
- [ ] CARLA: < 2 seconds
- [ ] Samples: < 2 seconds
- [ ] Orders: < 2 seconds
- [ ] Catalog: < 2 seconds
- [ ] Manager dashboard: < 2 seconds
- [ ] Admin dashboard: < 2 seconds
- [ ] Map view: < 3 seconds (acceptable for maps)

### Interaction Speed (5 tests)
- [ ] Button clicks respond immediately (< 100ms)
- [ ] Search filters update quickly (< 300ms)
- [ ] Tab switching instant (< 100ms)
- [ ] Modal opens quickly (< 200ms)
- [ ] Table sorting fast (< 500ms)

### Smooth Animations (3 tests)
- [ ] Modal transitions smooth
- [ ] Page transitions smooth
- [ ] No janky scrolling

**Performance Score:** ___/18 tests passed

---

## 🎯 **SECTION 18: ERROR HANDLING**

**Critical:** MEDIUM - Graceful failures

### Error States (8 tests)
- [ ] API error shows user-friendly message
- [ ] Network error handled gracefully
- [ ] Empty states display (e.g., "No customers due to order")
- [ ] 404 pages styled properly
- [ ] 500 errors caught and displayed
- [ ] Form validation errors clear
- [ ] Required fields marked
- [ ] Error messages in red/clear

### Loading States (4 tests)
- [ ] Skeleton loaders show while loading
- [ ] Loading spinners display for async actions
- [ ] "Loading..." text shows
- [ ] Loading doesn't block UI unnecessarily

**Error Handling Score:** ___/12 tests passed

---

## 📊 **FINAL SCORING**

### Calculate Total Score

```
Sales Dashboard:      ___/38  (____%)
Customers List:       ___/35  (____%)
Customer Detail:      ___/44  (____%)
CARLA:                ___/36  (____%)
Samples:              ___/26  (____%)
Orders:               ___/18  (____%)
Catalog:              ___/28  (____%)
Activities:           ___/16  (____%)
Manager:              ___/33  (____%)
LeorAI:               ___/19  (____%)
Admin:                ___/41  (____%)
Navigation:           ___/20  (____%)
New Features:         ___/28  (____%)
Visual Consistency:   ___/23  (____%)
Responsive:           ___/24  (____%)
Accessibility:        ___/16  (____%)
Performance:          ___/18  (____%)
Error Handling:       ___/12  (____%)

TOTAL:                ___/475 (____%)
```

### Grading Scale

- **95-100%** (451-475): ✅ EXCELLENT - Production ready
- **85-94%** (404-450): ✅ GOOD - Minor fixes needed
- **75-84%** (356-403): ⚠️ ACCEPTABLE - Some issues to address
- **< 75%** (< 356): ❌ NEEDS WORK - Major fixes required

---

## 🎯 **CRITICAL TESTS (MUST PASS)**

### Priority 0 - Blocking Issues

**These MUST pass or deployment is blocked:**

1. [ ] **Customer detail loads < 2 seconds** (was 10+s)
2. [ ] **Sales section builds and loads** (was broken)
3. [ ] **Admin revenue shows correctly** (was $0.00)
4. [ ] **Samples page loads** (was "Element type invalid")
5. [ ] **Orders page loads** (was application error)
6. [ ] **Catalog page loads** (was runtime error)
7. [ ] **CARLA account selection works** (was missing)
8. [ ] **Breadcrumbs consistent** (was inconsistent)
9. [ ] **Recent Activity populated** (was empty)
10. [ ] **All migrations applied** (database ready)

**P0 Score:** ___/10 critical tests

**If ANY P0 test fails, deployment must be delayed until fixed.**

---

## 📋 **AGENT TESTING WORKFLOW**

### 1. Preparation (5 min)
```bash
# Ensure server running
cd /Users/greghogue/Leora2/web
npm run dev

# Open browser
open http://localhost:3000/sales/login

# Login
Email: test@wellcrafted.com
Password: test123
```

### 2. Systematic Testing (2-3 hours)
- Go through each section above
- Mark each checkbox
- Take screenshots of any failures
- Note load times
- Document issues

### 3. Calculate Scores (10 min)
- Count passing tests per section
- Calculate percentages
- Determine overall grade
- Identify critical failures

### 4. Generate Report (30 min)
- Create summary document
- List all failures by priority
- Include screenshots
- Provide fix recommendations
- Calculate final score

---

## 📊 **REPORT TEMPLATE FOR AGENT**

```markdown
# Frontend Testing Report
Date: [Date]
Tester: Frontend Coding Agent
Server: http://localhost:3000
Duration: X hours

## Overall Score: X/475 (XX%)
Grade: [EXCELLENT/GOOD/ACCEPTABLE/NEEDS WORK]

## Summary
- Total Tests: 475
- Passed: X
- Failed: X
- Pass Rate: XX%

## Critical Tests (P0)
- Passed: X/10
- Status: [PASS/FAIL]

## Section Scores
[List each section with score]

## Failed Tests (Priority Order)

### P0 - Critical
[List P0 failures - these block deployment]

### P1 - High
[List P1 failures - should fix before launch]

### P2 - Medium
[List P2 failures - can fix post-launch]

### P3 - Low
[List P3 failures - nice to have]

## Screenshots
[Attach screenshots of failures]

## Recommendations
[List recommended fixes]

## Sign-Off
Status: [APPROVED FOR PRODUCTION / NEEDS FIXES]
```

---

## ✅ **SUCCESS CRITERIA**

**For Production Approval:**

**Minimum Requirements:**
- Overall score: ≥ 85% (404+ tests passing)
- P0 critical tests: 10/10 (100%)
- P1 tests: ≥ 90%
- No blocking bugs
- Performance targets met

**Ideal:**
- Overall score: ≥ 95% (451+ tests passing)
- P0: 10/10 (100%)
- P1: 95%+
- P2: 90%+
- Clean, polished UX

---

## 🎯 **SPECIAL FOCUS AREAS**

### Recently Fixed (Verify These Work)
1. ✅ Customer detail performance (10s → 2s)
2. ✅ CARLA account selection (0 → 70-75 accounts)
3. ✅ Sales build error (broken → working)
4. ✅ Admin revenue (S0 → correct amount)
5. ✅ Breadcrumbs (inconsistent → consistent)
6. ✅ Recent Activity (empty → populated)

### New Features (Verify These Exist)
1. ✅ YTD revenue columns/cards
2. ✅ Top products analytics
3. ✅ Customer balances
4. ✅ Product goals
5. ✅ Order deep dive
6. ✅ AI insights
7. ✅ Quick sample assignment
8. ✅ Drill-down modals (manager dashboard)

---

## 📝 **TESTING NOTES FOR AGENT**

**Best Practices:**
- Test in Chrome first (primary browser)
- Take screenshots of failures
- Note exact error messages
- Check browser console (F12) for errors
- Test with real data (Travis Vernon account)
- Verify numbers make sense (not all zeros)
- Test edge cases (empty lists, errors, etc.)

**Common Issues to Watch For:**
- Loading states that never complete
- Buttons that don't respond
- Broken links (404 errors)
- Console errors (red text in DevTools)
- Missing data (all zeros or blanks)
- Incorrect calculations
- Broken layouts on mobile

**Time Management:**
- Spend 30-45 min per major section
- P0 tests first (critical path)
- Document as you go
- Don't skip tests

---

## 🎊 **READY FOR TESTING**

**This checklist provides:**
- ✅ 475 systematic test cases
- ✅ Coverage of all 14 sections
- ✅ Critical fixes verification
- ✅ New features verification
- ✅ Performance benchmarks
- ✅ Accessibility checks
- ✅ Responsive design tests
- ✅ Clear success criteria
- ✅ Report template

**Estimated Testing Time:** 3-4 hours for complete execution

**Expected Result:** 95%+ passing (excellent)

---

**Agent: Begin testing and generate your report!** 🚀

---

*Frontend Testing Checklist Version: 1.0*
*Created: October 27, 2025*
*Total Tests: 475*
*Target: 95%+ pass rate*
*Critical Tests: 10 (must all pass)*
