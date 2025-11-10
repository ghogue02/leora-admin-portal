# Warehouse & Routing APIs

## Overview

This document describes the REST APIs for warehouse operations, pick sheet management, and delivery routing.

## Table of Contents

1. [Warehouse Configuration](#warehouse-configuration)
2. [Inventory Locations](#inventory-locations)
3. [Pick Sheets](#pick-sheets)
4. [Routing](#routing)
5. [Statistics](#statistics)

---

## Warehouse Configuration

### GET /api/warehouse/config

Get warehouse configuration for the current tenant.

**Response:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "aisleCount": 10,
  "rowsPerAisle": 20,
  "shelfLevels": 5,
  "pickStrategy": "SEQUENTIAL",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

### POST /api/warehouse/config

Create initial warehouse configuration.

**Request:**
```json
{
  "aisleCount": 10,
  "rowsPerAisle": 20,
  "shelfLevels": 5,
  "pickStrategy": "SEQUENTIAL"
}
```

**Response:** Same as GET

### PATCH /api/warehouse/config

Update warehouse configuration.

**Request:**
```json
{
  "aisleCount": 12,
  "pickStrategy": "ZONE"
}
```

**Response:** Updated configuration

---

## Inventory Locations

### GET /api/warehouse/inventory/locations

Get inventory items with location details.

**Query Parameters:**
- `search` (optional): Search by SKU code or product name
- `aisle` (optional): Filter by aisle
- `unassigned` (optional): `true` to show only items without locations
- `limit` (optional): Items per page (default: 100, max: 1000)
- `offset` (optional): Skip items (default: 0)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "skuId": "uuid",
      "location": "A3-R2-S5",
      "aisle": "A3",
      "row": "R2",
      "shelf": "S5",
      "bin": null,
      "pickOrder": 30205,
      "onHand": 50,
      "allocated": 10,
      "sku": {
        "code": "ABC123",
        "product": {
          "name": "Product Name"
        }
      }
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### PATCH /api/warehouse/inventory/locations

Bulk update inventory locations.

**Request:**
```json
{
  "updates": [
    {
      "id": "inventory-uuid",
      "aisle": "A3",
      "row": "R2",
      "shelf": "S5",
      "bin": "B1"
    }
  ]
}
```

**Response:**
```json
{
  "updated": 1,
  "errors": [],
  "total": 1
}
```

---

## Location Import

### POST /api/warehouse/locations/import

Import locations from CSV file.

**Request:** `multipart/form-data`
- `file`: CSV file with columns: SKU, Aisle, Row, Shelf, Bin (optional)

**CSV Format:**
```csv
SKU,Aisle,Row,Shelf,Bin
ABC123,A3,R2,S5,B1
DEF456,A3,R2,S6,
```

**Response:**
```json
{
  "imported": 2,
  "errors": [],
  "total": 2
}
```

---

## Pick Sheets

### GET /api/pick-sheets

List pick sheets with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (DRAFT, READY, PICKING, PICKED, CANCELLED)
- `startDate` (optional): Filter by creation date (ISO 8601)
- `endDate` (optional): Filter by creation date (ISO 8601)

**Response:**
```json
{
  "pickSheets": [
    {
      "id": "uuid",
      "sheetNumber": "PS-20250115-001",
      "status": "READY",
      "pickerName": "John Doe",
      "startedAt": null,
      "completedAt": null,
      "createdAt": "2025-01-15T08:00:00Z",
      "items": [
        {
          "id": "uuid",
          "skuId": "uuid",
          "customerId": "uuid",
          "quantity": 2,
          "location": "A3-R2-S5",
          "pickOrder": 30205,
          "isPicked": false,
          "sku": {
            "code": "ABC123",
            "product": {
              "name": "Product Name"
            }
          },
          "customer": {
            "name": "Customer Name"
          }
        }
      ]
    }
  ]
}
```

### POST /api/pick-sheets

Generate a new pick sheet from submitted orders.

**Request:**
```json
{
  "orderIds": ["order-uuid-1", "order-uuid-2"],
  "pickerName": "John Doe"
}
```

If `orderIds` is omitted, all eligible orders (SUBMITTED status, not on a sheet) will be included.

**Response:**
```json
{
  "pickSheet": {
    "id": "uuid",
    "sheetNumber": "PS-20250115-001",
    "status": "READY",
    "pickerName": "John Doe"
  },
  "itemCount": 15
}
```

### GET /api/pick-sheets/[sheetId]

Get pick sheet details.

**Response:** Same structure as individual pick sheet in list response

### PATCH /api/pick-sheets/[sheetId]

Update pick sheet status.

**Request:**
```json
{
  "action": "start",
  "pickerName": "John Doe"
}
```

**Actions:**
- `start`: READY → PICKING (sets startedAt, optional pickerName)
- `complete`: PICKING → PICKED (validates all items picked, sets completedAt)
- `cancel`: ANY → CANCELLED (restores order pickSheetStatus)

**Response:** Updated pick sheet

### DELETE /api/pick-sheets/[sheetId]

Delete a pick sheet (only if DRAFT or READY status).

**Response:**
```json
{
  "success": true
}
```

### PATCH /api/pick-sheets/[sheetId]/items/[itemId]

Mark an item as picked/unpicked.

**Request:**
```json
{
  "isPicked": true
}
```

**Response:** Updated pick sheet item

### GET /api/pick-sheets/[sheetId]/export

Export pick sheet as CSV or PDF.

**Query Parameters:**
- `format`: `csv` or `pdf` (default: `csv`)

**CSV Format:**
```csv
Pick Sheet,PS-20250115-001
Status,PICKING
Picker,John Doe
Date,2025-01-15

Item,Customer,Quantity,Location,Picked
Product Name,Customer Name,2,A-15-Top,☐
```

**Response:** File download

---

## Routing

### POST /api/routing/export

Export picked orders to Azuga CSV format.

**Request:**
```json
{
  "deliveryDate": "2025-01-16T00:00:00Z",
  "territoryFilter": "North"
}
```

**Response:** CSV file download

**Azuga CSV Format:**
```csv
CustomerName,Street,City,State,Zip,OrderNumber,DeliveryDate,Priority,Notes
"Customer Name","123 Main St","City","ST","12345","abc123de","01/16/2025","NORMAL","Order abc123de - Total: $500"
```

### POST /api/routing/import

Import optimized route from Azuga CSV.

**Request:** `multipart/form-data`
- `file`: Azuga route CSV
- `routeName`: Route identifier
- `deliveryDate`: Delivery date (ISO 8601)
- `driverName` (optional): Driver name

**Response:**
```json
{
  "route": {
    "id": "uuid",
    "routeName": "Route-001",
    "driverName": "Jane Smith",
    "deliveryDate": "2025-01-16T00:00:00Z",
    "status": "PLANNED"
  },
  "stops": 15
}
```

### GET /api/routes/today

Get all delivery routes for today.

**Response:**
```json
{
  "routes": [
    {
      "id": "uuid",
      "routeName": "Route-001",
      "driverName": "Jane Smith",
      "deliveryDate": "2025-01-15T00:00:00Z",
      "status": "IN_PROGRESS",
      "stops": [
        {
          "id": "uuid",
          "stopNumber": 1,
          "estimatedTime": "2025-01-15T09:00:00Z",
          "actualTime": "2025-01-15T09:05:00Z",
          "status": "DELIVERED",
          "customer": {
            "name": "Customer Name"
          },
          "order": {
            "id": "uuid",
            "total": "500.00"
          }
        }
      ]
    }
  ],
  "date": "2025-01-15T00:00:00Z"
}
```

### GET /api/routes/customer/[customerId]

Get upcoming delivery information for a customer.

**Response:**
```json
{
  "customer": {
    "id": "uuid",
    "name": "Customer Name"
  },
  "nextDelivery": {
    "eta": "2025-01-16T10:30:00Z",
    "routeName": "Route-002",
    "driverName": "Jane Smith",
    "stopNumber": 3,
    "status": "PENDING"
  },
  "upcomingStops": [...]
}
```

---

## Statistics

### GET /api/warehouse/stats

Get warehouse statistics.

**Response:**
```json
{
  "totalItems": 1500,
  "itemsWithLocations": 1350,
  "coveragePercent": 90,
  "pickSheetsPending": 3,
  "avgPickTime": 45
}
```

**Fields:**
- `totalItems`: Total inventory items
- `itemsWithLocations`: Items with assigned warehouse locations
- `coveragePercent`: Percentage of items with locations
- `pickSheetsPending`: Pick sheets in READY or PICKING status
- `avgPickTime`: Average pick time in minutes (last 10 completed sheets)

---

## Error Responses

All APIs use standard error format:

```json
{
  "error": "Error message",
  "details": [...]
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error
- `501`: Not Implemented

---

## Database Models

### WarehouseConfig
- `id`: UUID
- `tenantId`: UUID (unique)
- `aisleCount`: Integer
- `rowsPerAisle`: Integer
- `shelfLevels`: Integer
- `pickStrategy`: SEQUENTIAL | ZONE | WAVE

### Inventory (Extended)
- Added fields: `aisle`, `row`, `shelf`, `bin`, `pickOrder`
- `pickOrder`: Auto-calculated as (aisle × 10000) + (row × 100) + shelf

### PickSheet
- `id`: UUID
- `sheetNumber`: String (auto-generated: PS-YYYYMMDD-NNN)
- `status`: DRAFT | READY | PICKING | PICKED | CANCELLED
- `pickerName`: String (optional)
- `startedAt`, `completedAt`: DateTime

### PickSheetItem
- `id`: UUID
- `pickSheetId`: UUID
- `orderLineId`: UUID
- `skuId`, `customerId`: UUID
- `quantity`: Integer
- `location`: String
- `pickOrder`: Integer
- `isPicked`: Boolean
- `pickedAt`: DateTime

### Order (Extended)
- Added field: `pickSheetStatus`: NONE | ON_SHEET | PICKED

### DeliveryRoute
- `id`: UUID
- `routeName`: String
- `driverName`: String
- `deliveryDate`: DateTime
- `status`: PLANNED | IN_PROGRESS | COMPLETED | CANCELLED

### RouteStop
- `id`: UUID
- `routeId`: UUID
- `orderId`, `customerId`: UUID
- `stopNumber`: Integer
- `estimatedTime`, `actualTime`: DateTime
- `status`: PENDING | IN_TRANSIT | DELIVERED | FAILED
- `deliveryNotes`: String

### RouteExport
- `id`: UUID
- `deliveryDate`: DateTime
- `status`: PENDING | EXPORTED | IMPORTED
- `orderCount`: Integer
- `csvData`: Text

---

## Workflow Examples

### 1. Complete Pick Sheet Workflow

```
1. POST /api/pick-sheets
   → Generates pick sheet from submitted orders
   → Orders marked as ON_SHEET

2. GET /api/pick-sheets/[sheetId]
   → Retrieve pick sheet details
   → Items sorted by pickOrder

3. PATCH /api/pick-sheets/[sheetId]
   → action: "start"
   → Status: READY → PICKING

4. PATCH /api/pick-sheets/[sheetId]/items/[itemId]
   → Mark items as picked (repeat for each item)

5. PATCH /api/pick-sheets/[sheetId]
   → action: "complete"
   → Status: PICKING → PICKED

6. GET /api/pick-sheets/[sheetId]/export?format=csv
   → Download completed pick sheet
```

### 2. Route Export/Import Workflow

```
1. POST /api/routing/export
   → Export picked orders to Azuga CSV
   → Returns CSV for Azuga optimization

2. [External: Optimize route in Azuga]

3. POST /api/routing/import
   → Import optimized route CSV
   → Creates DeliveryRoute with RouteStops

4. GET /api/routes/today
   → View today's delivery routes

5. GET /api/routes/customer/[customerId]
   → Customer checks delivery ETA
```

---

## Performance Considerations

- **Concurrent Requests**: All APIs support concurrent requests with proper transaction handling
- **Bulk Operations**: Use bulk location update for efficiency
- **Caching**: Warehouse config and stats can be cached client-side
- **Indexing**: All queries use database indexes for optimal performance
- **Typical Response Times**: <300ms for standard operations

---

## Security

- All APIs require authentication via the sales/admin session middleware
- Tenant isolation enforced at database level
- CSRF protection handled at the framework/middleware layer
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM

---

## Integration Notes

### Azuga Integration
- Export format matches Azuga CSV import specification
- Import accepts Azuga-optimized route CSV
- Preserves order references for tracking

### Inventory Integration
- Uses existing Inventory model with location extensions
- Compatible with Phase 2 inventory management
- Pick order calculation uses warehouse.ts utilities

### Order Integration
- Tracks order lifecycle with pickSheetStatus
- Links orders to route stops for delivery tracking
- Maintains order history through audit logs
