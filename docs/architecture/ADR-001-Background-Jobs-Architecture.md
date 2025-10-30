# ADR-001: Background Jobs Architecture

**Status:** Proposed
**Date:** 2025-10-25
**Decision Makers:** System Architecture Designer
**Technical Story:** Phase 1 Implementation - Background Jobs Infrastructure

## Context and Problem Statement

Leora requires automated background processing for critical business operations including:
- Daily account type updates based on customer behavior
- Sample conversion metrics calculation
- Product burn rate analysis for inventory planning
- Periodic trigger processing for alerts and notifications

These jobs must run reliably on schedule, handle multi-tenant data correctly, and integrate with the existing Next.js/Vercel deployment architecture.

## Decision Drivers

- **Reliability:** Jobs must complete successfully or fail gracefully with proper error handling
- **Multi-tenancy:** All jobs must respect tenant boundaries and use proper isolation
- **Observability:** Clear logging and monitoring to track job execution and failures
- **Simplicity:** Leverage existing infrastructure (Vercel Cron) rather than external services
- **Testability:** Jobs must be testable locally before production deployment
- **Scalability:** Architecture should handle growing data volumes without major refactoring

## Considered Options

### Option 1: Vercel Cron + Next.js API Routes (CHOSEN)

**Pros:**
- No additional infrastructure required
- Integrated with existing Vercel deployment
- Simple authentication via Vercel Cron headers
- Free tier supports needed frequency
- Direct access to application code and database

**Cons:**
- 10-second timeout on Hobby tier (60s on Pro)
- Limited observability compared to dedicated job runners
- No built-in retry mechanism
- Manual orchestration required

### Option 2: External Cron Service (cron-job.org) + API Routes

**Pros:**
- More flexible scheduling options
- Independent from deployment platform
- Built-in monitoring and alerting

**Cons:**
- Additional external dependency
- Requires API authentication setup
- Still subject to Vercel timeout limits
- Added complexity for little benefit

### Option 3: Dedicated Job Queue (BullMQ + Redis)

**Pros:**
- Advanced features (retry, priority, concurrency)
- Better for high-frequency or long-running jobs
- Built-in monitoring and metrics
- Horizontal scaling capability

**Cons:**
- Requires Redis infrastructure ($$$)
- Significant implementation complexity
- Overkill for current requirements
- Adds operational burden

## Decision Outcome

**Chosen Option: Vercel Cron + Next.js API Routes**

We will implement background jobs using Vercel's built-in Cron functionality combined with direct job script execution via package.json scripts.

### Architecture Components

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Cron                          │
│  (Triggers: */1 * * * *, 0 2 * * *, 0 */6 * * *)       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            /api/jobs/process (API Route)                │
│  - Validates Vercel Cron authorization                  │
│  - Determines which job to run                          │
│  - Delegates to job runner                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              src/jobs/run.ts (Job Runner)               │
│  - Loads environment variables                          │
│  - Dynamically imports job module                       │
│  - Executes job function                                │
│  - Handles exit codes and errors                        │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┼───────────────┬──────────────┐
         ▼           ▼               ▼              ▼
    ┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌──────────────┐
    │ update- │ │ sample- │ │ calculate-   │ │ process-     │
    │ account-│ │ metrics │ │ burn-rates   │ │ triggers     │
    │ types   │ │         │ │              │ │              │
    └────┬────┘ └────┬────┘ └──────┬───────┘ └──────┬───────┘
         │           │              │                │
         └───────────┴──────────────┴────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Prisma + PostgreSQL  │
                        │  (with tenant context)│
                        └───────────────────────┘
```

## Job Specifications

### 1. Update Account Types (Daily 2:00 AM)

**File:** `src/jobs/update-account-types.ts`

**Business Logic:**
- Query all active customers with their order history
- Calculate account type based on:
  - Order frequency (high/medium/low)
  - Order volume (total revenue last 90 days)
  - Product mix (variety of SKUs ordered)
- Update `customer.accountType` field
- Track changes for reporting

**Database Operations:**
- Read: `customer`, `order` (last 90 days)
- Write: `customer.accountType`, `customer.accountTypeUpdatedAt`
- Transaction: Individual customer updates

**Expected Duration:** 2-5 seconds for 1000 customers

### 2. Sample Metrics (Daily 2:00 AM)

**File:** `src/jobs/sample-metrics.ts`

**Business Logic:**
- Find all sample orders (`isFirstOrder: true`)
- Track conversion timeline (sample → paid order)
- Calculate conversion rates by:
  - Product category
  - Sales rep
  - Customer segment
  - Time period (7d, 30d, 90d)
- Store aggregated metrics

**Database Operations:**
- Read: `order` (samples and conversions), `customer`, `orderLine`
- Write: `sampleMetric` table (upsert daily metrics)
- Aggregation: Group by product, rep, date ranges

**Expected Duration:** 3-8 seconds for 5000 orders

### 3. Calculate Burn Rates (Daily 2:00 AM)

**File:** `src/jobs/calculate-burn-rates.ts`

**Business Logic:**
- Calculate average daily consumption per SKU
- Factor in seasonal trends (day of week, month)
- Determine optimal reorder points
- Flag low-stock SKUs
- Generate inventory recommendations

**Database Operations:**
- Read: `orderLine`, `sku`, `order` (last 90 days delivered)
- Write: `sku.burnRate`, `sku.reorderPoint`, `inventoryAlert`
- Aggregation: Sum quantities by SKU and date range

**Expected Duration:** 5-10 seconds for 500 SKUs

### 4. Process Triggers (Every 6 hours)

**File:** `src/jobs/process-triggers.ts`

**Business Logic:**
- Check trigger conditions:
  - Customer dormancy alerts (45+ days)
  - Low inventory warnings
  - Missed order patterns
  - Revenue decline notifications
- Execute trigger actions:
  - Create tasks for sales reps
  - Send email notifications
  - Call webhooks
  - Update CRM integrations
- Log all trigger executions
- Implement rate limiting

**Database Operations:**
- Read: `trigger`, `customer`, `sku`, `order`
- Write: `triggerExecution`, `task`, `notification`
- Complex queries: Multi-condition filtering

**Expected Duration:** 5-15 seconds per execution

## Implementation Patterns

### Standard Job Structure

```typescript
import { prisma, withTenant } from "@/lib/prisma";

type RunOptions = {
  tenantId?: string;
  tenantSlug?: string;
  disconnectAfterRun?: boolean;
  dryRun?: boolean; // For testing
};

export async function run(options: RunOptions = {}) {
  const { tenantId: explicitTenantId, tenantSlug: explicitTenantSlug } = options;
  const disconnectAfterRun = options.disconnectAfterRun ?? true;
  const dryRun = options.dryRun ?? false;

  const startTime = Date.now();
  console.log("[job-name] Starting job...");

  try {
    // 1. Resolve tenant
    const tenantSelector = explicitTenantId
      ? { id: explicitTenantId }
      : { slug: explicitTenantSlug ?? process.env.DEFAULT_TENANT_SLUG ?? "well-crafted" };

    const tenant = await prisma.tenant.findFirst({
      where: tenantSelector,
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      console.warn(`[job-name] Tenant not found. Skipping.`);
      return;
    }

    console.log(`[job-name] Processing tenant: ${tenant.name ?? tenant.slug}`);

    // 2. Fetch data with tenant context
    await withTenant(tenant.id, async (tx) => {
      const records = await tx.model.findMany({
        where: { tenantId: tenant.id, /* conditions */ },
        // select, include, etc.
      });

      console.log(`[job-name] Processing ${records.length} records...`);

      let processedCount = 0;
      let errorCount = 0;

      // 3. Process each record
      for (const record of records) {
        try {
          const update = calculateUpdate(record);

          if (update && !dryRun) {
            await tx.model.update({
              where: { id: record.id },
              data: update,
            });
            processedCount++;
          } else if (update && dryRun) {
            console.log(`[job-name] [DRY RUN] Would update ${record.id}:`, update);
            processedCount++;
          }
        } catch (error) {
          console.error(`[job-name] Error processing ${record.id}:`, error);
          errorCount++;
          // Continue processing other records
        }
      }

      // 4. Log summary
      const duration = Date.now() - startTime;
      console.log(`[job-name] Complete for ${tenant.name}:`);
      console.log(`  - Total records: ${records.length}`);
      console.log(`  - Processed: ${processedCount}`);
      console.log(`  - Errors: ${errorCount}`);
      console.log(`  - Duration: ${duration}ms`);
    });
  } catch (error) {
    console.error("[job-name] Fatal error:", error);
    throw error;
  } finally {
    if (disconnectAfterRun) {
      await prisma.$disconnect().catch(() => {
        // Ignore disconnect failures
      });
    }
  }
}

export default run;
```

### Error Handling Strategy

1. **Individual Record Failures:** Log and continue processing
2. **Fatal Errors:** Throw exception, exit with code 1
3. **Tenant Not Found:** Log warning, exit gracefully (code 0)
4. **Database Connection Issues:** Retry once, then fail
5. **Timeout Handling:** Batch processing to stay under limits

### Testing Approach

#### Local Testing
```bash
# Run directly with tsx
npm run jobs:update-account-types

# With specific tenant
TENANT_SLUG=well-crafted npm run jobs:update-account-types

# Dry run mode
npm run jobs:update-account-types -- --dry-run
```

#### Unit Tests (Vitest)
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { run } from '../update-account-types';
import { prisma } from '@/lib/prisma';

describe('update-account-types', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it('should update account types based on order volume', async () => {
    await run({ tenantSlug: 'test-tenant', disconnectAfterRun: false });

    const customer = await prisma.customer.findFirst({
      where: { email: 'test@example.com' },
    });

    expect(customer?.accountType).toBe('HIGH_VOLUME');
  });

  it('should handle customers with no orders', async () => {
    // Test edge case
  });

  it('should respect tenant boundaries', async () => {
    // Test multi-tenancy
  });
});
```

## Vercel Configuration

### vercel.json Updates
```json
{
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "$VERCEL_URL"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Tenant-Id, X-Tenant-Slug"
        }
      ]
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "crons": [
    {
      "path": "/api/jobs/process",
      "schedule": "0 2 * * *",
      "description": "Daily jobs at 2:00 AM UTC"
    },
    {
      "path": "/api/jobs/process?job=triggers",
      "schedule": "0 */6 * * *",
      "description": "Process triggers every 6 hours"
    }
  ]
}
```

### package.json Scripts
```json
{
  "scripts": {
    "jobs:run": "tsx src/jobs/run.ts",
    "jobs:update-account-types": "npm run jobs:run -- update-account-types",
    "jobs:sample-metrics": "npm run jobs:run -- sample-metrics",
    "jobs:calculate-burn-rates": "npm run jobs:run -- calculate-burn-rates",
    "jobs:process-triggers": "npm run jobs:run -- process-triggers"
  }
}
```

## Database Considerations

### Required Indexes
```sql
-- Customer queries
CREATE INDEX idx_customer_account_type ON customer(account_type);
CREATE INDEX idx_customer_last_order_date ON customer(last_order_date);
CREATE INDEX idx_customer_sales_rep_id ON customer(sales_rep_id);

-- Order queries for metrics
CREATE INDEX idx_order_delivered_at ON "order"(delivered_at);
CREATE INDEX idx_order_is_first_order ON "order"(is_first_order);
CREATE INDEX idx_order_customer_delivered ON "order"(customer_id, delivered_at);

-- SKU burn rate queries
CREATE INDEX idx_order_line_sku_id ON order_line(sku_id);
CREATE INDEX idx_sku_burn_rate ON sku(burn_rate);
```

### New Tables Required
```prisma
model SampleMetric {
  id                String   @id @default(cuid())
  tenantId          String
  date              DateTime
  productCategory   String?
  salesRepId        String?
  samplesGiven      Int
  conversions       Int
  conversionRate    Decimal  @db.Decimal(5,4)
  averageDaysToConvert Int?
  createdAt         DateTime @default(now())

  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  salesRep          SalesRep? @relation(fields: [salesRepId], references: [id])

  @@unique([tenantId, date, productCategory, salesRepId])
  @@index([tenantId, date])
}

model InventoryAlert {
  id          String   @id @default(cuid())
  tenantId    String
  skuId       String
  alertType   String   // LOW_STOCK, OUT_OF_STOCK, OVERSTOCKED
  severity    String   // INFO, WARNING, CRITICAL
  message     String
  resolved    Boolean  @default(false)
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  sku         Sku      @relation(fields: [skuId], references: [id])

  @@index([tenantId, resolved])
  @@index([skuId, resolved])
}

model TriggerExecution {
  id          String   @id @default(cuid())
  tenantId    String
  triggerId   String
  executedAt  DateTime @default(now())
  status      String   // SUCCESS, FAILED, SKIPPED
  errorMessage String?
  metadata    Json?

  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, executedAt])
  @@index([triggerId, executedAt])
}
```

## Security Considerations

### API Authentication
```typescript
// src/app/api/jobs/process/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get job name from query params or body
  const { searchParams } = new URL(request.url);
  const jobName = searchParams.get('job') || 'daily';

  try {
    // Trigger appropriate job(s)
    // Return success response
    return NextResponse.json({ success: true, job: jobName });
  } catch (error) {
    return NextResponse.json(
      { error: 'Job execution failed', details: error.message },
      { status: 500 }
    );
  }
}
```

### Multi-Tenant Isolation
- Always use `withTenant()` wrapper for database queries
- Never expose tenant IDs in URLs or logs
- Validate tenant access in API routes
- Use Row Level Security (RLS) in PostgreSQL for defense in depth

### Secrets Management
- Store all secrets in Vercel environment variables
- Never commit `.env.local` or `.env` files
- Use different secrets for staging and production
- Rotate CRON_SECRET regularly

## Monitoring and Observability

### Logging Standards
```typescript
// Consistent log format
console.log(`[${jobName}] Starting job execution`);
console.log(`[${jobName}] Processing ${count} records`);
console.log(`[${jobName}] Complete: ${stats}`);
console.error(`[${jobName}] Error:`, error);
```

### Key Metrics to Track
- **Execution Time:** Duration of each job run
- **Records Processed:** Count of records updated/created
- **Error Rate:** Percentage of failures
- **Success Rate:** Completion without errors
- **Resource Usage:** Database connections, memory

### Alerting Rules
1. Job fails 2+ consecutive runs → Critical alert
2. Execution time > 3x normal → Warning
3. Error rate > 10% → Warning
4. Zero records processed (unexpected) → Warning

## Migration Plan

### Phase 1: Infrastructure Setup
1. Create job files with basic structure
2. Add package.json scripts
3. Update vercel.json with cron config
4. Create API endpoint for Vercel Cron
5. Set up CRON_SECRET environment variable

### Phase 2: Job Implementation
1. Implement update-account-types.ts
2. Implement sample-metrics.ts
3. Implement calculate-burn-rates.ts
4. Implement process-triggers.ts
5. Write unit tests for each job

### Phase 3: Testing
1. Local testing with development database
2. Dry-run mode validation
3. Staging deployment with test cron schedules
4. Verify logs and metrics
5. Load testing with production data volume

### Phase 4: Production Deployment
1. Deploy to production
2. Enable cron schedules
3. Monitor first 3 executions closely
4. Set up error alerting
5. Document runbooks for common issues

## Success Metrics

- ✅ All jobs complete within 30 seconds (well under 60s limit)
- ✅ Error rate < 1% over 30 days
- ✅ Zero data integrity issues
- ✅ 99.9% job completion rate
- ✅ Mean time to detection (MTTD) < 1 hour for failures
- ✅ Mean time to recovery (MTTR) < 4 hours

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Vercel timeout (60s limit) | High | Low | Batch processing, optimize queries, monitor duration |
| Database connection pool exhaustion | High | Medium | Always disconnect after run, use connection pooling |
| Multi-tenant data leakage | Critical | Low | Always use withTenant(), add RLS, code reviews |
| Job runs overlap (race conditions) | Medium | Low | Design jobs to be idempotent, use database locks |
| Cron schedule misconfiguration | Medium | Low | Test schedules in staging, document in ADR |
| Missing error notifications | Medium | Medium | Set up Vercel log monitoring, Sentry integration |

## Future Enhancements

### Short-term (Next 3-6 months)
- Implement dry-run mode for all jobs
- Add Sentry error tracking integration
- Create admin UI for manual job triggering
- Build job execution history dashboard

### Medium-term (6-12 months)
- Migrate to dedicated job queue if volume increases
- Implement job priority and queueing
- Add webhook support for job completion
- Create job templates for new tenant onboarding

### Long-term (12+ months)
- Distributed job processing across regions
- Machine learning for anomaly detection
- Predictive job scheduling based on load
- Self-healing job retry mechanisms

## References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multitenancy)
- Implementation Plan: `/Users/greghogue/Leora2/docs/LEORA_IMPLEMENTATION_PLAN.md`
- Existing Jobs: `/Users/greghogue/Leora2/web/src/jobs/`

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-25 | Use Vercel Cron instead of external service | Simpler, no additional infrastructure |
| 2025-10-25 | Implement idempotent job design | Enables safe retries, prevents double-processing |
| 2025-10-25 | Use tsx instead of compiled JavaScript | Faster development iteration, TypeScript safety |
| 2025-10-25 | Batch processing for large datasets | Stay under Vercel timeout limits |
| 2025-10-25 | Add dry-run mode to all jobs | Enable safe testing in production environment |

---

**Next Steps:**
1. Review and approve this ADR
2. Create job implementation tickets
3. Set up staging environment for testing
4. Begin Phase 1 implementation
