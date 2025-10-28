# Leora CRM - Automated Test Suite for Claude Chrome Extension

## 📋 Test Environment Setup

### Prerequisites
- **URL**: http://localhost:3000
- **Database**: 4,838 customers loaded (Well-Crafted Wines dataset)
- **Development Server**: Running via `npm run dev`
- **Browser**: Chrome with Claude extension installed
- **Features Status**:
  - ✅ Phase 1: Customer Management (Complete)
  - ✅ Phase 2: CARLA Call Planning (Complete)
  - ✅ Phase 2-Finalization: Dashboard & Widgets (Complete)
  - 🚧 Phase 3: Sample Management & Analytics (In Development)

### Pre-Test Checklist
- [ ] Development server is running (`npm run dev` in terminal)
- [ ] Clear browser cache and cookies
- [ ] Navigate to http://localhost:3000
- [ ] Login credentials ready (if auth is enabled)
- [ ] Note starting timestamp: _______________

---

## 🧪 Test Suite 1: Customer Management (12 tests)

### Test 1.1: Navigate to Customer List Page
**Steps:**
1. Navigate to: http://localhost:3000/sales/customers
2. Wait for page to fully load

**Expected Results:**
- ✅ Page loads successfully within 2 seconds
- ✅ Page title displays "My Customers"
- ✅ Summary cards show: Total Customers, Total Revenue, Due to Order
- ✅ Search bar is visible and functional
- ✅ Filter buttons are visible (ALL, ACTIVE, TARGET, PROSPECT, DUE)
- ✅ Customer table renders with columns: Name, Account #, Location, Risk Status, Last Order, Next Expected, Recent Revenue

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.2: Verify Customer Count Display
**Steps:**
1. Check the "Total Customers" summary card
2. Verify the number matches expected count

**Expected Results:**
- ✅ Total Customers shows 4,838 (or current database count)
- ✅ Number is formatted correctly with commas

**Actual Results:**
- Count displayed: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.3: Filter by ACTIVE Customers
**Steps:**
1. Click the "ACTIVE" filter button
2. Wait for table to refresh

**Expected Results:**
- ✅ Filter button becomes highlighted/selected
- ✅ Table filters to show only ACTIVE customers (~728 customers expected)
- ✅ Filtering happens within 1 second
- ✅ Customer count updates to reflect filtered count

**Actual Results:**
- Filtered count: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.4: Filter by TARGET Customers
**Steps:**
1. Click the "TARGET" filter button
2. Wait for table to refresh

**Expected Results:**
- ✅ Filter button becomes highlighted/selected
- ✅ Table filters to show only TARGET customers (~122 customers expected)
- ✅ Previous filter (ACTIVE) is deselected
- ✅ Filtering happens instantly

**Actual Results:**
- Filtered count: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.5: Filter by PROSPECT Customers
**Steps:**
1. Click the "PROSPECT" filter button
2. Wait for table to refresh

**Expected Results:**
- ✅ Filter button becomes highlighted/selected
- ✅ Table filters to show only PROSPECT customers (~3,988 customers expected)
- ✅ Table pagination appears if results exceed 50 per page

**Actual Results:**
- Filtered count: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.6: Filter by DUE Customers
**Steps:**
1. Click the "DUE" filter button
2. Wait for table to refresh

**Expected Results:**
- ✅ Filter button becomes highlighted/selected
- ✅ Table filters to show only customers due to order (based on nextExpectedOrderDate)
- ✅ Customers shown have isDueToOrder = true

**Actual Results:**
- Filtered count: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.7: Search by Customer Name
**Steps:**
1. Clear any active filters (click "ALL")
2. Type "1789" in the search box
3. Wait for search results

**Expected Results:**
- ✅ Search happens instantly (debounced search)
- ✅ Restaurant "1789" appears in results
- ✅ Only customers matching "1789" are shown
- ✅ Table updates within 500ms

**Actual Results:**
- Search results count: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.8: Search by Keyword (Wine)
**Steps:**
1. Clear previous search
2. Type "Wine" in the search box
3. Wait for search results

**Expected Results:**
- ✅ Multiple wine shops appear (e.g., "Wine Shops", "Wine & Co")
- ✅ Search is case-insensitive
- ✅ Results include partial matches

**Actual Results:**
- Search results count: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.9: Sort by Customer Name (Ascending)
**Steps:**
1. Clear all filters and search
2. Click on the "Name" column header
3. Verify sort direction indicator

**Expected Results:**
- ✅ Table sorts by customer name A-Z
- ✅ Sort indicator shows ascending arrow
- ✅ First customer starts with "A" or "1"
- ✅ Sorting happens instantly

**Actual Results:**
- First customer name: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.10: Sort by Last Order Date (Descending)
**Steps:**
1. Click on the "Last Order" column header
2. Click again to sort descending (most recent first)

**Expected Results:**
- ✅ Table sorts by last order date (most recent first)
- ✅ Sort indicator shows descending arrow
- ✅ Customers with most recent orders appear first
- ✅ Dates are formatted correctly (e.g., "Jan 15, 2025")

**Actual Results:**
- First order date: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.11: Pagination Navigation
**Steps:**
1. Clear all filters
2. Scroll to bottom of page
3. Click "Next" button
4. Verify page 2 loads
5. Click "Previous" button

**Expected Results:**
- ✅ "Next" button navigates to page 2
- ✅ Page indicator updates (e.g., "Page 2 of 97")
- ✅ Different customers are shown on page 2
- ✅ "Previous" button returns to page 1
- ✅ Navigation is smooth and fast (<1s)

**Actual Results:**
- Total pages: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 1.12: View Customer Detail Page
**Steps:**
1. Click on the first customer in the table
2. Wait for customer detail page to load

**Expected Results:**
- ✅ Navigates to customer detail page URL: /sales/customers/[customerId]
- ✅ Customer header displays with name, account #, location
- ✅ Customer metrics cards display (Revenue, Orders, Products, etc.)
- ✅ Order history section loads
- ✅ Activity timeline section loads
- ✅ Page loads within 2 seconds

**Actual Results:**
- Customer ID visited: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## 📞 Test Suite 2: CARLA Call Planning (10 tests)

### Test 2.1: Navigate to CARLA Call Plan Page
**Steps:**
1. Navigate to: http://localhost:3000/sales/call-plan/carla
2. Wait for page to fully load

**Expected Results:**
- ✅ Page loads successfully
- ✅ Page title displays "CARLA Call Plan"
- ✅ "Create Weekly Call Plan" button is visible
- ✅ Instructions are displayed
- ✅ No errors in console

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.2: Open Call Plan Creation Modal
**Steps:**
1. Click "Create Weekly Call Plan" button
2. Wait for modal to appear

**Expected Results:**
- ✅ Modal opens smoothly
- ✅ Week selector is visible
- ✅ Customer selection interface appears
- ✅ X and Y goal inputs are visible
- ✅ "Generate Call Plan" button is visible

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.3: Select Current Week
**Steps:**
1. In the modal, click on the week selector
2. Select the current week

**Expected Results:**
- ✅ Week selector shows current week dates
- ✅ Selected week is highlighted
- ✅ Calendar interface is user-friendly

**Actual Results:**
- Week selected: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.4: View Available ACTIVE Customers
**Steps:**
1. Check the customer selection area
2. Note the count of available ACTIVE customers

**Expected Results:**
- ✅ ~728 ACTIVE customers are available for selection
- ✅ Customers are listed with names and key details
- ✅ Search/filter functionality works (if present)

**Actual Results:**
- ACTIVE customers shown: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.5: Select 10 ACTIVE Customers
**Steps:**
1. Select 10 different ACTIVE customers using checkboxes or selection UI
2. Verify selection count updates

**Expected Results:**
- ✅ Customers can be selected individually
- ✅ Selection count displays "10 customers selected"
- ✅ Selected customers are visually highlighted
- ✅ Can deselect and reselect customers

**Actual Results:**
- Customers selected: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.6: Set X and Y Goals
**Steps:**
1. In the "X Goal" input, enter: 5
2. In the "Y Goal" input, enter: 3
3. Verify inputs accept numbers only

**Expected Results:**
- ✅ X Goal accepts number 5
- ✅ Y Goal accepts number 3
- ✅ Input validation works (no negative numbers, no letters)
- ✅ Goals are displayed clearly

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.7: Generate Call Plan
**Steps:**
1. Click "Generate Call Plan" button
2. Wait for processing (may show loading state)
3. Wait for success confirmation

**Expected Results:**
- ✅ Loading indicator appears during generation
- ✅ Success message displays when complete
- ✅ Call plan is created and visible on page
- ✅ Modal closes after successful generation
- ✅ Process completes within 5 seconds

**Actual Results:**
- Time to generate: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.8: Verify Call Plan Grid Display
**Steps:**
1. After generating call plan, scroll to view the weekly grid
2. Check for all 5 weekdays (Mon-Fri)

**Expected Results:**
- ✅ Weekly grid displays with 5 columns (Monday - Friday)
- ✅ Each customer appears in the grid
- ✅ X and Y products are assigned to customers
- ✅ Grid is visually organized and easy to read
- ✅ Customer names are clickable

**Actual Results:**
- Customers in grid: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.9: View Call Plan Stats
**Steps:**
1. Check for call plan statistics section
2. Verify metrics are displayed

**Expected Results:**
- ✅ Total calls stat is shown (10 expected)
- ✅ X product assignments shown (5 expected)
- ✅ Y product assignments shown (3 expected)
- ✅ Week date range is displayed
- ✅ Stats are accurate

**Actual Results:**
- Total calls: _______________
- X assignments: _______________
- Y assignments: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 2.10: Add Activity from Call Plan
**Steps:**
1. Click on a customer in the call plan grid
2. Click "Add Activity" button (if present)
3. Fill in activity details (type, notes, etc.)
4. Save the activity

**Expected Results:**
- ✅ Activity modal opens
- ✅ Customer is pre-filled in activity
- ✅ Activity type can be selected (Call, Email, Visit, etc.)
- ✅ Notes field accepts text input
- ✅ Activity saves successfully
- ✅ Confirmation message appears

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## 📊 Test Suite 3: Dashboard & Widgets (8 tests)

### Test 3.1: Navigate to Sales Dashboard
**Steps:**
1. Navigate to: http://localhost:3000/sales
2. Wait for dashboard to load

**Expected Results:**
- ✅ Dashboard loads within 2 seconds
- ✅ Page title displays "Sales Dashboard"
- ✅ Multiple widgets are visible
- ✅ No errors in console

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 3.2: View Upcoming Tasks Widget
**Steps:**
1. Locate the "Upcoming Tasks" widget on dashboard
2. Check for task list display

**Expected Results:**
- ✅ Widget displays with title "Upcoming Tasks"
- ✅ Tasks are listed (if any exist)
- ✅ Each task shows: Title, Due Date, Priority
- ✅ Can click on task to view details
- ✅ Widget is responsive

**Actual Results:**
- Tasks shown: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 3.3: View Upcoming Events/Calendar Widget
**Steps:**
1. Locate the "Upcoming Events" or "Calendar" widget
2. Check for events display

**Expected Results:**
- ✅ Widget displays with calendar view or event list
- ✅ Events are shown (if any exist)
- ✅ Current week or month is highlighted
- ✅ Can navigate between weeks/months
- ✅ Events are clickable

**Actual Results:**
- Events shown: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 3.4: View Product Goals Widget
**Steps:**
1. Locate the "Product Goals" widget
2. Check for goal progress display

**Expected Results:**
- ✅ Widget displays product goals (X and Y products)
- ✅ Progress bars or charts show goal completion
- ✅ Current vs Target numbers are visible
- ✅ Visual indicators (colors, percentages) work correctly

**Actual Results:**
- X Goal progress: _______________
- Y Goal progress: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 3.5: View Weekly Revenue Chart
**Steps:**
1. Locate the "Weekly Revenue" chart widget
2. Check for chart rendering

**Expected Results:**
- ✅ Chart renders correctly (bar chart, line chart, etc.)
- ✅ Shows revenue data for current week or recent weeks
- ✅ Axes are labeled correctly
- ✅ Tooltips appear on hover
- ✅ Chart is interactive

**Actual Results:**
- Chart type: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 3.6: View Incentives Widget
**Steps:**
1. Locate the "Incentives" widget
2. Check for incentive information

**Expected Results:**
- ✅ Widget displays current incentives or rewards
- ✅ Information is clear and readable
- ✅ Links or actions work (if present)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 3.7: Rearrange Dashboard Widgets (Drag & Drop)
**Steps:**
1. Try to drag a widget to a new position
2. Drop widget in new location
3. Verify layout updates

**Expected Results:**
- ✅ Widgets can be dragged and dropped
- ✅ Layout updates smoothly
- ✅ Widgets snap into grid positions
- ✅ Layout persists after page refresh (if saved)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: If drag & drop not implemented, mark as "Feature Not Available"

---

### Test 3.8: Resize Dashboard Widgets
**Steps:**
1. Try to resize a widget using resize handles
2. Verify widget resizes correctly

**Expected Results:**
- ✅ Widgets have resize handles
- ✅ Widgets resize smoothly
- ✅ Content adjusts to new size
- ✅ Resize limits are respected (min/max sizes)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: If resize not implemented, mark as "Feature Not Available"

---

## ⚙️ Test Suite 4: Job Queue Monitoring (6 tests)

### Test 4.1: Navigate to Admin Job Queue Page
**Steps:**
1. Navigate to: http://localhost:3000/sales/admin (or wherever job queue is located)
2. Find job queue monitoring section

**Expected Results:**
- ✅ Page loads successfully
- ✅ Job queue section is visible
- ✅ List of jobs is displayed (or empty state if no jobs)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 4.2: View Active Jobs
**Steps:**
1. Check the job queue for active/running jobs
2. Note any jobs currently processing

**Expected Results:**
- ✅ Active jobs are clearly marked (e.g., "Running", "In Progress")
- ✅ Job name/type is displayed
- ✅ Start time is shown
- ✅ Progress indicator is visible (if applicable)

**Actual Results:**
- Active jobs: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 4.3: View Completed Jobs
**Steps:**
1. Check the job queue for completed jobs
2. Verify completion status

**Expected Results:**
- ✅ Completed jobs show "Success" or "Complete" status
- ✅ Completion time is displayed
- ✅ Duration is shown (if applicable)
- ✅ Results or logs are accessible

**Actual Results:**
- Completed jobs: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 4.4: View Failed Jobs
**Steps:**
1. Check for any failed jobs in the queue
2. Click on a failed job to view error details

**Expected Results:**
- ✅ Failed jobs are clearly marked (e.g., red status, "Failed")
- ✅ Error message is displayed
- ✅ Can view full error stack trace or logs
- ✅ Retry option is available (if applicable)

**Actual Results:**
- Failed jobs: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 4.5: Trigger Manual Job (if available)
**Steps:**
1. Look for "Run Job" or "Start Job" button
2. Select a job type (e.g., "Update Account Types")
3. Click to start job
4. Monitor job progress

**Expected Results:**
- ✅ Job starts successfully
- ✅ Job appears in queue with "Running" status
- ✅ Progress updates in real-time
- ✅ Job completes successfully
- ✅ Success message appears

**Actual Results:**
- Job triggered: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: If manual job trigger not available, mark as "Feature Not Available"

---

### Test 4.6: View Job Logs
**Steps:**
1. Click on a completed or failed job
2. View detailed logs

**Expected Results:**
- ✅ Logs are displayed in readable format
- ✅ Timestamps are shown for each log entry
- ✅ Log levels (INFO, WARN, ERROR) are indicated
- ✅ Can scroll through long logs

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## 🧪 Test Suite 5: Samples & Analytics - Phase 3 (14 tests)

**NOTE:** These tests are for Phase 3 features currently in development. Run these tests after Phase 3 is complete.

### Test 5.1: Navigate to Samples Page
**Steps:**
1. Navigate to: http://localhost:3000/sales/samples
2. Wait for page to load

**Expected Results:**
- ✅ Page loads successfully
- ✅ Page title displays "Sample Management"
- ✅ Sample budget tracker is visible
- ✅ "Log Sample Usage" button is visible
- ✅ Sample usage log/history is visible

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.2: View Sample Budget Tracker
**Steps:**
1. Locate the sample budget tracker widget
2. Check budget information

**Expected Results:**
- ✅ Budget allocated amount is displayed
- ✅ Budget used amount is displayed
- ✅ Budget remaining is calculated correctly
- ✅ Progress bar or chart shows usage percentage
- ✅ Visual indicators warn when budget is low (<20% remaining)

**Actual Results:**
- Budget allocated: _______________
- Budget used: _______________
- Budget remaining: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.3: Quick Assign Sample to Customer
**Steps:**
1. Click "Log Sample Usage" or "Quick Assign Sample" button
2. Select a customer from dropdown/search
3. Select a SKU/product
4. Enter quantity (e.g., 1)
5. Select feedback option (e.g., "Loved it")
6. Enter customer response notes
7. Click "Assign Sample"

**Expected Results:**
- ✅ Modal opens with form
- ✅ Customer search/dropdown works
- ✅ SKU/product selection works
- ✅ Quantity accepts positive numbers only
- ✅ Feedback options are selectable
- ✅ Customer response field accepts text
- ✅ Sample is assigned successfully
- ✅ Success message appears
- ✅ Sample inventory decrements
- ✅ Activity is logged automatically
- ✅ Process completes within 2 seconds

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.4: Verify Inventory Deduction
**Steps:**
1. Note current sample inventory for a SKU
2. Assign 1 sample of that SKU to a customer
3. Check inventory again after assignment

**Expected Results:**
- ✅ Inventory count decreases by assigned quantity
- ✅ Inventory update happens immediately
- ✅ No negative inventory allowed

**Actual Results:**
- Before: _______________
- After: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.5: View Sample Usage Log
**Steps:**
1. On the samples page, scroll to usage log section
2. Verify recent sample assignments are listed

**Expected Results:**
- ✅ Recent sample assignments are shown
- ✅ Each entry shows: Date, Customer, SKU, Quantity, Feedback, Rep
- ✅ Log is sorted by date (most recent first)
- ✅ Can filter or search log (if applicable)

**Actual Results:**
- Entries shown: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.6: Navigate to Sample Analytics Dashboard
**Steps:**
1. Navigate to: http://localhost:3000/sales/samples/analytics (or find analytics tab)
2. Wait for analytics to load

**Expected Results:**
- ✅ Page loads successfully
- ✅ Analytics dashboard displays
- ✅ Multiple charts and metrics are visible
- ✅ Date range selector is available

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.7: View Sample Conversion Metrics
**Steps:**
1. On analytics dashboard, find "Conversion Rate" metric
2. Check conversion percentage

**Expected Results:**
- ✅ Conversion rate is displayed (e.g., "45% converted to orders")
- ✅ Calculation is correct: (Customers who ordered after sample / Total samples given)
- ✅ Visual indicator (chart, gauge, or percentage)
- ✅ Breakdown by product or category (if available)

**Actual Results:**
- Conversion rate: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.8: View Revenue Attribution
**Steps:**
1. Find "Revenue Attributed to Samples" metric
2. Verify revenue calculations

**Expected Results:**
- ✅ Revenue amount is displayed (e.g., "$125,000 attributed")
- ✅ Calculation includes first orders after samples
- ✅ Attribution window is clear (e.g., "within 90 days")
- ✅ ROI is calculated (Revenue vs Cost of samples)

**Actual Results:**
- Revenue attributed: _______________
- ROI: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.9: Filter Analytics by Date Range
**Steps:**
1. Click on date range selector
2. Select "Last 30 Days"
3. Wait for analytics to refresh
4. Change to "Last 90 Days"
5. Verify data updates

**Expected Results:**
- ✅ Date range selector works smoothly
- ✅ Analytics update when range changes
- ✅ Charts and metrics reflect new date range
- ✅ Update happens within 1 second

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.10: View Rep Leaderboard (Samples)
**Steps:**
1. Find "Rep Leaderboard" or "Top Performers" section
2. Check rep rankings based on sample performance

**Expected Results:**
- ✅ Reps are ranked by conversion rate or revenue
- ✅ Each rep shows: Name, Samples Given, Conversions, Revenue
- ✅ Leaderboard is sortable (if multiple columns)
- ✅ Visual indicators (badges, colors) for top performers

**Actual Results:**
- Top rep: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.11: Generate Supplier Report
**Steps:**
1. Find "Supplier Report" or "Sample Supplier Analysis" section
2. Click to generate or view report

**Expected Results:**
- ✅ Report displays suppliers who provided samples
- ✅ Each supplier shows: Name, Samples Provided, Conversion Rate, Revenue
- ✅ Can filter or sort by supplier
- ✅ Export option available (CSV, PDF - if implemented)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.12: Test Sample No-Order Trigger
**Steps:**
1. Assign a sample to a customer
2. Wait for trigger conditions (e.g., 30 days with no order after sample)
3. Check if task is created automatically

**Expected Results:**
- ✅ Trigger fires at correct time interval
- ✅ Task is created for rep: "Follow up - customer received sample but hasn't ordered"
- ✅ Task is assigned to correct rep
- ✅ Task shows customer name and sample details

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: This test may require waiting or simulating time

---

### Test 5.13: Request AI Product Recommendations
**Steps:**
1. Navigate to a customer detail page
2. Find "Product Recommendations" section
3. Click "Get AI Recommendations" button
4. Wait for recommendations to load

**Expected Results:**
- ✅ AI recommendation request is sent
- ✅ Loading indicator appears
- ✅ Recommendations return within 10 seconds
- ✅ Recommendations show: Product IDs, Confidence Scores, Reasoning
- ✅ Structured product IDs are returned (not generic descriptions)
- ✅ Recommendations are relevant to customer's purchase history

**Actual Results:**
- Recommendations received: _______________
- Confidence scores: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5.14: Test AI Recommendation Error Handling
**Steps:**
1. On customer detail page, request AI recommendations
2. If API fails or times out, verify error handling

**Expected Results:**
- ✅ Error message is displayed if API fails
- ✅ User-friendly error message (not technical stack trace)
- ✅ Retry option is available
- ✅ Page doesn't crash or freeze

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: May need to simulate API failure

---

## 📱 Test Suite 6: Mobile Responsiveness (8 tests)

**NOTE:** Resize browser to mobile viewport (375px x 667px) or use Chrome DevTools device emulation.

### Test 6.1: Mobile Navigation Menu
**Steps:**
1. Resize browser to mobile width (375px)
2. Check for mobile menu (hamburger icon)
3. Click menu icon to open navigation

**Expected Results:**
- ✅ Hamburger menu icon appears on mobile
- ✅ Menu opens smoothly
- ✅ All navigation links are accessible
- ✅ Menu can be closed easily

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 6.2: Mobile Customer List View
**Steps:**
1. Navigate to /sales/customers on mobile viewport
2. Check table responsiveness

**Expected Results:**
- ✅ Table adapts to mobile (card view or horizontal scroll)
- ✅ Essential columns are visible
- ✅ Can scroll horizontally if needed
- ✅ Customer names are clickable
- ✅ Filters work on mobile

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 6.3: Mobile Dashboard Widgets
**Steps:**
1. Navigate to /sales dashboard on mobile
2. Check widget layout

**Expected Results:**
- ✅ Widgets stack vertically on mobile
- ✅ Each widget is fully visible (no cutoff)
- ✅ Charts resize to fit mobile screen
- ✅ Touch interactions work (tap, scroll)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 6.4: Mobile Customer Detail Page
**Steps:**
1. Open a customer detail page on mobile
2. Scroll through all sections

**Expected Results:**
- ✅ All sections stack vertically
- ✅ Metrics cards are readable
- ✅ Order history table adapts to mobile
- ✅ Activity timeline is accessible
- ✅ Charts resize appropriately

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 6.5: Mobile Forms (Sample Assignment)
**Steps:**
1. Open sample assignment modal on mobile
2. Fill out form

**Expected Results:**
- ✅ Form fits mobile screen
- ✅ Input fields are tappable and usable
- ✅ Dropdowns work on mobile
- ✅ Keyboard doesn't obscure form
- ✅ Submit button is accessible

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 6.6: Mobile Search Functionality
**Steps:**
1. On mobile, test customer search
2. Type in search box on mobile keyboard

**Expected Results:**
- ✅ Search box is accessible
- ✅ Mobile keyboard appears
- ✅ Search results appear below keyboard
- ✅ Can clear search easily

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 6.7: Mobile Touch Gestures
**Steps:**
1. Test touch interactions on mobile
2. Try: tap, swipe, pinch-zoom (if applicable)

**Expected Results:**
- ✅ Tap targets are large enough (min 44x44px)
- ✅ Swipe gestures work (if implemented)
- ✅ No accidental taps due to small touch targets
- ✅ Gestures feel natural

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 6.8: Mobile Performance
**Steps:**
1. Navigate through app on mobile viewport
2. Note any lag or performance issues

**Expected Results:**
- ✅ Pages load quickly on mobile (<3s)
- ✅ Scrolling is smooth (60fps)
- ✅ No jank or stuttering
- ✅ Animations are smooth

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## ⚡ Test Suite 7: Performance Tests (6 tests)

### Test 7.1: Initial Page Load Time
**Steps:**
1. Clear browser cache
2. Open Chrome DevTools Network tab
3. Navigate to http://localhost:3000/sales/customers
4. Note the load time

**Expected Results:**
- ✅ Page loads within 2 seconds
- ✅ DOMContentLoaded < 1s
- ✅ Page is interactive quickly (TTI < 2s)

**Actual Results:**
- Load time: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 7.2: API Response Times
**Steps:**
1. Open Chrome DevTools Network tab
2. Navigate to customers page
3. Check API call response times

**Expected Results:**
- ✅ /api/sales/customers responds within 500ms
- ✅ No API calls timeout
- ✅ API calls are efficient (no redundant calls)

**Actual Results:**
- API response time: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 7.3: Database Query Performance
**Steps:**
1. In Network tab, filter for API calls
2. Check for slow database queries (if logged)

**Expected Results:**
- ✅ Database queries complete within 100ms
- ✅ No N+1 query issues
- ✅ Proper indexing on frequently queried fields

**Actual Results:**
- Slowest query: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 7.4: Chart Rendering Performance
**Steps:**
1. Navigate to a page with charts (dashboard or analytics)
2. Note chart render time

**Expected Results:**
- ✅ Charts render within 1 second
- ✅ No lag when interacting with charts
- ✅ Tooltips appear instantly on hover

**Actual Results:**
- Chart render time: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 7.5: Sample Assignment Performance
**Steps:**
1. Assign a sample to a customer
2. Note total time from click to success

**Expected Results:**
- ✅ Sample assignment completes within 1 second
- ✅ No noticeable delay
- ✅ UI remains responsive

**Actual Results:**
- Assignment time: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 7.6: Large Dataset Performance (Pagination)
**Steps:**
1. Navigate to customers page (4,838 customers)
2. Scroll to pagination
3. Navigate through multiple pages quickly

**Expected Results:**
- ✅ Pagination is instant (<200ms per page)
- ✅ No lag when changing pages
- ✅ Table renders quickly even with 50 rows

**Actual Results:**
- Pagination speed: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## 🔒 Test Suite 8: Security Tests (6 tests)

### Test 8.1: Authentication Requirement
**Steps:**
1. Open an incognito/private browser window
2. Navigate to http://localhost:3000/sales/customers
3. Verify redirect to login (if auth is enabled)

**Expected Results:**
- ✅ Unauthenticated users are redirected to login
- ✅ Protected routes are not accessible without login
- ✅ Login page loads correctly

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: If auth not yet implemented, mark as "Feature Not Available"

---

### Test 8.2: Session Management
**Steps:**
1. Login to the application
2. Clear cookies
3. Try to access a protected route

**Expected Results:**
- ✅ Session expires when cookies are cleared
- ✅ User is redirected to login
- ✅ No unauthorized access

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 8.3: API Authentication
**Steps:**
1. Open Chrome DevTools Network tab
2. Make an API call to /api/sales/customers
3. Check for authentication headers

**Expected Results:**
- ✅ API requires authentication token/cookie
- ✅ Unauthorized requests return 401 Unauthorized
- ✅ Proper CORS headers are set

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 8.4: XSS Protection
**Steps:**
1. In search box, enter: `<script>alert('XSS')</script>`
2. Submit search
3. Verify script is not executed

**Expected Results:**
- ✅ Script tag is escaped/sanitized
- ✅ No JavaScript alert appears
- ✅ Search displays escaped text instead of executing code

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 8.5: SQL Injection Protection
**Steps:**
1. In search box, enter: `'; DROP TABLE customers; --`
2. Submit search
3. Verify no database errors

**Expected Results:**
- ✅ SQL injection attempt is escaped/sanitized
- ✅ No database errors occur
- ✅ Search returns no results or safe results

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 8.6: HTTPS/SSL (Production Only)
**Steps:**
1. If testing on production URL, verify HTTPS
2. Check SSL certificate validity

**Expected Results:**
- ✅ Site uses HTTPS protocol
- ✅ SSL certificate is valid
- ✅ No mixed content warnings
- ✅ Secure cookie flags are set

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: Only applicable in production environment

---

## 📝 Test Execution Summary

### Test Results Overview
- **Total Tests**: 76
- **Passed**: _______________
- **Failed**: _______________
- **Skipped/Not Available**: _______________
- **Total Duration**: _______________

### Failed Tests Detail
(List each failed test with issue description)

1. Test ID: _______________
   Issue: _______________
   Priority: High / Medium / Low

2. Test ID: _______________
   Issue: _______________
   Priority: High / Medium / Low

(Continue for all failures...)

---

### Performance Issues Identified
(Note any slow operations or bottlenecks)

1. _______________
2. _______________
3. _______________

---

### Recommendations
(Suggestions for improvements or fixes)

1. _______________
2. _______________
3. _______________

---

### Browser Tested
- [ ] Chrome (Version: _______________)
- [ ] Safari
- [ ] Firefox
- [ ] Edge

### Device Tested
- [ ] Desktop (Screen size: _______________)
- [ ] Tablet (Screen size: _______________)
- [ ] Mobile (Screen size: _______________)

### Test Environment
- **Date**: _______________
- **Tester**: _______________
- **Build/Commit**: _______________
- **Database Records**: _______________

---

## 🚀 Next Steps

Based on test results:
1. Fix critical failures (blocking issues)
2. Address performance bottlenecks
3. Implement missing features (if any)
4. Re-run failed tests after fixes
5. Prepare for Phase 3 completion testing

---

**Test completed by**: _______________
**Date**: _______________
**Signature**: _______________
