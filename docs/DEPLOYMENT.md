# Deployment Guide - Phase 3

## Overview

This guide covers deployment procedures for Phase 3 (Samples & Analytics) features, including environment configuration, database migrations, cron jobs, and monitoring setup.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Migrations](#database-migrations)
3. [Cron Job Setup](#cron-job-setup)
4. [AI Service Configuration](#ai-service-configuration)
5. [Performance Monitoring](#performance-monitoring)
6. [Backup Procedures](#backup-procedures)
7. [Rollback Plan](#rollback-plan)
8. [Post-Deployment Verification](#post-deployment-verification)

---

## Environment Variables

### Production Environment (.env.production)

```bash
# Database
DATABASE_URL="postgresql://user:password@production-db:5432/leora"
DIRECT_URL="postgresql://user:password@production-db:5432/leora"
SHADOW_DATABASE_URL="postgresql://user:password@shadow-db:5432/leora_shadow"

# Authentication
NEXTAUTH_URL="https://app.yourcompany.com"
NEXTAUTH_SECRET="production-secret-key-min-32-chars"

# Phase 3: Anthropic AI
ANTHROPIC_API_KEY="sk-ant-api03-production-key"
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_MAX_TOKENS=1024
ANTHROPIC_MONTHLY_BUDGET=500  # USD

# Phase 3: Sample Configuration
SAMPLE_ATTRIBUTION_WINDOW_DAYS=30
SAMPLE_BUDGET_DEFAULT_MONTHLY=60
SAMPLE_METRICS_CALCULATION_ENABLED=true

# Phase 3: Trigger Configuration
TRIGGER_PROCESSING_ENABLED=true
TRIGGER_CHECK_INTERVAL_HOURS=6
TRIGGER_MAX_TASKS_PER_RUN=1000

# Analytics
ANALYTICS_CACHE_TTL_SECONDS=3600  # 1 hour
ANALYTICS_HISTORICAL_RETENTION_DAYS=730  # 2 years

# Monitoring
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_ENVIRONMENT="production"
SENTRY_TRACES_SAMPLE_RATE=0.1

# Redis (for caching)
REDIS_URL="redis://production-redis:6379"

# Email (for notifications)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASSWORD="sendgrid-api-key"
SMTP_FROM="noreply@yourcompany.com"
```

### Staging Environment (.env.staging)

```bash
# Database
DATABASE_URL="postgresql://user:password@staging-db:5432/leora"
DIRECT_URL="postgresql://user:password@staging-db:5432/leora"

# Authentication
NEXTAUTH_URL="https://staging.yourcompany.com"
NEXTAUTH_SECRET="staging-secret-key-min-32-chars"

# Phase 3: Anthropic AI (use test key with lower limits)
ANTHROPIC_API_KEY="sk-ant-api03-staging-key"
ANTHROPIC_MONTHLY_BUDGET=100  # Lower budget for staging

# Phase 3: Triggers (more frequent for testing)
TRIGGER_CHECK_INTERVAL_HOURS=1

# Other settings same as production
```

---

## Database Migrations

### Pre-Deployment Database Backup

**CRITICAL: Always backup before migrations**

```bash
# Backup production database
pg_dump -h production-db -U postgres -d leora -F c -f leora_backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list leora_backup_20241025_120000.dump | head -20
```

### Running Migrations

**Step 1: Review Migration SQL**

```bash
# Generate SQL without applying
npx prisma migrate deploy --dry-run
```

Review the generated SQL for:
- Index creation (may lock tables)
- Data migrations (may be slow)
- Foreign key constraints

**Step 2: Apply Migrations**

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Or use the script that includes pre/post checks
npm run db:migrate:production
```

**Step 3: Verify Migration**

```bash
# Check migration status
npx prisma migrate status

# Verify tables exist
psql -h production-db -U postgres -d leora -c "\dt public.*"

# Check specific Phase 3 tables
psql -h production-db -U postgres -d leora -c "
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('SampleUsage', 'SampleMetrics', 'Trigger')
  ORDER BY table_name, ordinal_position;
"
```

### Migration Rollback (if needed)

```bash
# Restore from backup
pg_restore -h production-db -U postgres -d leora -c leora_backup_20241025_120000.dump

# Verify restoration
psql -h production-db -U postgres -d leora -c "SELECT COUNT(*) FROM \"SampleUsage\";"
```

---

## Cron Job Setup

Phase 3 requires scheduled jobs for analytics calculation and trigger processing.

### Sample Metrics Calculation Job

**Purpose**: Calculate daily sample analytics metrics

**Frequency**: Daily at 2:00 AM (low traffic time)

**Crontab Entry**:
```cron
0 2 * * * cd /var/www/leora/web && /usr/bin/npm run metrics:calculate >> /var/log/leora/sample-metrics.log 2>&1
```

**Script** (`package.json`):
```json
{
  "scripts": {
    "metrics:calculate": "node scripts/calculate-sample-metrics.js"
  }
}
```

**Monitoring**:
```bash
# Check last run
tail -f /var/log/leora/sample-metrics.log

# Verify metrics were updated
psql -h production-db -U postgres -d leora -c "
  SELECT MAX(calculatedAt) as last_calculation
  FROM \"SampleMetrics\";
"
```

### Trigger Processing Job

**Purpose**: Process automated triggers and create tasks

**Frequency**: Every 6 hours

**Crontab Entry**:
```cron
0 */6 * * * cd /var/www/leora/web && /usr/bin/npm run triggers:process >> /var/log/leora/triggers.log 2>&1
```

**Script** (`package.json`):
```json
{
  "scripts": {
    "triggers:process": "node scripts/process-triggers.js"
  }
}
```

**Monitoring**:
```bash
# Check last run
tail -f /var/log/leora/triggers.log

# Verify tasks were created
psql -h production-db -U postgres -d leora -c "
  SELECT COUNT(*) as triggered_tasks
  FROM \"Task\"
  WHERE triggerId IS NOT NULL
    AND createdAt > NOW() - INTERVAL '6 hours';
"
```

### Cron Job Health Checks

**Setup Dead Man's Snitch** (or similar):
```cron
0 2 * * * cd /var/www/leora/web && /usr/bin/npm run metrics:calculate && curl https://nosnch.in/your-snitch-url
```

**Alerting**: If job doesn't run within expected window, alert ops team.

---

## AI Service Configuration

### Anthropic API Setup

**Step 1: API Key Management**

```bash
# Store API key in secure secret manager (e.g., AWS Secrets Manager)
aws secretsmanager create-secret \
  --name leora/production/anthropic-api-key \
  --secret-string "sk-ant-api03-..."

# Retrieve in deployment script
export ANTHROPIC_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id leora/production/anthropic-api-key \
  --query SecretString \
  --output text)
```

**Step 2: Budget Alerts**

Configure budget tracking in Anthropic console:
1. Visit https://console.anthropic.com/settings/billing
2. Set monthly budget: $500
3. Configure alerts at 75% and 90%
4. Add ops team email for notifications

**Step 3: Cost Monitoring**

```typescript
// src/lib/anthropic-cost-tracker.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function trackApiCost(
  model: string,
  tokensUsed: number,
  estimatedCost: number
) {
  await prisma.aiUsageLog.create({
    data: {
      model,
      tokensUsed,
      estimatedCost,
      timestamp: new Date(),
    },
  });

  // Check if approaching budget
  const monthlyTotal = await prisma.aiUsageLog.aggregate({
    where: {
      timestamp: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    _sum: {
      estimatedCost: true,
    },
  });

  const budget = parseFloat(process.env.ANTHROPIC_MONTHLY_BUDGET || '500');

  if (monthlyTotal._sum.estimatedCost! > budget * 0.9) {
    // Alert ops team
    await sendAlert({
      type: 'budget_warning',
      message: `AI API usage at ${monthlyTotal._sum.estimatedCost}/${budget} (90% of budget)`,
    });
  }
}
```

**Step 4: Fallback Configuration**

```typescript
// src/lib/anthropic.ts
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
  timeout: 30000, // 30 seconds
});

export async function generateRecommendationsWithFallback(
  customerId: string,
  currentOrderItems: CartItem[]
) {
  try {
    return await generateRecommendations(customerId, currentOrderItems);
  } catch (error) {
    // Log error
    logger.error('AI recommendation failed', { customerId, error });

    // Fallback to rule-based recommendations
    return generateRuleBasedRecommendations(customerId, currentOrderItems);
  }
}
```

---

## Performance Monitoring

### Application Performance Monitoring (APM)

**Sentry Setup**:

```typescript
// src/instrumentation.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

  // Track Phase 3 operations
  beforeSend(event) {
    // Add custom context for Phase 3 features
    if (event.request?.url?.includes('/api/samples')) {
      event.tags = {
        ...event.tags,
        feature: 'samples',
        phase: '3',
      };
    }
    return event;
  },
});
```

**Custom Performance Metrics**:

```typescript
// src/lib/monitoring.ts
import { performance } from 'perf_hooks';
import * as Sentry from '@sentry/nextjs';

export async function trackOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const transaction = Sentry.startTransaction({
    op: operation,
    name: operation,
  });

  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    const duration = performance.now() - startTime;
    transaction.setMeasurement('duration', duration, 'millisecond');
    transaction.finish();

    // Log slow operations
    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        operation,
        duration,
      });
    }
  }
}
```

### Database Query Monitoring

```typescript
// Prisma query logging
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    // Log slow queries
    logger.warn('Slow database query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
    });
  }
});
```

### Key Metrics to Monitor

**Sample Analytics Dashboard Load Time**:
- Target: < 2 seconds
- Alert if > 5 seconds

**AI Recommendation Generation Time**:
- Target: < 3 seconds
- Alert if > 10 seconds

**Trigger Processing Duration**:
- Target: < 5 minutes per run
- Alert if > 15 minutes

**Sample API Response Time** (p95):
- Target: < 500ms
- Alert if > 2000ms

---

## Backup Procedures

### Database Backups

**Daily Full Backup**:
```bash
# Crontab
0 3 * * * /usr/local/bin/backup-database.sh
```

**Backup Script** (`/usr/local/bin/backup-database.sh`):
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/leora"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/leora_$DATE.dump"

# Create backup
pg_dump -h production-db -U postgres -d leora -F c -f "$BACKUP_FILE"

# Verify backup
if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_FILE"

  # Upload to S3
  aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/leora/

  # Cleanup old local backups (keep last 7 days)
  find "$BACKUP_DIR" -name "leora_*.dump" -mtime +7 -delete
else
  echo "Backup failed!" | mail -s "Database Backup Failure" ops@yourcompany.com
fi
```

**Backup Verification**:
```bash
# Weekly restoration test
0 4 * * 0 /usr/local/bin/test-restore.sh
```

### Sample Data Backups

**Export Sample Usage Data**:
```sql
-- Export last 90 days to CSV
COPY (
  SELECT * FROM "SampleUsage"
  WHERE "tastedAt" > NOW() - INTERVAL '90 days'
) TO '/var/backups/leora/sample_usage_export.csv' CSV HEADER;
```

### Backup Retention Policy

- **Daily backups**: Retain 30 days
- **Weekly backups**: Retain 12 weeks
- **Monthly backups**: Retain 12 months
- **Yearly backups**: Retain 7 years

---

## Rollback Plan

### Application Rollback

**Step 1: Deploy Previous Version**

```bash
# Using Git tags
git checkout v2.5.0  # Previous stable version
npm install
npm run build
pm2 restart leora
```

**Step 2: Verify Rollback**

```bash
# Check app version
curl https://app.yourcompany.com/api/health

# Verify features work
npm run test:smoke
```

### Database Rollback

**Step 1: Restore from Backup**

```bash
# Stop application
pm2 stop leora

# Restore database
pg_restore -h production-db -U postgres -d leora -c leora_backup_20241024_030000.dump

# Verify data
psql -h production-db -U postgres -d leora -c "SELECT COUNT(*) FROM \"SampleUsage\";"
```

**Step 2: Migrate Down** (if minor schema changes)

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back 20241025_phase3_samples

# Verify schema
npx prisma migrate status
```

### Communication Plan

**During Rollback**:
1. Post status page update: "Experiencing issues, rolling back to previous version"
2. Send email to customer success team
3. Update #incidents Slack channel
4. Disable Phase 3 feature flags (if using feature flags)

**After Rollback**:
1. Root cause analysis meeting
2. Document what went wrong
3. Plan fix and re-deployment
4. Update deployment checklist

---

## Post-Deployment Verification

### Automated Smoke Tests

```bash
# Run smoke tests against production
npm run test:smoke:production
```

**Smoke Test Script** (`scripts/smoke-test.js`):
```javascript
const tests = [
  {
    name: 'Sample Quick Assign API',
    test: async () => {
      const response = await fetch('https://app.yourcompany.com/api/samples/quick-assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: testCustomerId,
          skuId: testSkuId,
          quantity: 1,
          tastedAt: new Date().toISOString(),
        }),
      });

      return response.status === 201;
    },
  },
  {
    name: 'Sample Analytics API',
    test: async () => {
      const response = await fetch(
        `https://app.yourcompany.com/api/samples/analytics?startDate=2024-10-01&endDate=2024-10-31`,
        {
          headers: {
            'Authorization': `Bearer ${testToken}`,
          },
        }
      );

      return response.status === 200;
    },
  },
  {
    name: 'AI Recommendations API',
    test: async () => {
      const response = await fetch('https://app.yourcompany.com/api/recommendations/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: testCustomerId,
          currentOrderItems: [],
        }),
      });

      return response.status === 200;
    },
  },
];

// Run all tests
const results = await Promise.all(tests.map(async (t) => {
  const passed = await t.test();
  return { name: t.name, passed };
}));

// Report
const failed = results.filter((r) => !r.passed);
if (failed.length > 0) {
  console.error('Smoke tests failed:', failed);
  process.exit(1);
}

console.log('All smoke tests passed ✓');
```

### Manual Verification Checklist

**UI Tests**:
- [ ] Sample management page loads
- [ ] Can log a new sample
- [ ] Sample history displays correctly
- [ ] Analytics dashboard loads with data
- [ ] Top performers chart renders
- [ ] Rep leaderboard displays
- [ ] AI recommendations button works
- [ ] Recommendations appear and can be added to cart
- [ ] Trigger settings page accessible (admin)

**Data Integrity**:
- [ ] Sample count matches expected
- [ ] Analytics calculations are accurate
- [ ] No duplicate sample records
- [ ] Conversion attribution working correctly
- [ ] Trigger task creation working

**Performance**:
- [ ] Analytics page loads in < 3 seconds
- [ ] AI recommendations return in < 5 seconds
- [ ] No increase in error rates
- [ ] Database query performance acceptable

**Monitoring**:
- [ ] Sentry receiving events
- [ ] Logs flowing to logging service
- [ ] Metrics being collected
- [ ] Alerts configured correctly

### Monitoring First 24 Hours

**Metrics to Watch**:
- Error rates (should remain < 0.1%)
- API response times (p95 should be < 500ms)
- Database connection pool usage
- Anthropic API usage and costs
- User adoption of new features

**Alerts to Configure**:
- Error rate > 1%
- API response time p95 > 2000ms
- Database CPU > 80%
- Anthropic API budget > 90%
- Sample attribution calculation fails

### Post-Deployment Report

**Template**:
```markdown
# Phase 3 Deployment Report

**Date**: 2024-10-25
**Version**: v3.0.0
**Deployed by**: Your Name

## Deployment Summary
- Started: 14:00 UTC
- Completed: 14:45 UTC
- Duration: 45 minutes
- Downtime: None (rolling deploy)

## Migration Results
- ✓ Database migrations applied successfully
- ✓ 0 errors during migration
- ✓ All Phase 3 tables created

## Cron Jobs
- ✓ Sample metrics calculation configured
- ✓ Trigger processing configured
- ✓ First run scheduled for 02:00 UTC

## Verification
- ✓ All smoke tests passed
- ✓ Manual UI testing completed
- ✓ Performance within acceptable ranges
- ✓ Monitoring configured and receiving data

## Issues Encountered
- None

## Next Steps
- Monitor for 24 hours
- Customer success team briefing on Monday
- Training video creation scheduled

## Team
- Backend: John Doe
- Frontend: Jane Smith
- DevOps: Bob Johnson
- QA: Alice Williams
```

---

## Deployment Checklist

**Pre-Deployment** (1 week before):
- [ ] Code review completed
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Stakeholders notified

**Pre-Deployment** (1 day before):
- [ ] Staging deployment successful
- [ ] Staging verification complete
- [ ] Production database backup created
- [ ] Deployment window scheduled
- [ ] On-call engineer identified
- [ ] Communication plan ready

**During Deployment**:
- [ ] Database backup created
- [ ] Migrations reviewed
- [ ] Application deployed
- [ ] Migrations executed
- [ ] Cron jobs configured
- [ ] Smoke tests passed
- [ ] Manual verification completed

**Post-Deployment**:
- [ ] Monitoring configured
- [ ] Alerts verified
- [ ] Status page updated
- [ ] Team notified
- [ ] Deployment report created
- [ ] 24-hour monitoring plan initiated

---

---

## Phase 5 Warehouse Deployment Procedures

### Warehouse Configuration Initialization

**Step 1: Verify Migration**

```bash
# Check warehouse tables exist
psql -h production-db -U postgres -d leora -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('WarehouseConfig', 'InventoryLocation', 'PickSheet', 'PickSheetItem', 'DeliveryRoute', 'RouteStop');
"
```

**Expected Output:**
```
 table_name
-----------------
 WarehouseConfig
 InventoryLocation
 PickSheet
 PickSheetItem
 DeliveryRoute
 RouteStop
(6 rows)
```

**Step 2: Seed Warehouse Configuration**

```bash
# Run warehouse configuration seed
npx ts-node scripts/seed-warehouse-config.ts

# Verify configuration created
psql -h production-db -U postgres -d leora -c "SELECT * FROM \"WarehouseConfig\" LIMIT 1;"
```

**Step 3: Assign Default Locations (Optional)**

If migrating from existing system with locations:

```bash
# Import locations from CSV
npx ts-node scripts/import-locations.ts --file locations-export.csv

# Verify import
psql -h production-db -U postgres -d leora -c "
  SELECT COUNT(*) as total_locations,
         COUNT(CASE WHEN \"aisle\" IS NOT NULL THEN 1 END) as assigned
  FROM \"InventoryLocation\";
"
```

**Step 4: Recalculate Pick Orders**

```bash
# Recalculate all pick orders based on new configuration
npx ts-node scripts/recalculate-pick-orders.ts

# Verify pick orders
psql -h production-db -U postgres -d leora -c "
  SELECT MIN(\"pickOrder\") as min_pick_order,
         MAX(\"pickOrder\") as max_pick_order,
         AVG(\"pickOrder\") as avg_pick_order
  FROM \"InventoryLocation\"
  WHERE \"aisle\" IS NOT NULL;
"
```

### Azuga Integration Setup

**Credentials (if using API in future):**

```bash
# Store Azuga API credentials (if applicable)
aws secretsmanager create-secret \
  --name leora/production/azuga-api-key \
  --secret-string "azuga-api-key-here"
```

**CSV Export/Import Permissions:**

Ensure application has write permissions to CSV export directory:

```bash
mkdir -p /var/www/leora/exports/azuga
chown www-data:www-data /var/www/leora/exports/azuga
chmod 755 /var/www/leora/exports/azuga
```

### Backup Procedures for Routes

**Backup Routes Daily:**

```bash
# Crontab entry
0 1 * * * cd /var/www/leora && /usr/bin/npx ts-node scripts/backup-routes.ts >> /var/log/leora/route-backup.log 2>&1
```

**Backup Script** (`scripts/backup-routes.ts`):
```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function backupRoutes() {
  const routes = await prisma.deliveryRoute.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: {
      stops: true,
    },
  });

  const backupFile = `/var/backups/leora/routes_${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(routes, null, 2));

  console.log(`Backed up ${routes.length} routes to ${backupFile}`);
}

backupRoutes();
```

### Post-Deployment Verification for Phase 5

**Verify Warehouse Features:**

```bash
# Test warehouse configuration endpoint
curl -X GET https://app.yourcompany.com/api/warehouse/config \
  -H "Authorization: Bearer $TEST_TOKEN"

# Should return warehouse configuration (200 OK)
```

**Verify Pick Sheet Generation:**

```bash
# Test pick sheet creation (with test orders)
curl -X POST https://app.yourcompany.com/api/pick-sheets \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderIds": ["test-order-1", "test-order-2"],
    "priority": "normal"
  }'

# Should return pick sheet with optimized items (201 Created)
```

**Verify Azuga Export:**

```bash
# Test Azuga CSV export
curl -X POST https://app.yourcompany.com/api/routing/export \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderIds": ["test-order-1"],
    "deliveryDate": "2024-10-26"
  }'

# Should download CSV file (200 OK)
```

**Verify Route Import:**

```bash
# Test route import (with test CSV)
curl -X POST https://app.yourcompany.com/api/routing/import \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -F "file=@test-route.csv"

# Should create routes (200 OK)
```

### Monitoring Phase 5 Features

**Key Metrics:**

```
- Pick sheet generation time (target: < 3 seconds)
- pickOrder calculation time (target: < 1 second for 1000 locations)
- CSV export time (target: < 1 second for 100 orders)
- Route import time (target: < 3 seconds for 50 stops)
- Warehouse map load time (target: < 2 seconds)
```

**Health Checks:**

Add to existing health check script:

```javascript
// Check warehouse configuration exists
const warehouseConfig = await prisma.warehouseConfig.count();
if (warehouseConfig === 0) {
  alerts.push('WARNING: No warehouse configuration found');
}

// Check pick sheets not stuck in PICKING status
const stuckPickSheets = await prisma.pickSheet.count({
  where: {
    status: 'PICKING',
    startedAt: {
      lte: new Date(Date.now() - 8 * 60 * 60 * 1000), // > 8 hours ago
    },
  },
});
if (stuckPickSheets > 0) {
  alerts.push(`WARNING: ${stuckPickSheets} pick sheets stuck in PICKING status`);
}

// Check routes without assigned drivers
const unassignedRoutes = await prisma.deliveryRoute.count({
  where: {
    status: 'PENDING',
    driverId: null,
    startTime: {
      lte: new Date(Date.now() + 2 * 60 * 60 * 1000), // Starting in < 2 hours
    },
  },
});
if (unassignedRoutes > 0) {
  alerts.push(`WARNING: ${unassignedRoutes} routes without drivers starting soon`);
}
```

### Rollback Plan for Phase 5

**Database Rollback:**

If Phase 5 deployment fails, rollback database migration:

```bash
# Stop application
pm2 stop leora

# Restore database from backup
pg_restore -h production-db -U postgres -d leora -c leora_backup_pre_phase5.dump

# Revert to previous application version
git checkout v3.0.0
npm install
npm run build
pm2 restart leora
```

**Partial Rollback (Keep Phase 5 tables but disable features):**

```bash
# Disable warehouse features via feature flags
psql -h production-db -U postgres -d leora -c "
  UPDATE \"TenantSettings\"
  SET \"warehouseEnabled\" = false,
      \"routingEnabled\" = false;
"

# Restart application
pm2 restart leora
```

### Support for Phase 5 Features

**Warehouse Issues:**
- Email: warehouse-support@yourcompany.com
- Phone: 1-800-WAREHOUSE

**Routing/Azuga Issues:**
- Email: routing-support@yourcompany.com
- Azuga Support: 1-877-298-4287

**Technical Integration Issues:**
- Email: integrations@yourcompany.com
- Slack: #leora-phase5-support

---

## Support Contacts

- **On-Call Engineer**: [PagerDuty rotation]
- **Database Admin**: dba@yourcompany.com
- **DevOps Lead**: devops@yourcompany.com
- **Product Manager**: pm@yourcompany.com
- **Anthropic Support**: https://support.anthropic.com
- **Warehouse Support**: warehouse-support@yourcompany.com
- **Routing Support**: routing-support@yourcompany.com

---

## Related Documentation

- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [API Reference](./API_REFERENCE.md)
- [Sample Management Guide](./SAMPLE_MANAGEMENT_GUIDE.md)
- [Sample Analytics Guide](./SAMPLE_ANALYTICS_GUIDE.md)
- [Warehouse Operations Guide](./WAREHOUSE_OPERATIONS_GUIDE.md)
- [Pick Sheet Guide](./PICK_SHEET_GUIDE.md)
- [Routing & Delivery Guide](./ROUTING_DELIVERY_GUIDE.md)
- [Warehouse Configuration Guide](./WAREHOUSE_CONFIGURATION_GUIDE.md)
- [Azuga Integration Spec](./AZUGA_INTEGRATION_SPEC.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
