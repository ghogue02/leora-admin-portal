# AccountHealthSnapshot Usage Guide

## Quick Reference

### Accessing Snapshots

```sql
-- Get all snapshots for a customer
SELECT *
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND "customerId" = '<customer-id>'
ORDER BY "snapshotDate" DESC;

-- Get latest snapshot for all customers
SELECT
  c.name,
  ahs."revenueScore",
  ahs."cadenceScore",
  ahs."sampleUtilization",
  ahs.notes
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
ORDER BY ahs."snapshotDate" DESC;
```

## Common Queries

### 1. Find At-Risk Customers

```sql
SELECT
  c.name,
  c.billingEmail,
  ahs."cadenceScore",
  ahs.notes
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ahs."cadenceScore" < 40
  AND ahs."revenueScore" > 0  -- Has ordered before
ORDER BY ahs."cadenceScore" ASC;
```

### 2. Find High-Value Active Customers

```sql
SELECT
  c.name,
  c.state,
  ahs."revenueScore",
  ahs."cadenceScore",
  (ahs."revenueScore" + ahs."cadenceScore") / 2 as health_score
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ahs."revenueScore" >= 70
  AND ahs."cadenceScore" >= 70
ORDER BY health_score DESC;
```

### 3. Find Customers Who Never Ordered

```sql
SELECT
  c.name,
  c.city,
  c.state,
  c.billingEmail,
  c."createdAt"
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ahs.notes = 'No orders yet'
ORDER BY c."createdAt" DESC;
```

### 4. Geographic Performance Analysis

```sql
SELECT
  c.state,
  COUNT(*) as customer_count,
  ROUND(AVG(ahs."revenueScore"), 2) as avg_revenue_score,
  ROUND(AVG(ahs."cadenceScore"), 2) as avg_cadence_score,
  COUNT(CASE WHEN ahs."revenueScore" >= 70 THEN 1 END) as high_performers
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND c.state IS NOT NULL
GROUP BY c.state
HAVING COUNT(*) >= 5
ORDER BY avg_revenue_score DESC;
```

### 5. Create Customer Segments

```sql
SELECT
  CASE
    WHEN ahs."revenueScore" = 0 AND ahs."cadenceScore" = 0 THEN 'Never Ordered'
    WHEN ahs."revenueScore" >= 70 AND ahs."cadenceScore" >= 70 THEN 'VIP Customers'
    WHEN ahs."revenueScore" >= 50 AND ahs."cadenceScore" >= 50 THEN 'Active Customers'
    WHEN ahs."revenueScore" >= 30 AND ahs."cadenceScore" < 40 THEN 'At Risk'
    WHEN ahs."revenueScore" > 0 AND ahs."cadenceScore" < 30 THEN 'Churned'
    ELSE 'Low Engagement'
  END as segment,
  COUNT(*) as customer_count,
  ROUND(AVG(ahs."revenueScore"), 2) as avg_revenue,
  ROUND(AVG(ahs."cadenceScore"), 2) as avg_cadence
FROM "AccountHealthSnapshot" ahs
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY segment
ORDER BY customer_count DESC;
```

## Interpreting Scores

### Revenue Score (0-100)

| Range | Interpretation | Action |
|-------|----------------|--------|
| 80-100 | Excellent revenue contributor | Maintain relationship, upsell opportunities |
| 60-79 | Good revenue contributor | Nurture and grow |
| 40-59 | Fair revenue | Identify growth opportunities |
| 20-39 | Low revenue | Understand barriers, provide support |
| 0-19 | Very low/no revenue | Re-engagement campaign needed |

### Cadence Score (0-100)

| Range | Interpretation | Action |
|-------|----------------|--------|
| 80-100 | Excellent ordering consistency | Continue excellent service |
| 60-79 | Good ordering pattern | Monitor for changes |
| 40-59 | Irregular pattern | Investigate causes |
| 20-39 | At risk of churn | Proactive outreach needed |
| 0-19 | Inactive or churned | Win-back campaign |

### Sample Utilization (0-100)

| Range | Interpretation | Action |
|-------|----------------|--------|
| 80-100 | High sample usage | Likely to convert to sales |
| 40-79 | Moderate usage | Encourage trial of new products |
| 0-39 | Low usage | Promote sample program |

## Integration Examples

### TypeScript/Prisma

```typescript
// Get customer health snapshot
const snapshot = await prisma.accountHealthSnapshot.findFirst({
  where: {
    tenantId,
    customerId,
  },
  orderBy: {
    snapshotDate: 'desc',
  },
  include: {
    customer: {
      select: {
        name: true,
        billingEmail: true,
        state: true,
      },
    },
  },
});

// Calculate overall health score
const healthScore = snapshot
  ? (snapshot.revenueScore + snapshot.cadenceScore + snapshot.sampleUtilization) / 3
  : 0;

// Determine customer segment
function getCustomerSegment(snapshot) {
  if (!snapshot) return 'unknown';

  const { revenueScore, cadenceScore } = snapshot;

  if (revenueScore === 0 && cadenceScore === 0) return 'never_ordered';
  if (revenueScore >= 70 && cadenceScore >= 70) return 'vip';
  if (revenueScore >= 50 && cadenceScore >= 50) return 'active';
  if (revenueScore >= 30 && cadenceScore < 40) return 'at_risk';
  if (revenueScore > 0 && cadenceScore < 30) return 'churned';
  return 'low_engagement';
}
```

### React Component Example

```typescript
// Display customer health badge
function CustomerHealthBadge({ snapshot }) {
  const healthScore = (snapshot.revenueScore + snapshot.cadenceScore + snapshot.sampleUtilization) / 3;

  const getBadgeColor = (score) => {
    if (score >= 70) return 'green';
    if (score >= 50) return 'yellow';
    if (score >= 30) return 'orange';
    return 'red';
  };

  return (
    <Badge color={getBadgeColor(healthScore)}>
      Health: {healthScore.toFixed(0)}
    </Badge>
  );
}
```

## Scheduling Regular Updates

To keep snapshots current, schedule the generation script to run periodically:

```bash
# Option 1: Cron job (daily at 2 AM)
0 2 * * * PGPASSWORD='...' psql -h ... -f generate-account-snapshots.sql

# Option 2: Node.js scheduled task
import { CronJob } from 'cron';

new CronJob('0 2 * * *', async () => {
  // Execute snapshot generation
  await prisma.$executeRawUnsafe(`
    -- Your snapshot generation logic
  `);
}, null, true, 'America/New_York');
```

## Tracking Trends

```sql
-- Compare snapshots over time (requires multiple snapshots)
WITH latest AS (
  SELECT
    "customerId",
    "revenueScore" as current_revenue,
    "cadenceScore" as current_cadence,
    "snapshotDate"
  FROM "AccountHealthSnapshot"
  WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
    AND "snapshotDate" = (
      SELECT MAX("snapshotDate")
      FROM "AccountHealthSnapshot"
      WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
    )
),
previous AS (
  SELECT
    "customerId",
    "revenueScore" as previous_revenue,
    "cadenceScore" as previous_cadence
  FROM "AccountHealthSnapshot"
  WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
    AND "snapshotDate" = (
      SELECT MAX("snapshotDate")
      FROM "AccountHealthSnapshot"
      WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
        AND "snapshotDate" < (
          SELECT MAX("snapshotDate")
          FROM "AccountHealthSnapshot"
          WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
        )
    )
)
SELECT
  c.name,
  l.current_revenue,
  p.previous_revenue,
  (l.current_revenue - COALESCE(p.previous_revenue, 0)) as revenue_change,
  l.current_cadence,
  p.previous_cadence,
  (l.current_cadence - COALESCE(p.previous_cadence, 0)) as cadence_change
FROM latest l
JOIN "Customer" c ON c.id = l."customerId"
LEFT JOIN previous p ON p."customerId" = l."customerId"
WHERE COALESCE(p.previous_revenue, 0) > 0
ORDER BY revenue_change DESC
LIMIT 20;
```

## Dashboard Metrics

Suggested KPIs to display:

1. **Total Customers by Health Score Range**
2. **Average Health Score Trend** (over time)
3. **At-Risk Customer Count** (cadence < 40, revenue > 0)
4. **VIP Customer Count** (both scores >= 70)
5. **Never Ordered Count** (both scores = 0)
6. **Geographic Performance Map** (by state)
7. **Customer Segment Distribution**

## Files Reference

- **`/Users/greghogue/Leora2/generate-account-snapshots.sql`** - Main generation script
- **`/Users/greghogue/Leora2/verify-snapshots.sql`** - Verification queries
- **`/Users/greghogue/Leora2/snapshot-generation-report.md`** - Detailed report
- **`/Users/greghogue/Leora2/SNAPSHOT-USAGE-GUIDE.md`** - This guide
