# Dashboard Tile Drill-Down Implementation Plan

## Executive Summary

This document outlines a comprehensive, systematic approach to making all dashboard tiles clickable with detailed drill-down views. The plan prioritizes business value, implementation complexity, and data availability while ensuring code reusability and maintaining existing functionality.

---

## Current Dashboard Analysis

### Dashboard Location
**File:** `/src/app/portal/sections/DashboardOverview.tsx`

### Existing Tiles Identified (15 Total)

#### Summary Cards (2 tiles)
1. **Open Order Exposure** - Line 267-271
2. **Orders This Cycle** - Line 273-276

#### Account Signals Panel (4 tiles)
3. **Tracked Accounts** - Line 478
4. **Due Soon** - Line 479
5. **At Risk** - Line 480
6. **Hotlist Table** - Line 530-548

#### Health Snapshots (3 tiles)
7. **Order Cadence** - Line 387-392
8. **Revenue Trend (30d)** - Line 393-398
9. **ARPDD (30d)** - Line 399-404

#### Order Momentum (3 tiles)
10. **Submitted Orders** - Line 338-355
11. **In Fulfillment Orders** - Line 338-355
12. **Fulfilled Orders** - Line 338-355

#### Other Sections (3 tiles)
13. **Recent Orders List** - Line 295-329
14. **Focus Cues / Recommendations** - Line 407-423
15. **Ingestion Status** - Line 426-450

---

## Prioritization Framework

### Criteria Weights
- **Business Value**: 40% - Which drill-downs provide most actionable insights?
- **Data Availability**: 30% - Do we have data ready to show?
- **Implementation Complexity**: 20% - How difficult to implement?
- **User Impact**: 10% - How frequently will users click this?

### Scoring Matrix

| Tile | Business Value | Data Available | Complexity | User Impact | Total Score | Priority |
|------|----------------|----------------|------------|-------------|-------------|----------|
| Account Signals (At Risk) | 10 | 10 | 7 | 9 | 9.0 | P0 |
| Account Signals (Due Soon) | 10 | 10 | 7 | 9 | 9.0 | P0 |
| Hotlist Table | 10 | 10 | 6 | 10 | 9.0 | P0 |
| Recent Orders List | 9 | 10 | 8 | 10 | 9.2 | P0 |
| Revenue Trend | 9 | 9 | 7 | 8 | 8.4 | P1 |
| ARPDD | 8 | 9 | 7 | 7 | 7.9 | P1 |
| Order Cadence | 8 | 8 | 6 | 7 | 7.6 | P1 |
| Open Order Exposure | 9 | 10 | 8 | 8 | 8.8 | P1 |
| Order Momentum (by status) | 8 | 10 | 7 | 7 | 8.0 | P1 |
| Orders This Cycle | 7 | 10 | 8 | 6 | 7.6 | P2 |
| Tracked Accounts | 7 | 9 | 6 | 6 | 7.2 | P2 |
| Focus Cues | 6 | 6 | 5 | 5 | 5.8 | P3 |
| Ingestion Status | 5 | 8 | 4 | 4 | 5.6 | P3 |

---

## Implementation Phases

### Phase 0: Foundation (Week 1)
**Goal:** Create reusable infrastructure

**Tasks:**
1. Create shared `DrilldownModal` component in `/src/app/portal/_components/`
2. Create shared modal state management hook
3. Establish API endpoint pattern `/api/portal/dashboard/drilldown/[type]`
4. Create TypeScript types for drill-down data structures
5. Set up error boundaries and loading states

**Deliverables:**
- `DrilldownModal.tsx` - Reusable modal component
- `useDrilldown.ts` - State management hook
- API route structure documentation
- Type definitions file

---

### Phase 1: High-Priority Tiles (Week 2-3)
**Goal:** Implement most valuable drill-downs first

#### P0 Tiles (Critical Business Value)

##### 1. Account Signals - At Risk (Score: 9.0)
**Click Target:** "At Risk" stat card (line 515)

**Drill-Down Content:**
- Full list of at-risk customers with filters
- Risk score breakdown
- Days since last order vs. average pace
- Recommended actions per customer
- Quick contact/follow-up buttons

**API Endpoint:** `GET /api/portal/dashboard/drilldown/at-risk-accounts`

**Data Structure:**
```typescript
{
  summary: {
    totalAtRisk: number;
    averageDaysOverdue: number;
    potentialLostRevenue: number;
  };
  customers: Array<{
    id: string;
    name: string;
    daysSinceLastOrder: number;
    averagePace: number;
    lateness: number;
    lastOrderAmount: number;
    potentialLoss: number;
    contactInfo: { email, phone };
    suggestedActions: string[];
  }>;
  insights: string[];
}
```

##### 2. Account Signals - Due Soon (Score: 9.0)
**Click Target:** "Due Soon" stat card (line 515)

**Drill-Down Content:**
- Customers approaching order time
- Proactive outreach opportunities
- Historical order patterns
- Suggested contact timing

**API Endpoint:** `GET /api/portal/dashboard/drilldown/due-soon-accounts`

##### 3. Hotlist Table (Score: 9.0)
**Click Target:** Individual hotlist row (line 531-546)

**Drill-Down Content:**
- Customer order history timeline
- Detailed cadence analysis
- Contact history
- Quick action panel (send email, log call, schedule follow-up)

**API Endpoint:** `GET /api/portal/dashboard/drilldown/customer-hotlist/[customerId]`

##### 4. Recent Orders List (Score: 9.2)
**Click Target:** Order row (line 303-327)

**Drill-Down Content:**
- Complete order details
- Line items breakdown
- Invoice status
- Fulfillment timeline
- Customer context

**API Endpoint:** `GET /api/portal/dashboard/drilldown/order/[orderId]`

**Note:** May reuse existing order detail page or embed in modal

---

### Phase 2: Medium-Priority Tiles (Week 4-5)
**Goal:** Add analytical drill-downs

#### P1 Tiles (High Business Value)

##### 5. Revenue Trend (Score: 8.4)
**Click Target:** Revenue Trend health card (line 393-398)

**Drill-Down Content:**
- 12-month revenue comparison chart
- Month-over-month breakdown
- Top contributing customers per period
- Revenue composition (by product category)
- Seasonal trends

**API Endpoint:** `GET /api/portal/dashboard/drilldown/revenue-trend`

##### 6. ARPDD (Score: 7.9)
**Click Target:** ARPDD health card (line 399-404)

**Drill-Down Content:**
- Daily revenue breakdown for period
- Peak delivery days analysis
- Revenue distribution across customers
- Delivery day optimization insights

**API Endpoint:** `GET /api/portal/dashboard/drilldown/arpdd-analysis`

##### 7. Order Cadence (Score: 7.6)
**Click Target:** Order Cadence health card (line 387-392)

**Drill-Down Content:**
- Average days between orders trend
- Customer-level cadence distribution
- Cadence improvement/degradation alerts
- Comparison to industry benchmarks

**API Endpoint:** `GET /api/portal/dashboard/drilldown/order-cadence`

##### 8. Open Order Exposure (Score: 8.8)
**Click Target:** Open Order Exposure stat card (line 267-271)

**Drill-Down Content:**
- All open orders table (paginated)
- Breakdown by customer
- Breakdown by status
- Aging analysis
- Risk exposure by time bucket

**API Endpoint:** `GET /api/portal/dashboard/drilldown/open-orders`

##### 9. Order Momentum by Status (Score: 8.0)
**Click Target:** Each status row in Order Momentum (line 342-353)

**Drill-Down Content:**
- All orders in that status
- Status duration analysis
- Bottleneck identification
- SLA compliance metrics

**API Endpoint:** `GET /api/portal/dashboard/drilldown/orders-by-status/[status]`

---

### Phase 3: Lower-Priority Tiles (Week 6)
**Goal:** Complete coverage for comprehensive analytics

#### P2 Tiles (Standard Business Value)

##### 10. Orders This Cycle (Score: 7.6)
**Click Target:** Orders This Cycle stat card (line 273-276)

**Drill-Down Content:**
- Complete order list for period
- Customer distribution
- Order size distribution
- Comparison to previous periods

**API Endpoint:** `GET /api/portal/dashboard/drilldown/cycle-orders`

##### 11. Tracked Accounts (Score: 7.2)
**Click Target:** Tracked Accounts stat (line 515)

**Drill-Down Content:**
- All tracked accounts with health scores
- Filtering by health status
- Bulk actions capability
- Health score trends

**API Endpoint:** `GET /api/portal/dashboard/drilldown/tracked-accounts`

#### P3 Tiles (Nice-to-Have)

##### 12. Focus Cues / Recommendations (Score: 5.8)
**Click Target:** Individual recommendation (line 415-420)

**Drill-Down Content:**
- Detailed explanation of recommendation
- Affected entities
- Suggested resolution steps
- Historical context

**API Endpoint:** `GET /api/portal/dashboard/drilldown/recommendation/[id]`

##### 13. Ingestion Status (Score: 5.6)
**Click Target:** Feed card (line 438-448)

**Drill-Down Content:**
- Feed sync history
- Error logs
- Data volume metrics
- Configuration details

**API Endpoint:** `GET /api/portal/dashboard/drilldown/feed-status/[feedName]`

---

## Technical Implementation Details

### 1. Reusable Modal Component Architecture

**File:** `/src/app/portal/_components/DrilldownModal.tsx`

```typescript
type DrilldownType =
  | 'at-risk-accounts'
  | 'due-soon-accounts'
  | 'customer-hotlist'
  | 'order-detail'
  | 'revenue-trend'
  | 'arpdd-analysis'
  | 'order-cadence'
  | 'open-orders'
  | 'orders-by-status'
  | 'cycle-orders'
  | 'tracked-accounts'
  | 'recommendation'
  | 'feed-status';

interface DrilldownModalProps {
  type: DrilldownType;
  params?: Record<string, string>; // e.g., { customerId: 'abc123' }
  onClose: () => void;
}

export function DrilldownModal({ type, params, onClose }: DrilldownModalProps) {
  // Fetch data based on type and params
  // Render appropriate tabs and content
  // Handle loading, error states
  // Export functionality
}
```

### 2. State Management Pattern

```typescript
// useDrilldown.ts hook
export function useDrilldown() {
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: DrilldownType | null;
    params?: Record<string, string>;
  }>({
    isOpen: false,
    type: null,
  });

  const openDrilldown = (type: DrilldownType, params?: Record<string, string>) => {
    setModal({ isOpen: true, type, params });
  };

  const closeDrilldown = () => {
    setModal({ isOpen: false, type: null });
  };

  return { modal, openDrilldown, closeDrilldown };
}
```

### 3. Making Tiles Clickable

**Pattern Example:**
```typescript
// Before (static card)
<div className="rounded-lg border border-slate-200 bg-white p-6">
  <h2>At Risk</h2>
  <p>{signals.atRisk}</p>
</div>

// After (clickable card)
<button
  onClick={() => openDrilldown('at-risk-accounts')}
  className="w-full rounded-lg border border-slate-200 bg-white p-6
             text-left transition hover:border-indigo-300 hover:shadow-md
             active:scale-[0.98] cursor-pointer"
>
  <h2>At Risk</h2>
  <p>{signals.atRisk}</p>
  <span className="text-xs text-indigo-600 mt-2 block">
    Click for details →
  </span>
</button>
```

### 4. API Endpoint Structure

**Pattern:** `/api/portal/dashboard/drilldown/[type]/route.ts`

```typescript
// Example: at-risk-accounts endpoint
export async function GET(request: Request) {
  // 1. Authenticate user
  // 2. Get user's tenant context
  // 3. Fetch relevant data from Supabase
  // 4. Calculate insights/summaries
  // 5. Return structured response

  return NextResponse.json({
    summary: { /* aggregate metrics */ },
    data: { /* detailed records */ },
    insights: [ /* AI-generated or rule-based insights */ ],
    metadata: { /* pagination, filters applied, etc. */ }
  });
}
```

### 5. Modal Content Tabs

**Standard Tab Structure:**
- **Overview Tab**: Summary metrics and key insights
- **Details Tab**: Detailed table/list view with filters
- **Trends Tab**: Charts and visualizations
- **Actions Tab**: Quick actions and bulk operations

---

## Code Reusability Strategy

### Shared Components

1. **DrilldownModal** - Base modal shell
2. **DataTable** - Reusable table with sorting, filtering, pagination
3. **MetricCard** - Consistent metric display
4. **TrendChart** - Line/bar charts for trends
5. **ActionPanel** - Quick action buttons
6. **ExportButton** - CSV/PDF export functionality
7. **LoadingState** - Skeleton loaders
8. **ErrorBoundary** - Graceful error handling

### Shared Utilities

1. **formatCurrency** - Consistent currency formatting
2. **formatDate** - Consistent date display
3. **calculatePercentChange** - Metric comparison logic
4. **generateInsights** - AI/rule-based insight generation
5. **exportToCSV** - Data export helper

---

## Risk Mitigation Strategies

### 1. Breaking Existing Functionality
**Risk:** Changing tiles to buttons might break layout or styles

**Mitigation:**
- Use CSS `appearance: none` to reset button styles
- Apply exact same classes as current `div` elements
- Test in all responsive breakpoints
- Use `data-testid` for automated testing
- Feature flag new click behavior (optional)

### 2. API Performance
**Risk:** Drill-down queries might be slow or expensive

**Mitigation:**
- Implement query result caching (60-second TTL)
- Add database indexes on frequently queried columns
- Paginate results (max 100 records per page)
- Show loading skeleton immediately
- Use `React.Suspense` for progressive loading
- Monitor API response times with logging

### 3. Data Consistency
**Risk:** Drill-down numbers might not match dashboard summary

**Mitigation:**
- Use exact same queries as dashboard endpoint
- Add timestamp/version to responses
- Display "as of [time]" in modal
- Refresh dashboard data after modal closes
- Add reconciliation checks in development

### 4. Mobile Responsiveness
**Risk:** Modals might not work well on mobile

**Mitigation:**
- Full-screen modals on mobile (< 768px)
- Swipeable tabs on mobile
- Simplified table views (cards instead of tables)
- Touch-friendly button sizes (min 44px)
- Test on real devices

### 5. User Confusion
**Risk:** Users might not realize tiles are clickable

**Mitigation:**
- Add "Click for details →" hint text
- Hover effects (shadow, border color change)
- Cursor pointer on hover
- Subtle icon indicating clickability
- Optional onboarding tooltip

---

## Testing Approach

### Unit Tests
```typescript
// Test each drill-down modal component
describe('DrilldownModal', () => {
  it('renders at-risk accounts correctly', () => {});
  it('handles API errors gracefully', () => {});
  it('exports data to CSV', () => {});
  it('closes on ESC key', () => {});
});
```

### Integration Tests
```typescript
// Test click-to-drilldown flow
describe('Dashboard Drill-downs', () => {
  it('opens modal when At Risk tile is clicked', () => {});
  it('fetches correct data from API', () => {});
  it('filters data based on user selection', () => {});
});
```

### E2E Tests (Playwright)
```typescript
test('user can drill down into at-risk accounts', async ({ page }) => {
  await page.goto('/portal/dashboard');
  await page.click('[data-testid="at-risk-tile"]');
  await expect(page.locator('[data-testid="drilldown-modal"]')).toBeVisible();
  await expect(page.locator('table tbody tr')).toHaveCount.greaterThan(0);
});
```

### Manual QA Checklist
- [ ] All tiles are clickable
- [ ] Modals open smoothly
- [ ] Data loads within 2 seconds
- [ ] No layout shifts when clicking
- [ ] Mobile view works correctly
- [ ] Export to CSV works
- [ ] Close button works
- [ ] ESC key closes modal
- [ ] Click outside closes modal (optional)
- [ ] No console errors
- [ ] Accessibility: keyboard navigation works
- [ ] Screen reader compatibility

---

## Rollback Plan

### If Something Breaks

**Immediate Actions:**
1. **Revert button to div** - Remove `onClick` handlers, restore static tiles
2. **Hide modal** - Set `display: none` on DrilldownModal
3. **Disable API routes** - Return 503 for drill-down endpoints
4. **Deploy rollback** - Use git revert or feature flag toggle

**Feature Flag Pattern:**
```typescript
const ENABLE_DRILLDOWNS = process.env.NEXT_PUBLIC_ENABLE_DRILLDOWNS === 'true';

// Conditional rendering
{ENABLE_DRILLDOWNS ? (
  <button onClick={openDrilldown}>...</button>
) : (
  <div>...</div>
)}
```

### Gradual Rollout Strategy
1. **Week 1:** Phase 0 (Foundation) - No user-facing changes
2. **Week 2:** Phase 1 (P0 tiles) - Enable for internal team only
3. **Week 3:** Phase 1 continued - Beta test with 10% of users
4. **Week 4:** Phase 2 (P1 tiles) - Roll out P0 to 100%, P1 to 10%
5. **Week 5:** Phase 2 continued - P1 to 100%
6. **Week 6:** Phase 3 (P2/P3 tiles) - Complete rollout

---

## Success Metrics

### Quantitative
- **Click-Through Rate:** % of users who click at least one tile
- **Drill-Down Engagement:** Avg # of drill-downs per session
- **API Response Time:** < 500ms for 95th percentile
- **Error Rate:** < 0.1% of drill-down requests
- **Time to Insight:** User can find specific data within 30 seconds

### Qualitative
- User feedback: "I can now see details behind every number"
- Support tickets: Reduction in "where do I find X?" questions
- Feature adoption: % of users who use drill-downs weekly

---

## Implementation Timeline

| Week | Phase | Deliverables | Status |
|------|-------|--------------|--------|
| 1 | Phase 0 | Reusable modal component, API structure | Not Started |
| 2 | Phase 1 Start | At Risk, Due Soon, Hotlist drill-downs | Not Started |
| 3 | Phase 1 Complete | Recent Orders drill-down | Not Started |
| 4 | Phase 2 Start | Revenue Trend, ARPDD, Order Cadence | Not Started |
| 5 | Phase 2 Complete | Open Orders, Order Momentum | Not Started |
| 6 | Phase 3 | Remaining tiles, polish | Not Started |

**Total Duration:** 6 weeks
**Developer Effort:** ~3-4 weeks (with reusable components)

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Review and approve this implementation plan
2. Create GitHub issues for each phase
3. Set up feature flag infrastructure
4. Design DrilldownModal component wireframes
5. Identify database query patterns for top 5 drill-downs

### Development Kickoff (Next Week)
1. Create `/src/app/portal/_components/DrilldownModal.tsx`
2. Create `/src/app/api/portal/dashboard/drilldown/` structure
3. Implement first drill-down (At Risk Accounts)
4. Set up testing framework
5. Create demo for stakeholder review

---

## Appendix: Technical Reference

### Example Modal Component Structure

```typescript
// DrilldownModal.tsx
export function DrilldownModal({ type, params, onClose }: DrilldownModalProps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDrilldownData(type, params);
  }, [type, params]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-5xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <DrilldownHeader title={data?.title} onClose={onClose} />

        {/* Tabs */}
        <DrilldownTabs activeTab={activeTab} onChange={setActiveTab} />

        {/* Content */}
        <DrilldownContent
          type={type}
          data={data}
          activeTab={activeTab}
          loading={loading}
        />

        {/* Footer */}
        <DrilldownFooter onExport={exportData} onClose={onClose} />
      </div>
    </div>
  );
}
```

### Database Query Pattern

```typescript
// Example: At-risk accounts query
const atRiskCustomers = await db
  .from('customers')
  .select(`
    id,
    name,
    last_order_date,
    average_order_interval_days,
    total_lifetime_value
  `)
  .where('tenant_id', tenantId)
  .where('risk_status', 'at_risk')
  .order('days_overdue', { ascending: false })
  .limit(100);
```

---

## Questions & Decisions Log

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| TBD | Should modals be full-screen or centered? | Centered on desktop, full-screen on mobile | Better UX on each device type |
| TBD | Should we persist modal state in URL? | No, use local state only | Simpler implementation, less complexity |
| TBD | Max records per drill-down? | 100 with pagination | Balance between performance and usability |
| TBD | Real-time data or cached? | Cached for 60s | Reduce DB load while maintaining freshness |

---

**Document Version:** 1.0
**Last Updated:** [Current Date]
**Owner:** Development Team
**Reviewers:** Product, Design, Engineering
