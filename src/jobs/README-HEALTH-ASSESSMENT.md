# Customer Health Assessment Job

## Overview

This job runs daily to assess all customers' risk status based on ordering patterns, revenue trends, and dormancy detection.

## Business Rules

The job implements the following risk assessment logic (from `claude-plan.md`):

1. **DORMANT**: 45+ days since expected order date
2. **AT_RISK_CADENCE**: Past expected order date by 1+ days
3. **AT_RISK_REVENUE**: Recent revenue 15% below established average
4. **HEALTHY**: All other customers with normal ordering patterns

## Features

- ✅ Calculates ordering pace from last 5 delivered orders
- ✅ Determines next expected order date based on historical cadence
- ✅ Detects dormancy and tracks dormancy start date
- ✅ Tracks reactivation when dormant customers resume ordering
- ✅ Compares recent revenue (last 3 orders) against established baseline
- ✅ Batch processing with proper error handling
- ✅ Comprehensive logging and statistics
- ✅ Uses Prisma with tenant context for multi-tenant support

## Usage

### As a cron job (recommended)

```bash
# Add to crontab to run daily at 2 AM
0 2 * * * cd /path/to/web && node -r tsx/register src/jobs/run.ts customer-health-assessment
```

### Manual execution

```typescript
import { run } from "@/jobs/customer-health-assessment";

// Run for default tenant
await run();

// Run for specific tenant by ID
await run({ tenantId: "uuid-here" });

// Run for specific tenant by slug
await run({ tenantSlug: "well-crafted" });

// Keep connection open for multiple jobs
await run({ disconnectAfterRun: false });
```

### Via job runner

```bash
# Using the job runner script
npm run job customer-health-assessment

# Or with tsx directly
npx tsx src/jobs/run.ts customer-health-assessment
```

## Database Operations

The job performs the following updates on each customer:

- `lastOrderDate` - Most recent delivered order date
- `nextExpectedOrderDate` - Calculated based on ordering pace
- `averageOrderIntervalDays` - Average days between last 5 orders
- `riskStatus` - Risk classification (HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT)
- `dormancySince` - Date customer became dormant (null if not dormant)
- `reactivatedDate` - Date customer was reactivated from dormant status

## Performance Considerations

- Uses batch processing to handle large customer bases
- Only updates customers when status actually changes
- Indexes on `riskStatus`, `salesRepId`, and `deliveredAt` optimize queries
- Transaction-based updates ensure data consistency
- Continues processing even if individual customer fails

## Logging Output

Example successful run:

```
[customer-health-assessment] Starting daily customer health assessment...
[customer-health-assessment] Processing tenant: Well Crafted Beverage
[customer-health-assessment] Analyzing 247 active customers...
[customer-health-assessment] Assessment complete for Well Crafted Beverage:
  - Total customers analyzed: 247
  - Customers updated: 89
  - Dormant: 12
  - At Risk (Cadence): 34
  - At Risk (Revenue): 8
  - Reactivated: 3
  - Duration: 2847ms
```

## Error Handling

- Skips customers with no delivered orders
- Continues processing if individual customer assessment fails
- Logs errors for debugging while maintaining job continuity
- Transaction rollback on critical failures

## Integration with Sales Rep Portal

This job feeds the following features:

- **Dashboard**: Customer health summary (dormant, at-risk counts)
- **Customer List**: Filterable by risk status
- **Due to Order Lists**: Customers past their expected order date
- **Rep Metrics**: Dormant customer counts, reactivation rates
- **Alerts**: Email/webhook notifications for newly dormant customers (future)

## Next Steps

After initial deployment:

1. Monitor execution logs for errors or anomalies
2. Verify risk status calculations against business expectations
3. Adjust thresholds if needed (45 days for dormancy, 15% revenue decline)
4. Add webhook/email alerts for newly dormant high-value customers
5. Create weekly summary report for management
