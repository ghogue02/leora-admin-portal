# Phase 9: Data Integrity & Validation - Testing Guide

## Overview

This guide provides step-by-step testing procedures for the Data Integrity & Validation system. Follow these tests to ensure all features work correctly.

---

## Prerequisites

### 1. Database Setup

Run the migration:
```sql
\i /web/migrations/add_data_integrity_snapshot.sql
```

Verify table exists:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'DataIntegritySnapshot';
```

### 2. Authentication

Ensure you have an admin user:
```sql
-- Check for admin role
SELECT r.code
FROM "Role" r
JOIN "UserRole" ur ON ur."roleId" = r.id
JOIN "User" u ON u.id = ur."userId"
WHERE u.email = 'your-email@example.com';
```

Should return `sales.admin` or `admin`.

### 3. Test Data

Create some test issues:

```sql
-- Create customer without sales rep
INSERT INTO "Customer" ("id", "tenantId", "name", "salesRepId", "isPermanentlyClosed")
VALUES (gen_random_uuid(), 'your-tenant-id', 'Test Customer No Rep', NULL, false);

-- Create fulfilled order without invoice
INSERT INTO "Order" ("id", "tenantId", "customerId", "status", "total")
SELECT gen_random_uuid(), c."tenantId", c.id, 'FULFILLED', 100.00
FROM "Customer" c LIMIT 1;

-- Create customer without email
UPDATE "Customer"
SET "billingEmail" = NULL
WHERE id = (SELECT id FROM "Customer" LIMIT 1);
```

---

## Test Suite

### Test 1: Dashboard Loading

**Objective**: Verify dashboard loads and displays summary correctly.

**Steps**:
1. Navigate to `/admin/data-integrity`
2. Observe loading state appears
3. Verify dashboard loads within 5 seconds
4. Check all summary cards display:
   - Quality Score
   - Total Issues
   - Critical Issues
   - Last Checked timestamp

**Expected Results**:
- ✅ Dashboard loads without errors
- ✅ Summary cards show numeric values
- ✅ Quality score has color (green/yellow/red)
- ✅ Timestamp is recent and formatted

**Screenshot Location**: `screenshots/test1-dashboard-loaded.png`

---

### Test 2: Alert Cards Display

**Objective**: Verify alert cards show correct information.

**Steps**:
1. On dashboard, scroll to alerts section
2. Verify alerts are sorted by severity (high → medium → low)
3. Check each alert card shows:
   - Icon (X, warning triangle, or info)
   - Issue count badge
   - Rule name
   - Description
   - Severity badge
   - Action button

**Expected Results**:
- ✅ Alerts sorted correctly
- ✅ High severity alerts are red
- ✅ Medium severity alerts are yellow
- ✅ Low severity alerts are blue
- ✅ Count badges match actual issues
- ✅ All buttons clickable

**Screenshot Location**: `screenshots/test2-alert-cards.png`

---

### Test 3: Manual Check Execution

**Objective**: Test "Run Check Now" button.

**Steps**:
1. Click "Run Check Now" button
2. Observe loading state (spinner icon)
3. Wait for completion (10-30 seconds)
4. Verify dashboard refreshes with new data
5. Check "Last Checked" timestamp updated

**Expected Results**:
- ✅ Button shows loading state
- ✅ Check completes successfully
- ✅ Data refreshes automatically
- ✅ Timestamp updates to current time
- ✅ `cached: false` initially

**Console Check**:
```javascript
// Should see in network tab:
// POST /api/admin/data-integrity/run-check
// Status: 200
```

---

### Test 4: Issue Detail Page Navigation

**Objective**: Test navigation to issue details.

**Steps**:
1. From dashboard, click "View & Fix" on any alert
2. Verify URL changes to `/admin/data-integrity/[ruleId]`
3. Check detail page loads
4. Verify "Back to Dashboard" link works

**Expected Results**:
- ✅ Detail page loads
- ✅ URL contains correct rule ID
- ✅ Back button returns to dashboard
- ✅ Browser back button works

---

### Test 5: Issue Detail Display

**Objective**: Verify detail page shows affected records.

**Steps**:
1. On detail page, verify header shows:
   - Rule name
   - Issue count
   - Severity badge
   - Description
2. Check records table displays:
   - Entity type column
   - Details column with key-value pairs
   - Checkboxes (if fix available)
3. Verify pagination shows (if > 50 records)

**Expected Results**:
- ✅ Header information correct
- ✅ Table displays all records
- ✅ Details are formatted and readable
- ✅ Pagination controls work

**Screenshot Location**: `screenshots/test5-detail-page.png`

---

### Test 6: Bulk Selection

**Objective**: Test record selection functionality.

**Steps**:
1. On detail page with fix capability
2. Click individual checkboxes
3. Verify selection count updates
4. Click "Select All" checkbox
5. Verify all records selected
6. Click "Select All" again to deselect

**Expected Results**:
- ✅ Individual selection works
- ✅ Count updates correctly
- ✅ Select All selects all on page
- ✅ Deselect All works
- ✅ Fix button enables when records selected

---

### Test 7: Auto-Fix Execution (Customers Without Sales Rep)

**Objective**: Test auto-fix for sales rep assignment.

**Setup**:
```sql
-- Ensure we have a sales rep
SELECT sr.id, u."fullName"
FROM "SalesRep" sr
JOIN "User" u ON u.id = sr."userId"
LIMIT 1;
```

**Steps**:
1. Go to "Customers Without Sales Rep" detail page
2. Select 2-3 customers
3. Click "Fix Selected" button
4. Enter sales rep ID when prompted
5. Wait for success message
6. Verify page refreshes
7. Check customers now have assigned rep

**Expected Results**:
- ✅ Prompt appears for sales rep ID
- ✅ Fix executes successfully
- ✅ Success message displays
- ✅ Page refreshes automatically
- ✅ Records removed from issue list
- ✅ Total issue count decreases

**Database Verification**:
```sql
SELECT id, name, "salesRepId"
FROM "Customer"
WHERE id IN ('customer-uuid-1', 'customer-uuid-2');
-- salesRepId should now be set
```

**Audit Log Check**:
```sql
SELECT * FROM "AuditLog"
WHERE "entityType" = 'DataIntegrity'
AND "action" = 'FIX'
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Screenshot Location**: `screenshots/test7-fix-success.png`

---

### Test 8: Auto-Fix Execution (Create Invoices)

**Objective**: Test invoice creation fix.

**Setup**:
```sql
-- Create fulfilled order without invoice
INSERT INTO "Order" ("id", "tenantId", "customerId", "status", "total", "orderedAt")
SELECT gen_random_uuid(), c."tenantId", c.id, 'FULFILLED', 250.00, NOW()
FROM "Customer" c
LIMIT 1;
```

**Steps**:
1. Go to "Orders Without Invoice" detail page
2. Select 1-2 orders
3. Click "Fix Selected" button
4. Wait for success message
5. Verify invoices created

**Expected Results**:
- ✅ No prompt needed (no params)
- ✅ Fix executes successfully
- ✅ Success message shows invoice count
- ✅ Orders removed from issue list

**Database Verification**:
```sql
SELECT i.id, i."orderId", i.total, i.status
FROM "Invoice" i
JOIN "Order" o ON o.id = i."orderId"
WHERE o.id IN ('order-uuid-1', 'order-uuid-2');
-- Should see new DRAFT invoices
```

---

### Test 9: Auto-Fix Execution (Reactivate Customers)

**Objective**: Test customer reactivation fix.

**Setup**:
```sql
-- Create closed customer with recent order
UPDATE "Customer"
SET "isPermanentlyClosed" = true,
    "lastOrderDate" = NOW() - INTERVAL '5 days'
WHERE id = (SELECT id FROM "Customer" LIMIT 1);
```

**Steps**:
1. Go to "Inactive Customers with Recent Orders" detail page
2. Select customers
3. Click "Fix Selected"
4. Verify success

**Expected Results**:
- ✅ Fix executes
- ✅ Customers reactivated
- ✅ `reactivatedDate` set

**Database Verification**:
```sql
SELECT id, name, "isPermanentlyClosed", "reactivatedDate", "riskStatus"
FROM "Customer"
WHERE id = 'customer-uuid';
-- isPermanentlyClosed should be false
-- reactivatedDate should be recent
-- riskStatus should be HEALTHY
```

---

### Test 10: Pagination

**Objective**: Test pagination with many records.

**Setup**:
Create 60+ test records to trigger pagination.

**Steps**:
1. Navigate to detail page with > 50 records
2. Verify shows "Page 1 of 2"
3. Click "Next" button
4. Verify page 2 loads
5. Click "Previous" button
6. Verify page 1 loads

**Expected Results**:
- ✅ Shows 50 records per page
- ✅ Pagination controls visible
- ✅ Next/Previous work correctly
- ✅ Page number updates in UI
- ✅ Disabled states work (can't go before 1 or after last)

---

### Test 11: History API

**Objective**: Test historical snapshot retrieval.

**Steps**:
1. Run manual check to create snapshot
2. Call API:
```bash
curl -X GET "http://localhost:3000/api/admin/data-integrity/history?days=7" \
  -H "Authorization: Bearer <token>"
```
3. Verify response contains snapshots array
4. Check each snapshot has:
   - date
   - qualityScore
   - totalIssues
   - criticalIssues
   - issuesByRule

**Expected Results**:
- ✅ API returns 200 OK
- ✅ Snapshots in chronological order
- ✅ All fields present
- ✅ Quality scores make sense

---

### Test 12: Specialized Fix Endpoints

**Objective**: Test dedicated fix endpoints.

**Test 12a: Assign Sales Reps**
```bash
curl -X POST http://localhost:3000/api/admin/data-integrity/fix/assign-sales-reps \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerIds": ["uuid1", "uuid2"],
    "salesRepId": "rep-uuid"
  }'
```

**Expected**: 200 OK, customers updated

**Test 12b: Create Invoices**
```bash
curl -X POST http://localhost:3000/api/admin/data-integrity/fix/create-invoices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderIds": ["uuid1", "uuid2"]
  }'
```

**Expected**: 200 OK, invoices created

**Test 12c: Reactivate Customers**
```bash
curl -X POST http://localhost:3000/api/admin/data-integrity/fix/reactivate-customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerIds": ["uuid1", "uuid2"]
  }'
```

**Expected**: 200 OK, customers reactivated

---

### Test 13: Error Handling

**Objective**: Verify proper error handling.

**Test 13a: Invalid Rule ID**
```bash
curl -X GET http://localhost:3000/api/admin/data-integrity/invalid-rule-id
```
**Expected**: 404 Not Found

**Test 13b: Missing Parameters**
```bash
curl -X POST http://localhost:3000/api/admin/data-integrity/customers-without-sales-rep/fix \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected**: 400 Bad Request

**Test 13c: Unauthorized Access**
```bash
curl -X GET http://localhost:3000/api/admin/data-integrity
# Without auth header
```
**Expected**: 401 Unauthorized

---

### Test 14: Performance

**Objective**: Verify acceptable performance.

**Test 14a: Dashboard Load Time**
- Should load in < 2 seconds with cache
- Should load in < 10 seconds without cache

**Test 14b: Manual Check Time**
- Small dataset (< 1000 records): < 5 seconds
- Medium dataset (< 10,000 records): < 30 seconds
- Large dataset (> 10,000 records): < 60 seconds

**Test 14c: Fix Execution Time**
- Bulk fix 10 records: < 2 seconds
- Bulk fix 100 records: < 10 seconds

**Monitoring**:
```javascript
// In browser console
performance.mark('start');
// Perform action
performance.mark('end');
performance.measure('action', 'start', 'end');
console.log(performance.getEntriesByName('action')[0].duration);
```

---

### Test 15: Multi-Tenant Isolation

**Objective**: Verify tenant data isolation.

**Setup**:
- Log in as admin for Tenant A
- Create test issues for Tenant A
- Note tenant A's issue counts

**Steps**:
1. View dashboard as Tenant A admin
2. Note issue counts
3. Log out
4. Log in as Tenant B admin
5. View dashboard
6. Verify Tenant B sees only their issues

**Expected Results**:
- ✅ Tenant A sees only their data
- ✅ Tenant B sees only their data
- ✅ No data leakage between tenants

**Database Verification**:
```sql
SELECT "tenantId", COUNT(*)
FROM "DataIntegritySnapshot"
GROUP BY "tenantId";
-- Each tenant should have separate snapshots
```

---

### Test 16: Audit Trail

**Objective**: Verify all fixes are logged.

**Steps**:
1. Execute any fix action
2. Query audit log:
```sql
SELECT
  "userId",
  "entityType",
  "entityId",
  "action",
  "changes",
  "createdAt"
FROM "AuditLog"
WHERE "entityType" = 'DataIntegrity'
ORDER BY "createdAt" DESC
LIMIT 5;
```
3. Verify entry exists with:
   - Correct user ID
   - Action = 'FIX'
   - Changes include rule ID and record IDs

**Expected Results**:
- ✅ Audit entry created
- ✅ User tracked correctly
- ✅ All details captured

---

### Test 17: No Issues State

**Objective**: Test display when no issues found.

**Setup**:
Fix all existing issues or use clean database.

**Steps**:
1. Navigate to dashboard
2. Run fresh check
3. Verify "No Issues Found" message displays
4. Check green success icon shows
5. Verify all alert cards show 0 count

**Expected Results**:
- ✅ Success message displays
- ✅ Green checkmark icon visible
- ✅ Quality score = 100%
- ✅ No alert cards shown (or all 0)

**Screenshot Location**: `screenshots/test17-no-issues.png`

---

### Test 18: Cache Behavior

**Objective**: Verify 5-minute cache works correctly.

**Steps**:
1. Load dashboard (fresh check)
2. Note `cached: false` in response
3. Refresh page within 5 minutes
4. Verify `cached: true` in response
5. Check data identical
6. Wait 6 minutes
7. Refresh page
8. Verify fresh check runs

**Expected Results**:
- ✅ First load runs fresh check
- ✅ Subsequent loads use cache
- ✅ Cache expires after 5 minutes
- ✅ Manual check bypasses cache

---

### Test 19: Browser Compatibility

**Objective**: Test across browsers.

**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Steps** (for each browser):
1. Load dashboard
2. Navigate to detail page
3. Execute a fix
4. Verify all functionality works

**Expected Results**:
- ✅ Identical behavior across browsers
- ✅ No console errors
- ✅ Proper styling

---

### Test 20: Mobile Responsiveness

**Objective**: Test mobile view.

**Steps**:
1. Open dashboard in mobile viewport (375px width)
2. Verify layout adjusts:
   - Summary cards stack vertically
   - Alert cards are readable
   - Buttons accessible
3. Navigate to detail page
4. Verify table is scrollable
5. Test fix functionality

**Expected Results**:
- ✅ Dashboard readable on mobile
- ✅ No horizontal scroll (except tables)
- ✅ Touch targets adequate size
- ✅ All functionality works

**Screenshot Location**: `screenshots/test20-mobile.png`

---

## Regression Testing

Run these tests after any code changes:

### Quick Smoke Test (5 minutes)
1. Load dashboard ✓
2. Run manual check ✓
3. View one detail page ✓
4. Execute one fix ✓

### Full Test Suite (30 minutes)
- Run all 20 tests above

---

## Performance Benchmarks

### Expected Metrics

| Action | Target Time | Max Time |
|--------|-------------|----------|
| Dashboard load (cached) | < 1s | 2s |
| Dashboard load (fresh) | < 5s | 10s |
| Manual check (< 1k records) | < 3s | 5s |
| Manual check (10k records) | < 15s | 30s |
| Detail page load | < 2s | 5s |
| Fix execution (10 records) | < 1s | 2s |
| Fix execution (100 records) | < 5s | 10s |

---

## Known Issues

Document any issues found during testing:

1. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Reproduction**: Steps to reproduce
   - **Workaround**: Temporary solution if available
   - **Status**: Open/In Progress/Fixed

---

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Remove test customers
DELETE FROM "Customer" WHERE "name" LIKE 'Test%';

-- Remove test snapshots
DELETE FROM "DataIntegritySnapshot"
WHERE "snapshotDate" > NOW() - INTERVAL '1 hour';

-- Clear test audit logs
DELETE FROM "AuditLog"
WHERE "entityType" = 'DataIntegrity'
AND "createdAt" > NOW() - INTERVAL '1 hour';
```

---

## Sign-Off Checklist

Before marking Phase 9 complete:

- [ ] All 20 tests pass
- [ ] No console errors
- [ ] No database errors
- [ ] Performance within targets
- [ ] Mobile responsive
- [ ] Cross-browser compatible
- [ ] Audit logging works
- [ ] Multi-tenant isolation verified
- [ ] Documentation complete
- [ ] Screenshots captured
- [ ] Known issues documented

---

## Support

For testing questions:
- Review test results in `test-results/phase9/`
- Check browser console for errors
- Query audit logs for fix history
- Contact development team with specific test failure details
