# Lovable Migration Quick Start Guide

**Generated:** 2025-10-21
**Full Plan:** See [LOVABLE_MIGRATION_PLAN.md](./LOVABLE_MIGRATION_PLAN.md)

---

## 📊 Executive Summary

**Project:** Leora Portal - B2B Wine Distribution Sales & Customer Portal
**Current Stack:** Next.js 15 + React 19 + Prisma + PostgreSQL + Supabase
**Migration Target:** Lovable Platform
**Estimated Effort:** 6-8 weeks for complete migration

**Complexity Rating:** ⭐⭐⭐⭐⭐ Very High

**Key Metrics:**
- 70+ database models
- 100+ API endpoints
- 200+ TypeScript/TSX files
- 50+ admin portal components
- 3 major interfaces (Customer Portal, Sales Rep Portal, Admin Portal)

---

## 🎯 Top 10 Files to Migrate First

### 1️⃣ `/prisma/schema.prisma` (1,070 lines)
**Why:** Foundation of entire application
**Complexity:** ⭐⭐⭐⭐⭐ Very High
**Priority:** CRITICAL

- 70+ models with complex relationships
- Multi-tenant architecture (all data scoped by `tenantId`)
- Critical models: Tenant, User, Customer, Order, Product, SalesRep
- 50+ database indexes for performance
- Foreign key relationships and cascading deletes

**Action Items:**
- [ ] Export Prisma schema to Supabase SQL migrations
- [ ] Set up Row Level Security (RLS) for tenant isolation
- [ ] Migrate all indexes for query performance
- [ ] Test multi-tenant data isolation thoroughly

---

### 2️⃣ `/src/lib/analytics.ts` (~500 lines)
**Why:** Core business logic for revenue metrics
**Complexity:** ⭐⭐⭐⭐⭐ Very High
**Priority:** CRITICAL

**Key Features:**
- **ARPDD (Average Revenue Per Delivery Day)** - Critical KPI
- Customer health scoring (HEALTHY, AT_RISK, DORMANT)
- Revenue trend analysis with YoY comparisons
- Cadence hotlist for at-risk accounts
- Account signals and alerts

**Dependencies:**
- Prisma ORM
- date-fns for date calculations
- Complex aggregations and date ranges

**Action Items:**
- [ ] Port to Lovable's database client (replace Prisma)
- [ ] Migrate `/src/lib/analytics.test.ts` for validation
- [ ] Test all calculations against original system
- [ ] Verify ARPDD accuracy with real data

**Critical Calculations:**
```typescript
// ARPDD = Total Revenue / Unique Delivery Days
// Health Score = (Revenue Trend × 0.6) + (Cadence Score × 0.4)
// Risk Status = Based on 15% revenue drop or 45+ days dormant
```

---

### 3️⃣ `/src/lib/cart.ts` (~300 lines estimated)
**Why:** Shopping cart and pricing logic
**Complexity:** ⭐⭐⭐⭐ High
**Priority:** CRITICAL

**Key Features:**
- Multi-tier pricing calculations
- Minimum order requirements
- Quantity validation
- Price list effective dates
- Customer-specific pricing

**Dependencies:**
- Prisma ORM
- Zod validation
- Price list and inventory checks

**Action Items:**
- [ ] Port cart logic to Lovable
- [ ] Migrate `/src/lib/cart.test.ts` for validation
- [ ] Test pricing rules thoroughly
- [ ] Verify minimum order enforcement

---

### 4️⃣ `/src/lib/auth/session.ts` + portal.ts + sales-session.ts
**Why:** Authentication and authorization foundation
**Complexity:** ⭐⭐⭐⭐ High
**Priority:** CRITICAL

**Key Features:**
- JWT-based session management
- Refresh token rotation
- Multi-tenant session isolation
- Role-based access control (RBAC)
- Separate portals (Customer vs Sales Rep)

**Roles:**
- `portal.viewer` - Read-only customer access
- `portal.buyer` - Can submit orders
- `portal.admin` - Full tenant access
- `sales.rep` - Sales representative
- `sales.admin` - Sales management

**Action Items:**
- [ ] Adapt to Lovable's auth system
- [ ] Preserve RBAC permissions
- [ ] Maintain multi-tenant isolation
- [ ] Test session expiration and refresh

---

### 5️⃣ `/src/lib/db.ts` (12 lines)
**Why:** Database connection singleton
**Complexity:** ⭐ Low
**Priority:** CRITICAL

**Current Implementation:**
```typescript
const prisma = globalForPrisma.prisma ?? new PrismaClient();
export default prisma;
```

**Action Items:**
- [ ] Replace with Lovable's database client
- [ ] Update all imports across codebase (200+ files)
- [ ] Test connection pooling
- [ ] Verify transaction support

---

### 6️⃣ `/src/app/sales/dashboard/page.tsx` + 10 section components
**Why:** Most important sales rep interface
**Complexity:** ⭐⭐⭐⭐⭐ Very High
**Priority:** HIGH

**Dashboard Sections:**
1. **PerformanceMetrics.tsx** - Revenue, quota progress, YoY comparison
2. **AssignedTasks.tsx** - Task management with completion actions
3. **UpcomingCalendar.tsx** - Calendar widget with events
4. **ProductGoals.tsx** - Product-specific revenue goals
5. **Incentives.tsx** - Active sales incentive programs
6. **CustomerHealthSummary.tsx** - At-risk customer alerts
7. **CustomersDueList.tsx** - Customers due for orders (cadence tracking)
8. **TasksList.tsx** - Simplified task view
9. **UpcomingEvents.tsx** - Event list view
10. **WeeklyRevenueChart.tsx** - Revenue trend visualization

**Dependencies:**
- `/src/lib/analytics.ts` (MUST migrate first)
- `/src/app/api/sales/dashboard/route.ts`
- Multiple database models (SalesRep, RepWeeklyMetric, Task, etc.)

**Action Items:**
- [ ] Migrate analytics.ts first (dependency)
- [ ] Port dashboard API route
- [ ] Migrate sections one by one
- [ ] Test real-time data updates

---

### 7️⃣ `/src/app/sales/customers/[customerId]/page.tsx` + 9 sections
**Why:** Core customer detail view for sales reps
**Complexity:** ⭐⭐⭐⭐⭐ Very High
**Priority:** HIGH

**Customer Detail Sections:**
1. **CustomerHeader.tsx** - Name, status, contact info
2. **CustomerMetrics.tsx** - Revenue, cadence, health scores
3. **OrderHistory.tsx** - Past orders with filtering
4. **ActivityTimeline.tsx** - Calls, visits, emails, tastings
5. **SampleHistory.tsx** - Sample tasting records
6. **TopProducts.tsx** - Most ordered products
7. **ProductRecommendations.tsx** - AI-powered suggestions
8. **QuickActions.tsx** - Log activity, create order buttons
9. **OrderingPaceIndicator.tsx** - Cadence visualization

**Data Requirements:**
- Customer master data
- Order history (past 12 months)
- Activity log (past 90 days)
- Sample usage records
- Revenue aggregations
- Health score calculations

**Action Items:**
- [ ] Migrate customer detail API
- [ ] Port section components
- [ ] Test complex aggregations
- [ ] Verify performance with large datasets

---

### 8️⃣ `/src/app/api/sales/dashboard/route.ts`
**Why:** Powers sales dashboard with aggregated metrics
**Complexity:** ⭐⭐⭐⭐ High
**Priority:** HIGH

**API Response:**
```typescript
{
  performanceMetrics: {
    weeklyRevenue: number,
    monthlyRevenue: number,
    quotaProgress: number,
    yoyComparison: number
  },
  assignedTasks: Task[],
  upcomingEvents: CalendarEvent[],
  productGoals: RepProductGoal[],
  incentives: SalesIncentive[],
  customerHealth: {
    atRisk: number,
    dueSoon: number,
    hotlist: Customer[]
  }
}
```

**Action Items:**
- [ ] Migrate to Lovable API structure
- [ ] Optimize database queries
- [ ] Add caching for expensive aggregations
- [ ] Test with real sales rep data

---

### 9️⃣ `/src/app/portal/catalog/page.tsx` + API
**Why:** Entry point for customer orders
**Complexity:** ⭐⭐⭐ Medium
**Priority:** HIGH

**Key Features:**
- Product grid with images
- Inventory status display
- Multi-tier pricing
- Add to cart actions
- Favorites/bookmarks
- Search and filtering

**API Endpoint:**
- `GET /api/portal/catalog` - Returns products with SKUs, pricing, inventory

**Action Items:**
- [ ] Migrate catalog page UI
- [ ] Port catalog API route
- [ ] Implement cart integration
- [ ] Test inventory accuracy

---

### 🔟 `/src/lib/orders.ts` + order API routes
**Why:** Order management and lifecycle
**Complexity:** ⭐⭐⭐⭐ High
**Priority:** HIGH

**Key Features:**
- Order creation (DRAFT → SUBMITTED)
- Order validation (inventory, pricing, minimums)
- Status transitions (SUBMITTED → FULFILLED → DELIVERED)
- Invoice generation
- Cancellation logic
- Audit logging

**Related API Routes:**
- `POST /api/sales/cart/checkout` - Create order from cart
- `PUT /api/sales/admin/orders/[id]/status` - Update order status
- `POST /api/sales/admin/orders/[id]/create-invoice` - Generate invoice
- `POST /api/portal/orders/[orderId]/cancel` - Cancel order

**Action Items:**
- [ ] Migrate order creation logic
- [ ] Port status transition rules
- [ ] Implement audit logging
- [ ] Test order workflows end-to-end

---

## 🗓️ Recommended Migration Timeline

### Week 1: Foundation
**Goal:** Database + Auth + Core Libraries

- [ ] Day 1-2: Migrate Prisma schema to Supabase
- [ ] Day 3: Set up authentication (portal + sales)
- [ ] Day 4: Migrate `/src/lib/db.ts`, `/src/lib/analytics.ts`
- [ ] Day 5: Migrate `/src/lib/cart.ts`, `/src/lib/orders.ts`
- [ ] Day 6-7: Testing and validation

**Success Criteria:**
- All database tables created
- Authentication working for both portals
- Core business logic libraries ported
- Unit tests passing

---

### Week 2: Customer Portal Core
**Goal:** Catalog + Cart + Orders

- [ ] Day 1-2: Catalog page + API (`/portal/catalog`)
- [ ] Day 3: Cart page + cart API (`/portal/cart`)
- [ ] Day 4: Order submission + checkout (`/portal/cart/checkout`)
- [ ] Day 5: Order history page (`/portal/orders`)
- [ ] Day 6-7: Testing and bug fixes

**Success Criteria:**
- Customer can browse catalog
- Customer can add to cart
- Customer can submit order
- Customer can view order history

---

### Week 3: Sales Rep Dashboard
**Goal:** Sales Dashboard + Customer Management

- [ ] Day 1-2: Sales dashboard page + API (`/sales/dashboard`)
- [ ] Day 3: Dashboard sections (metrics, tasks, calendar)
- [ ] Day 4-5: Customer list + customer detail (`/sales/customers`)
- [ ] Day 6-7: Order creation for customers

**Success Criteria:**
- Sales rep sees accurate performance metrics
- Sales rep can view customer list with health scores
- Sales rep can view customer detail with full history
- Sales rep can create orders on behalf of customers

---

### Week 4: Sales Advanced Features
**Goal:** Samples + Activities + Tasks

- [ ] Day 1: Sample management (`/sales/samples`)
- [ ] Day 2: Activity tracking (`/sales/activities`)
- [ ] Day 3: Task management (dashboard integration)
- [ ] Day 4: Call planning (`/sales/call-plan`)
- [ ] Day 5-7: Testing and refinements

**Success Criteria:**
- Sales rep can log sample tastings
- Sales rep can track activity timeline
- Sales rep can manage tasks
- Sales rep can plan weekly calls

---

### Week 5-6: Admin + AI + Polish
**Goal:** Admin Portal + Optional AI

- [ ] Week 5: Admin customer management, user accounts
- [ ] Week 6: AI Copilot (if feasible), final polish, optimization

**Success Criteria:**
- Admin can manage customers and users
- Admin can view audit logs
- AI Copilot working (optional)
- Performance optimized

---

### Week 7-8: Testing & Deployment
**Goal:** Production-ready

- [ ] Comprehensive testing (all features)
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Production deployment

**Success Criteria:**
- All Priority 1 features working
- All Priority 2 features working
- Performance benchmarks met
- Zero critical bugs

---

## ⚠️ Critical Success Factors

### 1. Analytics Accuracy (HIGHEST PRIORITY)
**Why:** ARPDD is the #1 KPI for the entire business
**Action:**
- Migrate `analytics.ts` first with full test coverage
- Compare output with original system using real data
- Manual validation of all calculations
- Get sign-off from business stakeholders

### 2. Multi-Tenant Isolation
**Why:** Data leakage would be catastrophic
**Action:**
- Implement Row Level Security (RLS) in Supabase
- Test cross-tenant access prevention thoroughly
- Automated security tests for all queries
- Middleware to enforce `tenantId` filtering

### 3. Database Performance
**Why:** System has 70+ models with complex queries
**Action:**
- Migrate all 50+ database indexes
- Use materialized views for expensive aggregations
- Implement caching for dashboard metrics
- Load testing with realistic data volumes

### 4. Authentication & Authorization
**Why:** RBAC is critical for security
**Action:**
- Preserve all role-based permissions
- Test session management thoroughly
- Verify refresh token rotation
- Test across both portals (customer + sales)

### 5. Order Flow Integrity
**Why:** Order errors directly impact revenue
**Action:**
- Test cart pricing calculations extensively
- Verify inventory checks work correctly
- Test order status transitions
- Validate invoice generation accuracy

---

## 🚨 Known Challenges

### 1. Prisma to Lovable Database
**Challenge:** Lovable may not support Prisma ORM
**Solution:**
- Use Supabase client directly (already in dependencies)
- Rewrite complex Prisma queries as SQL
- Create data access layer abstraction
- Test all queries against real data

### 2. AI Integration (Copilot)
**Challenge:** Anthropic SDK may not work in Lovable
**Solution:**
- Treat as optional (Priority 3)
- Use REST API directly with fetch
- Implement server-side proxy for API keys
- Consider deferring to post-migration enhancement

### 3. Background Jobs
**Challenge:** Weekly metrics, health assessments need scheduling
**Solution:**
- Use Supabase Edge Functions for cron jobs
- Implement cron endpoints for external services
- Test job reliability and error handling
- Set up monitoring for job failures

### 4. Complex Analytics
**Challenge:** 500+ lines of business logic in `analytics.ts`
**Solution:**
- Port carefully with comprehensive unit tests
- Use database views for common aggregations
- Consider materialized views for performance
- Implement caching layer for expensive calculations

---

## 📈 Migration Phases Summary

| Phase | Duration | Features | Priority |
|-------|----------|----------|----------|
| **Phase 1: Foundation** | Week 1-2 | Database, Auth, Core Libraries, Customer Portal | P1 ✅ CRITICAL |
| **Phase 2: Sales Dashboard** | Week 2-3 | Sales Dashboard, Customer Management, Orders | P1 ✅ CRITICAL |
| **Phase 3: Sales Advanced** | Week 3-4 | Samples, Activities, Tasks, Call Planning | P2 ⭐ IMPORTANT |
| **Phase 4: Admin** | Week 4-5 | Admin Portal, User Management, Audit Logs | P2 ⭐ IMPORTANT |
| **Phase 5: AI & Polish** | Week 5-6 | AI Copilot, Reporting, Optimization | P3 💡 NICE-TO-HAVE |
| **Phase 6: Testing** | Week 7-8 | Testing, Bug Fixes, Deployment | ALL ✅ CRITICAL |

---

## 📋 Pre-Migration Checklist

**Before starting migration:**

- [ ] Back up existing Supabase database
- [ ] Export all environment variables
- [ ] Document current system behavior (screenshots, videos)
- [ ] Identify key stakeholders for validation
- [ ] Set up staging environment for testing
- [ ] Prepare rollback plan
- [ ] Review Lovable platform capabilities and limitations
- [ ] Confirm database size and performance requirements
- [ ] Test Lovable with small proof-of-concept
- [ ] Get stakeholder sign-off on migration plan

---

## 🔗 Key Resources

**Documentation:**
- [Full Migration Plan](./LOVABLE_MIGRATION_PLAN.md) - Complete 12-section plan
- [Project README](../README.md) - Current system overview
- [Admin Portal Guide](./ADMIN_PORTAL_USER_GUIDE.md) - Admin features
- [Prisma Schema](../prisma/schema.prisma) - Database structure

**Critical Files:**
- `/src/lib/analytics.ts` - Core business logic
- `/src/lib/cart.ts` - Pricing and cart logic
- `/src/lib/orders.ts` - Order management
- `/src/lib/auth/session.ts` - Authentication
- `/prisma/schema.prisma` - Database schema

**Test Files:**
- `/src/lib/analytics.test.ts` - Analytics validation
- `/src/lib/cart.test.ts` - Cart pricing tests
- `/src/lib/prisma.test.ts` - Database tests

---

## 💡 Success Tips

1. **Migrate in Order** - Follow the numbered priority list strictly
2. **Test Early, Test Often** - Run tests after each file migration
3. **Preserve Business Logic** - Don't "improve" during migration
4. **Validate with Real Data** - Use production data in staging
5. **Document Changes** - Track all adaptations for Lovable
6. **Get Stakeholder Buy-in** - Validate metrics with business users
7. **Have a Rollback Plan** - Be ready to revert if needed
8. **Monitor Performance** - Track query speeds and page loads
9. **Security First** - Test multi-tenant isolation thoroughly
10. **Communicate Progress** - Weekly updates to stakeholders

---

## 🎯 Definition of Done

**Migration is complete when:**

- [ ] All 10 priority files migrated and tested
- [ ] All Priority 1 features working (Dashboard, Catalog, Customers, Orders)
- [ ] All Priority 2 features working (Invoicing, Territory, Reporting)
- [ ] Analytics calculations verified (ARPDD, health scores)
- [ ] Authentication working for both portals
- [ ] Multi-tenant isolation tested and verified
- [ ] Database performance meets targets (< 500ms API responses)
- [ ] All unit tests passing
- [ ] Manual testing checklist 100% complete
- [ ] Security audit completed
- [ ] Stakeholder approval obtained
- [ ] Production deployment successful
- [ ] Zero critical bugs in first week

---

**Questions or Issues?**
Refer to the [Full Migration Plan](./LOVABLE_MIGRATION_PLAN.md) for detailed guidance.

---

*Generated: 2025-10-21*
