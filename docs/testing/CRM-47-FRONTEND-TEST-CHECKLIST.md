# CRM-47: Frontend Testing Checklist

**Feature**: Permanent + Timestamped Account Notes
**Status**: Ready for Testing
**Tester**: _____________
**Date**: _____________

---

## ⚙️ Prerequisites (One-Time Setup)

### 1. Database Setup
Run this command **once** to add the "Major Change" activity type:

```bash
cd web
psql $DATABASE_URL -f scripts/add-major-change-activity-type.sql
```

**OR** using Prisma:
```bash
cd web
npx prisma db execute --file ./scripts/add-major-change-activity-type.sql
```

### 2. Verify Activity Type Exists
Run this SQL query:
```sql
SELECT name, code FROM "ActivityType" WHERE code = 'MAJOR_CHANGE';
```

**Expected Result**:
```
name          | code
Major Change  | MAJOR_CHANGE
```

### 3. Start Development Server
```bash
cd web
npm run dev
```

Open: http://localhost:3000

---

## 📋 Test Scenarios

### Test 1: Create a Major Change Note ✅

**Steps**:
1. Navigate to any customer detail page (e.g., `/sales/customers/{customerId}`)
2. Click the **"Log Activity"** button (top right)
3. In the activity modal:
   - **Activity Type**: Select **"Major Change"**
   - **Subject**: Enter "Payment Terms Updated to Net 60"
   - **Notes**: Enter "Customer requested extended payment terms due to cash flow. Approved by finance."
   - **Date/Time**: Keep as current
4. Click **"Save"** or **"Log Activity"**

**Expected Result**:
- ✅ Activity saved successfully
- ✅ Modal closes
- ✅ Page refreshes/updates

**Pass/Fail**: ⬜

---

### Test 2: Verify Permanent Notes Panel Displays ✅

**Steps**:
1. Refresh the customer page
2. Look at the **top of the page** (right after the customer header)

**Expected Result**:
- ✅ You see a **yellow/amber panel** labeled "📌 MAJOR CHANGES & PERMANENT NOTES"
- ✅ The panel shows:
  - Date: "Nov 13, 2025" (or today's date)
  - Time: "3:45 PM" (or current time)
  - Rep Name: Your name
  - Subject: "Payment Terms Updated to Net 60"
  - Notes: Full text visible
- ✅ A **"View in Timeline"** link is visible

**Visual Check**:
- Panel has amber/yellow background (not gray like other cards)
- Text is clearly readable
- Layout looks organized

**Pass/Fail**: ⬜

**Screenshot**: ⬜ Attach screenshot here

---

### Test 3: "View in Timeline" Scroll Functionality ✅

**Steps**:
1. In the Permanent Notes Panel, click **"View in Timeline"**
2. Watch the page scroll

**Expected Result**:
- ✅ Page **smoothly scrolls down** to the Activity Timeline section
- ✅ The major change activity **highlights** with a yellow ring for 2 seconds
- ✅ The activity is visible in the timeline

**Pass/Fail**: ⬜

---

### Test 4: Major Change Styling in Timeline ✅

**Steps**:
1. Scroll to the **Activity Timeline** section
2. Find the major change activity you just created

**Expected Result**:
- ✅ Activity card has **amber/yellow border** (not gray)
- ✅ Activity card has **light amber background**
- ✅ Icon shows **📌 pin emoji** (not 📋)
- ✅ Badge displays **"📌 Major Change"** next to the subject
- ✅ All other details are visible (date, time, rep name, notes)

**Visual Check**:
- Major change stands out from regular activities
- Colors are consistent (amber theme)

**Pass/Fail**: ⬜

**Screenshot**: ⬜ Attach screenshot here

---

### Test 5: Multiple Major Changes ✅

**Steps**:
1. Create **2 more major change activities** with different subjects:
   - "Credit Limit Increased to $50,000"
   - "New Primary Contact: John Smith"
2. Refresh the page

**Expected Result**:
- ✅ All 3 major changes appear in the Permanent Notes Panel
- ✅ They are sorted **newest first** (most recent at top)
- ✅ Each shows correct date, rep name, subject, notes
- ✅ All "View in Timeline" links work

**Pass/Fail**: ⬜

---

### Test 6: Regular Activities (Not Major Changes) ✅

**Steps**:
1. Click **"Log Activity"** again
2. Select a **different activity type** (e.g., "In-Person Visit")
3. Fill in subject and notes
4. Save
5. Refresh the page

**Expected Result**:
- ✅ Regular activity appears **only in Activity Timeline**
- ✅ Regular activity does **NOT** appear in Permanent Notes Panel
- ✅ Regular activity has **gray styling** (not amber)
- ✅ Regular activity has normal icon (not 📌)

**Pass/Fail**: ⬜

---

### Test 7: Empty State (No Major Changes) ✅

**Steps**:
1. Navigate to a customer with **NO major change activities**
2. Look at the top of the page

**Expected Result**:
- ✅ Permanent Notes Panel **does not appear at all**
- ✅ Page layout looks normal without gaps
- ✅ All other sections display correctly

**Pass/Fail**: ⬜

---

### Test 8: Mobile Responsive Design 📱

**Steps**:
1. Open DevTools (F12)
2. Click **device toolbar** icon (Ctrl+Shift+M)
3. Select **iPhone 12 Pro** or **Pixel 5**
4. Navigate to customer with major changes

**Expected Result**:
- ✅ Permanent Notes Panel displays correctly
- ✅ Text wraps properly (not cut off)
- ✅ Date/time stacks vertically on small screens
- ✅ "View in Timeline" button is clickable
- ✅ Cards are full width on mobile
- ✅ All text is readable

**Test on**:
- ⬜ iPhone size (375px)
- ⬜ Tablet size (768px)
- ⬜ Desktop size (1440px)

**Pass/Fail**: ⬜

**Screenshot**: ⬜ Attach mobile screenshot here

---

### Test 9: Long Notes Content ✅

**Steps**:
1. Create a major change with a **very long note** (500+ characters)
2. Check the display

**Expected Result**:
- ✅ Full note content is visible (not truncated)
- ✅ Text wraps properly
- ✅ No horizontal scroll bars
- ✅ Card expands to fit content

**Pass/Fail**: ⬜

---

### Test 10: Performance Check ✅

**Steps**:
1. Open DevTools → Network tab
2. Navigate to a customer page with major changes
3. Check load times

**Expected Result**:
- ✅ Page loads in under 2 seconds
- ✅ No console errors
- ✅ No 404 errors in network tab
- ✅ Major changes data loads with customer data

**Pass/Fail**: ⬜

---

## 🎯 Acceptance Criteria Summary

| # | Criteria | Status |
|---|----------|--------|
| 1 | Can select "Major Change" in activity modal | ⬜ Pass / ⬜ Fail |
| 2 | Major changes appear in amber panel at top | ⬜ Pass / ⬜ Fail |
| 3 | Panel shows date, rep, subject, notes | ⬜ Pass / ⬜ Fail |
| 4 | Notes sorted newest first | ⬜ Pass / ⬜ Fail |
| 5 | Major changes visible in timeline with styling | ⬜ Pass / ⬜ Fail |
| 6 | "View in Timeline" scroll works | ⬜ Pass / ⬜ Fail |
| 7 | Mobile responsive design | ⬜ Pass / ⬜ Fail |
| 8 | Empty state handled gracefully | ⬜ Pass / ⬜ Fail |

---

## 🐛 Bug Report Template

**If you find any issues, document here**:

### Bug #1
- **What went wrong**: ___________________________
- **Steps to reproduce**: ___________________________
- **Expected**: ___________________________
- **Actual**: ___________________________
- **Screenshot**: Attach if possible
- **Browser/Device**: ___________________________

### Bug #2
- **What went wrong**: ___________________________
- **Steps to reproduce**: ___________________________
- **Expected**: ___________________________
- **Actual**: ___________________________
- **Screenshot**: Attach if possible
- **Browser/Device**: ___________________________

---

## ✅ Final Sign-Off

**Overall Assessment**:
- ⬜ **PASS** - Feature works as expected, ready for production
- ⬜ **PASS WITH ISSUES** - Works but has minor issues (document above)
- ⬜ **FAIL** - Major issues found, needs fixes

**Tester Signature**: _____________
**Date**: _____________
**Time Spent Testing**: _______ minutes

**Notes/Comments**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## 📞 Need Help?

- **Documentation**: See `CRM-47-IMPLEMENTATION-SUMMARY.md`
- **Jira Ticket**: [CRM-47](https://greghogue.atlassian.net/browse/CRM-47)
- **Developer**: Greg Hogue

---

**Testing Completed**: ⬜ YES / ⬜ NO
