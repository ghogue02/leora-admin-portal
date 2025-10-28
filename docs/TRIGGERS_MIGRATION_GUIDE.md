# Automated Triggers - Migration Guide

## Pre-Migration Checklist

- [ ] Backup database
- [ ] Review schema changes
- [ ] Test in development environment
- [ ] Schedule maintenance window (if needed)
- [ ] Notify stakeholders

## Step-by-Step Migration

### Step 1: Apply Database Migration

```bash
cd /Users/greghogue/Leora2/web

# Generate migration
npx prisma migrate dev --name add_automated_triggers

# Verify migration
npx prisma studio
```

**Expected Changes:**
- New table: `AutomatedTrigger`
- New table: `TriggeredTask`
- New enum: `TriggerType`
- Customer table: Added `doNotContactUntil` column
- Task table: Added `triggeredTasks` relation
- Tenant table: Added trigger relations
- SampleUsage table: Already has fields needed
- SampleFeedbackTemplate table: Created by schema
- SampleMetrics table: Created by schema

### Step 2: Seed Default Data

```bash
# Get your tenant ID (from database or admin panel)
TENANT_ID="your-tenant-id-here"

# Run seed script
ts-node scripts/seed-default-triggers.ts $TENANT_ID
```

**This creates:**
- 4 default triggers (7-day sample, 30-day sample, first order, burn rate)
- 13 feedback templates (5 positive, 4 negative, 4 neutral)

### Step 3: Verify Installation

```bash
# Run unit tests
npm test automated-triggers

# Test background job
ts-node src/jobs/process-triggers.ts $TENANT_ID
```

**Expected output:**
```
[Triggers] Processing triggers for tenant <id>
[Triggers] Created X tasks across Y triggers
```

### Step 4: Configure Cron Job

**Option A: System Cron**

```bash
# Edit crontab
crontab -e

# Add line (runs every 6 hours)
0 */6 * * * cd /Users/greghogue/Leora2/web && ts-node src/jobs/process-triggers.ts >> /var/log/triggers.log 2>&1
```

**Option B: Node Cron (if using process manager)**

Install node-cron:
```bash
npm install node-cron @types/node-cron
```

Create scheduler (`/src/scheduler.ts`):
```typescript
import cron from 'node-cron';
import { processTriggersForAllTenants } from './jobs/process-triggers';

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[Scheduler] Running trigger processing job');
  try {
    await processTriggersForAllTenants();
  } catch (error) {
    console.error('[Scheduler] Job failed:', error);
  }
});
```

**Option C: Cloud Scheduler (e.g., AWS EventBridge)**

Create Lambda/Cloud Function:
```typescript
export async function handler(event: any) {
  const response = await fetch('https://your-app.com/api/jobs/process-triggers', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
  });
  return await response.json();
}
```

### Step 5: Access Admin UI

1. Navigate to: `http://localhost:3000/sales/admin/triggers`
2. Verify triggers are listed
3. Test creating a new trigger
4. Click "Run Now" to test manual execution

### Step 6: Monitor Initial Runs

**Check Logs:**
```bash
# Application logs
tail -f /var/log/triggers.log

# Or if using PM2
pm2 logs
```

**Check Database:**
```sql
-- View created triggered tasks
SELECT
  tt.id,
  tt."triggeredAt",
  t.title as task_title,
  c.name as customer_name,
  at.name as trigger_name
FROM "TriggeredTask" tt
JOIN "Task" t ON t.id = tt."taskId"
JOIN "Customer" c ON c.id = tt."customerId"
JOIN "AutomatedTrigger" at ON at.id = tt."triggerId"
ORDER BY tt."triggeredAt" DESC
LIMIT 20;
```

**Check Audit Logs:**
```sql
SELECT *
FROM "AuditLog"
WHERE "entityType" = 'AutomatedTrigger'
ORDER BY "createdAt" DESC
LIMIT 20;
```

## Post-Migration Tasks

### Week 1: Observation

- [ ] Monitor trigger execution daily
- [ ] Review tasks created vs expected
- [ ] Check for duplicate tasks
- [ ] Verify assignments to correct sales reps
- [ ] Gather feedback from sales team

### Week 2: Optimization

- [ ] Adjust `daysAfter` values based on results
- [ ] Tune priority levels
- [ ] Refine task templates
- [ ] Update trigger thresholds
- [ ] Disable underperforming triggers

### Month 1: Analysis

- [ ] Calculate completion rates
- [ ] Measure impact on sales follow-through
- [ ] Identify most effective triggers
- [ ] Document lessons learned
- [ ] Create custom triggers for special cases

## Rollback Plan

### If Issues Occur

**Option 1: Disable Triggers**

```sql
-- Disable all triggers temporarily
UPDATE "AutomatedTrigger"
SET "isActive" = false
WHERE "tenantId" = 'your-tenant-id';
```

**Option 2: Stop Cron Job**

```bash
# Remove from crontab
crontab -e
# Comment out or delete the trigger job line
```

**Option 3: Full Rollback**

```bash
# Revert migration
npx prisma migrate resolve --rolled-back add_automated_triggers

# Or create down migration
npx prisma migrate dev --name rollback_automated_triggers
```

Down migration SQL:
```sql
-- Drop tables
DROP TABLE IF EXISTS "TriggeredTask";
DROP TABLE IF EXISTS "AutomatedTrigger";
DROP TABLE IF EXISTS "SampleFeedbackTemplate";
DROP TABLE IF EXISTS "SampleMetrics";

-- Drop enum
DROP TYPE IF EXISTS "TriggerType";

-- Remove customer column
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "doNotContactUntil";
```

## Troubleshooting

### Problem: No Tasks Being Created

**Diagnosis:**
```sql
-- Check active triggers
SELECT * FROM "AutomatedTrigger" WHERE "isActive" = true;

-- Check sample data
SELECT * FROM "SampleUsage"
WHERE "followedUpAt" IS NULL
AND "resultedInOrder" = false
AND "tastedAt" < NOW() - INTERVAL '7 days';
```

**Solution:**
1. Verify triggers are active
2. Check configuration values
3. Ensure sample data exists
4. Review job logs for errors

### Problem: Duplicate Tasks

**Diagnosis:**
```sql
-- Find duplicate triggered tasks
SELECT "customerId", "triggerId", COUNT(*)
FROM "TriggeredTask"
GROUP BY "customerId", "triggerId"
HAVING COUNT(*) > 1;
```

**Solution:**
1. Check TriggeredTask creation logic
2. Verify findFirst queries
3. Add unique constraint if needed

### Problem: Tasks Not Assigned

**Diagnosis:**
```sql
-- Check customers without sales reps
SELECT id, name FROM "Customer"
WHERE "salesRepId" IS NULL;
```

**Solution:**
1. Assign customers to sales reps
2. Update trigger config to handle unassigned
3. Create default assignee fallback

### Problem: Performance Issues

**Diagnosis:**
```sql
-- Check trigger statistics
SELECT
  at.name,
  COUNT(tt.id) as total_tasks,
  AVG(EXTRACT(EPOCH FROM (t."createdAt" - tt."triggeredAt"))) as avg_creation_time_seconds
FROM "AutomatedTrigger" at
LEFT JOIN "TriggeredTask" tt ON tt."triggerId" = at.id
LEFT JOIN "Task" t ON t.id = tt."taskId"
GROUP BY at.id, at.name;
```

**Solution:**
1. Add database indexes
2. Optimize trigger queries
3. Process tenants in batches
4. Increase job frequency to spread load

## Best Practices

### 1. Start Conservative

Begin with:
- Longer timeframes (7-14 days)
- Lower priorities
- Fewer active triggers
- Manual review of first batch

### 2. Monitor Metrics

Track:
- Tasks created per trigger
- Completion rates
- Time to completion
- Sales rep satisfaction

### 3. Iterate Quickly

- Weekly reviews for first month
- A/B test different configs
- Gather sales team feedback
- Adjust based on data

### 4. Document Changes

Keep log of:
- Config modifications
- Performance observations
- Business impact
- Team feedback

## Support Resources

- **Full Documentation:** `/docs/TRIGGERS_SYSTEM.md`
- **Implementation Summary:** `/docs/TRIGGERS_IMPLEMENTATION_SUMMARY.md`
- **Test Examples:** `/src/lib/__tests__/automated-triggers.test.ts`
- **Seed Script:** `/scripts/seed-default-triggers.ts`

## Success Metrics

Track these KPIs:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Sample Conversion Rate | +15% | Compare before/after trigger implementation |
| Follow-up Completion Rate | >80% | TriggeredTask completion rate |
| Time to Follow-up | <24 hours | Average task completion time |
| Sales Rep Satisfaction | >4/5 | Survey after 1 month |
| Task Accuracy | >95% | Manual review of triggered tasks |

## Contact

For migration support:
- Technical issues: Check logs and audit trail
- Business questions: Review documentation
- Urgent problems: Disable triggers via UI or SQL
