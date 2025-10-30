# 🎯 Complete Database Information for Lovable

**Copy this entire message to Lovable to set up the full database schema**

---

## 📊 Database Overview

Your wine distribution CRM has a comprehensive PostgreSQL schema with:

- **48 Tables** (complete business domain)
- **10 ENUMs** (status types, roles, etc.)
- **90+ Relationships** (foreign keys with proper cascading)
- **95+ Indexes** (optimized for multi-tenant queries)
- **Multi-tenant architecture** (all data scoped by tenant_id)
- **1,879 Products** (wines with professional tasting notes)

---

## 📋 Complete Table List

### Core Multi-Tenancy (3 tables)
1. **Tenant** - Organization/company accounts
2. **TenantSettings** - Per-tenant configuration
3. **IntegrationToken** - Third-party API integrations

### Users & Authentication (8 tables)
4. **User** - Internal users (sales reps, admins)
5. **UserRole** - User role assignments
6. **Role** - Role definitions with permissions
7. **Permission** - Permission catalog
8. **RolePermission** - Role-permission mapping
9. **PortalUser** - Customer portal users
10. **PortalUserRole** - Portal user roles
11. **PortalSession** - Portal authentication sessions
12. **SalesSession** - Sales rep authentication sessions

### Products & Inventory (5 tables)
13. **Product** - Wine products with enrichment data
14. **Sku** - Product variants (sizes, formats)
15. **Supplier** - Wine suppliers/distributors
16. **Inventory** - Stock levels by location
17. **PriceList** - Pricing tiers
18. **PriceListItem** - SKU prices with quantity breaks

### Customers (3 tables)
19. **Customer** - Customer accounts with health metrics
20. **CustomerAddress** - Multiple addresses per customer
21. **CustomerAssignment** - Sales rep territory assignments

### Orders & Invoicing (6 tables)
22. **Order** - Customer orders
23. **OrderLine** - Order line items
24. **Invoice** - Invoices generated from orders
25. **Payment** - Payment tracking
26. **Cart** - Shopping carts
27. **CartItem** - Cart line items

### Activities & Tasks (4 tables)
28. **Activity** - Customer interactions (calls, visits, emails)
29. **ActivityType** - Activity categories
30. **Task** - Task management
31. **CallPlan** - Call planning schedules

### Sales Rep Management (7 tables)
32. **SalesRep** - Sales representative profiles
33. **RepWeeklyMetric** - Weekly performance tracking
34. **RepProductGoal** - Product-specific targets
35. **SampleUsage** - Sample tracking
36. **TopProduct** - Top-selling products by period
37. **SalesIncentive** - Sales incentive programs
38. **CalendarEvent** - Calendar/scheduling

### Analytics (3 tables)
39. **AccountHealthSnapshot** - Customer health history
40. **SalesMetric** - Sales analytics by period
41. **DataIntegritySnapshot** - Data quality tracking

### Compliance & Tax (3 tables)
42. **ComplianceFiling** - State compliance filings
43. **StateCompliance** - State-specific rules
44. **StateTaxRate** - Tax rates by state

### Integrations & Notifications (4 tables)
45. **WebhookSubscription** - Webhook endpoints
46. **WebhookEvent** - Webhook event queue
47. **WebhookDelivery** - Webhook delivery tracking
48. **PortalNotification** - Customer notifications

### System (1 table)
49. **AuditLog** - Complete audit trail

---

## 🔐 ENUMs (Status Types)

```sql
-- User & Customer Status
PortalUserStatus: ACTIVE, INVITED, DISABLED
CustomerRiskStatus: HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT, CLOSED

-- Order & Invoice Status
OrderStatus: DRAFT, SUBMITTED, FULFILLED, CANCELLED, PARTIALLY_FULFILLED
InvoiceStatus: DRAFT, SENT, PAID, OVERDUE, VOID
CartStatus: ACTIVE, SUBMITTED, ABANDONED

-- Task Management
TaskStatus: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
TaskPriority: LOW, MEDIUM, HIGH

-- Activity & Compliance
ActivityOutcome: PENDING, SUCCESS, FAILED, NO_RESPONSE
ComplianceStatus: PENDING, IN_PROGRESS, SUBMITTED, ACCEPTED, REJECTED
WebhookStatus: PENDING, SUCCESS, FAILED, RETRYING
```

---

## 🍷 Special Wine Product Fields

The **Product** table includes professional wine enrichment data (JSON fields):

### **tastingNotes** (JSONB)
```json
{
  "aroma": "The nose bursts with immense vibrancy...",
  "palate": "On the palate, this Chenin Blanc truly zings...",
  "finish": "The finish is fresh and balanced..."
}
```

### **foodPairings** (JSONB Array)
```json
[
  "Grilled prawns with lemon butter",
  "Thai green curry with chicken",
  "Fresh oysters on the half shell",
  "Roasted pork tenderloin with apple compote",
  "Goat cheese salad with citrus vinaigrette"
]
```

### **servingInfo** (JSONB)
```json
{
  "temperature": "8-10°C (46-50°F)",
  "decanting": "Not required; serve directly from the bottle",
  "glassware": "Standard white wine glass or tulip-shaped glass"
}
```

### **wineDetails** (JSONB)
```json
{
  "region": "Swartland, Western Cape, South Africa",
  "grapeVariety": "100% Chenin Blanc from unirrigated old bush vines",
  "vintage": "2024",
  "style": "Full-bodied, fruit-forward dry white wine",
  "ageability": "Drink now through 2026; best consumed young for freshness"
}
```

**All 1,879 products have complete professional enrichment data ready to display!**

---

## 🗂️ Files to Copy to Lovable

### **1. Complete SQL Schema**
**File:** `/Users/greghogue/Leora2/LOVABLE_DATABASE_SCHEMA.sql` (43KB)

**What to do:**
1. Copy the entire SQL file
2. In Lovable, go to Database → SQL Editor
3. Paste and execute the entire script
4. This creates all 48 tables, enums, relationships, indexes, and RLS policies

### **2. Database Documentation**
**File:** `/Users/greghogue/Leora2/LOVABLE_DATABASE_README.md` (16KB)

**Contains:**
- Table purposes and relationships
- Sample queries for common operations
- Migration checklist
- Troubleshooting guide

---

## 🔑 Key Relationships

### Customer → Orders → Invoices
```
Customer (1) → (many) Order
Order (1) → (many) OrderLine
Order (1) → (many) Invoice
Invoice (1) → (many) Payment
```

### Products → SKUs → Pricing
```
Product (1) → (many) Sku
Sku (1) → (many) PriceListItem
Sku (1) → (many) Inventory (by location)
```

### Sales Rep → Customers → Activities
```
SalesRep (1) → (many) Customer
SalesRep (1) → (many) Activity
Customer (1) → (many) Activity
Customer (1) → (many) Task
```

### Multi-Tenant Hierarchy
```
Tenant (1) → (many) User
Tenant (1) → (many) PortalUser
Tenant (1) → (many) Customer
Tenant (1) → (many) Product
Tenant (1) → (many) Order
... (all tables scoped by tenant)
```

---

## 🎯 Critical Business Logic Fields

### **Customer Health Tracking:**
- `riskStatus` - HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT, CLOSED
- `orderingPaceDays` - Expected days between orders
- `averageOrderIntervalDays` - Actual ordering frequency
- `lastOrderDate` - Last order placed
- `nextExpectedOrderDate` - Calculated next order date
- `establishedRevenue` - Baseline revenue for comparison

### **Sales Rep Quotas:**
- `weeklyRevenueQuota` - Weekly revenue target
- `monthlyRevenueQuota` - Monthly revenue target
- `quarterlyRevenueQuota` - Quarterly revenue target
- `annualRevenueQuota` - Annual revenue target
- `weeklyCustomerQuota` - Weekly customer contact target
- `sampleAllowancePerMonth` - Sample budget (bottles/month)

### **Order Workflow:**
- `status` - DRAFT → SUBMITTED → FULFILLED → CANCELLED
- `orderedAt` - When order placed
- `fulfilledAt` - When order fulfilled
- `deliveredAt` - When order delivered
- `deliveryWeek` - Week number for routing
- `isFirstOrder` - Flag for first-time customers

---

## 🔄 Migration Steps for Lovable

### **Step 1: Copy SQL Schema**
```
Go to Lovable → Database → SQL Editor
Paste the contents of LOVABLE_DATABASE_SCHEMA.sql
Click "Run" to create all tables
```

### **Step 2: Verify Tables Created**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Should show 48 tables.

### **Step 3: Test Multi-Tenant Filtering**
```sql
-- Create test tenant
INSERT INTO "Tenant" (id, slug, name)
VALUES (gen_random_uuid(), 'demo', 'Demo Company')
RETURNING *;
```

### **Step 4: Configure RLS Policies**
All RLS policies are already included in the schema. They automatically filter by:
- Current user's tenant_id
- User role permissions
- Multi-tenant isolation

### **Step 5: Seed Initial Data** (Optional)
```sql
-- Create default roles
INSERT INTO "Permission" (id, code, name) VALUES
  (gen_random_uuid(), 'customer.view', 'View Customers'),
  (gen_random_uuid(), 'customer.edit', 'Edit Customers'),
  (gen_random_uuid(), 'order.create', 'Create Orders'),
  (gen_random_uuid(), 'product.edit', 'Edit Products');
```

---

## 📈 Performance Optimizations

### **Indexed Fields:**
- All foreign keys
- `tenant_id` on every table
- `created_at` for time-series queries
- Status fields (`risk_status`, `status`, etc.)
- Common search fields (email, name, account_number)

### **Compound Indexes:**
- `[tenant_id, customer_id]` for customer queries
- `[tenant_id, sales_rep_id]` for territory queries
- `[tenant_id, delivered_at]` for revenue analytics
- `[week_start_date, sales_rep_id]` for metrics

---

## 🎨 Sample Queries Included

The README includes ready-to-use queries for:

1. **Get all customers for a sales rep**
2. **Calculate ARPDD (Average Revenue Per Delivery Day)**
3. **Find at-risk customers**
4. **Get customer order history**
5. **Calculate weekly sales metrics**
6. **Get inventory by location**
7. **Find top products by revenue**
8. **Track sample usage**
9. **Get pending tasks**
10. **Generate invoice data**

---

## 🔐 Security Features

### **Row Level Security (RLS):**
- Every table has `tenant_id` isolation
- Users can only access their tenant's data
- Role-based permissions enforced at database level
- Helper functions for permission checking

### **Audit Trail:**
- All changes logged to `AuditLog` table
- Before/after values tracked
- User and timestamp recorded
- Metadata for additional context

### **Data Integrity:**
- Foreign key constraints enforce relationships
- Unique constraints prevent duplicates
- Check constraints validate data
- Triggers maintain calculated fields

---

## 📦 What Lovable Gets

When you paste the SQL schema into Lovable, you'll have:

✅ **Complete wine distribution CRM database**
✅ **1,879 products ready to import** (with professional tasting notes)
✅ **Multi-tenant architecture** (support multiple companies)
✅ **Customer health tracking** (proactive churn prevention)
✅ **ARPDD analytics** (revenue efficiency metrics)
✅ **Shopping cart system** (with quantity-based pricing)
✅ **Order workflow** (draft → submitted → fulfilled)
✅ **Invoice management** (automated from orders)
✅ **Sales rep territories** (quota tracking)
✅ **Task management** (call plans and follow-ups)
✅ **Activity tracking** (customer interactions)
✅ **Sample tracking** (wine sample management)
✅ **Compliance** (state-specific tax and regulations)
✅ **Webhook system** (integration events)
✅ **Audit logging** (complete change history)

---

## 🚀 Copy This to Lovable

```
I have the complete database schema ready to migrate! Here's what I need to set up:

SCHEMA OVERVIEW:
• 48 tables with full wine distribution CRM functionality
• 10 ENUMs for status types
• Multi-tenant architecture with RLS policies
• 1,879 wine products with professional tasting notes

CORE TABLES:
• Tenant, User, PortalUser (multi-tenant auth)
• Customer (with health tracking: HEALTHY, AT_RISK, DORMANT)
• Product, Sku, Inventory (wine catalog with enrichment)
• Order, OrderLine, Invoice, Payment (complete order workflow)
• SalesRep (territories, quotas, performance)
• Task, Activity, CallPlan (sales management)
• Analytics tables (health snapshots, metrics)

SPECIAL FEATURES:
• Customer risk scoring (AT_RISK_CADENCE, AT_RISK_REVENUE)
• ARPDD calculations (Average Revenue Per Delivery Day)
• Wine enrichment (tastingNotes, foodPairings, servingInfo as JSONB)
• Sample tracking and quota management
• State tax and compliance
• Webhook integrations
• Complete audit trail

I have the complete SQL schema file ready. Should I:
1. Paste the entire SQL schema now? (creates all 48 tables)
2. Go table-by-table for review?
3. Start with core tables first, then add advanced features?

The schema file is at: /Users/greghogue/Leora2/LOVABLE_DATABASE_SCHEMA.sql (43KB)
Documentation at: /Users/greghogue/Leora2/LOVABLE_DATABASE_README.md (16KB)

Which approach would you prefer?
```

---

## 📁 Files Ready for Lovable

### **1. Complete SQL Schema** ✅
**Location:** `/Users/greghogue/Leora2/LOVABLE_DATABASE_SCHEMA.sql`
**Size:** 43KB
**Contents:** All 48 tables with enums, indexes, RLS, triggers

### **2. Database Documentation** ✅
**Location:** `/Users/greghogue/Leora2/LOVABLE_DATABASE_README.md`
**Size:** 16KB
**Contents:** Table descriptions, relationships, sample queries

### **3. Migration Instructions** ✅
**Location:** `/Users/greghogue/Leora2/LOVABLE_MIGRATION_INSTRUCTIONS.md`
**Contents:** Step-by-step porting guide for code

### **4. Migrated Components** ✅
**Location:** `https://github.com/ghogue02/biz-buddy-shell` (commit f0a953d)
**Contents:** All React components ready to use (5,997 lines)

---

## ✅ What Lovable Already Has

According to your conversation with Lovable, they've already created:
- ✅ 8 basic tables (simplified version)
- ✅ RLS policies for multi-tenancy
- ✅ Auth integration with Supabase
- ✅ Basic CRM pages

**What you need to give them:**
- The COMPLETE 48-table schema (to replace/extend the 8 tables)
- Or confirm if they should keep their simplified version and just add missing tables

---

## 🎯 Recommended Next Steps

### **Option A: Full Migration (Recommended)**
1. Share the complete SQL schema file with Lovable
2. They execute it to create all 48 tables
3. Import your existing data (1,879 products + customers)
4. Full CRM functionality immediately available

### **Option B: Incremental Migration**
1. Keep Lovable's current 8 tables
2. Add missing tables one priority group at a time
3. Test each group before adding more

---

## 📊 Data Ready to Import

You have production data ready:
- **1,879 wine products** - All with professional tasting notes
- **Customer data** - From your existing database
- **Order history** - Historical orders
- **User accounts** - Sales reps and portal users

**All this data can be imported once the schema is in place!**

---

## 💡 Quick Decision Guide

**Tell Lovable:**

**If they ask "Should we replace the 8 tables with your 48?"**
→ YES - "Please use the complete 48-table schema. It includes everything needed for the wine CRM."

**If they ask "Should we keep it simple with 8 tables?"**
→ NO - "We need all 48 tables for the full business functionality (analytics, sales rep management, compliance, etc.)"

**If they ask "What's the priority?"**
→ "Core tables first: Tenant, User, PortalUser, Customer, Product, Sku, Order, OrderLine, Invoice, SalesRep"

---

**Everything is ready! Just share the SQL schema file with Lovable and they can create the complete database in minutes.** 🚀
