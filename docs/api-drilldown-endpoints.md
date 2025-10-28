# Sales Dashboard Drill-Down API Endpoints

## Overview

All endpoints follow the same pattern:
- Use `withSalesSession` wrapper for authentication
- Filter by sales rep from session
- Include `summary`, `data`, `metadata`, and `insights` sections
- Support pagination where applicable
- Type-safe responses with proper error handling

## Endpoints

### 1. This Week Revenue - `/api/sales/dashboard/drilldown/this-week-revenue`

**Purpose:** Detailed breakdown of this week's revenue with daily trends, top customers, and product analysis.

**Query Parameters:** None (returns complete week data)

**Response Structure:**
```typescript
{
  summary: {
    totalRevenue: number;
    lastWeekRevenue: number;
    revenueChange: number;
    revenueChangePercent: string;
    totalOrders: number;
    uniqueCustomers: number;
    averageOrderValue: number;
    quota: number;
    quotaProgress: number;
  };
  data: {
    dailyRevenue: Array<{
      date: string;              // "yyyy-MM-dd"
      dayOfWeek: string;         // "Monday"
      revenue: number;
      orderCount: number;
      uniqueCustomers: number;
    }>;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      accountNumber: string;
      location: { city: string; state: string };
      revenue: number;
      orderCount: number;
      averageOrderValue: number;
      orders: Array<{
        id: string;
        total: number;
        deliveredAt: string;
        status: string;
      }>;
    }>;
    topProducts: Array<{
      productName: string;
      brand: string;
      category: string;
      skuCode: string;
      quantity: number;
      revenue: number;
      orderCount: number;
    }>;
    revenueByCategory: Array<{
      category: string;
      revenue: number;
    }>;
    revenueByBrand: Array<{
      brand: string;
      revenue: number;
    }>;
  };
  metadata: {
    weekStart: string;
    weekEnd: string;
    timestamp: string;
  };
  insights: {
    peakRevenueDay: {
      date: string;
      dayOfWeek: string;
      revenue: number;
      orderCount: number;
      uniqueCustomers: number;
    };
    topCustomerContribution: string;  // "25.5%"
    categoryDiversity: number;
  };
}
```

**Key Features:**
- Daily revenue breakdown for the entire week (Monday-Sunday)
- Top 10 customers by revenue with their order history
- Top 10 products sold this week
- Revenue distribution by category and brand
- Comparison with last week
- Quota progress tracking

---

### 2. Customer Health Overview - `/api/sales/dashboard/drilldown/customer-health`

**Purpose:** Comprehensive customer health analysis with historical trends and transition patterns.

**Query Parameters:** None

**Response Structure:**
```typescript
{
  summary: {
    totalCustomers: number;
    statusDistribution: {
      HEALTHY: number;
      AT_RISK_CADENCE: number;
      AT_RISK_REVENUE: number;
      DORMANT: number;
      CLOSED: number;
    };
    statusPercentages: {
      HEALTHY: string;           // "65.0"
      AT_RISK_CADENCE: string;
      AT_RISK_REVENUE: string;
      DORMANT: string;
      CLOSED: string;
    };
    atRiskTotal: number;
    healthyPercentage: string;
  };
  data: {
    currentStatus: {
      HEALTHY: number;
      AT_RISK_CADENCE: number;
      AT_RISK_REVENUE: number;
      DORMANT: number;
      CLOSED: number;
    };
    monthlyTrends: Array<{
      month: string;             // "2024-10"
      monthLabel: string;        // "Oct 2024"
      HEALTHY: number;
      AT_RISK_CADENCE: number;
      AT_RISK_REVENUE: number;
      DORMANT: number;
      CLOSED: number;
      total: number;
    }>;
    transitionMatrix: Array<{
      fromStatus: string;
      total: number;             // Total transitions from this status
      transitions: {             // Count of transitions to each status
        HEALTHY: number;
        AT_RISK_CADENCE: number;
        AT_RISK_REVENUE: number;
        DORMANT: number;
        CLOSED: number;
      };
      probabilities: {           // Percentage probability of each transition
        HEALTHY: number;
        AT_RISK_CADENCE: number;
        AT_RISK_REVENUE: number;
        DORMANT: number;
        CLOSED: number;
      };
    }>;
    healthScoreMethodology: {
      description: string;
      factors: Array<{
        factor: string;
        weight: string;          // "40%"
        description: string;
      }>;
      statusCriteria: {
        HEALTHY: string;
        AT_RISK_CADENCE: string;
        AT_RISK_REVENUE: string;
        DORMANT: string;
        CLOSED: string;
      };
    };
  };
  metadata: {
    timeRange: {
      start: string;
      end: string;
    };
    snapshotCount: number;
    timestamp: string;
  };
  insights: {
    improvementRate: number;     // % of AT_RISK_CADENCE moving to HEALTHY
    deteriorationRate: number;   // % of HEALTHY moving to AT_RISK_CADENCE
    reactivationRate: number;    // % of DORMANT moving to HEALTHY
    trendDirection: "improving" | "declining" | "stable";
  };
}
```

**Key Features:**
- Current health status distribution across all customers
- 6-month historical trends showing status changes
- Transition matrix showing how customers move between statuses
- Health score calculation methodology
- Key performance indicators for customer health management

---

### 3. Healthy Customers - `/api/sales/dashboard/drilldown/healthy-customers`

**Purpose:** Detailed list of healthy customers with engagement metrics and ordering patterns.

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `sortBy` (options: "revenue", "lastOrder", "name"; default: "revenue")
- `sortOrder` (options: "asc", "desc"; default: "desc")

**Response Structure:**
```typescript
{
  summary: {
    totalHealthy: number;
    totalRevenue: number;
    averageEngagement: string;   // "75.5"
    averageOrderValue: number;
    activeOrdering: number;      // Count with orders in last 30 days
    recentActivity: number;      // Count with recent activities
  };
  data: Array<{
    id: string;
    name: string;
    accountNumber: string;
    contact: {
      phone: string;
      email: string;
    };
    location: {
      city: string;
      state: string;
    };
    orderingPattern: {
      lastOrderDate: string;
      nextExpectedOrderDate: string;
      averageIntervalDays: number;
      intervalConsistency: string; // "85.5" (0-100 score)
      orderCount30Days: number;
      orderCount90Days: number;
    };
    revenueMetrics: {
      establishedRevenue: number;
      last30DaysRevenue: number;
      last90DaysRevenue: number;
      averageOrderValue: number;
      totalOrders: number;
    };
    engagement: {
      score: string;               // "0-100"
      recentActivities: number;
      upcomingEvents: number;
      lastActivityDate: string;
    };
    productDiversity: {
      uniqueProducts: number;
      uniqueCategories: number;
      topProducts: Record<string, {
        name: string;
        quantity: number;
        revenue: number;
      }>;
    };
    recentOrders: Array<{
      id: string;
      total: number;
      deliveredAt: string;
      status: string;
      itemCount: number;
    }>;
    upcomingEvents: Array<{
      id: string;
      title: string;
      startTime: string;
      eventType: string;
    }>;
  }>;
  metadata: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    sortBy: string;
    sortOrder: string;
    timestamp: string;
  };
  insights: {
    topPerformers: Array<{
      customerId: string;
      customerName: string;
      revenue: number;
      engagement: string;
    }>;
    mostConsistent: Array<{
      customerId: string;
      customerName: string;
      consistency: string;
    }>;
  };
}
```

**Key Features:**
- Comprehensive engagement scoring (0-100)
- Ordering pattern consistency analysis
- Product diversity metrics
- Sortable and paginated results
- Top performers and most consistent customers

---

### 4. Dormant Customers - `/api/sales/dashboard/drilldown/dormant-customers`

**Purpose:** List of dormant customers with reactivation strategies and historical analysis.

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Response Structure:**
```typescript
{
  summary: {
    totalDormant: number;
    criticalRisk: number;        // 120+ days dormant
    highRisk: number;            // 90-120 days
    moderateRisk: number;        // 60-90 days
    lowRisk: number;             // 45-60 days
    totalRevenueAtRisk: number;
    averageReactivationScore: string;
    avgDaysDormant: number;
  };
  data: Array<{
    id: string;
    name: string;
    accountNumber: string;
    contact: {
      phone: string;
      email: string;
    };
    location: {
      city: string;
      state: string;
    };
    dormancyMetrics: {
      daysSinceLastOrder: number;
      lastOrderDate: string;
      dormancySince: string;
      riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
    };
    historicalMetrics: {
      totalRevenue: number;
      recentRevenue: number;      // Last 6 months
      averageOrderValue: number;
      totalOrders: number;
      establishedRevenue: number;
    };
    engagement: {
      lastActivityDate: string;
      daysSinceLastActivity: number;
      recentActivities: number;
      pendingTasks: number;
    };
    productPreferences: {
      topProducts: Array<{
        name: string;
        brand: string;
        category: string;
        quantity: number;
        revenue: number;
        orderCount: number;
      }>;
      uniqueProducts: number;
      favoriteCategories: string[];
    };
    reactivation: {
      potentialScore: string;    // "0-100"
      strategy: string;          // "Immediate personal outreach"
      recommendedActions: string[];
      priority: "HIGH" | "MEDIUM" | "LOW";
    };
    recentOrders: Array<{
      id: string;
      total: number;
      deliveredAt: string;
      status: string;
    }>;
    recentActivity: Array<{
      id: string;
      type: string;
      typeCode: string;
      subject: string;
      occurredAt: string;
      outcome: string;
    }>;
  }>;
  metadata: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    timestamp: string;
  };
  insights: {
    highPriority: Array<{
      customerId: string;
      customerName: string;
      daysDormant: number;
      potentialRevenue: number;
      strategy: string;
    }>;
    bestOpportunities: Array<{
      customerId: string;
      customerName: string;
      reactivationScore: string;
      revenue: number;
    }>;
  };
}
```

**Key Features:**
- Reactivation potential scoring algorithm
- Risk level categorization (Critical, High, Moderate, Low)
- Customized reactivation strategies based on dormancy duration
- Historical product preferences for targeted outreach
- Recommended action steps for each customer

---

### 5. At-Risk Revenue - `/api/sales/dashboard/drilldown/at-risk-revenue`

**Purpose:** Customers with declining revenue trends and upsell opportunities.

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Response Structure:**
```typescript
{
  summary: {
    totalAtRisk: number;
    criticalPriority: number;    // >25% decline
    highPriority: number;        // 15-25% decline
    moderatePriority: number;    // <15% decline
    totalRevenueAtRisk: number;
    totalRevenueLoss: number;
    averageDecline: string;      // "18.5"
    recoveryPotential: number;
  };
  data: Array<{
    id: string;
    name: string;
    accountNumber: string;
    contact: {
      phone: string;
      email: string;
    };
    location: {
      city: string;
      state: string;
    };
    revenueMetrics: {
      establishedRevenue: number;
      last30DaysRevenue: number;
      last90DaysRevenue: number;
      last6MonthsRevenue: number;
      revenueDecline30Days: string;    // "22.5"
      revenueDecline90Days: string;
      monthlyRunRate: number;
      vsEstablishedMonthly: number;
    };
    orderTrends: {
      avgRecentOrderSize: number;
      avgHistoricalOrderSize: number;
      orderSizeChange: string;         // "-15.5"
      orderCount30Days: number;
      orderCount90Days: number;
    };
    productMixAnalysis: {
      currentCategories: Array<{
        category: string;
        revenue: number;
        quantity: number;
      }>;
      mixChanges: Array<{
        category: string;
        currentRevenue: number;
        historicalRevenue: number;
        change: number;              // Percentage
      }>;
      topCurrentProducts: Array<{
        name: string;
        brand: string;
        category: string;
        revenue: number;
        quantity: number;
      }>;
    };
    upsellOpportunities: Array<{
      name: string;
      brand: string;
      category: string;
      historicalRevenue: number;
      lastPurchased: string;
    }>;
    engagement: {
      lastActivityDate: string;
      recentActivities: number;
      pendingTasks: number;
    };
    recovery: {
      recommendedActions: string[];
      priority: "CRITICAL" | "HIGH" | "MEDIUM";
      estimatedRecoveryPotential: number;
    };
    recentOrders: Array<{
      id: string;
      total: number;
      deliveredAt: string;
      status: string;
      itemCount: number;
    }>;
    recentActivity: Array<{
      id: string;
      type: string;
      typeCode: string;
      subject: string;
      occurredAt: string;
      outcome: string;
    }>;
  }>;
  metadata: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    timestamp: string;
  };
  insights: {
    topPriorities: Array<{
      customerId: string;
      customerName: string;
      revenueDecline: string;
      revenueLoss: number;
      priority: string;
      topAction: string;
    }>;
    commonPatterns: {
      orderSizeDecline: number;    // Count with order size decline
      productMixShift: number;     // Count with product mix changes
      upsellPotential: number;     // Count with upsell opportunities
    };
  };
}
```

**Key Features:**
- Revenue trend analysis (30-day, 90-day, 6-month)
- Product mix change detection
- Order size trend tracking
- Upsell opportunity identification (products they stopped buying)
- Priority-based recovery recommendations
- Estimated recovery potential calculation

---

## Common Patterns

All endpoints share these patterns:

1. **Authentication:** Use `withSalesSession` to ensure sales rep authentication
2. **Filtering:** Automatically filter data by the logged-in sales rep
3. **Error Handling:** Return 404 if sales rep profile not found
4. **Date Handling:** Use `date-fns` for consistent date operations
5. **Logging:** Include error logging for debugging
6. **Response Format:**
   - `summary`: High-level aggregated metrics
   - `data`: Detailed records
   - `metadata`: Pagination and request info
   - `insights`: Actionable intelligence and recommendations

## Usage Examples

### This Week Revenue
```bash
GET /api/sales/dashboard/drilldown/this-week-revenue
```

### Customer Health
```bash
GET /api/sales/dashboard/drilldown/customer-health
```

### Healthy Customers (Paginated & Sorted)
```bash
GET /api/sales/dashboard/drilldown/healthy-customers?limit=20&offset=0&sortBy=revenue&sortOrder=desc
```

### Dormant Customers (First Page)
```bash
GET /api/sales/dashboard/drilldown/dormant-customers?limit=25&offset=0
```

### At-Risk Revenue (Second Page)
```bash
GET /api/sales/dashboard/drilldown/at-risk-revenue?limit=50&offset=50
```

## Database Queries

All endpoints use Prisma ORM with optimized queries:

- **Includes:** Only fetch necessary related data
- **Indexes:** Leverage existing indexes on `salesRepId`, `riskStatus`, `deliveredAt`
- **Aggregations:** Use database-level aggregations where possible
- **Pagination:** Server-side pagination with `skip` and `take`
- **Sorting:** Database-level sorting for performance

## Performance Considerations

1. **Pagination:** All list endpoints support pagination (max 100 records)
2. **Selective Fields:** Include only necessary fields in queries
3. **Aggregation:** Calculate summary stats at database level
4. **Caching:** Consider adding Redis caching for frequently accessed data
5. **Indexes:** Ensure proper indexes on `tenantId`, `salesRepId`, `riskStatus`, `deliveredAt`

## Future Enhancements

- [ ] Add real-time updates via WebSockets
- [ ] Implement response caching with TTL
- [ ] Add export functionality (CSV, Excel)
- [ ] Create bulk action endpoints
- [ ] Add filtering by date ranges
- [ ] Implement search functionality
- [ ] Add webhooks for status changes
