# Sample Database Queries - Interesting Insights

## Overview
This document describes the interesting queries I've created to explore your sales/e-commerce database. The script is located at `/web/scripts/sample-queries.ts`.

## Running the Queries

```bash
cd web
npx tsx scripts/sample-queries.ts
```

## Query Categories

### 1. 📊 Top 10 Customers by Revenue
Shows your highest-value customers with:
- Total revenue per customer
- Number of orders
- Customer location (state)

**Business Value:** Identify your VIP accounts for special attention and relationship management.

### 2. 📦 Order Status Distribution
Breakdown of orders by status:
- DRAFT, SUBMITTED, FULFILLED, CANCELLED, PARTIALLY_FULFILLED

**Business Value:** Understand order pipeline health and identify bottlenecks.

### 3. 👥 Sales Rep Performance
Lists all active sales reps with:
- Number of assigned customers
- Territory name
- Weekly/monthly quotas

**Business Value:** Monitor rep workload and quota tracking.

### 4. ⚠️ Customer Risk Breakdown
Distribution of customers by risk status:
- HEALTHY
- AT_RISK_CADENCE (declining order frequency)
- AT_RISK_REVENUE (revenue down 15%+)
- DORMANT (45+ days no order)
- CLOSED (permanently closed)

**Business Value:** Proactive customer retention - identify accounts needing attention before they churn.

### 5. 🍷 Top 10 Products by Revenue
Shows best-selling products with:
- Product name and brand
- Total units sold
- Number of orders

**Business Value:** Understand inventory priorities and popular products.

### 6. 📅 Recent Activity (Last 30 Days)
Summary of sales activities by type:
- Calls, emails, visits, tastings, etc.

**Business Value:** Track team engagement levels and activity patterns.

### 7. 🎁 Sample Usage Statistics
Comprehensive sample tracking:
- Total samples given
- Number of sample events
- Conversion rate (samples → orders)

**Business Value:** Measure ROI on sample programs and rep effectiveness.

### 8. 💰 Invoice Status Summary
Invoice breakdown by status with totals:
- DRAFT, SENT, PAID, OVERDUE, VOID

**Business Value:** Cash flow monitoring and collections priorities.

### 9. 🛒 Shopping Cart Status
Active cart analysis:
- ACTIVE, SUBMITTED, ABANDONED

**Business Value:** Identify abandoned cart opportunities for follow-up.

### 10. 📈 Monthly Order Trend (Last 6 Months)
Time-series analysis showing:
- Order count per month
- Total revenue per month

**Business Value:** Identify seasonal trends and growth patterns.

## Database Schema Highlights

Your database supports a comprehensive B2B beverage/alcohol distribution system with:

### Core Entities
- **Tenants**: Multi-tenant SaaS architecture
- **Customers**: B2B accounts with risk scoring
- **Products & SKUs**: Product catalog with pricing
- **Orders & Invoices**: Full order-to-cash cycle
- **Inventory**: Multi-location stock tracking

### Sales Features
- **Sales Reps**: Territory management and quotas
- **Sample Tracking**: Product sampling with conversion tracking
- **Activity Logging**: Sales activities and follow-ups
- **Call Plans**: Structured customer outreach
- **Customer Risk Scoring**: Automated at-risk detection

### Compliance & Operations
- **State Compliance**: State-specific regulations
- **Tax Rates**: State-by-state tax tracking
- **Webhooks**: Integration capabilities
- **Audit Logs**: Complete change history
- **Data Integrity**: Quality scoring

### Interesting Features to Explore

1. **Customer Health Snapshots**: Track customer account health over time
2. **Rep Performance Metrics**: Weekly metrics tracking for sales reps
3. **Product Goals**: Rep-specific product targets
4. **Sales Incentives**: Incentive program tracking
5. **Calendar Integration**: Tasting appointments and visits

## Potential Additional Queries

### Customer Churn Analysis
```typescript
// Find customers who haven't ordered in 60+ days
const dormantCustomers = await prisma.customer.findMany({
  where: {
    lastOrderDate: { lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    riskStatus: { not: 'CLOSED' }
  },
  include: { salesRep: { include: { user: true } } }
});
```

### Rep Sample Efficiency
```typescript
// Which reps have the best sample-to-order conversion?
const repSampleEfficiency = await prisma.$queryRaw`
  SELECT
    sr.id,
    u."fullName",
    COUNT(su.id) as samples_given,
    COUNT(su.id) FILTER (WHERE su."resultedInOrder" = true) as converted,
    ROUND(100.0 * COUNT(su.id) FILTER (WHERE su."resultedInOrder" = true) / NULLIF(COUNT(su.id), 0), 1) as conversion_rate
  FROM "SalesRep" sr
  JOIN "User" u ON sr."userId" = u.id
  LEFT JOIN "SampleUsage" su ON sr.id = su."salesRepId"
  GROUP BY sr.id, u."fullName"
  HAVING COUNT(su.id) > 0
  ORDER BY conversion_rate DESC
`;
```

### Revenue by State
```typescript
// Which states generate the most revenue?
const revenueByState = await prisma.$queryRaw`
  SELECT
    c.state,
    COUNT(DISTINCT c.id) as customer_count,
    SUM(o.total) as total_revenue
  FROM "Customer" c
  JOIN "Order" o ON c.id = o."customerId"
  WHERE o.status IN ('FULFILLED', 'SUBMITTED')
  GROUP BY c.state
  ORDER BY total_revenue DESC
`;
```

## Notes

- The database uses Supabase/PostgreSQL
- Multi-tenant architecture (all queries should filter by tenantId in production)
- Comprehensive audit logging is enabled
- The schema supports complex B2B workflows including compliance tracking

## Troubleshooting

If queries fail:
1. Check DATABASE_URL in `.env.local`
2. Verify database is accessible
3. Ensure Prisma client is generated: `npx prisma generate`
4. Check database migrations are up to date: `npx prisma migrate status`
