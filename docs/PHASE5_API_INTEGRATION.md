# Phase 5 API Integration

**Phase:** Operations & Warehouse Management
**Date:** 2025-10-25
**Status:** Integration Documentation

---

## Overview

Phase 5 introduces 11 new API routes for warehouse operations, pick sheet management, and delivery routing. This document ensures all APIs integrate consistently with existing Phases 1-3.

---

## 1. New API Routes (11 Total)

### 1.1 Warehouse Location Management

#### `GET /api/warehouse/locations`
**Purpose:** List all warehouse locations with filtering
**Auth:** Required
**Permissions:** `warehouse.view`

**Query Parameters:**
```typescript
{
  zone?: string;        // Filter by zone (A, B, C)
  isActive?: boolean;   // Filter active/inactive
  search?: string;      // Search aisle/section
  page?: number;        // Pagination
  limit?: number;       // Page size
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    locations: WarehouseLocation[],
    total: number,
    page: number,
    pages: number
  }
}
```

---

#### `POST /api/warehouse/locations`
**Purpose:** Create new warehouse location
**Auth:** Required
**Permissions:** `warehouse.manage`

**Request Body:**
```typescript
{
  zone: string;         // "A", "B", "C"
  aisle: string;        // "01", "02"
  section: string;      // "A", "B"
  shelf: number;        // 1, 2, 3, 4
  bin?: string;         // Optional
  capacity?: number;    // Max units
  notes?: string;
}
```

**Validation:**
- Zone must be 1 uppercase letter
- Aisle must be 2 digits (01-99)
- Section must be 1 uppercase letter
- Shelf must be positive integer
- Unique combination check

**Response:**
```typescript
{
  success: true,
  data: {
    location: WarehouseLocation,
    pickOrder: number  // Auto-calculated
  }
}
```

---

#### `PUT /api/warehouse/locations/:id`
**Purpose:** Update warehouse location
**Auth:** Required
**Permissions:** `warehouse.manage`

---

#### `DELETE /api/warehouse/locations/:id`
**Purpose:** Soft-delete location (set isActive = false)
**Auth:** Required
**Permissions:** `warehouse.manage`

---

### 1.2 Warehouse Zones

#### `GET /api/warehouse/zones`
**Purpose:** List warehouse zones
**Auth:** Required
**Permissions:** `warehouse.view`

#### `POST /api/warehouse/zones`
**Purpose:** Create warehouse zone
**Auth:** Required
**Permissions:** `warehouse.admin`

**Request Body:**
```typescript
{
  name: string;         // "A", "B", "C"
  description?: string; // "Red Wine Storage"
  color?: string;       // "#FF5733"
  startOrder: number;   // 1000
  endOrder: number;     // 1999
}
```

---

### 1.3 Bulk Location Import

#### `POST /api/warehouse/bulk-import`
**Purpose:** Bulk import locations from CSV
**Auth:** Required
**Permissions:** `warehouse.admin`

**Request:**
```typescript
Content-Type: multipart/form-data
Body: FormData with 'file' field (CSV)
```

**CSV Format:**
```csv
zone,aisle,section,shelf,bin,capacity,notes
A,01,A,1,,100,Top shelf
A,01,A,2,,100,
```

**Response:**
```typescript
{
  success: true,
  data: {
    imported: number,
    skipped: number,
    errors: Array<{
      row: number,
      error: string
    }>
  }
}
```

---

### 1.4 Pick Sheet Management

#### `GET /api/operations/pick-sheets`
**Purpose:** List pick sheets with filtering
**Auth:** Required
**Permissions:** `operations.view`

**Query Parameters:**
```typescript
{
  status?: PickSheetStatus;
  deliveryDate?: string;  // ISO date
  deliveryWeek?: number;
  assignedTo?: string;
  page?: number;
  limit?: number;
}
```

---

#### `POST /api/operations/pick-sheets`
**Purpose:** Generate new pick sheet for delivery date
**Auth:** Required
**Permissions:** `operations.manage`

**Request Body:**
```typescript
{
  deliveryDate: string;     // ISO date
  deliveryWeek?: number;    // Optional
  orderIds?: string[];      // Specific orders, or auto-select
  assignedTo?: string;      // Picker name
  notes?: string;
}
```

**Process:**
1. Find all SUBMITTED orders for delivery date
2. Allocate inventory from warehouse locations
3. Sort items by pickOrder (warehouse path optimization)
4. Create PickSheet and PickSheetItems
5. Update inventory allocations

**Response:**
```typescript
{
  success: true,
  data: {
    pickSheet: PickSheet,
    items: PickSheetItem[],
    totalItems: number,
    totalQuantity: number,
    estimatedPickTime: number  // minutes
  }
}
```

---

#### `GET /api/operations/pick-sheets/:id`
**Purpose:** Get pick sheet details
**Auth:** Required
**Permissions:** `operations.view`

**Response:**
```typescript
{
  success: true,
  data: {
    pickSheet: PickSheet,
    items: PickSheetItem[], // Sorted by pickOrder
    progress: {
      total: number,
      picked: number,
      remaining: number,
      percentComplete: number
    }
  }
}
```

---

#### `PUT /api/operations/pick-sheets/:id`
**Purpose:** Update pick sheet (assign picker, add notes)
**Auth:** Required
**Permissions:** `operations.manage`

---

#### `POST /api/operations/pick-sheets/:id/items`
**Purpose:** Mark items as picked
**Auth:** Required
**Permissions:** `operations.manage`

**Request Body:**
```typescript
{
  itemIds: string[];    // PickSheetItem IDs
  pickedBy: string;     // Picker name
  notes?: string;
}
```

---

#### `POST /api/operations/pick-sheets/:id/complete`
**Purpose:** Mark entire pick sheet as complete
**Auth:** Required
**Permissions:** `operations.manage`

**Validation:**
- All items must be picked
- Status must be IN_PROGRESS

**Response:**
```typescript
{
  success: true,
  data: {
    pickSheet: PickSheet,
    completedAt: string,
    totalTime: number  // minutes from start to completion
  }
}
```

---

#### `GET /api/operations/pick-sheets/:id/csv`
**Purpose:** Export pick sheet to CSV for printing/mobile
**Auth:** Required
**Permissions:** `operations.view`

**Response:**
```csv
Pick Order,Zone,Aisle,Section,Shelf,SKU,Product,Quantity,Customer,Order#
1001,A,01,A,1,SKU-001,Chardonnay 2023,6,Acme Wine Bar,ORD-12345
```

---

### 1.5 Delivery Routing

#### `GET /api/routing/routes`
**Purpose:** List delivery routes
**Auth:** Required
**Permissions:** `routing.view`

**Query Parameters:**
```typescript
{
  status?: RouteStatus;
  deliveryDate?: string;
  deliveryWeek?: number;
  driverName?: string;
  page?: number;
  limit?: number;
}
```

---

#### `POST /api/routing/routes`
**Purpose:** Create new delivery route
**Auth:** Required
**Permissions:** `routing.manage`

**Request Body:**
```typescript
{
  routeName: string;
  deliveryDate: string;
  deliveryWeek?: number;
  driverName?: string;
  driverPhone?: string;
  vehicleId?: string;
  orderIds: string[];       // Orders to include
  optimizeRoute?: boolean;  // Auto-optimize stop sequence
}
```

**Process:**
1. Create DeliveryRoute
2. Create RouteStops for each order
3. If optimizeRoute=true, calculate optimal sequence
4. Assign stop numbers (1, 2, 3...)

---

#### `GET /api/routing/routes/:id`
**Purpose:** Get route details with stops
**Auth:** Required
**Permissions:** `routing.view`

**Response:**
```typescript
{
  success: true,
  data: {
    route: DeliveryRoute,
    stops: RouteStop[],  // Sorted by stopNumber
    metrics: {
      totalStops: number,
      completedStops: number,
      remainingStops: number,
      estimatedMiles: number,
      estimatedTime: number
    }
  }
}
```

---

#### `PUT /api/routing/routes/:id/stops`
**Purpose:** Reorder route stops (optimize sequence)
**Auth:** Required
**Permissions:** `routing.manage`

**Request Body:**
```typescript
{
  stops: Array<{
    stopId: string,
    stopNumber: number  // New sequence
  }>
}
```

---

### 1.6 Azuga Integration

#### `POST /api/routing/azuga/export`
**Purpose:** Export routes to Azuga-compatible format
**Auth:** Required
**Permissions:** `routing.azuga`

**Request Body:**
```typescript
{
  routeIds: string[];   // Routes to export
  format?: string;      // 'json' | 'csv'
}
```

**Response (JSON):**
```typescript
{
  success: true,
  data: {
    routes: Array<{
      routeId: string,
      routeName: string,
      driverName: string,
      deliveryDate: string,
      stops: Array<{
        stopNumber: number,
        customerName: string,
        address: string,
        scheduledTime: string,
        orderId: string
      }>
    }>
  }
}
```

**Response (CSV):**
```csv
Route ID,Route Name,Driver,Date,Stop#,Customer,Address,City,State,ZIP,Scheduled Time,Order ID
RTI-001,Route A,John,2025-01-25,1,Acme Wine,123 Main St,Portland,OR,97201,09:00,ORD-001
```

---

#### `POST /api/routing/azuga/import`
**Purpose:** Import route updates from Azuga
**Auth:** Required
**Permissions:** `routing.azuga`

**Request:**
```typescript
Content-Type: multipart/form-data
Body: FormData with 'file' field (CSV from Azuga)
```

**CSV Format (from Azuga):**
```csv
Route ID,Stop#,Arrival Time,Departure Time,Completed
RTI-001,1,2025-01-25T09:05:00,2025-01-25T09:15:00,true
```

**Process:**
1. Parse CSV
2. Match routeId and stopNumber
3. Update RouteStop with actual times
4. Mark stops as completed

---

## 2. Shared API Patterns

### 2.1 Authentication Middleware

All routes use:
```typescript
import { getServerSession } from '@/lib/auth/session';
import { getTenantId } from '@/lib/tenant';

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tenantId = getTenantId(session);
  // ...
}
```

---

### 2.2 Error Handling

Standardized error responses:
```typescript
import { handleApiError } from '@/lib/api/errors';

try {
  // ... operation
} catch (error) {
  return handleApiError(error);
}

// Returns:
{
  success: false,
  error: {
    message: string,
    code?: string,
    details?: any
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid input
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - No auth
- `FORBIDDEN` - No permission
- `CONFLICT` - Duplicate/conflict
- `INTERNAL_ERROR` - Server error

---

### 2.3 Validation

All routes use Zod schemas:
```typescript
import { z } from 'zod';

const createLocationSchema = z.object({
  zone: z.string().length(1).regex(/^[A-Z]$/),
  aisle: z.string().length(2).regex(/^\d{2}$/),
  section: z.string().length(1).regex(/^[A-Z]$/),
  shelf: z.number().int().positive(),
  bin: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  notes: z.string().optional()
});

const body = await request.json();
const validated = createLocationSchema.parse(body);
```

---

### 2.4 Rate Limiting

Applied to sensitive operations:
```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const limited = await rateLimit(request, {
    maxRequests: 10,
    windowMs: 60000  // 10 requests per minute
  });

  if (limited) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  // ...
}
```

**Rate Limits:**
- Bulk import: 5/hour
- Pick sheet generation: 20/hour
- Route export: 10/hour
- Normal CRUD: 100/minute

---

### 2.5 Audit Logging

All sensitive operations logged:
```typescript
import { auditLog } from '@/lib/audit-log';

await auditLog({
  tenantId,
  userId: session.user.id,
  action: 'CREATE',
  entityType: 'PickSheet',
  entityId: pickSheet.id,
  changes: {
    deliveryDate: pickSheet.deliveryDate,
    totalItems: pickSheet.totalItems
  },
  metadata: {
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent')
  }
});
```

**Logged Operations:**
- Pick sheet create/update/complete
- Warehouse location create/update/delete
- Route create/update/export
- Bulk operations

---

## 3. API Consistency Checklist

- [x] All routes use tenant isolation (`WHERE tenantId = ?`)
- [x] All routes use authentication middleware
- [x] Error handling uses `handleApiError()`
- [x] Response format standardized (`{ success, data/error }`)
- [x] Validation uses Zod schemas
- [x] Rate limiting on sensitive operations
- [x] Audit logging for important actions
- [x] CORS configured correctly
- [x] Pagination consistent (page/limit)
- [x] Timestamps always ISO 8601
- [x] UUIDs for all IDs
- [x] Soft deletes (isActive flag)

---

## 4. Integration with Existing APIs

### 4.1 Orders API (`/api/sales/admin/orders`)

**Changes:**
- Orders now can be assigned to routes
- Orders can trigger pick sheet generation
- Order status includes warehouse/routing info

**New Response Fields:**
```typescript
{
  order: {
    // ... existing fields
    deliveryRouteId?: string,
    pickSheetId?: string,
    warehouseStatus?: 'pending' | 'picking' | 'picked' | 'shipped'
  }
}
```

---

### 4.2 Inventory API (`/api/admin/inventory`)

**Changes:**
- Inventory now tracks warehouse locations
- Allocation considers pick sheet reservations

**New Response Fields:**
```typescript
{
  inventory: {
    // ... existing fields
    locationId?: string,
    location?: {
      zone: string,
      aisle: string,
      section: string,
      shelf: number,
      pickOrder: number
    },
    allocated: number,  // Including pick sheet allocations
    available: number   // onHand - allocated
  }
}
```

---

### 4.3 Customer API

**Changes:**
- Customers can view route delivery times

**New Endpoint:**
```typescript
GET /api/portal/customers/:id/delivery-schedule

Response: {
  upcomingDeliveries: Array<{
    date: string,
    routeName: string,
    estimatedTime: string,
    orderId: string
  }>
}
```

---

## 5. Shared Utilities

### 5.1 Tenant Isolation

```typescript
// lib/api/tenant.ts
export function getTenantId(session: Session): string {
  return session.user.tenantId;
}

export function validateTenantAccess(
  resourceTenantId: string,
  sessionTenantId: string
): void {
  if (resourceTenantId !== sessionTenantId) {
    throw new Error('FORBIDDEN: Cross-tenant access denied');
  }
}
```

---

### 5.2 Permission Checking

```typescript
// lib/api/permissions.ts
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const hasPermission = await prisma.rolePermission.findFirst({
    where: {
      role: {
        userRoles: {
          some: { userId }
        }
      },
      permission: { code: permission }
    }
  });
  return !!hasPermission;
}
```

---

### 5.3 Database Transactions

```typescript
// lib/api/transactions.ts
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await callback(tx);
  });
}
```

**Used For:**
- Pick sheet generation (create sheet + items + allocate inventory)
- Route creation (create route + stops + assign orders)
- Bulk operations

---

## 6. API Documentation

### 6.1 OpenAPI/Swagger

Generate OpenAPI spec:
```typescript
// scripts/generate-api-docs.ts
import { generateOpenAPI } from '@/lib/api/openapi';

const spec = generateOpenAPI({
  routes: [
    '/api/warehouse/locations',
    '/api/operations/pick-sheets',
    '/api/routing/routes',
    // ... all routes
  ]
});
```

---

### 6.2 Postman Collection

Export Postman collection:
```json
{
  "info": {
    "name": "Leora Phase 5 - Operations & Warehouse",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Warehouse",
      "item": [
        {
          "name": "List Locations",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/warehouse/locations"
          }
        }
        // ... all endpoints
      ]
    }
  ]
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

Test each API route independently:
```typescript
// __tests__/api/warehouse/locations.test.ts
describe('GET /api/warehouse/locations', () => {
  it('returns locations for tenant', async () => {
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.locations).toHaveLength(5);
  });

  it('filters by zone', async () => {
    // ...
  });

  it('requires authentication', async () => {
    // ...
  });
});
```

---

### 7.2 Integration Tests

Test cross-API workflows:
```typescript
// __tests__/integration/pick-sheet-workflow.test.ts
describe('Pick Sheet Workflow', () => {
  it('generates pick sheet from orders', async () => {
    // 1. Create orders
    // 2. Generate pick sheet
    // 3. Verify inventory allocated
    // 4. Verify items sorted by pickOrder
  });

  it('completes pick sheet and releases inventory', async () => {
    // ...
  });
});
```

---

## Summary

**Total New Routes:** 11
**Authentication:** All routes protected
**Tenant Isolation:** Enforced on all routes
**Error Handling:** Standardized
**Validation:** Zod schemas
**Rate Limiting:** Applied to sensitive operations
**Audit Logging:** Implemented for critical actions
**Documentation:** OpenAPI + Postman
**Testing:** Unit + Integration tests

**Status:** API design complete, ready for implementation

---

**Last Updated:** 2025-10-25
**Reviewed By:** Integration Coordinator
**Approval Status:** Pending agent implementation
