# API Routes for Lovable Migration

This document describes the essential API routes needed for the core sales features.

## Sales Dashboard API

### GET `/api/sales/dashboard`

Returns sales rep dashboard data including metrics, customer health, and tasks.

**Response:**
```typescript
{
  salesRep: {
    id: string;
    name: string;
    email: string;
    territory: string;
    deliveryDay: string | null;
    weeklyQuota: number;
    monthlyQuota: number;
  };
  metrics: {
    currentWeek: {
      revenue: number;
      uniqueCustomers: number;
      quotaProgress: number;
    };
    lastWeek: {
      revenue: number;
    };
    comparison: {
      revenueChange: number;
      revenueChangePercent: string;
    };
  };
  customerHealth: {
    healthy: number;
    atRiskCadence: number;
    atRiskRevenue: number;
    dormant: number;
    total: number;
  };
  customersDue: Array<{
    id: string;
    name: string;
    lastOrderDate: string | null;
    nextExpectedOrderDate: string | null;
    daysOverdue: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    status: string;
  }>;
}
```

**Lovable Implementation:**
```typescript
// app/api/sales/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";

export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get sales rep profile
  const { data: salesRep } = await supabase
    .from('sales_reps')
    .select('*, users(full_name, email)')
    .eq('user_id', user.id)
    .single();

  if (!salesRep) {
    return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
  }

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Get current week revenue
  const { data: currentWeekOrders } = await supabase
    .from('orders')
    .select('total, customer_id')
    .eq('customer.sales_rep_id', salesRep.id)
    .gte('delivered_at', currentWeekStart.toISOString())
    .lte('delivered_at', currentWeekEnd.toISOString())
    .neq('status', 'CANCELLED');

  const currentRevenue = currentWeekOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

  // Get customer health counts
  const { data: customers } = await supabase
    .from('customers')
    .select('risk_status')
    .eq('sales_rep_id', salesRep.id)
    .eq('is_permanently_closed', false);

  const healthCounts = customers?.reduce((acc, c) => {
    acc[c.risk_status] = (acc[c.risk_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return NextResponse.json({
    salesRep: {
      id: salesRep.id,
      name: salesRep.users.full_name,
      email: salesRep.users.email,
      territory: salesRep.territory_name,
      deliveryDay: salesRep.delivery_day,
      weeklyQuota: salesRep.weekly_revenue_quota,
      monthlyQuota: salesRep.monthly_revenue_quota,
    },
    metrics: {
      currentWeek: {
        revenue: currentRevenue,
        uniqueCustomers: new Set(currentWeekOrders?.map(o => o.customer_id)).size,
        quotaProgress: (currentRevenue / salesRep.weekly_revenue_quota) * 100,
      },
      lastWeek: {
        revenue: 0, // Calculate similarly for last week
      },
      comparison: {
        revenueChange: 0,
        revenueChangePercent: "0.0",
      },
    },
    customerHealth: {
      healthy: healthCounts['HEALTHY'] || 0,
      atRiskCadence: healthCounts['AT_RISK_CADENCE'] || 0,
      atRiskRevenue: healthCounts['AT_RISK_REVENUE'] || 0,
      dormant: healthCounts['DORMANT'] || 0,
      total: customers?.length || 0,
    },
    customersDue: [], // Add query for customers due
    tasks: [], // Add query for pending tasks
  });
}
```

---

## Customers API

### GET `/api/sales/customers`

Returns paginated list of customers with filtering and search.

**Query Parameters:**
- `search` (optional): Search by name or email
- `risk` (optional): Filter by risk status (HEALTHY, AT_RISK_CADENCE, etc.)
- `sortField` (optional): Field to sort by (name, lastOrderDate, revenue)
- `sortDirection` (optional): Sort direction (asc, desc)
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50)

**Response:**
```typescript
{
  customers: Array<{
    id: string;
    name: string;
    accountNumber: string | null;
    billingEmail: string | null;
    riskStatus: string;
    lastOrderDate: string | null;
    recentRevenue: number;
    recentOrderCount: number;
    daysOverdue: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  summary: {
    totalCustomers: number;
    totalRevenue: number;
    customersDue: number;
  };
}
```

**Lovable Implementation:**
```typescript
// app/api/sales/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') || '';
  const risk = searchParams.get('risk');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,billing_email.ilike.%${search}%`);
  }

  if (risk && risk !== 'ALL') {
    query = query.eq('risk_status', risk);
  }

  query = query
    .order('name')
    .range(offset, offset + pageSize - 1);

  const { data: customers, count } = await query;

  return NextResponse.json({
    customers: customers || [],
    pagination: {
      page,
      pageSize,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
    summary: {
      totalCustomers: count || 0,
      totalRevenue: 0, // Calculate from orders
      customersDue: 0, // Calculate from next expected order dates
    },
  });
}
```

---

## Catalog API

### GET `/api/portal/catalog`

Returns active SKUs with inventory and pricing.

**Response:**
```typescript
{
  items: Array<{
    skuId: string;
    skuCode: string;
    productId: string;
    productName: string;
    brand: string | null;
    category: string | null;
    size: string | null;
    pricePerUnit: number | null;
    inventory: {
      totals: {
        onHand: number;
        allocated: number;
        available: number;
      };
    };
  }>;
}
```

**Lovable Implementation:**
```typescript
// app/api/portal/catalog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();

  const { data: skus } = await supabase
    .from('skus')
    .select(`
      *,
      products(*),
      inventories(*)
    `)
    .eq('is_active', true)
    .order('products(name)');

  const items = skus?.map(sku => {
    const totalOnHand = sku.inventories.reduce((sum, inv) => sum + inv.on_hand, 0);
    const totalAllocated = sku.inventories.reduce((sum, inv) => sum + inv.allocated, 0);

    return {
      skuId: sku.id,
      skuCode: sku.code,
      productId: sku.product_id,
      productName: sku.products.name,
      brand: sku.products.brand,
      category: sku.products.category,
      size: sku.size,
      pricePerUnit: sku.price_per_unit,
      inventory: {
        totals: {
          onHand: totalOnHand,
          allocated: totalAllocated,
          available: totalOnHand - totalAllocated,
        },
      },
    };
  }) || [];

  return NextResponse.json({ items });
}
```

---

## Orders API

### GET `/api/portal/orders`

Returns customer's order history.

**Response:**
```typescript
{
  orders: Array<{
    id: string;
    orderedAt: string | null;
    status: string;
    total: number;
    currency: string;
    lineCount: number;
    invoice?: {
      invoiceNumber: string | null;
      status: string;
    };
  }>;
}
```

**Lovable Implementation:**
```typescript
// app/api/portal/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get customer ID for this user
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ orders: [] });
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_lines(count),
      invoices(invoice_number, status)
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    orders: orders?.map(order => ({
      id: order.id,
      orderedAt: order.ordered_at,
      status: order.status,
      total: order.total,
      currency: order.currency,
      lineCount: order.order_lines[0]?.count || 0,
      invoice: order.invoices[0] || null,
    })) || [],
  });
}
```

---

## Cart API

### POST `/api/portal/cart/items`

Adds item to cart.

**Request Body:**
```typescript
{
  skuId: string;
  quantity: number;
}
```

**Lovable Implementation:**
```typescript
// app/api/portal/cart/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { skuId, quantity } = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create active cart
  let { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .single();

  if (!cart) {
    const { data: newCart } = await supabase
      .from('carts')
      .insert({ user_id: user.id, status: 'ACTIVE' })
      .select('id')
      .single();
    cart = newCart;
  }

  // Upsert cart item
  const { data: item, error } = await supabase
    .from('cart_items')
    .upsert({
      cart_id: cart.id,
      sku_id: skuId,
      quantity,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item });
}
```

---

## Database Setup

### 1. Run Migrations

```bash
# Install Prisma
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init

# Copy schema.prisma to prisma/schema.prisma

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 2. Seed Sample Data

See `seed-data.ts` in this package for sample data insertion script.

### 3. Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/leora2?schema=public"
```
