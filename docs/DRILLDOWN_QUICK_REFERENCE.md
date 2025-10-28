# Drill-Down Quick Reference Card

> **One-page cheat sheet for implementing dashboard drill-downs**

---

## 🎯 Three-Step Pattern

### 1. Define Tile
```tsx
<DashboardTile
  title="Revenue"
  value="$125,000"
  trend={{ value: "+12%", direction: "up" }}
  drilldownType="revenue-trend"
  onDrilldown={setDrilldownType}
/>
```

### 2. Manage State
```tsx
const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);

{drilldownType && (
  <DrilldownModal type={drilldownType} onClose={() => setDrilldownType(null)} />
)}
```

### 3. Create API Handler
```tsx
case 'revenue-trend':
  return NextResponse.json({
    title: "Revenue Trend",
    description: "Monthly breakdown",
    data: { summary, items, chartData, insights },
    columns: [...]
  });
```

---

## 📁 File Locations

| Component | Path |
|-----------|------|
| **DrilldownModal** | `/web/src/app/sales/leora/_components/DrilldownModal.tsx` |
| **DashboardTile** | `/web/src/app/sales/leora/_components/DashboardTile.tsx` |
| **SalesDashboard** | `/web/src/app/sales/leora/_components/SalesDashboard.tsx` |
| **API Route** | `/web/src/app/api/sales/insights/drilldown/route.ts` |
| **Types** | `/web/src/app/sales/leora/_types/drilldown.types.ts` |

---

## 🔤 TypeScript Types

```typescript
// Drill-down type union
type DrilldownType =
  | 'revenue-trend'
  | 'pace-analysis'
  | 'arpdd-detail'
  | 'due-soon-customers'
  | 'at-risk-deep-dive'
  | 'hotlist-analysis'
  | null;

// API response shape
type DrilldownData = {
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

---

## 🎨 DashboardTile Props

```typescript
type DashboardTileProps = {
  title: string;                // "Revenue"
  value: string | number;       // "$125,000" or 125000
  subtitle?: string;            // "This week"
  icon?: ReactNode;             // <Icon />
  trend?: {
    value: string;              // "+12%"
    direction: 'up' | 'down' | 'neutral';
  };
  drilldownType?: DrilldownType; // 'revenue-trend'
  onDrilldown?: (type: DrilldownType) => void;
  className?: string;           // "border-red-200"
};
```

---

## 📊 API Response Template

```json
{
  "title": "Revenue Trend - Last 12 Months",
  "description": "Monthly revenue breakdown with year-over-year comparisons",
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
    { "key": "revenue", "label": "Revenue", "format": "(v) => `$${v.toLocaleString()}`" },
    { "key": "orders", "label": "Orders" },
    { "key": "change", "label": "Change" }
  ]
}
```

---

## 🗄️ Common Database Queries

### Revenue Trend
```sql
SELECT
  TO_CHAR(order_date, 'YYYY-MM') as month,
  SUM(total_amount) as revenue,
  COUNT(*) as orders
FROM orders
WHERE tenant_id = $1
  AND order_date >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1 DESC
```

### Customer Pace
```sql
SELECT
  c.id,
  c.name,
  AVG(EXTRACT(EPOCH FROM (o2.order_date - o1.order_date))/86400) as avg_pace_days
FROM customers c
JOIN orders o1 ON o1.customer_id = c.id
JOIN orders o2 ON o2.customer_id = c.id AND o2.order_date > o1.order_date
WHERE c.tenant_id = $1
GROUP BY c.id
```

### At-Risk Customers
```sql
SELECT
  c.id,
  c.name,
  CURRENT_DATE - MAX(o.order_date) as days_since_last_order
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.tenant_id = $1
GROUP BY c.id
HAVING CURRENT_DATE - MAX(o.order_date) > 30
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Tab** | Navigate between tiles |
| **Enter** | Open drill-down |
| **Space** | Open drill-down |
| **ESC** | Close modal |
| **Shift+Tab** | Reverse navigation |

---

## 🎯 Accessibility Requirements

```tsx
// Tile
<div
  role="button"
  tabIndex={0}
  aria-label="View details for Revenue"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
/>

// Modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">{data.title}</h2>
</div>
```

---

## 🚨 Common Gotchas

### ❌ Wrong: Missing tenantId
```typescript
const data = await db.query(`SELECT * FROM orders`);
```

### ✅ Right: Always filter by tenant
```typescript
const data = await db.query(`
  SELECT * FROM orders WHERE tenant_id = ${tenantId}
`);
```

---

### ❌ Wrong: Not handling null state
```typescript
{drilldownType && <DrilldownModal type={drilldownType} />}
// Error: type might be null
```

### ✅ Right: Check before rendering
```typescript
{drilldownType && (
  <DrilldownModal
    type={drilldownType}
    onClose={() => setDrilldownType(null)}
  />
)}
```

---

### ❌ Wrong: Hardcoded drill-down type
```typescript
<DashboardTile drilldownType="revenue-trend" />
// Always opens same modal
```

### ✅ Right: Dynamic type
```typescript
<DashboardTile drilldownType={tile.type} />
```

---

## 🧪 Testing Checklist

- [ ] Tile renders with all props
- [ ] Tile is clickable when drilldownType is set
- [ ] Tile is not clickable when drilldownType is null
- [ ] Click opens modal
- [ ] ESC closes modal
- [ ] Close button closes modal
- [ ] API returns valid DrilldownData
- [ ] Loading state shows spinner
- [ ] Error state shows message
- [ ] Data renders in table
- [ ] Chart renders (if chartData present)
- [ ] CSV export works
- [ ] Keyboard navigation works
- [ ] Screen reader announces modal open/close

---

## 📊 Chart Configuration

### Bar Chart
```typescript
chartData: {
  type: 'bar',
  data: [
    { label: 'Customer A', value: 12500 },
    { label: 'Customer B', value: 10800 }
  ]
}
```

### Line Chart
```typescript
chartData: {
  type: 'line',
  data: [
    { label: 'Jan', value: 10000 },
    { label: 'Feb', value: 12000 }
  ]
}
```

### Pie Chart
```typescript
chartData: {
  type: 'pie',
  data: [
    { label: 'Completed', value: 150, color: 'bg-green-500' },
    { label: 'Pending', value: 50, color: 'bg-yellow-500' }
  ]
}
```

---

## 🎨 Styling Classes

```tsx
// Tile states
className="cursor-pointer hover:border-indigo-300 hover:shadow-md"

// Trend indicators
trend.direction === 'up' ? 'text-green-600' : 'text-red-600'

// Status colors
border-orange-200  // Warning
border-red-200     // Error
border-green-200   // Success
border-blue-200    // Info
```

---

## 🔍 Debugging Tips

### Check API Response
```bash
curl 'http://localhost:3000/api/sales/insights/drilldown?type=revenue-trend'
```

### Check Modal State
```tsx
console.log('Drilldown Type:', drilldownType);
console.log('Modal Open:', !!drilldownType);
```

### Check Data Loading
```tsx
useEffect(() => {
  console.log('Loading:', loading);
  console.log('Data:', data);
  console.log('Error:', error);
}, [loading, data, error]);
```

---

## 📈 Performance Optimization

```typescript
// 1. Memoize expensive calculations
const processedData = useMemo(() => {
  return data?.items.map(processItem);
}, [data]);

// 2. Debounce API calls
const debouncedFetch = useDebouncedCallback(fetchData, 300);

// 3. Cache API responses
const { data } = useSWR(
  `/api/sales/insights/drilldown?type=${type}`,
  fetcher,
  { dedupingInterval: 60000 }
);
```

---

## 🚀 Quick Start Commands

```bash
# Create new component
touch src/app/sales/leora/_components/DashboardTile.tsx

# Create API handler
mkdir -p src/app/api/sales/insights/drilldown
touch src/app/api/sales/insights/drilldown/route.ts

# Run tests
npm test DashboardTile
npm test drilldown

# Build and test locally
npm run build
npm run start

# Deploy
git push origin main
```

---

## 📚 Related Documentation

- **Full Architecture:** [DRILLDOWN_ARCHITECTURE.md](./DRILLDOWN_ARCHITECTURE.md)
- **Implementation Guide:** [DRILLDOWN_IMPLEMENTATION_ROADMAP.md](./DRILLDOWN_IMPLEMENTATION_ROADMAP.md)
- **Visual Diagrams:** [DRILLDOWN_DIAGRAM.md](./DRILLDOWN_DIAGRAM.md)
- **Executive Summary:** [DRILLDOWN_EXECUTIVE_SUMMARY.md](./DRILLDOWN_EXECUTIVE_SUMMARY.md)

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-10-20
**For:** Next.js 15, React 18, TypeScript 5
