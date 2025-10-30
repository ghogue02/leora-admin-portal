# Leora AI Copilot - Function Calling Architecture Design

## Executive Summary

This document outlines the function calling architecture for Leora, an AI copilot for beverage alcohol distributors. The design enables Leora to safely query sales data while maintaining strict security boundaries around tenant isolation and territory-based access control.

---

## 1. Core Query Functions

### 1.1 Customer Query Functions

#### `getTopCustomersByRevenue`
Retrieve top customers ranked by revenue for a specific time period.

**Parameters:**
- `startDate: string` (ISO 8601) - Start of date range
- `endDate: string` (ISO 8601) - End of date range
- `limit: number` (default: 10, max: 100) - Number of customers to return
- `territoryId?: string` (optional) - Filter by specific territory

**Returns:**
```typescript
{
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
```

**Security:**
- Auto-scoped to user's tenant via tenantId
- If user is sales rep: auto-filtered to their assigned territories
- If territoryId provided: validate user has access to that territory

---

#### `getCustomerDetails`
Get detailed information about a specific customer.

**Parameters:**
- `customerId: string` - Customer ID to retrieve
- `includeRecentOrders?: boolean` (default: true) - Include recent order history

**Returns:**
```typescript
{
  customer: {
    id: string;
    name: string;
    accountNumber: string;
    billingEmail: string;
    territory: {
      id: string;
      name: string;
    };
    salesRep: {
      id: string;
      name: string;
    };
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
```

**Security:**
- Verify customer belongs to user's tenant
- If sales rep: verify customer is in their territory
- Redact sensitive data if user lacks permissions

---

#### `searchCustomers`
Search for customers by name, account number, or other criteria.

**Parameters:**
- `query: string` - Search term (min 2 characters)
- `searchFields?: Array<'name' | 'accountNumber' | 'email'>` (default: ['name', 'accountNumber'])
- `limit: number` (default: 20, max: 100)

**Returns:**
```typescript
{
  customers: Array<{
    customerId: string;
    customerName: string;
    accountNumber: string;
    territory: string;
    matchedField: string;
  }>;
  totalMatches: number;
}
```

**Security:**
- Tenant-scoped search
- Territory-filtered for sales reps
- Case-insensitive partial matching

---

### 1.2 Order Query Functions

#### `getOrdersByCustomer`
Retrieve orders for a specific customer.

**Parameters:**
- `customerId: string` - Customer ID
- `startDate?: string` (ISO 8601) - Filter by order date range start
- `endDate?: string` (ISO 8601) - Filter by order date range end
- `status?: Array<'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'>` - Filter by status
- `limit: number` (default: 50, max: 500)
- `offset: number` (default: 0) - Pagination offset

**Returns:**
```typescript
{
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
```

**Security:**
- Verify customer belongs to user's tenant and territory
- Return empty array if unauthorized rather than error (information disclosure)

---

#### `getRecentOrders`
Get recent orders across all customers the user has access to.

**Parameters:**
- `days: number` (default: 30, max: 365) - Number of days to look back
- `status?: Array<string>` - Filter by order status
- `minTotal?: number` - Minimum order value filter
- `limit: number` (default: 50, max: 500)

**Returns:**
```typescript
{
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
```

**Security:**
- Tenant-scoped
- Territory-filtered for sales reps
- Date range validation to prevent excessive queries

---

### 1.3 Product Query Functions

#### `getTopProductsBySales`
Retrieve top-selling products by revenue or volume.

**Parameters:**
- `startDate: string` (ISO 8601)
- `endDate: string` (ISO 8601)
- `metric: 'revenue' | 'volume'` (default: 'revenue')
- `limit: number` (default: 10, max: 100)
- `category?: string` - Filter by product category
- `brand?: string` - Filter by brand

**Returns:**
```typescript
{
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
```

**Security:**
- Tenant-scoped via order tenantId join
- Territory-filtered via customer relationship for sales reps
- Aggregate data only (no individual order details)

---

#### `getProductDetails`
Get detailed information about a specific product including sales performance.

**Parameters:**
- `productId: string` - Product ID
- `startDate?: string` (ISO 8601) - Performance metric date range start
- `endDate?: string` (ISO 8601) - Performance metric date range end

**Returns:**
```typescript
{
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
```

**Security:**
- Tenant-scoped via order joins
- Territory-filtered customer lists for sales reps

---

### 1.4 Territory Query Functions

#### `getTerritoryPerformance`
Get performance metrics for a territory or all accessible territories.

**Parameters:**
- `territoryId?: string` - Specific territory (defaults to user's territory if sales rep)
- `startDate: string` (ISO 8601)
- `endDate: string` (ISO 8601)
- `includeCustomerBreakdown?: boolean` (default: false)

**Returns:**
```typescript
{
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
```

**Security:**
- Validate user has access to requested territory
- Sales reps can only query their assigned territories
- Admins can query any territory in their tenant

---

#### `compareTerritories`
Compare performance metrics across multiple territories.

**Parameters:**
- `territoryIds: Array<string>` - Territories to compare (max 10)
- `startDate: string` (ISO 8601)
- `endDate: string` (ISO 8601)
- `metrics?: Array<'revenue' | 'orders' | 'customers' | 'aov'>` (default: all)

**Returns:**
```typescript
{
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
```

**Security:**
- Validate user has access to ALL requested territories
- Return error if any territory is unauthorized
- Maximum 10 territories to prevent abuse

---

### 1.5 Analytics Functions

#### `getRevenueTimeSeries`
Get revenue data aggregated by time period.

**Parameters:**
- `startDate: string` (ISO 8601)
- `endDate: string` (ISO 8601)
- `granularity: 'day' | 'week' | 'month'` (default: 'day')
- `groupBy?: 'territory' | 'product' | 'customer'` (optional)
- `territoryId?: string` - Filter to specific territory

**Returns:**
```typescript
{
  timeSeries: Array<{
    period: string; // ISO date for period start
    revenue: number;
    orderCount: number;
    breakdown?: Record<string, {
      name: string;
      revenue: number;
    }>;
  }>;
  totals: {
    revenue: number;
    orderCount: number;
  };
}
```

**Security:**
- Tenant-scoped
- Territory-filtered for sales reps
- Limit date range to prevent excessive computation (max 2 years)

---

#### `getCustomerSegmentation`
Segment customers by purchase behavior.

**Parameters:**
- `startDate: string` (ISO 8601)
- `endDate: string` (ISO 8601)
- `segmentBy: 'revenue' | 'frequency' | 'recency'`
- `segments: number` (default: 4, max: 10) - Number of segments (e.g., quartiles)

**Returns:**
```typescript
{
  segments: Array<{
    segmentName: string;
    rangeMin: number;
    rangeMax: number;
    customerCount: number;
    totalRevenue: number;
    customers: Array<{
      customerId: string;
      customerName: string;
      value: number; // metric value for this customer
    }>;
  }>;
}
```

**Security:**
- Tenant-scoped
- Territory-filtered for sales reps
- Limit segment count to prevent performance issues

---

## 2. Security Model

### 2.1 Authentication Context

Every function execution requires an authenticated context:

```typescript
interface AuthContext {
  userId: string;
  tenantId: string;
  role: 'admin' | 'sales_rep' | 'manager';
  territories?: string[]; // For sales reps and managers
  permissions: string[]; // Future: granular permissions
}
```

### 2.2 Authorization Layers

**Layer 1: Tenant Isolation (Mandatory)**
- Every database query MUST include tenantId filter
- No cross-tenant data access allowed
- Implemented via Prisma where clauses

**Layer 2: Territory-Based Access Control**
- Sales reps can only access data for their assigned territories
- Managers can access multiple territories
- Admins have tenant-wide access
- Implemented via territory joins and filters

**Layer 3: Function-Level Permissions**
- Certain functions may be restricted to admin/manager roles
- Example: `compareTerritories` may require manager+ role
- Checked before function execution

### 2.3 Input Validation

**Required Validations:**
1. **Date Ranges**: Validate ISO 8601 format, ensure start < end, limit max range
2. **Limits**: Enforce maximum values to prevent performance issues
3. **IDs**: Validate UUID format, check existence within tenant
4. **String Inputs**: Sanitize for SQL injection (Prisma handles this, but validate length)
5. **Arrays**: Limit array sizes to prevent abuse

**Validation Schema Example:**
```typescript
const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: "startDate must be before endDate"
}).refine(data => {
  const daysDiff = (new Date(data.endDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24);
  return daysDiff <= 730; // Max 2 years
}, {
  message: "Date range cannot exceed 2 years"
});
```

### 2.4 SQL Injection Prevention

**Prisma Safeguards:**
- All queries use Prisma ORM (parameterized queries)
- Never use raw SQL with user input
- If raw queries needed: use Prisma's `$queryRaw` with tagged templates

**Additional Safeguards:**
- Whitelist-based validation for enum fields (status, category, etc.)
- UUID validation for all ID fields
- Reject any input containing SQL keywords if not expected

### 2.5 Rate Limiting

**Function Call Limits:**
- Max 10 function calls per conversation turn
- Max 100 function calls per minute per user
- Max 1000 function calls per hour per tenant
- Exponential backoff for repeated failures

**Query Limits:**
- Individual query timeout: 10 seconds
- Max result set size: 1000 records per query
- Pagination required for large result sets

---

## 3. Function Calling Flow

### 3.1 Request Flow

```
User Message
    ↓
OpenAI GPT-4-mini (with function definitions)
    ↓
Function Call Decision
    ↓
Leora Backend Function Router
    ↓
Authentication & Authorization Check
    ↓
Input Validation & Sanitization
    ↓
Prisma Query Execution (with tenant/territory filters)
    ↓
Result Formatting & Serialization
    ↓
Return to OpenAI
    ↓
Natural Language Response to User
```

### 3.2 Function Registration

Functions are registered with OpenAI using their JSON Schema format:

```typescript
interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: any;
    }>;
    required: string[];
  };
}
```

### 3.3 Execution Handler

```typescript
interface FunctionExecutionContext {
  functionName: string;
  parameters: Record<string, any>;
  authContext: AuthContext;
  prisma: PrismaClient;
}

interface FunctionExecutionResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTimeMs: number;
    recordCount: number;
  };
}
```

### 3.4 Error Handling

**Error Types:**
1. **AuthorizationError**: User lacks permission (403)
2. **ValidationError**: Invalid input parameters (400)
3. **NotFoundError**: Resource doesn't exist (404)
4. **RateLimitError**: Too many requests (429)
5. **QueryTimeoutError**: Database query timeout (504)
6. **InternalError**: Unexpected server error (500)

**Error Response Format:**
```typescript
{
  success: false,
  error: {
    code: "AUTHORIZATION_ERROR",
    message: "You don't have access to this customer",
    details: {
      customerId: "123",
      requiredPermission: "customer:read"
    }
  }
}
```

**AI-Friendly Error Messages:**
- Errors should explain WHY access was denied
- Suggest alternative queries the user CAN make
- Never expose internal implementation details
- Use natural language for user-facing errors

---

## 4. TypeScript Interface Definitions

### 4.1 Core Types

```typescript
// Authentication and Authorization
interface AuthContext {
  userId: string;
  tenantId: string;
  role: 'admin' | 'sales_rep' | 'manager';
  territories?: string[];
  permissions: string[];
}

// Function Registration
interface LeoraFunction {
  name: string;
  description: string;
  parameters: FunctionParameters;
  handler: FunctionHandler;
  requiredRole?: 'admin' | 'manager' | 'sales_rep';
  rateLimit?: {
    maxCallsPerMinute: number;
    maxCallsPerHour: number;
  };
}

interface FunctionParameters {
  type: 'object';
  properties: Record<string, ParameterDefinition>;
  required: string[];
}

interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ParameterDefinition; // For arrays
  properties?: Record<string, ParameterDefinition>; // For objects
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

type FunctionHandler = (
  params: Record<string, any>,
  context: AuthContext,
  prisma: PrismaClient
) => Promise<FunctionExecutionResult>;

// Execution Results
interface FunctionExecutionResult {
  success: boolean;
  data?: any;
  error?: FunctionError;
  metadata?: ExecutionMetadata;
}

interface FunctionError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

type ErrorCode =
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'QUERY_TIMEOUT_ERROR'
  | 'INTERNAL_ERROR';

interface ExecutionMetadata {
  executionTimeMs: number;
  recordCount?: number;
  fromCache?: boolean;
}
```

### 4.2 Function-Specific Return Types

```typescript
// Customer Functions
interface TopCustomersResult {
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

interface CustomerDetailsResult {
  customer: {
    id: string;
    name: string;
    accountNumber: string;
    billingEmail: string;
    territory: {
      id: string;
      name: string;
    };
    salesRep: {
      id: string;
      name: string;
    };
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

// Order Functions
interface OrdersByCustomerResult {
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

// Product Functions
interface TopProductsResult {
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

// Territory Functions
interface TerritoryPerformanceResult {
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

// Analytics Functions
interface RevenueTimeSeriesResult {
  timeSeries: Array<{
    period: string;
    revenue: number;
    orderCount: number;
    breakdown?: Record<string, {
      name: string;
      revenue: number;
    }>;
  }>;
  totals: {
    revenue: number;
    orderCount: number;
  };
}
```

---

## 5. Implementation Approach

### 5.1 Project Structure

```
src/
├── leora/
│   ├── functions/
│   │   ├── registry.ts              # Function registration and routing
│   │   ├── types.ts                 # Shared types and interfaces
│   │   ├── validators.ts            # Input validation schemas
│   │   ├── middleware.ts            # Auth, rate limiting middleware
│   │   ├── customers/
│   │   │   ├── getTopCustomers.ts
│   │   │   ├── getCustomerDetails.ts
│   │   │   └── searchCustomers.ts
│   │   ├── orders/
│   │   │   ├── getOrdersByCustomer.ts
│   │   │   └── getRecentOrders.ts
│   │   ├── products/
│   │   │   ├── getTopProducts.ts
│   │   │   └── getProductDetails.ts
│   │   ├── territories/
│   │   │   ├── getTerritoryPerformance.ts
│   │   │   └── compareTerritories.ts
│   │   └── analytics/
│   │       ├── getRevenueTimeSeries.ts
│   │       └── getCustomerSegmentation.ts
│   ├── executor.ts                  # Function execution engine
│   ├── openai-integration.ts        # OpenAI API integration
│   └── utils/
│       ├── security.ts              # Security utilities
│       ├── formatting.ts            # Result formatting
│       └── caching.ts               # Optional: Redis cache layer
└── api/
    └── routes/
        └── leora-chat.ts            # API endpoint for Leora chat
```

### 5.2 Function Registry Pattern

**Centralized Registry:**
- All functions registered in one place
- Type-safe function definitions
- Automatic OpenAI schema generation
- Runtime validation

```typescript
// registry.ts
import { LeoraFunction } from './types';
import { getTopCustomersByRevenue } from './customers/getTopCustomers';
import { getCustomerDetails } from './customers/getCustomerDetails';
// ... import other functions

export const LEORA_FUNCTIONS: Record<string, LeoraFunction> = {
  getTopCustomersByRevenue,
  getCustomerDetails,
  searchCustomers,
  getOrdersByCustomer,
  getRecentOrders,
  getTopProductsBySales,
  getProductDetails,
  getTerritoryPerformance,
  compareTerritories,
  getRevenueTimeSeries,
  getCustomerSegmentation,
};

// Auto-generate OpenAI function definitions
export function getOpenAIFunctionDefinitions(): FunctionDefinition[] {
  return Object.values(LEORA_FUNCTIONS).map(fn => ({
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters,
  }));
}
```

### 5.3 Middleware Pipeline

```typescript
// middleware.ts
export async function executeWithMiddleware(
  functionName: string,
  params: Record<string, any>,
  authContext: AuthContext,
  prisma: PrismaClient
): Promise<FunctionExecutionResult> {
  const startTime = Date.now();

  try {
    // 1. Get function definition
    const fn = LEORA_FUNCTIONS[functionName];
    if (!fn) {
      throw new Error(`Function ${functionName} not found`);
    }

    // 2. Check role-based access
    if (fn.requiredRole && !hasRequiredRole(authContext, fn.requiredRole)) {
      return createAuthError(`This function requires ${fn.requiredRole} role`);
    }

    // 3. Check rate limits
    await checkRateLimit(authContext.userId, functionName, fn.rateLimit);

    // 4. Validate parameters
    const validatedParams = await validateParams(params, fn.parameters);

    // 5. Execute function
    const result = await fn.handler(validatedParams, authContext, prisma);

    // 6. Add metadata
    return {
      ...result,
      metadata: {
        ...result.metadata,
        executionTimeMs: Date.now() - startTime,
      }
    };

  } catch (error) {
    return handleExecutionError(error, functionName);
  }
}
```

### 5.4 Territory Filtering Helper

```typescript
// security.ts
export function getTerritoryFilter(authContext: AuthContext): any {
  if (authContext.role === 'admin') {
    // Admins see all territories in their tenant
    return {};
  }

  if (authContext.role === 'manager' || authContext.role === 'sales_rep') {
    // Filter to assigned territories
    return {
      territoryId: {
        in: authContext.territories || [],
      },
    };
  }

  // Default: no access
  return {
    territoryId: {
      in: [],
    },
  };
}

export async function validateCustomerAccess(
  customerId: string,
  authContext: AuthContext,
  prisma: PrismaClient
): Promise<boolean> {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      ...getTerritoryFilter(authContext),
    },
    select: { id: true },
  });

  return customer !== null;
}
```

### 5.5 OpenAI Integration

```typescript
// openai-integration.ts
import OpenAI from 'openai';

export async function processUserMessage(
  message: string,
  conversationHistory: Array<any>,
  authContext: AuthContext,
  prisma: PrismaClient
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Build messages array
  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(authContext),
    },
    ...conversationHistory,
    {
      role: 'user',
      content: message,
    },
  ];

  // Initial completion with function calling
  let response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    functions: getOpenAIFunctionDefinitions(),
    function_call: 'auto',
  });

  // Handle function calls (may be multiple rounds)
  let iterations = 0;
  const maxIterations = 5;

  while (response.choices[0].finish_reason === 'function_call' && iterations < maxIterations) {
    const functionCall = response.choices[0].message.function_call;

    // Execute function
    const functionResult = await executeWithMiddleware(
      functionCall.name,
      JSON.parse(functionCall.arguments),
      authContext,
      prisma
    );

    // Add function result to conversation
    messages.push({
      role: 'assistant',
      content: null,
      function_call: functionCall,
    });

    messages.push({
      role: 'function',
      name: functionCall.name,
      content: JSON.stringify(functionResult),
    });

    // Get next completion
    response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      functions: getOpenAIFunctionDefinitions(),
      function_call: 'auto',
    });

    iterations++;
  }

  return response.choices[0].message.content;
}

function buildSystemPrompt(authContext: AuthContext): string {
  return `You are Leora, an AI assistant for beverage alcohol distributors.

You help ${authContext.role === 'sales_rep' ? 'sales representatives' : 'administrators'}
analyze their sales data and answer questions about customers, orders, products, and performance.

You have access to various database query functions. Use them to answer user questions accurately.

Guidelines:
- Always use the most specific function for the user's question
- When showing financial data, format currency properly
- When showing dates, use readable formats
- Summarize large result sets rather than showing all data
- If a user asks for data you can't access, explain what you CAN show them
- Be concise but informative

Current user: ${authContext.role}
${authContext.territories ? `Assigned territories: ${authContext.territories.join(', ')}` : 'All territories'}`;
}
```

---

## 6. Example Function Implementation

### 6.1 Complete Function: `getTopCustomersByRevenue`

```typescript
// functions/customers/getTopCustomers.ts
import { z } from 'zod';
import { LeoraFunction, AuthContext, FunctionExecutionResult } from '../types';
import { getTerritoryFilter } from '../../utils/security';
import { PrismaClient } from '@prisma/client';

// Parameter validation schema
const GetTopCustomersSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  limit: z.number().int().min(1).max(100).default(10),
  territoryId: z.string().uuid().optional(),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: "startDate must be before endDate"
}).refine(data => {
  const daysDiff = (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 730;
}, {
  message: "Date range cannot exceed 2 years"
});

// Function handler
async function handler(
  params: Record<string, any>,
  authContext: AuthContext,
  prisma: PrismaClient
): Promise<FunctionExecutionResult> {
  // Validate params
  const validatedParams = GetTopCustomersSchema.parse(params);
  const { startDate, endDate, limit, territoryId } = validatedParams;

  // Build territory filter
  let territoryFilter = getTerritoryFilter(authContext);

  // If specific territory requested, validate access
  if (territoryId) {
    if (authContext.role !== 'admin' &&
        !authContext.territories?.includes(territoryId)) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have access to this territory',
          details: { territoryId },
        },
      };
    }
    territoryFilter = { territoryId };
  }

  // Execute query
  const customers = await prisma.customer.findMany({
    where: {
      ...territoryFilter,
      orders: {
        some: {
          tenantId: authContext.tenantId, // Tenant isolation
          orderedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          status: {
            in: ['confirmed', 'shipped', 'delivered'], // Exclude cancelled
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      accountNumber: true,
      territory: {
        select: {
          name: true,
        },
      },
      orders: {
        where: {
          tenantId: authContext.tenantId,
          orderedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          status: {
            in: ['confirmed', 'shipped', 'delivered'],
          },
        },
        select: {
          total: true,
        },
      },
    },
  });

  // Calculate revenue and sort
  const customersWithRevenue = customers
    .map(customer => ({
      customerId: customer.id,
      customerName: customer.name,
      accountNumber: customer.accountNumber,
      totalRevenue: customer.orders.reduce((sum, order) => sum + order.total, 0),
      orderCount: customer.orders.length,
      territory: customer.territory.name,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);

  return {
    success: true,
    data: {
      customers: customersWithRevenue,
      totalCount: customersWithRevenue.length,
    },
    metadata: {
      executionTimeMs: 0, // Will be set by middleware
      recordCount: customersWithRevenue.length,
    },
  };
}

// Function definition export
export const getTopCustomersByRevenue: LeoraFunction = {
  name: 'getTopCustomersByRevenue',
  description: 'Get the top customers ranked by total revenue for a specified date range. Useful for finding best customers, analyzing customer performance, or identifying key accounts.',
  parameters: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date for the analysis period (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)',
      },
      endDate: {
        type: 'string',
        description: 'End date for the analysis period (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)',
      },
      limit: {
        type: 'number',
        description: 'Number of top customers to return (1-100, default: 10)',
        default: 10,
      },
      territoryId: {
        type: 'string',
        description: 'Optional: Filter results to a specific territory. If not provided, uses all territories the user has access to.',
      },
    },
    required: ['startDate', 'endDate'],
  },
  handler,
  requiredRole: 'sales_rep', // Minimum role required
  rateLimit: {
    maxCallsPerMinute: 10,
    maxCallsPerHour: 100,
  },
};
```

### 6.2 Example Usage

```typescript
// Example API endpoint
import { Request, Response } from 'express';
import { executeWithMiddleware } from '../leora/executor';
import { getAuthContext } from '../auth/middleware';
import { prisma } from '../db';

export async function leoraChat(req: Request, res: Response) {
  const { message, conversationHistory } = req.body;

  // Get auth context from authenticated session
  const authContext = await getAuthContext(req);

  // Process message with OpenAI and function calling
  const response = await processUserMessage(
    message,
    conversationHistory || [],
    authContext,
    prisma
  );

  res.json({
    response,
    timestamp: new Date().toISOString(),
  });
}
```

---

## 7. Performance Optimization

### 7.1 Query Optimization

**Database Indexes Required:**
```sql
-- Customer queries
CREATE INDEX idx_customer_territory ON "Customer"("territoryId");
CREATE INDEX idx_customer_tenant ON "Customer"("tenantId");

-- Order queries
CREATE INDEX idx_order_customer_date ON "Order"("customerId", "orderedAt");
CREATE INDEX idx_order_tenant_date ON "Order"("tenantId", "orderedAt");
CREATE INDEX idx_order_status ON "Order"("status");

-- OrderItem queries
CREATE INDEX idx_orderitem_order ON "OrderItem"("orderId");
CREATE INDEX idx_orderitem_sku ON "OrderItem"("skuId");

-- Territory queries
CREATE INDEX idx_salesrep_territory ON "SalesRep"("territoryId");
```

### 7.2 Caching Strategy

**Cache Layers:**
1. **Function Result Cache**: Cache results for 5 minutes (Redis)
2. **Customer Lookup Cache**: Cache customer details for 1 hour
3. **Product Metadata Cache**: Cache product info for 24 hours
4. **Territory Assignment Cache**: Cache user territories for session duration

**Cache Keys:**
```typescript
function getCacheKey(functionName: string, params: any, authContext: AuthContext): string {
  return `leora:${authContext.tenantId}:${functionName}:${hashParams(params)}`;
}
```

### 7.3 Pagination

All functions returning lists should support pagination:
- Default limit: 50 records
- Maximum limit: 1000 records
- Include `hasMore` boolean in results
- Include `totalCount` when feasible (may be expensive for large datasets)

---

## 8. Testing Strategy

### 8.1 Unit Tests

Test each function handler independently:
- Valid inputs return expected results
- Invalid inputs return validation errors
- Tenant isolation is enforced
- Territory filtering works correctly
- Edge cases (empty results, large datasets)

### 8.2 Integration Tests

Test full function calling flow:
- OpenAI correctly selects functions
- Function execution returns results
- Results are properly formatted for AI consumption
- Multi-turn conversations work correctly

### 8.3 Security Tests

- Cross-tenant access attempts fail
- Territory boundary violations fail
- SQL injection attempts are blocked
- Rate limiting works correctly
- Role-based access control is enforced

### 8.4 Performance Tests

- Queries complete within timeout (10s)
- Large result sets don't cause memory issues
- Concurrent function calls don't degrade performance
- Database indexes are utilized

---

## 9. Monitoring & Observability

### 9.1 Metrics to Track

**Function-Level Metrics:**
- Call count per function
- Average execution time
- Error rate by error type
- Cache hit rate

**User-Level Metrics:**
- Function calls per user
- Most-used functions
- Error rate per user
- Query performance by territory size

**System-Level Metrics:**
- Total function calls per minute
- Database query latency
- OpenAI API latency
- Rate limit hits

### 9.2 Logging

**Structured Log Format:**
```typescript
{
  timestamp: "2024-01-15T10:30:00Z",
  level: "info",
  event: "function_execution",
  functionName: "getTopCustomersByRevenue",
  userId: "user_123",
  tenantId: "tenant_abc",
  executionTimeMs: 245,
  recordCount: 10,
  cached: false,
  parameters: {
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    limit: 10
  }
}
```

**Error Logging:**
```typescript
{
  timestamp: "2024-01-15T10:30:00Z",
  level: "error",
  event: "function_execution_error",
  functionName: "getCustomerDetails",
  userId: "user_123",
  tenantId: "tenant_abc",
  errorCode: "AUTHORIZATION_ERROR",
  errorMessage: "Customer not in user's territory",
  parameters: {
    customerId: "cust_456"
  }
}
```

---

## 10. Future Enhancements

### 10.1 Advanced Functions

**Predictive Analytics:**
- `predictCustomerChurn`: Identify at-risk customers
- `forecastRevenue`: Revenue forecasting based on historical trends
- `recommendProducts`: Product recommendations per customer

**Batch Operations:**
- `exportCustomerReport`: Generate CSV/Excel exports
- `scheduleReports`: Schedule recurring analytics reports

**Advanced Segmentation:**
- `rfmAnalysis`: Recency, Frequency, Monetary analysis
- `cohortAnalysis`: Customer cohort performance over time

### 10.2 Natural Language Enhancements

**Contextual Understanding:**
- Remember previous query context in conversation
- Support follow-up queries ("Show me orders from those customers")
- Automatic date range inference ("last month", "this quarter")

**Multi-Step Reasoning:**
- Chain multiple function calls automatically
- Combine data from multiple functions for complex answers

### 10.3 Security Enhancements

**Audit Trail:**
- Log all data access for compliance
- User consent for sensitive data access
- Data retention policies

**Advanced Authorization:**
- Fine-grained permissions (e.g., can view revenue but not customer emails)
- Customer-level access control
- Time-based access restrictions

---

## 11. Migration & Rollout Plan

### Phase 1: Core Functions (Week 1-2)
- Implement 3 customer functions
- Implement 2 order functions
- Basic security and validation
- Unit tests

### Phase 2: Extended Functions (Week 3-4)
- Implement product functions
- Implement territory functions
- Integration testing
- OpenAI integration

### Phase 3: Analytics & Polish (Week 5-6)
- Implement analytics functions
- Performance optimization
- Caching layer
- Monitoring and logging

### Phase 4: Beta Testing (Week 7-8)
- Internal testing with real users
- Bug fixes and refinements
- Documentation
- Training data collection

### Phase 5: Production Rollout (Week 9+)
- Gradual rollout to customers
- Monitor performance and errors
- Iterate based on feedback

---

## 12. Success Metrics

**User Engagement:**
- % of conversations using function calls
- Average functions per conversation
- User satisfaction scores

**Performance:**
- Average function execution time < 2s
- 99.9% uptime
- Error rate < 1%

**Business Impact:**
- Reduction in support tickets
- Time saved per user per day
- Feature adoption rate

---

## Appendix A: OpenAI Function Schema Examples

### Example 1: getTopCustomersByRevenue

```json
{
  "name": "getTopCustomersByRevenue",
  "description": "Get the top customers ranked by total revenue for a specified date range. Useful for finding best customers, analyzing customer performance, or identifying key accounts.",
  "parameters": {
    "type": "object",
    "properties": {
      "startDate": {
        "type": "string",
        "description": "Start date for the analysis period (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)"
      },
      "endDate": {
        "type": "string",
        "description": "End date for the analysis period (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)"
      },
      "limit": {
        "type": "number",
        "description": "Number of top customers to return (1-100, default: 10)",
        "default": 10
      },
      "territoryId": {
        "type": "string",
        "description": "Optional: Filter results to a specific territory. If not provided, uses all territories the user has access to."
      }
    },
    "required": ["startDate", "endDate"]
  }
}
```

### Example 2: searchCustomers

```json
{
  "name": "searchCustomers",
  "description": "Search for customers by name, account number, or email. Returns matching customers the user has access to.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search term (minimum 2 characters). Searches customer name, account number, and email."
      },
      "searchFields": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["name", "accountNumber", "email"]
        },
        "description": "Which fields to search in (default: all fields)"
      },
      "limit": {
        "type": "number",
        "description": "Maximum number of results to return (1-100, default: 20)",
        "default": 20
      }
    },
    "required": ["query"]
  }
}
```

---

## Appendix B: Error Handling Examples

### Authorization Error
```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "You don't have access to view this customer's data. This customer is in the 'Northeast' territory, but you only have access to 'Southeast' territory.",
    "details": {
      "customerId": "cust_123",
      "customerTerritory": "Northeast",
      "userTerritories": ["Southeast"]
    }
  }
}
```

### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date range: startDate must be before endDate",
    "details": {
      "field": "startDate",
      "provided": "2024-12-31",
      "constraint": "must be before endDate (2024-01-01)"
    }
  }
}
```

### Rate Limit Error
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "You've exceeded the rate limit for this function. Please wait 45 seconds before trying again.",
    "details": {
      "function": "getTopCustomersByRevenue",
      "limit": "10 calls per minute",
      "resetAt": "2024-01-15T10:31:00Z"
    }
  }
}
```

---

## Conclusion

This architecture provides a secure, scalable foundation for Leora's function calling capabilities. The design prioritizes:

1. **Security**: Multi-layer authorization with tenant and territory isolation
2. **Performance**: Optimized queries, caching, and pagination
3. **Extensibility**: Easy to add new functions as requirements evolve
4. **Reliability**: Comprehensive error handling and rate limiting
5. **Observability**: Detailed logging and metrics for monitoring

The modular structure allows for incremental implementation and testing, with clear interfaces that make it easy to add new capabilities over time.
