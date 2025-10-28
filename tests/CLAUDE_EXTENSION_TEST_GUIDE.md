# Claude Chrome Extension - Testing Guide for Leora CRM

## 🎯 Purpose

This guide helps the Claude Chrome extension execute automated tests for the Leora CRM system step-by-step. Follow this guide to run comprehensive tests covering all features.

---

## 📋 Pre-Test Setup

### 1. Verify Development Environment
Before starting tests, ensure:
- ✅ Development server is running (`npm run dev`)
- ✅ Database has been seeded with 4,838 customers
- ✅ Browser is Chrome with Claude extension installed
- ✅ Navigate to: http://localhost:3000

### 2. Open Test Suite Document
Open the main test suite file:
- **File**: `/web/tests/chrome-extension-test-suite.md`
- This contains all 76 tests organized into 8 test suites

### 3. Prepare Test Results Template
Copy the test results template:
- **File**: `/web/tests/TEST_RESULTS_TEMPLATE.md`
- Fill in environment details before starting

---

## 🧪 How to Execute Tests

### Step-by-Step Process

**For Each Test in the Suite:**

1. **Read the Test Steps**
   - Carefully read the "Steps" section
   - Understand what actions to perform
   - Note any specific data to enter

2. **Perform the Test**
   - Execute each step exactly as written
   - Use the Claude extension to interact with the page
   - Wait for page loads and UI updates

3. **Verify Expected Results**
   - Check each item in "Expected Results" section
   - Mark ✅ for passed checks
   - Mark ❌ for failed checks

4. **Record Actual Results**
   - Fill in requested data (e.g., counts, times, values)
   - Mark test as Pass or Fail
   - Note any issues or unexpected behavior

5. **Capture Screenshots (Optional)**
   - Take screenshot if visual verification needed
   - Save with test ID (e.g., `test-1-1-customer-list.png`)

6. **Move to Next Test**
   - Continue to next test in sequence
   - Some tests build on previous tests (keep context)

---

## 🔍 Test Execution Tips

### Navigation
- Always wait for pages to fully load before checking results
- If a page doesn't load, note the timeout and mark test as failed
- Use absolute URLs when navigating (e.g., `http://localhost:3000/sales/customers`)

### Interacting with UI Elements
- **Clicking**: Click buttons, links, and table rows as instructed
- **Typing**: Enter text in search boxes and input fields
- **Selecting**: Choose options from dropdowns and filters
- **Scrolling**: Scroll to find elements if they're below the fold

### Timing and Performance
- Note load times in milliseconds where requested
- Performance tests have specific time thresholds (e.g., <2s, <500ms)
- Use browser DevTools Network tab for precise measurements

### Data Verification
- Check counts match expected ranges (e.g., ~728 ACTIVE customers)
- Verify calculations are correct (e.g., budget remaining = allocated - used)
- Confirm data is formatted properly (e.g., currency, dates)

### Error Handling
- If an error occurs, note the error message
- Check browser console for JavaScript errors
- Take screenshot of error state
- Mark test as failed with detailed issue description

---

## 📊 Test Suites Overview

### Suite 1: Customer Management (12 tests)
**Focus**: Customer list, filters, search, sorting, pagination, detail pages
**Time Estimate**: 15-20 minutes
**Key Checks**: Count accuracy, filter functionality, search speed

### Suite 2: CARLA Call Planning (10 tests)
**Focus**: Weekly call plan creation, customer selection, goal setting, grid display
**Time Estimate**: 15-20 minutes
**Key Checks**: Plan generation, customer assignment, activity logging

### Suite 3: Dashboard & Widgets (8 tests)
**Focus**: Dashboard widgets, charts, drag-and-drop, resizing
**Time Estimate**: 10-15 minutes
**Key Checks**: Widget display, data accuracy, interactivity

### Suite 4: Job Queue Monitoring (6 tests)
**Focus**: Admin job queue, job status, logs, manual triggers
**Time Estimate**: 10 minutes
**Key Checks**: Job tracking, status updates, error handling

### Suite 5: Samples & Analytics - Phase 3 (14 tests)
**Focus**: Sample assignment, inventory, analytics, AI recommendations
**Time Estimate**: 20-25 minutes
**Key Checks**: Sample workflow, conversion metrics, AI integration
**Note**: ⚠️ Run only after Phase 3 is complete

### Suite 6: Mobile Responsiveness (8 tests)
**Focus**: Mobile viewport testing, touch interactions, responsive layouts
**Time Estimate**: 10-15 minutes
**Key Checks**: Mobile menu, card views, form usability

### Suite 7: Performance Tests (6 tests)
**Focus**: Load times, API speed, rendering performance
**Time Estimate**: 10 minutes
**Key Checks**: Page load <2s, API <500ms, charts <1s

### Suite 8: Security Tests (6 tests)
**Focus**: Authentication, XSS/SQL injection protection, session management
**Time Estimate**: 10 minutes
**Key Checks**: Auth enforcement, input sanitization, secure cookies

---

## 🎬 Execution Order

### Recommended Order:
1. **Suite 1**: Customer Management (foundation)
2. **Suite 2**: CARLA Call Planning (builds on customer data)
3. **Suite 3**: Dashboard & Widgets (overview features)
4. **Suite 4**: Job Queue Monitoring (admin features)
5. **Suite 6**: Mobile Responsiveness (can run anytime)
6. **Suite 7**: Performance Tests (best run alone)
7. **Suite 8**: Security Tests (can run anytime)
8. **Suite 5**: Samples & Analytics (ONLY after Phase 3 complete)

---

## 📝 Recording Results

### For Each Test:
1. **Mark Pass/Fail**
   - Check the [ ] Pass or [ ] Fail checkbox
   - Only mark Pass if ALL expected results are met

2. **Fill in Requested Data**
   - Customer counts
   - Load times
   - Revenue amounts
   - Error messages
   - Any other numeric or text data requested

3. **Note Issues**
   - Describe what went wrong if test failed
   - Include error messages
   - Note steps to reproduce issue

### At End of Suite:
1. **Calculate Suite Summary**
   - Total tests in suite
   - Passed count
   - Failed count
   - Skipped count

2. **Note Suite-Level Issues**
   - Patterns across multiple tests
   - Performance concerns
   - Critical blockers

---

## 🚨 When Tests Fail

### Troubleshooting Steps:
1. **Retry the Test**
   - Sometimes timeouts or loading issues occur
   - Refresh page and try test again
   - If passes on retry, note it was intermittent

2. **Check Prerequisites**
   - Is development server running?
   - Is database seeded correctly?
   - Are you on the correct page?

3. **Gather Evidence**
   - Take screenshot of failure
   - Copy error messages from console
   - Note exact steps that caused failure

4. **Mark as Failed**
   - Don't skip failed tests
   - Document the failure clearly
   - Assign priority (Critical, High, Medium, Low)

5. **Continue Testing**
   - Don't stop at first failure
   - Complete all tests to get full picture
   - Some tests are independent and may still pass

---

## 📸 Screenshot Checklist

Capture screenshots for:
- ✅ Customer list page (Suite 1, Test 1.1)
- ✅ Customer detail page (Suite 1, Test 1.12)
- ✅ CARLA call plan grid (Suite 2, Test 2.8)
- ✅ Sales dashboard (Suite 3, Test 3.1)
- ✅ Sample analytics dashboard (Suite 5, Test 5.6)
- ✅ Mobile customer list (Suite 6, Test 6.2)
- ✅ Any test failures (for debugging)
- ✅ Any visual bugs or layout issues

Save screenshots in: `/web/tests/screenshots/`
Name format: `test-[suite]-[number]-[description].png`
Example: `test-1-1-customer-list-page.png`

---

## ⏱️ Performance Testing Notes

### Using Chrome DevTools:

1. **Open DevTools**
   - Press F12 or right-click → Inspect
   - Go to "Network" tab

2. **Measure Page Load**
   - Clear network log
   - Navigate to page
   - Note "DOMContentLoaded" time (blue line)
   - Note "Load" time (red line)

3. **Measure API Response**
   - Filter by "Fetch/XHR"
   - Find API call (e.g., `/api/sales/customers`)
   - Check "Time" column for duration

4. **Measure Chart Rendering**
   - Use "Performance" tab
   - Start recording
   - Navigate to page with chart
   - Stop recording
   - Find chart render time in timeline

---

## 🔧 Common Issues & Solutions

### Issue: Page doesn't load
**Solution**:
- Check dev server is running (`npm run dev`)
- Verify URL is correct
- Clear browser cache
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: Customer count doesn't match
**Solution**:
- Database may need reseeding
- Run: `npm run seed:well-crafted`
- Refresh page and recount

### Issue: Filters don't work
**Solution**:
- Check console for JavaScript errors
- Verify API is returning data
- Try clearing filters and re-applying

### Issue: Search returns no results
**Solution**:
- Verify search term spelling
- Check if search is case-sensitive
- Try partial search terms
- Check API is not erroring

### Issue: Modal doesn't open
**Solution**:
- Check for JavaScript errors in console
- Verify button is clickable (not disabled)
- Try different customer or data

---

## 📤 Reporting Test Results

### Final Steps:

1. **Complete Test Summary**
   - Total tests: 76
   - Passed: ___
   - Failed: ___
   - Skipped: ___
   - Duration: ___

2. **List All Failures**
   - Test ID
   - Issue description
   - Priority level
   - Screenshot (if applicable)

3. **Performance Summary**
   - Average page load time
   - Slowest API call
   - Any timeouts or bottlenecks

4. **Recommendations**
   - High priority fixes
   - Medium priority improvements
   - Nice-to-have enhancements

5. **Save Test Results**
   - Fill in: `/web/tests/TEST_RESULTS_TEMPLATE.md`
   - Rename to: `TEST_RESULTS_[DATE].md`
   - Example: `TEST_RESULTS_2025-01-25.md`

---

## 🎯 Success Criteria

### Test Suite is Successful if:
- ✅ 95%+ tests pass (72+ out of 76)
- ✅ No critical failures (blocking bugs)
- ✅ Performance targets met (page load <2s, API <500ms)
- ✅ All core features functional (customer list, call plan, dashboard)
- ✅ Mobile responsiveness acceptable
- ✅ Security tests pass

### Test Suite Needs Work if:
- ❌ <90% tests pass (<68 out of 76)
- ❌ Critical features broken (can't view customers, can't create call plan)
- ❌ Performance issues (page load >5s, API >2s)
- ❌ Security vulnerabilities (XSS, SQL injection)
- ❌ Mobile unusable

---

## 📞 Getting Help

### If You Encounter Issues:

1. **Check Documentation**
   - `/web/docs/TESTING.md` - General testing guide
   - `/web/README.md` - Project overview

2. **Review Test Script**
   - Re-read test steps carefully
   - Verify prerequisites are met

3. **Check Console**
   - Look for JavaScript errors
   - Check Network tab for failed API calls

4. **Document Unknown Issues**
   - If behavior is unclear, note it
   - Mark test as "Needs Clarification"
   - Continue with other tests

---

## ✅ Post-Test Actions

### After Completing All Tests:

1. **Generate Summary Report**
   - Use template: `/web/tests/TEST_RESULTS_TEMPLATE.md`
   - Fill in all sections
   - Include metrics and recommendations

2. **Organize Screenshots**
   - Move to: `/web/tests/screenshots/[DATE]/`
   - Name clearly with test IDs

3. **Create Issue List**
   - List all failures
   - Prioritize by severity
   - Include reproduction steps

4. **Share Results**
   - Save completed test results in `/web/tests/`
   - Share with development team
   - Schedule follow-up for fixes

---

## 🚀 Next Testing Cycle

### When to Re-Test:
- After bug fixes are deployed
- After Phase 3 is completed (for Suite 5)
- Before production deployment
- After major feature additions
- Weekly/bi-weekly for regression testing

### Continuous Improvement:
- Update test suite as features change
- Add new tests for new features
- Remove obsolete tests
- Refine expected results based on learnings

---

**Happy Testing!** 🎉

If you have questions about specific tests, refer to:
- Main test suite: `/web/tests/chrome-extension-test-suite.md`
- API tests: `/web/tests/api-tests.http`
- Phase 3 tests: `/web/tests/phase3-samples-tests.md`
