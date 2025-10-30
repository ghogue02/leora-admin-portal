# Phase 9: Data Integrity & Validation - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run Database Migration

```sql
-- Connect to your database and run:
\i /web/migrations/add_data_integrity_snapshot.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Paste the contents of `add_data_integrity_snapshot.sql`
3. Click "Run"

### Step 2: Generate Prisma Client

```bash
cd web
npx prisma generate
```

### Step 3: Access the Dashboard

Navigate to: **`https://your-domain/admin/data-integrity`**

You should see the Data Integrity Dashboard with:
- Quality Score card
- Total Issues count
- Critical Issues count
- Last Checked timestamp
- List of alerts (if any issues found)

### Step 4: Run Your First Check

1. Click the **"Run Check Now"** button
2. Wait 10-30 seconds (depending on data size)
3. Dashboard will refresh with results

### Step 5: Fix Your First Issue

1. Find an alert card with issues
2. Click **"View & Fix"** button
3. Review affected records
4. Select records to fix (checkbox)
5. Click **"Fix Selected"** button
6. Enter any required parameters (e.g., sales rep ID)
7. Confirm and wait for success message

**Done!** You've fixed your first data integrity issue.

---

## 📊 What Gets Checked

The system automatically checks for:

### 🔴 High Severity (Fix Immediately)
- Customers without sales reps
- Orders missing invoices
- Customers without email addresses
- Invoice amount mismatches
- Duplicate customer entries
- Orders with negative totals
- Orphaned portal users

### 🟡 Medium Severity (Fix Soon)
- Inactive customers with recent orders
- Sales reps with no customers
- Users without roles
- Inventory missing locations

### 🔵 Low Severity (Optimize)
- Out-of-stock products in price lists

---

## 🛠️ Common Fixes

### Fix: Customers Without Sales Rep

**Problem**: Active customers have no assigned sales representative

**Solution**:
1. Go to "Customers Without Sales Rep" detail page
2. Select customers
3. Click "Fix Selected"
4. Enter sales rep ID when prompted
5. Customers now have assigned rep

### Fix: Orders Without Invoice

**Problem**: Fulfilled orders don't have invoices

**Solution**:
1. Go to "Orders Without Invoice" detail page
2. Select orders
3. Click "Fix Selected"
4. Invoices automatically created

### Fix: Reactivate Closed Customers

**Problem**: Customers marked closed but still ordering

**Solution**:
1. Go to "Inactive Customers with Recent Orders"
2. Select customers to reactivate
3. Click "Fix Selected"
4. Customers reactivated and risk status reset

---

## 📈 Understanding Quality Score

**Quality Score** = 100 - (issues / total_records × 50)

### Score Ranges:
- **90-100** 🟢 Excellent - Keep up the good work!
- **70-89** 🟡 Good - A few issues to address
- **0-69** 🔴 Needs Attention - Fix critical issues ASAP

---

## 🔄 Scheduling Automated Checks

### Option 1: Cron Job (Recommended)

Add to your crontab:
```cron
# Run daily at 2 AM
0 2 * * * cd /path/to/web && node -r ts-node/register src/lib/jobs/data-integrity-check.ts
```

### Option 2: Node Scheduler

Add to your app:
```typescript
import { scheduledIntegrityCheck } from '@/lib/jobs/data-integrity-check';

// Run daily at 2 AM
const schedule = require('node-schedule');
schedule.scheduleJob('0 2 * * *', () => {
  scheduledIntegrityCheck().catch(console.error);
});
```

---

## 🔍 API Usage

### Get Current Status
```bash
curl https://your-api/api/admin/data-integrity
```

### Trigger Manual Check
```bash
curl -X POST https://your-api/api/admin/data-integrity/run-check
```

### Get Historical Data
```bash
curl https://your-api/api/admin/data-integrity/history?days=30
```

See **PHASE9-API-REFERENCE.md** for complete API documentation.

---

## 📱 Dashboard Features

### Summary Cards
- **Quality Score**: Overall data health (0-100%)
- **Total Issues**: Sum of all problems found
- **Critical Issues**: High-severity issues only
- **Last Checked**: Timestamp of last validation run

### Alert Cards
Each alert shows:
- **Icon**: Severity indicator (X, ⚠️, or ℹ️)
- **Count Badge**: Number of issues
- **Title**: Rule name
- **Description**: What's being checked
- **Severity Badge**: High/Medium/Low
- **Action Button**: View & Fix or View Details

### Issue Detail Pages
- **Header**: Rule info and severity
- **Table**: All affected records
- **Checkboxes**: Bulk selection
- **Fix Button**: Execute auto-fix
- **Pagination**: 50 records per page

---

## 🎯 Best Practices

### 1. Monitor Regularly
- Check dashboard daily
- Focus on critical issues first
- Track quality score trends

### 2. Fix Proactively
- Address issues as they appear
- Don't let problems accumulate
- Use bulk fixes for efficiency

### 3. Review Before Fixing
- Always review affected records
- Understand the issue
- Verify fix is appropriate

### 4. Schedule Off-Peak
- Run automated checks during low-traffic hours
- Avoid peak business times
- Minimize performance impact

### 5. Track Progress
- Monitor quality score over time
- Celebrate improvements
- Set team goals (e.g., maintain 95%+ score)

---

## 🚨 Troubleshooting

### Issue: Dashboard shows "Network error"
**Solution**: Check you're logged in as admin and session is valid

### Issue: "Run Check Now" times out
**Solution**: Your database may be slow. Add indexes or schedule checks during off-peak hours

### Issue: Fix fails
**Solution**: Check the error message, verify you have required permissions, review audit log

### Issue: Wrong issue count
**Solution**: Click "Run Check Now" to refresh data, clear browser cache

---

## 📚 Additional Resources

- **Full Documentation**: `PHASE9-IMPLEMENTATION-SUMMARY.md`
- **API Reference**: `PHASE9-API-REFERENCE.md`
- **Testing Guide**: `PHASE9-TESTING-GUIDE.md`
- **Validation Rules**: `/web/src/lib/validation/rules.ts`

---

## 💡 Tips

1. **Start Small**: Fix one type of issue at a time
2. **Use Bulk Actions**: Select multiple records for efficiency
3. **Check History**: Monitor quality score trends
4. **Set Alerts**: Watch for critical issues
5. **Review Audit Logs**: Track all fixes made

---

## ✅ Quick Checklist

- [ ] Migration run
- [ ] Prisma client generated
- [ ] Dashboard accessible
- [ ] Manual check works
- [ ] Can view issue details
- [ ] Can execute fixes
- [ ] Automated checks scheduled (optional)
- [ ] Team trained on usage

---

## 🎉 Success!

You're now ready to maintain high data quality in your system!

**Next Steps**:
1. Run your first manual check
2. Fix any critical issues
3. Schedule automated checks
4. Monitor quality score weekly
5. Set team goal for 95%+ quality score

---

## 📞 Support

Questions? Check:
1. This quick start guide
2. Full documentation (PHASE9-IMPLEMENTATION-SUMMARY.md)
3. API reference (PHASE9-API-REFERENCE.md)
4. Testing guide (PHASE9-TESTING-GUIDE.md)
5. Audit logs in database
