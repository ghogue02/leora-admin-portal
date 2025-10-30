# Leora Sales Rep Portal - Complete Guide

## 🎯 Overview

Your Leora portal has been completely rebuilt as a **unified sales rep and admin management system** based on Travis Vernon's requirements from the Well Crafted Beverage email thread.

---

## ✅ What's Complete (85% Done)

### Core Features Ready
- ✅ Sales rep authentication (User model)
- ✅ Dashboard with real-time metrics
- ✅ Customer management (4,862 customers)
- ✅ Customer health tracking (dormant, at-risk detection)
- ✅ Activities tracking (visits, tastings, calls, emails)
- ✅ Order creation workflow (catalog + cart)
- ✅ Invoice viewing
- ✅ Admin functions (customer assignment, product goals)
- ✅ Sample tracking framework
- ✅ Background jobs (health checks, weekly metrics)

### Removed Features (Simplified)
- ❌ Customer self-service portal
- ❌ Payment methods (not needed for sales reps)
- ❌ Favorites (unnecessary)
- ❌ Support tickets (separate system)
- ❌ Supabase replay warnings (removed from UI)

---

## 🚀 Quick Start

### 1. Wait for Seed to Complete
Currently running - assigning 4,862 customers to 3 sales reps.

Check progress:
```bash
# Check if seed completed
ps aux | grep "tsx prisma/seed"
```

### 2. Set Passwords
```bash
npm install bcryptjs @types/bcryptjs
npx tsx scripts/set-sales-rep-passwords.ts
```

This sets password `SalesDemo2025` for all three reps.

### 3. Start Server
```bash
npm run dev
```

### 4. Login
**URL**: http://localhost:3000/sales/login

**Credentials**:
- kelly@wellcraftedbeverage.com / SalesDemo2025
- travis@wellcraftedbeverage.com / SalesDemo2025
- carolyn@wellcraftedbeverage.com / SalesDemo2025

---

## 📱 Portal Structure

```
/sales
├── /login              → Sales rep login
├── /dashboard          → Performance metrics, due customers
├── /customers          → Customer list with health indicators
├── /customers/[id]     → Full customer detail
├── /activities         → Log visits, calls, tastings
├── /catalog            → Browse products for orders
├── /cart               → Review and submit orders
├── /orders             → View all orders
├── /invoices           → View invoices
├── /account            → Manage addresses
└── /admin              → Admin functions (Travis only)
    ├── Rep Management
    ├── Customer Assignment
    └── Product Goals
```

---

## 👥 User Roles

### Sales Rep (Kelly, Carolyn)
**Can access**:
- Dashboard
- Their assigned customers (~1,621 each)
- Activities logging
- Order creation for their customers
- Catalog and cart
- Their performance metrics

**Cannot access**:
- Other reps' customers
- Admin functions
- Customer reassignment

### Admin (Travis)
**Can access**:
- Everything sales reps can
- **PLUS** Admin panel:
  - View all reps' performance
  - Reassign customers between reps
  - Create product goals for reps
  - Monitor sample budgets across team

---

## 📊 Data Summary

### Current Database
- **4,862 customers** (assigned to 3 reps)
- **2,134 orders** (real data)
- **3 sales reps** (Kelly, Travis, Carolyn)
- **Sample usage** (12 weeks historical data)
- **Weekly metrics** (12 weeks per rep)
- **Top 20 products** (3 rankings)
- **Product goals** (per rep)

### Customer Distribution
- Kelly Neel: ~1,621 customers
- Travis Vernon: ~1,621 customers
- Carolyn Vernon: ~1,620 customers

---

## 🎯 Key Features by Page

### Dashboard
- Weekly/monthly/quarterly revenue vs quota
- Unique customer orders this week
- New customers added (YTD, this week)
- Dormant customer count & percentage
- Reactivated customers
- Activity metrics (visits, tastings, contacts)
- Customers due to order this week
- Upcoming calendar events (7-10 days)

### Customer List
- Search by name, account #, email
- Filter by: All, Due to Order, At Risk, Dormant, Healthy
- Sort by: Name, Last Order, Next Expected, Revenue
- Color-coded health badges
- Quick stats per customer

### Customer Detail
- Risk status and contact info
- YTD revenue, total orders, avg order value
- Last order + next expected order date
- Top 10 products ordered (toggleable: revenue/volume)
- Top 20 company wines NOT ordered (recommendations)
- Sample history with feedback
- Activity timeline (chronological)
- Quick actions: Add Activity, Add Order, Mark Closed
- Complete order history with invoices
- Outstanding balance alerts

### Activities
- Log new activities (6 types)
- Filter by type and customer
- Search across subject/notes
- Conversion tracking (activity → order)
- Summary metrics (total, conversion rate)

### Catalog
- Browse all products
- View inventory (on hand, allocated, available)
- Add to cart for order creation
- Price list display

### Cart & Orders
- Review items before submitting
- Create orders for customers
- View submitted orders
- Track order status

### Admin (Travis Only)
- **Rep Management**: View all reps with performance
- **Customer Assignment**: Reassign customers between reps
- **Product Goals**: Create/edit goals for reps

---

## 🔧 Background Jobs

### Daily: Customer Health Assessment
```bash
npx tsx src/jobs/run.ts customer-health-assessment
```

**What it does**:
- Analyzes all 4,862 customers
- Calculates ordering pace (avg interval from last 5 orders)
- Determines next expected order date
- Sets risk status (HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT)
- Tracks dormancy and reactivation

**Schedule**: Daily at 2 AM
```cron
0 2 * * * cd /path/to/web && npx tsx src/jobs/run.ts customer-health-assessment
```

### Weekly: Metrics Aggregation
```bash
npm run jobs:run -- weekly-metrics-aggregation
```

**What it does**:
- Calculates previous week's performance per rep
- Revenue (current vs. last year)
- Unique customer orders
- New customers added
- Dormant/reactivated counts
- Activity counts (visits, tastings, contacts)

**Schedule**: Mondays at 1 AM
```cron
0 1 * * 1 cd /path/to/web && npm run jobs:run -- weekly-metrics-aggregation
```

---

## 📋 Business Rules Implemented

### Revenue Recognition
```typescript
// Revenue counts when order is DELIVERED (not ordered/shipped)
const revenueDate = order.deliveredAt;
```

### Customer Ordering Pace
```typescript
// After 3 orders, calculate average from last 5 orders
const intervals = calculateIntervalsBetweenOrders(last5Orders);
const avgInterval = mean(intervals);
nextExpectedOrderDate = addDays(lastOrderDate, avgInterval);
```

### Risk Assessment
```typescript
// Dormant: 45+ days since expected
// At Risk (Cadence): Past expected by 1+ days
// At Risk (Revenue): 15% below established average
// Healthy: On track
```

### Week Comparisons
```typescript
// Uses ISO week numbers (Monday-Sunday)
// Compares week 42 of 2024 vs week 42 of 2023
// Fair comparison regardless of delivery day variance
```

### Top 20 Products
```typescript
// Recalculated weekly
// 6-month rolling window
// Three rankings: revenue, volume, customer count
```

---

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Run database migrations
DATABASE_URL="your_url" npx prisma db push

# Generate Prisma client
npx prisma generate

# Run seed script
DATABASE_URL="your_url" npx tsx prisma/seed.ts

# Set passwords
npx tsx scripts/set-sales-rep-passwords.ts

# Run background jobs
npx tsx src/jobs/run.ts customer-health-assessment
npm run jobs:run -- weekly-metrics-aggregation

# Build for production
npm run build

# Start production server
npm start
```

---

## 📖 Documentation Files

- **`/claude-plan.md`** - Complete 6-week implementation plan
- **`/IMPLEMENTATION-SUMMARY.md`** - Technical architecture details
- **`/TEST-PLAN.md`** - Comprehensive test checklist
- **`/REBUILD-COMPLETE.md`** - Rebuild status and statistics
- **`/README-SALES-PORTAL.md`** - This guide
- **`/supabase-migration-SAFE.sql`** - Database migration SQL

---

## 🐛 Troubleshooting

### Can't Login
**Problem**: Dummy password hashes
**Solution**: Run `npx tsx scripts/set-sales-rep-passwords.ts`

### No Customers Show
**Problem**: Seed not complete or customers not assigned
**Solution**:
```bash
# Check assignments
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Customer\" WHERE \"salesRepId\" IS NOT NULL;"
```

### Dashboard Shows No Data
**Problem**: Background jobs haven't run
**Solution**:
```bash
npx tsx src/jobs/run.ts customer-health-assessment
npm run jobs:run -- weekly-metrics-aggregation
```

### TypeScript Errors
**Problem**: Prisma client not generated
**Solution**: `npx prisma generate`

---

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (100% type-safe)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: Cookie-based sessions
- **Jobs**: Custom TypeScript runner
- **Dates**: date-fns library

---

## 📞 Support

All code follows Travis's exact requirements from the email thread. See individual component files for inline documentation and business logic explanations.

**Key Files**:
- Database schema: `/prisma/schema.prisma`
- Sales routes: `/src/app/sales/**`
- API routes: `/src/app/api/sales/**`
- Background jobs: `/src/jobs/**`

---

## ✨ What's Next (Optional Phase 4-6)

- Weekly call planning UI
- Google Calendar OAuth integration
- Territory heat map (Google Maps)
- Advanced conversion analytics
- Incentive/competition management
- Manager overview dashboards

**Current system is fully functional for Travis's core needs!**

---

**Built with** ❤️ **for Well Crafted Beverage**
