# Background Jobs Architecture Summary

**Status:** Design Complete ✅
**Date:** 2025-10-25
**Phase:** 1 - Infrastructure Setup
**Architecture Designer:** System Architecture Designer

## Executive Summary

Designed comprehensive background jobs infrastructure for Leora Sales Rep Portal using Vercel Cron and Next.js API Routes. Architecture supports 4 scheduled jobs with multi-tenant isolation, comprehensive error handling, and production-ready monitoring.

## Architecture Overview

```
Vercel Cron → API Endpoint → Job Runner → Individual Jobs → PostgreSQL
                    ↓
                 Auth Check
                 Rate Limit
                 Logging
```

## Job Schedule

| Job | Schedule | Purpose | Est. Duration |
|-----|----------|---------|---------------|
| **update-account-types** | Daily 2:00 AM | Classify customers by order volume/frequency | 2-5s |
| **sample-metrics** | Daily 2:00 AM | Calculate sample conversion rates | 3-8s |
| **calculate-burn-rates** | Daily 2:00 AM | Product consumption analysis for inventory | 5-10s |
| **process-triggers** | Every 6 hours | Execute automation triggers and alerts | 5-15s |

## Key Design Decisions

### ✅ Chosen: Vercel Cron + API Routes

**Rationale:**
- Zero additional infrastructure cost
- Integrated with existing Vercel deployment
- Simple authentication via Cron headers
- Direct access to application code
- 60-second timeout sufficient for all jobs

**Alternatives Rejected:**
- External cron services (unnecessary complexity)
- BullMQ + Redis (overkill for current needs)
- AWS Lambda (vendor lock-in, extra infrastructure)

### Implementation Patterns

All jobs follow standardized pattern:

```typescript
export async function run(options: RunOptions = {}) {
  const { tenantId, tenantSlug, disconnectAfterRun = true, dryRun = false } = options;

  try {
    // 1. Resolve tenant
    const tenant = await resolveTenant(tenantId, tenantSlug);

    // 2. Query data with tenant context
    await withTenant(tenant.id, async (tx) => {
      const records = await tx.model.findMany({ ... });

      // 3. Process records (with error handling)
      for (const record of records) {
        try {
          const update = calculateUpdate(record);
          if (update && !dryRun) {
            await tx.model.update({ ... });
          }
        } catch (error) {
          console.error(`Error processing ${record.id}:`, error);
          // Continue processing
        }
      }
    });

    // 4. Log summary statistics
    console.log(`[job-name] Complete: ${stats}`);
  } catch (error) {
    console.error(`[job-name] Fatal error:`, error);
    throw error;
  } finally {
    if (disconnectAfterRun) {
      await prisma.$disconnect();
    }
  }
}
```

## Files Created

### Documentation
- ✅ `/Users/greghogue/Leora2/docs/architecture/ADR-001-Background-Jobs-Architecture.md`
  - Complete Architecture Decision Record
  - Technical specifications for each job
  - Security considerations
  - Migration plan
  - Risk analysis

- ✅ `/Users/greghogue/Leora2/docs/JOBS_TESTING.md`
  - Local testing procedures
  - Unit test examples
  - Integration test scripts
  - Performance testing
  - Production readiness checklist

### To Be Created (Implementation Phase)

**Job Files:**
```
/Users/greghogue/Leora2/web/src/jobs/
  ├── update-account-types.ts    (NEW)
  ├── sample-metrics.ts           (NEW)
  ├── calculate-burn-rates.ts    (NEW)
  └── process-triggers.ts         (NEW)
```

**API Endpoint:**
```
/Users/greghogue/Leora2/web/src/app/api/jobs/process/route.ts (NEW)
```

**Configuration Updates:**
- `/Users/greghogue/Leora2/web/vercel.json` (UPDATE - add crons)
- `/Users/greghogue/Leora2/web/package.json` (UPDATE - add scripts)

## Testing Strategy

### Local Testing
```bash
# Direct execution
npm run jobs:update-account-types

# Dry run mode
npm run jobs:update-account-types -- --dry-run

# Specific tenant
TENANT_SLUG=test npm run jobs:sample-metrics
```

### Unit Tests (Vitest)
```bash
npm test src/jobs/__tests__/update-account-types.test.ts
```

### Integration Testing
```bash
# Automated test script
./scripts/test-jobs-integration.sh

# Manual verification
npm run jobs:run -- update-account-types 2>&1 | tee job-output.log
npx prisma studio  # Verify database changes
```

### Performance Testing
```bash
# Measure execution time
time npm run jobs:calculate-burn-rates

# Memory profiling
node --expose-gc --max-old-space-size=512 \
  node_modules/.bin/tsx src/jobs/run.ts calculate-burn-rates
```

## Configuration Required

### vercel.json Updates
```json
{
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
    "jobs:update-account-types": "tsx src/jobs/run.ts update-account-types",
    "jobs:sample-metrics": "tsx src/jobs/run.ts sample-metrics",
    "jobs:calculate-burn-rates": "tsx src/jobs/run.ts calculate-burn-rates",
    "jobs:process-triggers": "tsx src/jobs/run.ts process-triggers"
  }
}
```

### Environment Variables
```bash
# Production (Vercel)
CRON_SECRET="randomly-generated-secure-secret"
DATABASE_URL="postgresql://..."
DEFAULT_TENANT_SLUG="well-crafted"

# Development (.env.local)
CRON_SECRET="local-dev-secret"
DATABASE_URL="postgresql://localhost:5432/leora_dev"
DEFAULT_TENANT_SLUG="well-crafted"
```

## Database Changes

### New Tables Needed
```prisma
model SampleMetric {
  // Sample conversion tracking
}

model InventoryAlert {
  // Low stock alerts
}

model TriggerExecution {
  // Trigger execution history
}
```

### Required Indexes
```sql
CREATE INDEX idx_customer_account_type ON customer(account_type);
CREATE INDEX idx_customer_last_order_date ON customer(last_order_date);
CREATE INDEX idx_order_delivered_at ON "order"(delivered_at);
CREATE INDEX idx_order_is_first_order ON "order"(is_first_order);
CREATE INDEX idx_sku_burn_rate ON sku(burn_rate);
```

## Security Measures

1. **API Authentication:** Verify `Authorization: Bearer <CRON_SECRET>` header
2. **Multi-Tenant Isolation:** Always use `withTenant()` wrapper
3. **Secrets Management:** All secrets in Vercel environment variables
4. **Rate Limiting:** Implement backoff for external API calls
5. **Input Validation:** Sanitize all job parameters

## Monitoring & Alerting

### Key Metrics
- **Execution Time:** Track duration vs. 30s threshold
- **Success Rate:** Target 99.9% completion rate
- **Error Rate:** Alert if > 1% failures
- **Records Processed:** Detect anomalies (zero records, excessive records)

### Logging Standards
```typescript
console.log(`[${jobName}] Starting job execution`);
console.log(`[${jobName}] Processing ${count} records`);
console.log(`[${jobName}] Complete: ${stats}`);
console.error(`[${jobName}] Error:`, error);
```

### Alert Rules
- ❌ Job fails 2+ consecutive runs → **Critical**
- ⚠️ Execution time > 3x normal → **Warning**
- ⚠️ Error rate > 10% → **Warning**
- ⚠️ Zero records processed (unexpected) → **Warning**

## Implementation Roadmap

### Phase 1: Infrastructure (Week 1)
- [ ] Create job files with basic structure
- [ ] Add package.json scripts
- [ ] Update vercel.json with cron config
- [ ] Create API endpoint for Vercel Cron
- [ ] Set up CRON_SECRET environment variable

### Phase 2: Job Implementation (Week 2)
- [ ] Implement update-account-types.ts
- [ ] Implement sample-metrics.ts
- [ ] Implement calculate-burn-rates.ts
- [ ] Implement process-triggers.ts
- [ ] Write unit tests for each job

### Phase 3: Testing (Week 3)
- [ ] Local testing with dev database
- [ ] Dry-run mode validation
- [ ] Staging deployment
- [ ] Verify cron triggers
- [ ] Load testing with production data volume

### Phase 4: Production (Week 4)
- [ ] Deploy to production
- [ ] Enable cron schedules
- [ ] Monitor first 3 executions
- [ ] Set up error alerting
- [ ] Document runbooks

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Vercel 60s timeout | Batch processing, optimize queries, monitor duration |
| Connection pool exhaustion | Always disconnect, use pooling |
| Multi-tenant data leakage | Always use withTenant(), code reviews, RLS |
| Race conditions | Idempotent design, database locks |
| Missing error notifications | Vercel log monitoring, Sentry integration |

## Success Criteria

- ✅ All jobs complete within 30 seconds
- ✅ Error rate < 1% over 30 days
- ✅ Zero data integrity issues
- ✅ 99.9% job completion rate
- ✅ MTTD < 1 hour for failures
- ✅ MTTR < 4 hours

## Memory Storage

Architecture design stored in memory:

**Key:** `phase1/jobs-architecture`
**Namespace:** `leora-architecture`
**Content:** Full job specifications, schedules, files to create, testing strategy

**Sub-keys:**
- `phase1/jobs-architecture/adr` - ADR document reference
- `phase1/jobs-architecture/testing-guide` - Testing documentation reference

## Next Steps

1. **Review & Approve** this architecture design
2. **Create Implementation Tickets**:
   - Ticket 1: Job infrastructure setup
   - Ticket 2: update-account-types implementation
   - Ticket 3: sample-metrics implementation
   - Ticket 4: calculate-burn-rates implementation
   - Ticket 5: process-triggers implementation
   - Ticket 6: Testing and staging deployment
   - Ticket 7: Production deployment

3. **Set up Development Environment**:
   - Create test database
   - Seed with production-like data
   - Configure .env.local

4. **Begin Implementation** (Phase 1)

## References

- **Implementation Plan:** `/Users/greghogue/Leora2/docs/LEORA_IMPLEMENTATION_PLAN.md` (Appendix A.2)
- **ADR:** `/Users/greghogue/Leora2/docs/architecture/ADR-001-Background-Jobs-Architecture.md`
- **Testing Guide:** `/Users/greghogue/Leora2/docs/JOBS_TESTING.md`
- **Existing Jobs:** `/Users/greghogue/Leora2/web/src/jobs/`
- **Job Runner:** `/Users/greghogue/Leora2/web/src/jobs/run.ts`

---

**Architecture Design Status: COMPLETE ✅**

All design documentation created and stored in memory. Ready for implementation phase.
