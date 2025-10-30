# Lovable Database Schema Documentation

## Overview

This database schema represents a comprehensive **multi-tenant wine distribution and sales management system** with 48 interconnected tables supporting:

- Multi-tenant architecture (complete data isolation)
- Product catalog and inventory management
- Customer relationship management (CRM)
- Order processing and invoicing
- Sales rep territory management
- Customer portal access
- Analytics and compliance reporting
- Webhook integrations

---

## Table Statistics

- **Total Tables**: 48
- **Enums**: 10
- **Foreign Key Relationships**: 90+
- **Indexes**: 95+
- **RLS Policies**: Enabled on all tenant-scoped tables

---

## Core Table Categories

### 1. Multi-Tenancy & Configuration (3 tables)
- `tenants` - Root tenant organization
- `tenant_settings` - Per-tenant configuration
- `roles` - Tenant-specific role definitions

### 2. Users & Authentication (8 tables)
- `users` - Internal staff users
- `user_roles` - User role assignments
- `portal_users` - Customer portal users
- `portal_user_roles` - Portal user role assignments
- `portal_sessions` - Portal authentication sessions
- `sales_sessions` - Sales user sessions
- `permissions` - System permissions
- `role_permissions` - Role-permission mappings

### 3. Products & Inventory (5 tables)
- `suppliers` - Product suppliers
- `products` - Wine product catalog
- `skus` - Stock keeping units (product variants)
- `inventories` - Inventory by location
- `price_lists` & `price_list_items` - Pricing management

### 4. Customers (3 tables)
- `customers` - Customer accounts
- `customer_addresses` - Shipping/billing addresses
- Customer fields include risk scoring and dormancy tracking

### 5. Orders & Invoicing (6 tables)
- `orders` - Purchase orders
- `order_lines` - Line items per order
- `invoices` - Generated invoices
- `payments` - Payment tracking
- `carts` & `cart_items` - Shopping cart functionality

### 6. Activities & Tasks (4 tables)
- `activities` - Sales activities (calls, visits)
- `activity_types` - Activity categorization
- `call_plans` - Planned customer outreach
- `tasks` - To-do items and assignments

### 7. Sales Rep Management (7 tables)
- `sales_reps` - Sales representative profiles
- `customer_assignments` - Rep territory assignments
- `sample_usage` - Product sample tracking
- `rep_weekly_metrics` - Performance metrics
- `rep_product_goals` - Sales targets
- `top_products` - Product performance rankings
- `sales_incentives` - Active promotions

### 8. Analytics (3 tables)
- `account_health_snapshots` - Customer health scoring
- `sales_metrics` - Aggregated sales data
- `calendar_events` - Rep calendar management

### 9. Compliance & Tax (3 tables)
- `compliance_filings` - State regulatory filings
- `state_compliances` - Enabled states
- `state_tax_rates` - Tax rate by state

### 10. Integrations (4 tables)
- `webhook_subscriptions` - Event webhooks
- `webhook_events` - Event log
- `webhook_deliveries` - Delivery attempts
- `integration_tokens` - Third-party API tokens

### 11. System (3 tables)
- `portal_notifications` - User notifications
- `audit_logs` - Change tracking
- `data_integrity_snapshots` - Data quality reports

---

## Key Relationships (Text Diagram)

```
TENANT (Root)
├── USERS
│   ├── USER_ROLES → ROLES → PERMISSIONS
│   ├── SALES_REPS
│   │   ├── CUSTOMER_ASSIGNMENTS → CUSTOMERS
│   │   ├── SAMPLE_USAGE
│   │   ├── REP_WEEKLY_METRICS
│   │   └── REP_PRODUCT_GOALS
│   ├── ACTIVITIES
│   └── TASKS
│
├── PORTAL_USERS
│   ├── PORTAL_USER_ROLES → ROLES
│   ├── CARTS → CART_ITEMS → SKUS
│   └── ORDERS
│
├── CUSTOMERS
│   ├── CUSTOMER_ADDRESSES
│   ├── ORDERS
│   │   ├── ORDER_LINES → SKUS
│   │   ├── INVOICES → PAYMENTS
│   │   └── ACTIVITIES
│   ├── ACCOUNT_HEALTH_SNAPSHOTS
│   └── TASKS
│
├── PRODUCTS
│   ├── SUPPLIERS
│   └── SKUS
│       ├── INVENTORIES (by location)
│       ├── PRICE_LIST_ITEMS → PRICE_LISTS
│       ├── ORDER_LINES
│       └── CART_ITEMS
│
├── COMPLIANCE
│   ├── COMPLIANCE_FILINGS
│   ├── STATE_COMPLIANCES
│   └── STATE_TAX_RATES
│
└── INTEGRATIONS
    ├── WEBHOOK_SUBSCRIPTIONS
    ├── WEBHOOK_EVENTS → WEBHOOK_DELIVERIES
    └── INTEGRATION_TOKENS
```

---

## Key Field Explanations

### Tenant Table
- `slug` - URL-friendly tenant identifier (e.g., "acme-wines")
- `timezone` - Tenant's operating timezone for date calculations

### Customer Table
- `risk_status` - Health indicator: HEALTHY | AT_RISK_CADENCE | AT_RISK_REVENUE | DORMANT | CLOSED
- `ordering_pace_days` - Average days between orders
- `established_revenue` - Historical baseline revenue
- `dormancy_since` - Date customer went dormant
- `is_permanently_closed` - Hard close flag vs temporary dormancy

### Order Table
- `delivery_week` - Week number for delivery scheduling
- `is_first_order` - Flag for new customer analytics
- `status` - DRAFT | SUBMITTED | FULFILLED | CANCELLED | PARTIALLY_FULFILLED

### Product Table
- `tasting_notes`, `food_pairings`, `serving_info`, `wine_details` - JSONB fields for rich product data
- `enriched_at` / `enriched_by` - AI enrichment tracking

### Sales Rep Table
- `territory_name` - Geographic or account-based territory
- `delivery_day` - Weekly delivery schedule
- `*_quota` - Weekly/monthly/quarterly/annual revenue targets
- `sample_allowance_per_month` - Free sample limit

### Sample Usage Table
- `needs_follow_up` - Requires rep follow-up
- `resulted_in_order` - Conversion tracking
- `feedback` - Customer tasting notes

### Rep Weekly Metrics
- `revenue_last_year` - YoY comparison
- `dormant_customers_count` - At-risk accounts
- `reactivated_customers_count` - Win-backs
- `in_person_visits`, `tasting_appointments`, etc. - Activity breakdown

---

## Sample Queries

### 1. Get All Active Customers for a Tenant
```sql
SELECT id, name, account_number, risk_status
FROM customers
WHERE tenant_id = 'your-tenant-uuid'
  AND is_permanently_closed = false
ORDER BY name;
```

### 2. Find At-Risk Customers
```sql
SELECT
  c.name,
  c.risk_status,
  c.last_order_date,
  c.dormancy_since,
  sr.territory_name,
  u.full_name as sales_rep_name
FROM customers c
LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
LEFT JOIN users u ON sr.user_id = u.id
WHERE c.tenant_id = 'your-tenant-uuid'
  AND c.risk_status IN ('AT_RISK_CADENCE', 'AT_RISK_REVENUE', 'DORMANT')
ORDER BY c.risk_status, c.last_order_date;
```

### 3. Get Order Details with Line Items
```sql
SELECT
  o.id as order_id,
  o.status,
  o.ordered_at,
  c.name as customer_name,
  ol.quantity,
  s.code as sku_code,
  p.name as product_name,
  ol.unit_price,
  (ol.quantity * ol.unit_price) as line_total
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_lines ol ON o.id = ol.order_id
JOIN skus s ON ol.sku_id = s.id
JOIN products p ON s.product_id = p.id
WHERE o.tenant_id = 'your-tenant-uuid'
  AND o.status = 'SUBMITTED'
ORDER BY o.ordered_at DESC;
```

### 4. Calculate Available Inventory
```sql
SELECT
  p.name as product_name,
  s.code as sku_code,
  i.location,
  i.on_hand,
  i.allocated,
  (i.on_hand - i.allocated) as available
FROM inventories i
JOIN skus s ON i.sku_id = s.id
JOIN products p ON s.product_id = p.id
WHERE i.tenant_id = 'your-tenant-uuid'
  AND (i.on_hand - i.allocated) > 0
ORDER BY p.name, s.code;
```

### 5. Sales Rep Performance (Weekly)
```sql
SELECT
  u.full_name as rep_name,
  sr.territory_name,
  m.week_start_date,
  m.revenue,
  m.revenue_last_year,
  m.unique_customer_orders,
  m.new_customers_added,
  m.dormant_customers_count,
  m.in_person_visits,
  m.tasting_appointments
FROM rep_weekly_metrics m
JOIN sales_reps sr ON m.sales_rep_id = sr.id
JOIN users u ON sr.user_id = u.id
WHERE m.tenant_id = 'your-tenant-uuid'
  AND m.week_start_date >= CURRENT_DATE - INTERVAL '4 weeks'
ORDER BY m.week_start_date DESC, u.full_name;
```

### 6. Top Products by Revenue
```sql
SELECT
  tp.rank,
  p.name as product_name,
  s.code as sku_code,
  tp.total_revenue,
  tp.total_cases,
  tp.unique_customers
FROM top_products tp
JOIN skus s ON tp.sku_id = s.id
JOIN products p ON s.product_id = p.id
WHERE tp.tenant_id = 'your-tenant-uuid'
  AND tp.ranking_type = 'revenue'
  AND tp.calculated_at = (
    SELECT MAX(calculated_at)
    FROM top_products
    WHERE tenant_id = 'your-tenant-uuid'
  )
ORDER BY tp.rank
LIMIT 10;
```

### 7. Sample Usage Tracking
```sql
SELECT
  c.name as customer_name,
  p.name as product_name,
  su.quantity,
  su.tasted_at,
  su.feedback,
  su.needs_follow_up,
  su.resulted_in_order
FROM sample_usage su
JOIN customers c ON su.customer_id = c.id
JOIN skus s ON su.sku_id = s.id
JOIN products p ON s.product_id = p.id
WHERE su.tenant_id = 'your-tenant-uuid'
  AND su.sales_rep_id = 'specific-rep-uuid'
  AND su.tasted_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY su.tasted_at DESC;
```

### 8. Audit Log Query
```sql
SELECT
  al.created_at,
  u.full_name as user_name,
  al.entity_type,
  al.entity_id,
  al.action,
  al.changes,
  al.metadata
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.tenant_id = 'your-tenant-uuid'
  AND al.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY al.created_at DESC
LIMIT 100;
```

### 9. Customer Health Snapshot
```sql
SELECT
  c.name as customer_name,
  ahs.snapshot_date,
  ahs.revenue_score,
  ahs.cadence_score,
  ahs.sample_utilization,
  ahs.notes
FROM account_health_snapshots ahs
JOIN customers c ON ahs.customer_id = c.id
WHERE ahs.tenant_id = 'your-tenant-uuid'
  AND c.sales_rep_id = 'specific-rep-uuid'
ORDER BY ahs.snapshot_date DESC, c.name;
```

### 10. Portal User Activity
```sql
SELECT
  pu.full_name,
  pu.email,
  pu.status,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total) as total_spent,
  MAX(o.ordered_at) as last_order_date
FROM portal_users pu
LEFT JOIN orders o ON pu.id = o.portal_user_id
WHERE pu.tenant_id = 'your-tenant-uuid'
  AND pu.status = 'ACTIVE'
GROUP BY pu.id, pu.full_name, pu.email, pu.status
ORDER BY total_spent DESC;
```

---

## Multi-Tenant Usage

### Setting Tenant Context (Session Variable)
```sql
-- Set current tenant for session (for RLS policies)
SET app.current_tenant_id = 'your-tenant-uuid';
```

### Tenant Isolation Best Practices
1. **Always filter by `tenant_id`** in WHERE clauses
2. **Use RLS policies** to enforce isolation at database level
3. **Set session variables** for automatic tenant filtering
4. **Index on `tenant_id`** for all tenant-scoped tables (already done)
5. **Never join across tenants** - validate tenant_id matches

---

## Migration Checklist for Lovable

### Pre-Migration
- [ ] Backup existing Prisma database (if applicable)
- [ ] Review and customize RLS policies
- [ ] Plan initial seed data (permissions, roles)
- [ ] Configure Supabase project settings

### Migration Steps
1. [ ] Create new Supabase project
2. [ ] Run `LOVABLE_DATABASE_SCHEMA.sql` in SQL Editor
3. [ ] Verify all tables created:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
   ```
4. [ ] Configure RLS policies with actual auth logic
5. [ ] Set up Supabase Auth integration (if using)
6. [ ] Create initial tenant record
7. [ ] Seed permissions and default roles
8. [ ] Test multi-tenancy with session variables
9. [ ] Update application environment variables
10. [ ] Test CRUD operations via Supabase client
11. [ ] Run performance benchmarks
12. [ ] Set up database backups

### Post-Migration
- [ ] Monitor query performance
- [ ] Adjust indexes based on actual usage patterns
- [ ] Set up alerts for RLS policy violations
- [ ] Document custom queries for team
- [ ] Configure database connection pooling (if needed)

### Testing Queries
```sql
-- Verify table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: 48

-- Verify enum types
SELECT typname FROM pg_type WHERE typcategory = 'E' ORDER BY typname;
-- Expected: 10 enums

-- Verify indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
-- Expected: 95+ indexes

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
-- Expected: 38+ tables
```

---

## Performance Optimization Tips

### 1. Use Prepared Statements
Leverage parameterized queries to benefit from query plan caching.

### 2. Partition Large Tables (Future)
Consider partitioning `audit_logs`, `activities`, `orders` by date when data grows.

### 3. JSONB Indexing
Add GIN indexes on JSONB columns if querying nested fields:
```sql
CREATE INDEX idx_products_tasting_notes ON products USING GIN (tasting_notes);
```

### 4. Materialized Views
Create materialized views for complex analytics queries:
```sql
CREATE MATERIALIZED VIEW mv_sales_rep_performance AS
SELECT ... (complex aggregation query)
WITH DATA;

-- Refresh periodically
REFRESH MATERIALIZED VIEW mv_sales_rep_performance;
```

### 5. Connection Pooling
Use PgBouncer or Supabase's built-in pooling for high-concurrency apps.

---

## Security Considerations

### Row Level Security (RLS)
- **All tenant-scoped tables have RLS enabled**
- Customize policies based on your authentication strategy
- Test policies with different user contexts

### Sensitive Data
- `hashed_password` - Already hashed, never store plaintext
- `refresh_token` - Encrypted tokens for session management
- `integration_tokens` - Consider encrypting access tokens
- `webhook_subscriptions.secret` - Use strong secrets

### Audit Logging
- All critical changes should be logged to `audit_logs`
- Capture IP, user agent in `metadata` JSONB field
- Set up alerts for suspicious activities

---

## Supabase-Specific Features

### Real-time Subscriptions
Enable real-time for key tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE portal_notifications;
```

### Storage Integration
Link file uploads to products/invoices using Supabase Storage:
```sql
ALTER TABLE products ADD COLUMN image_url TEXT;
```

### Edge Functions
Use Supabase Edge Functions for:
- Webhook delivery (`webhook_deliveries`)
- Email notifications (`portal_notifications`)
- Background job processing

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Multi-tenancy Patterns**: https://supabase.com/docs/guides/database/multi-tenancy

---

## Schema Version

- **Version**: 1.0.0
- **Generated**: 2025-10-21
- **Source**: Prisma schema from `/web/prisma/schema.prisma`
- **Target Platform**: Supabase (PostgreSQL 15+)

---

## Conversion Notes

### Prisma → PostgreSQL Type Mappings
- `String @id @default(cuid())` → `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `DateTime @default(now())` → `TIMESTAMP WITH TIME ZONE DEFAULT now()`
- `Decimal @db.Decimal(10,2)` → `NUMERIC(10,2)`
- `Json` → `JSONB`
- `Boolean @default(false)` → `BOOLEAN DEFAULT false`
- `@relation` → `REFERENCES table(id) ON DELETE CASCADE/SET NULL`

### Key Differences
1. **UUIDs vs CUIDs**: Using PostgreSQL's `gen_random_uuid()` instead of CUID
2. **Timestamps**: All timestamps are `TIMESTAMP WITH TIME ZONE` (best practice)
3. **JSONB**: Using JSONB instead of JSON for better performance
4. **Snake Case**: Table and column names converted to snake_case (PostgreSQL convention)

---

## Change Log

### 2025-10-21 - Initial Schema
- Created complete schema from Prisma
- Added 48 tables, 10 enums, 95+ indexes
- Implemented RLS policies
- Added timestamp triggers
- Created helper views

---

## Contributing

When extending this schema:
1. **Always add `tenant_id`** to new tables
2. **Update RLS policies** for new tables
3. **Add indexes** on foreign keys
4. **Create triggers** for `updated_at` columns
5. **Document changes** in this README
6. **Test multi-tenancy** thoroughly

---

**End of Documentation**
