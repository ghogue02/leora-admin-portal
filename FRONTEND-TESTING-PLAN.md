# LEORA Sales Portal - Frontend Testing Plan

**Testing Date:** October 19, 2025
**Server:** http://localhost:3004
**Test Account:** travis@wellcraftedbeverage.com / SalesDemo2025
**Purpose:** Verify all fixes from LEORA audit and identify remaining issues

---

## 📋 **PRE-TESTING SETUP**

### **1. Verify Server is Running**
- [ ] Server accessible at http://localhost:3004
- [ ] Login page loads at http://localhost:3004/sales/login
- [ ] Check browser console - should have no critical errors on login page

### **2. Login and Establish Session**
- [ ] Email: travis@wellcraftedbeverage.com
- [ ] Password: SalesDemo2025
- [ ] Successful redirect to dashboard after login
- [ ] Session cookie created (check DevTools → Application → Cookies)

### **3. Check Console for Errors**
- [ ] Open DevTools Console
- [ ] Filter for errors (red messages)
- [ ] Note any warnings (yellow messages)
- [ ] Keep console open for all tests

---

## 🎯 **SECTION 1: CORE FEATURES (Should Work)**

### **Test 1.1: Dashboard - Performance Metrics**

**URL:** http://localhost:3004/sales/dashboard

**Expected:**
- [ ] Weekly Quota Progress shows: $53,133 of $15,000 (354%)
- [ ] This Week Revenue: $53,133
- [ ] Week-over-Week change: -2.6%
- [ ] Unique Customers: 113 orders this week
- [ ] No "Unable to validate session" error
- [ ] No $0 values (all metrics showing real numbers)

**Actual Result:**
- Revenue shown: _____________
- Quota progress: _____________
- Any errors: _____________

**Status:** PASS / FAIL

---

### **Test 1.2: Dashboard - Customer Health**

**Expected:**
- [ ] Healthy customers: ~1,577 (97%)
- [ ] At Risk (Cadence): ~44 (2-3%)
- [ ] At Risk (Revenue): 0
- [ ] Dormant: 0
- [ ] NOT showing 100% healthy (that was the old bug)

**Actual Result:**
- Healthy: _____________
- At-risk: _____________
- Distribution realistic: YES / NO

**Status:** PASS / FAIL

---

### **Test 1.3: Customers List Page**

**URL:** http://localhost:3004/sales/customers

**Expected:**
- [ ] Customer table loads with 1,621 total customers
- [ ] Filter tabs work: All, Due to Order, Healthy, At Risk, Dormant
- [ ] Customer names display correctly
- [ ] Health status badges visible (green/yellow/red)
- [ ] Sorting works (click column headers)
- [ ] Search bar functional

**Actual Result:**
- Total customers shown: _____________
- Filters working: YES / NO
- Any errors: _____________

**Status:** PASS / FAIL

---

### **Test 1.4: Customer Detail Page**

**URL:** Click "View Details" on any customer

**Expected:**
- [ ] Customer detail page loads (not stuck)
- [ ] Customer name and info display
- [ ] Order history shows
- [ ] Last order date visible
- [ ] Expected next order date shown
- [ ] Health status displayed

**Actual Result:**
- Page loads: YES / NO
- If stuck, time waited: _____________
- Console errors: _____________

**Status:** PASS / FAIL

**CRITICAL:** If this fails, check browser console and server logs for:
- API endpoint being called (should be GET /api/sales/customers/[id])
- Response status (200, 404, 500)
- Error message details

---

### **Test 1.5: Orders Page**

**URL:** http://localhost:3004/sales/orders

**Expected:**
- [ ] Order list loads (not "Missing required permission")
- [ ] Shows 669 total orders
- [ ] Customer names visible
- [ ] Order amounts displayed
- [ ] Order dates shown
- [ ] Summary statistics at top (Total count, Open exposure)

**Actual Result:**
- Orders loaded: YES / NO
- Total count: _____________
- Any permission errors: YES / NO

**Status:** PASS / FAIL

---

### **Test 1.6: Catalog Page**

**URL:** http://localhost:3004/sales/catalog

**Expected:**
- [ ] Product catalog loads (not "Missing required permission")
- [ ] Shows 1,285 SKUs
- [ ] Product names, brands, categories visible
- [ ] Prices displayed
- [ ] Inventory counts shown
- [ ] Search bar works
- [ ] "Add to Cart" buttons present

**Actual Result:**
- Catalog loaded: YES / NO
- Total SKUs: _____________
- Any permission errors: YES / NO

**Status:** PASS / FAIL

---

### **Test 1.7: Cart Page**

**URL:** http://localhost:3004/sales/cart

**Expected:**
- [ ] Cart page loads (not "Missing required permission")
- [ ] Shows cart interface
- [ ] May show "customerId required" message (expected by design)
- [ ] Not showing generic permission error

**Actual Result:**
- Cart accessible: YES / NO
- Error message: _____________

**Status:** PASS / FAIL

---

### **Test 1.8: Call Plan Page**

**URL:** http://localhost:3004/sales/call-plan

**Expected:**
- [ ] Weekly view loads (Monday-Friday grid)
- [ ] Current week displayed
- [ ] "Add Activity" buttons on each day
- [ ] Activity balance metrics shown
- [ ] Can navigate between weeks

**Actual Result:**
- Page loaded: YES / NO
- Functions work: YES / NO

**Status:** PASS / FAIL

---

### **Test 1.9: Samples Page**

**URL:** http://localhost:3004/sales/samples

**Expected:**
- [ ] Sample budget tracker shows 60 total allowance
- [ ] Usage bar displays (may show 0 used)
- [ ] "Log Sample Usage" button present
- [ ] Usage history section visible (may be empty)

**Actual Result:**
- Page loaded: YES / NO
- Budget shown: _____________

**Status:** PASS / FAIL

---

### **Test 1.10: Manager Page**

**URL:** http://localhost:3004/sales/manager

**Expected:**
- [ ] Team dashboard loads
- [ ] All sales reps shown (Travis, Kelly, Carolyn)
- [ ] This week vs last week revenue for each rep
- [ ] Territory health breakdown
- [ ] Sample budget overview

**Actual Result:**
- Page loaded: YES / NO
- Reps shown: _____________

**Status:** PASS / FAIL

---

## ⚠️ **SECTION 2: KNOWN PROBLEMATIC FEATURES**

### **Test 2.1: Activities Page** ⚠️

**URL:** http://localhost:3004/sales/activities

**Known Issue:** "Unable to validate session" error

**Test Steps:**
1. Navigate to Activities page
2. Check browser console for errors
3. Check Network tab for API call to /api/sales/activities
4. Note the response status code
5. **CRITICAL:** Open server terminal and look for logs starting with:
   - `🔍 [Activities] Handler started`
   - `✅ [Activities] Query successful` OR
   - `❌ [Activities] Query failed`

**Capture This Information:**
- HTTP Status Code: _____________
- Error Message in Browser: _____________
- Server Log Output: _____________
- Any Prisma errors: _____________

**Status:** PASS / FAIL

**Debugging Clues to Capture:**
```
🔍 Look for in server logs:
- "PrismaClientKnownRequestError"
- Error code: P20XX
- "RLS" or "Row Level Security"
- "Transaction timeout"
- "Column does not exist"
```

---

### **Test 2.2: New Dashboard Components** ⚠️

**URL:** http://localhost:3004/sales/dashboard

**Current Status:** Temporarily disabled to prevent crashes

**Test IF Enabled:**

#### **A. Incentives Section**
- Expected Location: Top of page, after Performance Metrics
- If enabled, should show: Active competitions, rankings, prizes
- If empty: "No active incentives" message
- **Check Console for:**
  - GET /api/sales/incentives/active
  - Response status: _____________
  - Error details: _____________

#### **B. Product Goals Section**
- Expected Location: After revenue charts
- If enabled, should show: Product targets with progress bars
- If empty: "No product goals configured" message
- **Check Console for:**
  - GET /api/sales/goals/products
  - Response status: _____________
  - Error details: _____________

#### **C. Upcoming Calendar**
- Expected Location: After Product Goals
- If enabled, should show: Next 7-10 days of activities
- If empty: "No upcoming activities" message
- **Check Console for:**
  - GET /api/sales/calendar/upcoming?days=10
  - Response status: _____________
  - Error details: _____________

#### **D. Assigned Tasks**
- Expected Location: Before Upcoming Events
- If enabled, should show: Manager-assigned tasks
- If empty: "No tasks assigned yet" message
- **Check Console for:**
  - GET /api/sales/tasks/assigned?status=pending
  - Response status: _____________
  - Error details: _____________

**Status for Each:** PASS / FAIL / DISABLED

---

### **Test 2.3: Admin Page** ⚠️

**URL:** http://localhost:3004/sales/admin

**Known Issue:** May have same AssignedTasks error as Dashboard had

**Expected:**
- [ ] Admin panel loads
- [ ] Customer assignment tools visible
- [ ] Sales rep management accessible

**Actual Result:**
- Page loaded: YES / NO
- Any crashes: _____________

**Status:** PASS / FAIL

---

## 🔍 **SECTION 3: DIAGNOSTIC INFORMATION GATHERING**

### **Test 3.1: Check All Network Requests**

**In DevTools → Network Tab:**

For **Dashboard page**, capture:
- [ ] GET /api/sales/dashboard - Status: _____ (Should be 200)
- [ ] GET /api/sales/incentives/active - Status: _____ (Currently 500)
- [ ] GET /api/sales/goals/products - Status: _____ (Currently 500)
- [ ] GET /api/sales/calendar/upcoming - Status: _____ (Currently 500)
- [ ] GET /api/sales/tasks/assigned - Status: _____ (Currently 500)

**For each 500 error, capture:**
- Response body (Preview tab): _____________
- Response headers: _____________
- Request headers (check cookies present): _____________

---

### **Test 3.2: Server Log Analysis**

**In Terminal where `npm run dev` is running:**

Look for these patterns and note line numbers:
- [ ] `❌ [withSalesSession] Error code:` - Note error code (P2022, P2028, etc.)
- [ ] `❌ [withSalesSession] Error meta:` - Note metadata
- [ ] `PrismaClientKnownRequestError` - Note which table/column
- [ ] `Transaction API error` - Note timeout duration
- [ ] `Unable to start a transaction` - Database connection issue

**Capture:**
- Most common error code: _____________
- Table/column mentioned: _____________
- Any "does not exist" messages: _____________

---

### **Test 3.3: Database Schema Verification**

**Run this query in Supabase SQL Editor:**

```sql
-- Check if new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Task'
AND column_name IN ('assignedById', 'priority');

-- Should return 2 rows if migration succeeded
```

**Result:**
- Rows returned: _____________
- assignedById exists: YES / NO
- priority exists: YES / NO

---

### **Test 3.4: Check Prisma Client Status**

**Run in terminal:**
```bash
cd /Users/greghogue/Leora2/web
grep -n "assignedById" node_modules/.prisma/client/index.d.ts | head -5
```

**Expected:** Should find references to assignedById in generated client

**Actual:**
- Found references: YES / NO
- If NO: Prisma client not regenerated properly

---

## 🐛 **SECTION 4: SPECIFIC BUG VERIFICATION**

### **Bug 4.1: AssignedTasks Undefined Reference** ✅ CLAIMED FIXED

**How to Test:**
1. Re-enable AssignedTasks in dashboard/page.tsx (uncomment line 218)
2. Refresh dashboard
3. Check if dashboard crashes or loads

**Expected After Fix:**
- [ ] Dashboard loads without crash
- [ ] AssignedTasks section shows (even if empty)
- [ ] No "Cannot read properties of undefined" error

**Actual Result:**
- Crashed: YES / NO
- Error message: _____________

**Status:** FIXED / NOT FIXED

---

### **Bug 4.2: Activities Session Validation** ⚠️ CLAIMED IMPROVED

**How to Test:**
1. Navigate to /sales/activities
2. Note exact error message shown to user
3. Check server logs for detailed error
4. Check Network tab response

**Expected After Fix:**
- Error message more specific (not just "Unable to validate session")
- Server logs show detailed error with code
- Can identify root cause from logs

**Actual Result:**
- User sees: _____________
- Server logs show: _____________
- Error code: _____________

**Status:** IMPROVED / NOT IMPROVED

---

### **Bug 4.3: Permission Blocks** ✅ CLAIMED FIXED

**How to Test:**
1. Navigate to /sales/orders
2. Navigate to /sales/catalog
3. Navigate to /sales/cart

**Expected:**
- [ ] All 3 pages load (no "Missing required permission")
- [ ] Orders shows order list
- [ ] Catalog shows products
- [ ] Cart shows cart interface (may ask for customerId)

**Actual Result:**
- Orders: WORKS / PERMISSION ERROR
- Catalog: WORKS / PERMISSION ERROR
- Cart: WORKS / PERMISSION ERROR

**Status:** FIXED / NOT FIXED

---

### **Bug 4.4: Dashboard Zero Values** ✅ CLAIMED FIXED

**How to Test:**
1. Navigate to /sales/dashboard
2. Check Performance Metrics section

**Expected:**
- [ ] Weekly Revenue: $53,133 (NOT $0)
- [ ] Quota Progress: 354% (NOT 0%)
- [ ] Customer Health: 97.9% healthy (NOT 100%)
- [ ] Customers This Week: 113 (NOT 0)

**Actual Result:**
- Revenue: _____________
- Quota: _____________
- Health distribution: _____________

**Status:** FIXED / NOT FIXED

---

## 🆕 **SECTION 5: NEW FEATURES TESTING**

### **Test 5.1: Upcoming Calendar Component**

**Current Status:** Disabled (commented out)

**How to Test:**
1. Edit `/src/app/sales/dashboard/page.tsx`
2. Uncomment line 213: `{/* <UpcomingCalendar /> */}` → `<UpcomingCalendar />`
3. Save file and let page refresh
4. Check if component loads or errors

**If Component Appears:**
- [ ] Shows "Upcoming Calendar" heading
- [ ] Displays next 7-10 days
- [ ] Activities shown (or "No upcoming activities")
- [ ] No crash

**If Component Crashes/Errors:**
- Browser error: _____________
- Console error: _____________
- Network request to: /api/sales/calendar/upcoming?days=10
- Response status: _____________
- Response body: _____________

**Server Logs to Capture:**
```
Look for:
- GET /api/sales/calendar/upcoming
- Error code: _____________
- Error meta: _____________
- Which table/column: _____________
```

**Status:** PASS / FAIL / 500 ERROR

---

### **Test 5.2: Product Goals Component**

**Current Status:** Disabled (commented out)

**How to Test:**
1. Edit `/src/app/sales/dashboard/page.tsx`
2. Uncomment line 210: `{/* <ProductGoals /> */}` → `<ProductGoals />`
3. Save and refresh

**If Component Appears:**
- [ ] Shows "Product Goals" heading
- [ ] Displays product targets (or "No goals configured")
- [ ] Progress bars visible
- [ ] No crash

**If Component Crashes/Errors:**
- Browser error: _____________
- Network request to: /api/sales/goals/products
- Response status: _____________
- Response body: _____________

**Server Logs to Capture:**
```
- GET /api/sales/goals/products
- Error code: _____________
- Missing table/column: _____________
```

**Status:** PASS / FAIL / 500 ERROR

---

### **Test 5.3: Incentives Component**

**Current Status:** Disabled (commented out)

**How to Test:**
1. Edit `/src/app/sales/dashboard/page.tsx`
2. Uncomment line 198: `{/* <Incentives /> */}` → `<Incentives />`
3. Save and refresh

**If Component Appears:**
- [ ] Shows "Incentives & Competitions" or similar heading
- [ ] Displays active incentives (or "No active incentives")
- [ ] No crash

**If Component Crashes/Errors:**
- Browser error: _____________
- Network request to: /api/sales/incentives/active
- Response status: _____________
- Response body: _____________

**Server Logs to Capture:**
```
- GET /api/sales/incentives/active
- Error code: _____________
- Missing table/column: _____________
```

**Status:** PASS / FAIL / 500 ERROR

---

### **Test 5.4: Assigned Tasks Component**

**Current Status:** Disabled (commented out, but we fixed the undefined bug)

**How to Test:**
1. Edit `/src/app/sales/dashboard/page.tsx`
2. Uncomment line 218: `{/* <AssignedTasks /> */}` → `<AssignedTasks />`
3. Save and refresh

**If Component Appears:**
- [ ] Shows "Assigned Tasks" heading
- [ ] Displays tasks (or "No tasks assigned yet")
- [ ] Filter dropdown visible (All, Pending, Completed, Overdue)
- [ ] No "undefined.filter" error

**If Component Crashes/Errors:**
- Browser error: _____________
- Network request to: /api/sales/tasks/assigned?status=pending
- Response status: _____________
- Response body: _____________

**Server Logs to Capture:**
```
- GET /api/sales/tasks/assigned
- Error code: _____________
- Missing table/column: _____________
```

**Status:** PASS / FAIL / 500 ERROR

---

## 📊 **SECTION 6: DATA ACCURACY VERIFICATION**

### **Test 6.1: Revenue Calculations**

**Dashboard Performance Metrics:**
- Weekly Revenue shown: $_______________
- Expected: $53,133 (from your audit report)
- Match: YES / NO

**Dashboard Quota Progress:**
- Quota %shown: _______________%
- Expected: 354%
- Match: YES / NO

**Customers Page:**
- "Total Revenue (EST.)" shown: $_______________
- Your audit noted this shows $0 (needs fix)
- Still $0: YES / NO

**Orders Page:**
- "Open Exposure" shown: $_______________
- Your audit noted this shows $0 (needs fix)
- Still $0: YES / NO

---

### **Test 6.2: Customer Health Distribution**

**Dashboard Customer Health Summary:**
- Healthy count: _____________
- At Risk (Cadence): _____________
- At Risk (Revenue): _____________
- Dormant: _____________
- Total: _____________ (should sum to 1,621)

**Expected Distribution (from health assessment):**
- Healthy: ~1,577 (97%)
- At Risk: ~44 (2-3%)

**Match:** YES / NO / CLOSE

---

## 🔧 **SECTION 7: ERROR DOCUMENTATION**

For **each error** encountered, capture:

### **Error Report Template:**

```
Route/Component: _____________
Error Type: Permission / Session / 500 / Data
Error Message Shown to User: _____________

Console Error:
_____________

Network Request:
- URL: _____________
- Method: GET / POST / PUT
- Status: _____________
- Response: _____________

Server Logs:
_____________

Suspected Root Cause: _____________
```

---

## 📝 **SECTION 8: TESTING SUMMARY**

### **Core Features Status**
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard Metrics | ☐ Pass ☐ Fail | |
| Customer List | ☐ Pass ☐ Fail | |
| Customer Detail | ☐ Pass ☐ Fail | |
| Orders | ☐ Pass ☐ Fail | |
| Catalog | ☐ Pass ☐ Fail | |
| Cart | ☐ Pass ☐ Fail | |
| Call Plan | ☐ Pass ☐ Fail | |
| Samples | ☐ Pass ☐ Fail | |
| Manager | ☐ Pass ☐ Fail | |
| Activities | ☐ Pass ☐ Fail | |

### **New Features Status (If Tested)**
| Feature | Status | Error Code |
|---------|--------|------------|
| Upcoming Calendar | ☐ Pass ☐ Fail ☐ 500 | |
| Product Goals | ☐ Pass ☐ Fail ☐ 500 | |
| Incentives | ☐ Pass ☐ Fail ☐ 500 | |
| Assigned Tasks | ☐ Pass ☐ Fail ☐ 500 | |

### **Overall Assessment**
- Core features working: _____ / 10
- New features working: _____ / 4
- Critical blockers: _____ issues
- Ready for production: YES / NO

---

## 🎯 **PRIORITY ISSUES TO REPORT**

After testing, list in priority order:

**CRITICAL (Blocks core functionality):**
1. _____________
2. _____________

**HIGH (Breaks new features):**
1. _____________
2. _____________

**MEDIUM (Minor issues):**
1. _____________
2. _____________

**LOW (Nice to have):**
1. _____________
2. _____________

---

## 📋 **INFORMATION TO PROVIDE TO DEVELOPER**

After completing all tests, provide:

1. **Completed checklist above**
2. **Screenshot of any error messages**
3. **Server log output** (copy/paste terminal output)
4. **Network tab** (screenshot of failed requests)
5. **Console errors** (copy/paste from browser console)

---

**Testing Started:** _____________
**Testing Completed:** _____________
**Tester Name:** _____________
**Overall Status:** PASS / FAIL / PARTIAL

---

## 💡 **QUICK REFERENCE**

**Server URL:** http://localhost:3004
**Login:** travis@wellcraftedbeverage.com / SalesDemo2025

**To re-enable new features:**
Edit `/src/app/sales/dashboard/page.tsx` and uncomment components one at a time

**To check server logs:**
Look at terminal where `npm run dev` is running

**To check database:**
Supabase SQL Editor at https://supabase.com

---

**Use this document to systematically test every feature and capture all error information for the developer to fix!**
