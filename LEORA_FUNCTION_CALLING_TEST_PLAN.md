# Leora Function Calling Test Plan

## Overview
This document provides a comprehensive testing plan for the Leora function calling implementation. The system enables AI-powered queries against customer, order, product, and territory data with strict security controls.

**Implementation Files:**
- `/Users/greghogue/Leora2/web/src/lib/copilot/functions.ts` - Function implementations
- `/Users/greghogue/Leora2/web/src/lib/copilot/service.ts` - Service layer
- `/Users/greghogue/Leora2/web/src/app/api/sales/copilot/route.ts` - API endpoint

---

## 1. Code Review Checklist

### Security Measures

#### Tenant Scoping
- [ ] All database queries include `tenantId` filter in WHERE clauses
- [ ] No cross-tenant data leakage possible through joins or relations
- [ ] Function implementations receive `tenantId` as required parameter
- [ ] `tenantId` is extracted from authenticated session only

#### Territory Filtering
- [ ] Sales rep users have territory filter applied via `territoryId` parameter
- [ ] Territory filter uses `salesRep.territoryName` relationship correctly
- [ ] Admin users (no territoryId) can access all tenant data
- [ ] Territory validation happens before data access (e.g., `getTerritoryPerformance`)
- [ ] Territory comparison function respects user access rights

#### Authentication & Authorization
- [ ] API route uses `withSalesSession` middleware for authentication
- [ ] Session provides both `tenantId` and optional `territoryId`
- [ ] No functions bypass authentication middleware
- [ ] Territory access is derived from session, not user input

#### Input Validation
- [ ] Limit parameters capped at reasonable maximums (100-500)
- [ ] Date ranges validated (max 2 years for time series)
- [ ] Array inputs have length limits (e.g., max 10 territories)
- [ ] Required parameters are enforced via TypeScript and function logic
- [ ] String inputs used in queries go through Prisma (parameterized)

### TypeScript Type Safety

#### Type Definitions
- [ ] All function parameters have explicit interfaces
- [ ] Return types are strongly typed with detailed interfaces
- [ ] No use of `any` type in function signatures
- [ ] Optional parameters clearly marked with `?` operator
- [ ] Enum values properly typed (e.g., order status, granularity)

#### Type Consistency
- [ ] `BaseFunctionParams` used consistently across all functions
- [ ] `FunctionImplementation` type correctly maps to actual implementations
- [ ] `FUNCTION_DEFINITIONS` matches implementation parameter types
- [ ] Return types match documented result interfaces

### Error Handling

#### Database Errors
- [ ] Customer/product not found returns meaningful errors
- [ ] Access denied scenarios throw appropriate errors
- [ ] Database connection failures caught and reported
- [ ] Null/undefined values handled safely (optional chaining, nullish coalescing)

#### Business Logic Errors
- [ ] Empty result sets handled gracefully (return empty arrays, not errors)
- [ ] Territory access violations return "not found" rather than "access denied"
- [ ] Invalid date ranges throw clear error messages
- [ ] Parameter validation errors are user-friendly

#### Stream Error Handling
- [ ] Service layer catches and emits function execution errors
- [ ] Stream abort signal properly propagated
- [ ] Partial results handled when stream is interrupted
- [ ] Tool call errors don't crash entire conversation

### SQL Injection Prevention

#### Prisma ORM Usage
- [ ] All queries use Prisma's type-safe query builder
- [ ] No raw SQL queries (`db.$executeRaw`) used
- [ ] User input never concatenated into query strings
- [ ] Parameterized queries for all dynamic filters
- [ ] Date parsing uses `new Date()` constructor, not string interpolation

#### Query Construction
- [ ] WHERE clauses built using object syntax, not strings
- [ ] Array filters use `in` operator with typed arrays
- [ ] LIKE queries use `contains` with `mode: 'insensitive'`
- [ ] All relations traversed via Prisma schema definitions

### Rate Limiting & Performance

#### Query Limits
- [ ] Maximum result limits enforced (100-500 depending on data type)
- [ ] Large aggregations limited by date range (2 years max)
- [ ] Customer search limited to 100 results
- [ ] Time series queries limit periods based on granularity
- [ ] Product aggregations use `take: 1000` safety limit

#### Performance Considerations
- [ ] Indexes should exist on `tenantId`, `customerId`, `orderedAt`, `territoryName`
- [ ] Selective field selection (not fetching entire models)
- [ ] Pagination support for large result sets (`offset`, `limit`)
- [ ] Aggregations done in-memory for pre-filtered datasets
- [ ] No N+1 query patterns (use `select` with relations)

---

## 2. Unit Test Cases

### Function: `getTopCustomersByRevenue`

#### Happy Path
```typescript
// Test: Returns top 10 customers by revenue in date range
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    limit: 10
  }
}
// Expected: Array of 10 customers sorted by totalRevenue descending
// Validate: All customers have orders in date range
// Validate: Only SUBMITTED, FULFILLED, PARTIALLY_FULFILLED orders counted
```

#### Edge Cases
```typescript
// Test: Empty results when no orders in range
{
  params: { startDate: '2030-01-01', endDate: '2030-12-31' }
}
// Expected: { customers: [], totalCount: 0 }

// Test: Limit exceeds available customers
{
  params: { startDate: '2024-01-01', endDate: '2024-12-31', limit: 1000 }
}
// Expected: Returns all available customers, capped at 100

// Test: Single customer with multiple orders
// Expected: Revenue aggregated correctly across all orders

// Test: Customers with zero revenue (cancelled orders)
// Expected: Not included in results
```

#### Security Tests
```typescript
// Test: Sales rep only sees their territory
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { startDate: '2024-01-01', endDate: '2024-12-31' }
}
// Expected: All customers belong to 'west' territory

// Test: Admin sees all territories
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: { startDate: '2024-01-01', endDate: '2024-12-31' }
}
// Expected: Customers from all territories

// Test: Cross-tenant isolation
{
  tenantId: 'tenant-2',
  territoryId: undefined,
  params: { startDate: '2024-01-01', endDate: '2024-12-31' }
}
// Expected: Only tenant-2 customers, no tenant-1 data
```

#### Error Cases
```typescript
// Test: Invalid date format
{
  params: { startDate: 'invalid-date', endDate: '2024-12-31' }
}
// Expected: Error thrown or empty results

// Test: End date before start date
{
  params: { startDate: '2024-12-31', endDate: '2024-01-01' }
}
// Expected: Empty results (no orders in range)

// Test: Missing required parameters
{
  params: { startDate: '2024-01-01' } // missing endDate
}
// Expected: TypeScript error (compile time)
```

### Function: `getCustomerDetails`

#### Happy Path
```typescript
// Test: Returns customer with recent orders and metrics
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    customerId: 'customer-123',
    includeRecentOrders: true
  }
}
// Expected: Full customer object with 10 recent orders
// Validate: Metrics calculated from all orders (not just recent 10)
// Validate: recentOrders sorted by orderedAt desc
```

#### Edge Cases
```typescript
// Test: Customer with no orders
{
  params: { customerId: 'new-customer-id' }
}
// Expected: Customer details with zero metrics, empty recentOrders

// Test: Customer with single order
// Expected: AOV equals single order total

// Test: includeRecentOrders = false
{
  params: { customerId: 'customer-123', includeRecentOrders: false }
}
// Expected: recentOrders is undefined, metrics still calculated
```

#### Security Tests
```typescript
// Test: Access denied for wrong territory
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { customerId: 'east-customer-id' }
}
// Expected: Throws "Customer not found or access denied"

// Test: Access denied for wrong tenant
{
  tenantId: 'tenant-2',
  territoryId: undefined,
  params: { customerId: 'tenant-1-customer-id' }
}
// Expected: Throws "Customer not found or access denied"

// Test: Admin can access any territory customer
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: { customerId: 'any-territory-customer' }
}
// Expected: Returns customer details
```

#### Error Cases
```typescript
// Test: Non-existent customer ID
{
  params: { customerId: 'does-not-exist' }
}
// Expected: Throws "Customer not found or access denied"

// Test: Empty customer ID
{
  params: { customerId: '' }
}
// Expected: Throws error or returns not found
```

### Function: `searchCustomers`

#### Happy Path
```typescript
// Test: Search by name
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    query: 'acme',
    searchFields: ['name'],
    limit: 20
  }
}
// Expected: Customers with 'acme' in name (case-insensitive)
// Validate: matchedField is 'name' for all results

// Test: Search all fields (default)
{
  params: { query: 'john@example.com' }
}
// Expected: Matches customer by email, matchedField = 'email'
```

#### Edge Cases
```typescript
// Test: No matches
{
  params: { query: 'zzz-no-match-zzz' }
}
// Expected: { customers: [], totalMatches: 0 }

// Test: Single character query
{
  params: { query: 'a' }
}
// Expected: All customers with 'a' in searchable fields

// Test: Special characters in query
{
  params: { query: "O'Brien" }
}
// Expected: Correctly escapes quote, finds matches

// Test: Query with spaces
{
  params: { query: 'Acme Corp' }
}
// Expected: Finds 'Acme Corporation' partial match
```

#### Security Tests
```typescript
// Test: Territory filtering applied
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { query: 'acme' }
}
// Expected: Only west territory customers returned

// Test: Cross-tenant isolation
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: { query: 'universal-name' }
}
// Expected: Only tenant-1 customers
```

#### Error Cases
```typescript
// Test: Empty query string
{
  params: { query: '' }
}
// Expected: Empty results or error

// Test: Very long query (>1000 chars)
{
  params: { query: 'a'.repeat(1000) }
}
// Expected: Handled gracefully, likely no matches
```

### Function: `getOrdersByCustomer`

#### Happy Path
```typescript
// Test: Get all orders for customer
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    customerId: 'customer-123',
    limit: 50,
    offset: 0
  }
}
// Expected: Up to 50 orders with line items
// Validate: hasMore = true if more than 50 exist
// Validate: Items include SKU code and product name
```

#### Edge Cases
```typescript
// Test: Pagination (offset)
{
  params: { customerId: 'customer-123', limit: 10, offset: 10 }
}
// Expected: Orders 11-20

// Test: Filter by status
{
  params: {
    customerId: 'customer-123',
    status: ['FULFILLED', 'SUBMITTED']
  }
}
// Expected: Only orders with those statuses

// Test: Date range filter
{
  params: {
    customerId: 'customer-123',
    startDate: '2024-01-01',
    endDate: '2024-03-31'
  }
}
// Expected: Only Q1 2024 orders

// Test: Customer with no orders
{
  params: { customerId: 'new-customer' }
}
// Expected: { orders: [], totalCount: 0, hasMore: false }
```

#### Security Tests
```typescript
// Test: Wrong territory returns empty (not error)
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { customerId: 'east-customer-id' }
}
// Expected: { orders: [], totalCount: 0, hasMore: false }
// Note: Security through obscurity - doesn't reveal customer existence

// Test: Wrong tenant returns empty
{
  tenantId: 'tenant-2',
  territoryId: undefined,
  params: { customerId: 'tenant-1-customer-id' }
}
// Expected: Empty result
```

#### Error Cases
```typescript
// Test: Invalid status enum
{
  params: { customerId: 'customer-123', status: ['INVALID_STATUS'] }
}
// Expected: Empty results (no matching orders)

// Test: Negative offset
{
  params: { customerId: 'customer-123', offset: -1 }
}
// Expected: Treated as 0 or error
```

### Function: `getRecentOrders`

#### Happy Path
```typescript
// Test: Get last 30 days of orders
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { days: 30, limit: 50 }
}
// Expected: Orders from last 30 days across all customers
// Validate: Customer info included in each order
// Validate: Sorted by orderedAt desc
```

#### Edge Cases
```typescript
// Test: Maximum days (365)
{
  params: { days: 365, limit: 500 }
}
// Expected: Last year of orders, limit enforced

// Test: days exceeds max (>365)
{
  params: { days: 400 }
}
// Expected: Capped at 365 days

// Test: minTotal filter
{
  params: { days: 30, minTotal: 1000 }
}
// Expected: Only orders >= $1000

// Test: Combined filters
{
  params: {
    days: 7,
    status: ['FULFILLED'],
    minTotal: 500,
    limit: 10
  }
}
// Expected: Large fulfilled orders from last week
```

#### Security Tests
```typescript
// Test: Territory scoping applied
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { days: 30 }
}
// Expected: Only orders from west territory customers

// Test: Tenant isolation
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: { days: 30 }
}
// Expected: Only tenant-1 orders
```

### Function: `getTopProductsBySales`

#### Happy Path
```typescript
// Test: Top 10 products by revenue
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    metric: 'revenue',
    limit: 10
  }
}
// Expected: 10 products sorted by totalRevenue desc
// Validate: Aggregation across all SKUs of product
// Validate: uniqueCustomers count is accurate
```

#### Edge Cases
```typescript
// Test: Sort by volume instead of revenue
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    metric: 'volume',
    limit: 10
  }
}
// Expected: Sorted by totalVolume (quantity sold)

// Test: Filter by category
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    category: 'Electronics'
  }
}
// Expected: Only Electronics products

// Test: Filter by brand
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    brand: 'Acme'
  }
}
// Expected: Only Acme brand products

// Test: Combined category and brand filter
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    category: 'Electronics',
    brand: 'Sony'
  }
}
// Expected: Only Sony Electronics
```

#### Security Tests
```typescript
// Test: Territory filter via customer relationship
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { startDate: '2024-01-01', endDate: '2024-12-31' }
}
// Expected: Only products sold to west territory customers

// Test: Tenant scoping
{
  tenantId: 'tenant-2',
  territoryId: undefined,
  params: { startDate: '2024-01-01', endDate: '2024-12-31' }
}
// Expected: Only products from tenant-2 orders
```

### Function: `getProductDetails`

#### Happy Path
```typescript
// Test: Get product with performance metrics
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    productId: 'product-123',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Product info with active SKUs and performance data
// Validate: topCustomers limited to 5
// Validate: averagePrice calculated correctly
```

#### Edge Cases
```typescript
// Test: Product with no sales
{
  params: { productId: 'new-product' }
}
// Expected: Product info with zero performance metrics

// Test: No date range (all-time performance)
{
  params: { productId: 'product-123' }
}
// Expected: Performance metrics across all orders

// Test: Product with multiple SKUs
// Expected: Aggregation across all SKUs
```

#### Security Tests
```typescript
// Test: Territory filter applied to sales data
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { productId: 'product-123' }
}
// Expected: Performance only from west territory sales

// Test: Product exists but no sales in territory
{
  tenantId: 'tenant-1',
  territoryId: 'east',
  params: { productId: 'west-only-product' }
}
// Expected: Product found, zero performance metrics
```

#### Error Cases
```typescript
// Test: Non-existent product
{
  params: { productId: 'does-not-exist' }
}
// Expected: Throws "Product not found"

// Test: Wrong tenant product
{
  tenantId: 'tenant-2',
  params: { productId: 'tenant-1-product' }
}
// Expected: Throws "Product not found"
```

### Function: `getTerritoryPerformance`

#### Happy Path
```typescript
// Test: Get performance for specific territory
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    territoryId: 'west',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    includeCustomerBreakdown: true
  }
}
// Expected: Territory metrics with top 5 products and customer breakdown
// Validate: All customers belong to territory
// Validate: topProducts sorted by revenue
```

#### Edge Cases
```typescript
// Test: Territory with no orders
{
  params: {
    territoryId: 'new-territory',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Territory found, zero metrics

// Test: Without customer breakdown
{
  params: {
    territoryId: 'west',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    includeCustomerBreakdown: false
  }
}
// Expected: customerBreakdown is undefined
```

#### Security Tests
```typescript
// Test: Sales rep can only query their own territory
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    territoryId: 'west', // Must match session territoryId
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Success

// Test: Sales rep cannot query other territories
// (Note: Current implementation doesn't enforce this - potential security issue!)
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    territoryId: 'east', // Different from session territoryId
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Should throw error (SECURITY ISSUE - needs fix)
```

#### Error Cases
```typescript
// Test: Missing territoryId when required
{
  tenantId: 'tenant-1',
  territoryId: undefined, // Admin with no default
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31'
    // territoryId not provided in params
  }
}
// Expected: Throws "Territory ID is required"

// Test: Non-existent territory
{
  params: {
    territoryId: 'does-not-exist',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Throws "Territory not found or access denied"
```

### Function: `compareTerritories`

#### Happy Path
```typescript
// Test: Compare 3 territories
{
  tenantId: 'tenant-1',
  territoryId: undefined, // Admin only
  params: {
    territoryIds: ['west', 'east', 'south'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    metrics: ['revenue', 'orders', 'customers', 'aov']
  }
}
// Expected: Comparison array with 3 territories
// Validate: Totals are sum of all territories
// Validate: All requested metrics included
```

#### Edge Cases
```typescript
// Test: Maximum territories (10)
{
  params: {
    territoryIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: All 10 territories compared

// Test: Default metrics (all)
{
  params: {
    territoryIds: ['west', 'east'],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: All metrics included
```

#### Security Tests
```typescript
// Test: Sales rep cannot compare (should they?)
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    territoryIds: ['west', 'east'],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: ??? (Implementation doesn't check - potential security issue)

// Test: Tenant isolation
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: {
    territoryIds: ['west', 'east'],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Only tenant-1 territory data
```

#### Error Cases
```typescript
// Test: Too many territories (>10)
{
  params: {
    territoryIds: ['t1', 't2', ...Array(20)],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Throws "Cannot compare more than 10 territories"

// Test: Empty territoryIds array
{
  params: {
    territoryIds: [],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
// Expected: Empty comparison array
```

### Function: `getRevenueTimeSeries`

#### Happy Path
```typescript
// Test: Daily revenue for 30 days
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    granularity: 'day'
  }
}
// Expected: ~31 data points (one per day)
// Validate: Periods in chronological order
// Validate: Totals match sum of all periods
```

#### Edge Cases
```typescript
// Test: Weekly granularity
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    granularity: 'week'
  }
}
// Expected: ~52 data points (weeks)

// Test: Monthly granularity
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    granularity: 'month'
  }
}
// Expected: 12 data points (months)

// Test: Group by territory
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    granularity: 'day',
    groupBy: 'territory'
  }
}
// Expected: Each period has breakdown map with territory names

// Test: Group by product
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    granularity: 'day',
    groupBy: 'product'
  }
}
// Expected: Each period has breakdown map with product IDs

// Test: Group by customer
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    granularity: 'day',
    groupBy: 'customer'
  }
}
// Expected: Each period has breakdown map with customer IDs
```

#### Security Tests
```typescript
// Test: Territory filter applied
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    granularity: 'month'
  }
}
// Expected: Only west territory revenue

// Test: Tenant isolation
{
  tenantId: 'tenant-2',
  territoryId: undefined,
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    granularity: 'month'
  }
}
// Expected: Only tenant-2 revenue
```

#### Error Cases
```typescript
// Test: Date range exceeds 2 years
{
  params: {
    startDate: '2020-01-01',
    endDate: '2024-12-31',
    granularity: 'day'
  }
}
// Expected: Throws "Date range cannot exceed 2 years"

// Test: Invalid granularity
{
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    granularity: 'hour' // Not in enum
  }
}
// Expected: TypeScript compile error
```

---

## 3. Integration Test Scenarios

### Scenario 1: Simple Query → Function Call → Response
**User Query:** "Who are my top 5 customers this year?"

**Flow:**
1. User sends POST to `/api/sales/copilot` with message
2. Session extracted: `{ tenantId: 'tenant-1', territoryId: 'west' }`
3. Context metrics computed from recent orders
4. AI receives system/user prompts + function definitions
5. AI calls `getTopCustomersByRevenue` with:
   ```json
   {
     "startDate": "2024-01-01T00:00:00Z",
     "endDate": "2024-12-31T23:59:59Z",
     "limit": 5
   }
   ```
6. Function executes, returns customer array
7. Function result sent back to AI as tool message
8. AI generates natural language response with customer names
9. User receives streaming response with citations

**Validation:**
- Function called with correct date range (current year)
- Territory filter applied (only west customers)
- Limit respected (5 customers)
- AI response includes customer names and revenue figures
- Citations include "Dashboard metrics"

### Scenario 2: Direct Response (No Function Call)
**User Query:** "What does ARPDD mean?"

**Flow:**
1. User sends POST to `/api/sales/copilot`
2. Session and metrics extracted
3. AI receives context including ARPDD value in metrics
4. AI responds directly without calling functions
5. User receives explanation of ARPDD concept

**Validation:**
- No function calls made
- AI uses context metrics for ARPDD value
- Response explains "Average Revenue Per Day Delivered"
- No database queries executed

### Scenario 3: Multiple Parallel Function Calls
**User Query:** "Compare Q1 vs Q2 revenue and show top products for each quarter"

**Flow:**
1. User sends query
2. AI calls 4 functions in parallel:
   - `getRevenueTimeSeries` for Q1
   - `getRevenueTimeSeries` for Q2
   - `getTopProductsBySales` for Q1
   - `getTopProductsBySales` for Q2
3. All functions execute with territory filter
4. Results aggregated and sent back to AI
5. AI synthesizes comparison response

**Validation:**
- All 4 functions called in single round
- Territory filter applied to all
- AI correctly compares Q1 vs Q2 data
- Top products listed separately for each quarter

### Scenario 4: Follow-up Query Using Previous Context
**User Query 1:** "Who is my biggest customer?"
**User Query 2:** "Show me their recent orders"

**Flow:**
1. First query calls `getTopCustomersByRevenue` (limit: 1)
2. AI responds: "Acme Corp is your biggest customer..."
3. Second query - AI maintains conversation context
4. AI extracts customer ID from previous function result
5. AI calls `getOrdersByCustomer` with Acme Corp's ID
6. AI responds with order details

**Validation:**
- Conversation state maintained between queries
- AI correctly references previous function results
- Second function call uses data from first
- Territory filter consistent across both queries

### Scenario 5: Complex Multi-Step Analysis
**User Query:** "Analyze my territory performance and identify at-risk customers"

**Flow:**
1. AI calls `getTerritoryPerformance` for user's territory
2. AI analyzes metrics, notices low AOV
3. AI calls `getTopCustomersByRevenue` to identify top customers
4. AI calls `getOrdersByCustomer` for each top customer to check recency
5. AI synthesizes findings: "Your territory is doing X, but customers Y and Z haven't ordered in 60 days"

**Validation:**
- Multiple sequential function calls
- AI makes decisions based on intermediate results
- All queries respect territory boundaries
- Recommendations are actionable

### Scenario 6: Error Recovery
**User Query:** "Show me details for customer ABC123"

**Flow:**
1. AI calls `getCustomerDetails` with customerId: 'ABC123'
2. Function throws "Customer not found or access denied"
3. Error propagated to AI in tool result message
4. AI responds: "I couldn't find customer ABC123 in your territory"
5. User can refine query

**Validation:**
- Error doesn't crash stream
- AI receives error message in tool result
- AI provides helpful response to user
- Security maintained (doesn't leak why access was denied)

### Scenario 7: Pagination Handling
**User Query:** "Show me all orders for Acme Corp"

**Flow:**
1. AI calls `getOrdersByCustomer` with customerId, limit: 50, offset: 0
2. Function returns `hasMore: true`
3. AI notices pagination needed
4. AI calls function again with offset: 50
5. Continues until `hasMore: false`
6. AI summarizes: "Acme Corp has 127 orders total..."

**Validation:**
- AI handles pagination automatically
- Multiple function calls with increasing offset
- All results aggregated before response
- User gets complete picture without manual pagination

### Scenario 8: Admin vs Sales Rep Access
**Admin Query:** "Compare all territories"
**Sales Rep Query:** "Compare all territories"

**Admin Flow:**
1. Session: `{ tenantId: 'tenant-1', territoryId: undefined }`
2. AI calls `compareTerritories` with all territory IDs
3. Function returns data for all territories
4. AI responds with full comparison

**Sales Rep Flow:**
1. Session: `{ tenantId: 'tenant-1', territoryId: 'west' }`
2. AI calls `compareTerritories` with territory IDs
3. Function executes but only returns data for territories user can access
4. AI responds with limited comparison (or error if not permitted)

**Validation:**
- Admin sees all tenant data
- Sales rep sees only their territory
- No cross-territory data leakage
- Function behavior differs based on session

### Scenario 9: Date Range Intelligence
**User Query:** "Show me last quarter's performance"

**Flow:**
1. AI determines current date from context
2. AI calculates Q1 2024: Jan 1 - Mar 31 (if now is Q2)
3. AI calls `getTerritoryPerformance` with calculated dates
4. AI responds with Q1 metrics

**Validation:**
- AI correctly interprets "last quarter"
- Date calculation accurate
- Function receives proper ISO 8601 dates
- Response references Q1 explicitly

### Scenario 10: Search and Drill-Down
**User Query:** "Find customers named 'Smith' and show me their order history"

**Flow:**
1. AI calls `searchCustomers` with query: 'Smith'
2. Function returns 3 matches
3. AI calls `getOrdersByCustomer` for each customer ID
4. AI aggregates results
5. AI responds: "I found 3 Smith customers. Here's their order history..."

**Validation:**
- Search executed first
- Drill-down queries use search results
- All queries territory-scoped
- Response organized by customer

---

## 4. Example Test Queries

### Customer Queries
1. **"Who are my top 5 customers this year?"**
   - Expected: `getTopCustomersByRevenue` (2024-01-01 to 2024-12-31, limit: 5)

2. **"Show me customers in the electronics segment"**
   - Expected: Direct response (no customer segmentation function available)
   - Alternative: `searchCustomers` if user provides name

3. **"Find all customers with 'Acme' in their name"**
   - Expected: `searchCustomers` (query: 'Acme')

4. **"What's the lifetime value of customer XYZ?"**
   - Expected: `getCustomerDetails` (customerId: 'XYZ')
   - Metrics include lifetimeRevenue

5. **"Which customers haven't ordered in 60 days?"**
   - Expected: `getRecentOrders` (days: 60)
   - AI analyzes to identify missing customers

### Order Queries
6. **"Show me recent orders from Acme Corp"**
   - Expected: `searchCustomers` (query: 'Acme Corp'), then `getOrdersByCustomer`

7. **"What are today's fulfilled orders?"**
   - Expected: `getRecentOrders` (days: 1, status: ['FULFILLED'])

8. **"List all orders over $10,000 this month"**
   - Expected: `getRecentOrders` (days: 30, minTotal: 10000)

9. **"Show me order details for order #12345"**
   - Expected: Direct response (no getOrderDetails function)
   - Alternative: User must query via customer

### Product Queries
10. **"What are my best-selling products this quarter?"**
    - Expected: `getTopProductsBySales` (Q1 dates, metric: 'volume')

11. **"Show me revenue by product category"**
    - Expected: Multiple `getTopProductsBySales` calls (one per category)
    - Or `getTopProductsBySales` without category, AI groups by category

12. **"Which products did Acme Corp order most?"**
    - Expected: `getOrdersByCustomer` (customerId: 'acme'), AI analyzes items

13. **"Tell me about product SKU-12345"**
    - Expected: `getProductDetails` (productId: 'SKU-12345')

### Territory & Performance Queries
14. **"How is my territory performing this year?"**
    - Expected: `getTerritoryPerformance` (user's territory, 2024 dates)

15. **"Compare west vs east territory sales"**
    - Expected: `compareTerritories` (territoryIds: ['west', 'east'], 2024 dates)

16. **"Show me monthly revenue trends for Q1"**
    - Expected: `getRevenueTimeSeries` (Q1 dates, granularity: 'month')

17. **"Which territory has the highest average order value?"**
    - Expected: `compareTerritories` (all territories)
    - AI compares averageOrderValue field

### Complex Analytical Queries
18. **"Identify my at-risk customers and suggest actions"**
    - Expected: `getRecentOrders` (days: 90)
    - AI analyzes order frequency, suggests outreach

19. **"What's driving my revenue growth this month?"**
    - Expected: `getRevenueTimeSeries` (groupBy: 'product')
    - Plus `getTopCustomersByRevenue` (this month)
    - AI synthesizes insights

20. **"Forecast next quarter revenue based on trends"**
    - Expected: `getRevenueTimeSeries` (last 6 months, granularity: 'month')
    - AI analyzes trend, provides forecast (not guaranteed accurate)

---

## 5. Security Validation

### Test Suite: Tenant Isolation

#### Test 1: Cross-Tenant Customer Access
**Setup:**
- Tenant 1 has customer "Acme Corp" (ID: customer-1-123)
- Tenant 2 has customer "Beta Inc" (ID: customer-2-456)

**Test:**
```typescript
// Logged in as Tenant 1 user
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: { customerId: 'customer-2-456' } // Tenant 2 customer
}
```

**Expected:** `getCustomerDetails` throws "Customer not found or access denied"

**Validation:**
- No data from Tenant 2 returned
- Error message doesn't reveal tenant ID
- Database query includes `tenantId` filter

#### Test 2: Cross-Tenant Order Access
**Setup:**
- Tenant 1 has orders with IDs: order-1-xxx
- Tenant 2 has orders with IDs: order-2-xxx

**Test:**
```typescript
// Logged in as Tenant 1 user
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: { customerId: 'customer-2-456' } // Tenant 2 customer
}
```

**Expected:** `getOrdersByCustomer` returns empty array (security through obscurity)

**Validation:**
- No orders from Tenant 2 visible
- Result appears as "customer has no orders"
- No error message reveals cross-tenant attempt

#### Test 3: Cross-Tenant Product Access
**Test:**
```typescript
// Tenant 1 user querying Tenant 2 product
{
  tenantId: 'tenant-1',
  territoryId: undefined,
  params: { productId: 'tenant-2-product-id' }
}
```

**Expected:** `getProductDetails` throws "Product not found"

**Validation:**
- Products are tenant-scoped
- No cross-tenant product catalog access

### Test Suite: Territory Access Control

#### Test 4: Sales Rep Territory Boundaries
**Setup:**
- Sales rep user assigned to "West" territory
- Customer "Acme Corp" is in "West" territory
- Customer "Beta Inc" is in "East" territory

**Test A: Own Territory Access**
```typescript
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { customerId: 'acme-corp-id' }
}
```
**Expected:** Success - customer details returned

**Test B: Other Territory Access**
```typescript
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: { customerId: 'beta-inc-id' } // East territory
}
```
**Expected:** "Customer not found or access denied"

**Validation:**
- Territory filter applied via `salesRep.territoryName`
- Sales rep cannot bypass territory restriction
- Error doesn't reveal customer exists in other territory

#### Test 5: Admin Global Access
**Setup:**
- Admin user (no territoryId in session)
- Customers exist across multiple territories

**Test:**
```typescript
{
  tenantId: 'tenant-1',
  territoryId: undefined, // Admin
  params: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    limit: 10
  }
}
```

**Expected:** `getTopCustomersByRevenue` returns customers from all territories

**Validation:**
- No territory filter applied when `territoryId` is undefined
- Admin sees tenant-wide data
- Results include customers from multiple territories

#### Test 6: Territory Comparison Permissions
**Setup:**
- Sales rep in "West" territory
- Attempts to compare West vs East

**Test:**
```typescript
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  params: {
    territoryIds: ['west', 'east'],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
}
```

**Expected:** ???
- **SECURITY ISSUE:** Current implementation doesn't prevent this
- **Should:** Either restrict to own territory only, or allow but filter results

**Recommendation:** Add check in `compareTerritories`:
```typescript
if (territoryId && !params.territoryIds.every(id => id === territoryId)) {
  throw new Error("Cannot compare territories outside your access");
}
```

### Test Suite: Session Authentication

#### Test 7: Unauthenticated Request
**Test:**
```http
POST /api/sales/copilot
Content-Type: application/json

{ "message": "Who are my top customers?" }
```
**No authentication cookie/header**

**Expected:** 401 Unauthorized response from `withSalesSession`

**Validation:**
- Middleware rejects before function execution
- No database queries performed
- User redirected to login

#### Test 8: Expired Session
**Test:**
- Session token expired
- Request includes old token

**Expected:** 401 Unauthorized

**Validation:**
- Middleware validates session expiry
- User prompted to re-authenticate

#### Test 9: Session Hijacking Attempt
**Test:**
- User modifies session cookie to change tenantId
- Attempts to access other tenant's data

**Expected:** Session validation fails (assuming signed cookies)

**Validation:**
- Session signature verification
- tampered session rejected
- User logged out

### Test Suite: SQL Injection Prevention

#### Test 10: Malicious Customer Search
**Test:**
```typescript
{
  params: {
    query: "'; DROP TABLE customers; --"
  }
}
```

**Expected:** `searchCustomers` treats as literal string, finds no matches

**Validation:**
- Prisma parameterizes query
- No SQL injection possible
- Database structure unchanged

#### Test 11: Malicious Date Input
**Test:**
```typescript
{
  params: {
    startDate: "2024-01-01'; DELETE FROM orders; --"
  }
}
```

**Expected:** Invalid date error or empty results

**Validation:**
- `new Date()` constructor sanitizes input
- Invalid dates result in NaN, caught by Prisma
- No SQL execution

#### Test 12: Array Injection in Status Filter
**Test:**
```typescript
{
  params: {
    customerId: 'customer-123',
    status: ['FULFILLED', "'; DROP TABLE orders; --"]
  }
}
```

**Expected:** Second status ignored (not in enum), query executes safely

**Validation:**
- Prisma validates enum values
- Invalid statuses filtered out
- No SQL injection

### Test Suite: Function Execution Permissions

#### Test 13: Restricted Function Access
**Scenario:** Sales rep attempts to call admin-only function (if any)

**Test:**
```typescript
// If we had an admin-only function like deleteCustomer
{
  tenantId: 'tenant-1',
  territoryId: 'west',
  functionName: 'deleteCustomer',
  params: { customerId: 'customer-123' }
}
```

**Expected:** Function not in registry for sales rep role

**Validation:**
- Function registry filtered by role
- Unauthorized functions not callable via AI
- Explicit permission check

**Note:** Current implementation doesn't have role-based function filtering - all functions available to all authenticated users

### Test Suite: Data Leakage Prevention

#### Test 14: Customer Enumeration
**Scenario:** Attacker tries to enumerate all customer IDs

**Test:**
```typescript
for (let i = 0; i < 10000; i++) {
  getCustomerDetails({ customerId: `customer-${i}` });
}
```

**Expected:**
- Rate limiting triggers (if implemented)
- Each invalid ID returns "not found"
- No information about which IDs exist in other territories/tenants

**Validation:**
- Error messages consistent (don't reveal existence)
- Rate limiting prevents brute force
- Audit log captures suspicious activity

#### Test 15: Territory Inference Attack
**Scenario:** Attacker tries to infer territory structure

**Test:**
```typescript
// Query products to see which territories buy what
getTopProductsBySales({
  startDate: '2024-01-01',
  endDate: '2024-12-31'
})
```

**Expected:** Results filtered by user's territory only

**Validation:**
- Product sales only show user's territory data
- Cannot infer other territories' buying patterns
- Aggregations don't reveal territory count

---

## 6. Performance Benchmarks

### Benchmark Suite: Function Execution Time

#### Benchmark 1: getTopCustomersByRevenue
**Dataset:**
- 1,000 customers
- 10,000 orders
- Date range: 1 year

**Metrics to Measure:**
- Database query time
- In-memory aggregation time
- Total function execution time

**Targets:**
- Query time: < 500ms
- Aggregation time: < 100ms
- Total: < 600ms

**Optimization Checks:**
- [ ] Index on `orders.tenantId`
- [ ] Index on `orders.orderedAt`
- [ ] Index on `orders.customerId`
- [ ] Composite index on `(tenantId, orderedAt, status)`
- [ ] `select` limits fields (not using `SELECT *`)

#### Benchmark 2: getCustomerDetails
**Dataset:**
- 1 customer
- 500 orders for that customer

**Metrics:**
- Customer query time
- Orders query time
- Metrics calculation time
- Total time

**Targets:**
- Customer query: < 50ms
- Orders query: < 200ms
- Calculations: < 50ms
- Total: < 300ms

**Optimization Checks:**
- [ ] Index on `customers.id`
- [ ] Index on `orders.customerId`
- [ ] Efficient use of `take: 10` for recent orders
- [ ] Separate query for all orders (not fetching twice)

#### Benchmark 3: searchCustomers
**Dataset:**
- 10,000 customers
- Search query: "Corp"

**Metrics:**
- Full-text search time
- Result sorting/limiting time
- Total time

**Targets:**
- Search query: < 300ms
- Processing: < 50ms
- Total: < 350ms

**Optimization Checks:**
- [ ] Full-text index on `customers.name`
- [ ] Index on `customers.accountNumber`
- [ ] Index on `customers.billingEmail`
- [ ] Case-insensitive search optimized
- [ ] Limit enforced early (not after fetch)

#### Benchmark 4: getTopProductsBySales
**Dataset:**
- 500 products
- 50,000 order lines
- Date range: 1 year

**Metrics:**
- OrderLine query time
- In-memory aggregation time (Map operations)
- Sorting time
- Total time

**Targets:**
- Query time: < 1000ms
- Aggregation: < 200ms
- Sorting: < 50ms
- Total: < 1250ms

**Optimization Checks:**
- [ ] Index on `orderLines.tenantId`
- [ ] Composite index on `orders(tenantId, orderedAt, status)`
- [ ] Join optimization (order -> customer -> salesRep)
- [ ] `take: 1000` safety limit doesn't impact performance
- [ ] Map aggregation efficient for 500 products

#### Benchmark 5: getRevenueTimeSeries
**Dataset:**
- Date range: 1 year
- Granularity: day
- 10,000 orders

**Metrics:**
- Order fetch time
- Time series aggregation time
- Breakdown calculation time (if groupBy used)
- Total time

**Targets:**
- Query: < 800ms
- Aggregation: < 300ms
- Breakdown: < 200ms
- Total: < 1300ms

**Optimization Checks:**
- [ ] Date filter uses index
- [ ] Territory join optimized
- [ ] Period key calculation efficient
- [ ] Map operations scale to 365 days
- [ ] Breakdown grouping doesn't duplicate work

### Benchmark Suite: Total Response Time

#### Benchmark 6: End-to-End Response (No Functions)
**Scenario:** User asks "What does ARPDD mean?"

**Metrics:**
- API request processing: < 50ms
- Metrics computation: < 200ms
- AI prompt construction: < 50ms
- OpenAI API latency: < 2000ms (external)
- Stream first token: < 2500ms
- Stream completion: < 5000ms

**Targets:**
- Time to first token: < 3000ms
- Total response time: < 6000ms

#### Benchmark 7: End-to-End Response (Single Function)
**Scenario:** User asks "Who are my top 5 customers?"

**Metrics:**
- API processing: < 50ms
- Metrics computation: < 200ms
- AI initial response: < 2000ms
- Function call parsing: < 50ms
- Function execution: < 600ms (see Benchmark 1)
- AI final response: < 2000ms
- Total response time: < 5000ms

**Targets:**
- Time to function call: < 3000ms
- Function execution: < 1000ms
- Final response: < 6000ms total

#### Benchmark 8: End-to-End Response (Multiple Functions)
**Scenario:** User asks "Compare Q1 vs Q2 revenue"

**Metrics:**
- Initial AI call: < 2000ms
- Parallel function execution: < 1500ms (2 calls simultaneously)
- AI synthesis: < 2000ms
- Total: < 6000ms

**Targets:**
- Parallel execution benefits visible
- Not 2x slower than single function call
- Total under 8000ms

### Benchmark Suite: Token Usage

#### Benchmark 9: Token Consumption (No Functions)
**Scenario:** Simple query with direct response

**Metrics:**
- System prompt tokens: ~500
- User prompt tokens: ~100
- Context metrics tokens: ~200
- Response tokens: ~150
- Total: ~950 tokens

**Cost Calculation:**
- GPT-4: ~$0.03 per 1k input, ~$0.06 per 1k output
- Estimated cost: $0.04 per query

#### Benchmark 10: Token Consumption (With Functions)
**Scenario:** Query requiring function call

**Metrics:**
- Initial prompt tokens: ~800 (includes function definitions)
- Function definitions tokens: ~2000
- Function result tokens: ~500
- Second round prompt tokens: ~1500
- Response tokens: ~200
- Total: ~5000 tokens

**Cost Calculation:**
- GPT-4: ~$0.15 per query with function calling
- 3-5x more expensive than direct response

**Optimization Opportunities:**
- [ ] Minimize function definition verbosity
- [ ] Compress function results (remove unnecessary fields)
- [ ] Cache common function results
- [ ] Use smaller model for function selection

### Benchmark Suite: Database Query Performance

#### Benchmark 11: Prisma Query Analysis
**Queries to Analyze:**
1. `getTopCustomersByRevenue` - main query
2. `searchCustomers` - full-text search
3. `getTopProductsBySales` - complex join with aggregation

**Tools:**
- Prisma query logging (`DEBUG=prisma:query`)
- Database EXPLAIN ANALYZE
- Query execution plans

**Checks:**
- [ ] No sequential scans on large tables
- [ ] Index usage confirmed for filters
- [ ] Join order optimized
- [ ] No N+1 query patterns
- [ ] Batch operations where possible

#### Benchmark 12: Concurrent Query Load
**Scenario:** 10 users query simultaneously

**Setup:**
- 10 concurrent requests to `/api/sales/copilot`
- Each calls different function
- Shared database connection pool

**Metrics:**
- Connection pool saturation
- Query queuing time
- Average response time under load
- Error rate

**Targets:**
- Connection pool: 10-20 connections sufficient
- No connection timeout errors
- Response time degradation < 2x
- Zero query failures

**Prisma Configuration:**
```typescript
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 20
  pool_timeout = 30
}
```

### Benchmark Suite: Caching Opportunities

#### Benchmark 13: Cache Hit Rate Analysis
**Cacheable Data:**
- Product catalog (rarely changes)
- Territory list (rarely changes)
- Customer list (changes moderately)
- Order aggregations (changes frequently)

**Cache Strategy:**
- Product/Territory: 1 hour TTL
- Customer search results: 5 minute TTL
- Aggregations: No cache (too dynamic)

**Metrics:**
- Cache hit rate: > 40% target
- Cache eviction rate
- Memory usage
- Response time improvement

**Implementation:**
- Redis for distributed cache
- In-memory LRU for single-instance cache
- Cache key: `{tenantId}:{territoryId}:{functionName}:{hash(params)}`

---

## 7. Manual Testing Checklist

### Phase 1: Setup & Authentication

#### Step 1.1: Login as Sales Rep
- [ ] Navigate to login page
- [ ] Login with sales rep credentials (territory: West)
- [ ] Verify dashboard loads with territory-specific data
- [ ] Note territoryId from user profile

#### Step 1.2: Login as Admin
- [ ] Logout sales rep
- [ ] Login with admin credentials (no territory restriction)
- [ ] Verify dashboard shows all tenant data
- [ ] Confirm no territory filter in session

### Phase 2: Basic Query Testing

#### Step 2.1: Simple Direct Response
1. [ ] Open copilot chat interface
2. [ ] Type: "What is ARPDD?"
3. [ ] Verify response explains Average Revenue Per Day Delivered
4. [ ] Check no function calls made (inspect network tab)
5. [ ] Verify response uses current ARPDD value from metrics

#### Step 2.2: Customer Query
1. [ ] Type: "Who are my top 5 customers this year?"
2. [ ] Verify streaming response starts within 3 seconds
3. [ ] Check network tab for function call event
4. [ ] Verify function name: `getTopCustomersByRevenue`
5. [ ] Verify function parameters include current year dates
6. [ ] Check response includes customer names and revenue figures
7. [ ] Verify all customers are in West territory (sales rep view)

#### Step 2.3: Search Query
1. [ ] Type: "Find customers with 'Acme' in the name"
2. [ ] Verify `searchCustomers` function called
3. [ ] Check query parameter: "Acme"
4. [ ] Verify results are case-insensitive
5. [ ] Check all results are in West territory

### Phase 3: Data Accuracy Verification

#### Step 3.1: Revenue Calculations
1. [ ] Query: "What's my total revenue this month?"
2. [ ] Note the AI's response
3. [ ] Manually verify in database:
   ```sql
   SELECT SUM(total) FROM orders
   WHERE tenantId = 'tenant-1'
   AND customer.territoryId = 'west'
   AND orderedAt >= '2024-01-01'
   AND status IN ('SUBMITTED', 'FULFILLED', 'PARTIALLY_FULFILLED');
   ```
4. [ ] Compare AI response to SQL result (should match)
5. [ ] Verify currency displayed correctly

#### Step 3.2: Customer Metrics
1. [ ] Query: "Show me details for [specific customer name]"
2. [ ] Note lifetime revenue, order count, AOV from AI response
3. [ ] Manually check database for same customer
4. [ ] Verify all metrics match exactly
5. [ ] Check recent orders list is accurate

#### Step 3.3: Product Rankings
1. [ ] Query: "What are my top 3 products by revenue this year?"
2. [ ] Note product names and revenue figures
3. [ ] Manually aggregate in database
4. [ ] Verify rankings are correct
5. [ ] Check revenue calculations include quantity * unitPrice

### Phase 4: Security Testing

#### Step 4.1: Territory Boundary Testing
1. [ ] As sales rep (West territory)
2. [ ] Query: "Show me customers from East territory"
3. [ ] Verify AI responds: "No customers found" or similar
4. [ ] Check function was called but returned empty results
5. [ ] Verify no East territory data visible

#### Step 4.2: Customer Access Control
1. [ ] Identify a customer ID from East territory (check database)
2. [ ] Query: "Show me details for customer [east-customer-id]"
3. [ ] Verify error message: "Customer not found or access denied"
4. [ ] Check error doesn't reveal customer exists in other territory
5. [ ] Verify function call logs don't expose data

#### Step 4.3: Cross-Tenant Isolation
1. [ ] Login as Tenant 2 admin
2. [ ] Note a customer ID from Tenant 1 (check database)
3. [ ] Query: "Show me details for customer [tenant-1-customer-id]"
4. [ ] Verify "Customer not found" error
5. [ ] Check no Tenant 1 data visible in any response
6. [ ] Verify database queries include tenantId filter (check logs)

#### Step 4.4: Admin Access Verification
1. [ ] Login as admin (Tenant 1, no territory)
2. [ ] Query: "Compare all territories"
3. [ ] Verify response includes data from all territories
4. [ ] Check West, East, South, etc. all visible
5. [ ] Confirm no territory filter applied

### Phase 5: Error Handling

#### Step 5.1: Invalid Input Handling
1. [ ] Query: "Show me customers for date 99/99/9999"
2. [ ] Verify AI handles gracefully (error message or clarification request)
3. [ ] Check no function error crashes stream
4. [ ] Verify error logged server-side

#### Step 5.2: Not Found Scenarios
1. [ ] Query: "Show me details for customer XYZ-INVALID"
2. [ ] Verify AI responds: "I couldn't find that customer"
3. [ ] Check error handling in function result
4. [ ] Verify conversation can continue after error

#### Step 5.3: Network Interruption
1. [ ] Start a complex query
2. [ ] Abort request mid-stream (close browser tab or network disconnect)
3. [ ] Verify server-side cleanup (check logs)
4. [ ] Verify no orphaned database connections
5. [ ] Start new query - should work normally

### Phase 6: Complex Scenarios

#### Step 6.1: Multi-Function Query
1. [ ] Query: "Compare Q1 vs Q2 revenue and show me top customers for each quarter"
2. [ ] Verify multiple function calls made
3. [ ] Check parallel execution (if applicable)
4. [ ] Verify AI synthesizes all results coherently
5. [ ] Validate data accuracy for both quarters

#### Step 6.2: Follow-Up Context
1. [ ] Query: "Who is my biggest customer?"
2. [ ] Note customer name in response
3. [ ] Follow-up: "Show me their recent orders"
4. [ ] Verify AI remembers context (doesn't ask which customer)
5. [ ] Check `getOrdersByCustomer` called with correct customer ID
6. [ ] Validate orders belong to previously mentioned customer

#### Step 6.3: Aggregation Accuracy
1. [ ] Query: "Show me daily revenue for the last 7 days"
2. [ ] Verify `getRevenueTimeSeries` called
3. [ ] Check granularity: 'day'
4. [ ] Verify 7 data points returned
5. [ ] Manually verify totals match sum of daily values
6. [ ] Check date labels are correct

### Phase 7: Performance Validation

#### Step 7.1: Response Time
1. [ ] Clear browser cache
2. [ ] Query: "Who are my top 10 customers?"
3. [ ] Measure time to first token (should be < 3 seconds)
4. [ ] Measure total response time (should be < 6 seconds)
5. [ ] Note any slowness or delays
6. [ ] Check server logs for query execution times

#### Step 7.2: Large Result Sets
1. [ ] Query: "Show me all orders from the last year"
2. [ ] Verify pagination handling (if > 500 orders)
3. [ ] Check response doesn't timeout
4. [ ] Verify memory usage stays reasonable
5. [ ] Note if AI summarizes vs listing all (should summarize)

#### Step 7.3: Concurrent Users
1. [ ] Open 5 browser tabs with different users
2. [ ] Each sends query simultaneously
3. [ ] Verify all get responses within reasonable time
4. [ ] Check for any errors or timeouts
5. [ ] Verify each user sees only their data (territory/tenant)

### Phase 8: Edge Cases

#### Step 8.1: Empty Data Sets
1. [ ] Login as user with no orders
2. [ ] Query: "What's my revenue this month?"
3. [ ] Verify AI responds gracefully (e.g., "No orders found")
4. [ ] Check no division-by-zero errors in metrics
5. [ ] Verify user can still ask other questions

#### Step 8.2: Special Characters
1. [ ] Query: "Find customers with name O'Brien & Associates"
2. [ ] Verify search handles apostrophe and ampersand
3. [ ] Check no SQL errors
4. [ ] Verify correct results returned

#### Step 8.3: Date Edge Cases
1. [ ] Query: "Show me revenue for February 29, 2024" (leap year)
2. [ ] Verify date handled correctly
3. [ ] Query: "Show me orders from 2020" (old data)
4. [ ] Check performance with date range spanning years

### Phase 9: Documentation & Logging

#### Step 9.1: Audit Trail
1. [ ] Perform several queries
2. [ ] Check server logs for:
   - [ ] Function calls logged with parameters
   - [ ] User ID and tenant ID logged
   - [ ] Query execution times logged
   - [ ] Errors logged with stack traces
3. [ ] Verify sensitive data not logged (passwords, etc.)

#### Step 9.2: Error Reporting
1. [ ] Trigger an intentional error (invalid customer ID)
2. [ ] Check error appears in logs with context
3. [ ] Verify error message user-friendly
4. [ ] Check stack trace available for debugging
5. [ ] Verify error doesn't expose system internals

### Phase 10: User Experience

#### Step 10.1: Response Quality
1. [ ] Query: "Summarize my territory's performance"
2. [ ] Evaluate AI response for:
   - [ ] Clarity and conciseness
   - [ ] Actionable insights
   - [ ] Correct use of data
   - [ ] Professional tone
3. [ ] Check citations included (if applicable)

#### Step 10.2: Conversation Flow
1. [ ] Have a multi-turn conversation
2. [ ] Verify context maintained across turns
3. [ ] Check AI doesn't repeat function calls unnecessarily
4. [ ] Validate AI can clarify ambiguous requests

#### Step 10.3: Error Messages
1. [ ] Review all error messages encountered
2. [ ] Verify they are:
   - [ ] User-friendly (not technical jargon)
   - [ ] Actionable (suggest next steps)
   - [ ] Consistent in tone
   - [ ] Don't reveal security details

---

## 8. Security Issues Identified

### Critical Issues

#### Issue 1: Territory Comparison Unrestricted
**File:** `/Users/greghogue/Leora2/web/src/lib/copilot/functions.ts`
**Function:** `compareTerritories`
**Line:** 1280-1347

**Problem:** Sales rep can compare territories outside their access by providing any territoryIds array.

**Current Code:**
```typescript
export async function compareTerritories(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: CompareTerritoriesParams
): Promise<CompareTerritoriesResult> {
  // No check if territoryId restricts params.territoryIds
  const comparison = await Promise.all(
    params.territoryIds.map(async (territoryName) => {
      // Queries any territory in array
    })
  );
}
```

**Fix Required:**
```typescript
export async function compareTerritories(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: CompareTerritoriesParams
): Promise<CompareTerritoriesResult> {
  // Add territory access check
  if (territoryId) {
    const unauthorizedTerritories = params.territoryIds.filter(
      id => id !== territoryId
    );
    if (unauthorizedTerritories.length > 0) {
      throw new Error("Cannot compare territories outside your access");
    }
  }

  // Existing code...
}
```

#### Issue 2: getTerritoryPerformance Allows Cross-Territory Access
**File:** `/Users/greghogue/Leora2/web/src/lib/copilot/functions.ts`
**Function:** `getTerritoryPerformance`
**Line:** 1118-1274

**Problem:** Sales rep can query any territory by providing different territoryId in params.

**Current Code:**
```typescript
export async function getTerritoryPerformance(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined, // User's session territory
  params: GetTerritoryPerformanceParams
): Promise<TerritoryPerformanceResult> {
  const targetTerritory = params.territoryId ?? territoryId;
  // No check if params.territoryId matches session territoryId
}
```

**Fix Required:**
```typescript
export async function getTerritoryPerformance(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetTerritoryPerformanceParams
): Promise<TerritoryPerformanceResult> {
  const targetTerritory = params.territoryId ?? territoryId;

  // Add access control check
  if (territoryId && targetTerritory !== territoryId) {
    throw new Error("Cannot access territory performance outside your assignment");
  }

  if (!targetTerritory) {
    throw new Error("Territory ID is required");
  }

  // Existing code...
}
```

### Medium Issues

#### Issue 3: Function Execution Not in API Route
**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/copilot/route.ts`

**Problem:** Current route.ts doesn't actually execute functions - it only streams initial response. Need to add function execution loop.

**Current Implementation:** Missing function execution handler

**Fix Required:** Add function execution in stream handler:
```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    // ... existing setup ...

    const stream = new ReadableStream({
      async start(controller) {
        let conversationMessages: ChatMessage[] = [
          { role: "system", content: buildSystemPrompt(promptContext) },
          { role: "user", content: buildUserPrompt(promptContext) }
        ];

        while (true) {
          const response = await streamCopilotResponse(
            promptContext,
            async (event) => {
              if (event.type === "function_call") {
                // Execute function
                const functionImpl = FUNCTIONS[event.functionName];
                if (functionImpl) {
                  try {
                    const result = await functionImpl(
                      db,
                      tenantId,
                      session.user.salesRep?.territoryId,
                      JSON.parse(event.arguments)
                    );

                    // Add to messages for next round
                    conversationMessages.push({
                      role: "assistant",
                      content: null,
                      tool_calls: [{
                        id: event.id,
                        type: "function",
                        function: {
                          name: event.functionName,
                          arguments: event.arguments
                        }
                      }]
                    });

                    conversationMessages.push({
                      role: "tool",
                      content: JSON.stringify(result),
                      tool_call_id: event.id,
                      name: event.functionName
                    });

                  } catch (error) {
                    // Handle function error
                    send({
                      type: "error",
                      message: error.message
                    });
                  }
                }
              }
            },
            {
              signal: abortController.signal,
              functions: FUNCTION_DEFINITIONS,
              messages: conversationMessages
            }
          );

          // If no more tool calls, break
          if (!response.toolCalls || response.toolCalls.length === 0) {
            break;
          }
        }
      }
    });
  });
}
```

### Low Issues

#### Issue 4: Missing Rate Limiting
**Problem:** No rate limiting on function calls - user could abuse expensive queries

**Recommendation:** Add rate limiting middleware:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many queries, please try again later"
});

// Apply to copilot route
```

#### Issue 5: No Query Cost Tracking
**Problem:** Expensive queries (large date ranges, many territories) have same limit as cheap queries

**Recommendation:** Implement cost-based rate limiting:
- Simple queries: 1 credit
- Complex aggregations: 5 credits
- Time series: 10 credits
- User gets 100 credits per hour

---

## 9. Recommended Fixes Priority

### Priority 1 (Critical - Fix Before Production)
1. **Add territory access control to `compareTerritories`**
2. **Add territory access control to `getTerritoryPerformance`**
3. **Implement function execution loop in API route**
4. **Add comprehensive error handling for function execution**

### Priority 2 (High - Fix Within 1 Week)
5. **Add rate limiting to API endpoint**
6. **Implement audit logging for all function calls**
7. **Add database query performance monitoring**
8. **Create admin dashboard for monitoring function usage**

### Priority 3 (Medium - Fix Within 1 Month)
9. **Implement caching for product/territory lookups**
10. **Add cost-based rate limiting**
11. **Optimize database indexes based on query patterns**
12. **Add automated integration tests**

### Priority 4 (Low - Nice to Have)
13. **Add response streaming progress indicators**
14. **Implement query result caching**
15. **Add user feedback mechanism for incorrect results**
16. **Create developer documentation for adding new functions**

---

## 10. Test Automation Recommendations

### Unit Tests (Jest/Vitest)
```typescript
// Example: functions.test.ts
describe('getTopCustomersByRevenue', () => {
  it('should return top customers sorted by revenue', async () => {
    const result = await getTopCustomersByRevenue(
      mockDb,
      'tenant-1',
      'west',
      {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        limit: 5
      }
    );

    expect(result.customers).toHaveLength(5);
    expect(result.customers[0].totalRevenue).toBeGreaterThanOrEqual(
      result.customers[1].totalRevenue
    );
  });

  it('should respect territory boundaries', async () => {
    const result = await getTopCustomersByRevenue(
      mockDb,
      'tenant-1',
      'west',
      { startDate: '2024-01-01', endDate: '2024-12-31' }
    );

    result.customers.forEach(customer => {
      expect(customer.territory).toBe('west');
    });
  });
});
```

### Integration Tests (Playwright/Cypress)
```typescript
// Example: copilot-integration.test.ts
describe('Copilot Function Calling', () => {
  it('should call function for customer query', async () => {
    await page.goto('/copilot');
    await page.fill('[data-testid="copilot-input"]', 'Who are my top 5 customers?');
    await page.click('[data-testid="copilot-submit"]');

    // Intercept network request
    const functionCall = await page.waitForResponse(
      res => res.url().includes('/api/sales/copilot')
    );

    const streamData = await parseSSE(functionCall);
    const functionCallEvent = streamData.find(
      event => event.type === 'function_call'
    );

    expect(functionCallEvent.functionName).toBe('getTopCustomersByRevenue');
    expect(functionCallEvent.arguments).toContain('limit');
  });
});
```

### Load Tests (k6)
```javascript
// Example: load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 0 }
  ]
};

export default function() {
  const payload = JSON.stringify({
    message: 'Who are my top 5 customers?'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': __ENV.AUTH_COOKIE
    }
  };

  const res = http.post(
    'http://localhost:3000/api/sales/copilot',
    payload,
    params
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 6000ms': (r) => r.timings.duration < 6000
  });

  sleep(5);
}
```

---

## Conclusion

This testing plan provides comprehensive coverage for validating the Leora function calling implementation. Key areas of focus:

1. **Security** is paramount - tenant isolation and territory filtering must be bulletproof
2. **Performance** targets are realistic for production use
3. **Error handling** must be graceful and user-friendly
4. **Data accuracy** is critical for user trust

**Next Steps:**
1. Fix critical security issues identified in Section 8
2. Implement function execution loop in API route
3. Add automated unit tests for all 10 functions
4. Perform manual testing following Phase 1-10 checklist
5. Run performance benchmarks and optimize as needed
6. Deploy to staging and run full integration test suite

**Success Criteria:**
- [ ] All security tests pass (no cross-tenant or cross-territory leakage)
- [ ] All functions execute within performance targets
- [ ] 95% of test queries produce accurate results
- [ ] Error rate < 1% under normal load
- [ ] User satisfaction > 90% (post-launch survey)
