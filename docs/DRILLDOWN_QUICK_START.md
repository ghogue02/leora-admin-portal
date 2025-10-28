# Dashboard Drill-Down Quick Start Guide

## TL;DR - Start Here

**Goal:** Make every dashboard tile clickable with detailed drill-down data.

**Approach:** Build reusable modal component → Implement high-value tiles first → Systematic rollout

**Timeline:** 6 weeks, 3 phases

**First Implementation:** "At Risk Accounts" tile (highest priority)

---

## Quick Decision Matrix

### What to Implement First?

| Tile Name | Priority | Reason | Week |
|-----------|----------|--------|------|
| At Risk Accounts | P0 🔴 | Prevents revenue loss | 2 |
| Due Soon Accounts | P0 🔴 | Proactive sales | 2 |
| Hotlist Details | P0 🔴 | Customer retention | 2-3 |
| Recent Orders | P0 🔴 | Most clicked | 3 |
| Revenue Trend | P1 🟡 | Strategic insights | 4 |
| ARPDD Analysis | P1 🟡 | Performance tracking | 4 |
| Open Orders | P1 🟡 | Operations management | 5 |
| Order Momentum | P1 🟡 | Process optimization | 5 |
| Everything Else | P2/P3 🟢 | Nice-to-have | 6 |

---

## File Structure (What to Create)

```
web/
├── src/app/portal/
│   ├── _components/
│   │   ├── DrilldownModal.tsx         ← CREATE (Week 1)
│   │   ├── DrilldownHeader.tsx        ← CREATE (Week 1)
│   │   ├── DrilldownTabs.tsx          ← CREATE (Week 1)
│   │   ├── DrilldownContent.tsx       ← CREATE (Week 1)
│   │   └── DrilldownFooter.tsx        ← CREATE (Week 1)
│   ├── sections/
│   │   └── DashboardOverview.tsx      ← MODIFY (Week 2+)
│   └── hooks/
│       └── useDrilldown.ts            ← CREATE (Week 1)
├── src/app/api/portal/dashboard/
│   └── drilldown/
│       ├── at-risk-accounts/
│       │   └── route.ts               ← CREATE (Week 2)
│       ├── due-soon-accounts/
│       │   └── route.ts               ← CREATE (Week 2)
│       ├── customer-hotlist/
│       │   └── [customerId]/
│       │       └── route.ts           ← CREATE (Week 2)
│       ├── order-detail/
│       │   └── [orderId]/
│       │       └── route.ts           ← CREATE (Week 3)
│       └── ...                        ← CREATE (Weeks 4-6)
└── docs/
    └── DASHBOARD_DRILLDOWN_IMPLEMENTATION_PLAN.md ← READ THIS!
```

---

## Code Templates

### 1. Making a Tile Clickable (5 minutes)

```typescript
// Before (static)
<div className="rounded-lg border border-slate-200 bg-white p-6">
  <p className="text-xs font-medium uppercase text-gray-500">At Risk</p>
  <p className="mt-2 text-2xl font-semibold text-gray-900">{signals.atRisk}</p>
</div>

// After (clickable)
<button
  type="button"
  onClick={() => openDrilldown('at-risk-accounts')}
  className="w-full rounded-lg border border-slate-200 bg-white p-6 text-left
             transition hover:border-indigo-300 hover:shadow-md hover:scale-[1.02]
             active:scale-[0.98] cursor-pointer"
>
  <p className="text-xs font-medium uppercase text-gray-500">At Risk</p>
  <p className="mt-2 text-2xl font-semibold text-gray-900">{signals.atRisk}</p>
  <span className="mt-2 block text-xs text-indigo-600">
    Click for details →
  </span>
</button>
```

### 2. Adding Drill-Down Hook (2 minutes)

```typescript
// In DashboardOverview.tsx
import { useDrilldown } from '../hooks/useDrilldown';

export default function DashboardOverview() {
  const { modal, openDrilldown, closeDrilldown } = useDrilldown();

  // ... existing code ...

  return (
    <>
      {/* Existing dashboard content */}
      <section className="grid gap-8">
        {/* ... tiles ... */}
      </section>

      {/* Drill-down modal */}
      {modal.isOpen && (
        <DrilldownModal
          type={modal.type}
          params={modal.params}
          onClose={closeDrilldown}
        />
      )}
    </>
  );
}
```

### 3. Creating an API Endpoint (15 minutes)

```typescript
// /api/portal/dashboard/drilldown/at-risk-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validatePortalSession } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await validatePortalSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get tenant context
    const tenantId = session.tenantId;

    // 3. Fetch data
    const supabase = getSupabaseClient();
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        last_order_date,
        average_order_interval_days,
        total_lifetime_value
      `)
      .eq('tenant_id', tenantId)
      .eq('risk_status', 'at_risk')
      .order('days_overdue', { ascending: false })
      .limit(100);

    if (error) throw error;

    // 4. Calculate insights
    const summary = {
      totalAtRisk: customers.length,
      averageDaysOverdue: calculateAverageDaysOverdue(customers),
      potentialLostRevenue: calculatePotentialLoss(customers),
    };

    const insights = generateInsights(customers, summary);

    // 5. Return structured response
    return NextResponse.json({
      summary,
      customers,
      insights,
      metadata: {
        fetchedAt: new Date().toISOString(),
        resultCount: customers.length,
      },
    });
  } catch (error) {
    console.error('At-risk accounts drilldown error:', error);
    return NextResponse.json(
      { error: 'Failed to load at-risk accounts' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateAverageDaysOverdue(customers: any[]) {
  // Implementation
}

function calculatePotentialLoss(customers: any[]) {
  // Implementation
}

function generateInsights(customers: any[], summary: any) {
  return [
    `${summary.totalAtRisk} customers are at risk of churn`,
    `Average ${summary.averageDaysOverdue} days overdue`,
    `Potential revenue impact: ${formatCurrency(summary.potentialLostRevenue)}`,
  ];
}
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Create `DrilldownModal.tsx` component
- [ ] Create `useDrilldown.ts` hook
- [ ] Set up API route structure
- [ ] Define TypeScript types
- [ ] Create shared UI components (tabs, header, footer)

### Week 2: First Drill-Down (At Risk)
- [ ] Create `/api/portal/dashboard/drilldown/at-risk-accounts/route.ts`
- [ ] Make "At Risk" tile clickable
- [ ] Test modal open/close
- [ ] Test data loading
- [ ] Add loading skeleton
- [ ] Add error handling

### Week 2-3: Complete P0 Tiles
- [ ] Due Soon Accounts
- [ ] Hotlist Details
- [ ] Recent Orders

### Week 4-5: P1 Tiles
- [ ] Revenue Trend
- [ ] ARPDD Analysis
- [ ] Order Cadence
- [ ] Open Orders
- [ ] Order Momentum

### Week 6: Polish & P2/P3
- [ ] Remaining tiles
- [ ] CSV export
- [ ] Mobile optimization
- [ ] Accessibility audit
- [ ] Performance testing

---

## Testing Checklist (Per Tile)

```markdown
### [Tile Name] Testing

**Functional:**
- [ ] Tile is clickable with hover effect
- [ ] Modal opens smoothly (< 200ms)
- [ ] Data loads correctly (< 2s)
- [ ] Modal closes with X button
- [ ] Modal closes with ESC key
- [ ] Click outside closes modal (optional)

**Visual:**
- [ ] No layout shift when clicking
- [ ] Loading skeleton displays
- [ ] Error message displays if API fails
- [ ] Mobile view works (full-screen modal)
- [ ] Tablet view works
- [ ] Desktop view works

**Data:**
- [ ] Numbers match dashboard summary
- [ ] Filtering works correctly
- [ ] Sorting works correctly
- [ ] Pagination works (if applicable)
- [ ] Export to CSV works

**Accessibility:**
- [ ] Keyboard navigation works (Tab, Enter, ESC)
- [ ] Screen reader announces modal
- [ ] Focus trap inside modal
- [ ] Focus returns to tile after close
```

---

## Common Gotchas & Solutions

### 1. Button vs Div Styling
**Problem:** Button default styles break layout

**Solution:**
```css
/* Reset button styles */
button {
  appearance: none;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

/* Then apply your div classes */
```

### 2. Modal z-index Issues
**Problem:** Modal appears behind other elements

**Solution:**
```typescript
// Use z-50 or higher
<div className="fixed inset-0 z-50 ...">
```

### 3. API Response Caching
**Problem:** Stale data in modal

**Solution:**
```typescript
// Add cache control headers
export async function GET(request: NextRequest) {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=60', // 60 second cache
    },
  });
}
```

### 4. Mobile Scroll Lock
**Problem:** Body scrolls when modal is open

**Solution:**
```typescript
useEffect(() => {
  if (modal.isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, [modal.isOpen]);
```

### 5. TypeScript Type Errors
**Problem:** Modal data types are complex

**Solution:**
```typescript
// Create shared types file
// types/drilldown.ts
export type DrilldownResponse<T = any> = {
  summary: Record<string, number | string>;
  data: T;
  insights: string[];
  metadata: {
    fetchedAt: string;
    resultCount: number;
  };
};

// Use in components
const [data, setData] = useState<DrilldownResponse<AtRiskCustomer[]> | null>(null);
```

---

## Performance Best Practices

### 1. Database Queries
```typescript
// ❌ Bad: N+1 queries
for (const customer of customers) {
  const orders = await db.from('orders').select('*').eq('customer_id', customer.id);
}

// ✅ Good: Single query with joins
const data = await db
  .from('customers')
  .select(`
    *,
    orders (*)
  `)
  .eq('tenant_id', tenantId);
```

### 2. Component Lazy Loading
```typescript
// Lazy load modal to reduce initial bundle size
const DrilldownModal = lazy(() => import('../_components/DrilldownModal'));

// Wrap in Suspense
<Suspense fallback={<LoadingSkeleton />}>
  {modal.isOpen && <DrilldownModal {...props} />}
</Suspense>
```

### 3. API Response Size
```typescript
// ❌ Bad: Fetch all fields
SELECT * FROM customers ...

// ✅ Good: Fetch only needed fields
SELECT id, name, last_order_date FROM customers ...

// ✅ Better: Paginate
SELECT ... LIMIT 100 OFFSET 0
```

---

## Debugging Tips

### API Not Returning Data
```bash
# Check API route directly
curl http://localhost:3000/api/portal/dashboard/drilldown/at-risk-accounts \
  -H "Cookie: portal-session=YOUR_SESSION_TOKEN"

# Check Supabase logs
# Look for slow queries or errors
```

### Modal Not Opening
```typescript
// Add console.log to track state
const openDrilldown = (type: DrilldownType) => {
  console.log('Opening drilldown:', type);
  setModal({ isOpen: true, type });
};

// Check React DevTools for modal state
```

### Data Mismatch
```typescript
// Compare dashboard query vs drill-down query
// Ensure same filters, date ranges, tenant context

// Log query results
console.log('Dashboard summary:', dashboardData.summary);
console.log('Drill-down data:', drilldownData);
```

---

## Rollback Commands

```bash
# If something breaks, revert the commit
git revert HEAD

# Or revert specific file
git checkout HEAD~1 -- src/app/portal/sections/DashboardOverview.tsx

# Disable feature via environment variable
NEXT_PUBLIC_ENABLE_DRILLDOWNS=false npm run build

# Deploy rollback
vercel --prod
```

---

## Success Metrics Dashboard

Track these metrics after each phase:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Click-Through Rate | > 30% | - | 🟡 Not Started |
| Avg Drill-Downs/Session | > 2 | - | 🟡 Not Started |
| API Response Time (p95) | < 500ms | - | 🟡 Not Started |
| Error Rate | < 0.1% | - | 🟡 Not Started |
| Mobile Usage | > 20% | - | 🟡 Not Started |

---

## Need Help?

1. **Full Plan:** See `DASHBOARD_DRILLDOWN_IMPLEMENTATION_PLAN.md`
2. **Examples:** Look at `ProductDrilldownModal.tsx` in sales catalog
3. **Questions:** [Open GitHub Discussion]
4. **Bugs:** [Create GitHub Issue]

---

**Quick Start Complete! Ready to build? Start with Week 1 tasks above.** 🚀
