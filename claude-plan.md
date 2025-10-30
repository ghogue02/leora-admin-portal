# Leora Sales Rep Portal - Rebuild Plan

**Last Updated**: 2025-10-18
**Status**: Planning & Database Design Phase
**Client**: Well Crafted Beverage (Travis Vernon)

---

## Executive Summary

Transforming the existing customer-facing Leora portal into a comprehensive sales rep management hub. The goal is to create an "all-in-one command center" that keeps sales representatives organized, focused on execution, and provides intelligent recommendations based on data analysis.

### Key Client Requirements (Travis Vernon)
- Sales reps need structure and organization (not good planners)
- Focus on high-performance enablement
- Real-time data with actionable insights
- Week-over-week performance tracking (not month-over-month due to delivery day variance)
- Revenue recognition on delivery (not order placement)
- Mobile-responsive for field use
- Google Calendar integration

---

## Infrastructure Notes

**Database**: Supabase Pro (paid tier, not free tier)
- Region: us-east-1 (AWS)
- Connection: PostgreSQL with pgBouncer pooler
- Note: Database does not auto-pause (Pro feature)

---

## Current State Analysis

### Existing Portal (Customer-Facing)
**What Exists:**
- Customer self-service ordering portal
- Catalog browsing with inventory
- Order and invoice tracking
- Support ticket system
- Payment method and address management
- Basic analytics dashboard (Leora Copilot)
- Admin panel for replay/webhook management

**What's Missing for Sales Reps:**
- ❌ Sales rep profiles and territory management
- ❌ Customer-to-rep assignments
- ❌ Performance quotas and tracking
- ❌ Sample tracking and feedback loops
- ❌ Customer health scoring (at-risk detection)
- ❌ Weekly call planning interface
- ❌ Activity logging with conversion metrics
- ❌ Product goal tracking
- ❌ Territory heat maps
- ❌ Calendar integration
- ❌ "Due to order" customer lists
- ❌ Top 20 product recommendations

---

## Database Schema Changes

### ✅ Completed Models
None yet - starting fresh.

### 🔄 In Progress Models
None yet.

### 📋 Pending Models

#### 1. SalesRep Model (CRITICAL - Foundation)
```prisma
model SalesRep {
  id                      String   @id @default(uuid()) @db.Uuid
  tenantId                String   @db.Uuid
  userId                  String   @db.Uuid
  territoryName           String
  deliveryDay             String?
  weeklyRevenueQuota      Decimal? @db.Decimal(12, 2)
  monthlyRevenueQuota     Decimal? @db.Decimal(12, 2)
  quarterlyRevenueQuota   Decimal? @db.Decimal(12, 2)
  annualRevenueQuota      Decimal? @db.Decimal(12, 2)
  weeklyCustomerQuota     Int?
  sampleAllowancePerMonth Int      @default(60)
  isActive                Boolean  @default(true)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  tenant             Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  customers          CustomerAssignment[]
  sampleUsage        SampleUsage[]
  weeklyMetrics      RepWeeklyMetric[]
  productGoals       RepProductGoal[]

  @@unique([tenantId, userId])
  @@index([tenantId])
}
```

#### 2. CustomerAssignment Model
Links customers to sales reps with assignment history.

#### 3. Enhanced Customer Fields
Add to existing Customer model:
- `lastOrderDate` (DateTime?)
- `nextExpectedOrderDate` (DateTime?)
- `averageOrderIntervalDays` (Int?)
- `riskStatus` (CustomerRiskStatus enum)
- `dormancySince` (DateTime?)
- `reactivatedDate` (DateTime?)
- `isPermanentlyClosed` (Boolean)
- `closedReason` (String?)
- `salesRepId` (String? - foreign key)

#### 4. CustomerRiskStatus Enum
```prisma
enum CustomerRiskStatus {
  HEALTHY
  AT_RISK_CADENCE      // Ordering frequency declining
  AT_RISK_REVENUE      // Revenue declining 15%+
  DORMANT              // 45+ days no order
  CLOSED               // Permanently closed
}
```

#### 5. SampleUsage Model
Tracks samples pulled → samples used → customer feedback → conversion.

#### 6. RepWeeklyMetric Model
Weekly performance rollups per rep (calculated via cron job).

#### 7. RepProductGoal Model
Product-specific or category goals per rep with period tracking.

#### 8. TopProduct Model
Company-wide top 20 products calculated weekly (6-month rolling window).

#### 9. SalesIncentive Model
Incentives and competitions created by management.

#### 10. CalendarEvent Model
Google Calendar integration for tastings, visits, meetings.

#### 11. Enhanced Order Fields
Add to existing Order model:
- `deliveredAt` (DateTime? - CRITICAL for revenue recognition)
- `deliveryWeek` (Int? - ISO week number for comparisons)
- `isFirstOrder` (Boolean - track new customer additions)

---

## Phase 1: Database Foundation (Week 1)

### Tasks
- [x] ~~Analyze current database schema~~
- [x] ~~Document gaps and requirements~~
- [x] ~~Create comprehensive plan~~
- [ ] **Update schema.prisma with all new models**
- [ ] **Create Prisma migration**
- [ ] **Test migration on development database**
- [ ] **Create seed script for sample data**
  - Sample sales reps (2-3)
  - Customer assignments (10-15 customers per rep)
  - Historical sample usage data
  - Weekly metrics (last 8 weeks)
  - Product goals
  - Top 20 products
- [ ] **Build background jobs**
  - Daily customer risk assessment cron
  - Weekly top products calculation
  - Weekly metrics aggregation
  - Daily "due to order" list generation

### Database Seeding Strategy
**Preserve all existing data:**
- Customers
- Products/SKUs
- Orders
- Invoices
- Users
- Activities

**Add sample data for new features:**
- Create 2-3 SalesRep records from existing Users
- Assign existing Customers to reps (distribute evenly)
- Generate historical SampleUsage records (last 3 months)
- Calculate initial CustomerRiskStatus for all customers
- Generate RepWeeklyMetric records (last 8 weeks based on real order data)
- Create sample ProductGoals
- Calculate initial Top 20 products from real order data

---

## Phase 2: Sales Rep Authentication & Routing (Week 1-2)

### Tasks
- [ ] Create `/sales` route structure (separate from `/portal`)
- [ ] Build sales rep authentication flow
- [ ] Create `SalesRepProvider` context (similar to CartProvider)
- [ ] Build sales rep navigation component
- [ ] Create role checking middleware
- [ ] Update login flow to route reps to `/sales` instead of `/portal`

### Route Structure
```
/sales
  /login                  # Sales rep login
  /dashboard              # Main hub (replaces /portal)
  /customers              # Customer list with health indicators
  /customers/[id]         # Customer detail page
  /call-plan              # Weekly call planning
  /activities             # Activity log
  /samples                # Sample tracking
  /territory              # Heat map visualization
  /goals                  # Product goals tracking
  /calendar               # Upcoming events (7-10 days)
```

---

## Phase 3: Core Sales Rep Features (Week 2-3)

### 3.1 Sales Rep Dashboard
**Priority**: CRITICAL

**Components to Build:**
- `SalesRepDashboard` (main container)
- `PerformanceMetrics` (quota tracking)
- `WeeklyRevenueChart` (week-over-week)
- `CustomerHealthSummary` (dormant, at-risk counts)
- `ActivitySummary` (visits, tastings, contacts)
- `UpcomingEvents` (next 7-10 days)
- `CustomersDueList` (automated)
- `TasksFromManagement` (to-dos)

**API Routes:**
- `GET /api/sales/dashboard`
- `GET /api/sales/metrics/weekly`
- `GET /api/sales/customers/due`
- `GET /api/sales/tasks`

**Calculations:**
- Week-over-week revenue comparison
- Revenue per delivery day (normalized)
- Unique customer orders this week
- New customers added (when first order delivered)
- Dormant customer count
- Reactivation rate
- Activity conversion rates

### 3.2 Customer List & Health Tracking
**Priority**: CRITICAL

**Components to Build:**
- `CustomerList` (filterable, sortable)
- `CustomerHealthBadge` (visual risk indicator)
- `CustomerQuickStats` (revenue, last order, next expected)

**Filters:**
- All customers
- Due to order this week
- At risk (cadence)
- At risk (revenue)
- Dormant (45+ days)
- Healthy

**API Routes:**
- `GET /api/sales/customers` (with filters)
- `GET /api/sales/customers/health-summary`

### 3.3 Customer Detail Page
**Priority**: CRITICAL

**Components to Build:**
- `CustomerDetailHeader` (name, account #, risk status)
- `CustomerMetrics` (YTD revenue, orders, avg value)
- `OrderingPaceIndicator` (next expected order)
- `TopProductsList` (top 10 by revenue & cases)
- `ProductRecommendations` (Top 20 they haven't ordered)
- `SampleHistory` (products sampled with feedback)
- `VisitHistory` (chronological activity log)
- `QuickActions` (Add Activity, Add Order, Add To-Do, Mark Closed)
- `OrderHistory` (with invoice links)
- `AccountHolds` (if any)

**API Routes:**
- `GET /api/sales/customers/[id]`
- `GET /api/sales/customers/[id]/recommendations`
- `GET /api/sales/customers/[id]/samples`
- `POST /api/sales/customers/[id]/close`

### 3.4 Sample Tracking & Feedback
**Priority**: HIGH

**Components to Build:**
- `SampleBudgetIndicator` (allowance vs used)
- `SamplePullForm` (record samples pulled from inventory)
- `SampleUsageForm` (log tasting with customer)
- `SampleFeedbackList` (history with follow-up flags)

**Business Logic:**
- Samples pulled = $0 order to rep's sample account
- Samples used = SampleUsage record with customer link
- Track follow-up needed flag
- Track conversion (did it result in order?)

**API Routes:**
- `GET /api/sales/samples/budget`
- `POST /api/sales/samples/pull`
- `POST /api/sales/samples/log-usage`
- `GET /api/sales/samples/history`

### 3.5 Activity Logging
**Priority**: HIGH

**Components to Build:**
- `ActivityLogForm` (type, customer, notes, outcome)
- `ActivityTimeline` (chronological view)
- `ActivityConversionMetrics` (tasting→order, visit→order)

**Activity Types:**
- In-Person Visit
- Tasting Appointment
- Email Follow-up
- Phone Call
- Text Message
- Public Tasting Event

**API Routes:**
- `POST /api/sales/activities/log`
- `GET /api/sales/activities`
- `GET /api/sales/activities/conversions`

---

## Phase 4: Planning & Organization (Week 4)

### 4.1 Weekly Call Plan
**Priority**: HIGH

**Components to Build:**
- `WeeklyCallPlanGrid` (Mon-Fri columns)
- `CustomerActivityAssignment` (drag-and-drop)
- `ActivityTypeSelector` (per customer)
- `ActivityWeightingChart` (in-person % vs electronic %)
- `CallPlanCheckboxes` (completion tracking)
- `ManagerVisibilityToggle`

**Features:**
- Visual week planner
- Color-coded by activity type
- Auto-calculate activity weighting
- Manager can view all rep call plans
- Flag weeks that are too "electronic heavy"

**API Routes:**
- `GET /api/sales/call-plan/[weekId]`
- `POST /api/sales/call-plan/[weekId]`
- `PUT /api/sales/call-plan/[weekId]/complete`

### 4.2 Calendar Integration (Google)
**Priority**: MEDIUM

**Components to Build:**
- `CalendarEventsList` (next 7-10 days)
- `TastingPrepReminder` (select wines to bring)
- `EventPrepChecklists`

**Integration:**
- Google Calendar API OAuth
- Sync events to CalendarEvent model
- Show prep tasks for upcoming tastings
- Reminder if customer hasn't ordered wines for event

**API Routes:**
- `GET /api/sales/calendar/upcoming`
- `POST /api/sales/calendar/sync`
- `GET /api/sales/calendar/prep-tasks`

### 4.3 To-Do Management
**Priority**: MEDIUM

**Components to Build:**
- `TaskList` (from management)
- `TaskCheckbox` (mark complete)
- `TaskNotes` (progress updates)

**Features:**
- Management creates tasks for reps
- Reps see tasks on dashboard
- Can add notes before completing
- Due dates with overdue highlighting

**API Routes:**
- `GET /api/sales/tasks`
- `PUT /api/sales/tasks/[id]/complete`
- `PUT /api/sales/tasks/[id]/notes`

---

## Phase 5: Analytics & Intelligence (Week 5)

### 5.1 Territory Heat Map
**Priority**: MEDIUM

**Components to Build:**
- `TerritoryMap` (Google Maps integration)
- `CustomerMarkers` (color-coded by revenue/health)
- `RevenueConcentrationOverlay`
- `OrderFrequencyIndicators`

**Features:**
- Map of all customers in territory
- Color coding: Green (healthy), Yellow (at-risk), Red (dormant)
- Size of marker = revenue level
- Filter by customer status
- Show new/prospect locations

**API Routes:**
- `GET /api/sales/territory/map-data`

### 5.2 Product Performance & Recommendations
**Priority**: MEDIUM

**Components to Build:**
- `TopProductsList` (company-wide)
- `ProductGoalsTracker`
- `CustomerProductRecommendations`

**Business Logic:**
- Calculate Top 20 weekly (6-month rolling window)
- Toggle between: Revenue, Volume, Customer Count
- Show which Top 20 products each customer hasn't ordered
- Track product-specific goals per rep

**API Routes:**
- `GET /api/sales/products/top-20`
- `GET /api/sales/products/goals`
- `GET /api/sales/customers/[id]/product-gaps`

### 5.3 Conversion Analytics
**Priority**: LOW

**Components to Build:**
- `ConversionDashboard`
- `TastingToOrderChart` (% conversion)
- `VisitToOrderChart` (% conversion)
- `ActivityEffectivenessReport`

**Calculations:**
- Tasting → Order: If order placed same week as tasting activity
- Visit → Order: If order placed within 1 week of visit
- Average lead time from activity to conversion

**API Routes:**
- `GET /api/sales/analytics/conversions`

---

## Phase 6: Manager Views (Week 6)

### 6.1 Manager Dashboard
**Priority**: LOW

**Components to Build:**
- `AllRepsPerformance` (leaderboard)
- `RepComparisonChart`
- `TerritoryOverview`

**Features:**
- View all reps side-by-side
- Week-over-week comparisons
- Territory health summary
- Sample budget monitoring across all reps

**API Routes:**
- `GET /api/sales/manager/dashboard`
- `GET /api/sales/manager/reps`

### 6.2 Call Plan Review
**Priority**: LOW

**Components to Build:**
- `CallPlanReviewList` (all reps)
- `CallPlanApprovalFlow`

**Features:**
- Manager sees all rep call plans for the week
- Can add comments or request changes
- Approve/flag call plans

**API Routes:**
- `GET /api/sales/manager/call-plans`
- `POST /api/sales/manager/call-plans/[id]/comment`

### 6.3 Task Assignment
**Priority**: LOW

**Components to Build:**
- `TaskCreationForm` (assign to rep)
- `TaskDashboard` (track completion across reps)

**API Routes:**
- `POST /api/sales/manager/tasks/create`
- `GET /api/sales/manager/tasks`

### 6.4 Incentive Management
**Priority**: LOW

**Components to Build:**
- `IncentiveCreationForm`
- `IncentiveLeaderboard`
- `IncentiveProgressTracking`

**API Routes:**
- `POST /api/sales/manager/incentives/create`
- `GET /api/sales/manager/incentives`

---

## Technical Implementation Details

### Key Business Rules

#### Revenue Recognition
```typescript
// Revenue ONLY counts when order.deliveredAt is set
// NOT when ordered, shipped, or paid
const revenueDate = order.deliveredAt;
```

#### Customer Ordering Pace
```typescript
// After 3 orders, calculate average interval
function calculateOrderingPace(customerId: string) {
  const recentOrders = await getLastNOrders(customerId, 5);
  const intervals = calculateIntervalsBetweenOrders(recentOrders);
  const avgInterval = mean(intervals);

  return {
    averageOrderIntervalDays: avgInterval,
    nextExpectedOrderDate: addDays(lastOrderDate, avgInterval),
    orderingPace: classifyPace(avgInterval) // WEEKLY, BIWEEKLY, MONTHLY
  };
}
```

#### At-Risk Detection
```typescript
function assessCustomerRisk(customer: Customer) {
  const daysSinceExpected = differenceInDays(
    now(),
    customer.nextExpectedOrderDate
  );

  // 45+ days = dormant
  if (daysSinceExpected >= 45) {
    return CustomerRiskStatus.DORMANT;
  }

  // Past expected date = at risk (cadence)
  if (daysSinceExpected > 1) {
    return CustomerRiskStatus.AT_RISK_CADENCE;
  }

  // Revenue declining 15%+ = at risk (revenue)
  if (customer.recentRevenueAvg < customer.establishedRevenue * 0.85) {
    return CustomerRiskStatus.AT_RISK_REVENUE;
  }

  return CustomerRiskStatus.HEALTHY;
}
```

#### Week-Over-Week Comparison
```typescript
// Use ISO week numbers, not months
// Compare week 42 of 2024 vs week 42 of 2023
function getWeekOverWeekPerformance(salesRepId: string, week: number, year: number) {
  const thisYearWeek = getWeekRevenue(salesRepId, year, week);
  const lastYearWeek = getWeekRevenue(salesRepId, year - 1, week);

  return {
    thisYear: thisYearWeek,
    lastYear: lastYearWeek,
    percentageChange: ((thisYearWeek - lastYearWeek) / lastYearWeek) * 100
  };
}
```

#### Top 20 Products Calculation
```typescript
// Recalculated weekly, 6-month rolling window
// Toggle: Revenue, Volume, Customer Count
function calculateTop20Products(mode: 'revenue' | 'volume' | 'customers') {
  const sixMonthsAgo = subMonths(now(), 6);

  const rankings = await aggregateProductPerformance({
    startDate: sixMonthsAgo,
    groupBy: mode
  });

  return rankings.slice(0, 20);
}
```

#### Sample Budget Tracking
```typescript
// Default 60 samples/month (configurable in TenantSettings)
function getSampleBudgetStatus(salesRepId: string, month: number, year: number) {
  const allowance = salesRep.sampleAllowancePerMonth;
  const pulled = countSamplesPulled(salesRepId, month, year); // $0 orders
  const used = countSamplesLogged(salesRepId, month, year); // SampleUsage records

  return {
    allowance,
    pulled,
    used,
    remaining: allowance - pulled,
    utilizationRate: (used / pulled) * 100
  };
}
```

### Background Jobs (Cron)

#### Daily: Customer Risk Assessment
```typescript
// Run at 2 AM daily
async function dailyCustomerRiskAssessment() {
  const allCustomers = await getAllActiveCustomers();

  for (const customer of allCustomers) {
    const riskStatus = await assessCustomerRisk(customer);
    const orderingPace = await calculateOrderingPace(customer.id);

    await updateCustomer(customer.id, {
      riskStatus,
      averageOrderIntervalDays: orderingPace.averageOrderIntervalDays,
      nextExpectedOrderDate: orderingPace.nextExpectedOrderDate
    });
  }
}
```

#### Weekly: Top Products Calculation
```typescript
// Run Sunday at 3 AM
async function weeklyTopProductsCalculation() {
  const modes = ['revenue', 'volume', 'customers'];
  const calculatedAt = new Date();
  const periodEndDate = new Date();
  const periodStartDate = subMonths(periodEndDate, 6);

  for (const mode of modes) {
    const rankings = await calculateTop20Products(mode);

    await saveTopProducts({
      rankings,
      calculatedAt,
      periodStartDate,
      periodEndDate
    });
  }
}
```

#### Weekly: Metrics Aggregation
```typescript
// Run Monday at 1 AM (after week ends)
async function weeklyMetricsAggregation() {
  const salesReps = await getAllActiveSalesReps();
  const lastWeek = getPreviousWeek();

  for (const rep of salesReps) {
    const metrics = await calculateWeeklyMetrics(rep.id, lastWeek);

    await saveRepWeeklyMetric({
      salesRepId: rep.id,
      weekStartDate: lastWeek.start,
      weekEndDate: lastWeek.end,
      ...metrics
    });
  }
}
```

### Google Calendar Integration

**OAuth Flow:**
1. Rep clicks "Connect Google Calendar"
2. OAuth redirect to Google consent screen
3. Store access token and refresh token in `IntegrationToken` model
4. Periodic sync every 15 minutes

**Event Sync:**
- Pull events from next 30 days
- Store in `CalendarEvent` model
- Link to customer if event title/description contains customer name
- Detect event types (meeting, tasting, visit) via keywords

**Prep Reminders:**
- 24 hours before tasting appointment: remind to select wines
- Check if customer has ordered the wines for public event
- Show prep checklist on dashboard

---

## Features to Remove/Deprecate

The following customer-facing features don't align with sales rep goals and should be removed or hidden from `/sales` routes:

- ❌ **Shopping cart** (reps don't shop, they log orders)
- ❌ **Payment methods** (reps don't pay)
- ❌ **Support tickets** (different workflow for reps)
- ❌ **Catalog browsing** (replace with sample selection + order entry)
- ❌ **Account management** (reps manage customer accounts differently)

**Keep these routes under `/portal` for actual customers.**

---

## Testing Strategy

### Unit Tests
- Customer risk assessment logic
- Ordering pace calculations
- Week-over-week comparisons
- Sample budget tracking
- Conversion rate calculations

### Integration Tests
- Full dashboard data loading
- Customer assignment workflows
- Activity logging end-to-end
- Call plan creation and completion
- Google Calendar sync

### E2E Tests (Playwright)
- Sales rep login flow
- Dashboard navigation
- Customer detail view
- Activity logging
- Call plan creation
- Sample usage tracking

### Data Quality Tests
- Verify no orphaned customer assignments
- Ensure all orders have deliveredAt timestamp
- Validate sample usage links to real SKUs
- Check weekly metrics rollup accuracy

---

## Migration Plan

### Step 1: Backup Database
```bash
pg_dump $DATABASE_URL > leora_backup_$(date +%Y%m%d).sql
```

### Step 2: Create Branch
```bash
git checkout -b sales-rep-portal-rebuild
```

### Step 3: Update Schema
- Add all new models to `schema.prisma`
- Add new fields to existing models (Customer, Order, User)
- Create new enums (CustomerRiskStatus)

### Step 4: Generate Migration
```bash
npx prisma migrate dev --name add_sales_rep_models
```

### Step 5: Test Migration
```bash
# Test on dev database first
npx prisma migrate deploy
```

### Step 6: Seed Sample Data
```bash
npx prisma db seed
```

### Step 7: Verify Data
- Check all existing data is intact
- Verify new tables created
- Confirm sample data populated

---

## Progress Tracking

### Completed ✅ (Phase 1-3 + Cleanup)
- [x] Requirements analysis from Travis email thread
- [x] Current portal exploration and documentation
- [x] Database schema gap analysis
- [x] Comprehensive rebuild plan
- [x] Create comprehensive plan document (this file)
- [x] Update Prisma schema with all new models
- [x] Validate Prisma schema
- [x] Apply database migration (8 new tables created)
- [x] Create User accounts for Kelly, Travis, Carolyn
- [x] Create comprehensive seed script (prisma/seed.ts)
- [x] Build customer health tracking job
- [x] Build weekly metrics aggregation job
- [x] Create sales rep authentication system
- [x] Build sales rep dashboard UI (8 components)
- [x] Build customer list with health indicators (6 components)
- [x] Create customer detail page (14 files)
- [x] Build activities tracking page (5 files)
- [x] Build admin management page (7 files)
- [x] Consolidate /portal → /sales (unified)
- [x] Copy catalog, cart, orders, invoices to /sales
- [x] Remove payment methods (deleted)
- [x] Remove favorites (deleted)
- [x] Remove support tickets (deleted)
- [x] Remove Supabase replay warnings (deleted)
- [x] Generate Prisma client
- [x] Create password setup script

### In Progress 🔄
- [ ] Seed script running (assigning 4,862 customers to 3 reps)

### Ready for Testing 📋
- [ ] Set passwords for sales reps
- [ ] Test login and authentication
- [ ] Test all portal features with real data
- [ ] Schedule background cron jobs

### Future Enhancements (Phase 4-6)
- [ ] Weekly call planning UI (drag-and-drop)
- [ ] Google Calendar OAuth integration
- [ ] Territory heat map (Google Maps)
- [ ] Advanced conversion analytics
- [ ] Incentive/competition management

---

## Questions for Travis

Before proceeding, need clarification on:

1. ✅ **Calendar system**: Google Calendar confirmed
2. ✅ **Sample inventory**: Real-time inventory tracking confirmed
3. ✅ **Territory assignments**: 1:1 customer-to-rep, editable by admin confirmed
4. ✅ **Historical comparisons**: 1 year confirmed
5. ✅ **Mobile responsive**: Yes confirmed

---

## Risk Mitigation

### Data Loss Prevention
- Full database backup before migration
- Test migration on dev environment first
- Preserve all existing data (customers, orders, invoices)
- Add data only, never delete

### Performance Concerns
- Index all foreign keys
- Optimize queries for dashboard (consider materialized views)
- Cache Top 20 products (weekly recalculation is sufficient)
- Paginate customer lists

### User Experience
- Progressive enhancement (start with core features)
- Mobile-first design for field use
- Fast page loads (< 2 seconds)
- Offline support for activity logging (future enhancement)

---

## Success Metrics

### Technical Metrics
- Dashboard load time < 2 seconds
- All API routes respond < 500ms
- Zero data loss during migration
- 90%+ test coverage

### Business Metrics
- Reps can create weekly call plan in < 5 minutes
- Customer health status updated daily
- "Due to order" lists accurate within 1 day
- Sample usage tracking adoption > 80%

---

## Timeline Summary

- **Week 1**: Database design, migration, seeding ✅ (in progress)
- **Week 2**: Auth, routing, basic dashboard
- **Week 3**: Customer management, sample tracking
- **Week 4**: Call planning, calendar integration
- **Week 5**: Analytics, heat maps, recommendations
- **Week 6**: Manager views, polish, testing

**Target Launch**: 6 weeks from start (mid-December 2025)

---

## Notes & Decisions

### 2025-10-18
- Confirmed customer-facing portal stays at `/portal`
- Sales rep portal will be at `/sales`
- All existing data will be preserved
- Seeding strategy: add sample data, never delete real data
- Week-over-week comparisons are critical (not month-over-month)
- Revenue recognition happens at `deliveredAt`, not `orderedAt`
- Customer risk assessment will run daily via cron job

---

## Appendix: API Route Reference

### Sales Rep Routes (`/api/sales/*`)

#### Dashboard & Metrics
- `GET /api/sales/dashboard` - Main dashboard data
- `GET /api/sales/metrics/weekly` - Weekly performance
- `GET /api/sales/metrics/weekly/comparison` - Week-over-week

#### Customers
- `GET /api/sales/customers` - List with filters
- `GET /api/sales/customers/[id]` - Detail view
- `GET /api/sales/customers/[id]/recommendations` - Product gaps
- `GET /api/sales/customers/[id]/samples` - Sample history
- `GET /api/sales/customers/due` - Due to order this week
- `POST /api/sales/customers/[id]/close` - Mark as closed

#### Activities
- `GET /api/sales/activities` - Activity log
- `POST /api/sales/activities/log` - Create activity
- `GET /api/sales/activities/conversions` - Conversion metrics

#### Samples
- `GET /api/sales/samples/budget` - Monthly budget status
- `POST /api/sales/samples/pull` - Record sample pull
- `POST /api/sales/samples/log-usage` - Log tasting
- `GET /api/sales/samples/history` - Usage history

#### Call Planning
- `GET /api/sales/call-plan/[weekId]` - Get week plan
- `POST /api/sales/call-plan/[weekId]` - Create/update plan
- `PUT /api/sales/call-plan/[weekId]/complete` - Mark complete

#### Calendar
- `GET /api/sales/calendar/upcoming` - Next 7-10 days
- `POST /api/sales/calendar/sync` - Sync with Google
- `GET /api/sales/calendar/prep-tasks` - Event prep

#### Tasks
- `GET /api/sales/tasks` - To-dos from management
- `PUT /api/sales/tasks/[id]/complete` - Mark complete
- `PUT /api/sales/tasks/[id]/notes` - Add notes

#### Products
- `GET /api/sales/products/top-20` - Company top products
- `GET /api/sales/products/goals` - Rep product goals

#### Territory
- `GET /api/sales/territory/map-data` - Heat map data

#### Manager Routes
- `GET /api/sales/manager/dashboard` - Manager overview
- `GET /api/sales/manager/reps` - All reps performance
- `GET /api/sales/manager/call-plans` - Review call plans
- `POST /api/sales/manager/tasks/create` - Assign tasks
- `POST /api/sales/manager/incentives/create` - Create incentives

---

## Code Standards

### Database Schema Awareness (CRITICAL)
**ALWAYS check schema.prisma before ANY database operations:**
- **Before writing SQL queries**: Read `/web/prisma/schema.prisma` to verify table structure, column names, and data types
- **Before suggesting API changes**: Confirm the actual database schema matches assumptions
- **Before bulk operations**: Validate all referenced tables and columns exist
- **Command to sync schema from database**: `npx prisma db pull` (in /web directory)
- **Schema location**: `/Users/greghogue/Leora2/web/prisma/schema.prisma`
- **After schema changes**: ALWAYS run `npx prisma generate` to regenerate the Prisma client

**Why this matters:**
- Prevents SQL errors from wrong column names (e.g., `createdAt` vs no timestamps)
- Ensures referential integrity (tenantId requirements, foreign keys)
- Validates data types match expectations
- Avoids assuming fields exist that don't
- Prevents `db.modelName is undefined` errors (forgot to regenerate client)

**Common Issues:**
- **Import paths**: Use `@/lib/auth/admin` not `@/lib/auth/admin-session`
- **Next.js 15**: Route params are Promises - must `await params` in API routes
- **Prisma client**: Run `npx prisma generate` after any schema changes

### TypeScript
- Strict mode enabled
- No `any` types
- Proper interface definitions
- Zod validation for API inputs

### React Components
- Server components by default
- Client components only when needed (interactivity)
- Proper error boundaries
- Loading states

### API Routes
- Consistent error handling
- Zod validation
- Proper HTTP status codes
- Rate limiting where appropriate

### Database
- **ALWAYS read schema.prisma first** before any database operations
- All queries use Prisma
- Proper transaction handling
- Index optimization
- No raw SQL unless necessary
- When raw SQL is needed, verify column names against schema.prisma

---

**End of Plan Document**
