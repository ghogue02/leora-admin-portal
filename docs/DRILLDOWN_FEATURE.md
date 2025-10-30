# Drilldown Feature - Interactive Data Exploration

## Overview

The Drilldown feature transforms static insights into **interactive, explorable data tables** with visualizations, allowing users to click any insight card to see complete details about how the data came together.

## What Was Built

### New Files

1. **`/src/app/sales/leora/_components/DrilldownModal.tsx`**
   - Full-screen modal with data tables
   - Built-in charts (bar, line, pie)
   - CSV export functionality
   - Loading states and error handling

2. **`/src/app/api/sales/insights/drilldown/route.ts`**
   - 7 different drilldown endpoints
   - Complete data with all fields
   - Summary statistics
   - AI-generated insights

3. **Updated `/src/app/sales/leora/_components/AutoInsights.tsx`**
   - Made all cards clickable
   - Added hover effects
   - Modal integration

## Drilldown Types Available

### 1. Top Customers (`top-customers`)

**Click:** Top 5 Customers card

**Shows:**
- **All customers** (not just top 5) with complete metrics
- Customer name, state, risk status
- Total revenue, order count
- Average order value
- Days since last order
- Assigned sales rep
- Payment terms

**Summary Stats:**
- Total customers
- Total revenue
- Total orders
- Average revenue per customer

**Chart:** Bar chart of top 10 by revenue

**Insights:**
- Top customer's % of total revenue
- Top 10 concentration
- Average lifetime value
- Customers needing attention

**Example Use Case:**
> Sales rep clicks "Top 5 Customers" → Sees all 4,862 customers sorted by revenue → Identifies VIP accounts → Exports to CSV for territory planning

---

### 2. Top Products (`top-products`)

**Click:** Top 5 Products card

**Shows:**
- All products with sales data
- Product name, brand, category, size
- Units sold, order count
- Total revenue, average unit price

**Summary Stats:**
- Total products
- Total revenue
- Total units
- Average revenue per product

**Chart:** Bar chart of top 10 by revenue

**Insights:**
- Top product's market share
- Average units per order
- Categorized vs uncategorized
- Revenue concentration

**Example Use Case:**
> Manager clicks "Top Products" → Sees Shabo Chardonnay leads → Notices low sample conversion for new products → Adjusts sample strategy

---

### 3. Customer Risk (`customer-risk`)

**Click:** Customer Risk button (⚠️ X at risk)

**Shows:**
- All at-risk and dormant customers
- Risk status, days since last order
- Days until expected order
- Average ordering pace
- Established revenue
- Assigned rep

**Summary Stats:**
- Total customers
- Healthy count
- At-risk cadence count
- At-risk revenue count
- Dormant count

**Chart:** Pie chart of risk distribution

**Insights:**
- % of healthy customers
- Customers needing follow-up
- Reactivation opportunities
- Average days since last order for at-risk

**Example Use Case:**
> Rep sees "102 at risk" → Clicks → Gets list sorted by urgency → Creates targeted outreach campaign

---

### 4. Monthly Trend (`monthly-trend`)

**Click:** Monthly Trend card

**Shows:**
- 12 months of detailed metrics
- Orders, revenue, customers per month
- Average order value per month

**Summary Stats:**
- Total months tracked
- Total revenue
- Total orders
- Average monthly revenue

**Chart:** Line chart showing revenue trend

**Insights:**
- Best performing month
- Average monthly orders
- Growth trend (positive/negative)
- Average order value

**Example Use Case:**
> Sales manager clicks "Monthly Trend" → Sees September spike → Investigates seasonal patterns → Plans Q4 promotion

---

### 5. Sample Performance (`samples`)

**Click:** Sample Performance card

**Shows:**
- All sample events with details
- Customer, product, brand
- Quantity, date tasted
- Conversion status (✓/✗)
- Follow-up needed
- Feedback notes
- Rep who gave sample

**Summary Stats:**
- Total samples given
- Sample events
- Converted count
- Conversion rate %

**Chart:** Pie chart (converted vs not)

**Insights:**
- Conversion rate
- Samples needing follow-up
- Most sampled product
- Average samples per event

**Example Use Case:**
> Rep clicks "Sample Performance" → Sees 0% conversion → Realizes need for better follow-up process → Schedules tasting appointments

---

### 6. Order Status (`order-status`)

**Click:** Order status section

**Shows:**
- 200 most recent orders
- Order ID, customer, status
- Order date, total amount

**Summary Stats:**
- Count per status (FULFILLED, DRAFT, etc.)

**Chart:** Pie chart of status distribution

**Insights:**
- Most common status
- Total value of recent orders

**Example Use Case:**
> Manager clicks order status → Sees 50 drafts pending → Investigates approval bottleneck

---

### 7. Recent Activity (`recent-activity`)

**Click:** Activity section

**Shows:**
- 30 days of activity logs
- Activity type, customer
- Subject, date, outcome
- Assigned user/rep

**Summary Stats:**
- Total activities
- Count per activity type

**Chart:** Bar chart of activity types

**Insights:**
- Most common activity
- Success rate
- Follow-ups scheduled

**Example Use Case:**
> Sales manager clicks activity → Sees low call volume → Schedules team coaching

---

## Modal Features

### Header Section
```
┌─────────────────────────────────────────────┐
│ Top Customers - Detailed Analysis      [×] │
│ Complete breakdown of all 4,862 customers  │
└─────────────────────────────────────────────┘
```

### Summary Stats (Top Section)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│Total         │Total Revenue │Total Orders  │Avg Revenue   │
│4,862         │$3,362,561    │2,134         │$691          │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Data Table (Scrollable)
```
┌──────────────────┬────────┬──────────┬────────┬──────────┐
│ Customer Name    │ State  │ Revenue  │ Orders │ Avg Order│
├──────────────────┼────────┼──────────┼────────┼──────────┤
│ Rodeo Brooklyn   │ NY     │ $141,329 │ 6      │ $23,555  │
│ Emmett's on Grove│ NY     │ $126,772 │ 8      │ $15,847  │
│ ...4,860 more... │        │          │        │          │
└──────────────────┴────────┴──────────┴────────┴──────────┘
```

### Visualization Section
- Bar charts for rankings
- Line charts for trends
- Pie charts for distributions

### Insights Panel
```
┌─────────────────────────────────────────────┐
│ 💡 Insights                                 │
│ • Top customer generates 4.2% of revenue    │
│ • Top 10 represent 23.1% of revenue         │
│ • Average customer lifetime value: $691     │
│ • 102 customers need attention              │
└─────────────────────────────────────────────┘
```

### Footer Actions
```
┌─────────────────────────────────────────────┐
│ [📥 Export to CSV]              [Close]     │
└─────────────────────────────────────────────┘
```

## Technical Implementation

### Data Flow

```
User clicks insight card
         ↓
setDrilldownType('top-customers')
         ↓
DrilldownModal renders
         ↓
API call: /api/sales/insights/drilldown?type=top-customers
         ↓
Database queries with enrichment
         ↓
Returns: { title, description, data, columns, charts, insights }
         ↓
Modal displays table + chart + insights
         ↓
User explores data, exports CSV
         ↓
User closes modal
```

### API Response Structure

```typescript
{
  title: "Top Customers - Detailed Analysis",
  description: "Complete breakdown of all customers sorted by revenue",
  data: {
    summary: {
      totalCustomers: 4862,
      totalRevenue: "3362561.40",
      totalOrders: 2134,
      avgRevenuePerCustomer: "691.23"
    },
    items: [
      {
        customerId: "uuid",
        name: "Rodeo Brooklyn LLC",
        state: "NY",
        totalRevenue: 141329.00,
        orderCount: 6,
        avgOrderValue: 23554.83,
        daysSinceLastOrder: 12,
        riskStatus: "HEALTHY",
        salesRep: "Kelly Neel",
        paymentTerms: "Net 30"
      },
      // ...all other customers
    ],
    chartData: {
      type: "bar",
      data: [
        { label: "Rodeo Brooklyn LLC", value: 141329 },
        // ...top 10
      ]
    },
    insights: [
      "Top customer generates 4.2% of total revenue",
      "Top 10 customers represent 23.1% of revenue",
      "Average customer lifetime value: $691",
      "102 customers need attention"
    ]
  },
  columns: [
    { key: "name", label: "Customer Name" },
    { key: "state", label: "State" },
    { key: "totalRevenue", label: "Revenue", format: (v) => `$${v.toFixed(2)}` },
    // ...other columns
  ]
}
```

## CSV Export Feature

**Format:**
```csv
Customer Name,State,Revenue,Orders,Avg Order,Days Since Last,Status,Sales Rep
"Rodeo Brooklyn LLC","NY","$141,329.00","6","$23,554.83","12","HEALTHY","Kelly Neel"
"Emmett's on Grove","NY","$126,772.00","8","$15,846.50","8","HEALTHY","Kelly Neel"
...
```

**Filename Pattern:**
`top-customers-detailed-analysis-2025-10-20.csv`

**Features:**
- Automatic quote escaping
- Formatted values (currency, dates)
- Column headers included
- Date-stamped filename

## Visual Design

### Hover States

**Before Hover:**
```
┌──────────────────────┐
│ Top 5 Customers      │
│ 1. Rodeo Brooklyn    │
│ 2. Emmett's on Grove │
│ ...                  │
└──────────────────────┘
```

**On Hover:**
```
┌══════════════════════┐  ← Blue border
║ Top 5 Customers  [→] ║  ← "Click for details" appears
║ 1. Rodeo Brooklyn    ║
║ 2. Emmett's on Grove ║  ← Subtle shadow
║ ...                  ║
└══════════════════════┘
```

### Loading States

```
┌─────────────────────────────────────┐
│ Top Customers - Detailed Analysis   │
│                                     │
│          [Spinning loader]          │
│                                     │
└─────────────────────────────────────┘
```

### Error States

```
┌─────────────────────────────────────┐
│ Top Customers - Detailed Analysis   │
│                                     │
│ ⚠️ Failed to load detailed data      │
│    Please try again                 │
│                                     │
└─────────────────────────────────────┘
```

## User Interaction Patterns

### Pattern 1: Quick Scan
1. User lands on Leora page
2. Sees "102 at risk" in summary
3. Clicks to drilldown
4. Scans risk list
5. Identifies top 5 urgent
6. Closes modal
7. Asks LeorAI specific question

### Pattern 2: Deep Analysis
1. Manager clicks "Monthly Trend"
2. Reviews 12-month data table
3. Notices September spike
4. Exports CSV for further analysis
5. Shares with team

### Pattern 3: Territory Planning
1. Rep clicks "Top Customers"
2. Sorts by state
3. Filters to their territory
4. Exports customer list
5. Plans weekly call schedule

## Benefits

### For Sales Reps

✅ **Complete Context:** See all data, not just top 5
✅ **Export Capability:** Take data offline for planning
✅ **Visual Insights:** Charts make patterns obvious
✅ **Action-Oriented:** Insights suggest next steps

### For Sales Managers

✅ **Territory Analysis:** Compare rep performance
✅ **Trend Identification:** Spot seasonality
✅ **Risk Management:** Monitor customer health
✅ **Resource Planning:** Allocate samples strategically

### For Business

✅ **Data Transparency:** Full visibility into metrics
✅ **Decision Support:** Data-driven insights
✅ **Reporting:** Export for presentations
✅ **Audit Trail:** Complete data history

## Performance Optimization

### Database Queries

- **Indexed fields:** tenantId, salesRepId, status
- **Limited joins:** Only necessary relationships
- **Pagination:** Future enhancement for very large datasets
- **Caching:** Could cache drilldown data for 5 minutes

### Frontend

- **Lazy loading:** Modal only renders when opened
- **Virtual scrolling:** Future enhancement for 10k+ rows
- **Progressive loading:** Could paginate large datasets

## Future Enhancements

### Phase 2 Features

1. **Filtering:** Add column filters to tables
2. **Sorting:** Click headers to re-sort
3. **Search:** Full-text search within modal
4. **Pagination:** For datasets > 1000 rows
5. **Column Selection:** Choose which columns to show
6. **Saved Views:** Bookmark favorite drilldowns

### Advanced Features

1. **Drill-further:** Click row to see customer details
2. **Comparison Mode:** Compare two time periods
3. **Goal Tracking:** Show progress vs quota
4. **Alerts:** Highlight anomalies in red
5. **Share:** Email drilldown to colleague
6. **Print:** Print-friendly view

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Screen reader labels
- ✅ Focus indicators
- ✅ Color contrast WCAG AA
- ✅ Modal traps focus
- ✅ Escape key closes modal

## Mobile Responsiveness

### Desktop (> 1024px)
- Full modal width (max-w-4xl)
- 2-column summary grid
- Full table visible

### Tablet (768px - 1024px)
- Slightly narrower modal
- 2-column grid maintained
- Horizontal scroll for table

### Mobile (< 768px)
- Full-screen modal
- Stacked summary cards
- Simplified table (fewer columns)
- Swipe to dismiss

## Security

- ✅ Sales rep filtering (only see their data)
- ✅ Tenant isolation
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (React escaping)
- ✅ CSRF protection (session-based)

## Testing Checklist

- [ ] Click each of 7 drilldown types
- [ ] Verify data accuracy
- [ ] Test CSV export
- [ ] Check charts render correctly
- [ ] Verify insights are relevant
- [ ] Test error states
- [ ] Test loading states
- [ ] Check mobile responsiveness
- [ ] Verify keyboard navigation
- [ ] Test with empty data

## Conclusion

The Drilldown feature transforms the Auto-Insights from a static summary into a **fully interactive data exploration tool**. Users can click any metric to see the complete story behind the numbers, export data for offline analysis, and get AI-generated insights about patterns and opportunities.

This creates a **self-service analytics experience** where sales reps and managers can answer their own questions without waiting for reports or bothering IT.
