# Sample Tracking - Quick Start Guide

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
cd /Users/greghogue/Leora2/web

# Apply migration
npx prisma migrate deploy

# Or for development
npx prisma migrate dev --name add_sample_tracking_analytics

# Generate Prisma client
npx prisma generate
```

### 2. Seed Feedback Templates

```bash
# Run seed script
tsx scripts/seed-sample-feedback.ts

# Or add to package.json and run:
npm run seed:sample-feedback
```

### 3. Schedule Background Job

Add to your job scheduler:

```javascript
import { sampleMetricsJobConfig } from './src/jobs/calculate-sample-metrics';

// Schedule with your job queue (e.g., node-cron, bull, etc.)
scheduler.schedule(sampleMetricsJobConfig.cron, sampleMetricsJobConfig.handler);
```

### 4. Test APIs

```bash
# Get analytics
curl "http://localhost:3000/api/samples/analytics?tenantId=xxx&startDate=2024-01-01&endDate=2024-12-31"

# List feedback templates
curl "http://localhost:3000/api/samples/feedback-templates?tenantId=xxx"

# Quick assign sample
curl -X POST "http://localhost:3000/api/samples/quick-assign" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "xxx",
    "salesRepId": "xxx",
    "customerId": "xxx",
    "skuId": "xxx",
    "feedbackOptions": ["Loved it"],
    "customerResponse": "Wants to order"
  }'
```

## 📊 Key Concepts

### 30-Day Attribution Window

```
Sample Tasted: Jan 15, 2024
┌─────────────────────────────────────────┐
│  Attribution Window (30 days)          │
│  Jan 15 ─────────────────────► Feb 14  │
└─────────────────────────────────────────┘

✅ Orders on Jan 16-Feb 14: Attributed
❌ Orders on Feb 15+: NOT attributed
❌ Orders on Jan 14 or before: NOT attributed
```

### Revenue Calculation

```typescript
// Sample given on Jan 15
// Customer orders on Jan 20 → ✅ Counted
// Customer orders on Feb 10 → ✅ Counted
// Customer orders on Feb 16 → ❌ Not counted (day 31+)

// Only orders of the SAMPLED SKU count!
```

## 🔧 Configuration

### Sample Allowance

Set per sales rep:

```typescript
// In SalesRep model
sampleAllowancePerMonth: 60  // Default per tenant settings
```

### Job Schedule

Modify in `/src/jobs/calculate-sample-metrics.ts`:

```javascript
export const sampleMetricsJobConfig = {
  cron: '0 2 * * *',  // Daily at 2am (change as needed)
  // ...
};
```

## 📈 Analytics Queries

### Get Conversion Rate by SKU

```typescript
import { getSampleConversionRate } from '@/lib/sample-analytics';

const rates = await getSampleConversionRate(
  tenantId,
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

// Returns:
// [
//   {
//     skuId: 'xxx',
//     skuCode: 'SKU-001',
//     productName: 'Chardonnay 2023',
//     totalSamples: 50,
//     conversions: 23,
//     conversionRate: 0.46,
//     totalRevenue: 12500,
//     avgRevenuePerSample: 250
//   },
//   ...
// ]
```

### Get Rep Performance

```typescript
import { getRepSamplePerformance } from '@/lib/sample-analytics';

const performance = await getRepSamplePerformance(
  tenantId,
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

// Returns sorted by totalRevenue
```

### Calculate Revenue for Specific Sample

```typescript
import { calculateSampleRevenue } from '@/lib/sample-analytics';

const result = await calculateSampleRevenue(sampleUsageId);

// Returns:
// {
//   sampleUsageId: 'xxx',
//   skuId: 'xxx',
//   customerId: 'xxx',
//   tastedAt: Date,
//   attributedRevenue: 1250.00,
//   orderCount: 3,
//   orders: [...]
// }
```

## 🧪 Testing

### Run Tests

```bash
npm run test -- src/lib/__tests__/sample-analytics.test.ts
```

### Test Coverage

- ✅ 30-day window attribution (days 1-30)
- ✅ Exclusion of orders outside window (day 31+)
- ✅ Exclusion of orders before tasting
- ✅ SKU-specific revenue calculation
- ✅ Multiple orders from same customer
- ✅ Conversion rate calculation
- ✅ Rep performance metrics
- ✅ Edge cases and error handling

## 📝 Common Patterns

### Track a Sample

```typescript
// Quick assign via API
const response = await fetch('/api/samples/quick-assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'xxx',
    salesRepId: 'xxx',
    customerId: 'xxx',
    skuId: 'xxx',
    quantity: 1,
    feedbackOptions: ['Loved it - wants to order', 'Perfect for menu'],
    customerResponse: 'Wants to order',
    sampleSource: 'Rep pulled',
    needsFollowUp: true
  })
});
```

### Get Feedback Templates

```typescript
const response = await fetch(
  `/api/samples/feedback-templates?tenantId=${tenantId}`
);
const { grouped } = await response.json();

// Use in UI:
// Positive: grouped.Positive
// Negative: grouped.Negative
// Neutral: grouped.Neutral
```

### View Analytics Dashboard

```typescript
const response = await fetch(
  `/api/samples/analytics?` +
  `tenantId=${tenantId}` +
  `&startDate=${startDate.toISOString()}` +
  `&endDate=${endDate.toISOString()}`
);

const { summary, conversionRates, repPerformance } = await response.json();

// Display:
// - Overall conversion rate: summary.conversionRate
// - Top SKUs: conversionRates (sorted)
// - Rep leaderboard: repPerformance (sorted)
```

## 🐛 Troubleshooting

### Migration Fails

```bash
# Check database connection
npx prisma db pull

# Reset if needed (dev only!)
npx prisma migrate reset

# Re-apply
npx prisma migrate deploy
```

### Tests Fail

```bash
# Check Prisma client is generated
npx prisma generate

# Clear test cache
npm run test -- --clearCache

# Run single test
npm run test -- src/lib/__tests__/sample-analytics.test.ts -t "30-day window"
```

### Background Job Not Running

```bash
# Test manually
tsx src/jobs/calculate-sample-metrics.ts

# Check job queue logs
# Verify cron schedule is correct
```

## 📚 API Documentation

See `/web/docs/SAMPLE_TRACKING_IMPLEMENTATION.md` for complete API specs and examples.

---

**Quick Reference:**
- Analytics Service: `/src/lib/sample-analytics.ts`
- Background Job: `/src/jobs/calculate-sample-metrics.ts`
- API Routes: `/src/app/api/samples/`
- Seed Script: `/scripts/seed-sample-feedback.ts`
- Tests: `/src/lib/__tests__/sample-analytics.test.ts`
