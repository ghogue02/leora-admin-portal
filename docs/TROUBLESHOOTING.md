# Troubleshooting Guide

## Common Issues and Solutions

---

## Authentication & Access

### Cannot Access Admin Portal

**Symptoms**:
- Redirected to login page when accessing `/admin`
- "Access Denied" message
- 403 Forbidden error

**Possible Causes**:
1. Not logged in
2. Don't have `sales.admin` role
3. Account is inactive
4. Session expired

**Solutions**:

**Check 1: Verify Login Status**
```bash
# Check if you're logged in
curl https://api.leora2.com/api/auth/me \
  -H "Cookie: session=YOUR_SESSION"
```

**Check 2: Verify Role**
1. Log in to the application
2. Navigate to your profile
3. Check if "sales.admin" is in your roles
4. If not, contact your administrator

**Check 3: Verify Account Status**
```sql
-- Run in database console
SELECT id, email, "isActive" FROM "User" WHERE email = 'your@email.com';
```
If `isActive` is `false`, contact administrator to reactivate.

**Check 4: Clear Session and Re-login**
1. Clear browser cookies
2. Close all browser tabs
3. Re-open browser
4. Log in again

---

## Data Loading Issues

### Dashboard Metrics Not Loading

**Symptoms**:
- Dashboard shows loading spinner indefinitely
- Metrics show as 0 or "N/A"
- Error in browser console

**Solutions**:

**Check 1: Verify Database Connection**
```bash
# Check if API is responding
curl https://api.leora2.com/api/health
```

**Check 2: Check Browser Console**
1. Press F12 to open DevTools
2. Click "Console" tab
3. Look for error messages
4. Share errors with support team

**Check 3: Clear Cache**
1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page (F5)

**Check 4: Check Database Logs**
```bash
# View recent logs
tail -f /var/log/leora2/api.log | grep ERROR
```

---

### List Pages Show No Results

**Symptoms**:
- Customer list is empty
- Order list shows no records
- "No results found" message

**Possible Causes**:
1. Filters are too restrictive
2. Wrong tenant
3. Data not migrated
4. Database query error

**Solutions**:

**Check 1: Clear All Filters**
1. Click "Clear Filters" button
2. Refresh page
3. If results appear, filters were too restrictive

**Check 2: Verify Tenant**
```sql
-- Check current user's tenant
SELECT u.email, u."tenantId", t.slug, t.name
FROM "User" u
JOIN "Tenant" t ON u."tenantId" = t.id
WHERE u.email = 'your@email.com';
```

**Check 3: Verify Data Exists**
```sql
-- Check if customers exist for your tenant
SELECT COUNT(*) FROM "Customer"
WHERE "tenantId" = 'YOUR_TENANT_ID';
```

**Check 4: Check API Logs**
```bash
# Look for query errors
grep "prisma" /var/log/leora2/api.log | tail -n 50
```

---

## Form & Save Issues

### Changes Not Saving

**Symptoms**:
- Click "Save" but changes don't persist
- Form shows loading spinner then resets
- No success/error message

**Solutions**:

**Check 1: Look for Validation Errors**
1. Scroll through entire form
2. Look for red error messages
3. Fix all validation errors
4. Try saving again

**Check 2: Check Network Tab**
1. Press F12 to open DevTools
2. Click "Network" tab
3. Click "Save" button
4. Look for failed requests (red)
5. Click failed request to see error details

**Check 3: Verify Required Fields**
- Ensure all required fields (marked with *) are filled
- Check for proper format (email, phone, etc.)
- Remove special characters if causing issues

**Check 4: Check Session**
```bash
# Verify session is still valid
curl https://api.leora2.com/api/auth/me \
  -H "Cookie: session=YOUR_SESSION"
```
If session expired, log out and log back in.

---

### Unsaved Changes Warning Won't Go Away

**Symptoms**:
- Yellow banner shows "You have unsaved changes"
- Banner persists after saving
- Can't navigate away

**Solutions**:

**Solution 1: Force Save**
1. Press Ctrl+S (or Cmd+S)
2. Wait for success message
3. Refresh page

**Solution 2: Discard Changes**
1. Refresh page (F5)
2. Click "Leave" when prompted
3. Changes will be discarded

**Solution 3: Clear Browser State**
1. Close the tab
2. Open new tab
3. Navigate to same page
4. Changes will be discarded

---

## Search Issues

### Global Search Not Working

**Symptoms**:
- Press Ctrl+K but nothing happens
- Search shows "No results found" for known items
- Search modal doesn't open

**Solutions**:

**Check 1: Verify Keyboard Shortcut**
- Mac: Use Cmd+K (not Ctrl+K)
- Windows/Linux: Use Ctrl+K
- Try clicking search icon in header instead

**Check 2: Check Search Query Length**
- Minimum 2 characters required
- Type at least 2 characters
- Wait 300ms for debounce

**Check 3: Verify Search Index**
```sql
-- Check if data has searchable fields
SELECT "accountNumber", "accountName", "billingEmail"
FROM "Customer"
WHERE "accountName" ILIKE '%search_term%'
LIMIT 5;
```

**Check 4: Check API Endpoint**
```bash
curl "https://api.leora2.com/api/admin/search?q=test" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Bulk Operations

### Bulk Reassignment Failed

**Symptoms**:
- Some customers reassigned, others not
- "Partial failure" message
- Inconsistent results

**Solutions**:

**Check 1: Review Audit Logs**
1. Navigate to Audit Logs
2. Filter by recent time range
3. Look for successful reassignments
4. Identify which customers failed

**Check 2: Check Individual Customers**
```sql
-- Verify customer assignments
SELECT c.id, c."accountName", c."salesRepId", sr."userId"
FROM "Customer" c
LEFT JOIN "SalesRep" sr ON c."salesRepId" = sr.id
WHERE c.id IN ('uuid1', 'uuid2', 'uuid3');
```

**Check 3: Retry Failed Items**
1. Identify failed customer IDs from error message
2. Select only those customers
3. Run bulk reassignment again

**Check 4: Check Permissions**
- Verify you have permission to modify customers
- Verify target sales rep is active
- Verify customers are in your tenant

---

## Performance Issues

### Pages Loading Slowly

**Symptoms**:
- Lists take > 5 seconds to load
- Forms are sluggish
- Buttons unresponsive

**Solutions**:

**Check 1: Reduce Page Size**
1. Change "Per page" dropdown to smaller number (25 or 50)
2. Results should load faster

**Check 2: Clear Filters**
1. Some filter combinations are slow
2. Clear all filters
3. Apply filters one at a time to identify slow one

**Check 3: Check Network**
```bash
# Test latency
ping api.leora2.com

# Test bandwidth
curl -o /dev/null -w '%{time_total}' https://api.leora2.com/api/health
```

**Check 4: Check Database Performance**
```sql
-- Check for slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Check 5: Add Indexes** (Admin only)
```sql
-- Example: Add index to speed up customer search
CREATE INDEX IF NOT EXISTS "Customer_accountName_idx"
ON "Customer"("accountName");
```

---

## Export Issues

### Export Taking Too Long

**Symptoms**:
- Export shows "Processing" for > 5 minutes
- Export never completes
- Download link never appears

**Solutions**:

**Check 1: Reduce Export Size**
1. Apply filters to reduce record count
2. Export smaller batches
3. Export specific columns only

**Check 2: Check Export Status**
```bash
curl https://api.leora2.com/api/admin/export/EXPORT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check 3: Check Background Jobs**
```bash
# Check if job processor is running
ps aux | grep "job-processor"

# Check job logs
tail -f /var/log/leora2/jobs.log
```

**Check 4: Cancel and Retry**
1. Refresh the page
2. Try export again
3. If still fails, export in smaller batches

---

### Exported File is Corrupt

**Symptoms**:
- CSV won't open in Excel
- Data is garbled
- Missing columns

**Solutions**:

**Check 1: Try Different Program**
1. If Excel fails, try Google Sheets
2. If Google Sheets fails, try text editor
3. Check if data is actually corrupt or just formatting issue

**Check 2: Re-export**
1. Clear browser cache
2. Try export again
3. Download to different location

**Check 3: Check File Encoding**
```bash
# Check file encoding
file -I exported_file.csv

# Convert encoding if needed
iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
```

---

## Audit Log Issues

### Can't Find Recent Change

**Symptoms**:
- Made a change but don't see it in audit logs
- Audit log missing entries
- Filters not showing expected results

**Solutions**:

**Check 1: Verify Time Range**
1. Audit logs default to last 30 days
2. Extend date range if change was older
3. Clear date filters to see all

**Check 2: Check Entity Type**
1. Ensure correct entity type selected
2. Try "All" entity types
3. Some changes logged under different entity type

**Check 3: Verify Audit Logging Enabled**
```sql
-- Check if audit logs exist
SELECT COUNT(*) FROM "AuditLog"
WHERE "createdAt" > NOW() - INTERVAL '1 day';
```

**Check 4: Check User Filter**
1. Remove user filter
2. Some changes may be system-initiated
3. `userId` may be NULL for automated changes

---

## Mobile Issues

### Can't Access Admin Portal on Mobile

**Symptoms**:
- Layout broken on phone
- Buttons too small
- Sidebar won't open

**Solutions**:

**Check 1: Use Desktop Mode**
1. Open browser menu
2. Select "Request Desktop Site"
3. Page should render properly

**Check 2: Use Tablet or Desktop**
- Admin portal optimized for desktop/tablet
- Some features require larger screen
- Use tablet (min 768px width) or desktop

**Check 3: Update Browser**
1. Check for browser updates
2. Some features require modern browser
3. Try Chrome or Safari

---

## Database Issues

### Integrity Check Failed

**Symptoms**:
- Data integrity check shows errors
- Quality score below 90%
- Critical issues found

**Solutions**:

**Check 1: Review Issues**
1. Navigate to Data Integrity page
2. Click on each issue to see details
3. Understand what's wrong

**Check 2: Apply Auto-Fixes**
1. If "Auto-Fix Available" shown:
2. Click "Apply Fix" button
3. Verify fix worked
4. Re-run integrity check

**Check 3: Manual Fixes**
For issues without auto-fix:
1. Note the entity ID
2. Navigate to entity detail page
3. Fix the data manually
4. Re-run check to verify

**Check 4: Contact Support**
For critical issues you can't fix:
1. Export integrity report
2. Email to support@leora2.com
3. Include tenant ID and issue details

---

## How to Check Logs

### Application Logs
```bash
# API logs
tail -f /var/log/leora2/api.log

# Filter for errors
tail -f /var/log/leora2/api.log | grep ERROR

# Search for specific user
grep "user@email.com" /var/log/leora2/api.log
```

### Database Logs
```bash
# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log

# Slow queries
grep "duration:" /var/log/postgresql/postgresql-*.log | grep "ms"
```

### Browser Console
1. Press F12 (or Cmd+Option+I on Mac)
2. Click "Console" tab
3. Look for red error messages
4. Copy full error text for support

### Network Tab
1. Press F12
2. Click "Network" tab
3. Reproduce the issue
4. Look for failed requests (red)
5. Click request to see details
6. Share request/response with support

---

## Database Verification Commands

### Check Data Counts
```sql
-- Count customers
SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = 'YOUR_TENANT_ID';

-- Count orders
SELECT COUNT(*) FROM "Order" WHERE "tenantId" = 'YOUR_TENANT_ID';

-- Count users
SELECT COUNT(*) FROM "User" WHERE "tenantId" = 'YOUR_TENANT_ID';
```

### Check for Orphaned Records
```sql
-- Orders without customers
SELECT COUNT(*) FROM "Order" o
WHERE NOT EXISTS (
  SELECT 1 FROM "Customer" c WHERE c.id = o."customerId"
);

-- Customers without sales reps (where assigned)
SELECT COUNT(*) FROM "Customer" c
WHERE c."salesRepId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM "SalesRep" sr WHERE sr.id = c."salesRepId"
);
```

### Check Data Quality
```sql
-- Customers with missing required fields
SELECT COUNT(*) FROM "Customer"
WHERE "accountName" IS NULL OR "billingEmail" IS NULL;

-- Orders with invalid status
SELECT COUNT(*) FROM "Order"
WHERE "status" NOT IN ('DRAFT', 'SUBMITTED', 'FULFILLED', 'CANCELLED');
```

---

## When to Contact Support

Contact support@leora2.com if:

1. **Data Loss**: Records disappeared or deleted unexpectedly
2. **Security Concern**: Unauthorized access or suspicious activity
3. **Persistent Errors**: Same error occurs repeatedly despite fixes
4. **Performance Degradation**: System unusably slow
5. **Data Corruption**: Data showing incorrect values
6. **Access Issues**: Can't access system at all
7. **Integration Failures**: Webhook or API integration broken

**What to Include in Support Request**:
- Your email address
- Tenant ID
- Timestamp of issue
- Steps to reproduce
- Screenshots or error messages
- Browser console logs
- Network request details (if applicable)

---

## Self-Service Diagnostics

### Run Health Check
```bash
curl https://api.leora2.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-19T10:00:00Z"
}
```

### Verify Database Connection
```sql
SELECT NOW();
```
Should return current timestamp.

### Check API Version
```bash
curl https://api.leora2.com/api/version
```

### Test Authentication
```bash
curl https://api.leora2.com/api/auth/me \
  -H "Cookie: session=YOUR_SESSION"
```

---

**Last Updated**: 2025-10-19
**Version**: 1.0
