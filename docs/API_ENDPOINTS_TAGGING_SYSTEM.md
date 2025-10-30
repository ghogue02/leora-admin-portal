# Customer Tagging System API Endpoints

## Overview
This document describes the 6 API endpoints created for the customer tagging system. All endpoints follow the existing authentication patterns using `withSalesSession` and are located in `/Users/greghogue/Leora2/web/src/app/api/sales/`.

## Database Schema Assumption
The endpoints assume a `CustomerTag` table with the following structure:
```sql
CREATE TABLE "CustomerTag" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "tagType" VARCHAR NOT NULL,  -- e.g., 'eventType', 'region', 'segment'
  "tagValue" VARCHAR,           -- Optional value for the tag
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "removedAt" TIMESTAMP         -- For soft deletes
);
```

## Endpoints

### 1. Add Tag to Customer
**POST** `/api/sales/customers/[customerId]/tags`

**Request Body:**
```json
{
  "tagType": "eventType",
  "tagValue": "Wine Festival"  // Optional
}
```

**Response:**
```json
{
  "tag": {
    "id": "uuid",
    "tagType": "eventType",
    "tagValue": "Wine Festival",
    "createdAt": "2025-10-27T..."
  }
}
```

**Features:**
- Validates customer exists and belongs to tenant
- Prevents duplicate tags (same tagType + tagValue)
- Uses raw SQL for CustomerTag table operations
- Returns 409 conflict if tag already exists

**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/customers/[customerId]/tags/route.ts`

---

### 2. Remove Tag from Customer
**DELETE** `/api/sales/customers/[customerId]/tags/[tagId]`

**Response:**
```json
{
  "success": true,
  "message": "Tag removed successfully"
}
```

**Features:**
- Soft delete (sets `removedAt` timestamp)
- Validates tag exists and is active
- Validates customer exists and belongs to tenant
- Returns 404 if tag not found or already removed

**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/customers/[customerId]/tags/[tagId]/route.ts`

---

### 3. Get Customer Tags
**GET** `/api/sales/customers/[customerId]/tags`

**Response:**
```json
{
  "tags": [
    {
      "id": "uuid",
      "tagType": "eventType",
      "tagValue": "Wine Festival",
      "createdAt": "2025-10-27T..."
    }
  ]
}
```

**Features:**
- Returns only active tags (removedAt IS NULL)
- Ordered by tagType and createdAt
- Validates customer exists

**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/customers/[customerId]/tags/route.ts`

---

### 4. Revenue Ranking by Tag Type
**GET** `/api/sales/tags/[tagType]/revenue-ranking`

**Query Parameters:**
- `timeframe`: `ytd` | `last12m` | `alltime` (default: `ytd`)

**Example:** `/api/sales/tags/eventType/revenue-ranking?timeframe=ytd`

**Response:**
```json
{
  "tagType": "eventType",
  "timeframe": "ytd",
  "customers": [
    {
      "customerId": "uuid",
      "customerName": "Acme Wines",
      "accountNumber": "ACC123",
      "tagValue": "Wine Festival",
      "revenue": 125000.50,
      "orderCount": 45,
      "rank": 1
    }
  ]
}
```

**Features:**
- Ranks customers by revenue within a tag type
- Supports YTD, Last 12 Months, and All-Time timeframes
- Excludes permanently closed customers
- Excludes cancelled orders
- Uses SQL RANK() function for ranking

**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/tags/[tagType]/revenue-ranking/route.ts`

---

### 5. Event Sales Report
**GET** `/api/sales/reports/event-sales`

**Query Parameters:**
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Example:** `/api/sales/reports/event-sales?startDate=2025-01-01&endDate=2025-10-27`

**Response:**
```json
{
  "report": [
    {
      "eventType": "Wine Festival",
      "customerCount": 25,
      "orderCount": 150,
      "totalRevenue": 450000.00,
      "avgOrderValue": 3000.00
    },
    {
      "eventType": "Untagged",
      "customerCount": 100,
      "orderCount": 500,
      "totalRevenue": 1200000.00,
      "avgOrderValue": 2400.00
    }
  ],
  "summary": {
    "totalCustomers": 125,
    "totalOrders": 650,
    "totalRevenue": 1650000.00,
    "avgRevenuePerCustomer": 13200.00
  },
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-10-27"
  }
}
```

**Features:**
- Groups sales by event type (from CustomerTag where tagType = 'eventType')
- Shows customers without event tags as "Untagged"
- Optional date range filtering
- Calculates aggregates: customer count, order count, revenue, avg order value
- Excludes cancelled orders and permanently closed customers
- Provides summary totals

**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/reports/event-sales/route.ts`

---

### 6. Tag Performance Report
**GET** `/api/sales/reports/tag-performance`

**Query Parameters:**
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- `tagType`: Filter by specific tag type (optional)

**Example:** `/api/sales/reports/tag-performance?tagType=eventType&startDate=2025-01-01`

**Response:**
```json
{
  "performanceByType": [
    {
      "tagType": "eventType",
      "totalCustomers": 25,
      "totalRevenue": 450000.00,
      "avgRevenuePerCustomer": 18000.00,
      "tags": [
        {
          "tagValue": "Wine Festival",
          "customerCount": 15,
          "totalRevenue": 300000.00,
          "avgRevenuePerCustomer": 20000.00,
          "maxRevenue": 45000.00,
          "minRevenue": 5000.00
        }
      ]
    }
  ],
  "detailedPerformance": [...],
  "filters": {
    "startDate": "2025-01-01",
    "endDate": null,
    "tagType": "eventType"
  }
}
```

**Features:**
- Performance metrics by tag type and tag value
- Shows customer count, total revenue, avg revenue per customer
- Includes min/max revenue per tag value
- Groups results by tag type for easy comparison
- Optional filtering by date range and tag type
- Detailed and summary views

**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/reports/tag-performance/route.ts`

---

## Authentication & Authorization
All endpoints use `withSalesSession` which:
- Validates the sales session cookie
- Checks tenant isolation
- Verifies user has sales rep profile
- Provides `db`, `tenantId`, `session`, `roles`, and `permissions` in context

## Error Handling
All endpoints follow consistent error handling patterns:
- **400 Bad Request**: Invalid parameters
- **401 Unauthorized**: Missing or invalid session
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Customer or tag not found
- **409 Conflict**: Duplicate tag
- **500 Internal Server Error**: Database or server errors

## Database Queries
The endpoints use raw SQL (`$queryRaw` and `$executeRaw`) because the CustomerTag model is not yet defined in the Prisma schema. Once you add the CustomerTag model to `schema.prisma`, you can refactor these to use Prisma's type-safe client methods.

## Next Steps
1. **Add CustomerTag model to Prisma schema**:
   ```prisma
   model CustomerTag {
     id         String    @id @default(uuid()) @db.Uuid
     tenantId   String    @db.Uuid
     customerId String    @db.Uuid
     tagType    String
     tagValue   String?
     createdAt  DateTime  @default(now())
     removedAt  DateTime?

     customer Customer @relation(fields: [customerId], references: [id])
     tenant   Tenant   @relation(fields: [tenantId], references: [id])

     @@index([tenantId, customerId])
     @@index([tenantId, tagType])
     @@index([removedAt])
   }
   ```

2. **Run migration**:
   ```bash
   npx prisma migrate dev --name add_customer_tags
   ```

3. **Refactor endpoints** to use Prisma client instead of raw SQL

4. **Add tests** for each endpoint

5. **Create frontend components** to consume these APIs

## Testing Examples

### Add a tag:
```bash
curl -X POST http://localhost:3000/api/sales/customers/{customerId}/tags \
  -H "Content-Type: application/json" \
  -d '{"tagType": "eventType", "tagValue": "Wine Festival"}'
```

### Get customer tags:
```bash
curl http://localhost:3000/api/sales/customers/{customerId}/tags
```

### Remove a tag:
```bash
curl -X DELETE http://localhost:3000/api/sales/customers/{customerId}/tags/{tagId}
```

### Get revenue ranking:
```bash
curl http://localhost:3000/api/sales/tags/eventType/revenue-ranking?timeframe=ytd
```

### Get event sales report:
```bash
curl http://localhost:3000/api/sales/reports/event-sales?startDate=2025-01-01
```

### Get tag performance:
```bash
curl http://localhost:3000/api/sales/reports/tag-performance?tagType=eventType
```

---

## File Locations
All endpoint files are located in:
```
/Users/greghogue/Leora2/web/src/app/api/sales/
├── customers/
│   └── [customerId]/
│       └── tags/
│           ├── route.ts                    (POST, GET)
│           └── [tagId]/
│               └── route.ts                (DELETE)
├── tags/
│   └── [tagType]/
│       └── revenue-ranking/
│           └── route.ts                    (GET)
└── reports/
    ├── event-sales/
    │   └── route.ts                        (GET)
    └── tag-performance/
        └── route.ts                        (GET)
```
