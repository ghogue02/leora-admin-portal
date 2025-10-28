# Developer Onboarding - Phase 3 Setup

## Welcome

This guide helps new developers get up and running with the Leora Phase 3 codebase, focusing on Samples & Analytics features.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Git**: v2.30.0 or higher
- **Code Editor**: VS Code recommended

## Phase 3 Technology Stack

### Core Technologies
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 5.x
- **AI**: Anthropic Claude SDK
- **UI**: React 18, Tailwind CSS, Shadcn/UI

### New Phase 3 Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.27.0",
  "@prisma/client": "^5.20.0",
  "date-fns": "^2.30.0"
}
```

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourorg/leora.git
cd leora/web
```

### 2. Install Dependencies

```bash
npm install
```

**Phase 3 Specific Packages**:
```bash
npm install @anthropic-ai/sdk
```

### 3. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env.local
```

**Required Environment Variables**:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://postgres:password@localhost:5432/leora"
DIRECT_URL="postgresql://postgres:password@localhost:5432/leora"
SHADOW_DATABASE_URL="postgresql://postgres:password@localhost:5432/leora_shadow"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Phase 3: Anthropic AI (for recommendations)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Phase 3: Sample Analytics Configuration
SAMPLE_ATTRIBUTION_WINDOW_DAYS=30
SAMPLE_BUDGET_DEFAULT_MONTHLY=60

# Optional: Trigger Processing
TRIGGER_PROCESSING_ENABLED=true
TRIGGER_CHECK_INTERVAL_HOURS=6
```

**Getting an Anthropic API Key**:
1. Visit https://console.anthropic.com
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new key
5. Copy and paste into `.env.local`

### 4. Database Setup

**Run Prisma Migrations**:
```bash
npx prisma migrate dev --name init
```

**Seed Database**:
```bash
npm run db:seed
```

**Phase 3 Specific Seeds**:
```bash
# Seed sample metrics historical data
npm run db:seed:sample-metrics

# Seed feedback templates
npm run db:seed:feedback-templates

# Seed example triggers
npm run db:seed:triggers
```

**Verify Database**:
```bash
npx prisma studio
```
- Navigate to http://localhost:5555
- Check for `SampleUsage`, `SampleMetrics`, `Trigger` tables

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

**Test Phase 3 Features**:
- Sales > Samples
- Sales > Analytics > Samples
- Sales > Settings > Triggers

## Phase 3 Project Structure

```
web/
├── prisma/
│   └── schema.prisma              # Database models (SampleUsage, SampleMetrics, etc.)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── samples/
│   │   │   │   ├── quick-assign/route.ts
│   │   │   │   ├── history/[customerId]/route.ts
│   │   │   │   ├── pulled/route.ts
│   │   │   │   ├── feedback-templates/route.ts
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── top-performers/route.ts
│   │   │   │   │   └── rep-leaderboard/route.ts
│   │   │   │   └── supplier-report/route.ts
│   │   │   ├── recommendations/
│   │   │   │   └── products/route.ts
│   │   │   └── admin/
│   │   │       └── triggers/
│   │   │           ├── route.ts
│   │   │           └── [triggerId]/
│   │   │               ├── route.ts
│   │   │               └── logs/route.ts
│   │   └── sales/
│   │       ├── samples/
│   │       │   ├── page.tsx                    # Sample management UI
│   │       │   └── sections/
│   │       │       ├── SampleUsageLog.tsx
│   │       │       ├── SampleBudgetTracker.tsx
│   │       │       └── LogSampleUsageModal.tsx
│   │       └── analytics/
│   │           └── samples/
│   │               ├── page.tsx                # Sample analytics dashboard
│   │               └── sections/
│   │                   ├── ConversionMetrics.tsx
│   │                   ├── TopPerformers.tsx
│   │                   └── RepLeaderboard.tsx
│   ├── lib/
│   │   ├── analytics.ts                        # Analytics calculation logic
│   │   ├── recommendations.ts                  # AI recommendation logic
│   │   ├── triggers.ts                         # Trigger processing logic
│   │   └── anthropic.ts                        # Anthropic SDK client
│   └── types/
│       ├── sample.ts                           # Sample type definitions
│       ├── analytics.ts                        # Analytics types
│       └── recommendations.ts                  # Recommendation types
└── scripts/
    ├── seed-sample-metrics.ts                  # Seed script for sample data
    └── process-triggers.ts                     # Cron job for trigger processing
```

## Key Prisma Models (Phase 3)

### SampleUsage

```prisma
model SampleUsage {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @db.Uuid
  salesRepId      String    @db.Uuid
  customerId      String    @db.Uuid
  skuId           String    @db.Uuid
  quantity        Int       @default(1)
  tastedAt        DateTime
  feedback        String?
  needsFollowUp   Boolean   @default(false)
  followedUpAt    DateTime?
  resultedInOrder Boolean   @default(false)
  createdAt       DateTime  @default(now())

  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  salesRep SalesRep @relation(fields: [salesRepId], references: [id])
  customer Customer @relation(fields: [customerId], references: [id])
  sku      Sku      @relation(fields: [skuId], references: [id])

  @@index([tenantId])
  @@index([salesRepId, tastedAt])
  @@index([customerId])
}
```

### Sample Metrics (Created by analytics job)

Sample metrics are calculated daily and stored for performance. See `scripts/calculate-sample-metrics.ts`.

## Development Workflow

### 1. Feature Development

**Branch naming**:
```bash
git checkout -b feature/phase3-sample-filtering
```

**Commit message format**:
```
feat(samples): add filtering by conversion status

- Add conversionStatus query parameter
- Update SampleUsageLog component with filter dropdown
- Add tests for filtering logic

Closes #123
```

### 2. Running Tests

**Unit Tests**:
```bash
npm run test                    # All tests
npm run test samples            # Sample-related tests only
npm run test:watch              # Watch mode
```

**Integration Tests**:
```bash
npm run test:integration
```

**E2E Tests**:
```bash
npm run test:e2e
```

**Phase 3 Test Coverage**:
- Sample CRUD operations
- Analytics calculations
- Trigger processing
- AI recommendations

### 3. Code Quality

**Linting**:
```bash
npm run lint                    # Check for issues
npm run lint:fix                # Auto-fix issues
```

**Type Checking**:
```bash
npm run typecheck
```

**Formatting**:
```bash
npm run format                  # Check formatting
npm run format:fix              # Auto-format code
```

### 4. Database Migrations

**Create Migration**:
```bash
npx prisma migrate dev --name add_sample_metrics_table
```

**Apply Migration**:
```bash
npx prisma migrate deploy
```

**Reset Database** (development only):
```bash
npx prisma migrate reset
```

## Phase 3 Development Tips

### Working with Sample Analytics

**Analytics Calculation Logic**:

See `src/lib/analytics.ts`:

```typescript
export async function calculateSampleMetrics(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  // 1. Get all samples in date range
  const samples = await prisma.sampleUsage.findMany({
    where: {
      tenantId,
      tastedAt: { gte: startDate, lte: endDate },
    },
    include: {
      customer: {
        include: {
          orders: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            include: { orderLines: true },
          },
        },
      },
    },
  });

  // 2. Group by SKU
  const bySku = groupBy(samples, 'skuId');

  // 3. Calculate metrics per SKU
  const metrics = Object.entries(bySku).map(([skuId, samples]) => {
    const conversions = samples.filter(s => s.resultedInOrder).length;
    const revenue = calculateAttributedRevenue(samples);

    return {
      skuId,
      samplesDistributed: samples.length,
      conversions,
      conversionRate: (conversions / samples.length) * 100,
      revenueGenerated: revenue,
      avgOrderSize: revenue / conversions,
    };
  });

  return metrics;
}
```

**30-Day Attribution Window**:

```typescript
export function checkConversion(sample: SampleUsage, orders: Order[]) {
  const attributionWindow = 30; // days
  const windowEnd = addDays(sample.tastedAt, attributionWindow);

  return orders.some(order => {
    const orderDate = order.createdAt;
    const containsSku = order.orderLines.some(
      line => line.skuId === sample.skuId
    );

    return (
      containsSku &&
      isWithinInterval(orderDate, {
        start: sample.tastedAt,
        end: windowEnd,
      })
    );
  });
}
```

### Working with AI Recommendations

**Anthropic SDK Setup**:

See `src/lib/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateRecommendations(
  customerId: string,
  currentOrderItems: CartItem[]
) {
  // 1. Gather context
  const context = await gatherCustomerContext(customerId);

  // 2. Build prompt
  const prompt = buildRecommendationPrompt(context, currentOrderItems);

  // 3. Call Claude
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // 4. Parse response
  const recommendations = parseRecommendations(message.content);

  return recommendations;
}
```

**Prompt Engineering**:

```typescript
function buildRecommendationPrompt(
  context: CustomerContext,
  currentOrder: CartItem[]
) {
  return `You are a wine sales assistant helping recommend products.

Customer Profile:
- Purchase history: ${JSON.stringify(context.purchaseHistory)}
- Sample tastings: ${JSON.stringify(context.samples)}
- Preferences: ${context.preferences}

Current Order:
${currentOrder.map(item => `- ${item.product.name} x ${item.quantity}`).join('\n')}

Based on this information, recommend 3-5 additional products that:
1. Complement the current order
2. Align with customer preferences
3. Fit their typical price range
4. Are in stock

For each recommendation, provide:
- SKU code
- Confidence score (0-1)
- Brief reasoning (2-3 sentences)
- Suggested quantity

Format as JSON array.`;
}
```

### Working with Triggers

**Trigger Processing Job**:

See `scripts/process-triggers.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function processSampleNoOrderTriggers() {
  const triggers = await prisma.trigger.findMany({
    where: {
      type: 'sample_no_order',
      enabled: true,
    },
  });

  for (const trigger of triggers) {
    const { daysAfterSample } = trigger.config;
    const cutoffDate = subDays(new Date(), daysAfterSample);

    // Find samples that haven't converted
    const samples = await prisma.sampleUsage.findMany({
      where: {
        tastedAt: { lte: cutoffDate },
        resultedInOrder: false,
        // Don't create duplicate tasks
        tasks: { none: { triggerId: trigger.id } },
      },
      include: {
        customer: true,
        sku: { include: { product: true } },
      },
    });

    // Create tasks for each sample
    for (const sample of samples) {
      await createTask({
        type: trigger.config.activityType,
        priority: trigger.config.priority,
        description: fillTemplate(
          trigger.config.descriptionTemplate,
          sample
        ),
        customerId: sample.customerId,
        assignedTo: sample.salesRepId,
        triggerId: trigger.id,
      });
    }
  }
}
```

**Running Trigger Job Locally**:

```bash
npm run triggers:process
```

**Setting up Cron** (production):

```bash
# Every 6 hours
0 */6 * * * cd /path/to/app && npm run triggers:process
```

## Common Development Tasks

### Add New Sample Feedback Template

1. Create migration:
```bash
npx prisma migrate dev --name add_feedback_template_table
```

2. Update schema in `prisma/schema.prisma`

3. Create seed script in `scripts/seed-feedback-templates.ts`

4. Add API endpoint in `src/app/api/samples/feedback-templates/route.ts`

5. Update UI in `src/app/sales/samples/sections/LogSampleUsageModal.tsx`

### Add New Analytics Metric

1. Update analytics types in `src/types/analytics.ts`

2. Add calculation logic in `src/lib/analytics.ts`

3. Update API endpoint in `src/app/api/samples/analytics/route.ts`

4. Add UI component in `src/app/sales/analytics/samples/sections/`

5. Write tests in `src/lib/analytics.test.ts`

### Add New Trigger Type

1. Define trigger type in `src/types/triggers.ts`

2. Add processing logic in `src/lib/triggers.ts`

3. Update trigger processing job in `scripts/process-triggers.ts`

4. Add admin UI in `src/app/sales/settings/triggers/`

5. Write integration tests

## Debugging

### Enable Debug Logging

```bash
# .env.local
DEBUG=samples:*,analytics:*,triggers:*,recommendations:*
```

**In code**:
```typescript
import debug from 'debug';
const log = debug('samples:api');

log('Processing sample assignment for customer %s', customerId);
```

### Prisma Query Logging

```bash
# .env.local
DATABASE_URL="postgresql://...?connection_limit=5&pool_timeout=10&pgbouncer=true&schema_limit=1000"
DEBUG="prisma:query"
```

### Anthropic API Debugging

```typescript
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Enable debug logging
  defaultHeaders: {
    'X-Debug': 'true',
  },
});
```

## Troubleshooting

### "Anthropic API Key Invalid"

1. Check `.env.local` has correct key format (`sk-ant-...`)
2. Verify key is active in Anthropic console
3. Check API quota hasn't been exceeded

### "Sample metrics not updating"

1. Check if cron job is running: `npm run metrics:calculate`
2. Verify database has sample data
3. Check date ranges and attribution window
4. Run manually: `npm run db:seed:sample-metrics`

### "Triggers not firing"

1. Verify triggers are enabled in database
2. Check trigger processing job logs
3. Run manually: `npm run triggers:process`
4. Verify trigger conditions match test data

## Testing Guidelines

### Unit Tests

**Example: Analytics calculation**

```typescript
// src/lib/analytics.test.ts
import { calculateConversionRate } from './analytics';

describe('calculateConversionRate', () => {
  it('calculates conversion rate correctly', () => {
    const samples = 100;
    const conversions = 35;

    const rate = calculateConversionRate(conversions, samples);

    expect(rate).toBe(35.0);
  });

  it('handles zero samples', () => {
    const rate = calculateConversionRate(0, 0);

    expect(rate).toBe(0);
  });
});
```

### Integration Tests

**Example: Sample API**

```typescript
// src/app/api/samples/__tests__/quick-assign.test.ts
import { POST } from '../quick-assign/route';

describe('POST /api/samples/quick-assign', () => {
  it('creates sample usage record', async () => {
    const request = new Request('http://localhost/api/samples/quick-assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        skuId: testSkuId,
        quantity: 1,
        tastedAt: new Date().toISOString(),
        feedback: 'Loved it',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.customerId).toBe(testCustomerId);
  });
});
```

## Performance Optimization

### Sample Analytics Caching

```typescript
// Cache analytics results for 1 hour
import { unstable_cache } from 'next/cache';

export const getCachedSampleAnalytics = unstable_cache(
  async (tenantId: string, startDate: Date, endDate: Date) => {
    return calculateSampleMetrics(tenantId, startDate, endDate);
  },
  ['sample-analytics'],
  {
    revalidate: 3600, // 1 hour
    tags: ['analytics', 'samples'],
  }
);
```

### Database Query Optimization

**Add indexes for common queries**:

```prisma
model SampleUsage {
  // ...

  @@index([tenantId, tastedAt])  // For date range queries
  @@index([customerId, tastedAt]) // For customer history
  @@index([salesRepId, resultedInOrder]) // For rep performance
}
```

## Code Style Guide

Follow existing patterns in the codebase:

- Use TypeScript strict mode
- Prefer functional components (React)
- Use Tailwind CSS for styling
- Follow Prisma naming conventions
- Write descriptive variable names
- Add JSDoc comments for complex functions
- Keep functions small and focused

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- **Team Chat**: #leora-dev Slack channel
- **Code Reviews**: Submit PR for team review
- **Documentation**: Check `/docs` folder
- **Pair Programming**: Schedule with senior dev
- **Office Hours**: Tuesdays 2-4pm

## Next Steps

1. Complete this onboarding guide
2. Run the development server
3. Explore Phase 3 features in the UI
4. Read through the codebase
5. Pick up your first ticket from the backlog
6. Submit your first PR

Welcome to the team! 🎉

---

## Phase 5 Warehouse Setup (Optional Advanced Features)

### New Dependencies

Phase 5 adds warehouse management and routing capabilities.

```json
{
  "csv-parse": "^5.5.0"
}
```

### Warehouse Configuration Seed

After initial setup, initialize warehouse configuration:

```bash
# Seed default warehouse configuration
npx ts-node scripts/seed-warehouse-config.ts
```

**Default Configuration:**
```typescript
{
  aisles: ["A", "B", "C", "D", "E"],
  rowsPerAisle: 10,
  shelfLevels: ["Bottom", "Middle", "Top"],
  pickStrategy: "aisle_then_row"
}
```

### pickOrder Calculation

Understanding the pick order algorithm:

```typescript
// lib/warehouse.ts
export function calculatePickOrder(
  aisle: string,
  row: number,
  shelf: string,
  config: WarehouseConfig
): number {
  // Convert aisle letter to number (A=1, B=2, etc.)
  const aisleNumber = aisle.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

  // Get shelf weight from configuration
  const shelfWeight = config.shelfLevels.indexOf(shelf) + 1;

  // Calculate: (Aisle × 1000) + (Row × 10) + ShelfWeight
  return (aisleNumber * 1000) + (row * 10) + shelfWeight;
}

// Example: B-5-Top
// Aisle B = 2
// Row 5 = 5
// Top (3rd shelf) = 3
// pickOrder = (2 × 1000) + (5 × 10) + 3 = 2053
```

**Why This Works:**
- Aisle changes most expensive (1000 points per aisle)
- Row changes moderate (10 points per row)
- Shelf changes cheapest (1-3 points)
- Lower pickOrder = earlier in pick sequence

### CSV Parsing

Phase 5 uses csv-parse for bulk location import:

```typescript
import { parse } from 'csv-parse/sync';

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

// Validate and import locations
for (const record of records) {
  await importInventoryLocation({
    skuCode: record.sku_code,
    aisle: record.aisle,
    row: parseInt(record.row),
    shelf: record.shelf,
  });
}
```

### Azuga Integration Testing

Test route export/import with mock data:

```bash
# Generate test Azuga export
npm run test:azuga-export

# Import test route
npm run test:azuga-import
```

**Mock Azuga CSV** (`scripts/test-data/azuga-mock.csv`):
```csv
route_name,stop_number,sequence,customer_name,address,estimated_arrival,estimated_duration,order_id,driver_assigned,route_start_time
Test Route,1,1,Wine Bar XYZ,123 Main St SF CA 94102,09:15,15,TEST-ORD-001,John Doe,08:00
Test Route,2,2,Restaurant ABC,456 Oak Ave Oakland CA 94610,10:00,20,TEST-ORD-002,John Doe,08:00
```

### Running Warehouse Features Locally

**Start Development Server:**
```bash
npm run dev
```

**Test Warehouse Features:**
1. Configure warehouse: http://localhost:3000/settings/warehouse
2. Assign locations: http://localhost:3000/warehouse/locations
3. View map: http://localhost:3000/warehouse/map
4. Generate pick sheet: http://localhost:3000/warehouse/pick-sheets

**Test Routing Features:**
1. Export to Azuga: http://localhost:3000/routing/export
2. Import routes: http://localhost:3000/routing/import
3. View routes: http://localhost:3000/routing/routes

### Common Development Tasks

**Add New Shelf Level:**
1. Update warehouse config in database
2. Recalculate all pick orders
3. Update UI dropdown options
4. Add to TypeScript types

**Optimize Pick Route:**
1. Adjust pickOrder weights in `lib/warehouse.ts`
2. Run recalculation: `npm run warehouse:recalculate`
3. Test with sample pick sheet
4. Verify picking sequence is logical

**Add New Route Field:**
1. Update Prisma schema (`RouteStop` model)
2. Run migration: `npx prisma migrate dev`
3. Update Azuga import parser
4. Update route display components
