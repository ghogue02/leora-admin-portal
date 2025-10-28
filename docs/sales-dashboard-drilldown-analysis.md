# Sales Dashboard Drill-Down Analysis

## Executive Summary

This document provides a comprehensive analysis of all data tiles in the Sales Dashboard and recommends drill-down functionality for each. An existing **DrilldownModal** component is available at `/web/src/app/sales/leora/_components/DrilldownModal.tsx` that can be reused.

---

## 1. Performance Metrics Section

**File:** `/web/src/app/sales/dashboard/sections/PerformanceMetrics.tsx` (Lines 34-156)

### 1.1 Weekly Quota Progress Tile
- **Location:** Lines 66-74
- **Current Data:**
  - Quota Progress Percentage (e.g., 260%)
  - Current Week Revenue ($39,044)
  - Weekly Quota Target ($15,000)
- **Visual Indicator:** Color-coded based on performance (green ≥100%, amber ≥75%, red <75%)

**Recommended Drill-Down:**
- **Title:** Weekly Quota Progress Detail
- **Content:**
  - Daily revenue breakdown (Monday-Sunday)
  - Progress timeline chart
  - Quota vs actual trend
  - Order breakdown by day
  - Customer contributions to quota
  - Product mix driving revenue
  - Historical quota performance (last 4-8 weeks)
  - Forecasted completion based on current pace

**Data Source:** Existing dashboard API + daily order aggregation

---

### 1.2 This Week Revenue Tile
- **Location:** Lines 76-87
- **Current Data:**
  - Current Week Revenue ($39,044)
  - Week-over-Week Change Percentage (-26.5%)
  - Visual color indicator (green/red)

**Recommended Drill-Down:**
- **Title:** This Week Revenue Breakdown
- **Content:**
  - Revenue by customer (top contributors)
  - Revenue by product category
  - Revenue by day of week
  - Order size distribution
  - Average order value
  - New vs returning customer revenue split
  - Comparison to same week last year
  - Revenue by delivery route/territory

**Data Source:** Orders table filtered by current week + customer/product joins

---

### 1.3 Unique Customers Tile
- **Location:** Lines 89-97
- **Current Data:**
  - Count of unique customers with orders this week (16)
  - Label: "Orders this week"

**Recommended Drill-Down:**
- **Title:** Customer Order Activity This Week
- **Content:**
  - List of all 16 customers who ordered
  - Order value per customer
  - Order date/time
  - Products ordered
  - Customer health status
  - New customers vs repeat customers
  - Customer ordering frequency (first time this month, etc.)
  - Link to customer detail page

**Data Source:** Orders table with customer joins filtered by current week

---

### 1.4 Last Week Revenue Tile
- **Location:** Lines 99-107
- **Current Data:**
  - Last Week Revenue ($53,140)
  - Label: "For comparison"

**Recommended Drill-Down:**
- **Title:** Last Week Performance Analysis
- **Content:**
  - Last week daily breakdown
  - Customer list from last week
  - Product mix from last week
  - Compare to this week (side-by-side)
  - Lost customers (ordered last week but not this week)
  - Notable differences in product sales
  - Average order value comparison

**Data Source:** Orders table filtered by last week

---

### 1.5 Activity Summary Section
- **Location:** Lines 110-153
- **Current Data:**
  - In-Person Visits count
  - Tasting Appointments count
  - Email Contacts count
  - Phone Calls count
  - Text Messages count
  - New Customers Added count
  - Reactivated Customers count

**Recommended Drill-Down (Multiple Options):**

#### Option A: Combined Activity Detail
- **Title:** Weekly Activity Detail
- **Content:**
  - Timeline view of all activities
  - Activity by customer
  - Activity effectiveness (activities → revenue correlation)
  - Incomplete activities / follow-ups needed
  - Activity by day of week

#### Option B: Individual Activity Type Drill-Downs
Each activity metric could have its own drill-down showing:
- Date/time of each activity
- Customer associated
- Notes/outcomes
- Follow-up actions needed
- Success metrics

**Data Source:** CustomerActivities table

---

## 2. Weekly Revenue Chart Section

**File:** `/web/src/app/sales/dashboard/sections/WeeklyRevenueChart.tsx` (Lines 9-92)

### 2.1 Week-over-Week Comparison Chart
- **Location:** Lines 28-91
- **Current Data:**
  - Bar chart comparing last week vs this week
  - Percentage change badge
  - Revenue values for both weeks

**Recommended Drill-Down:**
- **Title:** Revenue Trend Analysis
- **Content:**
  - 8-week revenue trend line chart
  - Week-over-week comparison table
  - Seasonal pattern analysis
  - Identify best/worst performing weeks
  - Revenue volatility indicators
  - External factors (holidays, events)
  - Year-over-year comparison
  - Moving averages (4-week, 12-week)

**Data Source:** Historical orders aggregated by week

---

## 3. Customer Health Summary Section

**File:** `/web/src/app/sales/dashboard/sections/CustomerHealthSummary.tsx` (Lines 16-108)

### 3.1 Health Status Cards
- **Location:** Lines 66-77
- **Current Data:**
  - Healthy: 1577 customers
  - At Risk (Cadence): 44 customers
  - At Risk (Revenue): 0 customers
  - Dormant: 0 customers

**Recommended Drill-Down (Per Category):**

#### Healthy Customers Drill-Down
- **Title:** Healthy Customers (1577)
- **Content:**
  - List of healthy customers
  - Recent order dates
  - Revenue contribution
  - Ordering frequency
  - Growth/decline trends
  - Risk of changing status

#### At Risk (Cadence) Drill-Down
- **Title:** Customers At Risk - Cadence Issues (44)
- **Content:**
  - Customer list with risk details
  - Expected vs actual order dates
  - Days since last order
  - Historical ordering pattern
  - Recommended actions per customer
  - Contact history
  - Previous interventions
  - Win-back strategy suggestions

#### At Risk (Revenue) Drill-Down
- **Title:** Customers At Risk - Revenue Decline
- **Content:**
  - Customers with 15%+ revenue decline
  - Revenue trend charts
  - Product category changes
  - Competitive threats
  - Intervention history

#### Dormant Customers Drill-Down
- **Title:** Dormant Customers (45+ Days)
- **Content:**
  - Customer list
  - Days dormant
  - Last order details
  - Historical value
  - Win-back priority score
  - Contact attempts

**Data Source:** Customers table with health status + order history

---

### 3.2 Overall Health Score
- **Location:** Lines 79-93
- **Current Data:**
  - Health percentage (97%)
  - Healthy count / Total count

**Recommended Drill-Down:**
- **Title:** Portfolio Health Analysis
- **Content:**
  - Health score trend over time
  - Customer status transitions (healthy → at risk)
  - Benchmark vs territory average
  - Early warning indicators
  - Success stories (at risk → healthy)
  - Customer retention rate
  - Churn risk analysis

**Data Source:** Historical customer health snapshots

---

## 4. Customers Due to Order Section

**File:** `/web/src/app/sales/dashboard/sections/CustomersDueList.tsx` (Lines 19-99)

### 4.1 Customers Due List
- **Location:** Lines 45-87
- **Current Data:**
  - Customer name (clickable link)
  - Last order date
  - Typical ordering pace
  - Expected order date
  - Days overdue
  - Risk status badge

**Recommended Drill-Down:**
- **Title:** Customer Due Detail: [Customer Name]
- **Content:**
  - Full order history (last 12 months)
  - Order pattern visualization
  - Predicted next order date calculation
  - Product preferences
  - Contact history
  - Intervention suggestions
  - Automated outreach templates
  - Seasonal buying patterns
  - Lifetime value

**Data Source:** Click-through to existing customer detail page OR inline modal with summary

**Alternative:** This section may not need additional drill-down since each customer name already links to the customer detail page (`/sales/customers/${customer.id}`). However, a quick-view modal could show summary without full page navigation.

---

## 5. Upcoming Events Section

**File:** `/web/src/app/sales/dashboard/sections/UpcomingEvents.tsx` (Lines 23-153)

### 5.1 Events List
- **Location:** Lines 50-120
- **Current Data:**
  - Event title
  - Date/time
  - Customer (if applicable)
  - Event type badge
  - Location
  - Description
  - Days until event

**Recommended Drill-Down:**
- **Title:** Event Details: [Event Title]
- **Content:**
  - Full event description
  - Preparation checklist
  - Customer background (if applicable)
  - Previous interactions with customer
  - Suggested talking points
  - Products to feature
  - Materials needed
  - Directions/map
  - Related opportunities
  - Post-event follow-up template

**Alternative:** Link to full calendar page with event detail view

---

## 6. Tasks from Management Section

**File:** `/web/src/app/sales/dashboard/sections/TasksList.tsx` (Lines 22-161)

### 6.1 Tasks List
- **Location:** Lines 73-124
- **Current Data:**
  - Task title
  - Description
  - Customer (if linked)
  - Due date
  - Overdue indicator
  - Status badge
  - Complete button

**Recommended Drill-Down:**
- **Title:** Task Details: [Task Title]
- **Content:**
  - Full task description
  - Assignment details (who assigned, when)
  - Related customer information
  - Context/background
  - Completion criteria
  - Resources needed
  - Comments/updates thread
  - Related tasks
  - Time tracking

**Alternative:** May not need drill-down if tasks are simple action items. Expand description inline instead.

---

## Existing DrilldownModal Component Analysis

**File:** `/web/src/app/sales/leora/_components/DrilldownModal.tsx`

### Current Capabilities:
- ✅ Modal overlay with backdrop
- ✅ Dynamic title and description
- ✅ Loading state
- ✅ Error handling
- ✅ Tabular data display with custom column formatters
- ✅ Summary statistics cards
- ✅ Chart visualizations (bar, line, pie)
- ✅ Insights/recommendations section
- ✅ CSV export functionality
- ✅ Responsive design

### Current Drill-Down Types Supported:
1. `top-customers`
2. `top-products`
3. `customer-risk`
4. `monthly-trend`
5. `samples`
6. `order-status`
7. `recent-activity`

### API Endpoint:
- `/api/sales/insights/drilldown?type={type}`

### Component Props:
```typescript
type DrilldownModalProps = {
  type: DrilldownType;
  onClose: () => void;
  tenantId?: string;
};
```

### Data Structure Expected:
```typescript
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

## Recommended Architecture

### Option 1: Reuse Existing DrilldownModal (RECOMMENDED)

**Pros:**
- Already built and tested
- Consistent UX with Leora insights
- Includes charts, CSV export, insights
- Minimal development effort

**Cons:**
- Currently tied to `/api/sales/insights/drilldown` endpoint
- May need additional drill-down types

**Implementation:**
1. Move `DrilldownModal.tsx` to shared location (e.g., `/web/src/components/DrilldownModal.tsx`)
2. Update API endpoint to support new drill-down types
3. Add click handlers to dashboard tiles
4. Extend `DrilldownType` union to include new types

**New Drill-Down Types Needed:**
- `weekly-quota-detail`
- `revenue-breakdown`
- `customer-orders-week`
- `last-week-detail`
- `activity-detail`
- `revenue-trend`
- `healthy-customers`
- `at-risk-cadence`
- `at-risk-revenue`
- `dormant-customers`
- `health-score-trend`

---

### Option 2: Sidebar Drawer

**Pros:**
- Keeps context visible
- Better for quick comparisons
- Modern UX pattern

**Cons:**
- More complex UI state
- Less screen space for data
- More development effort

---

### Option 3: New Page Navigation

**Pros:**
- More space for detailed analysis
- Bookmarkable URLs
- Better for complex analysis

**Cons:**
- Loses dashboard context
- Slower interaction
- Back button management

---

## Implementation Priority

### High Priority (Week 1):
1. **Weekly Quota Progress** - Most important metric
2. **This Week Revenue** - Core performance indicator
3. **Customer Health Status Cards** - Actionable insights
4. **Customers Due List** - Proactive engagement

### Medium Priority (Week 2):
5. **Activity Summary** - Coaching opportunities
6. **Revenue Trend Analysis** - Strategic planning
7. **Unique Customers Detail** - Customer engagement

### Low Priority (Week 3+):
8. **Last Week Detail** - Historical reference
9. **Events/Tasks** - May not need drill-down (already have links)

---

## Technical Recommendations

### 1. Shared Component Location
Move DrilldownModal to:
```
/web/src/app/sales/_components/DrilldownModal.tsx
```

### 2. API Endpoint Structure
```typescript
// GET /api/sales/dashboard/drilldown?type={type}&params={JSON}
// Examples:
// /api/sales/dashboard/drilldown?type=weekly-quota-detail
// /api/sales/dashboard/drilldown?type=health-status&status=at-risk-cadence
// /api/sales/dashboard/drilldown?type=customer-orders-week&week=current
```

### 3. Component Usage Pattern
```typescript
const [drilldownType, setDrilldownType] = useState<DrilldownType | null>(null);

// In tile component:
<div onClick={() => setDrilldownType('weekly-quota-detail')}>
  {/* Quota Progress Content */}
</div>

// At top level:
{drilldownType && (
  <DrilldownModal
    type={drilldownType}
    onClose={() => setDrilldownType(null)}
  />
)}
```

### 4. Visual Indicators
Add hover states and cursor pointers to indicate clickable tiles:
```css
.clickable-tile {
  cursor: pointer;
  transition: border-color 0.2s;
}
.clickable-tile:hover {
  border-color: theme(colors.blue.400);
  box-shadow: 0 0 0 2px theme(colors.blue.100);
}
```

---

## Data Requirements

For each drill-down, the API will need to:

1. **Weekly Quota Detail:**
   - Daily order aggregation for current week
   - Order-level details with customer and product info

2. **Revenue Breakdown:**
   - Orders grouped by customer, product, day
   - Customer health status join

3. **Customer Activity:**
   - CustomerActivities table with full details
   - Activity type metadata

4. **Health Status:**
   - Customers table filtered by health status
   - Recent order history
   - Revenue trends

5. **Revenue Trend:**
   - Historical weekly aggregations (8-12 weeks)
   - Year-over-year comparisons

---

## Next Steps

1. ✅ **Analysis Complete** - This document
2. **Design Review** - Get approval on drill-down content
3. **API Development** - Build `/api/sales/dashboard/drilldown` endpoint
4. **Component Integration** - Add DrilldownModal to dashboard sections
5. **Testing** - Verify data accuracy and performance
6. **User Feedback** - Iterate based on sales rep usage

---

## Summary

**Total Tiles Identified:** 15 major data tiles

**Drill-Down Recommendations:**
- 11 tiles with high-value drill-down potential
- 4 tiles that already have navigation or may not need drill-down

**Existing Component:** DrilldownModal is well-suited for reuse

**Architecture:** Modal overlay (Option 1) recommended for:
- Consistency with existing patterns
- Faster development
- Better UX for quick insights

**Estimated Development:**
- API endpoints: 2-3 days
- Component integration: 2-3 days
- Testing & refinement: 1-2 days
- **Total: 1-2 weeks for complete implementation**
