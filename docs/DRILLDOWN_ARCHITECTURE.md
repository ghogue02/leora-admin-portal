# Dashboard Drill-Down Architecture

## Executive Summary

This document defines a scalable, reusable drill-down architecture for all dashboard tiles. The architecture leverages the existing `DrilldownModal` component and extends it to support all dashboard metrics while maintaining backward compatibility.

## Architecture Analysis

### Existing Components

**1. DrilldownModal.tsx** (Lines 1-347)
- ✅ Already exists and is production-ready
- ✅ Supports multiple drill-down types via union type
- ✅ Has loading states, error handling, and responsive design
- ✅ Includes data visualization (bar, line, pie charts)
- ✅ Has CSV export functionality
- ✅ Mobile-responsive with sticky header/footer

**2. AutoInsights.tsx** (Lines 1-407)
- ✅ Already implements clickable tiles pattern
- ✅ Integrates with DrilldownModal
- ✅ Uses cursor-pointer and hover effects for UX

**Current Supported Types:**
```typescript
type DrilldownType =
  | 'top-customers'
  | 'top-products'
  | 'customer-risk'
  | 'monthly-trend'
  | 'samples'
  | 'order-status'
  | 'recent-activity'
  | null;
```

## Recommended Architecture

### 1. Modal vs Sidebar vs New Page

**Decision: Modal (Current Approach) ✅**

**Rationale:**
- ✅ Non-disruptive to user flow
- ✅ Maintains context (user can still see dashboard behind modal)
- ✅ Quick to open/close
- ✅ Already implemented and battle-tested
- ✅ Works well on mobile with responsive design
- ✅ Supports overlay pattern for focus

**Alternatives Considered:**
- ❌ Sidebar: Would require layout restructuring, harder to make responsive
- ❌ New Page: Loses context, requires navigation, slower UX

### 2. Component Structure

```
┌─────────────────────────────────────────┐
│         Any Dashboard Tile              │
│  (Revenue, Orders, Customers, etc.)     │
│                                         │
│  onClick={() => setDrilldown('type')}  │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      DrilldownModal (Generic)           │
│  - Receives type prop                   │
│  - Fetches data from API                │
│  - Renders flexible content             │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   /api/sales/insights/drilldown         │
│   ?type=revenue-trend                   │
│   Returns: DrilldownData                │
└─────────────────────────────────────────┘
```

### 3. Data Contract (DrilldownData)

The existing contract is well-designed and flexible:

```typescript
type DrilldownData = {
  title: string;              // Modal header title
  description: string;        // Subtitle/explanation
  data: {
    summary?: Record<string, any>;    // Top-level stats (optional)
    items?: Array<any>;                // Table data (optional)
    chartData?: {                      // Visualization (optional)
      type: 'bar' | 'line' | 'pie';
      data: any;
    };
    insights?: string[];               // AI-generated insights (optional)
  };
  columns: Array<{
    key: string;
    label: string;
    format?: (value: any) => string;   // Custom formatters
  }>;
};
```

**Flexibility Benefits:**
- ✅ Supports tables, charts, or both
- ✅ Optional summary statistics
- ✅ Custom column formatters for currency, dates, etc.
- ✅ AI insights section for actionable recommendations

### 4. Data Fetching Strategy

**Approach: Lazy Loading on Click ✅**

```typescript
// Component-level state management
const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);

// User clicks tile
<div onClick={() => setDrilldownType('revenue-trend')}>

// Modal fetches data on mount
useEffect(() => {
  if (type) {
    fetchDrilldownData(type);
  }
}, [type]);
```

**Benefits:**
- ✅ Only fetches data when needed
- ✅ Reduces initial page load
- ✅ Each drill-down can fetch different data sets
- ✅ Server-side filtering/aggregation possible

**Alternative (NOT Recommended):**
- ❌ Prefetch all drill-down data: Wastes bandwidth, slows initial load
- ❌ Client-side filtering: Requires loading full dataset

### 5. URL State Management

**Decision: Optional, Not Required for MVP ⚠️**

**Current State:**
- Modal is controlled by React state only
- No URL sync

**Future Enhancement:**
If URL sharing/bookmarking is needed:

```typescript
// Use Next.js useSearchParams
const searchParams = useSearchParams();
const router = useRouter();

// Sync state to URL
const setDrilldownType = (type: DrilldownType) => {
  const params = new URLSearchParams(searchParams);
  if (type) {
    params.set('drilldown', type);
  } else {
    params.delete('drilldown');
  }
  router.push(`?${params.toString()}`, { shallow: true });
};
```

**Recommendation:** Add this only if users request shareable drill-down links.

---

## API Design

### Endpoint Structure

**Existing Endpoint:**
```
GET /api/sales/insights/drilldown?type={drilldownType}
```

**Response Format:**
```json
{
  "title": "Revenue Trend - Last 12 Months",
  "description": "Detailed monthly revenue breakdown with comparisons",
  "data": {
    "summary": {
      "totalRevenue": 1250000,
      "avgMonthly": 104166,
      "growth": "+12.5%",
      "topMonth": "November 2024"
    },
    "items": [
      {
        "month": "2024-11",
        "revenue": 125000,
        "orders": 450,
        "avgOrderValue": 277.78,
        "change": "+15.2%"
      }
    ],
    "chartData": {
      "type": "line",
      "data": [
        { "label": "Nov", "value": 125000 },
        { "label": "Oct", "value": 108500 }
      ]
    },
    "insights": [
      "Revenue increased 15.2% month-over-month in November",
      "Holiday season driving higher average order values",
      "Consider increasing inventory for Q4 2025"
    ]
  },
  "columns": [
    { "key": "month", "label": "Month" },
    { "key": "revenue", "label": "Revenue" },
    { "key": "orders", "label": "Orders" },
    { "key": "change", "label": "Change" }
  ]
}
```

### New Drill-Down Types Needed

Based on dashboard metrics (from page.tsx lines 19-33), we need to add:

```typescript
type DrilldownType =
  | 'top-customers'        // ✅ Already exists
  | 'top-products'         // ✅ Already exists
  | 'customer-risk'        // ✅ Already exists
  | 'monthly-trend'        // ✅ Already exists
  | 'samples'              // ✅ Already exists
  | 'order-status'         // ✅ Already exists
  | 'recent-activity'      // ✅ Already exists
  | 'revenue-trend'        // 🆕 Weekly/monthly revenue detail
  | 'pace-analysis'        // 🆕 Customer order pace breakdown
  | 'arpdd-detail'         // 🆕 Average Revenue Per Delivery Day
  | 'due-soon-customers'   // 🆕 Customers due for next order
  | 'at-risk-deep-dive'    // 🆕 At-risk customer analysis
  | 'hotlist-analysis'     // 🆕 Hotlist customer details
  | null;
```

### API Endpoint Mapping

Each new type should return data following the `DrilldownData` contract:

**1. revenue-trend**
```typescript
// Summary: Total, Growth, Comparison
// Items: Weekly/Monthly breakdown
// Chart: Line chart of revenue over time
// Insights: Trends, seasonality, forecasts
```

**2. pace-analysis**
```typescript
// Summary: Average pace, On-time %, Late %
// Items: Customer list with pace metrics
// Chart: Bar chart of pace distribution
// Insights: Customers deviating from normal pace
```

**3. arpdd-detail**
```typescript
// Summary: Current ARPDD, Target, Gap
// Items: Daily revenue breakdown
// Chart: Bar chart of revenue per delivery day
// Insights: High/low performing days
```

**4. due-soon-customers**
```typescript
// Summary: Count, Total potential revenue
// Items: Customer list with due dates, last order
// Chart: Timeline visualization
// Insights: Priority customers to contact
```

**5. at-risk-deep-dive**
```typescript
// Summary: Total at-risk, Revenue impact
// Items: Customer list with risk scores, recommended actions
// Chart: Risk category distribution
// Insights: Root cause analysis, retention strategies
```

**6. hotlist-analysis**
```typescript
// Summary: Hotlist criteria, Top opportunities
// Items: Detailed customer breakdown
// Chart: Opportunity size distribution
// Insights: Outreach recommendations, scripts
```

---

## Implementation Guide

### Step 1: Update DrilldownModal Type Definition

**File:** `/web/src/app/sales/leora/_components/DrilldownModal.tsx`

```typescript
// Line 5-13: Expand type definition
type DrilldownType =
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
```

### Step 2: Create Reusable Dashboard Tile Component

**File:** `/web/src/app/sales/leora/_components/DashboardTile.tsx` (NEW)

```typescript
'use client';

import { ReactNode } from 'react';

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

export function DashboardTile({
  title,
  value,
  subtitle,
  icon,
  trend,
  drilldownType,
  onDrilldown,
  className = '',
}: DashboardTileProps) {
  const isClickable = drilldownType && onDrilldown;

  return (
    <div
      className={`
        rounded-lg border bg-white p-6 shadow-sm transition-all
        ${isClickable ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md' : ''}
        ${className}
      `}
      onClick={isClickable ? () => onDrilldown(drilldownType) : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDrilldown(drilldownType);
        }
      } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-gray-600">{icon}</span>}
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  trend.direction === 'up'
                    ? 'text-green-600'
                    : trend.direction === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.direction === 'neutral' && '→'}
                {' '}{trend.value}
              </span>
            </div>
          )}
        </div>
        {isClickable && (
          <span className="text-xs text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
            View details →
          </span>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Create Dashboard Container with Drill-Down

**File:** `/web/src/app/sales/leora/_components/SalesDashboard.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { DashboardTile } from './DashboardTile';
import { DrilldownModal } from './DrilldownModal';

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

export function SalesDashboard({ metrics }: SalesDashboardProps) {
  const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardTile
          title="Revenue"
          value={`$${metrics.revenue.current.toLocaleString()}`}
          subtitle="This week"
          trend={{ value: metrics.revenue.change, direction: 'up' }}
          drilldownType="revenue-trend"
          onDrilldown={setDrilldownType}
        />

        <DashboardTile
          title="Orders"
          value={metrics.orders.current}
          subtitle="This week"
          trend={{ value: metrics.orders.change, direction: 'up' }}
          drilldownType="order-status"
          onDrilldown={setDrilldownType}
        />

        <DashboardTile
          title="Average Pace"
          value={`${metrics.pace.avg} days`}
          subtitle={metrics.pace.label}
          drilldownType="pace-analysis"
          onDrilldown={setDrilldownType}
        />

        <DashboardTile
          title="ARPDD"
          value={`$${metrics.arpdd.value.toLocaleString()}`}
          subtitle={metrics.arpdd.progress}
          drilldownType="arpdd-detail"
          onDrilldown={setDrilldownType}
        />

        <DashboardTile
          title="Due Soon"
          value={metrics.dueSoon}
          subtitle="Customers"
          drilldownType="due-soon-customers"
          onDrilldown={setDrilldownType}
          className="border-orange-200"
        />

        <DashboardTile
          title="At Risk"
          value={metrics.atRisk}
          subtitle="Customers"
          drilldownType="at-risk-deep-dive"
          onDrilldown={setDrilldownType}
          className="border-red-200"
        />
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

### Step 4: Implement API Endpoint Handlers

**File:** `/web/src/app/api/sales/insights/drilldown/route.ts`

Add new cases to the switch statement:

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as DrilldownType;

  switch (type) {
    case 'revenue-trend':
      return handleRevenueTrend();

    case 'pace-analysis':
      return handlePaceAnalysis();

    case 'arpdd-detail':
      return handleArpddDetail();

    case 'due-soon-customers':
      return handleDueSoonCustomers();

    case 'at-risk-deep-dive':
      return handleAtRiskDeepDive();

    case 'hotlist-analysis':
      return handleHotlistAnalysis();

    // ... existing cases

    default:
      return NextResponse.json(
        { error: 'Unknown drill-down type' },
        { status: 400 }
      );
  }
}
```

### Step 5: UX Enhancements

**Keyboard Navigation:**
- ✅ Already implemented: tabIndex and onKeyDown
- Tiles are focusable and activatable with Enter/Space

**Visual Feedback:**
```css
/* Hover state */
hover:border-indigo-300 hover:shadow-md

/* Click state (add this) */
active:scale-[0.98] active:shadow-sm

/* Loading state */
opacity-50 cursor-wait pointer-events-none
```

**Loading States:**
```typescript
const [loadingDrilldown, setLoadingDrilldown] = useState(false);

const handleDrilldown = async (type: DrilldownType) => {
  setLoadingDrilldown(true);
  setDrilldownType(type);
  // Modal will show loading spinner internally
};
```

**Mobile Optimization:**
- ✅ Already responsive with max-w-4xl and max-h-[90vh]
- ✅ Sticky header/footer
- ✅ Touch-friendly tap targets

---

## Testing Strategy

### 1. Unit Tests

```typescript
// DashboardTile.test.tsx
describe('DashboardTile', () => {
  it('renders tile with value', () => {
    render(<DashboardTile title="Revenue" value="$10,000" />);
    expect(screen.getByText('$10,000')).toBeInTheDocument();
  });

  it('calls onDrilldown when clicked', () => {
    const handleDrilldown = jest.fn();
    render(
      <DashboardTile
        title="Revenue"
        value="$10,000"
        drilldownType="revenue-trend"
        onDrilldown={handleDrilldown}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleDrilldown).toHaveBeenCalledWith('revenue-trend');
  });

  it('is not clickable without drilldownType', () => {
    render(<DashboardTile title="Revenue" value="$10,000" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

### 2. Integration Tests

```typescript
// SalesDashboard.test.tsx
describe('SalesDashboard drill-down', () => {
  it('opens modal when tile is clicked', async () => {
    render(<SalesDashboard metrics={mockMetrics} />);

    fireEvent.click(screen.getByText('Revenue'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('closes modal on ESC key', async () => {
    render(<SalesDashboard metrics={mockMetrics} />);

    fireEvent.click(screen.getByText('Revenue'));
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
```

### 3. E2E Tests (Playwright)

```typescript
test('complete drill-down flow', async ({ page }) => {
  await page.goto('/sales/leora');

  // Click revenue tile
  await page.click('text=Revenue');

  // Wait for modal
  await page.waitForSelector('[role="dialog"]');

  // Verify data loaded
  await expect(page.locator('text=Revenue Trend')).toBeVisible();

  // Export CSV
  await page.click('text=Export to CSV');

  // Close modal
  await page.click('text=Close');

  // Verify modal closed
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});
```

---

## Performance Considerations

### 1. Data Loading

**Current Approach (Good):**
- Lazy load on modal open
- Single API call per drill-down
- Server-side aggregation

**Optimization Opportunities:**
```typescript
// Add caching with SWR or React Query
import useSWR from 'swr';

function DrilldownModal({ type, onClose }: DrilldownModalProps) {
  const { data, error, isLoading } = useSWR(
    type ? `/api/sales/insights/drilldown?type=${type}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute cache
    }
  );

  // ... rest of component
}
```

### 2. Bundle Size

**Current Chart Components:**
- Simple custom components (good for bundle size)
- No heavy chart library dependencies

**If Complex Charts Needed:**
```typescript
// Lazy load chart library
const RechartsChart = lazy(() => import('./RechartsChart'));

{data.chartData && (
  <Suspense fallback={<ChartSkeleton />}>
    <RechartsChart data={data.chartData} />
  </Suspense>
)}
```

### 3. Modal Performance

**Current Implementation:**
- ✅ Unmounts when closed (no memory leak)
- ✅ Fixed positioning (no reflow issues)
- ✅ Conditional rendering (only renders when open)

**Potential Issue:**
- Large data tables could cause scroll lag

**Solution:**
```typescript
// Virtualize long tables with react-window
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={500}
  itemCount={data.items.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{/* Row content */}</div>
  )}
</FixedSizeList>
```

---

## Migration Path

### Phase 1: No Breaking Changes ✅
- Keep existing AutoInsights as-is
- DrilldownModal supports existing types
- Add new types incrementally

### Phase 2: Add New Dashboard Tiles
```typescript
// Create SalesDashboard component
// Add new drill-down types
// Implement API handlers
```

### Phase 3: Integrate into Page
```typescript
// Replace metrics sidebar with dashboard tiles
// Keep AutoInsights for AI-driven questions
// Both use same DrilldownModal
```

### Phase 4: Optimization
```typescript
// Add caching layer
// Implement virtual scrolling if needed
// Add URL state management if requested
```

---

## Code Patterns to Follow

### 1. Tile Pattern
```typescript
<DashboardTile
  title="Metric Name"
  value={formattedValue}
  drilldownType="type-name"
  onDrilldown={setDrilldownType}
/>
```

### 2. Modal Pattern
```typescript
{drilldownType && (
  <DrilldownModal
    type={drilldownType}
    onClose={() => setDrilldownType(null)}
    tenantId={tenantId} // optional
  />
)}
```

### 3. API Response Pattern
```typescript
return NextResponse.json({
  title: "Drill-down Title",
  description: "Helpful explanation",
  data: {
    summary: { key: value },
    items: [{ ... }],
    chartData: { type: 'bar', data: [...] },
    insights: ["Insight 1", "Insight 2"]
  },
  columns: [
    { key: 'col', label: 'Column', format: (v) => `$${v}` }
  ]
});
```

### 4. State Management Pattern
```typescript
const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);

// In tile
onClick={() => setDrilldownType('revenue-trend')}

// In modal
onClose={() => setDrilldownType(null)}
```

---

## Security Considerations

### 1. Tenant Isolation
```typescript
// Always filter by tenant in API
const userId = await getUserId(request);
const tenantId = await getTenantId(userId);

// All queries must include tenant filter
WHERE tenant_id = ${tenantId}
```

### 2. Data Sanitization
```typescript
// Sanitize user inputs
const type = searchParams.get('type') as DrilldownType;

if (!ALLOWED_DRILLDOWN_TYPES.includes(type)) {
  return NextResponse.json(
    { error: 'Invalid drill-down type' },
    { status: 400 }
  );
}
```

### 3. Rate Limiting
```typescript
// Add rate limiting to drill-down endpoint
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

await limiter.check(request, 10); // 10 requests per minute
```

---

## Accessibility (a11y)

### 1. Keyboard Navigation
```typescript
// ✅ Already implemented
tabIndex={isClickable ? 0 : undefined}
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onDrilldown(drilldownType);
  }
}}
```

### 2. ARIA Attributes
```typescript
// Add to DashboardTile
aria-label={`View details for ${title}`}
aria-describedby={`${id}-description`}

// Add to DrilldownModal
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"
```

### 3. Focus Management
```typescript
// Trap focus in modal
import { FocusTrap } from '@/components/FocusTrap';

<FocusTrap>
  <div role="dialog">
    {/* Modal content */}
  </div>
</FocusTrap>
```

### 4. Screen Reader Support
```typescript
// Announce modal open/close
const [announcement, setAnnouncement] = useState('');

<div role="status" aria-live="polite" className="sr-only">
  {announcement}
</div>

// When modal opens
setAnnouncement('Details modal opened');

// When modal closes
setAnnouncement('Details modal closed');
```

---

## Summary

### What We're Reusing ✅
1. **DrilldownModal** - Entire component (lines 36-347)
2. **API Endpoint** - `/api/sales/insights/drilldown`
3. **Data Contract** - `DrilldownData` type
4. **Charts** - Bar, Line, Pie components
5. **CSV Export** - Export functionality

### What We're Adding 🆕
1. **DashboardTile** - Reusable clickable tile component
2. **SalesDashboard** - Container with all metrics
3. **New Drill-Down Types** - 6 additional types
4. **API Handlers** - Handlers for new types
5. **Enhanced UX** - Keyboard nav, better accessibility

### Implementation Order
1. ✅ Update `DrilldownType` union
2. ✅ Create `DashboardTile` component
3. ✅ Create `SalesDashboard` container
4. ✅ Implement API handlers for new types
5. ✅ Add to page.tsx
6. ✅ Test and optimize

### Breaking Changes
**NONE** - This architecture is fully backward compatible with existing code.

---

## Quick Start Checklist

- [ ] Copy `DrilldownModal.tsx` patterns for new types
- [ ] Create `DashboardTile.tsx` with clickable pattern
- [ ] Add new types to `DrilldownType` union
- [ ] Implement API handlers returning `DrilldownData`
- [ ] Wire up tiles with `onClick={() => setDrilldownType('type')}`
- [ ] Add `{drilldownType && <DrilldownModal ... />}` to page
- [ ] Test keyboard navigation and mobile responsiveness
- [ ] Verify tenant isolation in API handlers
- [ ] Add loading states and error handling
- [ ] Document new drill-down types in this file

---

## File Locations

**Existing:**
- `/web/src/app/sales/leora/_components/DrilldownModal.tsx`
- `/web/src/app/sales/leora/_components/AutoInsights.tsx`
- `/web/src/app/api/sales/insights/drilldown/route.ts`

**New:**
- `/web/src/app/sales/leora/_components/DashboardTile.tsx`
- `/web/src/app/sales/leora/_components/SalesDashboard.tsx`
- `/web/docs/DRILLDOWN_ARCHITECTURE.md` (this file)

**Modified:**
- `/web/src/app/sales/leora/page.tsx` (integrate SalesDashboard)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Author:** System Architecture Designer
**Status:** Ready for Implementation

