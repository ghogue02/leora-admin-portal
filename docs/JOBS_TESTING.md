# Background Jobs Testing Guide

This guide covers how to test background jobs locally and validate them before production deployment.

## Prerequisites

- Node.js and npm installed
- PostgreSQL database running (local or remote)
- Environment variables configured in `.env.local`
- Test tenant data seeded in database

## Required Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/leora_dev"
DEFAULT_TENANT_SLUG="well-crafted"
CRON_SECRET="your-local-test-secret"
```

## Running Jobs Locally

### Quick Test (All Jobs)

```bash
# Run each job individually
npm run jobs:update-account-types
npm run jobs:sample-metrics
npm run jobs:calculate-burn-rates
npm run jobs:process-triggers
```

### Dry Run Mode

Test job logic without writing to database:

```bash
# Add dry-run flag (requires implementation in each job)
npm run jobs:update-account-types -- --dry-run

# Expected output:
# [update-account-types] Starting job...
# [update-account-types] [DRY RUN] Would update customer-123: {...}
# [update-account-types] Complete: 45 would be updated
```

### Specific Tenant Testing

```bash
# By tenant slug
TENANT_SLUG=test-tenant npm run jobs:update-account-types

# By tenant ID
TENANT_ID=uuid-here npm run jobs:sample-metrics
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run jobs:calculate-burn-rates

# Or with Node.js debugging
node --inspect node_modules/.bin/tsx src/jobs/run.ts calculate-burn-rates
```

## Unit Testing with Vitest

### Running Tests

```bash
# Run all job tests
npm test src/jobs/__tests__

# Run specific job test
npm test src/jobs/__tests__/update-account-types.test.ts

# Watch mode for development
npm run test:watch src/jobs/__tests__
```

### Test Structure Example

```typescript
// src/jobs/__tests__/update-account-types.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { run } from '../update-account-types';
import { prisma } from '@/lib/prisma';

describe('update-account-types', () => {
  const testTenantSlug = 'test-tenant';
  let testTenantId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: testTenantSlug,
        name: 'Test Tenant',
      },
    });
    testTenantId = tenant.id;

    // Seed test data
    await prisma.customer.createMany({
      data: [
        {
          tenantId: testTenantId,
          name: 'High Volume Customer',
          email: 'high@test.com',
        },
        {
          tenantId: testTenantId,
          name: 'Low Volume Customer',
          email: 'low@test.com',
        },
      ],
    });

    // Create orders for high volume customer
    const highVolumeCustomer = await prisma.customer.findFirst({
      where: { email: 'high@test.com' },
    });

    for (let i = 0; i < 20; i++) {
      await prisma.order.create({
        data: {
          tenantId: testTenantId,
          customerId: highVolumeCustomer!.id,
          total: 1000,
          deliveredAt: new Date(Date.now() - i * 86400000), // Last 20 days
        },
      });
    }
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.order.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.customer.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  it('should classify high-volume customer correctly', async () => {
    await run({
      tenantSlug: testTenantSlug,
      disconnectAfterRun: false
    });

    const customer = await prisma.customer.findFirst({
      where: { email: 'high@test.com' },
    });

    expect(customer?.accountType).toBe('HIGH_VOLUME');
  });

  it('should not update customer with no orders', async () => {
    await run({
      tenantSlug: testTenantSlug,
      disconnectAfterRun: false
    });

    const customer = await prisma.customer.findFirst({
      where: { email: 'low@test.com' },
    });

    expect(customer?.accountType).toBeNull();
  });

  it('should respect tenant boundaries', async () => {
    // Create another tenant
    const otherTenant = await prisma.tenant.create({
      data: { slug: 'other-tenant', name: 'Other Tenant' },
    });

    await prisma.customer.create({
      data: {
        tenantId: otherTenant.id,
        name: 'Other Tenant Customer',
        email: 'other@test.com',
      },
    });

    await run({
      tenantSlug: testTenantSlug,
      disconnectAfterRun: false
    });

    const otherCustomer = await prisma.customer.findFirst({
      where: { email: 'other@test.com' },
    });

    // Should not be updated (different tenant)
    expect(otherCustomer?.accountType).toBeNull();

    // Cleanup
    await prisma.customer.deleteMany({ where: { tenantId: otherTenant.id } });
    await prisma.tenant.delete({ where: { id: otherTenant.id } });
  });
});
```

## Integration Testing

### Manual Integration Test

```bash
# 1. Reset test database
npx prisma migrate reset --force

# 2. Seed with production-like data
npm run seed:well-crafted

# 3. Run job and capture output
npm run jobs:update-account-types 2>&1 | tee job-output.log

# 4. Verify database changes
npx prisma studio

# 5. Check for errors in output
grep -i error job-output.log
```

### Automated Integration Test Script

```bash
#!/bin/bash
# scripts/test-jobs-integration.sh

set -e

echo "🧪 Running background jobs integration tests..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test each job
jobs=("update-account-types" "sample-metrics" "calculate-burn-rates" "process-triggers")

for job in "${jobs[@]}"; do
  echo ""
  echo "Testing: $job"

  # Run job and capture exit code
  if npm run jobs:$job > /tmp/$job.log 2>&1; then
    echo -e "${GREEN}✓ $job completed successfully${NC}"

    # Check for warning patterns
    if grep -i "error\|failed\|exception" /tmp/$job.log > /dev/null; then
      echo -e "${RED}⚠ Warning: Errors detected in logs${NC}"
      grep -i "error\|failed\|exception" /tmp/$job.log
    fi
  else
    echo -e "${RED}✗ $job failed${NC}"
    cat /tmp/$job.log
    exit 1
  fi
done

echo ""
echo -e "${GREEN}All jobs completed successfully!${NC}"
```

Usage:
```bash
chmod +x scripts/test-jobs-integration.sh
./scripts/test-jobs-integration.sh
```

## Testing API Endpoint

### Local API Testing

```bash
# Start Next.js dev server
npm run dev

# In another terminal, trigger job via API
curl -X POST http://localhost:3000/api/jobs/process \
  -H "Authorization: Bearer your-local-test-secret" \
  -H "Content-Type: application/json"

# Or with specific job
curl -X POST "http://localhost:3000/api/jobs/process?job=triggers" \
  -H "Authorization: Bearer your-local-test-secret"
```

### Testing Vercel Cron Locally

Vercel Cron cannot be tested locally, but you can simulate it:

```bash
# Install vercel-cron-simulator (hypothetical)
npm install -D vercel-cron-simulator

# Run simulated cron
npx vercel-cron-simulator --schedule "0 2 * * *" --path "/api/jobs/process"
```

## Performance Testing

### Measure Job Execution Time

```typescript
// Add to job file
import { performance } from 'perf_hooks';

export async function run(options: RunOptions = {}) {
  const startTime = performance.now();

  try {
    // Job logic here
  } finally {
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`[${jobName}] Execution time: ${duration.toFixed(2)}s`);

    // Alert if over threshold (e.g., 30s)
    if (duration > 30) {
      console.warn(`[${jobName}] ⚠️ Execution exceeded 30s threshold!`);
    }
  }
}
```

### Load Testing with Production Data Volume

```bash
# 1. Clone production database (anonymized)
pg_dump production_db | pg_restore test_db

# 2. Run job with timing
time npm run jobs:update-account-types

# Expected output:
# [update-account-types] Processing 5000 customers...
# [update-account-types] Complete: 4892 updated
#
# real    0m23.456s
# user    0m2.123s
# sys     0m0.234s
```

### Memory Usage Monitoring

```bash
# Run with Node.js memory monitoring
node --expose-gc --max-old-space-size=512 \
  node_modules/.bin/tsx src/jobs/run.ts update-account-types

# Or use clinic.js
npm install -g clinic
clinic doctor -- node node_modules/.bin/tsx src/jobs/run.ts update-account-types
```

## Common Issues and Solutions

### Issue: "Tenant not found"

**Cause:** Missing or incorrect tenant slug/ID

**Solution:**
```bash
# Check available tenants
npx prisma studio
# Navigate to Tenant table

# Or query via psql
psql $DATABASE_URL -c "SELECT id, slug, name FROM tenant;"

# Use correct slug
TENANT_SLUG=correct-slug npm run jobs:update-account-types
```

### Issue: "Database connection timeout"

**Cause:** Connection pool exhausted or database unreachable

**Solution:**
```bash
# Check database is running
pg_isready -h localhost -p 5432

# Check connection string
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

### Issue: Job hangs indefinitely

**Cause:** Database transaction not committed or connection not closed

**Solution:**
```typescript
// Ensure disconnectAfterRun is true (default)
await run({ disconnectAfterRun: true });

// Or manually disconnect
try {
  await run();
} finally {
  await prisma.$disconnect();
}
```

### Issue: "Too many connections"

**Cause:** Connection pool exhausted from parallel job runs

**Solution:**
```bash
# Don't run jobs in parallel during testing
npm run jobs:update-account-types && \
npm run jobs:sample-metrics && \
npm run jobs:calculate-burn-rates

# Increase connection pool limit
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=20"
```

## Pre-Production Checklist

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Jobs complete under 30 seconds with production data volume
- [ ] No database connection leaks
- [ ] Error handling tested (network failures, missing data)
- [ ] Multi-tenant isolation verified
- [ ] Dry-run mode working
- [ ] Logging output is clear and actionable
- [ ] Performance metrics collected
- [ ] Edge cases tested (empty data, large datasets, concurrent runs)

## Staging Environment Testing

### Deploy to Staging

```bash
# Deploy to Vercel staging
vercel --env=staging

# Verify deployment
vercel inspect <deployment-url>

# Check environment variables
vercel env ls --env=staging
```

### Trigger Staging Cron Manually

```bash
# Vercel doesn't support manual cron triggers, so use API
curl -X POST https://your-staging-url.vercel.app/api/jobs/process \
  -H "Authorization: Bearer $STAGING_CRON_SECRET"
```

### Monitor Staging Logs

```bash
# View real-time logs
vercel logs --follow

# Filter by function
vercel logs --function=api/jobs/process

# Download logs for analysis
vercel logs --output=staging-job-logs.txt
```

## Production Readiness Validation

### Final Pre-Launch Checks

1. **Security:**
   - [ ] CRON_SECRET is unique and strong
   - [ ] Environment variables set in Vercel
   - [ ] API endpoint validates authorization header
   - [ ] No secrets in logs or error messages

2. **Performance:**
   - [ ] All jobs complete under 30s with production data
   - [ ] Database indexes created
   - [ ] Connection pooling configured
   - [ ] Memory usage acceptable

3. **Reliability:**
   - [ ] Jobs are idempotent (safe to re-run)
   - [ ] Error handling covers all edge cases
   - [ ] Database transactions used correctly
   - [ ] Rollback strategy documented

4. **Monitoring:**
   - [ ] Logging is comprehensive
   - [ ] Error alerting configured
   - [ ] Metrics dashboard created
   - [ ] Runbooks written for common failures

### Launch Day Plan

1. Enable cron schedules in vercel.json
2. Deploy to production
3. Monitor first execution closely
4. Verify database changes are correct
5. Check for errors in Vercel logs
6. Confirm next scheduled run time
7. Document any issues in runbook

---

## Reference Documentation

- Job implementations: `/Users/greghogue/Leora2/web/src/jobs/`
- Architecture design: `/Users/greghogue/Leora2/docs/architecture/ADR-001-Background-Jobs-Architecture.md`
- Vitest documentation: https://vitest.dev/
- Vercel Cron docs: https://vercel.com/docs/cron-jobs
