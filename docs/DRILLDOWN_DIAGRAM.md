# Dashboard Drill-Down Architecture - Visual Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                        │
│                      (Next.js 15 App Router)                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │   AutoInsights.tsx    │   │  SalesDashboard.tsx   │
        │                       │   │                       │
        │ - Insight tiles       │   │ - Metric tiles        │
        │ - AI suggestions      │   │ - KPI display         │
        │ - Click handlers      │   │ - Trend indicators    │
        └───────────────────────┘   └───────────────────────┘
                    │                           │
                    │   ┌───────────────────────┘
                    │   │
                    ▼   ▼
        ┌───────────────────────────────────────┐
        │      DashboardTile.tsx (Reusable)     │
        │                                       │
        │ Props:                                │
        │  - title: string                      │
        │  - value: string | number             │
        │  - drilldownType?: DrilldownType      │
        │  - onDrilldown?: (type) => void       │
        │                                       │
        │ Features:                             │
        │  ✓ Keyboard accessible                │
        │  ✓ Hover/focus states                 │
        │  ✓ Conditional clickability           │
        │  ✓ Trend indicators                   │
        └───────────────────────────────────────┘
                            │
                onClick() → │ → setDrilldownType('type')
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │      DrilldownModal.tsx (Generic)     │
        │                                       │
        │ Input:                                │
        │  - type: DrilldownType                │
        │  - onClose: () => void                │
        │                                       │
        │ Renders:                              │
        │  ✓ Loading state                      │
        │  ✓ Error state                        │
        │  ✓ Summary stats                      │
        │  ✓ Data table                         │
        │  ✓ Charts (bar/line/pie)              │
        │  ✓ AI insights                        │
        │  ✓ CSV export                         │
        │                                       │
        │ UX:                                   │
        │  ✓ Sticky header/footer               │
        │  ✓ Scrollable content                 │
        │  ✓ ESC to close                       │
        │  ✓ Mobile responsive                  │
        └───────────────────────────────────────┘
                            │
                useEffect() │ → fetchDrilldownData(type)
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │          API Layer                    │
        │  /api/sales/insights/drilldown        │
        │                                       │
        │  GET ?type={drilldownType}            │
        │                                       │
        │  Returns: DrilldownData {             │
        │    title, description,                │
        │    data: { summary, items,            │
        │            chartData, insights },     │
        │    columns: [...]                     │
        │  }                                    │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │      Database Layer (PostgreSQL)      │
        │                                       │
        │  - Customer data                      │
        │  - Order history                      │
        │  - Product catalog                    │
        │  - Sales metrics                      │
        │                                       │
        │  Security: Tenant isolation           │
        └───────────────────────────────────────┘
```

## Component Interaction Flow

```
User Action:
Click on Dashboard Tile
         │
         ▼
┌─────────────────────────────────┐
│    onClick handler fires        │
│                                 │
│ setDrilldownType('revenue-trend')│
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  React state update triggers    │
│  conditional render:            │
│                                 │
│  {drilldownType &&              │
│    <DrilldownModal ... />}      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  DrilldownModal mounts          │
│                                 │
│  useEffect() detects type prop  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  fetchDrilldownData(type)       │
│                                 │
│  setLoading(true)               │
│  Shows loading spinner          │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API Call:                      │
│  /api/sales/insights/drilldown  │
│  ?type=revenue-trend            │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API Handler:                   │
│  1. Authenticate user           │
│  2. Get tenant ID               │
│  3. Query database              │
│  4. Format response             │
│  5. Return DrilldownData        │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Response received              │
│                                 │
│  setData(drilldownData)         │
│  setLoading(false)              │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Modal renders content:         │
│                                 │
│  ✓ Summary cards                │
│  ✓ Data table                   │
│  ✓ Chart visualization          │
│  ✓ AI insights                  │
│  ✓ Export button                │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  User actions:                  │
│  - Scroll through data          │
│  - Export to CSV                │
│  - Click close button           │
│  - Press ESC key                │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  onClose() handler fires        │
│                                 │
│  setDrilldownType(null)         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Modal unmounts                 │
│  User back at dashboard         │
└─────────────────────────────────┘
```

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      DrilldownType                           │
│                                                              │
│  Union Type: 'revenue-trend' | 'pace-analysis' | ...         │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   API Endpoint Router                        │
│                                                              │
│  switch (type) {                                             │
│    case 'revenue-trend':    → handleRevenueTrend()          │
│    case 'pace-analysis':    → handlePaceAnalysis()          │
│    case 'arpdd-detail':     → handleArpddDetail()           │
│    case 'due-soon-customers': → handleDueSoonCustomers()    │
│    case 'at-risk-deep-dive': → handleAtRiskDeepDive()       │
│    case 'hotlist-analysis': → handleHotlistAnalysis()       │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    DrilldownData Object                      │
│                                                              │
│  {                                                           │
│    title: "Revenue Trend - Last 12 Months",                 │
│    description: "Monthly revenue breakdown...",              │
│    data: {                                                   │
│      summary: {                                              │
│        totalRevenue: 1250000,                                │
│        avgMonthly: 104166,                                   │
│        growth: "+12.5%"                                      │
│      },                                                      │
│      items: [                                                │
│        { month: "2024-11", revenue: 125000, ... }           │
│      ],                                                      │
│      chartData: {                                            │
│        type: "line",                                         │
│        data: [{ label: "Nov", value: 125000 }, ...]         │
│      },                                                      │
│      insights: [                                             │
│        "Revenue up 15.2% month-over-month",                  │
│        "Holiday season driving growth"                       │
│      ]                                                       │
│    },                                                        │
│    columns: [                                                │
│      { key: "month", label: "Month" },                       │
│      { key: "revenue", label: "Revenue",                     │
│        format: (v) => `$${v.toLocaleString()}` }            │
│    ]                                                         │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   Modal Rendering Logic                      │
│                                                              │
│  ┌────────────────────────────────────────────────┐          │
│  │ Header (Sticky)                                │          │
│  │  - Title from data.title                       │          │
│  │  - Description from data.description           │          │
│  │  - Close button                                │          │
│  └────────────────────────────────────────────────┘          │
│                                                              │
│  ┌────────────────────────────────────────────────┐          │
│  │ Content (Scrollable)                           │          │
│  │                                                │          │
│  │  If data.data.summary:                         │          │
│  │    → Render summary cards                      │          │
│  │                                                │          │
│  │  If data.data.items && data.columns:           │          │
│  │    → Render data table                         │          │
│  │                                                │          │
│  │  If data.data.chartData:                       │          │
│  │    → Render chart (bar/line/pie)               │          │
│  │                                                │          │
│  │  If data.data.insights:                        │          │
│  │    → Render insights list                      │          │
│  └────────────────────────────────────────────────┘          │
│                                                              │
│  ┌────────────────────────────────────────────────┐          │
│  │ Footer (Sticky)                                │          │
│  │  - Export to CSV button                        │          │
│  │  - Close button                                │          │
│  └────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

## State Management Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Component State Architecture                   │
└─────────────────────────────────────────────────────────────┘

Parent Component (SalesDashboard.tsx):
┌─────────────────────────────────────────────────────────────┐
│ const [drilldownType, setDrilldownType] = useState(null)   │
│                                                             │
│ State Values:                                               │
│  • null                  → Modal closed                     │
│  • 'revenue-trend'       → Revenue modal open               │
│  • 'pace-analysis'       → Pace modal open                  │
│  • ...etc                                                   │
└─────────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │  Tile 1  │  │  Tile 2  │  │  Tile 3  │
     │          │  │          │  │          │
     │ Revenue  │  │  Orders  │  │   Pace   │
     └──────────┘  └──────────┘  └──────────┘
           │              │              │
           └──────────────┼──────────────┘
                          │
                onClick() │
                          │
                setDrilldownType('type')
                          │
                          ▼
           ┌─────────────────────────────┐
           │  Conditional Render:        │
           │                             │
           │  {drilldownType && (        │
           │    <DrilldownModal          │
           │      type={drilldownType}   │
           │      onClose={() =>         │
           │        setDrilldownType(null)│
           │      }                      │
           │    />                       │
           │  )}                         │
           └─────────────────────────────┘

DrilldownModal Internal State:
┌─────────────────────────────────────────────────────────────┐
│ const [loading, setLoading] = useState(true)                │
│ const [data, setData] = useState<DrilldownData | null>(null)│
│ const [error, setError] = useState<string | null>(null)     │
│                                                             │
│ State Transitions:                                          │
│                                                             │
│  1. Mount:                                                  │
│     loading=true, data=null, error=null                     │
│                                                             │
│  2. Fetch Start:                                            │
│     loading=true, data=null, error=null                     │
│     → Shows loading spinner                                 │
│                                                             │
│  3. Fetch Success:                                          │
│     loading=false, data={...}, error=null                   │
│     → Shows content                                         │
│                                                             │
│  4. Fetch Error:                                            │
│     loading=false, data=null, error="message"               │
│     → Shows error message                                   │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Design Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Breakpoint Strategy                      │
└─────────────────────────────────────────────────────────────┘

Mobile (< 768px):
┌──────────────────────────┐
│ ┌──────────────────────┐ │
│ │   Dashboard Tile     │ │  ← 1 column grid
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │   Dashboard Tile     │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │   Dashboard Tile     │ │
│ └──────────────────────┘ │
└──────────────────────────┘

Tablet (768px - 1024px):
┌──────────────────────────────────────┐
│ ┌────────────┐  ┌────────────┐      │
│ │   Tile 1   │  │   Tile 2   │      │  ← 2 column grid
│ └────────────┘  └────────────┘      │
│ ┌────────────┐  ┌────────────┐      │
│ │   Tile 3   │  │   Tile 4   │      │
│ └────────────┘  └────────────┘      │
└──────────────────────────────────────┘

Desktop (> 1024px):
┌──────────────────────────────────────────────────┐
│ ┌──────┐  ┌──────┐  ┌──────┐                    │
│ │Tile 1│  │Tile 2│  │Tile 3│                    │  ← 3 column grid
│ └──────┘  └──────┘  └──────┘                    │
│ ┌──────┐  ┌──────┐  ┌──────┐                    │
│ │Tile 4│  │Tile 5│  │Tile 6│                    │
│ └──────┘  └──────┘  └──────┘                    │
└──────────────────────────────────────────────────┘

Modal (All Breakpoints):
┌──────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐ │
│ │           DrilldownModal                     │ │
│ │                                              │ │
│ │  Mobile:   w-full p-4                        │ │
│ │  Tablet:   max-w-2xl                         │ │
│ │  Desktop:  max-w-4xl                         │ │
│ │                                              │ │
│ │  Height:   max-h-[90vh] (all breakpoints)    │ │
│ │  Overflow: Scrollable content area           │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Error Handling Strategy                   │
└─────────────────────────────────────────────────────────────┘

API Call:
  fetch('/api/sales/insights/drilldown?type=...')
                │
                ├─→ Network Error
                │       │
                │       ▼
                │   ┌───────────────────────────┐
                │   │ Catch in try/catch        │
                │   │ setError(error.message)   │
                │   │ setLoading(false)         │
                │   └───────────────────────────┘
                │       │
                │       ▼
                │   ┌───────────────────────────┐
                │   │ Show error UI in modal:   │
                │   │  ⚠️ Failed to load data   │
                │   │  [Retry Button]           │
                │   └───────────────────────────┘
                │
                ├─→ HTTP 4xx/5xx Error
                │       │
                │       ▼
                │   ┌───────────────────────────┐
                │   │ Check response.ok         │
                │   │ Parse error from response │
                │   │ setError(errorMessage)    │
                │   └───────────────────────────┘
                │       │
                │       ▼
                │   ┌───────────────────────────┐
                │   │ Show error UI:            │
                │   │  ⚠️ [Specific error msg]  │
                │   │  [Close Modal]            │
                │   └───────────────────────────┘
                │
                └─→ Success (200)
                        │
                        ▼
                    ┌───────────────────────────┐
                    │ Parse JSON response       │
                    │ setData(drilldownData)    │
                    │ setLoading(false)         │
                    └───────────────────────────┘
                        │
                        ▼
                    ┌───────────────────────────┐
                    │ Render content            │
                    └───────────────────────────┘

Edge Cases:
  • Empty data.items → Show "No data available"
  • Invalid type param → 400 Bad Request
  • Unauthorized → Redirect to login
  • Tenant mismatch → 403 Forbidden
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
└─────────────────────────────────────────────────────────────┘

Layer 1: Authentication
┌──────────────────────────────────────┐
│ User Request                         │
│   ↓                                  │
│ Next.js Middleware                   │
│   • Check session cookie             │
│   • Verify JWT token                 │
│   • Reject if not authenticated      │
└──────────────────────────────────────┘

Layer 2: Tenant Isolation
┌──────────────────────────────────────┐
│ API Handler                          │
│   ↓                                  │
│ const userId = await getUserId()     │
│ const tenantId = await getTenantId() │
│   ↓                                  │
│ Attach to all database queries       │
│ WHERE tenant_id = ${tenantId}        │
└──────────────────────────────────────┘

Layer 3: Input Validation
┌──────────────────────────────────────┐
│ Validate drilldown type              │
│   ↓                                  │
│ const ALLOWED_TYPES = [...]          │
│ if (!ALLOWED_TYPES.includes(type))   │
│   return 400 Bad Request             │
└──────────────────────────────────────┘

Layer 4: Rate Limiting
┌──────────────────────────────────────┐
│ Rate limiter middleware              │
│   • 10 requests per minute per user  │
│   • Return 429 if exceeded           │
└──────────────────────────────────────┘

Layer 5: Data Sanitization
┌──────────────────────────────────────┐
│ Sanitize output                      │
│   • Remove sensitive fields          │
│   • Format data consistently         │
│   • Prevent SQL injection (Drizzle)  │
└──────────────────────────────────────┘
```

## Performance Optimization Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                Performance Optimization                     │
└─────────────────────────────────────────────────────────────┘

Frontend Optimizations:
┌──────────────────────────────────────┐
│ 1. Lazy Loading                      │
│    • Modal only renders when open    │
│    • Data fetched on demand          │
│                                      │
│ 2. Code Splitting                    │
│    • Charts lazy loaded              │
│    • Modal component code split      │
│                                      │
│ 3. Memoization                       │
│    • useMemo for expensive calcs     │
│    • useCallback for handlers        │
│                                      │
│ 4. Virtual Scrolling                 │
│    • For large tables (1000+ rows)   │
│    • react-window integration        │
└──────────────────────────────────────┘

Backend Optimizations:
┌──────────────────────────────────────┐
│ 1. Database Indexing                 │
│    • Index on tenant_id              │
│    • Index on date columns           │
│    • Composite indexes               │
│                                      │
│ 2. Query Optimization                │
│    • Aggregate in database           │
│    • Limit result sets               │
│    • Use database views              │
│                                      │
│ 3. Caching                           │
│    • Redis for frequent queries      │
│    • SWR client-side cache           │
│    • 60s deduplication               │
│                                      │
│ 4. Response Compression              │
│    • Gzip compression                │
│    • JSON minification               │
└──────────────────────────────────────┘

Network Optimizations:
┌──────────────────────────────────────┐
│ 1. HTTP/2                            │
│    • Multiplexing                    │
│    • Server push (optional)          │
│                                      │
│ 2. CDN                               │
│    • Static assets                   │
│    • Edge caching                    │
│                                      │
│ 3. API Response Format               │
│    • Minimal payload                 │
│    • Compressed JSON                 │
└──────────────────────────────────────┘
```

## Testing Strategy Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                          │
└─────────────────────────────────────────────────────────────┘

                         ▲
                        /│\
                       / │ \
                      /  │  \
                     / E2E  \         ← Playwright
                    /   10%  \           - Full user flows
                   /─────────\           - Critical paths
                  /           \
                 /  Integration \      ← React Testing Library
                /      30%       \       - Component integration
               /─────────────────\       - Modal + API mocks
              /                   \
             /      Unit Tests      \   ← Jest
            /         60%            \    - DashboardTile
           /───────────────────────────\   - Data formatters
          /                             \  - Helper functions
         /───────────────────────────────\

Test Coverage Goals:
  • Unit:        80%+ coverage
  • Integration: All critical paths
  • E2E:         Key user journeys

Test Types:
┌──────────────────────────────────────┐
│ Unit Tests                           │
│  ✓ Component rendering               │
│  ✓ Props handling                    │
│  ✓ Event handlers                    │
│  ✓ State management                  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Integration Tests                    │
│  ✓ Tile click → modal open           │
│  ✓ API call → data display           │
│  ✓ Error handling                    │
│  ✓ Keyboard navigation               │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ E2E Tests                            │
│  ✓ Complete drill-down flow          │
│  ✓ CSV export                        │
│  ✓ Mobile responsiveness             │
│  ✓ Cross-browser compatibility       │
└──────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Deployment Pipeline                        │
└─────────────────────────────────────────────────────────────┘

Development:
  Local → npm run dev → http://localhost:3000
                │
                ▼
         Hot Module Reload
         Fast Refresh

Staging:
  Git Push → CI/CD → Build → Deploy to Staging
                │       │
                │       └→ Run Tests
                │           • Unit
                │           • Integration
                │           • E2E
                │
                └→ Manual QA
                    ✓ Visual regression
                    ✓ Performance testing
                    ✓ Accessibility audit

Production:
  Merge to Main → CI/CD → Build → Deploy to Prod
                            │
                            ├→ Build optimizations
                            │   • Minification
                            │   • Tree shaking
                            │   • Code splitting
                            │
                            ├→ Run tests
                            │
                            └→ Deploy
                                • Vercel/AWS
                                • CDN distribution
                                • Health checks

Monitoring:
  Production → Observability Stack
                    │
                    ├→ Error Tracking (Sentry)
                    ├→ Performance (Web Vitals)
                    ├→ Analytics (Custom events)
                    └→ Logs (CloudWatch)
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Companion to:** DRILLDOWN_ARCHITECTURE.md
