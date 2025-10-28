# Phase 3: Sample Management & Analytics - Detailed Tests

## 🎯 Overview

This document contains detailed test cases specifically for Phase 3 features:
- Sample Assignment & Logging
- Sample Inventory Management
- Sample Analytics Dashboard
- AI Product Recommendations
- Sample-Triggered Automation
- Supplier Reporting

**Run these tests ONLY after Phase 3 is complete.**

---

## 📦 Test Suite 5A: Sample Assignment & Logging (8 tests)

### Test 5A.1: Navigate to Sample Management Page
**Prerequisites**: Logged in as sales rep

**Steps:**
1. Navigate to: http://localhost:3000/sales/samples
2. Wait for page to fully load

**Expected Results:**
- ✅ Page loads within 2 seconds
- ✅ Page title displays "Sample Management"
- ✅ Sample budget tracker widget is visible
- ✅ "Log Sample Usage" or "Quick Assign Sample" button is visible
- ✅ Sample usage log/history table is visible
- ✅ No console errors

**Actual Results:**
- Load time: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5A.2: View Sample Inventory
**Steps:**
1. Find "Sample Inventory" section or tab
2. Check available SKUs for sampling

**Expected Results:**
- ✅ List of sample SKUs is displayed
- ✅ Each SKU shows: Name, SKU #, Category, Quantity Available
- ✅ Inventory counts are accurate
- ✅ Can search/filter SKUs
- ✅ SKUs with zero inventory are indicated

**Actual Results:**
- Total SKUs available: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5A.3: Quick Assign Sample - Open Modal
**Steps:**
1. Click "Log Sample Usage" or "Quick Assign Sample" button
2. Wait for modal to open

**Expected Results:**
- ✅ Modal opens smoothly within 500ms
- ✅ Modal title is clear (e.g., "Assign Sample to Customer")
- ✅ Form fields are visible:
  - Customer selection (dropdown or search)
  - SKU selection (dropdown or search)
  - Quantity input
  - Feedback options (checkboxes or dropdown)
  - Customer response notes (text area)
- ✅ "Assign Sample" submit button is visible
- ✅ "Cancel" button is visible

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5A.4: Quick Assign Sample - Select Customer
**Steps:**
1. In the modal, click on customer selection field
2. Type "Test Customer" or search for a specific customer
3. Select customer from dropdown

**Expected Results:**
- ✅ Customer search works (type-ahead or autocomplete)
- ✅ Customers are filtered as you type
- ✅ Can select a customer from results
- ✅ Selected customer is displayed in field
- ✅ Can clear selection and choose different customer

**Actual Results:**
- Customer selected: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5A.5: Quick Assign Sample - Select SKU
**Steps:**
1. Click on SKU selection field
2. Search or browse for a sample SKU
3. Select SKU (e.g., "Chardonnay 2023 - Sample")

**Expected Results:**
- ✅ SKU search/dropdown works
- ✅ Only sample SKUs are shown (isSample = true)
- ✅ SKU shows name and available quantity
- ✅ Cannot select SKU with zero inventory
- ✅ Selected SKU is displayed in field

**Actual Results:**
- SKU selected: _______________
- Available qty: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5A.6: Quick Assign Sample - Fill Form and Submit
**Steps:**
1. Set quantity to: 1
2. Select feedback option: "Loved it"
3. Enter customer response: "Customer wants to order a case"
4. Click "Assign Sample" button
5. Wait for confirmation

**Expected Results:**
- ✅ Quantity validates (no negative, no exceeding inventory)
- ✅ Feedback options are selectable (radio or checkboxes)
- ✅ Customer response text area accepts input
- ✅ Submit button is enabled when form is valid
- ✅ Loading indicator appears during submission
- ✅ Success message displays after assignment
- ✅ Modal closes automatically after success
- ✅ Sample usage log updates with new entry
- ✅ Total time from submit to success: <2 seconds

**Actual Results:**
- Submission time: _______________
- Success message: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5A.7: Verify Inventory Deduction After Assignment
**Steps:**
1. Before assigning sample, note current inventory for SKU
2. Assign 1 sample of that SKU to customer
3. Check SKU inventory again after assignment

**Expected Results:**
- ✅ Inventory count decreases by assigned quantity (1)
- ✅ Example: If inventory was 50, now it's 49
- ✅ Inventory update happens immediately (no delay)
- ✅ Cannot assign sample if inventory is 0

**Actual Results:**
- Inventory before: _______________
- Inventory after: _______________
- Difference: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5A.8: Verify Activity Creation After Sample Assignment
**Steps:**
1. Assign a sample to a customer
2. Navigate to customer detail page: /sales/customers/[customerId]
3. Scroll to "Activity Timeline" section
4. Check for new activity

**Expected Results:**
- ✅ New activity is created automatically
- ✅ Activity type is "SAMPLE" or similar
- ✅ Activity notes include: SKU name, quantity, feedback
- ✅ Activity date matches sample assignment date
- ✅ Activity appears in customer timeline immediately

**Actual Results:**
- Activity created: Yes / No
- Activity details: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## 📊 Test Suite 5B: Sample Analytics Dashboard (10 tests)

### Test 5B.1: Navigate to Sample Analytics
**Steps:**
1. Navigate to: http://localhost:3000/sales/samples/analytics
   OR click "Analytics" tab on samples page
2. Wait for page to load

**Expected Results:**
- ✅ Page loads within 2 seconds
- ✅ Page title displays "Sample Analytics" or similar
- ✅ Multiple metrics/charts are visible:
  - Conversion Rate metric
  - Revenue Attribution metric
  - Sample ROI metric
  - Conversion funnel chart
  - Rep leaderboard
  - Supplier report
- ✅ Date range selector is visible
- ✅ No console errors

**Actual Results:**
- Load time: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.2: View Sample Conversion Rate Metric
**Steps:**
1. Locate "Conversion Rate" or "Samples to Orders" metric
2. Check displayed percentage

**Expected Results:**
- ✅ Conversion rate is displayed (e.g., "45%")
- ✅ Calculation is correct:
  - (Customers who ordered after sample / Total customers who received samples) × 100
- ✅ Visual indicator (chart, gauge, or percentage bar)
- ✅ Tooltip or info icon explains calculation
- ✅ Comparison to previous period (optional: "↑5% vs last month")

**Actual Results:**
- Conversion rate: _______________
- Total samples given: _______________
- Customers who ordered: _______________
- Calculation: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.3: View Revenue Attribution Metric
**Steps:**
1. Locate "Revenue Attributed to Samples" metric
2. Check revenue amount

**Expected Results:**
- ✅ Revenue amount is displayed (e.g., "$125,000")
- ✅ Calculation includes first orders after samples within attribution window
- ✅ Attribution window is documented (e.g., "within 90 days of sample")
- ✅ Breakdown by product category (optional)
- ✅ Comparison to total revenue (optional: "12% of total revenue")

**Actual Results:**
- Revenue attributed: _______________
- Attribution window: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.4: Calculate Sample ROI
**Steps:**
1. Find "Sample ROI" or "Return on Investment" metric
2. Verify ROI calculation

**Expected Results:**
- ✅ ROI is displayed (e.g., "450%" or "4.5x")
- ✅ Calculation is correct:
  - ROI = (Revenue Attributed - Cost of Samples) / Cost of Samples
- ✅ Cost of samples is calculated (based on SKU costs)
- ✅ Visual indicator (green for positive, red for negative)
- ✅ Breakdown shows: Revenue, Cost, Net Profit

**Actual Results:**
- ROI: _______________
- Revenue: _______________
- Cost of samples: _______________
- Net profit: _______________
- Calculation: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.5: View Conversion Funnel Chart
**Steps:**
1. Locate conversion funnel chart
2. Check funnel stages

**Expected Results:**
- ✅ Funnel chart is displayed (visual funnel shape)
- ✅ Stages shown:
  1. Samples Given (e.g., 100 samples)
  2. Samples with Feedback (e.g., 85 with feedback)
  3. Positive Feedback (e.g., 60 "Loved it" or "Liked it")
  4. Orders Placed (e.g., 45 customers ordered)
- ✅ Each stage shows count and percentage
- ✅ Drop-off between stages is clear
- ✅ Chart is interactive (hover for details)

**Actual Results:**
- Samples given: _______________
- Orders placed: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.6: Filter Analytics by Date Range
**Steps:**
1. Click on date range selector
2. Select "Last 30 Days"
3. Wait for analytics to refresh
4. Change to "Last 90 Days"
5. Verify data updates

**Expected Results:**
- ✅ Date range selector works (dropdown or calendar)
- ✅ Preset ranges available: Last 7 Days, Last 30 Days, Last 90 Days, Custom
- ✅ All metrics and charts update when range changes
- ✅ Update happens within 1 second (data is pre-calculated or query is fast)
- ✅ Selected date range is highlighted
- ✅ Can select custom date range (start and end dates)

**Actual Results:**
- Date range changed: _______________
- Update time: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.7: View Rep Leaderboard
**Steps:**
1. Scroll to "Rep Leaderboard" or "Top Performers" section
2. Check rep rankings

**Expected Results:**
- ✅ Reps are listed in ranked order (1st, 2nd, 3rd, etc.)
- ✅ Ranking is based on conversion rate or revenue attributed
- ✅ Each rep shows:
  - Name
  - Samples Given
  - Conversions (# of customers who ordered)
  - Conversion Rate (%)
  - Revenue Attributed
- ✅ Top 3 reps highlighted (gold, silver, bronze badges - optional)
- ✅ Can sort by different columns (samples, conversions, revenue)
- ✅ Current user's rank is highlighted (if applicable)

**Actual Results:**
- Top rep: _______________
- Conversion rate: _______________
- Revenue: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.8: View Sample Performance by Product Category
**Steps:**
1. Find "Sample Performance by Category" chart or table
2. Check category breakdown

**Expected Results:**
- ✅ Categories are listed (Red Wine, White Wine, Sparkling, etc.)
- ✅ Each category shows:
  - Samples Given
  - Conversion Rate
  - Revenue Attributed
- ✅ Visual chart (bar chart or pie chart)
- ✅ Can identify top-performing categories
- ✅ Data is accurate and adds up to totals

**Actual Results:**
- Top category: _______________
- Conversion rate: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.9: Generate Supplier Report
**Steps:**
1. Find "Supplier Report" or "Sample Supplier Analysis" section
2. Click to view or generate report

**Expected Results:**
- ✅ Report displays suppliers who provided samples
- ✅ Each supplier shows:
  - Supplier Name
  - # of Sample SKUs Provided
  - Total Samples Given
  - Conversion Rate
  - Revenue Attributed to Their Products
  - ROI for Their Samples
- ✅ Can sort by conversion rate or revenue
- ✅ Can filter by supplier
- ✅ Export option available (CSV, PDF - optional)
- ✅ Report is useful for evaluating supplier partnerships

**Actual Results:**
- Top supplier: _______________
- Conversion rate: _______________
- Revenue: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5B.10: Export Analytics Report
**Steps:**
1. Look for "Export" button on analytics page
2. Click export
3. Select format (CSV or PDF)
4. Download file

**Expected Results:**
- ✅ Export button is visible and accessible
- ✅ Can choose format (CSV, PDF, Excel)
- ✅ File downloads successfully
- ✅ Exported file contains:
  - All metrics from dashboard
  - Date range
  - Rep leaderboard
  - Supplier report
  - Charts (in PDF) or data (in CSV)
- ✅ File is properly formatted and readable

**Actual Results:**
- Export format: _______________
- File size: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## 🤖 Test Suite 5C: AI Product Recommendations (6 tests)

### Test 5C.1: Navigate to Customer Detail Page
**Steps:**
1. Navigate to: /sales/customers/[customerId]
2. Choose a customer with order history
3. Wait for page to load

**Expected Results:**
- ✅ Customer detail page loads
- ✅ "Product Recommendations" section is visible
- ✅ "Get AI Recommendations" button is visible

**Actual Results:**
- Customer ID: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5C.2: Request AI Product Recommendations
**Steps:**
1. Click "Get AI Recommendations" button
2. Wait for AI processing

**Expected Results:**
- ✅ Loading indicator appears immediately
- ✅ Button is disabled during processing
- ✅ Loading message displays (e.g., "Analyzing customer history...")
- ✅ No page freeze or crash

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5C.3: Verify AI Recommendations Response
**Steps:**
1. Wait for AI recommendations to load (max 10 seconds)
2. Check recommendations display

**Expected Results:**
- ✅ Recommendations load within 10 seconds
- ✅ Success message displays (e.g., "5 recommendations found")
- ✅ Recommendations are displayed in card or list format
- ✅ Each recommendation shows:
  - Product Name
  - SKU Number (structured product ID, not generic description)
  - Category
  - Confidence Score (e.g., 85%)
  - Reasoning/Explanation (why this product is recommended)
- ✅ At least 3-5 recommendations are returned
- ✅ Recommendations are sorted by confidence score (highest first)

**Actual Results:**
- Load time: _______________
- # of recommendations: _______________
- Top recommendation: _______________
- Confidence score: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5C.4: Verify Structured Product IDs
**Steps:**
1. Check each recommendation
2. Verify SKU numbers are actual product IDs (not generic descriptions)

**Expected Results:**
- ✅ SKU numbers are specific (e.g., "SKU-1234", "CHARD-2023")
- ✅ SKU numbers match products in database
- ✅ NOT generic like "some chardonnay" or "red wine"
- ✅ Can click SKU to view product details (optional)

**Actual Results:**
- Example SKUs returned: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5C.5: Verify Recommendation Relevance
**Steps:**
1. Review customer's order history
2. Compare to AI recommendations
3. Check if recommendations make sense

**Expected Results:**
- ✅ Recommendations are relevant to customer's past purchases
- ✅ Examples:
  - If customer orders Chardonnay, recommend similar whites
  - If customer orders high-end wines, don't recommend low-end
  - If customer orders Italian wines, recommend other Italian wines
- ✅ Reasoning explains why product is recommended
- ✅ Recommendations are diverse (not all same category)

**Actual Results:**
- Relevance assessment: High / Medium / Low
- Example reasoning: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5C.6: Test AI Recommendation Error Handling
**Steps:**
1. Request recommendations for a customer with no order history
2. OR simulate API failure (if possible)
3. Check error handling

**Expected Results:**
- ✅ If no order history: Message displays "Not enough data for recommendations"
- ✅ If API fails: User-friendly error message (not technical stack trace)
- ✅ Error message suggests next steps (e.g., "Try again later" or "Add more order history")
- ✅ Retry button is available
- ✅ Page doesn't crash or freeze
- ✅ Error is logged (check console)

**Actual Results:**
- Error message: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## ⚙️ Test Suite 5D: Sample-Triggered Automation (4 tests)

### Test 5D.1: Test Sample No-Order Trigger
**Prerequisites**: Sample assigned to customer 30+ days ago, no order placed

**Steps:**
1. Assign a sample to a customer
2. Verify customer has NOT placed an order since sample
3. Wait for trigger to fire (30 days - may need to simulate)
4. Check if task is created

**Expected Results:**
- ✅ Trigger fires after 30 days of no order
- ✅ Task is created automatically for sales rep
- ✅ Task title: "Follow up - customer received sample but hasn't ordered"
- ✅ Task is assigned to rep who gave sample
- ✅ Task due date is set (e.g., 7 days from creation)
- ✅ Task details include: Customer name, SKU sampled, Days since sample
- ✅ Task appears in rep's task list

**Actual Results:**
- Task created: Yes / No
- Task details: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________
- Note: May require date simulation or manual database update for testing

---

### Test 5D.2: Test First Order After Sample Trigger
**Steps:**
1. Assign a sample to a customer (who has never ordered)
2. Customer places their FIRST order (create order in system)
3. Check if celebratory activity or notification is created

**Expected Results:**
- ✅ Trigger fires when first order is placed after sample
- ✅ Activity is created: "First order placed! Sample converted to sale"
- ✅ Notification sent to rep (optional)
- ✅ Sample is marked as "converted" in analytics
- ✅ Revenue is attributed to sample

**Actual Results:**
- Trigger fired: Yes / No
- Activity created: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5D.3: Test Customer Timing Trigger (Due to Order)
**Steps:**
1. Identify a customer with regular ordering pattern (e.g., orders every 30 days)
2. Check if customer becomes "DUE" when expected order date passes
3. Verify task is created for rep

**Expected Results:**
- ✅ Customer's nextExpectedOrderDate is calculated correctly
- ✅ Customer appears in "DUE" filter when date passes
- ✅ Task is created for rep: "Follow up - customer is due to order"
- ✅ Task includes customer details and last order date
- ✅ Task has appropriate priority (high if customer is high-value)

**Actual Results:**
- Customer due date: _______________
- Task created: Yes / No
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5D.4: Test Sample Budget Burn Rate Alert
**Steps:**
1. Check current sample budget usage
2. If usage is >80%, verify alert is shown
3. If usage is <80%, assign samples until >80% used
4. Check for alert

**Expected Results:**
- ✅ Alert is shown when budget usage exceeds 80%
- ✅ Alert displays on samples page or dashboard
- ✅ Alert message: "Sample budget is 85% used. Manage carefully."
- ✅ Alert is yellow/orange for 80-90%, red for >90%
- ✅ Can dismiss alert (but it reappears on page reload)

**Actual Results:**
- Budget usage: _______________
- Alert shown: Yes / No
- Alert message: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## 📈 Test Suite 5E: Sample Budget Management (3 tests)

### Test 5E.1: View Sample Budget Tracker
**Steps:**
1. Navigate to /sales/samples
2. Locate "Sample Budget Tracker" widget

**Expected Results:**
- ✅ Budget tracker is prominently displayed
- ✅ Shows:
  - Budget Allocated: $___
  - Budget Used: $___
  - Budget Remaining: $___
  - Percentage Used: ___%
- ✅ Progress bar visualizes usage
- ✅ Colors indicate status:
  - Green: <50% used
  - Yellow: 50-80% used
  - Orange: 80-90% used
  - Red: >90% used
- ✅ Calculations are accurate

**Actual Results:**
- Budget allocated: _______________
- Budget used: _______________
- Budget remaining: _______________
- Percentage: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5E.2: Test Budget Limit Enforcement
**Steps:**
1. Check remaining budget
2. Try to assign a sample that exceeds remaining budget
3. Verify warning or prevention

**Expected Results:**
- ✅ System calculates cost of sample being assigned
- ✅ If cost exceeds remaining budget, warning is shown
- ✅ Warning message: "This assignment will exceed your budget. Continue anyway?"
- ✅ Can choose to proceed or cancel
- ✅ If proceed, budget goes over but is flagged
- ✅ Manager is notified if budget is exceeded (optional)

**Actual Results:**
- Warning shown: Yes / No
- Warning message: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

### Test 5E.3: View Sample Budget History
**Steps:**
1. Look for "Budget History" or "Usage Over Time" chart
2. Check historical budget usage

**Expected Results:**
- ✅ Chart shows budget usage over time (weekly or monthly)
- ✅ Can see trends (increasing or decreasing usage)
- ✅ Historical data is accurate
- ✅ Can filter by time period

**Actual Results:**
- Chart type: _______________
- Data shown: _______________
- [ ] Pass / [ ] Fail
- Issues: _______________

---

## ✅ Phase 3 Test Summary Template

### Overall Results
- **Total Phase 3 Tests**: 41
- **Passed**: _______________
- **Failed**: _______________
- **Skipped**: _______________
- **Completion Date**: _______________

### Critical Issues (Blockers)
1. _______________
2. _______________
3. _______________

### High Priority Issues
1. _______________
2. _______________
3. _______________

### Medium/Low Priority Issues
1. _______________
2. _______________

### Performance Notes
- Sample assignment speed: _______________
- Analytics load time: _______________
- AI recommendation time: _______________

### Recommendations
1. _______________
2. _______________
3. _______________

### Approval
- [ ] Phase 3 features are production-ready
- [ ] Phase 3 features need minor fixes
- [ ] Phase 3 features need major rework

**Tested by**: _______________
**Date**: _______________
