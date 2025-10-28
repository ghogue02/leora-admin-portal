# Package 2: Database & API

This package contains the database schema, API routes, and sample data for the Lovable migration.

## Files Included

1. **schema.prisma** - Simplified Prisma schema (290 lines vs 1069 original)
2. **api-routes.md** - Complete API route implementations for Supabase
3. **seed-data.ts** - Sample data seeding script

## Setup Instructions

### 1. Database Setup

#### Option A: Use Supabase (Recommended for Lovable)

```bash
# Install Supabase CLI
npm install supabase

# Initialize Supabase project
npx supabase init

# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push schema to Supabase
npx supabase db push
```

#### Option B: Use Prisma with PostgreSQL

```bash
# Install Prisma
npm install prisma @prisma/client

# Copy schema.prisma to your project
cp schema.prisma ./prisma/schema.prisma

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 2. Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/leora2"

# Supabase (if using Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Auth
JWT_SECRET="your-secret-key-minimum-32-characters"
```

### 3. Seed Sample Data

```bash
# Install dependencies
npm install bcryptjs @prisma/client

# Run seeder
npx tsx seed-data.ts
```

This creates:
- ✅ 1 demo tenant
- ✅ 1 sales rep user (rep@demo.com / password123)
- ✅ 5 sample products with SKUs and inventory
- ✅ 4 sample customers with varying risk statuses
- ✅ Sample orders and invoices

### 4. Create API Routes in Lovable

Copy the route implementations from `api-routes.md` to your Lovable project:

```
app/api/
├── sales/
│   ├── dashboard/
│   │   └── route.ts
│   └── customers/
│       └── route.ts
└── portal/
    ├── catalog/
    │   └── route.ts
    ├── orders/
    │   └── route.ts
    └── cart/
        └── items/
            └── route.ts
```

## Schema Simplifications

### Removed Features (from original 1069 lines → 290 lines)

- ❌ Complex role-based permissions system
- ❌ Portal user management (separate from customers)
- ❌ Price list management (using direct SKU pricing)
- ❌ Sample tracking and management
- ❌ Call plans and activity types
- ❌ Task management system
- ❌ Account health snapshots
- ❌ Sales metrics aggregation
- ❌ Compliance filings and state tax rates
- ❌ Webhook subscriptions
- ❌ Integration tokens
- ❌ Calendar events
- ❌ Audit logs
- ❌ Data integrity snapshots

### Kept Core Features

- ✅ Multi-tenant architecture
- ✅ Products, SKUs, and Inventory
- ✅ Customers with risk status tracking
- ✅ Sales reps with quotas
- ✅ Orders and order lines
- ✅ Invoices
- ✅ Shopping cart
- ✅ Basic activity tracking

## Database Models

### Core Entities

1. **Tenant** - Multi-tenant support
2. **User** - Authentication and user management
3. **Product** - Product catalog
4. **Sku** - Stock keeping units with pricing
5. **Inventory** - Stock levels by location
6. **Customer** - Customer records with risk tracking
7. **SalesRep** - Sales representatives with quotas
8. **Order** - Customer orders
9. **OrderLine** - Order line items
10. **Invoice** - Invoicing
11. **Cart** - Shopping cart
12. **CartItem** - Cart line items
13. **Activity** - Activity tracking

### Enumerations

- `CustomerRiskStatus`: HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT, CLOSED
- `OrderStatus`: DRAFT, SUBMITTED, FULFILLED, CANCELLED
- `InvoiceStatus`: DRAFT, SENT, PAID, OVERDUE, VOID
- `CartStatus`: ACTIVE, SUBMITTED, ABANDONED
- `ActivityOutcome`: PENDING, SUCCESS, FAILED, NO_RESPONSE

## API Endpoints

### Sales Dashboard
- `GET /api/sales/dashboard` - Dashboard metrics and data

### Customer Management
- `GET /api/sales/customers` - List customers with filters
- `GET /api/sales/customers/[id]` - Get customer details

### Product Catalog
- `GET /api/portal/catalog` - List active products with inventory

### Order Management
- `GET /api/portal/orders` - List customer orders
- `GET /api/portal/orders/[id]` - Get order details
- `POST /api/portal/orders` - Create new order

### Shopping Cart
- `GET /api/portal/cart` - Get active cart
- `POST /api/portal/cart/items` - Add item to cart
- `PUT /api/portal/cart/items/[id]` - Update cart item
- `DELETE /api/portal/cart/items/[id]` - Remove cart item
- `POST /api/portal/cart/checkout` - Checkout cart

## Migration from Original Schema

### Customer Risk Status
Original schema had 5 risk statuses, all preserved:
```prisma
enum CustomerRiskStatus {
  HEALTHY           // Active, ordering on schedule
  AT_RISK_CADENCE   // Ordering frequency declining
  AT_RISK_REVENUE   // Revenue declining 15%+
  DORMANT           // 45+ days no order
  CLOSED            // Permanently closed
}
```

### Sales Rep Quotas
Preserved all quota levels:
- Weekly revenue quota
- Monthly revenue quota
- Quarterly revenue quota
- Annual revenue quota

### Order Lifecycle
Complete order tracking preserved:
- Draft → Submitted → Fulfilled → Cancelled
- Order lines with SKU references
- Invoice generation
- Payment tracking (can be added later)

## Testing

### 1. Verify Database Schema

```bash
# Check database
npx prisma studio

# Or with Supabase
npx supabase db diff
```

### 2. Test API Routes

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react

# Run tests
npm test
```

### 3. Sample Queries

```typescript
// Get all products
const products = await prisma.product.findMany({
  include: { skus: { include: { inventories: true } } }
});

// Get customer with orders
const customer = await prisma.customer.findUnique({
  where: { id: customerId },
  include: {
    orders: { include: { lines: true, invoices: true } },
    salesRep: { include: { user: true } }
  }
});

// Get sales rep dashboard data
const salesRep = await prisma.salesRep.findUnique({
  where: { userId: userId },
  include: {
    customers: {
      include: {
        orders: {
          where: { deliveredAt: { gte: startOfWeek } }
        }
      }
    }
  }
});
```

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Push schema to database
3. ✅ Run seed data script
4. ⏭️ Implement API routes in Lovable
5. ⏭️ Test with frontend components (Package 01)
6. ⏭️ Add authentication (Package 04)

## Support

- Prisma docs: https://www.prisma.io/docs
- Supabase docs: https://supabase.com/docs
- Original schema: `/prisma/schema.prisma`
- Original API routes: `/src/app/api/`
