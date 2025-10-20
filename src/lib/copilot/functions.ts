import { PrismaClient } from "@prisma/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Base function parameters accepted by all query functions
 */
export interface BaseFunctionParams {
  db: PrismaClient;
  tenantId: string;
  territoryId?: string;
}

/**
 * Parameters for getTopCustomersByRevenue
 */
export interface GetTopCustomersByRevenueParams {
  startDate: string;
  endDate: string;
  limit?: number;
  territoryId?: string;
}

/**
 * Parameters for getCustomerDetails
 */
export interface GetCustomerDetailsParams {
  customerId: string;
  includeRecentOrders?: boolean;
}

/**
 * Parameters for searchCustomers
 */
export interface SearchCustomersParams {
  query: string;
  searchFields?: Array<"name" | "accountNumber" | "email">;
  limit?: number;
}

/**
 * Parameters for getOrdersByCustomer
 */
export interface GetOrdersByCustomerParams {
  customerId: string;
  startDate?: string;
  endDate?: string;
  status?: Array<"DRAFT" | "SUBMITTED" | "FULFILLED" | "CANCELLED" | "PARTIALLY_FULFILLED">;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for getRecentOrders
 */
export interface GetRecentOrdersParams {
  days?: number;
  status?: string[];
  minTotal?: number;
  limit?: number;
}

/**
 * Parameters for getTopProductsBySales
 */
export interface GetTopProductsBySalesParams {
  startDate: string;
  endDate: string;
  metric?: "revenue" | "volume";
  limit?: number;
  category?: string;
  brand?: string;
}

/**
 * Parameters for getProductDetails
 */
export interface GetProductDetailsParams {
  productId: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Parameters for getTerritoryPerformance
 */
export interface GetTerritoryPerformanceParams {
  territoryId?: string;
  startDate: string;
  endDate: string;
  includeCustomerBreakdown?: boolean;
}

/**
 * Parameters for compareTerritories
 */
export interface CompareTerritoriesParams {
  territoryIds: string[];
  startDate: string;
  endDate: string;
  metrics?: Array<"revenue" | "orders" | "customers" | "aov">;
}

/**
 * Parameters for getRevenueTimeSeries
 */
export interface GetRevenueTimeSeriesParams {
  startDate: string;
  endDate: string;
  granularity?: "day" | "week" | "month";
  groupBy?: "territory" | "product" | "customer";
  territoryId?: string;
}

// ============================================================================
// RETURN TYPE DEFINITIONS
// ============================================================================

export interface TopCustomersResult {
  customers: Array<{
    customerId: string;
    customerName: string;
    accountNumber: string;
    totalRevenue: number;
    orderCount: number;
    territory: string;
  }>;
  totalCount: number;
}

export interface CustomerDetailsResult {
  customer: {
    id: string;
    name: string;
    accountNumber: string;
    billingEmail: string | null;
    territory: {
      id: string;
      name: string;
    };
    salesRep: {
      id: string;
      name: string;
    } | null;
  };
  recentOrders?: Array<{
    orderId: string;
    orderedAt: string;
    total: number;
    currency: string;
    status: string;
    itemCount: number;
  }>;
  metrics: {
    lifetimeRevenue: number;
    averageOrderValue: number;
    orderCount: number;
    lastOrderDate: string | null;
  };
}

export interface SearchCustomersResult {
  customers: Array<{
    customerId: string;
    customerName: string;
    accountNumber: string;
    territory: string;
    matchedField: string;
  }>;
  totalMatches: number;
}

export interface OrdersByCustomerResult {
  orders: Array<{
    orderId: string;
    orderedAt: string;
    total: number;
    currency: string;
    status: string;
    itemCount: number;
    items: Array<{
      skuCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  totalCount: number;
  hasMore: boolean;
}

export interface RecentOrdersResult {
  orders: Array<{
    orderId: string;
    orderedAt: string;
    total: number;
    currency: string;
    status: string;
    customer: {
      id: string;
      name: string;
      accountNumber: string;
    };
  }>;
  totalCount: number;
}

export interface TopProductsResult {
  products: Array<{
    productId: string;
    productName: string;
    brand: string;
    category: string;
    totalRevenue: number;
    totalVolume: number;
    orderCount: number;
    uniqueCustomers: number;
  }>;
  totalCount: number;
}

export interface ProductDetailsResult {
  product: {
    id: string;
    name: string;
    brand: string;
    category: string;
    activeSKUs: Array<{
      skuId: string;
      code: string;
    }>;
  };
  performance: {
    totalRevenue: number;
    totalVolume: number;
    averagePrice: number;
    orderCount: number;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      revenue: number;
    }>;
  };
}

export interface TerritoryPerformanceResult {
  territory: {
    id: string;
    name: string;
  };
  metrics: {
    totalRevenue: number;
    orderCount: number;
    customerCount: number;
    averageOrderValue: number;
    topProducts: Array<{
      productId: string;
      productName: string;
      revenue: number;
    }>;
  };
  customerBreakdown?: Array<{
    customerId: string;
    customerName: string;
    revenue: number;
    orderCount: number;
  }>;
}

export interface CompareTerritoriesResult {
  comparison: Array<{
    territory: {
      id: string;
      name: string;
    };
    revenue: number;
    orderCount: number;
    customerCount: number;
    averageOrderValue: number;
  }>;
  totals: {
    revenue: number;
    orderCount: number;
    customerCount: number;
  };
}

export interface RevenueTimeSeriesResult {
  timeSeries: Array<{
    period: string;
    revenue: number;
    orderCount: number;
    breakdown?: Record<
      string,
      {
        name: string;
        revenue: number;
      }
    >;
  }>;
  totals: {
    revenue: number;
    orderCount: number;
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get top customers ranked by revenue for a specific time period
 * Security: Tenant-scoped, territory-filtered when territoryId provided
 */
export async function getTopCustomersByRevenue(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetTopCustomersByRevenueParams
): Promise<TopCustomersResult> {
  const limit = Math.min(params.limit ?? 10, 100);
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Build territory filter
  const territoryFilter = territoryId ? { territoryName: territoryId } : {};

  // Get customers with their order totals
  const customers = await db.customer.findMany({
    where: {
      tenantId,
      salesRep: territoryFilter,
      orders: {
        some: {
          tenantId,
          orderedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      accountNumber: true,
      salesRep: {
        select: {
          territoryName: true,
        },
      },
      orders: {
        where: {
          tenantId,
          orderedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
          },
        },
        select: {
          total: true,
        },
      },
    },
    take: 1000, // Max limit for security
  });

  // Calculate revenue and sort
  const customersWithRevenue = customers
    .map((customer) => ({
      customerId: customer.id,
      customerName: customer.name,
      accountNumber: customer.accountNumber ?? "",
      totalRevenue: customer.orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
      orderCount: customer.orders.length,
      territory: customer.salesRep?.territoryName ?? "Unassigned",
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);

  return {
    customers: customersWithRevenue,
    totalCount: customersWithRevenue.length,
  };
}

/**
 * Get detailed information about a specific customer
 * Security: Tenant-scoped, territory-filtered
 */
export async function getCustomerDetails(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetCustomerDetailsParams
): Promise<CustomerDetailsResult> {
  const includeRecentOrders = params.includeRecentOrders ?? true;

  // Build where clause with territory filter
  const territoryFilter = territoryId
    ? {
        salesRep: {
          territoryName: territoryId,
        },
      }
    : {};

  const customer = await db.customer.findFirst({
    where: {
      id: params.customerId,
      tenantId,
      ...territoryFilter,
    },
    select: {
      id: true,
      name: true,
      accountNumber: true,
      billingEmail: true,
      salesRep: {
        select: {
          id: true,
          territoryName: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      orders: {
        where: {
          tenantId,
          status: {
            in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
          },
        },
        select: {
          id: true,
          orderedAt: true,
          total: true,
          currency: true,
          status: true,
          lines: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          orderedAt: "desc",
        },
        take: includeRecentOrders ? 10 : 0,
      },
    },
  });

  if (!customer) {
    throw new Error("Customer not found or access denied");
  }

  // Calculate metrics
  const allOrders = await db.order.findMany({
    where: {
      customerId: params.customerId,
      tenantId,
      status: {
        in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
      },
    },
    select: {
      total: true,
      orderedAt: true,
    },
  });

  const lifetimeRevenue = allOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const orderCount = allOrders.length;
  const averageOrderValue = orderCount > 0 ? lifetimeRevenue / orderCount : 0;
  const lastOrderDate = allOrders.length > 0 ? allOrders[0].orderedAt : null;

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      accountNumber: customer.accountNumber ?? "",
      billingEmail: customer.billingEmail,
      territory: {
        id: customer.salesRep?.territoryName ?? "unassigned",
        name: customer.salesRep?.territoryName ?? "Unassigned",
      },
      salesRep: customer.salesRep
        ? {
            id: customer.salesRep.id,
            name: customer.salesRep.user.fullName,
          }
        : null,
    },
    recentOrders: includeRecentOrders
      ? customer.orders.map((order) => ({
          orderId: order.id,
          orderedAt: order.orderedAt?.toISOString() ?? "",
          total: Number(order.total ?? 0),
          currency: order.currency,
          status: order.status,
          itemCount: order.lines.length,
        }))
      : undefined,
    metrics: {
      lifetimeRevenue,
      averageOrderValue,
      orderCount,
      lastOrderDate: lastOrderDate?.toISOString() ?? null,
    },
  };
}

/**
 * Search for customers by name, account number, or email
 * Security: Tenant-scoped, territory-filtered
 */
export async function searchCustomers(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: SearchCustomersParams
): Promise<SearchCustomersResult> {
  const limit = Math.min(params.limit ?? 20, 100);
  const searchFields = params.searchFields ?? ["name", "accountNumber"];
  const query = params.query.toLowerCase();

  // Build territory filter
  const territoryFilter = territoryId
    ? {
        salesRep: {
          territoryName: territoryId,
        },
      }
    : {};

  // Build search conditions
  const searchConditions = [];
  if (searchFields.includes("name")) {
    searchConditions.push({
      name: {
        contains: query,
        mode: "insensitive" as const,
      },
    });
  }
  if (searchFields.includes("accountNumber")) {
    searchConditions.push({
      accountNumber: {
        contains: query,
        mode: "insensitive" as const,
      },
    });
  }
  if (searchFields.includes("email")) {
    searchConditions.push({
      billingEmail: {
        contains: query,
        mode: "insensitive" as const,
      },
    });
  }

  const customers = await db.customer.findMany({
    where: {
      tenantId,
      ...territoryFilter,
      OR: searchConditions,
    },
    select: {
      id: true,
      name: true,
      accountNumber: true,
      billingEmail: true,
      salesRep: {
        select: {
          territoryName: true,
        },
      },
    },
    take: limit,
  });

  // Determine matched field for each customer
  const results = customers.map((customer) => {
    let matchedField = "name";
    if (customer.accountNumber?.toLowerCase().includes(query)) {
      matchedField = "accountNumber";
    } else if (customer.billingEmail?.toLowerCase().includes(query)) {
      matchedField = "email";
    }

    return {
      customerId: customer.id,
      customerName: customer.name,
      accountNumber: customer.accountNumber ?? "",
      territory: customer.salesRep?.territoryName ?? "Unassigned",
      matchedField,
    };
  });

  return {
    customers: results,
    totalMatches: results.length,
  };
}

/**
 * Get orders for a specific customer
 * Security: Tenant-scoped, territory-filtered via customer relationship
 */
export async function getOrdersByCustomer(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetOrdersByCustomerParams
): Promise<OrdersByCustomerResult> {
  const limit = Math.min(params.limit ?? 50, 500);
  const offset = params.offset ?? 0;

  // First verify customer access
  const territoryFilter = territoryId
    ? {
        salesRep: {
          territoryName: territoryId,
        },
      }
    : {};

  const customer = await db.customer.findFirst({
    where: {
      id: params.customerId,
      tenantId,
      ...territoryFilter,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    // Return empty array for security (don't reveal customer existence)
    return {
      orders: [],
      totalCount: 0,
      hasMore: false,
    };
  }

  // Build date filter
  const dateFilter: Record<string, unknown> = {};
  if (params.startDate) {
    dateFilter.gte = new Date(params.startDate);
  }
  if (params.endDate) {
    dateFilter.lte = new Date(params.endDate);
  }

  const whereClause: Record<string, unknown> = {
    customerId: params.customerId,
    tenantId,
  };

  if (Object.keys(dateFilter).length > 0) {
    whereClause.orderedAt = dateFilter;
  }

  if (params.status && params.status.length > 0) {
    whereClause.status = {
      in: params.status,
    };
  }

  // Get orders with items
  const orders = await db.order.findMany({
    where: whereClause,
    select: {
      id: true,
      orderedAt: true,
      total: true,
      currency: true,
      status: true,
      lines: {
        select: {
          quantity: true,
          unitPrice: true,
          sku: {
            select: {
              code: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      orderedAt: "desc",
    },
    skip: offset,
    take: limit + 1, // Get one extra to check if there are more
  });

  const hasMore = orders.length > limit;
  const orderResults = orders.slice(0, limit);

  return {
    orders: orderResults.map((order) => ({
      orderId: order.id,
      orderedAt: order.orderedAt?.toISOString() ?? "",
      total: Number(order.total ?? 0),
      currency: order.currency,
      status: order.status,
      itemCount: order.lines.length,
      items: order.lines.map((line) => ({
        skuCode: line.sku.code,
        productName: line.sku.product.name,
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice),
      })),
    })),
    totalCount: orderResults.length,
    hasMore,
  };
}

/**
 * Get recent orders across all accessible customers
 * Security: Tenant-scoped, territory-filtered
 */
export async function getRecentOrders(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetRecentOrdersParams
): Promise<RecentOrdersResult> {
  const days = Math.min(params.days ?? 30, 365);
  const limit = Math.min(params.limit ?? 50, 500);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Build territory filter
  const territoryFilter = territoryId
    ? {
        customer: {
          salesRep: {
            territoryName: territoryId,
          },
        },
      }
    : {};

  const whereClause: Record<string, unknown> = {
    tenantId,
    orderedAt: {
      gte: cutoffDate,
    },
    ...territoryFilter,
  };

  if (params.status && params.status.length > 0) {
    whereClause.status = {
      in: params.status,
    };
  }

  if (params.minTotal !== undefined) {
    whereClause.total = {
      gte: params.minTotal,
    };
  }

  const orders = await db.order.findMany({
    where: whereClause,
    select: {
      id: true,
      orderedAt: true,
      total: true,
      currency: true,
      status: true,
      customer: {
        select: {
          id: true,
          name: true,
          accountNumber: true,
        },
      },
    },
    orderBy: {
      orderedAt: "desc",
    },
    take: limit,
  });

  return {
    orders: orders.map((order) => ({
      orderId: order.id,
      orderedAt: order.orderedAt?.toISOString() ?? "",
      total: Number(order.total ?? 0),
      currency: order.currency,
      status: order.status,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        accountNumber: order.customer.accountNumber ?? "",
      },
    })),
    totalCount: orders.length,
  };
}

/**
 * Get top-selling products by revenue or volume
 * Security: Tenant-scoped via order relationship, territory-filtered
 */
export async function getTopProductsBySales(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetTopProductsBySalesParams
): Promise<TopProductsResult> {
  const limit = Math.min(params.limit ?? 10, 100);
  const metric = params.metric ?? "revenue";
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Build territory filter via customer
  const territoryFilter = territoryId
    ? {
        order: {
          customer: {
            salesRep: {
              territoryName: territoryId,
            },
          },
        },
      }
    : {};

  // Build product filters
  const productFilter: Record<string, unknown> = {};
  if (params.category) {
    productFilter.category = params.category;
  }
  if (params.brand) {
    productFilter.brand = params.brand;
  }

  const orderLines = await db.orderLine.findMany({
    where: {
      tenantId,
      ...territoryFilter,
      order: {
        tenantId,
        orderedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
        },
      },
      sku: {
        product: productFilter,
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      sku: {
        select: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
            },
          },
        },
      },
      order: {
        select: {
          customerId: true,
        },
      },
    },
  });

  // Aggregate by product
  const productMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      brand: string;
      category: string;
      totalRevenue: number;
      totalVolume: number;
      orderCount: number;
      customerIds: Set<string>;
    }
  >();

  orderLines.forEach((line) => {
    const product = line.sku.product;
    const key = product.id;

    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: product.id,
        productName: product.name,
        brand: product.brand ?? "",
        category: product.category ?? "",
        totalRevenue: 0,
        totalVolume: 0,
        orderCount: 0,
        customerIds: new Set(),
      });
    }

    const entry = productMap.get(key)!;
    entry.totalRevenue += line.quantity * Number(line.unitPrice);
    entry.totalVolume += line.quantity;
    entry.orderCount += 1;
    entry.customerIds.add(line.order.customerId);
  });

  // Convert to array and sort
  const products = Array.from(productMap.values())
    .map((p) => ({
      productId: p.productId,
      productName: p.productName,
      brand: p.brand,
      category: p.category,
      totalRevenue: p.totalRevenue,
      totalVolume: p.totalVolume,
      orderCount: p.orderCount,
      uniqueCustomers: p.customerIds.size,
    }))
    .sort((a, b) => (metric === "revenue" ? b.totalRevenue - a.totalRevenue : b.totalVolume - a.totalVolume))
    .slice(0, limit);

  return {
    products,
    totalCount: products.length,
  };
}

/**
 * Get detailed information about a specific product
 * Security: Tenant-scoped via order joins, territory-filtered
 */
export async function getProductDetails(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetProductDetailsParams
): Promise<ProductDetailsResult> {
  // Get product with SKUs
  const product = await db.product.findFirst({
    where: {
      id: params.productId,
      tenantId,
    },
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      skus: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          code: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  // Build date filter for performance metrics
  const dateFilter: Record<string, unknown> = {};
  if (params.startDate) {
    dateFilter.gte = new Date(params.startDate);
  }
  if (params.endDate) {
    dateFilter.lte = new Date(params.endDate);
  }

  // Build territory filter
  const territoryFilter = territoryId
    ? {
        order: {
          customer: {
            salesRep: {
              territoryName: territoryId,
            },
          },
        },
      }
    : {};

  const whereClause: Record<string, unknown> = {
    tenantId,
    ...territoryFilter,
    sku: {
      productId: params.productId,
    },
    order: {
      tenantId,
      status: {
        in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
      },
    },
  };

  if (Object.keys(dateFilter).length > 0) {
    whereClause.order = {
      ...(whereClause.order as Record<string, unknown>),
      orderedAt: dateFilter,
    };
  }

  // Get order lines for performance metrics
  const orderLines = await db.orderLine.findMany({
    where: whereClause,
    select: {
      quantity: true,
      unitPrice: true,
      order: {
        select: {
          customerId: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Calculate performance metrics
  const totalRevenue = orderLines.reduce((sum, line) => sum + line.quantity * Number(line.unitPrice), 0);
  const totalVolume = orderLines.reduce((sum, line) => sum + line.quantity, 0);
  const orderCount = orderLines.length;
  const averagePrice = totalVolume > 0 ? totalRevenue / totalVolume : 0;

  // Aggregate by customer for top customers
  const customerMap = new Map<string, { id: string; name: string; revenue: number }>();
  orderLines.forEach((line) => {
    const customerId = line.order.customer.id;
    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        id: customerId,
        name: line.order.customer.name,
        revenue: 0,
      });
    }
    customerMap.get(customerId)!.revenue += line.quantity * Number(line.unitPrice);
  });

  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((c) => ({
      customerId: c.id,
      customerName: c.name,
      revenue: c.revenue,
    }));

  return {
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand ?? "",
      category: product.category ?? "",
      activeSKUs: product.skus.map((sku) => ({
        skuId: sku.id,
        code: sku.code,
      })),
    },
    performance: {
      totalRevenue,
      totalVolume,
      averagePrice,
      orderCount,
      topCustomers,
    },
  };
}

/**
 * Get performance metrics for a territory
 * Security: Tenant-scoped, validates territory access
 */
export async function getTerritoryPerformance(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetTerritoryPerformanceParams
): Promise<TerritoryPerformanceResult> {
  const targetTerritory = params.territoryId ?? territoryId;

  if (!targetTerritory) {
    throw new Error("Territory ID is required");
  }

  // Security: If territoryId is provided (sales rep), they can only query their own territory
  if (territoryId && params.territoryId && params.territoryId !== territoryId) {
    // Sales rep trying to access another territory's data
    return {
      territory: {
        id: params.territoryId,
        name: params.territoryId,
      },
      metrics: {
        totalRevenue: 0,
        orderCount: 0,
        customerCount: 0,
        averageOrderValue: 0,
        topProducts: [],
      },
      customerBreakdown: params.includeCustomerBreakdown ? [] : undefined,
    };
  }

  // Verify territory exists and get info
  const territory = await db.salesRep.findFirst({
    where: {
      tenantId,
      territoryName: targetTerritory,
    },
    select: {
      id: true,
      territoryName: true,
    },
  });

  if (!territory) {
    throw new Error("Territory not found or access denied");
  }

  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Get orders for this territory
  const orders = await db.order.findMany({
    where: {
      tenantId,
      customer: {
        salesRep: {
          territoryName: targetTerritory,
        },
      },
      orderedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
      },
    },
    select: {
      id: true,
      total: true,
      customerId: true,
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      lines: {
        select: {
          quantity: true,
          unitPrice: true,
          sku: {
            select: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const orderCount = orders.length;
  const uniqueCustomers = new Set(orders.map((o) => o.customerId)).size;
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  // Aggregate products
  const productMap = new Map<string, { id: string; name: string; revenue: number }>();
  orders.forEach((order) => {
    order.lines.forEach((line) => {
      const productId = line.sku.product.id;
      const productName = line.sku.product.name;
      const revenue = line.quantity * Number(line.unitPrice);

      if (!productMap.has(productId)) {
        productMap.set(productId, { id: productId, name: productName, revenue: 0 });
      }
      productMap.get(productId)!.revenue += revenue;
    });
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      revenue: p.revenue,
    }));

  // Customer breakdown if requested
  let customerBreakdown: Array<{
    customerId: string;
    customerName: string;
    revenue: number;
    orderCount: number;
  }> | undefined;

  if (params.includeCustomerBreakdown) {
    const customerMap = new Map<string, { id: string; name: string; revenue: number; orderCount: number }>();
    orders.forEach((order) => {
      const customerId = order.customer.id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          id: customerId,
          name: order.customer.name,
          revenue: 0,
          orderCount: 0,
        });
      }
      const entry = customerMap.get(customerId)!;
      entry.revenue += Number(order.total ?? 0);
      entry.orderCount += 1;
    });

    customerBreakdown = Array.from(customerMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({
        customerId: c.id,
        customerName: c.name,
        revenue: c.revenue,
        orderCount: c.orderCount,
      }));
  }

  return {
    territory: {
      id: targetTerritory,
      name: targetTerritory,
    },
    metrics: {
      totalRevenue,
      orderCount,
      customerCount: uniqueCustomers,
      averageOrderValue,
      topProducts,
    },
    customerBreakdown,
  };
}

/**
 * Compare performance metrics across multiple territories
 * Security: Tenant-scoped, validates access to all territories
 */
export async function compareTerritories(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: CompareTerritoriesParams
): Promise<CompareTerritoriesResult> {
  if (params.territoryIds.length > 10) {
    throw new Error("Cannot compare more than 10 territories");
  }

  // Security: If territoryId is provided (sales rep), only allow their territory
  let allowedTerritoryIds = params.territoryIds;
  if (territoryId) {
    // Sales rep can only compare their own territory
    allowedTerritoryIds = params.territoryIds.filter(id => id === territoryId);

    if (allowedTerritoryIds.length === 0) {
      return {
        comparison: [],
        totals: {
          revenue: 0,
          orderCount: 0,
          customerCount: 0,
        },
      };
    }
  }

  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Get performance for each territory
  const comparison = await Promise.all(
    allowedTerritoryIds.map(async (territoryName) => {
      const orders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRep: {
              territoryName,
            },
          },
          orderedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
          },
        },
        select: {
          total: true,
          customerId: true,
        },
      });

      const revenue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      const orderCount = orders.length;
      const customerCount = new Set(orders.map((o) => o.customerId)).size;
      const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

      return {
        territory: {
          id: territoryName,
          name: territoryName,
        },
        revenue,
        orderCount,
        customerCount,
        averageOrderValue,
      };
    })
  );

  // Calculate totals
  const totals = {
    revenue: comparison.reduce((sum, t) => sum + t.revenue, 0),
    orderCount: comparison.reduce((sum, t) => sum + t.orderCount, 0),
    customerCount: comparison.reduce((sum, t) => sum + t.customerCount, 0),
  };

  return {
    comparison,
    totals,
  };
}

/**
 * Get revenue data aggregated by time period
 * Security: Tenant-scoped, territory-filtered
 */
export async function getRevenueTimeSeries(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetRevenueTimeSeriesParams
): Promise<RevenueTimeSeriesResult> {
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);
  const granularity = params.granularity ?? "day";

  // Validate date range (max 2 years)
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 730) {
    throw new Error("Date range cannot exceed 2 years");
  }

  // Build territory filter
  const territoryFilter = territoryId
    ? {
        customer: {
          salesRep: {
            territoryName: territoryId,
          },
        },
      }
    : {};

  // Get all orders in range
  const orders = await db.order.findMany({
    where: {
      tenantId,
      ...territoryFilter,
      orderedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
      },
    },
    select: {
      orderedAt: true,
      total: true,
      customer: {
        select: {
          id: true,
          name: true,
          salesRep: {
            select: {
              territoryName: true,
            },
          },
        },
      },
      lines: {
        select: {
          quantity: true,
          unitPrice: true,
          sku: {
            select: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Helper to get period key
  const getPeriodKey = (date: Date): string => {
    if (granularity === "day") {
      return date.toISOString().split("T")[0];
    } else if (granularity === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split("T")[0];
    } else {
      // month
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    }
  };

  // Aggregate by period
  const periodMap = new Map<
    string,
    {
      revenue: number;
      orderCount: number;
      breakdown: Map<string, { name: string; revenue: number }>;
    }
  >();

  orders.forEach((order) => {
    if (!order.orderedAt) return;

    const periodKey = getPeriodKey(order.orderedAt);
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        revenue: 0,
        orderCount: 0,
        breakdown: new Map(),
      });
    }

    const period = periodMap.get(periodKey)!;
    period.revenue += Number(order.total ?? 0);
    period.orderCount += 1;

    // Handle groupBy
    if (params.groupBy === "territory") {
      const territoryName = order.customer.salesRep?.territoryName ?? "Unassigned";
      if (!period.breakdown.has(territoryName)) {
        period.breakdown.set(territoryName, { name: territoryName, revenue: 0 });
      }
      period.breakdown.get(territoryName)!.revenue += Number(order.total ?? 0);
    } else if (params.groupBy === "customer") {
      const customerId = order.customer.id;
      const customerName = order.customer.name;
      if (!period.breakdown.has(customerId)) {
        period.breakdown.set(customerId, { name: customerName, revenue: 0 });
      }
      period.breakdown.get(customerId)!.revenue += Number(order.total ?? 0);
    } else if (params.groupBy === "product") {
      order.lines.forEach((line) => {
        const productId = line.sku.product.id;
        const productName = line.sku.product.name;
        if (!period.breakdown.has(productId)) {
          period.breakdown.set(productId, { name: productName, revenue: 0 });
        }
        period.breakdown.get(productId)!.revenue += line.quantity * Number(line.unitPrice);
      });
    }
  });

  // Convert to array and sort
  const timeSeries = Array.from(periodMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, data]) => ({
      period,
      revenue: data.revenue,
      orderCount: data.orderCount,
      breakdown: params.groupBy
        ? Object.fromEntries(
            Array.from(data.breakdown.entries()).map(([key, value]) => [key, value])
          )
        : undefined,
    }));

  // Calculate totals
  const totals = {
    revenue: timeSeries.reduce((sum, t) => sum + t.revenue, 0),
    orderCount: timeSeries.reduce((sum, t) => sum + t.orderCount, 0),
  };

  return {
    timeSeries,
    totals,
  };
}

// ============================================================================
// FUNCTION REGISTRY
// ============================================================================

export type FunctionImplementation = (
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: Record<string, unknown>
) => Promise<unknown>;

/**
 * Registry mapping function names to their implementations
 */
export const FUNCTIONS: Record<string, FunctionImplementation> = {
  getTopCustomersByRevenue: (db, tenantId, territoryId, params) =>
    getTopCustomersByRevenue(db, tenantId, territoryId, params as GetTopCustomersByRevenueParams),
  getCustomerDetails: (db, tenantId, territoryId, params) =>
    getCustomerDetails(db, tenantId, territoryId, params as GetCustomerDetailsParams),
  searchCustomers: (db, tenantId, territoryId, params) =>
    searchCustomers(db, tenantId, territoryId, params as SearchCustomersParams),
  getOrdersByCustomer: (db, tenantId, territoryId, params) =>
    getOrdersByCustomer(db, tenantId, territoryId, params as GetOrdersByCustomerParams),
  getRecentOrders: (db, tenantId, territoryId, params) =>
    getRecentOrders(db, tenantId, territoryId, params as GetRecentOrdersParams),
  getTopProductsBySales: (db, tenantId, territoryId, params) =>
    getTopProductsBySales(db, tenantId, territoryId, params as GetTopProductsBySalesParams),
  getProductDetails: (db, tenantId, territoryId, params) =>
    getProductDetails(db, tenantId, territoryId, params as GetProductDetailsParams),
  getTerritoryPerformance: (db, tenantId, territoryId, params) =>
    getTerritoryPerformance(db, tenantId, territoryId, params as GetTerritoryPerformanceParams),
  compareTerritories: (db, tenantId, territoryId, params) =>
    compareTerritories(db, tenantId, territoryId, params as CompareTerritoriesParams),
  getRevenueTimeSeries: (db, tenantId, territoryId, params) =>
    getRevenueTimeSeries(db, tenantId, territoryId, params as GetRevenueTimeSeriesParams),
};

// ============================================================================
// OPENAI FUNCTION DEFINITIONS
// ============================================================================

/**
 * Function definitions in OpenAI format for the function calling API
 */
export const FUNCTION_DEFINITIONS = [
  {
    name: "getTopCustomersByRevenue",
    description:
      "Get the top customers ranked by total revenue for a specified date range. Useful for finding best customers, analyzing customer performance, or identifying key accounts.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date for the analysis period (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)",
        },
        endDate: {
          type: "string",
          description: "End date for the analysis period (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)",
        },
        limit: {
          type: "number",
          description: "Number of top customers to return (1-100, default: 10)",
          default: 10,
        },
        territoryId: {
          type: "string",
          description:
            "Optional: Filter results to a specific territory. If not provided, uses all territories the user has access to.",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "getCustomerDetails",
    description:
      "Get detailed information about a specific customer including contact info, recent orders, and lifetime metrics.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "Customer ID to retrieve details for",
        },
        includeRecentOrders: {
          type: "boolean",
          description: "Include recent order history (default: true)",
          default: true,
        },
      },
      required: ["customerId"],
    },
  },
  {
    name: "searchCustomers",
    description:
      "Search for customers by name, account number, or email. Returns matching customers the user has access to.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term (minimum 2 characters). Searches customer name, account number, and email.",
        },
        searchFields: {
          type: "array",
          items: {
            type: "string",
            enum: ["name", "accountNumber", "email"],
          },
          description: "Which fields to search in (default: all fields)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (1-100, default: 20)",
          default: 20,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getOrdersByCustomer",
    description: "Retrieve orders for a specific customer with optional filtering by date range and status.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "Customer ID to get orders for",
        },
        startDate: {
          type: "string",
          description: "Optional: Filter by order date range start (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "Optional: Filter by order date range end (ISO 8601 format)",
        },
        status: {
          type: "array",
          items: {
            type: "string",
            enum: ["DRAFT", "SUBMITTED", "FULFILLED", "CANCELLED", "PARTIALLY_FULFILLED"],
          },
          description: "Optional: Filter by order status",
        },
        limit: {
          type: "number",
          description: "Number of orders to return (1-500, default: 50)",
          default: 50,
        },
        offset: {
          type: "number",
          description: "Pagination offset (default: 0)",
          default: 0,
        },
      },
      required: ["customerId"],
    },
  },
  {
    name: "getRecentOrders",
    description: "Get recent orders across all customers the user has access to, with optional filtering.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to look back (1-365, default: 30)",
          default: 30,
        },
        status: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Optional: Filter by order status",
        },
        minTotal: {
          type: "number",
          description: "Optional: Minimum order value filter",
        },
        limit: {
          type: "number",
          description: "Number of orders to return (1-500, default: 50)",
          default: 50,
        },
      },
      required: [],
    },
  },
  {
    name: "getTopProductsBySales",
    description:
      "Retrieve top-selling products ranked by revenue or volume for a specified date range. Useful for identifying bestsellers and trending products.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date for the analysis period (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "End date for the analysis period (ISO 8601 format)",
        },
        metric: {
          type: "string",
          enum: ["revenue", "volume"],
          description: "Sort by revenue or volume (default: revenue)",
          default: "revenue",
        },
        limit: {
          type: "number",
          description: "Number of top products to return (1-100, default: 10)",
          default: 10,
        },
        category: {
          type: "string",
          description: "Optional: Filter by product category",
        },
        brand: {
          type: "string",
          description: "Optional: Filter by brand",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "getProductDetails",
    description:
      "Get detailed information about a specific product including active SKUs, sales performance, and top customers.",
    parameters: {
      type: "object",
      properties: {
        productId: {
          type: "string",
          description: "Product ID to retrieve details for",
        },
        startDate: {
          type: "string",
          description: "Optional: Performance metric date range start (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "Optional: Performance metric date range end (ISO 8601 format)",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "getTerritoryPerformance",
    description:
      "Get performance metrics for a specific territory including revenue, orders, customer count, and top products.",
    parameters: {
      type: "object",
      properties: {
        territoryId: {
          type: "string",
          description: "Optional: Specific territory ID (defaults to user's territory if sales rep)",
        },
        startDate: {
          type: "string",
          description: "Start date for the analysis period (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "End date for the analysis period (ISO 8601 format)",
        },
        includeCustomerBreakdown: {
          type: "boolean",
          description: "Include detailed customer breakdown (default: false)",
          default: false,
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "compareTerritories",
    description:
      "Compare performance metrics across multiple territories for a specified date range. Maximum 10 territories.",
    parameters: {
      type: "object",
      properties: {
        territoryIds: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of territory IDs to compare (max 10)",
        },
        startDate: {
          type: "string",
          description: "Start date for the analysis period (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "End date for the analysis period (ISO 8601 format)",
        },
        metrics: {
          type: "array",
          items: {
            type: "string",
            enum: ["revenue", "orders", "customers", "aov"],
          },
          description: "Metrics to compare (default: all)",
        },
      },
      required: ["territoryIds", "startDate", "endDate"],
    },
  },
  {
    name: "getRevenueTimeSeries",
    description:
      "Get revenue data aggregated by time period (day, week, or month) with optional grouping by territory, product, or customer.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date for the time series (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "End date for the time series (ISO 8601 format, max 2 years from start)",
        },
        granularity: {
          type: "string",
          enum: ["day", "week", "month"],
          description: "Time period granularity (default: day)",
          default: "day",
        },
        groupBy: {
          type: "string",
          enum: ["territory", "product", "customer"],
          description: "Optional: Group results by territory, product, or customer",
        },
        territoryId: {
          type: "string",
          description: "Optional: Filter to specific territory",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
];
