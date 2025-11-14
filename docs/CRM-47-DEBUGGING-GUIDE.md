# CRM-47: Debugging "Failed to log activity" Error

## 🐛 Bug Report Summary
**Issue**: "Failed to log activity" error when saving Major Change activities
**Status**: Under Investigation
**Reporter**: Testing Team

---

## 🔍 Diagnostic Steps

### Step 1: Check Browser Console

Open your browser's Developer Tools (F12) and look for:

1. **Network Tab**:
   - Filter for `/api/sales/activities`
   - Look for the POST request (should be red/failed)
   - Click on it and check:
     - **Request Payload**: What data is being sent?
     - **Response**: What error is the server returning?
     - **Status Code**: Is it 400, 404, 500?

2. **Console Tab**:
   - Look for any JavaScript errors
   - Look for any `❌` prefixed logs from the API

### Step 2: Check Server Logs

In your terminal where `npm run dev` is running:

1. Look for logs starting with `❌ [Activities]`
2. Note the error message and details
3. Check if there's a stack trace

### Step 3: Common Issues & Solutions

#### Issue A: Sample Items Validation Error
**Symptoms**: Error mentions "invalid SKUs" or "sample list items"

**Solution**:
```typescript
// In LogActivityModal, ensure samples are empty for Major Change
// The issue might be that samples are being sent even when deselected
```

**Quick Fix**: Try adding this check in the form submission:
```typescript
// If Major Change, force samples to empty array
const sampleItems = activityTypeCode === 'MAJOR_CHANGE' ? [] : sampleSelections;
```

#### Issue B: Customer Not Found
**Symptoms**: Error says "Customer not found or not assigned to you"

**Causes**:
- Customer is not assigned to the logged-in sales rep
- customerId is invalid or missing

**Solution**:
1. Check the customer IS assigned to you
2. Try with a different customer

#### Issue C: Activity Type Not Found
**Symptoms**: Error says "Invalid activity type"

**Cause**: ActivityType lookup failing

**Solution**:
```sql
-- Verify the activity type exists and code matches
SELECT id, "tenantId", name, code
FROM "ActivityType"
WHERE code = 'MAJOR_CHANGE';

-- Expected result:
-- Should return 1 row with code = 'MAJOR_CHANGE'
```

#### Issue D: Tenant Mismatch
**Symptoms**: Generic "Failed to log activity" with no specific error

**Cause**: The activity type was created for a different tenant

**Solution**:
```sql
-- Check which tenant the activity type belongs to
SELECT at.*, t.id as tenant_id, t.slug
FROM "ActivityType" at
JOIN "Tenant" t ON at."tenantId" = t.id
WHERE at.code = 'MAJOR_CHANGE';

-- Compare with your logged-in user's tenant
SELECT u.id, u.email, u."tenantId"
FROM "User" u
WHERE u.email = 'your-email@example.com';
```

---

## 🛠️ Debug Payload Template

### Expected Request Payload
```json
{
  "activityTypeCode": "MAJOR_CHANGE",
  "customerId": "uuid-of-customer",
  "subject": "Payment Terms Updated to Net 60",
  "notes": "Customer requested extended payment terms due to cash flow. Approved by finance.",
  "occurredAt": "2025-11-13T20:00:00.000Z",
  "followUpAt": null,
  "outcomes": [],
  "sampleItems": []
}
```

**Critical Fields**:
- `activityTypeCode`: Must be exactly "MAJOR_CHANGE"
- `sampleItems`: Must be empty array `[]` (not undefined, not null)
- `customerId`: Must be valid UUID for a customer assigned to you

---

## 🔧 Quick Fixes to Try

### Fix 1: Ensure No Sample Items

In `LogActivityModal.tsx`, find the submit handler and add this check:

```typescript
// Around line 200-250 in the handleSubmit function
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  setError(null);

  try {
    const payload = {
      activityTypeCode: formData.activityTypeCode,
      customerId: formData.customerId,
      subject: formData.subject,
      notes: formData.notes,
      occurredAt: formData.occurredAt,
      followUpAt: formData.followUpAt || null,
      outcomes: formData.outcomes,
      // CRITICAL FIX: Always send empty array if no samples
      sampleItems: sampleSelections.length > 0 ? sampleSelections : [],
    };

    console.log('📤 Submitting activity:', payload); // DEBUG LOG

    const res = await fetch('/api/sales/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('❌ API Error:', errorData); // DEBUG LOG
      throw new Error(errorData.error || 'Failed to log activity');
    }

    // ... rest of success handling
  } catch (error) {
    console.error('❌ Submit Error:', error); // DEBUG LOG
    // ... rest of error handling
  }
};
```

### Fix 2: Validate Customer Assignment

```sql
-- Check if the customer is assigned to your sales rep
SELECT
  c.id,
  c.name,
  c."salesRepId",
  sr."userId",
  u.email
FROM "Customer" c
JOIN "SalesRep" sr ON c."salesRepId" = sr.id
JOIN "User" u ON sr."userId" = u.id
WHERE c.id = 'your-customer-id-here';
```

### Fix 3: Check Activity Type Code Exact Match

The code might be case-sensitive or have whitespace issues:

```sql
-- Check the exact code value
SELECT
  id,
  name,
  code,
  LENGTH(code) as code_length,
  code = 'MAJOR_CHANGE' as exact_match
FROM "ActivityType"
WHERE code LIKE '%MAJOR%';
```

---

## 📊 Testing Matrix

| Test Case | Activity Type | Customer | Samples | Expected Result |
|-----------|--------------|----------|---------|-----------------|
| 1 | MAJOR_CHANGE | Valid | None [] | ✅ Success |
| 2 | MAJOR_CHANGE | Valid | 1 sample | ⚠️ Depends on validation |
| 3 | MAJOR_CHANGE | Unassigned | None [] | ❌ Customer not found |
| 4 | visit | Valid | None [] | ✅ Success (control test) |

---

## 🚨 If Nothing Works

### Nuclear Option: Re-create Activity Type

```sql
-- 1. Delete the existing Major Change type (if corrupted)
DELETE FROM "ActivityType"
WHERE code = 'MAJOR_CHANGE';

-- 2. Re-run the creation script
-- (Copy from web/scripts/add-major-change-activity-type.sql)
```

### Backend Code Fix

If the issue is in the backend validation, you might need to modify:

**File**: `/Users/greghogue/Leora2/web/src/app/api/sales/activities/route.ts`

**Around line 256-264** (sample validation):

```typescript
// POTENTIAL FIX: Skip sample validation if array is empty
const sampleItemsInput = sampleItemsParse.data ?? [];

if (sampleItemsInput.length > 0) {
  try {
    await ensureSampleItemsValid(db, tenantId, salesRep.id, sampleItemsInput);
  } catch (error) {
    // ... error handling
  }
}
```

---

## 📝 Report Template

If you need to escalate this bug, use this template:

```markdown
### Bug Report: Failed to Log Major Change Activity

**Environment**:
- Browser: Chrome/Firefox/Safari
- Dev/Production: Development
- Node Version: [from package.json]

**Steps to Reproduce**:
1. Navigate to customer detail page
2. Click "Log Activity"
3. Select "Major Change" from dropdown
4. Fill in Subject: [your subject]
5. Fill in Notes: [your notes]
6. Ensure NO samples selected
7. Click Save

**Actual Result**:
- Error message: "Failed to log activity"
- Status code: [from Network tab]
- API Response: [paste JSON response]

**Expected Result**:
- Activity saves successfully
- Modal closes
- Activity appears in timeline

**Console Logs**:
```
[Paste browser console errors here]
```

**Server Logs**:
```
[Paste terminal output here]
```

**Screenshots**:
- Network tab showing failed request
- Console tab showing errors
- Form state before submission
```

---

## ✅ Success Indicators

Once fixed, you should see:

1. **Network Tab**:
   - POST `/api/sales/activities` returns **200 OK**
   - Response contains `{ "activity": { "id": "...", ... } }`

2. **Console**:
   - No errors
   - Possibly success logs like `✅ Activity created`

3. **UI**:
   - Modal closes
   - Success toast appears (if implemented)
   - Activity visible in timeline
   - Major Changes panel appears at top of page

---

**Need More Help?**
Share the browser console logs and server terminal output, and we can diagnose further!
