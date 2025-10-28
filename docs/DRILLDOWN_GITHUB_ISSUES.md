# Dashboard Drill-Down - GitHub Issues Template

This file contains templates for creating GitHub issues to track the drill-down implementation.

---

## Epic: Dashboard Drill-Down Implementation

**Description:**
Make all dashboard tiles clickable with detailed drill-down views, providing users with one-click access to insights behind every metric.

**Scope:** 15 tiles across 3 phases (6 weeks)

**Success Criteria:**
- All 15 tiles are clickable
- Modals load in < 2 seconds
- Mobile responsive
- CSV export functionality
- Zero breaking changes

**Related Documents:**
- [Implementation Plan](./DASHBOARD_DRILLDOWN_IMPLEMENTATION_PLAN.md)
- [Quick Start Guide](./DRILLDOWN_QUICK_START.md)
- [Visual Roadmap](./DRILLDOWN_VISUAL_ROADMAP.md)

---

## Phase 0: Foundation (Week 1)

### Issue #1: Create Reusable DrilldownModal Component

**Labels:** `enhancement`, `phase-0`, `foundation`
**Priority:** P0
**Estimate:** 2 days

**Description:**
Create a reusable modal component that can display drill-down data for any dashboard tile.

**Tasks:**
- [ ] Create `/src/app/portal/_components/DrilldownModal.tsx`
- [ ] Create sub-components:
  - [ ] `DrilldownHeader.tsx` (title, close button)
  - [ ] `DrilldownTabs.tsx` (Overview, Details, Trends, Actions)
  - [ ] `DrilldownContent.tsx` (dynamic content based on type)
  - [ ] `DrilldownFooter.tsx` (Export CSV, Close)
- [ ] Add loading skeleton
- [ ] Add error boundary
- [ ] Add close on ESC key
- [ ] Add responsive mobile view (full-screen)

**Acceptance Criteria:**
- Modal renders with all sub-components
- Responsive on mobile, tablet, desktop
- Keyboard navigation works (Tab, Enter, ESC)
- Loading and error states display correctly

**Reference:**
See `/src/app/sales/catalog/_components/ProductDrilldownModal.tsx` for example pattern

---

### Issue #2: Create useDrilldown State Management Hook

**Labels:** `enhancement`, `phase-0`, `foundation`
**Priority:** P0
**Estimate:** 0.5 days

**Description:**
Create a custom hook to manage drill-down modal state (open/close, type, params).

**Tasks:**
- [ ] Create `/src/app/portal/hooks/useDrilldown.ts`
- [ ] Implement `openDrilldown(type, params?)` function
- [ ] Implement `closeDrilldown()` function
- [ ] Export modal state `{ isOpen, type, params }`
- [ ] Add TypeScript types for drill-down types

**Acceptance Criteria:**
- Hook can be imported and used in DashboardOverview
- State updates correctly when opening/closing
- TypeScript types are properly defined

**Example:**
```typescript
const { modal, openDrilldown, closeDrilldown } = useDrilldown();
openDrilldown('at-risk-accounts');
```

---

### Issue #3: Set Up API Route Structure

**Labels:** `backend`, `phase-0`, `foundation`
**Priority:** P0
**Estimate:** 1 day

**Description:**
Create the base API route structure for drill-down endpoints.

**Tasks:**
- [ ] Create `/src/app/api/portal/dashboard/drilldown/` directory
- [ ] Create shared authentication middleware
- [ ] Create shared response types
- [ ] Create shared error handling
- [ ] Document API pattern in README

**Acceptance Criteria:**
- Directory structure in place
- Shared utilities ready for use
- Pattern documented for other developers

**API Pattern:**
```
/api/portal/dashboard/drilldown/
├── at-risk-accounts/route.ts
├── due-soon-accounts/route.ts
├── customer-hotlist/[customerId]/route.ts
└── ...
```

---

### Issue #4: Define TypeScript Types for Drill-Down Data

**Labels:** `enhancement`, `phase-0`, `foundation`
**Priority:** P0
**Estimate:** 0.5 days

**Description:**
Create TypeScript type definitions for all drill-down responses.

**Tasks:**
- [ ] Create `/src/types/drilldown.ts`
- [ ] Define `DrilldownType` enum
- [ ] Define `DrilldownResponse<T>` generic type
- [ ] Define specific types for each drill-down (AtRiskAccountsResponse, etc.)
- [ ] Export all types

**Acceptance Criteria:**
- All types are properly defined
- No `any` types used
- Types match API response structure

---

### Issue #5: Create Shared UI Components

**Labels:** `enhancement`, `phase-0`, `foundation`
**Priority:** P1
**Estimate:** 1 day

**Description:**
Create reusable UI components for drill-down modals.

**Tasks:**
- [ ] Create `DataTable.tsx` (sortable, filterable table)
- [ ] Create `MetricCard.tsx` (summary metric display)
- [ ] Create `TrendChart.tsx` (line/bar charts)
- [ ] Create `ActionPanel.tsx` (quick action buttons)
- [ ] Create `ExportButton.tsx` (CSV export)

**Acceptance Criteria:**
- Components are reusable across all drill-downs
- Props are properly typed
- Responsive design
- Accessible (keyboard navigation, screen readers)

---

## Phase 1: High-Priority Tiles (Week 2-3)

### Issue #6: At Risk Accounts Drill-Down

**Labels:** `enhancement`, `phase-1`, `p0`
**Priority:** P0
**Estimate:** 2 days

**Description:**
Implement drill-down for At Risk Accounts tile, showing full list with risk scores and suggested actions.

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/at-risk-accounts/route.ts`
- [ ] Query customers where `risk_status = 'at_risk'`
- [ ] Calculate summary metrics (total at risk, avg days overdue, potential loss)
- [ ] Generate insights
- [ ] Make "At Risk" tile clickable in DashboardOverview.tsx
- [ ] Add drill-down content rendering in DrilldownModal
- [ ] Add quick action buttons (call, email)
- [ ] Test on mobile

**Acceptance Criteria:**
- Tile is clickable with hover effect
- Modal opens with correct data
- Summary metrics match dashboard
- API responds in < 500ms
- CSV export works
- Mobile responsive

**API Response:**
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
  }>;
  insights: string[];
}
```

---

### Issue #7: Due Soon Accounts Drill-Down

**Labels:** `enhancement`, `phase-1`, `p0`
**Priority:** P0
**Estimate:** 1.5 days

**Description:**
Implement drill-down for Due Soon Accounts tile, showing proactive outreach opportunities.

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/due-soon-accounts/route.ts`
- [ ] Query customers where `risk_status = 'due_soon'`
- [ ] Calculate optimal contact timing
- [ ] Generate proactive suggestions
- [ ] Make "Due Soon" tile clickable
- [ ] Add drill-down content rendering
- [ ] Test

**Acceptance Criteria:**
- Similar to Issue #6
- Shows expected order dates
- Suggests contact timing

---

### Issue #8: Hotlist Details Drill-Down

**Labels:** `enhancement`, `phase-1`, `p0`
**Priority:** P0
**Estimate:** 2 days

**Description:**
Make each hotlist row clickable to show customer-specific details.

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/customer-hotlist/[customerId]/route.ts`
- [ ] Fetch customer order history timeline
- [ ] Calculate detailed cadence analysis
- [ ] Show contact history
- [ ] Add quick action panel
- [ ] Make hotlist rows clickable
- [ ] Test with various customers

**Acceptance Criteria:**
- Clicking hotlist row opens modal
- Shows complete customer context
- Quick actions work (email, call, schedule)

---

### Issue #9: Recent Orders Drill-Down

**Labels:** `enhancement`, `phase-1`, `p0`
**Priority:** P0
**Estimate:** 1 day

**Description:**
Make recent orders clickable to show complete order details.

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/order-detail/[orderId]/route.ts`
- [ ] Fetch order with line items, invoices, fulfillment
- [ ] Add customer context
- [ ] Make order rows clickable
- [ ] Test

**Acceptance Criteria:**
- Clicking order opens modal
- Shows complete order breakdown
- Can navigate to customer detail from modal

**Note:** May reuse existing order detail logic

---

## Phase 2: Medium-Priority Tiles (Week 4-5)

### Issue #10: Revenue Trend Drill-Down

**Labels:** `enhancement`, `phase-2`, `p1`
**Priority:** P1
**Estimate:** 2 days

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/revenue-trend/route.ts`
- [ ] Fetch 12-month revenue comparison
- [ ] Calculate month-over-month changes
- [ ] Identify top contributors per period
- [ ] Add trend chart visualization
- [ ] Make Revenue Trend health card clickable

---

### Issue #11: ARPDD Analysis Drill-Down

**Labels:** `enhancement`, `phase-2`, `p1`
**Priority:** P1
**Estimate:** 1.5 days

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/arpdd-analysis/route.ts`
- [ ] Fetch daily revenue breakdown
- [ ] Identify peak delivery days
- [ ] Calculate revenue distribution
- [ ] Make ARPDD health card clickable

---

### Issue #12: Order Cadence Drill-Down

**Labels:** `enhancement`, `phase-2`, `p1`
**Priority:** P1
**Estimate:** 1.5 days

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/order-cadence/route.ts`
- [ ] Fetch cadence trends over time
- [ ] Show customer-level distribution
- [ ] Identify improvement/degradation alerts
- [ ] Make Order Cadence health card clickable

---

### Issue #13: Open Orders Drill-Down

**Labels:** `enhancement`, `phase-2`, `p1`
**Priority:** P1
**Estimate:** 1 day

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/open-orders/route.ts`
- [ ] Fetch all open orders (paginated)
- [ ] Add filters (customer, status, age)
- [ ] Show aging analysis
- [ ] Make Open Order Exposure stat card clickable

---

### Issue #14: Order Momentum by Status Drill-Down

**Labels:** `enhancement`, `phase-2`, `p1`
**Priority:** P1
**Estimate:** 1 day

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/orders-by-status/[status]/route.ts`
- [ ] Fetch orders filtered by status
- [ ] Show status duration analysis
- [ ] Identify bottlenecks
- [ ] Make each Order Momentum row clickable

---

## Phase 3: Polish & Remaining Tiles (Week 6)

### Issue #15: Orders This Cycle Drill-Down

**Labels:** `enhancement`, `phase-3`, `p2`
**Priority:** P2
**Estimate:** 1 day

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/cycle-orders/route.ts`
- [ ] Fetch all orders for current cycle
- [ ] Add period comparison
- [ ] Make Orders This Cycle stat card clickable

---

### Issue #16: Tracked Accounts Drill-Down

**Labels:** `enhancement`, `phase-3`, `p2`
**Priority:** P2
**Estimate:** 1 day

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/tracked-accounts/route.ts`
- [ ] Fetch all tracked accounts
- [ ] Show health score distribution
- [ ] Add bulk actions
- [ ] Make Tracked Accounts stat clickable

---

### Issue #17: Focus Cues Drill-Down

**Labels:** `enhancement`, `phase-3`, `p3`
**Priority:** P3
**Estimate:** 1 day

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/recommendation/[id]/route.ts`
- [ ] Show detailed recommendation explanation
- [ ] List affected entities
- [ ] Provide resolution steps
- [ ] Make recommendation items clickable

---

### Issue #18: Ingestion Status Drill-Down

**Labels:** `enhancement`, `phase-3`, `p3`
**Priority:** P3
**Estimate:** 0.5 days

**Tasks:**
- [ ] Create `/api/portal/dashboard/drilldown/feed-status/[feedName]/route.ts`
- [ ] Fetch sync history
- [ ] Show error logs
- [ ] Display data volume metrics
- [ ] Make feed cards clickable

---

## Testing & Quality

### Issue #19: Unit Tests for Drill-Down Components

**Labels:** `testing`, `quality`
**Priority:** P1
**Estimate:** 2 days

**Tasks:**
- [ ] Test DrilldownModal component
- [ ] Test useDrilldown hook
- [ ] Test all sub-components
- [ ] Test error handling
- [ ] Test loading states
- [ ] Achieve > 80% code coverage

---

### Issue #20: E2E Tests for P0 Drill-Downs

**Labels:** `testing`, `e2e`
**Priority:** P1
**Estimate:** 1.5 days

**Tasks:**
- [ ] Set up Playwright tests
- [ ] Test At Risk Accounts flow
- [ ] Test Due Soon Accounts flow
- [ ] Test Hotlist Details flow
- [ ] Test Recent Orders flow
- [ ] Test mobile interactions

---

### Issue #21: Performance Optimization

**Labels:** `performance`, `optimization`
**Priority:** P1
**Estimate:** 1 day

**Tasks:**
- [ ] Add database indexes
- [ ] Implement query caching (60s TTL)
- [ ] Optimize slow queries
- [ ] Add pagination to large datasets
- [ ] Monitor API response times
- [ ] Ensure p95 < 500ms

---

### Issue #22: Accessibility Audit

**Labels:** `accessibility`, `a11y`
**Priority:** P1
**Estimate:** 1 day

**Tasks:**
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Focus management
- [ ] Color contrast verification
- [ ] ARIA labels
- [ ] WCAG 2.1 AA compliance

---

### Issue #23: Mobile Optimization

**Labels:** `mobile`, `responsive`
**Priority:** P1
**Estimate:** 1 day

**Tasks:**
- [ ] Test all drill-downs on mobile
- [ ] Implement full-screen modals on small screens
- [ ] Add swipeable tabs
- [ ] Simplify table views (cards)
- [ ] Touch-friendly button sizes (min 44px)
- [ ] Test on real devices (iOS, Android)

---

### Issue #24: CSV Export Functionality

**Labels:** `enhancement`, `export`
**Priority:** P2
**Estimate:** 1 day

**Tasks:**
- [ ] Create `exportToCSV` utility function
- [ ] Add Export button to all drill-downs
- [ ] Handle large datasets (limit to 10k rows)
- [ ] Include summary metrics in export
- [ ] Test with various data types

---

## Documentation

### Issue #25: Update Documentation

**Labels:** `documentation`
**Priority:** P2
**Estimate:** 0.5 days

**Tasks:**
- [ ] Document API endpoints
- [ ] Update README with drill-down usage
- [ ] Create developer guide for adding new drill-downs
- [ ] Document performance best practices
- [ ] Add troubleshooting guide

---

## Milestones

### Milestone 1: Foundation Complete (Week 1 End)
- Issues #1-5 complete
- Reusable infrastructure ready
- No user-facing changes yet

### Milestone 2: P0 Tiles Complete (Week 3 End)
- Issues #6-9 complete
- 4 high-value tiles clickable
- Beta test with 10% of users

### Milestone 3: P1 Tiles Complete (Week 5 End)
- Issues #10-14 complete
- 9 total tiles clickable
- Full rollout to 100% of users

### Milestone 4: All Tiles Complete (Week 6 End)
- Issues #15-18 complete
- All 15 tiles clickable
- Testing and quality issues (#19-24) complete
- Production ready

---

## Issue Template for New Drill-Downs

```markdown
### Issue #XX: [Tile Name] Drill-Down

**Labels:** `enhancement`, `phase-X`, `pX`
**Priority:** P[0-3]
**Estimate:** X days

**Description:**
[What this drill-down shows and why it's valuable]

**Tasks:**
- [ ] Create API endpoint: `/api/portal/dashboard/drilldown/[type]/route.ts`
- [ ] Query data from database
- [ ] Calculate summary metrics
- [ ] Generate insights
- [ ] Make tile clickable in DashboardOverview.tsx
- [ ] Add content rendering in DrilldownModal
- [ ] Test on desktop
- [ ] Test on mobile
- [ ] Write unit tests
- [ ] Update documentation

**Acceptance Criteria:**
- Tile is clickable with hover effect
- Modal opens with correct data in < 2s
- Summary metrics match dashboard
- API responds in < 500ms (p95)
- CSV export works
- Mobile responsive
- No console errors
- Keyboard navigation works

**API Response Structure:**
```typescript
{
  summary: { /* aggregate metrics */ },
  data: { /* detailed records */ },
  insights: [ /* AI/rule-based insights */ ],
  metadata: {
    fetchedAt: string;
    resultCount: number;
  }
}
```

**Related Issues:**
- Depends on: #1 (DrilldownModal), #2 (useDrilldown)
- Related to: [other drill-down issues]
```

---

**Total Issues:** 25
**Total Estimate:** ~24 days (accounting for reusability and parallel work)
**Timeline:** 6 weeks with buffer for testing and polish
