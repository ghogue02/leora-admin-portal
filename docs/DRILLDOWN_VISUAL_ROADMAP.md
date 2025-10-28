# Dashboard Drill-Down Visual Roadmap

## 🎯 Project Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  DASHBOARD DRILL-DOWN PROJECT                   │
│                                                                 │
│  Goal: Make EVERY dashboard tile clickable with rich details   │
│  Timeline: 6 weeks                                              │
│  Tiles: 15 total                                                │
│  Approach: Systematic, prioritized rollout                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Current Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PORTAL DASHBOARD                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ 💰 Open Order        │  │ 📦 Orders This       │               │
│  │    Exposure          │  │    Cycle             │               │
│  │    $45,000          │  │    127               │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │           🚨 ACCOUNT SIGNALS - PACE MONITORS              │    │
│  ├───────────────────────────────────────────────────────────┤    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │    │
│  │  │ Tracked    │  │ Due Soon   │  │ At Risk    │          │    │
│  │  │    45      │  │     8      │  │     12     │          │    │
│  │  └────────────┘  └────────────┘  └────────────┘          │    │
│  │                                                            │    │
│  │  📋 HOTLIST (Top 5 Urgent Accounts)                       │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │ Acme Corp        | At Risk | 45 days late       │    │    │
│  │  │ Widget Inc       | Due Soon | 3 days overdue    │    │    │
│  │  │ ...              |          |                     │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────┐  ┌──────────────────────────┐    │
│  │   📈 Recent Orders         │  │  📊 Order Momentum       │    │
│  │   ──────────────────       │  │  ──────────────────      │    │
│  │   Acme Corp - $5,200       │  │  Submitted:    $28k      │    │
│  │   Widget Inc - $3,100      │  │  In Fulfillment: $15k    │    │
│  │   ...                      │  │  Fulfilled:    $42k      │    │
│  └────────────────────────────┘  └──────────────────────────┘    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              💊 HEALTH SNAPSHOTS                          │    │
│  ├───────────────────────────────────────────────────────────┤    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │ Order        │  │ Revenue      │  │ ARPDD        │   │    │
│  │  │ Cadence      │  │ Trend (30d)  │  │ (30d)        │   │    │
│  │  │ 14.2 days    │  │ ↑ 12%        │  │ $2,340/day   │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              🎯 FOCUS CUES                                │    │
│  │   • 3 customers haven't ordered in 30+ days               │    │
│  │   • Order pace slowing by 8% this month                   │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              🔄 INGESTION STATUS                          │    │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │   │ Feed A   │  │ Feed B   │  │ Feed C   │              │    │
│  │   │ Active   │  │ Active   │  │ Syncing  │              │    │
│  │   └──────────┘  └──────────┘  └──────────┘              │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Clickable Tiles - Before & After

### BEFORE (Static)
```
┌──────────────────────┐
│  At Risk             │  <-- Just displays number
│                      │
│      12              │
│                      │
└──────────────────────┘
```

### AFTER (Clickable)
```
┌──────────────────────┐
│  At Risk          ✨ │  <-- Hover effect, cursor pointer
│                      │
│      12              │
│                      │
│  Click for details → │  <-- Visual hint
└──────────────────────┘
        ↓ (Click)
┌─────────────────────────────────────────────────────────┐
│  At-Risk Accounts - Detailed View                   [X] │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Details] [Trends] [Actions]                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Summary Metrics:                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Total    │ │ Avg Days │ │ Potential│                │
│  │ At Risk  │ │ Overdue  │ │ Loss     │                │
│  │   12     │ │   23     │ │ $48,000  │                │
│  └──────────┘ └──────────┘ └──────────┘                │
│                                                          │
│  Customer List:                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Name        │ Days Late │ Last Order │ Action  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Acme Corp   │    45     │ $5,200     │ [Call]  │   │
│  │ Widget Inc  │    32     │ $3,100     │ [Email] │   │
│  │ ...         │    ...    │ ...        │ ...     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  💡 Insights:                                            │
│  • 12 customers are at risk of churn                     │
│  • Average 23 days overdue across all at-risk accounts   │
│  • Potential revenue impact: $48,000                     │
│                                                          │
│  [Export CSV]                           [Close]          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗓️ 6-Week Implementation Timeline

```
Week 1: FOUNDATION
├─ Create DrilldownModal component
├─ Create useDrilldown hook
├─ Set up API structure
└─ Define TypeScript types
   │
   └─> Deliverables: Reusable infrastructure, no user-facing changes

Week 2: PHASE 1 - HIGH PRIORITY (Part 1)
├─ ✅ At Risk Accounts drill-down
├─ ✅ Due Soon Accounts drill-down
└─ Start Hotlist drill-down
   │
   └─> Deliverables: 2-3 P0 tiles clickable

Week 3: PHASE 1 - HIGH PRIORITY (Part 2)
├─ ✅ Complete Hotlist drill-down
├─ ✅ Recent Orders drill-down
└─ QA & bug fixes for P0 tiles
   │
   └─> Deliverables: All P0 tiles complete, beta testing

Week 4: PHASE 2 - MEDIUM PRIORITY (Part 1)
├─ ✅ Revenue Trend drill-down
├─ ✅ ARPDD Analysis drill-down
└─ Start Order Cadence drill-down
   │
   └─> Deliverables: 2-3 P1 tiles clickable

Week 5: PHASE 2 - MEDIUM PRIORITY (Part 2)
├─ ✅ Complete Order Cadence drill-down
├─ ✅ Open Orders drill-down
├─ ✅ Order Momentum drill-down
└─ QA & bug fixes for P1 tiles
   │
   └─> Deliverables: All P1 tiles complete

Week 6: PHASE 3 - POLISH & REMAINING TILES
├─ ✅ Orders This Cycle drill-down
├─ ✅ Tracked Accounts drill-down
├─ ✅ Focus Cues drill-down
├─ ✅ Ingestion Status drill-down
├─ Polish all modals
├─ Mobile optimization
├─ Accessibility audit
└─ Final QA & documentation
   │
   └─> Deliverables: ALL tiles clickable, production ready
```

---

## 🏗️ Technical Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                   Dashboard Component                      │
│  • DashboardOverview.tsx                                   │
│  • Contains all tiles                                      │
│  • Manages modal state via useDrilldown()                  │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                  useDrilldown Hook                         │
│  • Manages modal state (open/close)                        │
│  • Stores drill-down type and params                       │
│  • Returns: { modal, openDrilldown, closeDrilldown }       │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│               DrilldownModal Component                     │
│  • Receives: type, params, onClose                         │
│  • Fetches data from API                                   │
│  • Renders tabs, tables, charts                            │
│  • Handles loading, error states                           │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                    API Endpoints                           │
│  /api/portal/dashboard/drilldown/[type]                    │
│  • Authenticates user                                      │
│  • Fetches data from Supabase                              │
│  • Calculates insights                                     │
│  • Returns structured JSON                                 │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                   Supabase Database                        │
│  • customers table                                         │
│  • orders table                                            │
│  • invoices table                                          │
│  • Tenant-scoped queries                                   │
└────────────────────────────────────────────────────────────┘
```

---

## 📋 Priority Matrix

```
                    HIGH BUSINESS VALUE
                            │
                            │
        P0 (Week 2-3)       │       P1 (Week 4-5)
    ┌───────────────────────┼───────────────────────┐
    │ • At Risk Accounts    │ • Revenue Trend       │
    │ • Due Soon Accounts   │ • ARPDD Analysis      │
    │ • Hotlist Details     │ • Order Cadence       │
    │ • Recent Orders       │ • Open Orders         │
EASY│                       │ • Order Momentum      │COMPLEX
────┼───────────────────────┼───────────────────────┼────
    │                       │                       │
    │ P2 (Week 6)          │ P3 (Week 6)           │
    │ • Orders This Cycle   │ • Focus Cues          │
    │ • Tracked Accounts    │ • Ingestion Status    │
    │                       │                       │
    └───────────────────────┼───────────────────────┘
                            │
                    LOW BUSINESS VALUE
```

---

## 🔄 Data Flow Diagram

```
User Clicks Tile
      │
      ▼
  openDrilldown('at-risk-accounts')
      │
      ▼
  Modal State Updates
  { isOpen: true, type: 'at-risk-accounts' }
      │
      ▼
  DrilldownModal Renders
  Shows loading skeleton
      │
      ▼
  useEffect Triggers
  Fetches: GET /api/portal/dashboard/drilldown/at-risk-accounts
      │
      ▼
  API Validates Session
  Checks user authentication
      │
      ▼
  API Queries Database
  SELECT * FROM customers WHERE risk_status = 'at_risk' ...
      │
      ▼
  API Calculates Insights
  • Total at risk
  • Average days overdue
  • Potential revenue loss
      │
      ▼
  API Returns JSON
  {
    summary: { totalAtRisk: 12, ... },
    customers: [...],
    insights: [...]
  }
      │
      ▼
  Modal Updates State
  setData(response)
  setLoading(false)
      │
      ▼
  Modal Renders Content
  • Summary cards
  • Data table
  • Insights
  • Action buttons
      │
      ▼
  User Interacts
  • Filters data
  • Exports CSV
  • Clicks action buttons
      │
      ▼
  User Closes Modal
  closeDrilldown()
      │
      ▼
  Modal State Resets
  { isOpen: false, type: null }
```

---

## 🎯 Tile Priority Breakdown

### P0 - Critical (Week 2-3) 🔴
```
┌────────────────────────────────────────────────────┐
│ 1. At Risk Accounts                                │
│    Why: Prevents customer churn & revenue loss     │
│    Business Impact: HIGH                           │
│    Complexity: MEDIUM                              │
├────────────────────────────────────────────────────┤
│ 2. Due Soon Accounts                               │
│    Why: Proactive sales opportunities              │
│    Business Impact: HIGH                           │
│    Complexity: MEDIUM                              │
├────────────────────────────────────────────────────┤
│ 3. Hotlist Details                                 │
│    Why: Immediate action on urgent accounts        │
│    Business Impact: HIGH                           │
│    Complexity: MEDIUM                              │
├────────────────────────────────────────────────────┤
│ 4. Recent Orders                                   │
│    Why: Most frequently clicked, high visibility   │
│    Business Impact: HIGH                           │
│    Complexity: LOW (reuse existing order detail)   │
└────────────────────────────────────────────────────┘
```

### P1 - High (Week 4-5) 🟡
```
┌────────────────────────────────────────────────────┐
│ 5. Revenue Trend                                   │
│    Why: Strategic decision-making insights         │
│    Business Impact: MEDIUM-HIGH                    │
│    Complexity: MEDIUM (requires charts)            │
├────────────────────────────────────────────────────┤
│ 6. ARPDD Analysis                                  │
│    Why: Performance tracking & optimization        │
│    Business Impact: MEDIUM-HIGH                    │
│    Complexity: MEDIUM                              │
├────────────────────────────────────────────────────┤
│ 7. Order Cadence                                   │
│    Why: Identify pace trends & anomalies           │
│    Business Impact: MEDIUM                         │
│    Complexity: MEDIUM                              │
├────────────────────────────────────────────────────┤
│ 8. Open Orders                                     │
│    Why: Operations management & exposure tracking  │
│    Business Impact: MEDIUM-HIGH                    │
│    Complexity: LOW (table with filters)            │
├────────────────────────────────────────────────────┤
│ 9. Order Momentum                                  │
│    Why: Process optimization insights              │
│    Business Impact: MEDIUM                         │
│    Complexity: LOW (filter by status)              │
└────────────────────────────────────────────────────┘
```

### P2 - Medium (Week 6) 🟢
```
┌────────────────────────────────────────────────────┐
│ 10. Orders This Cycle                              │
│     Why: Period analysis & comparisons             │
│     Business Impact: LOW-MEDIUM                    │
│     Complexity: LOW                                │
├────────────────────────────────────────────────────┤
│ 11. Tracked Accounts                               │
│     Why: Portfolio overview                        │
│     Business Impact: LOW-MEDIUM                    │
│     Complexity: LOW                                │
└────────────────────────────────────────────────────┘
```

### P3 - Nice-to-Have (Week 6) ⚪
```
┌────────────────────────────────────────────────────┐
│ 12. Focus Cues                                     │
│     Why: Contextual help                           │
│     Business Impact: LOW                           │
│     Complexity: MEDIUM (dynamic content)           │
├────────────────────────────────────────────────────┤
│ 13. Ingestion Status                               │
│     Why: System health monitoring                  │
│     Business Impact: LOW (ops only)                │
│     Complexity: LOW                                │
└────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

```
┌─────────────────────────────────────────────────────┐
│              LAUNCH CRITERIA                        │
├─────────────────────────────────────────────────────┤
│ ✅ All 15 tiles are clickable                       │
│ ✅ Modals open within 200ms                         │
│ ✅ Data loads within 2 seconds                      │
│ ✅ No console errors                                │
│ ✅ Mobile responsiveness verified                   │
│ ✅ Accessibility (WCAG AA) compliant                │
│ ✅ CSV export works for all tables                  │
│ ✅ Error handling for all API failures              │
│ ✅ Loading states for all async operations          │
│ ✅ Unit tests for critical components               │
│ ✅ E2E tests for P0 drill-downs                     │
│ ✅ Performance: API p95 < 500ms                     │
│ ✅ Documentation complete                           │
│ ✅ Stakeholder approval                             │
└─────────────────────────────────────────────────────┘
```

---

## 🚨 Risk Mitigation

```
┌────────────────────────────────────────────────────────┐
│ Risk: Breaking existing functionality                 │
│ Mitigation:                                            │
│  • Feature flag for gradual rollout                    │
│  • Preserve exact tile styling                        │
│  • Comprehensive regression testing                   │
│  • Easy rollback via git revert                       │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Risk: Slow API performance                             │
│ Mitigation:                                            │
│  • Database query optimization                         │
│  • Result caching (60s TTL)                            │
│  • Pagination (max 100 records)                        │
│  • Loading skeletons for UX                           │
│  • Performance monitoring                             │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Risk: Data inconsistency                               │
│ Mitigation:                                            │
│  • Use same queries as dashboard                       │
│  • Display "as of [timestamp]"                         │
│  • Refresh dashboard after modal closes               │
│  • Reconciliation checks in dev                       │
└────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile Strategy

```
DESKTOP (> 1024px)                 MOBILE (< 768px)
┌──────────────────────┐          ┌──────────────────────┐
│                      │          │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  ┌────────────────┐  │          │ ▓                  ▓ │
│  │                │  │          │ ▓  FULL-SCREEN     ▓ │
│  │     MODAL      │  │          │ ▓  MODAL           ▓ │
│  │   (centered)   │  │          │ ▓                  ▓ │
│  │                │  │          │ ▓  [Swipeable      ▓ │
│  └────────────────┘  │          │ ▓   Tabs]          ▓ │
│                      │          │ ▓                  ▓ │
│   Dashboard Behind   │          │ ▓  Card View       ▓ │
│                      │          │ ▓  (not tables)    ▓ │
└──────────────────────┘          │ ▓                  ▓ │
                                  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
                                  └──────────────────────┘
```

---

**Visual Roadmap Complete! 🎉**
**Next: Start Week 1 foundation work**
