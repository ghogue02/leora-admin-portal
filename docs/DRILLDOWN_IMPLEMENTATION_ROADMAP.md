# Dashboard Drill-Down Implementation Roadmap

## Overview
This roadmap provides a step-by-step implementation plan for adding drill-down functionality to all dashboard tiles. Each phase is designed to minimize risk and maintain backward compatibility.

---

## Phase 1: Foundation (No Breaking Changes) ✅

**Goal:** Extend existing infrastructure without breaking current functionality

**Duration:** 2-3 hours

### Task 1.1: Update DrilldownModal Type Definition
**File:** `/web/src/app/sales/leora/_components/DrilldownModal.tsx`

**Changes:**
```typescript
// Line 5-13: Update type union
type DrilldownType =
  | 'top-customers'        // ✅ Existing
  | 'top-products'         // ✅ Existing
  | 'customer-risk'        // ✅ Existing
  | 'monthly-trend'        // ✅ Existing
  | 'samples'              // ✅ Existing
  | 'order-status'         // ✅ Existing
  | 'recent-activity'      // ✅ Existing
  | 'revenue-trend'        // 🆕 NEW
  | 'pace-analysis'        // 🆕 NEW
  | 'arpdd-detail'         // 🆕 NEW
  | 'due-soon-customers'   // 🆕 NEW
  | 'at-risk-deep-dive'    // 🆕 NEW
  | 'hotlist-analysis'     // 🆕 NEW
  | null;
```

**Testing:**
- [ ] Verify existing drill-downs still work
- [ ] TypeScript compilation succeeds
- [ ] No runtime errors

**Completion Criteria:**
- Type definition updated
- No breaking changes to AutoInsights.tsx
- All existing functionality works

---

### Task 1.2: Create Shared Type Definitions
**File:** `/web/src/app/sales/leora/_types/drilldown.types.ts` (NEW)

**Purpose:** Centralize type definitions to avoid duplication

**Content:**
```typescript
export type DrilldownType =
  | 'top-customers'
  | 'top-products'
  | 'customer-risk'
  | 'monthly-trend'
  | 'samples'
  | 'order-status'
  | 'recent-activity'
  | 'revenue-trend'
  | 'pace-analysis'
  | 'arpdd-detail'
  | 'due-soon-customers'
  | 'at-risk-deep-dive'
  | 'hotlist-analysis'
  | null;

export type DrilldownData = {
  title: string;
  description: string;
  data: {
    summary?: Record<string, any>;
    items?: Array<any>;
    chartData?: {
      type: 'bar' | 'line' | 'pie';
      data: any;
    };
    insights?: string[];
  };
  columns: Array<{
    key: string;
    label: string;
    format?: (value: any) => string;
  }>;
};
```

**Testing:**
- [ ] Import in DrilldownModal.tsx
- [ ] Import in AutoInsights.tsx
- [ ] No TypeScript errors

**Completion Criteria:**
- Shared types file created
- Both components use shared types
- No duplication

---

## Phase 2: Reusable Components (New Features)

**Goal:** Build reusable DashboardTile component

**Duration:** 3-4 hours

### Task 2.1: Create DashboardTile Component
**File:** `/web/src/app/sales/leora/_components/DashboardTile.tsx` (NEW)

**Features to Implement:**
- [ ] Props interface (title, value, subtitle, trend, drilldownType, onDrilldown)
- [ ] Conditional clickability based on drilldownType prop
- [ ] Hover/focus states for clickable tiles
- [ ] Keyboard navigation (Enter/Space)
- [ ] Trend indicator with up/down/neutral
- [ ] Accessibility attributes (role, tabIndex, aria-label)

**Component Structure:**
```typescript
type DashboardTileProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  drilldownType?: DrilldownType;
  onDrilldown?: (type: DrilldownType) => void;
  className?: string;
};

export function DashboardTile({ ... }) {
  // Implementation
}
```

**Testing Checklist:**
- [ ] Renders with all props
- [ ] Renders without optional props
- [ ] Click handler fires correctly
- [ ] Keyboard navigation works (Enter, Space)
- [ ] Hover states apply
- [ ] Not clickable when drilldownType is undefined
- [ ] Accessibility attributes present

**Unit Tests to Write:**
```typescript
// DashboardTile.test.tsx
describe('DashboardTile', () => {
  it('renders title and value');
  it('renders subtitle when provided');
  it('renders trend indicator with correct color');
  it('calls onDrilldown when clicked');
  it('calls onDrilldown on Enter key');
  it('calls onDrilldown on Space key');
  it('is not clickable without drilldownType');
  it('applies custom className');
  it('has correct accessibility attributes');
});
```

**Completion Criteria:**
- Component file created
- All tests passing
- Storybook story created (optional)
- Peer review completed

---

### Task 2.2: Create SalesDashboard Container
**File:** `/web/src/app/sales/leora/_components/SalesDashboard.tsx` (NEW)

**Features to Implement:**
- [ ] Accept metrics prop
- [ ] Manage drilldownType state
- [ ] Render 6 DashboardTile components
- [ ] Conditional DrilldownModal rendering
- [ ] Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)

**Component Structure:**
```typescript
type SalesDashboardProps = {
  metrics: {
    revenue: { current: number; change: string };
    orders: { current: number; change: string };
    pace: { avg: number; label: string };
    arpdd: { value: number; progress: string };
    atRisk: number;
    dueSoon: number;
  };
};

export function SalesDashboard({ metrics }) {
  const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 6 DashboardTile components */}
      </div>

      {drilldownType && (
        <DrilldownModal
          type={drilldownType}
          onClose={() => setDrilldownType(null)}
        />
      )}
    </>
  );
}
```

**Testing Checklist:**
- [ ] Renders all tiles with correct data
- [ ] Opens modal when tile clicked
- [ ] Closes modal when close button clicked
- [ ] Closes modal on ESC key
- [ ] State resets correctly
- [ ] Responsive layout works

**Integration Tests to Write:**
```typescript
// SalesDashboard.test.tsx
describe('SalesDashboard', () => {
  it('renders all metric tiles');
  it('opens modal when revenue tile clicked');
  it('opens modal when orders tile clicked');
  it('closes modal on close button');
  it('closes modal on ESC key');
  it('displays correct metrics');
  it('applies responsive classes');
});
```

**Completion Criteria:**
- Container component created
- All tests passing
- Works in isolation with mock data
- Ready for page integration

---

## Phase 3: API Implementation (Backend)

**Goal:** Implement API handlers for new drill-down types

**Duration:** 6-8 hours

### Task 3.1: Implement revenue-trend Handler
**File:** `/web/src/app/api/sales/insights/drilldown/route.ts`

**Database Query:**
```sql
SELECT
  TO_CHAR(order_date, 'YYYY-MM') as month,
  SUM(total_amount) as revenue,
  COUNT(*) as orders,
  AVG(total_amount) as avg_order_value,
  LAG(SUM(total_amount)) OVER (ORDER BY TO_CHAR(order_date, 'YYYY-MM')) as prev_revenue
FROM orders
WHERE tenant_id = $1
  AND order_date >= NOW() - INTERVAL '12 months'
GROUP BY TO_CHAR(order_date, 'YYYY-MM')
ORDER BY month DESC
```

**Response Format:**
```typescript
{
  title: "Revenue Trend - Last 12 Months",
  description: "Monthly revenue breakdown with comparisons",
  data: {
    summary: {
      totalRevenue: number,
      avgMonthly: number,
      growth: string,
      topMonth: string
    },
    items: Array<{
      month: string,
      revenue: number,
      orders: number,
      avgOrderValue: number,
      change: string
    }>,
    chartData: {
      type: 'line',
      data: Array<{ label: string, value: number }>
    },
    insights: string[]
  },
  columns: [...formatting rules...]
}
```

**Testing:**
- [ ] Manual test with Postman/curl
- [ ] Unit test with mock database
- [ ] Verify tenant isolation
- [ ] Check error handling
- [ ] Validate response format

**Completion Criteria:**
- Handler implemented
- Returns valid DrilldownData
- Tenant isolation verified
- Error handling tested
- Performance acceptable (<500ms)

---

### Task 3.2: Implement pace-analysis Handler
**File:** `/web/src/app/api/sales/insights/drilldown/route.ts`

**Database Query:**
```sql
SELECT
  c.id as customer_id,
  c.name,
  AVG(EXTRACT(EPOCH FROM (o2.order_date - o1.order_date))/86400) as avg_pace_days,
  COUNT(*) as order_count,
  MAX(o2.order_date) as last_order,
  CASE
    WHEN CURRENT_DATE - MAX(o2.order_date) > AVG(EXTRACT(EPOCH FROM (o2.order_date - o1.order_date))/86400) * 1.5
    THEN 'Late'
    WHEN CURRENT_DATE - MAX(o2.order_date) > AVG(EXTRACT(EPOCH FROM (o2.order_date - o1.order_date))/86400)
    THEN 'Due Soon'
    ELSE 'On Track'
  END as status
FROM customers c
JOIN orders o1 ON o1.customer_id = c.id
JOIN orders o2 ON o2.customer_id = c.id AND o2.order_date > o1.order_date
WHERE c.tenant_id = $1
GROUP BY c.id, c.name
HAVING COUNT(*) >= 2
ORDER BY avg_pace_days ASC
```

**Response Format:**
```typescript
{
  title: "Customer Pace Analysis",
  description: "Order frequency and timing patterns",
  data: {
    summary: {
      avgPace: number,
      onTrack: number,
      dueSoon: number,
      late: number
    },
    items: Array<{
      customerId: string,
      name: string,
      avgPace: number,
      lastOrder: string,
      status: 'On Track' | 'Due Soon' | 'Late'
    }>,
    chartData: {
      type: 'bar',
      data: Array<{ label: string, value: number }>
    },
    insights: string[]
  },
  columns: [...]
}
```

**Testing:**
- [ ] Verify pace calculation accuracy
- [ ] Check status categorization
- [ ] Test with edge cases (1 order, no orders)
- [ ] Validate sorting

**Completion Criteria:**
- Handler implemented
- Accurate calculations
- Edge cases handled
- Performance optimized

---

### Task 3.3: Implement arpdd-detail Handler
**Database Query:**
```sql
SELECT
  DATE(order_date) as delivery_date,
  SUM(total_amount) as revenue,
  COUNT(*) as orders
FROM orders
WHERE tenant_id = $1
  AND order_date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(order_date)
ORDER BY delivery_date DESC
```

---

### Task 3.4: Implement due-soon-customers Handler
**Database Query:**
```sql
WITH customer_pace AS (
  SELECT
    c.id,
    c.name,
    AVG(interval_days) as avg_pace,
    MAX(order_date) as last_order
  FROM customers c
  JOIN LATERAL (
    SELECT
      order_date,
      LEAD(order_date) OVER (ORDER BY order_date) - order_date as interval_days
    FROM orders
    WHERE customer_id = c.id AND tenant_id = $1
  ) o ON true
  WHERE interval_days IS NOT NULL
  GROUP BY c.id, c.name
)
SELECT
  id,
  name,
  avg_pace,
  last_order,
  (CURRENT_DATE - last_order) as days_since_last,
  avg_pace - (CURRENT_DATE - last_order) as days_until_due
FROM customer_pace
WHERE (CURRENT_DATE - last_order) >= avg_pace * 0.8
ORDER BY days_until_due ASC
LIMIT 50
```

---

### Task 3.5: Implement at-risk-deep-dive Handler
**Database Query:**
```sql
WITH risk_analysis AS (
  SELECT
    c.id,
    c.name,
    COUNT(o.id) as total_orders,
    MAX(o.order_date) as last_order,
    AVG(o.total_amount) as avg_order_value,
    SUM(o.total_amount) as lifetime_value,
    AVG(interval_days) as avg_pace,
    CURRENT_DATE - MAX(o.order_date) as days_dormant
  FROM customers c
  JOIN orders o ON o.customer_id = c.id
  WHERE c.tenant_id = $1
  GROUP BY c.id, c.name
)
SELECT
  *,
  CASE
    WHEN days_dormant > avg_pace * 2 THEN 'High Risk'
    WHEN days_dormant > avg_pace * 1.5 THEN 'Medium Risk'
    WHEN days_dormant > avg_pace THEN 'Low Risk'
    ELSE 'Healthy'
  END as risk_level,
  lifetime_value * 0.2 as revenue_at_risk
FROM risk_analysis
WHERE days_dormant > avg_pace
ORDER BY revenue_at_risk DESC
```

---

### Task 3.6: Implement hotlist-analysis Handler
**Database Query:**
```sql
-- Combine at-risk and due-soon customers
(
  SELECT 'At Risk' as category, *
  FROM at_risk_customers
  LIMIT 10
)
UNION ALL
(
  SELECT 'Due Soon' as category, *
  FROM due_soon_customers
  LIMIT 10
)
ORDER BY revenue_potential DESC
```

---

### Task 3.7: Add API Route Tests
**File:** `/web/src/app/api/sales/insights/drilldown/route.test.ts` (NEW)

**Tests to Write:**
```typescript
describe('Drilldown API', () => {
  describe('revenue-trend', () => {
    it('returns 12 months of data');
    it('includes summary statistics');
    it('includes chart data');
    it('includes insights');
    it('filters by tenant');
  });

  describe('pace-analysis', () => {
    it('calculates average pace correctly');
    it('categorizes customers correctly');
    it('handles customers with <2 orders');
  });

  describe('error handling', () => {
    it('returns 400 for invalid type');
    it('returns 401 for unauthenticated');
    it('returns 500 for database errors');
  });
});
```

**Completion Criteria:**
- All 6 handlers implemented
- All tests passing
- Performance benchmarks met (<500ms avg)
- Error handling robust
- Tenant isolation verified

---

## Phase 4: Integration (Frontend + Backend)

**Goal:** Connect UI components to API

**Duration:** 2-3 hours

### Task 4.1: Update DrilldownModal to Use New Types
**File:** `/web/src/app/sales/leora/_components/DrilldownModal.tsx`

**Changes:**
```typescript
// Line 47-66: Update fetchDrilldownData to handle new types
const fetchDrilldownData = async (drilldownType: DrilldownType) => {
  if (!drilldownType) return;

  try {
    setLoading(true);
    setError(null);

    // No changes needed - endpoint already generic
    const response = await fetch(
      `/api/sales/insights/drilldown?type=${drilldownType}`
    );

    // ... existing error handling ...
  } catch (err) {
    // ... existing error handling ...
  }
};
```

**Testing:**
- [ ] All new drill-down types fetch data
- [ ] Loading states work
- [ ] Error states work
- [ ] Data renders correctly

---

### Task 4.2: Integrate SalesDashboard into Page
**File:** `/web/src/app/sales/leora/page.tsx`

**Changes:**
```typescript
// Add import
import { SalesDashboard } from './_components/SalesDashboard';

// In component (around line 397):
<main className="mx-auto flex max-w-5xl flex-col gap-8">
  {/* Existing header */}
  <header>...</header>

  {/* Existing AutoInsights */}
  <AutoInsights onInsightClick={handleSuggestionClick} />

  {/* NEW: Add SalesDashboard */}
  <SalesDashboard
    metrics={{
      revenue: {
        current: metrics?.revenueStatus ? parseFloat(metrics.revenueStatus) : 0,
        change: metrics?.revenueStatus ?? '0%'
      },
      orders: {
        current: metrics?.dueSoonCount ?? 0,
        change: '0%'
      },
      pace: {
        avg: parseInt(metrics?.paceLabel ?? '0'),
        label: metrics?.paceLabel ?? ''
      },
      arpdd: {
        value: parseFloat(metrics?.arpddSummary ?? '0'),
        progress: metrics?.arpddSummary ?? ''
      },
      atRisk: metrics?.atRiskCount ?? 0,
      dueSoon: metrics?.dueSoonCount ?? 0
    }}
  />

  {/* Existing chat section */}
  <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
    ...
  </section>
</main>
```

**Testing:**
- [ ] Dashboard renders on page
- [ ] Metrics display correctly
- [ ] Tiles are clickable
- [ ] Modals open/close
- [ ] No layout issues
- [ ] Responsive design works

---

### Task 4.3: Add Loading States
**File:** `/web/src/app/sales/leora/_components/SalesDashboard.tsx`

**Enhancement:**
```typescript
type SalesDashboardProps = {
  metrics: {...};
  loading?: boolean; // NEW
};

export function SalesDashboard({ metrics, loading = false }) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <DashboardTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ... existing render
}
```

**Completion Criteria:**
- Loading states implemented
- Skeleton screens look good
- Smooth transitions

---

## Phase 5: Polish & Optimization

**Goal:** Enhance UX and performance

**Duration:** 3-4 hours

### Task 5.1: Add Keyboard Shortcuts
**File:** `/web/src/app/sales/leora/_components/DrilldownModal.tsx`

**Enhancement:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

**Testing:**
- [ ] ESC key closes modal
- [ ] No event listener leaks

---

### Task 5.2: Add Loading Skeletons
**File:** `/web/src/app/sales/leora/_components/DashboardTileSkeleton.tsx` (NEW)

**Implementation:**
```typescript
export function DashboardTileSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="mt-2 h-8 w-32 bg-gray-300 rounded" />
      <div className="mt-1 h-3 w-20 bg-gray-200 rounded" />
    </div>
  );
}
```

---

### Task 5.3: Add Accessibility Enhancements
**Files:** All components

**Enhancements:**
- [ ] Add aria-labels to all clickable elements
- [ ] Add focus indicators
- [ ] Add screen reader announcements
- [ ] Add skip links
- [ ] Test with screen reader
- [ ] Test keyboard-only navigation

**ARIA Additions:**
```typescript
// DashboardTile
aria-label={`View details for ${title}`}
role="button"
tabIndex={0}

// DrilldownModal
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"

// Announcements
<div role="status" aria-live="polite" className="sr-only">
  {announcement}
</div>
```

---

### Task 5.4: Add Performance Monitoring
**File:** `/web/src/lib/analytics.ts` (NEW)

**Implementation:**
```typescript
export function trackDrilldownOpen(type: DrilldownType) {
  // Log to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'drilldown_open', {
      drilldown_type: type,
    });
  }
}

export function trackDrilldownPerformance(type: DrilldownType, duration: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'timing_complete', {
      name: 'drilldown_load',
      value: duration,
      event_category: type,
    });
  }
}
```

**Usage in DrilldownModal:**
```typescript
const fetchDrilldownData = async (drilldownType: DrilldownType) => {
  const start = performance.now();

  try {
    trackDrilldownOpen(drilldownType);

    // ... fetch logic ...

    const duration = performance.now() - start;
    trackDrilldownPerformance(drilldownType, duration);
  } catch (err) {
    // ... error handling ...
  }
};
```

---

### Task 5.5: Optimize Database Queries
**File:** `/web/src/app/api/sales/insights/drilldown/route.ts`

**Optimizations:**
- [ ] Add database indexes
- [ ] Use prepared statements
- [ ] Implement query result caching
- [ ] Add connection pooling
- [ ] Optimize aggregations

**Indexes to Add:**
```sql
-- Create indexes for performance
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, order_date DESC);
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
```

**Caching Strategy:**
```typescript
import { cache } from 'react';

// Cache for 60 seconds
export const getDrilldownData = cache(async (type: DrilldownType, tenantId: string) => {
  // ... query logic ...
});

// Use in route handler
const data = await getDrilldownData(type, tenantId);
```

---

## Phase 6: Testing & QA

**Goal:** Comprehensive testing before production

**Duration:** 4-6 hours

### Task 6.1: Unit Test Coverage
**Target:** 80%+ coverage

**Files to Test:**
- [ ] DashboardTile.test.tsx (100%)
- [ ] SalesDashboard.test.tsx (90%)
- [ ] DrilldownModal.test.tsx (85%)
- [ ] API route handlers (80%)

**Run Coverage:**
```bash
npm run test:coverage
```

---

### Task 6.2: Integration Tests
**File:** `/web/src/app/sales/leora/__tests__/drilldown-integration.test.tsx` (NEW)

**Test Scenarios:**
```typescript
describe('Drilldown Integration', () => {
  it('complete flow: tile click → API call → modal render → close');
  it('error handling: API error → error UI → retry');
  it('keyboard navigation: focus tile → Enter → modal open → ESC → modal close');
  it('mobile responsive: all breakpoints work');
});
```

---

### Task 6.3: E2E Tests with Playwright
**File:** `/web/e2e/drilldown.spec.ts` (NEW)

**Test Scenarios:**
```typescript
test.describe('Dashboard Drill-down', () => {
  test('should open revenue drill-down', async ({ page }) => {
    await page.goto('/sales/leora');
    await page.click('[data-testid="revenue-tile"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Revenue Trend')).toBeVisible();
  });

  test('should export CSV', async ({ page }) => {
    // ... test CSV export functionality
  });

  test('should work on mobile', async ({ page, viewport }) => {
    await viewport.setSize({ width: 375, height: 667 });
    // ... test mobile interactions
  });
});
```

**Run E2E Tests:**
```bash
npx playwright test
```

---

### Task 6.4: Manual QA Checklist
**Test in all browsers:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Test on all devices:**
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Test scenarios:**
- [ ] Click all 6 tiles
- [ ] Verify data accuracy for each
- [ ] Test CSV export
- [ ] Test keyboard navigation
- [ ] Test screen reader
- [ ] Test loading states
- [ ] Test error states
- [ ] Test with slow network (throttle to 3G)

---

### Task 6.5: Performance Testing
**Metrics to Measure:**
- [ ] Initial page load (< 2s)
- [ ] Tile click to modal render (< 300ms)
- [ ] API response time (< 500ms)
- [ ] Modal animation smoothness (60fps)
- [ ] CSV export speed (< 1s for 1000 rows)

**Tools:**
```bash
# Lighthouse
npm run lighthouse

# Web Vitals
# Check in browser DevTools

# Load testing
# Use k6 or Artillery for API
```

---

### Task 6.6: Security Audit
**Checklist:**
- [ ] Tenant isolation verified in all endpoints
- [ ] SQL injection prevented (using Drizzle ORM)
- [ ] XSS prevented (React escapes by default)
- [ ] Rate limiting in place
- [ ] Authentication required
- [ ] Authorization checked
- [ ] No sensitive data in logs
- [ ] HTTPS enforced

---

## Phase 7: Documentation & Launch

**Goal:** Document everything and deploy to production

**Duration:** 2-3 hours

### Task 7.1: Update Component Documentation
**Files to Document:**
- [ ] DashboardTile.tsx - Add JSDoc comments
- [ ] SalesDashboard.tsx - Add usage examples
- [ ] DrilldownModal.tsx - Update with new types

**Example JSDoc:**
```typescript
/**
 * Reusable dashboard tile component with optional drill-down functionality.
 *
 * @example
 * ```tsx
 * <DashboardTile
 *   title="Revenue"
 *   value="$125,000"
 *   subtitle="This week"
 *   trend={{ value: "+12%", direction: "up" }}
 *   drilldownType="revenue-trend"
 *   onDrilldown={setDrilldownType}
 * />
 * ```
 *
 * @param props - Component props
 * @returns Rendered dashboard tile
 */
export function DashboardTile(props: DashboardTileProps) { ... }
```

---

### Task 7.2: Update API Documentation
**File:** `/web/docs/API.md`

**Add:**
```markdown
## Drill-down Endpoints

### GET /api/sales/insights/drilldown

Returns detailed data for dashboard drill-downs.

**Query Parameters:**
- `type` (required): One of: revenue-trend, pace-analysis, arpdd-detail, due-soon-customers, at-risk-deep-dive, hotlist-analysis

**Response:**
```json
{
  "title": "string",
  "description": "string",
  "data": {
    "summary": {},
    "items": [],
    "chartData": {},
    "insights": []
  },
  "columns": []
}
```

**Example:**
```bash
curl -X GET 'https://api.example.com/api/sales/insights/drilldown?type=revenue-trend'
```
```

---

### Task 7.3: Create Migration Guide
**File:** `/web/docs/MIGRATION_GUIDE.md` (NEW)

**Content:**
```markdown
# Drill-down Migration Guide

## For Developers

### Old Pattern (AutoInsights only)
```tsx
<AutoInsights onInsightClick={handleClick} />
```

### New Pattern (With Dashboard)
```tsx
<AutoInsights onInsightClick={handleClick} />
<SalesDashboard metrics={metrics} />
```

## API Changes

No breaking changes. New endpoints added:
- revenue-trend
- pace-analysis
- arpdd-detail
- due-soon-customers
- at-risk-deep-dive
- hotlist-analysis

## Database Changes

New indexes required:
```sql
CREATE INDEX ...
```
```

---

### Task 7.4: Create Release Notes
**File:** `CHANGELOG.md`

**Entry:**
```markdown
## [2.1.0] - 2025-10-20

### Added
- Dashboard tiles with drill-down functionality
- New API endpoints for detailed metrics
- Keyboard navigation support
- CSV export for all drill-downs
- Accessibility enhancements

### Changed
- Improved DrilldownModal to support 6 new types
- Enhanced responsive design for mobile

### Performance
- Added database indexes for faster queries
- Implemented query result caching
- Optimized modal rendering

### Security
- Verified tenant isolation across all endpoints
- Added rate limiting to drill-down API
```

---

### Task 7.5: Deploy to Staging
**Checklist:**
- [ ] Run full test suite
- [ ] Build production bundle
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Verify database migrations
- [ ] Check error logging
- [ ] Monitor performance

**Commands:**
```bash
# Build
npm run build

# Test build locally
npm run start

# Deploy to staging
git push origin develop

# Run smoke tests
npm run test:e2e -- --headed
```

---

### Task 7.6: Production Deployment
**Pre-deployment Checklist:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Staging environment stable for 24 hours
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Rollback plan documented

**Deployment Steps:**
1. Create release branch: `git checkout -b release/2.1.0`
2. Update version: `npm version minor`
3. Merge to main: `git merge release/2.1.0`
4. Tag release: `git tag v2.1.0`
5. Push: `git push origin main --tags`
6. Deploy: CI/CD pipeline auto-deploys
7. Monitor: Check logs, metrics, errors
8. Announce: Notify team of release

**Post-deployment:**
- [ ] Monitor error rates (< 0.1%)
- [ ] Monitor performance (< 500ms API)
- [ ] Monitor user adoption
- [ ] Collect feedback
- [ ] Plan next iteration

---

## Success Metrics

### Technical Metrics
- [ ] Test coverage > 80%
- [ ] API response time < 500ms
- [ ] Page load time < 2s
- [ ] Zero critical bugs
- [ ] Zero security vulnerabilities

### User Metrics
- [ ] Drill-down usage > 50% of users
- [ ] Average session time +20%
- [ ] User satisfaction score > 4/5
- [ ] Support tickets < 5 per week

### Business Metrics
- [ ] Feature adoption > 70% within 2 weeks
- [ ] Positive user feedback
- [ ] Reduced time to insight (measured)
- [ ] Increased data exploration

---

## Rollback Plan

If critical issues arise in production:

1. **Immediate Rollback:**
   ```bash
   git revert v2.1.0
   git push origin main
   # Trigger redeployment
   ```

2. **Database Rollback:**
   ```sql
   -- Remove indexes if needed
   DROP INDEX IF EXISTS idx_orders_tenant_date;
   ```

3. **Feature Flag (Alternative):**
   ```typescript
   const ENABLE_DRILLDOWN = process.env.NEXT_PUBLIC_ENABLE_DRILLDOWN === 'true';

   {ENABLE_DRILLDOWN && <SalesDashboard ... />}
   ```

4. **Communication:**
   - Notify users of issue
   - Provide workaround if possible
   - Set timeline for fix

---

## Future Enhancements

**Phase 8 (Future):**
- [ ] URL state management for shareable links
- [ ] Advanced filtering in drill-downs
- [ ] Drill-down within drill-downs
- [ ] Custom date range selection
- [ ] Export to Excel with charts
- [ ] Save favorite drill-downs
- [ ] Scheduled email reports
- [ ] Drill-down customization per user
- [ ] Comparison mode (YoY, MoM)
- [ ] Predictive insights with AI

---

## Resources

**Documentation:**
- Architecture: `/web/docs/DRILLDOWN_ARCHITECTURE.md`
- Diagrams: `/web/docs/DRILLDOWN_DIAGRAM.md`
- API Docs: `/web/docs/API.md`

**Code:**
- Components: `/web/src/app/sales/leora/_components/`
- API: `/web/src/app/api/sales/insights/drilldown/`
- Tests: `/web/src/app/sales/leora/__tests__/`

**Tools:**
- Design: Figma (if available)
- Tracking: Jira/GitHub Issues
- Analytics: Google Analytics / Mixpanel
- Monitoring: Sentry / Datadog

---

**Roadmap Version:** 1.0
**Last Updated:** 2025-10-20
**Estimated Total Time:** 22-30 hours
**Status:** Ready to Execute
