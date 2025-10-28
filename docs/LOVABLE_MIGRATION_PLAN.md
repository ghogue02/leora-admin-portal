# Lovable Migration Plan for Leora Portal

**Generated:** 2025-10-21
**Source:** Next.js 15 + React 19 + Prisma + PostgreSQL
**Target:** Lovable Platform

---

## Executive Summary

Leora Portal is a comprehensive B2B sales and customer portal system for wine distributors. It features dual interfaces (Sales Rep Portal and Customer Portal), extensive order management, AI-powered copilot assistance, and sophisticated analytics. The application has 70+ models, 100+ API endpoints, and advanced features including task management, sample tracking, and compliance reporting.

**Migration Complexity:** High
**Estimated Effort:** 3-4 weeks for core features, 6-8 weeks for complete migration
**Key Challenge Areas:** Database schema migration, API route conversion, AI integration, multi-tenant architecture

---

## Section 1: Project Overview

### Tech Stack Summary

**Frontend:**
- Next.js 15.5.5 (App Router)
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- Lucide React (icons)
- Sonner (toast notifications)
- date-fns 4.1.0

**Backend:**
- Prisma 6.17.1 (ORM)
- PostgreSQL (via Supabase)
- Supabase 2.75.1 (auth + database)
- bcryptjs (password hashing)
- Zod 4.1.12 (validation)

**AI/ML:**
- Anthropic Claude AI SDK 0.67.0
- OpenAI API integration (GPT-4.1-mini)
- AI Copilot for analytics and insights

**Development:**
- Vitest 2.1.9 (testing)
- ESLint + Prettier
- CSV parsing (csv-parse 6.1.0)

### Key Features List

#### Customer Portal Features
1. Dashboard with ARPDD (Average Revenue Per Delivery Day) metrics
2. Product catalog with favorites and inventory
3. Shopping cart and order submission
4. Order history and tracking
5. Invoice management
6. Customer address management
7. AI Copilot for business insights
8. Portal notifications
9. Multi-user account support
10. Automation & alert configuration

#### Sales Rep Portal Features
1. Comprehensive sales dashboard with performance metrics
2. Customer management with health scoring
3. Territory management
4. Sample tracking and budget management
5. Call planning and scheduling
6. Activity timeline tracking
7. Task management system
8. Calendar integration with upcoming events
9. Product goals and incentives
10. Order creation on behalf of customers
11. Weekly/monthly/quarterly quota tracking
12. Revenue analytics and reporting

#### Admin Portal Features
1. Customer management (bulk operations)
2. Sales representative management
3. Inventory and pricing management
4. User account management
5. Audit log system with full activity tracking
6. Data integrity monitoring
7. Bulk operations (reassignment, exports)
8. Global search (Ctrl+K)
9. Advanced pagination
10. Role-based access control (RBAC)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   /portal    │  │    /sales    │  │    /admin    │     │
│  │              │  │              │  │              │     │
│  │ Customer UI  │  │  Sales Rep   │  │  Admin UI    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                        API Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ /api/portal  │  │  /api/sales  │  │  /api/admin  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                   Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth/Session │  │  Analytics   │  │  Copilot     │     │
│  │ Cart Logic   │  │  Orders      │  │  Automation  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                     Data Access Layer                        │
│                    Prisma ORM + Zod                         │
├─────────────────────────────────────────────────────────────┤
│                   PostgreSQL Database                        │
│                    (via Supabase)                           │
│  • 70+ Models                                               │
│  • Multi-tenant architecture                                │
│  • 50+ database indexes                                     │
└─────────────────────────────────────────────────────────────┘
```

**Multi-Tenant Architecture:**
- All data scoped by `tenantId`
- Middleware extracts tenant from request headers
- Default tenant: "well-crafted"
- Session management per tenant (Portal + Sales sessions)

**Authentication Flow:**
- Portal: JWT-based sessions with refresh tokens
- Sales: Separate session system with role-based access
- Admin: Enhanced session with elevated permissions
- RBAC with permissions system (portal.viewer, portal.buyer, sales.admin, etc.)

---

## Section 2: Pages & Routes

### Portal Routes (/portal)

| Route | Description | Key Features |
|-------|-------------|--------------|
| `/portal` | Customer dashboard redirect | Redirects to `/sales/login` |
| `/portal/dashboard` | Main dashboard | ARPDD metrics, revenue tracking, account health |
| `/portal/catalog` | Product catalog | Grid view, favorites, inventory, cart actions |
| `/portal/cart` | Shopping cart | Review items, submit orders, pricing calculations |
| `/portal/orders` | Order history | List view, status tracking, cancel actions |
| `/portal/orders/[orderId]` | Order detail | Line items, invoice links, delivery tracking |
| `/portal/invoices` | Invoice list | Payment status, due dates, download links |
| `/portal/account` | Account settings | Address management, user preferences |
| `/portal/customers/[customerId]` | Customer detail | For admin users, customer account view |
| `/portal/admin` | Admin settings | Webhooks, automation configuration |
| `/portal/leora` | AI Copilot chat | Business insights, analytics queries |
| `/portal/audit/fulfillment` | Audit trail | Order fulfillment tracking |

### Sales Rep Routes (/sales)

| Route | Description | Key Features |
|-------|-------------|--------------|
| `/sales` | Sales dashboard redirect | Auto-redirects to `/sales/dashboard` |
| `/sales/login` | Login page | Sales rep authentication |
| `/sales/dashboard` | Main dashboard | Performance metrics, tasks, calendar, goals |
| `/sales/customers` | Customer list | Filtering, health status, territory view |
| `/sales/customers/[customerId]` | Customer detail | Metrics, orders, activities, samples, recommendations |
| `/sales/catalog` | Product catalog | Sales rep view, pricing, inventory |
| `/sales/cart` | Sales cart | Create orders on behalf of customers |
| `/sales/orders` | Order management | View/edit orders, create invoices |
| `/sales/invoices` | Invoice management | Invoice list and details |
| `/sales/territory` | Territory overview | Customer assignments, delivery routes |
| `/sales/call-plan` | Call planning | Weekly schedule, activity planning |
| `/sales/activities` | Activity tracking | Log calls, visits, tastings |
| `/sales/samples` | Sample management | Log samples, track budget, follow-ups |
| `/sales/manager` | Manager dashboard | Team performance, territory health |
| `/sales/reports` | Reporting | Analytics and performance reports |
| `/sales/admin` | Sales admin | Rep management, assignments, goals |
| `/sales/leora` | AI Copilot for sales | Sales insights, recommendations |

### Admin Routes (/admin)

| Route | Description | Key Features |
|-------|-------------|--------------|
| `/admin` | Admin dashboard | Metrics, quick actions, system health |
| `/admin/customers` | Customer management | CRUD, bulk operations, search |
| `/admin/customers/new` | New customer | Customer creation form |
| `/admin/customers/[id]` | Edit customer | Full customer details, history |
| `/admin/sales-reps` | Rep management | Territory assignments, quotas |
| `/admin/inventory` | Inventory management | SKU management, stock levels |
| `/admin/inventory/[skuId]` | Inventory detail | Adjust stock, view history |
| `/admin/inventory/pricing` | Price list management | Multi-tier pricing, effective dates |
| `/admin/inventory/pricing/[id]` | Price list detail | SKU-level pricing rules |
| `/admin/accounts` | User accounts | Portal users, sales reps, roles |
| `/admin/accounts/new` | New account | User creation with role assignment |
| `/admin/accounts/user/[id]` | Edit user | Sales rep details |
| `/admin/accounts/portal-user/[id]` | Edit portal user | Customer account details |
| `/admin/audit-logs` | Audit trail | System activity, filtering, search |
| `/admin/audit-logs/stats` | Audit statistics | Activity analytics, trends |
| `/admin/bulk-operations` | Bulk operations | Mass updates, imports, exports |
| `/admin/data-integrity` | Data quality | Integrity checks, validation rules |
| `/admin/data-integrity/[ruleId]` | Rule violations | Detailed violation list |

### API Routes

**Portal API (/api/portal):**
- `POST /api/portal/auth/login` - Portal user login
- `POST /api/portal/auth/refresh` - Refresh session token
- `POST /api/portal/auth/logout` - End session
- `GET /api/portal/auth/me` - Current user details
- `GET /api/portal/dashboard` - Dashboard metrics
- `GET /api/portal/catalog` - Product catalog
- `GET /api/portal/cart` - Get cart
- `POST /api/portal/cart/items` - Add to cart
- `DELETE /api/portal/cart/items` - Remove from cart
- `POST /api/portal/cart/checkout` - Submit order
- `GET /api/portal/orders` - List orders
- `GET /api/portal/orders/[orderId]` - Order details
- `POST /api/portal/orders/[orderId]/cancel` - Cancel order
- `GET /api/portal/orders/audit` - Order audit trail
- `GET /api/portal/invoices` - List invoices
- `GET /api/portal/customers/[customerId]` - Customer details
- `GET /api/portal/addresses` - Customer addresses
- `POST /api/portal/addresses` - Create address
- `PUT /api/portal/addresses` - Update address
- `GET /api/portal/notifications` - Notification list
- `POST /api/portal/copilot` - AI Copilot streaming
- `GET /api/portal/admin/webhooks` - Webhook management

**Sales API (/api/sales):**
- `POST /api/sales/auth/login` - Sales rep login
- `GET /api/sales/auth/me` - Current rep details
- `GET /api/sales/dashboard` - Sales dashboard data
- `GET /api/sales/customers` - Customer list with filters
- `GET /api/sales/customers/[customerId]` - Customer detail
- `GET /api/sales/catalog/skus` - SKU catalog
- `GET /api/sales/cart` - Sales cart
- `POST /api/sales/cart/items` - Add cart item
- `POST /api/sales/cart/checkout` - Submit order
- `GET /api/sales/orders` - Order list
- `GET /api/sales/tasks/assigned` - Assigned tasks
- `GET /api/sales/tasks` - All tasks
- `POST /api/sales/tasks` - Create task
- `POST /api/sales/tasks/[taskId]/complete` - Complete task
- `POST /api/sales/tasks/[taskId]/uncomplete` - Reopen task
- `GET /api/sales/calendar/upcoming` - Upcoming events
- `GET /api/sales/goals/products` - Product goals
- `GET /api/sales/incentives/active` - Active incentives
- `GET /api/sales/samples/history` - Sample usage history
- `POST /api/sales/samples/log` - Log sample usage
- `POST /api/sales/samples/[sampleId]/converted` - Mark converted
- `POST /api/sales/samples/[sampleId]/follow-up` - Mark followed up
- `GET /api/sales/samples/budget` - Sample budget status
- `GET /api/sales/activities` - Activity list
- `POST /api/sales/activities` - Log activity
- `GET /api/sales/activity-types` - Available activity types
- `GET /api/sales/call-plan` - Call plan data
- `POST /api/sales/call-plan/tasks` - Create call plan task
- `GET /api/sales/manager/dashboard` - Manager dashboard
- `POST /api/sales/copilot` - AI Copilot for sales
- `GET /api/sales/insights` - Sales insights
- `GET /api/sales/insights/drilldown` - Detailed analytics

**Sales Admin API (/api/sales/admin):**
- `GET /api/sales/admin/reps` - List sales reps
- `POST /api/sales/admin/reps` - Create rep
- `GET /api/sales/admin/assignments` - Customer assignments
- `POST /api/sales/admin/assignments` - Assign customers
- `GET /api/sales/admin/territories` - Territory list
- `GET /api/sales/admin/goals` - Rep goals
- `POST /api/sales/admin/goals` - Set goals
- `GET /api/sales/admin/orders` - All orders
- `POST /api/sales/admin/orders` - Create order
- `GET /api/sales/admin/orders/[id]` - Order detail
- `PUT /api/sales/admin/orders/[id]` - Update order
- `POST /api/sales/admin/orders/[id]/cancel` - Cancel order
- `PUT /api/sales/admin/orders/[id]/status` - Update status
- `POST /api/sales/admin/orders/[id]/create-invoice` - Generate invoice
- `GET /api/sales/admin/orders/[id]/line-items` - Order lines
- `POST /api/sales/admin/orders/[id]/line-items` - Add line
- `PUT /api/sales/admin/orders/[id]/line-items/[lineItemId]` - Update line
- `DELETE /api/sales/admin/orders/[id]/line-items/[lineItemId]` - Remove line

**Admin API (/api/admin):**
- `GET /api/admin/customers` - Customer list
- `POST /api/admin/customers` - Create customer
- `GET /api/admin/customers/[id]` - Customer detail
- `PUT /api/admin/customers/[id]` - Update customer
- `DELETE /api/admin/customers/[id]` - Delete customer
- `POST /api/admin/customers/bulk-reassign` - Bulk reassign
- `GET /api/admin/customers/export` - Export CSV
- `GET /api/admin/audit-logs` - Audit log list
- `GET /api/admin/audit-logs/entity-types` - Entity type list
- `GET /api/admin/audit-logs/stats` - Audit statistics
- And 50+ more admin endpoints...

---

## Section 3: Core Components

### Reusable Components

**Located in:** `/src/app/portal/_components` and `/src/app/sales/_components`

| Component | Purpose | Used In |
|-----------|---------|---------|
| `PortalNav.tsx` | Navigation bar for portal | All portal pages |
| `CartProvider.tsx` | Cart state management | Portal layout |
| `ToastProvider.tsx` | Toast notification context | Portal & Sales layouts |
| `CustomerFilters.tsx` | Filter UI for customers | Sales customer list |
| `CustomerTable.tsx` | Customer data table | Sales customer list |
| `OrdersList.tsx` | Order list component | Portal & Sales orders |
| `CatalogGrid.tsx` | Product grid display | Portal & Sales catalog |

### Sales Dashboard Sections

**Located in:** `/src/app/sales/dashboard/sections/`

| Component | Purpose |
|-----------|---------|
| `PerformanceMetrics.tsx` | Weekly/monthly revenue, quota progress |
| `AssignedTasks.tsx` | Task list with completion actions |
| `UpcomingCalendar.tsx` | Calendar widget with events |
| `ProductGoals.tsx` | Product-specific revenue goals |
| `Incentives.tsx` | Active sales incentives |
| `CustomerHealthSummary.tsx` | At-risk customer summary |
| `CustomersDueList.tsx` | Customers due for orders |
| `TasksList.tsx` | Simplified task list |
| `UpcomingEvents.tsx` | Event list view |
| `WeeklyRevenueChart.tsx` | Revenue trend chart |

### Customer Detail Sections

**Located in:** `/src/app/sales/customers/[customerId]/sections/`

| Component | Purpose |
|-----------|---------|
| `CustomerHeader.tsx` | Name, status, contact info |
| `CustomerMetrics.tsx` | Revenue, cadence, health scores |
| `OrderHistory.tsx` | Past order list |
| `ActivityTimeline.tsx` | Call/visit/email timeline |
| `SampleHistory.tsx` | Sample tasting records |
| `TopProducts.tsx` | Most ordered products |
| `ProductRecommendations.tsx` | AI-powered suggestions |
| `QuickActions.tsx` | Log activity, create order |
| `OrderingPaceIndicator.tsx` | Cadence visualization |
| `AccountHolds.tsx` | Credit holds, payment issues |

### Admin Components

**Located in:** `/src/app/admin/components/`

| Component | Purpose |
|-----------|---------|
| `Sidebar.tsx` | Admin navigation sidebar |
| `AdminHeader.tsx` | Top navigation with search |
| `GlobalSearch.tsx` | Ctrl+K search modal |
| `Pagination.tsx` | Advanced pagination controls |
| `ConfirmDialog.tsx` | Confirmation modal |
| `Toast.tsx` | Toast notification system |
| `LoadingSpinner.tsx` | Loading states |
| `Breadcrumbs.tsx` | Navigation breadcrumbs |
| `KeyboardShortcuts.tsx` | Keyboard shortcut help |
| `UnsavedChangesWarning.tsx` | Form change detection |

### UI Components (shadcn/ui style)

**Pattern Used:** Inline components styled with Tailwind CSS
- No explicit shadcn/ui library installed
- Components built following shadcn patterns
- Lucide React for icons
- Tailwind CSS 4 for styling

**Common Patterns:**
- Button variants (primary, secondary, ghost, danger)
- Form inputs with validation states
- Modal/dialog overlays
- Dropdown menus
- Data tables with sorting/filtering
- Toast notifications via Sonner
- Loading skeletons

### Custom Hooks

**Located in:** `/src/app/admin/hooks/`

| Hook | Purpose |
|------|---------|
| `useDebounce.ts` | Debounce input values (300ms) |
| `usePagination.ts` | Pagination state management |

---

## Section 4: Database Schema

### Core Models (70+ Total)

**Tenant & Auth Models:**
- `Tenant` - Multi-tenant root entity
- `TenantSettings` - Tenant configuration
- `User` - Sales rep users
- `PortalUser` - Customer portal users
- `Role` - Role definitions
- `Permission` - Permission definitions
- `RolePermission` - Role-permission mapping
- `UserRole` - User role assignments
- `PortalUserRole` - Portal user role assignments
- `PortalSession` - Portal user sessions
- `SalesSession` - Sales rep sessions

**Product & Inventory Models:**
- `Product` - Product master (wine products)
- `Sku` - SKU/variants (sizes, cases)
- `Supplier` - Supplier information
- `Inventory` - Stock levels by location
- `PriceList` - Price list headers
- `PriceListItem` - SKU-level pricing

**Customer & Order Models:**
- `Customer` - Customer accounts
- `CustomerAddress` - Delivery addresses
- `Order` - Order headers
- `OrderLine` - Order line items
- `Invoice` - Invoice headers
- `Payment` - Payment records
- `Cart` - Shopping carts
- `CartItem` - Cart line items

**Sales Rep Models:**
- `SalesRep` - Sales rep profiles
- `CustomerAssignment` - Territory assignments
- `SampleUsage` - Sample tracking
- `RepWeeklyMetric` - Weekly performance
- `RepProductGoal` - Product-specific goals
- `TopProduct` - Top product rankings
- `SalesIncentive` - Incentive programs

**Activity & Task Models:**
- `Activity` - Activity log (calls, visits, emails)
- `ActivityType` - Activity type definitions
- `Task` - Task management
- `CallPlan` - Call planning
- `CalendarEvent` - Calendar events

**Analytics & Monitoring:**
- `AccountHealthSnapshot` - Customer health tracking
- `SalesMetric` - Sales metrics aggregation
- `AuditLog` - System audit trail
- `DataIntegritySnapshot` - Data quality monitoring

**Compliance & Alerts:**
- `ComplianceFiling` - State compliance filings
- `StateCompliance` - State compliance settings
- `StateTaxRate` - Tax rate by state
- `PortalNotification` - User notifications

**Integration Models:**
- `WebhookSubscription` - Webhook registrations
- `WebhookEvent` - Webhook events
- `WebhookDelivery` - Delivery attempts
- `IntegrationToken` - Third-party tokens

### Key Relationships

```
Tenant (1) ─┬─── (N) User
            ├─── (N) PortalUser
            ├─── (N) Customer
            ├─── (N) Product
            ├─── (N) Order
            └─── (N) Invoice

Customer (1) ─┬─── (N) Order
              ├─── (N) Invoice
              ├─── (N) CustomerAddress
              ├─── (N) Activity
              └─── (1) SalesRep

SalesRep (1) ─┬─── (N) Customer
              ├─── (N) SampleUsage
              ├─── (N) RepWeeklyMetric
              └─── (N) RepProductGoal

Order (1) ─┬─── (N) OrderLine
           ├─── (N) Invoice
           └─── (N) Payment

Product (1) ─── (N) Sku
Sku (1) ─┬─── (N) Inventory
         ├─── (N) PriceListItem
         ├─── (N) OrderLine
         └─── (N) CartItem
```

### Enums

- `PortalUserStatus` - ACTIVE, INVITED, DISABLED
- `OrderStatus` - DRAFT, SUBMITTED, FULFILLED, CANCELLED, PARTIALLY_FULFILLED
- `InvoiceStatus` - DRAFT, SENT, PAID, OVERDUE, VOID
- `CartStatus` - ACTIVE, SUBMITTED, ABANDONED
- `ActivityOutcome` - PENDING, SUCCESS, FAILED, NO_RESPONSE
- `TaskStatus` - PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `TaskPriority` - LOW, MEDIUM, HIGH
- `CustomerRiskStatus` - HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT, CLOSED
- `ComplianceStatus` - PENDING, IN_PROGRESS, SUBMITTED, ACCEPTED, REJECTED
- `WebhookStatus` - PENDING, SUCCESS, FAILED, RETRYING

### Database Indexes (50+)

**Performance optimizations:**
- Tenant-based filtering on all tables
- Customer lookup by externalId, salesRepId, riskStatus
- Order filtering by deliveredAt, deliveryWeek
- Activity filtering by occurredAt, userId
- Audit log by createdAt, entityType, entityId
- Sales metrics by metricDate, scope
- Sample usage by salesRepId, tastedAt

### Seed Data Requirements

**Scripts Available:**
- `/src/scripts/seed-well-crafted.ts` - Main demo data
- `/src/scripts/seed-portal-demo.ts` - Portal user data
- `/src/scripts/seed-activity-types.ts` - Activity types
- `/src/scripts/verify-activity-types.ts` - Verification

**Required Seed Data:**
1. Default tenant ("well-crafted")
2. Roles and permissions
3. Activity types (Visit, Call, Email, Tasting, Meeting)
4. Sample products and SKUs
5. Demo customers
6. Demo sales reps
7. Sample orders and invoices

---

## Section 5: Key Features by Priority

### Priority 1 (Core Features) - MUST HAVE

**1. Sales Rep Dashboard**
- **Complexity:** High
- **Dependencies:** Auth, DB, Analytics
- **Files:**
  - `/src/app/sales/dashboard/page.tsx`
  - `/src/app/sales/dashboard/sections/*.tsx` (10 files)
  - `/src/app/api/sales/dashboard/route.ts`
  - `/src/lib/analytics.ts`
- **Key Features:**
  - Performance metrics (revenue, quota progress)
  - Assigned tasks list
  - Upcoming calendar events
  - Product goals tracker
  - Active incentives
  - Customer health summary
- **Database Models:** SalesRep, RepWeeklyMetric, Task, CalendarEvent, RepProductGoal
- **Migration Notes:** Core analytics logic in `/src/lib/analytics.ts` needs porting

**2. Product Catalog**
- **Complexity:** Medium
- **Dependencies:** Auth, Pricing, Inventory
- **Files:**
  - `/src/app/portal/catalog/page.tsx`
  - `/src/app/sales/catalog/page.tsx`
  - `/src/app/portal/catalog/sections/CatalogGrid.tsx`
  - `/src/app/api/portal/catalog/route.ts`
  - `/src/app/api/sales/catalog/skus/route.ts`
- **Key Features:**
  - Product grid with images
  - Inventory status
  - Pricing tiers
  - Add to cart actions
  - Favorites/bookmarks
  - Search and filtering
- **Database Models:** Product, Sku, Inventory, PriceList, PriceListItem
- **Migration Notes:** Cart integration required

**3. Customer Management**
- **Complexity:** High
- **Dependencies:** Auth, Territory, Activities
- **Files:**
  - `/src/app/sales/customers/page.tsx`
  - `/src/app/sales/customers/[customerId]/page.tsx`
  - `/src/app/sales/customers/sections/*.tsx` (2 files)
  - `/src/app/sales/customers/[customerId]/sections/*.tsx` (9 files)
  - `/src/app/api/sales/customers/route.ts`
  - `/src/app/api/sales/customers/[customerId]/route.ts`
- **Key Features:**
  - Customer list with filtering (risk status, territory)
  - Customer detail view
  - Health metrics (revenue, cadence, ARPDD)
  - Order history
  - Activity timeline
  - Sample history
  - Top products
  - Product recommendations
  - Quick actions (log activity, create order)
- **Database Models:** Customer, CustomerAddress, Activity, Order, SampleUsage
- **Migration Notes:** Complex aggregations for metrics

**4. Order Creation**
- **Complexity:** Medium-High
- **Dependencies:** Cart, Pricing, Inventory
- **Files:**
  - `/src/app/sales/cart/page.tsx`
  - `/src/app/portal/cart/page.tsx`
  - `/src/app/api/sales/cart/route.ts`
  - `/src/app/api/portal/cart/route.ts`
  - `/src/app/api/sales/cart/checkout/route.ts`
  - `/src/app/api/portal/cart/checkout/route.ts`
  - `/src/lib/cart.ts`
  - `/src/lib/orders.ts`
- **Key Features:**
  - Add/remove cart items
  - Quantity adjustments
  - Pricing calculations
  - Minimum order rules
  - Submit order
  - Order confirmation
- **Database Models:** Cart, CartItem, Order, OrderLine
- **Migration Notes:** Pricing logic in `/src/lib/cart.ts` is critical

### Priority 2 (Important) - SHOULD HAVE

**5. Invoicing**
- **Complexity:** Medium
- **Files:**
  - `/src/app/sales/invoices/page.tsx`
  - `/src/app/portal/invoices/page.tsx`
  - `/src/app/api/portal/invoices/route.ts`
- **Key Features:**
  - Invoice list
  - Payment status
  - Due date tracking
  - Invoice details
- **Database Models:** Invoice, Payment
- **Migration Notes:** Payment tracking integration needed

**6. Territory Management**
- **Complexity:** Medium
- **Files:**
  - `/src/app/sales/territory/page.tsx`
  - `/src/app/sales/admin/sections/CustomerAssignment.tsx`
  - `/src/app/api/sales/admin/assignments/route.ts`
  - `/src/app/api/sales/admin/territories/route.ts`
- **Key Features:**
  - Customer assignments
  - Territory overview
  - Delivery day routing
  - Bulk reassignment
- **Database Models:** SalesRep, CustomerAssignment
- **Migration Notes:** Admin-only feature

**7. Reporting**
- **Complexity:** High
- **Files:**
  - `/src/app/sales/reports/page.tsx`
  - `/src/app/sales/manager/page.tsx`
  - `/src/app/sales/manager/sections/*.tsx` (3 files)
  - `/src/app/api/sales/manager/dashboard/route.ts`
- **Key Features:**
  - Weekly/monthly revenue reports
  - Rep performance comparison
  - Territory health overview
  - Sample budget tracking
  - Customer acquisition metrics
- **Database Models:** RepWeeklyMetric, SalesMetric, SampleUsage
- **Migration Notes:** Complex aggregations and date ranges

### Priority 3 (Nice to Have) - COULD HAVE

**8. AI Enrichment & Copilot**
- **Complexity:** Very High
- **Files:**
  - `/src/app/portal/leora/page.tsx`
  - `/src/app/sales/leora/page.tsx`
  - `/src/app/api/portal/copilot/route.ts`
  - `/src/app/api/sales/copilot/route.ts`
  - `/src/lib/copilot/prompts.ts`
  - `/src/lib/copilot/service.ts`
- **Key Features:**
  - Natural language queries
  - Business insights
  - Revenue analysis
  - Customer recommendations
  - Streaming responses
- **Dependencies:** Anthropic Claude SDK, OpenAI API
- **Migration Notes:** May require custom backend service

**9. Call Planning**
- **Complexity:** Medium
- **Files:**
  - `/src/app/sales/call-plan/page.tsx`
  - `/src/app/sales/call-plan/sections/*.tsx` (3 files)
  - `/src/app/api/sales/call-plan/route.ts`
- **Key Features:**
  - Weekly call schedule
  - Activity planning
  - Customer visit routing
  - Call plan statistics
- **Database Models:** CallPlan, Task, Activity
- **Migration Notes:** Calendar integration

**10. Advanced Analytics**
- **Complexity:** Very High
- **Files:**
  - `/src/app/api/sales/insights/route.ts`
  - `/src/app/api/sales/insights/drilldown/route.ts`
  - `/src/lib/analytics.ts`
  - `/src/lib/analytics.test.ts`
- **Key Features:**
  - ARPDD (Average Revenue Per Delivery Day)
  - Revenue pace tracking
  - Customer health scoring
  - Cadence hotlist
  - Account signals (at-risk, due soon)
- **Migration Notes:** Core business logic, thoroughly tested

**11. Sample Management**
- **Complexity:** Medium
- **Files:**
  - `/src/app/sales/samples/page.tsx`
  - `/src/app/sales/samples/sections/*.tsx` (3 files)
  - `/src/app/api/sales/samples/*.ts` (6 files)
- **Key Features:**
  - Log sample tastings
  - Track budget usage
  - Follow-up tracking
  - Conversion tracking
- **Database Models:** SampleUsage, TenantSettings
- **Migration Notes:** Budget rules per tenant

**12. Task Management**
- **Complexity:** Medium
- **Files:**
  - `/src/app/sales/dashboard/sections/AssignedTasks.tsx`
  - `/src/app/api/sales/tasks/*.ts` (4 files)
- **Key Features:**
  - Create/assign tasks
  - Mark complete
  - Due date tracking
  - Priority levels
- **Database Models:** Task, CallPlan
- **Migration Notes:** Integration with call plans

**13. Activity Tracking**
- **Complexity:** Medium
- **Files:**
  - `/src/app/sales/activities/page.tsx`
  - `/src/app/sales/activities/sections/*.tsx` (2 files)
  - `/src/app/api/sales/activities/route.ts`
  - `/src/app/api/sales/activity-types/route.ts`
- **Key Features:**
  - Log customer interactions
  - Activity types (call, visit, email, tasting)
  - Timeline view
  - Follow-up scheduling
- **Database Models:** Activity, ActivityType
- **Migration Notes:** Activity types need seeding

**14. Admin Portal**
- **Complexity:** Very High
- **Files:**
  - `/src/app/admin/**/*.tsx` (50+ files)
  - `/src/app/api/admin/**/*.ts` (70+ files)
- **Key Features:**
  - Customer CRUD operations
  - Bulk operations
  - Inventory management
  - User management
  - Audit logs
  - Data integrity monitoring
  - Global search
- **Database Models:** All models
- **Migration Notes:** Most complex subsystem, defer to Phase 3+

---

## Section 6: File Migration Checklist

### Critical Files (Copy First)

**Database & ORM:**
- [x] `/prisma/schema.prisma` - Complete database schema
- [ ] `/src/lib/db.ts` - Prisma client singleton
- [ ] `/src/lib/prisma.test.ts` - Prisma tests

**Authentication:**
- [ ] `/src/lib/auth/session.ts` - Session management
- [ ] `/src/lib/auth/portal.ts` - Portal auth helpers
- [ ] `/src/lib/auth/sales-session.ts` - Sales session helpers
- [ ] `/src/lib/auth/cookies.ts` - Cookie handling
- [ ] `/src/middleware.ts` - Auth middleware

**Core Business Logic:**
- [ ] `/src/lib/analytics.ts` - ARPDD and metrics (500+ lines)
- [ ] `/src/lib/cart.ts` - Cart and pricing logic
- [ ] `/src/lib/orders.ts` - Order management
- [ ] `/src/lib/automation.ts` - Business automation rules
- [ ] `/src/lib/support-tickets.ts` - Support ticket system

**API Utilities:**
- [ ] `/src/lib/api/parsers.ts` - Request parsing and validation
- [ ] `/src/lib/csv-parser.ts` - CSV import utilities
- [ ] `/src/lib/csv-helper.ts` - CSV helper functions

**Configuration:**
- [ ] `/package.json` - Dependencies
- [ ] `/next.config.ts` - Next.js config
- [ ] `/tsconfig.json` - TypeScript config
- [ ] `/tailwind.config.ts` - Tailwind config (if exists)
- [ ] `/.env.local.example` - Environment variables template

### Phase 1: Customer Portal Core (Week 1-2)

**Pages:**
- [ ] `/src/app/portal/layout.tsx`
- [ ] `/src/app/portal/page.tsx`
- [ ] `/src/app/portal/catalog/page.tsx`
- [ ] `/src/app/portal/cart/page.tsx`
- [ ] `/src/app/portal/orders/page.tsx`
- [ ] `/src/app/portal/orders/[orderId]/page.tsx`

**Components:**
- [ ] `/src/app/portal/_components/PortalNav.tsx`
- [ ] `/src/app/portal/_components/CartProvider.tsx`
- [ ] `/src/app/portal/_components/ToastProvider.tsx`
- [ ] `/src/app/portal/catalog/sections/CatalogGrid.tsx`
- [ ] `/src/app/portal/orders/sections/OrdersList.tsx`

**API Routes:**
- [ ] `/src/app/api/portal/auth/login/route.ts`
- [ ] `/src/app/api/portal/auth/me/route.ts`
- [ ] `/src/app/api/portal/catalog/route.ts`
- [ ] `/src/app/api/portal/cart/route.ts`
- [ ] `/src/app/api/portal/cart/items/route.ts`
- [ ] `/src/app/api/portal/cart/checkout/route.ts`
- [ ] `/src/app/api/portal/orders/route.ts`
- [ ] `/src/app/api/portal/orders/[orderId]/route.ts`

### Phase 2: Sales Rep Portal (Week 2-3)

**Pages:**
- [ ] `/src/app/sales/layout.tsx`
- [ ] `/src/app/sales/login/page.tsx`
- [ ] `/src/app/sales/dashboard/page.tsx`
- [ ] `/src/app/sales/customers/page.tsx`
- [ ] `/src/app/sales/customers/[customerId]/page.tsx`
- [ ] `/src/app/sales/catalog/page.tsx`
- [ ] `/src/app/sales/cart/page.tsx`
- [ ] `/src/app/sales/orders/page.tsx`

**Dashboard Sections:**
- [ ] `/src/app/sales/dashboard/sections/PerformanceMetrics.tsx`
- [ ] `/src/app/sales/dashboard/sections/AssignedTasks.tsx`
- [ ] `/src/app/sales/dashboard/sections/UpcomingCalendar.tsx`
- [ ] `/src/app/sales/dashboard/sections/ProductGoals.tsx`
- [ ] `/src/app/sales/dashboard/sections/CustomerHealthSummary.tsx`

**Customer Detail Sections:**
- [ ] `/src/app/sales/customers/[customerId]/sections/CustomerHeader.tsx`
- [ ] `/src/app/sales/customers/[customerId]/sections/CustomerMetrics.tsx`
- [ ] `/src/app/sales/customers/[customerId]/sections/OrderHistory.tsx`
- [ ] `/src/app/sales/customers/[customerId]/sections/ActivityTimeline.tsx`
- [ ] `/src/app/sales/customers/[customerId]/sections/TopProducts.tsx`

**API Routes:**
- [ ] `/src/app/api/sales/dashboard/route.ts`
- [ ] `/src/app/api/sales/customers/route.ts`
- [ ] `/src/app/api/sales/customers/[customerId]/route.ts`
- [ ] `/src/app/api/sales/catalog/skus/route.ts`
- [ ] `/src/app/api/sales/cart/route.ts`
- [ ] `/src/app/api/sales/cart/checkout/route.ts`
- [ ] `/src/app/api/sales/orders/route.ts`

### Phase 3: Advanced Features (Week 3-4)

**Task Management:**
- [ ] `/src/app/sales/dashboard/sections/TasksList.tsx`
- [ ] `/src/app/api/sales/tasks/route.ts`
- [ ] `/src/app/api/sales/tasks/assigned/route.ts`
- [ ] `/src/app/api/sales/tasks/[taskId]/complete/route.ts`

**Sample Management:**
- [ ] `/src/app/sales/samples/page.tsx`
- [ ] `/src/app/sales/samples/sections/SampleBudgetTracker.tsx`
- [ ] `/src/app/sales/samples/sections/SampleUsageLog.tsx`
- [ ] `/src/app/api/sales/samples/log/route.ts`
- [ ] `/src/app/api/sales/samples/history/route.ts`
- [ ] `/src/app/api/sales/samples/budget/route.ts`

**Activity Tracking:**
- [ ] `/src/app/sales/activities/page.tsx`
- [ ] `/src/app/sales/activities/sections/ActivityForm.tsx`
- [ ] `/src/app/sales/activities/sections/ActivityList.tsx`
- [ ] `/src/app/api/sales/activities/route.ts`
- [ ] `/src/app/api/sales/activity-types/route.ts`

**Call Planning:**
- [ ] `/src/app/sales/call-plan/page.tsx`
- [ ] `/src/app/sales/call-plan/sections/WeeklyCallPlanGrid.tsx`
- [ ] `/src/app/api/sales/call-plan/route.ts`

**Reporting:**
- [ ] `/src/app/sales/manager/page.tsx`
- [ ] `/src/app/sales/manager/sections/AllRepsPerformance.tsx`
- [ ] `/src/app/sales/manager/sections/TerritoryHealthOverview.tsx`
- [ ] `/src/app/api/sales/manager/dashboard/route.ts`

### Phase 4: AI & Admin (Week 4-6)

**AI Copilot:**
- [ ] `/src/app/portal/leora/page.tsx`
- [ ] `/src/app/sales/leora/page.tsx`
- [ ] `/src/app/api/portal/copilot/route.ts`
- [ ] `/src/app/api/sales/copilot/route.ts`
- [ ] `/src/lib/copilot/prompts.ts`
- [ ] `/src/lib/copilot/service.ts`

**Admin Portal (70+ files):**
- [ ] `/src/app/admin/layout.tsx`
- [ ] `/src/app/admin/page.tsx`
- [ ] `/src/app/admin/customers/**/*.tsx`
- [ ] `/src/app/admin/accounts/**/*.tsx`
- [ ] `/src/app/admin/inventory/**/*.tsx`
- [ ] `/src/app/admin/audit-logs/**/*.tsx`
- [ ] `/src/app/admin/components/*.tsx`
- [ ] `/src/app/api/admin/**/*.ts`

### Database Migration Files

**Seed Scripts:**
- [ ] `/src/scripts/seed-well-crafted.ts`
- [ ] `/src/scripts/seed-portal-demo.ts`
- [ ] `/src/scripts/seed-activity-types.ts`
- [ ] `/src/scripts/verify-activity-types.ts`

**Utility Scripts:**
- [ ] `/src/scripts/check-schema.ts`
- [ ] `/src/scripts/import-invoices.ts`
- [ ] `/src/scripts/audit-seed.ts`

**Background Jobs:**
- [ ] `/src/jobs/run.ts`
- [ ] `/src/jobs/supabase-replay.ts`
- [ ] `/src/jobs/customer-health-assessment.ts`
- [ ] `/src/jobs/weekly-metrics-aggregation.ts`
- [ ] `/src/lib/jobs/data-integrity-check.ts`

### Test Files (Migrate Last)

- [ ] `/src/lib/analytics.test.ts`
- [ ] `/src/lib/cart.test.ts`
- [ ] `/src/lib/prisma.test.ts`
- [ ] `/src/lib/api/parsers.test.ts`
- [ ] `/src/app/api/portal/addresses/route.test.ts`
- [ ] `/vitest.config.ts`

---

## Section 7: Third-Party Integrations & Dependencies

### Core Dependencies

**React & Next.js:**
- `next@15.5.5` - App Router, Server Components, API Routes
- `react@19.1.0` - Latest React features
- `react-dom@19.1.0` - React DOM

**Database & ORM:**
- `@prisma/client@6.17.1` - Prisma ORM client
- `prisma@6.17.1` - Prisma CLI and migrations
- `@supabase/supabase-js@2.75.1` - Supabase client
- `pg@8.16.3` - PostgreSQL driver (dev)
- `supabase@2.51.0` - Supabase CLI (dev)

**Authentication & Security:**
- `bcryptjs@3.0.2` - Password hashing
- `@types/bcryptjs@2.4.6` - TypeScript types

**AI & ML:**
- `@anthropic-ai/sdk@0.67.0` - Claude AI integration
- OpenAI API (via REST, no SDK in package.json)

**Data Processing:**
- `csv-parse@6.1.0` - CSV parsing for imports
- `date-fns@4.1.0` - Date manipulation
- `zod@4.1.12` - Schema validation

**UI & Styling:**
- `tailwindcss@4` - CSS framework
- `@tailwindcss/postcss@4` - PostCSS plugin
- `postcss.config.mjs` - PostCSS configuration
- `lucide-react@0.546.0` - Icon library
- `sonner@2.0.7` - Toast notifications

**Development Tools:**
- `typescript@5` - TypeScript compiler
- `eslint@9` - Linting
- `eslint-config-next@15.5.5` - Next.js ESLint rules
- `eslint-config-prettier@10.1.8` - Prettier integration
- `prettier@3.6.2` - Code formatting
- `vitest@2.1.9` - Testing framework
- `tsx@4.20.6` - TypeScript execution (scripts)

### Environment Variables Required

**Database:**
- `DATABASE_URL` - PostgreSQL connection string (Prisma)
- `SHADOW_DATABASE_URL` - Shadow database for migrations
- `DIRECT_URL` - Direct database connection (Supabase)

**Supabase:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin service role key

**Application:**
- `DEFAULT_TENANT_SLUG` - Default tenant (e.g., "well-crafted")

**AI Services:**
- `OPENAI_API_KEY` - OpenAI API key for Copilot
- `OPENAI_API_URL` - OpenAI API endpoint (optional, defaults to OpenAI)
- `COPILOT_MODEL` - Model name (e.g., "gpt-4.1-mini")

**Webhooks (Optional):**
- `SUPPORT_ALERT_WEBHOOK` - Webhook for support ticket alerts
- `REPLAY_ALERT_WEBHOOK` - Webhook for replay job failures
- `REPLAY_ALERT_THRESHOLD_MINUTES` - Alert threshold (default: 120)

### External Services

**Supabase (Required):**
- PostgreSQL database hosting
- Real-time subscriptions (if used)
- Authentication (currently using custom JWT)
- Storage (if file uploads added)

**Anthropic Claude (Optional):**
- AI Copilot feature
- Natural language queries
- Business insights
- Requires API key

**OpenAI (Optional):**
- Alternative to Claude
- Copilot implementation
- Requires API key

**Webhook Endpoints (Optional):**
- Slack/Teams integration
- Support ticket alerts
- Job failure notifications

### Migration Notes for Integrations

**Prisma:**
- Lovable may not support Prisma directly
- Need to migrate to Lovable's database layer
- Consider using Supabase client instead
- Schema needs manual conversion

**Supabase:**
- Lovable has built-in Supabase support
- Should be straightforward migration
- Use Supabase client for queries
- Maintain existing database

**AI Integration:**
- Anthropic SDK may not be available in Lovable
- May need to use REST API directly
- Consider server-side proxy for API keys
- Streaming responses might need custom implementation

**Authentication:**
- Current system uses custom JWT + refresh tokens
- May need to adapt to Lovable's auth system
- Role-based access control needs preservation
- Session management critical for multi-tenant

---

## Section 8: Migration Strategy & Recommendations

### Phased Migration Approach

**Phase 1: Foundation (Week 1-2)**
- Set up Lovable project
- Migrate Prisma schema to Supabase
- Implement authentication (Portal + Sales)
- Migrate core business logic libraries (`analytics.ts`, `cart.ts`, `orders.ts`)
- Test database connections and queries

**Phase 2: Customer Portal (Week 2-3)**
- Migrate catalog pages
- Implement shopping cart
- Build order submission flow
- Add order history view
- Basic dashboard with metrics

**Phase 3: Sales Rep Portal (Week 3-4)**
- Sales dashboard with performance metrics
- Customer list and detail pages
- Order creation on behalf of customers
- Basic task management
- Calendar integration

**Phase 4: Advanced Sales Features (Week 4-5)**
- Sample management
- Activity tracking
- Call planning
- Advanced reporting
- Territory management

**Phase 5: AI & Admin (Week 5-6)**
- AI Copilot integration (if feasible)
- Admin portal foundation
- Customer management
- User management
- Audit logs

**Phase 6: Polish & Optimization (Week 6-8)**
- UI refinements
- Performance optimization
- Testing and bug fixes
- Documentation
- Deployment preparation

### Technical Challenges

**1. Prisma to Lovable Database Migration**
- **Challenge:** Lovable may not support Prisma ORM
- **Solution:**
  - Use Supabase client directly
  - Migrate complex queries to SQL
  - Implement data access layer abstraction
  - Test all queries thoroughly

**2. API Routes Migration**
- **Challenge:** 100+ API routes to migrate
- **Solution:**
  - Prioritize by feature phase
  - Consolidate similar endpoints
  - Use Lovable's backend capabilities
  - Maintain RESTful patterns

**3. AI Integration**
- **Challenge:** Anthropic SDK may not be available
- **Solution:**
  - Use REST API directly with fetch/axios
  - Implement server-side proxy for API keys
  - Handle streaming responses manually
  - Consider serverless functions

**4. Multi-Tenant Architecture**
- **Challenge:** Maintaining tenant isolation
- **Solution:**
  - Middleware for tenant extraction
  - All queries filtered by tenantId
  - Session management per tenant
  - Test cross-tenant access prevention

**5. Complex Analytics**
- **Challenge:** ARPDD and health metrics have complex logic
- **Solution:**
  - Port `/src/lib/analytics.ts` carefully (500+ lines)
  - Write unit tests for all calculations
  - Use database views for common aggregations
  - Consider materialized views for performance

**6. Background Jobs**
- **Challenge:** Weekly metrics, health assessments, data integrity
- **Solution:**
  - Use Lovable's scheduled functions (if available)
  - Implement cron endpoints
  - Use Supabase Edge Functions
  - Set up external cron service (GitHub Actions, etc.)

### Lovable-Specific Considerations

**Database:**
- Use Supabase PostgreSQL directly
- Leverage Row Level Security (RLS) for tenant isolation
- Use Supabase Realtime for live updates (if needed)
- Consider database views for complex queries

**Authentication:**
- Adapt to Lovable's auth system
- Maintain role-based access control
- Preserve session management
- Multi-tenant support critical

**UI Components:**
- Lovable supports Tailwind CSS (good fit)
- Use Lovable's component library where possible
- Inline shadcn-style components (current approach)
- Lucide React for icons (should work)

**File Structure:**
- Adapt to Lovable's preferred structure
- May need to flatten nested sections
- Group related components
- Keep business logic separate

**Third-Party Libraries:**
- Verify Lovable supports all dependencies
- Find alternatives if needed:
  - `date-fns` → native Date or Lovable's date lib
  - `csv-parse` → manual CSV parsing
  - `zod` → custom validation (if not supported)

### Testing Strategy

**Unit Tests:**
- Migrate critical test files first
- `/src/lib/analytics.test.ts` - Core metrics
- `/src/lib/cart.test.ts` - Pricing logic
- `/src/lib/api/parsers.test.ts` - Request validation

**Integration Tests:**
- Test API endpoints one by one
- Verify database operations
- Test authentication flows
- Validate multi-tenant isolation

**Manual Testing Checklist:**
- [ ] Portal user can login
- [ ] Portal user can browse catalog
- [ ] Portal user can add to cart
- [ ] Portal user can submit order
- [ ] Portal user sees order history
- [ ] Sales rep can login
- [ ] Sales rep sees dashboard metrics
- [ ] Sales rep can view customer list
- [ ] Sales rep can view customer detail
- [ ] Sales rep can create order for customer
- [ ] Sales rep can log sample usage
- [ ] Sales rep can log activity
- [ ] Sales rep can manage tasks
- [ ] Admin can manage customers
- [ ] Admin can view audit logs
- [ ] AI Copilot responds to queries (if implemented)

### Data Migration

**Database Export:**
```bash
# Export from existing Supabase
pg_dump -h <host> -U postgres -d leora > leora_backup.sql

# Import to new Supabase
psql -h <new-host> -U postgres -d leora < leora_backup.sql
```

**Seed Data:**
```bash
# Run seed scripts in order
npm run seed:well-crafted
npm run seed:portal-demo
npm run seed:activity-types
npm run verify:activity-types
```

**Data Integrity:**
- Run data integrity checks post-migration
- Verify all foreign key relationships
- Check for orphaned records
- Validate tenant isolation

---

## Section 9: Top 10 Priority Files to Migrate First

### 1. `/prisma/schema.prisma` (1,070 lines)
**Why:** Foundation of entire application
**Complexity:** Very High
**Dependencies:** None
**Action:** Migrate to Supabase schema or Lovable database layer
**Notes:** 70+ models, complex relationships, critical for all features

### 2. `/src/lib/db.ts` (12 lines)
**Why:** Database connection singleton
**Complexity:** Low
**Dependencies:** Prisma
**Action:** Adapt to Lovable's database client
**Notes:** Simple but used everywhere

### 3. `/src/lib/analytics.ts` (500+ lines estimated)
**Why:** Core business logic for ARPDD, health metrics, revenue tracking
**Complexity:** Very High
**Dependencies:** Prisma, date-fns
**Action:** Port carefully with comprehensive testing
**Notes:** Critical calculations, well-tested, used by all dashboards

### 4. `/src/lib/cart.ts` (estimated 300+ lines)
**Why:** Shopping cart and pricing logic
**Complexity:** High
**Dependencies:** Prisma
**Action:** Migrate with cart.test.ts for validation
**Notes:** Pricing rules, minimum orders, critical for orders

### 5. `/src/lib/auth/session.ts` + `/src/lib/auth/portal.ts` + `/src/lib/auth/sales-session.ts`
**Why:** Authentication and authorization
**Complexity:** High
**Dependencies:** Prisma, bcryptjs, Next.js
**Action:** Adapt to Lovable's auth system while preserving RBAC
**Notes:** Multi-tenant, role-based, session management critical

### 6. `/src/app/sales/dashboard/page.tsx` + sections
**Why:** Most important sales rep interface
**Complexity:** High
**Dependencies:** All business logic, analytics, tasks, calendar
**Action:** Migrate after analytics.ts is working
**Notes:** 10+ section components, heavily used feature

### 7. `/src/app/api/sales/dashboard/route.ts`
**Why:** Powers sales dashboard with metrics
**Complexity:** High
**Dependencies:** Auth, analytics, Prisma
**Action:** Migrate to Lovable API structure
**Notes:** Aggregates data from multiple sources

### 8. `/src/app/sales/customers/[customerId]/page.tsx` + sections
**Why:** Core customer detail view
**Complexity:** Very High
**Dependencies:** Customer data, orders, activities, samples, analytics
**Action:** Migrate in stages, one section at a time
**Notes:** 9+ section components, complex data requirements

### 9. `/src/app/api/portal/catalog/route.ts` + `/src/app/portal/catalog/page.tsx`
**Why:** Product catalog is entry point for orders
**Complexity:** Medium
**Dependencies:** Products, SKUs, inventory, pricing
**Action:** Migrate early for portal functionality
**Notes:** Relatively self-contained, good starting feature

### 10. `/src/lib/orders.ts` + order API routes
**Why:** Order management logic
**Complexity:** High
**Dependencies:** Cart, Prisma, audit logging
**Action:** Migrate after cart.ts
**Notes:** Order creation, status updates, invoice generation

---

## Section 10: Migration Execution Plan

### Week-by-Week Breakdown

**Week 1: Database & Authentication**
- Day 1-2: Migrate Prisma schema to Supabase
- Day 3-4: Set up authentication (portal + sales)
- Day 5: Migrate `analytics.ts`, `cart.ts`, `orders.ts`
- Day 6-7: Testing and validation

**Week 2: Customer Portal**
- Day 1-2: Catalog page + API
- Day 3: Cart page + cart API
- Day 4: Order submission + checkout
- Day 5: Order history page
- Day 6-7: Testing and bug fixes

**Week 3: Sales Dashboard**
- Day 1-2: Sales dashboard page + API
- Day 3: Dashboard sections (metrics, tasks, calendar)
- Day 4-5: Customer list + customer detail
- Day 6-7: Order creation for customers

**Week 4: Sales Advanced**
- Day 1: Sample management
- Day 2: Activity tracking
- Day 3: Task management
- Day 4: Call planning
- Day 5-7: Testing and refinements

**Week 5-6: Admin & Polish**
- Week 5: Admin portal foundation, customer management
- Week 6: AI Copilot (if feasible), polish, optimization

**Week 7-8: Testing & Deployment**
- Comprehensive testing
- Performance optimization
- Documentation
- Deployment to production

### Success Metrics

**Functionality:**
- [ ] All Priority 1 features working
- [ ] All Priority 2 features working
- [ ] At least 50% of Priority 3 features

**Performance:**
- [ ] Page load times < 2 seconds
- [ ] API response times < 500ms (p95)
- [ ] Database queries optimized with indexes

**Quality:**
- [ ] No critical bugs
- [ ] All unit tests passing
- [ ] Manual testing checklist 100% complete

**User Experience:**
- [ ] UI matches original design
- [ ] Responsive on mobile/tablet
- [ ] Accessibility standards met
- [ ] Error handling and loading states

---

## Section 11: Risk Assessment & Mitigation

### High Risk Areas

**1. Database Migration**
- **Risk:** Data loss or corruption during migration
- **Mitigation:**
  - Full backup before migration
  - Test migration on staging first
  - Validate data integrity post-migration
  - Rollback plan

**2. Analytics Accuracy**
- **Risk:** Incorrect ARPDD or revenue calculations
- **Mitigation:**
  - Migrate `analytics.test.ts` first
  - Compare results with original system
  - Manual validation of key metrics
  - Gradual rollout with parallel systems

**3. Multi-Tenant Isolation**
- **Risk:** Cross-tenant data leakage
- **Mitigation:**
  - Comprehensive testing of tenant filtering
  - Security audit of all queries
  - Row-level security in Supabase
  - Automated tests for isolation

**4. AI Integration**
- **Risk:** Copilot feature may not work in Lovable
- **Mitigation:**
  - Treat as optional feature
  - Defer to Phase 6
  - Consider external service
  - Fallback to manual insights

**5. Performance Degradation**
- **Risk:** Slower queries without Prisma optimizations
- **Mitigation:**
  - Database indexes migration
  - Query optimization
  - Caching strategy
  - Load testing before launch

### Medium Risk Areas

**1. Third-Party Dependencies**
- Some npm packages may not work in Lovable
- Find alternatives or implement custom solutions
- Test all dependencies early

**2. Background Jobs**
- Weekly metrics, health assessments need scheduling
- Use Supabase Edge Functions or external cron
- Test job execution reliability

**3. Complex UI Components**
- Admin portal has 50+ components
- May need simplification for Lovable
- Prioritize functionality over polish

### Low Risk Areas

**1. Static Pages**
- Login pages, layouts - straightforward migration
- Low dependency on business logic
- Easy to test

**2. Simple CRUD Operations**
- Customer list, product list - standard patterns
- Well-understood migration path
- Low complexity

---

## Section 12: Post-Migration Tasks

**Documentation:**
- [ ] Update README with Lovable-specific instructions
- [ ] Document any architectural changes
- [ ] Create user guides for new features
- [ ] API documentation updates

**Optimization:**
- [ ] Database query performance tuning
- [ ] Frontend bundle size optimization
- [ ] Image optimization
- [ ] Caching strategy implementation

**Monitoring:**
- [ ] Set up error tracking (Sentry or similar)
- [ ] Performance monitoring (if available in Lovable)
- [ ] Database query monitoring
- [ ] User analytics

**Training:**
- [ ] Sales rep training on new system
- [ ] Customer training on portal changes
- [ ] Admin training on new features

**Maintenance:**
- [ ] Regular database backups
- [ ] Scheduled job monitoring
- [ ] Security updates
- [ ] Performance reviews

---

## Appendix A: Complete File Inventory

**Total Files:** 200+ TypeScript/TSX files

**Breakdown:**
- API Routes: ~100 files
- Page Components: ~50 files
- Section Components: ~40 files
- Library Files: ~30 files
- Scripts: ~10 files
- Tests: ~10 files
- Configuration: ~10 files

**See full file tree in project repository**

---

## Appendix B: Database Schema Diagram

```
[See Prisma schema file for complete details]

Key Tables:
- Tenant (1) → Users (N)
- Tenant (1) → Customers (N)
- Customer (1) → Orders (N)
- Order (1) → OrderLines (N)
- Order (1) → Invoices (N)
- SalesRep (1) → Customers (N)
- SalesRep (1) → SampleUsage (N)
- Product (1) → SKUs (N)
- SKU (1) → Inventory (N)
```

---

## Appendix C: Environment Variables Checklist

```bash
# Required
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://..."
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
DEFAULT_TENANT_SLUG="well-crafted"

# Optional (AI)
OPENAI_API_KEY="sk-..."
COPILOT_MODEL="gpt-4.1-mini"

# Optional (Webhooks)
SUPPORT_ALERT_WEBHOOK="https://..."
REPLAY_ALERT_WEBHOOK="https://..."
```

---

## Appendix D: Key Business Rules

**ARPDD Calculation:**
- Average Revenue Per Delivery Day
- Critical metric for portal dashboard
- Complex date range and aggregation logic
- See `/src/lib/analytics.ts` for implementation

**Customer Health Scoring:**
- Revenue trend analysis
- Ordering cadence tracking
- Risk status calculation (HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT, CLOSED)
- Automated alerts for at-risk accounts

**Sample Budget Rules:**
- Default: 60 samples per month per rep
- Configurable per tenant in TenantSettings
- Configurable per rep in SalesRep
- Budget tracking and alerts

**Pricing Rules:**
- Multi-tier price lists
- Effective date ranges
- Minimum/maximum quantities
- Customer-specific pricing

**Order Validation:**
- Minimum order requirements
- Inventory availability
- Customer credit holds
- Pricing calculations

---

**End of Migration Plan**

---

*This migration plan was generated automatically by analyzing the Leora Portal codebase. For questions or updates, please contact the development team.*
