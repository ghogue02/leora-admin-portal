# CRM-47: Critical Fixes Applied - Activity Logging Issues

**Date**: November 13, 2025
**Status**: ✅ FIXES DEPLOYED - READY FOR TESTING
**Issue**: Global activity logging failure affecting ALL activity types

---

## 🐛 Root Cause Analysis

Your testing agent identified that **ALL activity types were failing to save**, not just Major Change. This pointed to a fundamental issue in the `LogActivityModal` component's payload construction.

### Issues Identified

1. **Timezone Mismatch** (HIGH SEVERITY)
   - `occurredAt` was using UTC time instead of local time
   - Caused date/time values to be off by several hours
   - Backend validation may have rejected future timestamps

2. **Empty String Pollution** (HIGH SEVERITY)
   - `followUpAt: ""` being sent instead of `null` or omitted
   - Empty strings can cause database constraint violations
   - Backend expects `null` or valid ISO date string

3. **Unnecessary Empty Arrays** (MEDIUM SEVERITY)
   - `outcomes: []` and `sampleItems: []` always sent
   - May trigger validation even when not needed
   - Backend may expect these fields to be omitted when empty

---

## ✅ Fixes Applied

### Fix #1: Local Timezone Support

**File**: `web/src/components/shared/LogActivityModal.tsx`
**Lines**: 72, 326

**Before**:
```typescript
occurredAt: new Date().toISOString().slice(0, 16),
```

**After**:
```typescript
occurredAt: new Date(
  new Date().getTime() - new Date().getTimezoneOffset() * 60000
).toISOString().slice(0, 16),
```

**Impact**: Dates now correctly reflect user's local timezone, preventing future timestamp rejections.

---

### Fix #2: Conditional Payload Construction

**File**: `web/src/components/shared/LogActivityModal.tsx`
**Lines**: 268-280

**Before**:
```typescript
const payload = {
  ...formData,
  sampleItems: selectedSampleItems,
};
```

**After**:
```typescript
const payload: Record<string, unknown> = {
  activityTypeCode: formData.activityTypeCode,
  customerId: formData.customerId,
  subject: formData.subject,
  notes: formData.notes,
  occurredAt: formData.occurredAt,
};

// Only include optional fields if they have values
if (formData.orderId) payload.orderId = formData.orderId;
if (formData.sampleId) payload.sampleId = formData.sampleId;
if (formData.followUpAt) payload.followUpAt = formData.followUpAt;
if (formData.outcomes && formData.outcomes.length > 0) {
  payload.outcomes = formData.outcomes;
}
if (selectedSampleItems.length > 0) {
  payload.sampleItems = selectedSampleItems;
}
```

**Impact**:
- No more empty strings sent for optional fields
- Backend receives clean, valid payload
- Reduces payload size
- Eliminates validation errors from empty values

---

### Fix #3: Enhanced Debug Logging

**File**: `web/src/components/shared/LogActivityModal.tsx`
**Lines**: 283, 294, 298, 334

**Added**:
```typescript
console.log("📤 Submitting activity with payload:", payload);
// ... API call ...
console.log("✅ API Response status:", response.status);
// ... on error ...
console.error("❌ API Error response:", body);
console.error("❌ Activity creation failed:", error);
```

**Impact**:
- Developers can now see exactly what's being sent
- Response errors are clearly logged
- Easier to diagnose future issues

---

## 🧪 Testing Instructions

### Step 1: Restart Dev Server

```bash
cd /Users/greghogue/Leora2/web
# Kill existing server if running
lsof -ti:3000 | xargs kill -9 2>/dev/null
# Start fresh
npm run dev
```

### Step 2: Open Browser DevTools

1. Open http://localhost:3000
2. Press F12 to open DevTools
3. Go to **Console** tab
4. Clear console (Cmd+K)

### Step 3: Test Activity Creation

1. Navigate to any customer page (e.g., **Cask and Cork**)
2. Click **"Log Activity"** button
3. Fill in the form:
   - **Activity Type**: Select "In-Person Visit" (known working type)
   - **Subject**: "Test Activity - Regular Visit"
   - **Notes**: "Testing after payload fixes"
   - **Date/Time**: Leave as current time
   - **Samples**: Leave unchecked
4. Click **"Log Activity"**

### Step 4: Check Console Logs

Look for:
```
📤 Submitting activity with payload: {
  activityTypeCode: "visit",
  customerId: "...",
  subject: "Test Activity - Regular Visit",
  notes: "Testing after payload fixes",
  occurredAt: "2025-11-13T15:30"
}
✅ API Response status: 200
```

### Step 5: Verify Success

**If successful**:
- ✅ Modal closes
- ✅ Activity appears in Activity Timeline
- ✅ No error message

**If still failing**:
- Check the console for `❌ API Error response:` message
- Note the specific error message
- Check Network tab for status code (400, 403, 404, 500)

---

## 🎯 Expected Results After Fixes

### For Regular Activities (In-Person Visit, Email, etc.)
- ✅ Should save successfully
- ✅ No validation errors
- ✅ Correct timezone preserved
- ✅ Modal closes after save

### For Major Change Activities
Once regular activities work:
1. Select "Major Change" from dropdown
2. Fill in subject and notes
3. Should save exactly like regular activities
4. ✅ Appears in Permanent Notes Panel at top of page
5. ✅ Appears in Activity Timeline with amber styling

---

## 🔍 Debugging If Issues Persist

### Check #1: Customer Assignment

If you get "Customer not found or not assigned to you":

```sql
-- Verify customer is assigned to your sales rep
SELECT
  c.id,
  c.name,
  c."salesRepId",
  sr."userId",
  u.email
FROM "Customer" c
LEFT JOIN "SalesRep" sr ON c."salesRepId" = sr.id
LEFT JOIN "User" u ON sr."userId" = u.id
WHERE c.name LIKE '%Cask%';
```

**Solution**: Assign the customer to your sales rep if needed.

### Check #2: Sales Rep Profile

If you get "Sales rep profile not found":

```sql
-- Check if you have a sales rep profile
SELECT
  sr.id,
  sr."userId",
  u.email,
  sr."isActive"
FROM "SalesRep" sr
JOIN "User" u ON sr."userId" = u.id
WHERE u.email = 'your-email@example.com';
```

**Solution**: Create a SalesRep record for your user account.

### Check #3: Activity Type Availability

```sql
-- Verify all activity types exist
SELECT name, code, "tenantId"
FROM "ActivityType"
ORDER BY "createdAt" DESC;
```

**Solution**: If MAJOR_CHANGE is missing, run the SQL script again.

---

## 📊 What Changed vs What Stayed the Same

### Changed
- ✅ Timezone handling (now uses local time)
- ✅ Payload construction (conditional field inclusion)
- ✅ Debug logging (enhanced visibility)

### Unchanged
- ✅ Form validation logic
- ✅ Sample items selector
- ✅ Voice input feature
- ✅ Multi-select outcomes
- ✅ Modal UI/UX
- ✅ Customer search functionality
- ✅ All other components

---

## 🎬 Next Actions

### Immediate (You)
1. ✅ Restart dev server
2. ✅ Test creating a regular activity
3. ✅ Check browser console for logs
4. ✅ Report back results

### If Successful (Me)
1. ✅ Test Major Change activity creation
2. ✅ Verify Permanent Notes Panel displays
3. ✅ Complete full frontend testing checklist
4. ✅ Mark CRM-47 as complete

### If Still Failing (Me)
1. ✅ Analyze console error logs
2. ✅ Check backend terminal output
3. ✅ Investigate database constraints
4. ✅ Apply additional fixes as needed

---

## 📝 Files Modified in This Fix

1. `web/src/components/shared/LogActivityModal.tsx` - Payload and timezone fixes
2. `web/docs/CRM-47-CRITICAL-FIXES-APPLIED.md` - This document
3. `web/scripts/test-activity-creation.ts` - Diagnostic script (created)

---

## 🎯 Success Criteria

**Activity Creation Working** =
- ✅ Console shows: `📤 Submitting activity with payload`
- ✅ Console shows: `✅ API Response status: 200`
- ✅ Modal closes without error
- ✅ Activity appears in timeline
- ✅ No error toast/message

---

**Ready for testing! Please restart the dev server and try creating an activity.** 🚀
