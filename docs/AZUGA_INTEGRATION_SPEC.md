# Azuga Integration Technical Specification

## Overview

This document provides the technical specification for integrating Leora with Azuga's route optimization platform via CSV file exchange.

**Integration Type:** File-based (CSV import/export)
**Data Flow:** Bidirectional (Leora → Azuga → Leora)
**Update Frequency:** On-demand (manual or automated daily)
**Authentication:** Not required for file-based integration

---

## Integration Architecture

```
Leora System                    Azuga Platform
     ↓                               ↓
  Orders (PICKED)              Route Optimizer
     ↓                               ↓
  Export CSV ──────────────→  Import Stops
                                     ↓
                              Optimize Routes
                                     ↓
                              Export Routes
                                     ↓
  Import CSV ←──────────────  Download CSV
     ↓
  Create Routes
  Assign Drivers
  Track Deliveries
```

---

## Export Format (Leora → Azuga)

### File Specification

**File Name:** `azuga_export_YYYY-MM-DD.csv`
**Encoding:** UTF-8 (BOM optional)
**Line Endings:** CRLF (Windows) or LF (Unix)
**Delimiter:** Comma (`,`)
**Quote Character:** Double quote (`"`)
**Header Row:** Yes (required)

### Column Definitions

| Column | Type | Required | Max Length | Description | Example |
|--------|------|----------|------------|-------------|---------|
| `customer_name` | String | Yes | 100 | Business name | Wine Bar XYZ |
| `address` | String | Yes | 200 | Street address | 123 Main St |
| `city` | String | Yes | 50 | City name | San Francisco |
| `state` | String | Yes | 2 | State code (uppercase) | CA |
| `zip` | String | Yes | 10 | ZIP or ZIP+4 | 94102 or 94102-1234 |
| `phone` | String | Yes | 20 | Phone number | 415-555-1234 |
| `email` | String | No | 100 | Contact email | manager@winebar.com |
| `delivery_date` | Date | Yes | 10 | ISO 8601 date | 2024-10-26 |
| `time_window_start` | Time | No | 5 | HH:MM (24-hour) | 09:00 |
| `time_window_end` | Time | No | 5 | HH:MM (24-hour) | 12:00 |
| `order_id` | String | Yes | 50 | Leora order ID | ORD-2024-001 |
| `order_value` | Decimal | No | - | Order total (USD) | 1250.00 |
| `special_instructions` | String | No | 500 | Delivery notes | Back door delivery |
| `contact_person` | String | No | 100 | Contact name | John Smith |
| `priority` | Integer | No | 1 | 1=High, 2=Normal, 3=Low | 1 |
| `service_time` | Integer | No | 3 | Minutes at stop | 15 |

### Data Validation Rules

**customer_name:**
- Non-empty
- Trim whitespace
- Escape double quotes (replace `"` with `""`)

**address:**
- Non-empty
- Should geocode successfully
- Do not include city/state/zip (separate columns)
- Example: "123 Main St Apt 4B" ✓
- Example: "123 Main St, San Francisco, CA" ✗

**state:**
- Two-letter uppercase code
- Must be valid US state/territory
- Examples: CA, NY, TX, PR, DC

**zip:**
- 5-digit: 94102 ✓
- 9-digit (ZIP+4): 94102-1234 ✓
- Validate format (not real ZIP lookup)

**phone:**
- Accept various formats:
  - 4155551234
  - 415-555-1234
  - (415) 555-1234
  - +1-415-555-1234
- Store in E.164 format if possible

**email:**
- Valid email format (RFC 5322)
- Optional but recommended

**delivery_date:**
- ISO 8601 format: YYYY-MM-DD
- Must be today or future date
- Example: 2024-10-26 ✓
- Example: 10/26/2024 ✗

**time_window_start / time_window_end:**
- 24-hour format: HH:MM
- Start must be before end
- If start provided, end required
- Examples: 09:00, 14:30, 23:59
- If omitted, Azuga optimizes freely

**order_id:**
- Unique identifier
- Used to match back to Leora on import
- Must not change between export/import
- Case-sensitive

**order_value:**
- Decimal with 2 decimal places
- No currency symbol
- Example: 1250.00 ✓
- Example: $1,250 ✗

**special_instructions:**
- Free text
- Escape commas and quotes
- Limit to 500 characters
- Examples:
  - "Use back door, ring twice"
  - "COD: $1,250 cash only"
  - "Fragile: Handle with care"

**priority:**
- 1 = High priority (deliver first)
- 2 = Normal priority (default)
- 3 = Low priority (deliver last)
- Azuga uses this as optimization hint

**service_time:**
- Estimated minutes at stop
- Includes: parking, unloading, signature, chat
- Default: 15 minutes
- Adjust based on order size:
  - < 10 bottles: 10 minutes
  - 10-50 bottles: 15 minutes
  - 50+ bottles: 20-30 minutes

### Example Export CSV

```csv
customer_name,address,city,state,zip,phone,email,delivery_date,time_window_start,time_window_end,order_id,order_value,special_instructions,contact_person,priority,service_time
Wine Bar XYZ,123 Main St,San Francisco,CA,94102,415-555-1234,manager@winebar.com,2024-10-26,09:00,12:00,ORD-2024-001,1250.00,Back door delivery. Ring buzzer.,John Smith,1,15
Restaurant ABC,456 Oak Ave,Oakland,CA,94610,510-555-5678,owner@restaurant.com,2024-10-26,14:00,17:00,ORD-2024-002,850.50,Call 30 mins before arrival,Jane Doe,2,20
Bistro 456,789 Pine St,San Francisco,CA,94103,415-555-9012,bistro@example.com,2024-10-26,,,ORD-2024-003,450.00,,Manager,2,10
"Cafe ""Vino""",321 Elm St,Berkeley,CA,94704,510-555-3456,cafe@example.com,2024-10-26,10:00,13:00,ORD-2024-004,1580.25,"Large order, help with stairs",Reception,1,25
```

**Notes:**
- Row 1: Standard delivery with time window
- Row 2: Call-ahead requirement
- Row 3: No time window (Azuga optimizes)
- Row 4: Business name with quotes (escaped), multi-line instructions

---

## Import Format (Azuga → Leora)

### File Specification

**File Name:** `azuga_optimized_YYYY-MM-DD.csv`
**Encoding:** UTF-8
**Line Endings:** Any (CRLF/LF)
**Delimiter:** Comma (`,`)
**Quote Character:** Double quote (`"`)
**Header Row:** Yes (required)

### Column Definitions

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `route_name` | String | Yes | Route identifier | Route 1 |
| `stop_number` | Integer | Yes | Stop # (1-based) | 1 |
| `sequence` | Integer | Yes | Optimized sequence | 1 |
| `customer_name` | String | Yes | Business name | Wine Bar XYZ |
| `address` | String | Yes | Full address | 123 Main St San Francisco CA 94102 |
| `estimated_arrival` | Time | Yes | ETA (HH:MM) | 09:15 |
| `estimated_departure` | Time | No | Depart time | 09:30 |
| `estimated_duration` | Integer | Yes | Minutes at stop | 15 |
| `order_id` | String | Yes | Leora order ID | ORD-2024-001 |
| `driver_assigned` | String | No | Driver name | John Doe |
| `route_start_time` | Time | Yes | Route begins | 08:00 |
| `route_end_time` | Time | No | Route ends (est.) | 12:30 |
| `total_distance` | Decimal | No | Route miles | 35.4 |
| `total_duration` | Integer | No | Route minutes | 255 |
| `latitude` | Decimal | No | Stop latitude | 37.7749 |
| `longitude` | Decimal | No | Stop longitude | -122.4194 |

### Data Validation Rules

**route_name:**
- Non-empty
- Groups stops into routes
- Examples: "Route 1", "North Bay Route", "John's Route"

**stop_number:**
- Integer ≥ 1
- Sequential per route (1, 2, 3, ...)
- Can reset for each new route

**sequence:**
- Integer ≥ 1
- Optimized order of stops
- Usually matches stop_number (after optimization)

**customer_name:**
- Must match export (for verification)
- Used for display only (not matching)

**address:**
- Full address (single string)
- May include apartment, suite, etc.
- Used for geocoding/mapping

**estimated_arrival:**
- HH:MM (24-hour format)
- Calculated by Azuga based on:
  - Route start time
  - Travel time
  - Previous stop durations
- Example: 09:15 (arrives at 9:15 AM)

**estimated_departure:**
- Optional (calculated as arrival + duration)
- If provided, used for ETA calculations

**estimated_duration:**
- Minutes at stop
- Should match `service_time` from export
- Or Azuga's calculated time

**order_id:**
- **CRITICAL:** Must match Leora order ID exactly
- Case-sensitive
- Used to link route back to order
- If no match found, import fails for that row

**driver_assigned:**
- Driver name (optional)
- If provided, auto-assigns route to driver in Leora
- If blank, route stays unassigned

**route_start_time:**
- When route begins (leaves warehouse)
- Usually consistent across all stops in route
- Example: 08:00 (route starts at 8 AM)

**route_end_time:**
- When route completes (returns to warehouse)
- Optional, calculated if not provided

**total_distance:**
- Total route miles (decimal)
- Same for all stops in route
- Optional, used for analytics

**total_duration:**
- Total route minutes
- Same for all stops in route
- Includes drive time + service time

**latitude / longitude:**
- Geocoded coordinates
- Optional, improves map accuracy
- Format: Decimal degrees
- Example: 37.7749, -122.4194 (San Francisco)

### Example Import CSV

```csv
route_name,stop_number,sequence,customer_name,address,estimated_arrival,estimated_duration,order_id,driver_assigned,route_start_time,total_distance,total_duration
Route 1,1,1,Wine Bar XYZ,123 Main St San Francisco CA 94102,09:15,15,ORD-2024-001,John Doe,08:00,35.4,255
Route 1,2,2,Bistro 456,789 Pine St San Francisco CA 94103,09:45,10,ORD-2024-003,John Doe,08:00,35.4,255
Route 1,3,3,Cafe Vino,321 Elm St Berkeley CA 94704,10:30,25,ORD-2024-004,John Doe,08:00,35.4,255
Route 2,1,1,Restaurant ABC,456 Oak Ave Oakland CA 94610,14:20,20,ORD-2024-002,Jane Smith,13:00,22.8,145
```

**Notes:**
- Route 1: 3 stops, driver John Doe
- Route 2: 1 stop (so far), driver Jane Smith
- Stops ordered by sequence (optimized by Azuga)
- ETAs account for travel + service time

---

## Integration Workflow

### Export Process

**1. Leora Preparation**

```typescript
// Pseudo-code
const orders = await getPickedOrders({
  status: 'PICKED',
  deliveryDate: tomorrow,
});

// Validate addresses
for (order of orders) {
  if (!order.customer.address) {
    throw new Error(`Order ${order.id}: Missing customer address`);
  }
  if (!order.customer.city || !order.customer.state || !order.customer.zip) {
    throw new Error(`Order ${order.id}: Incomplete address`);
  }
}
```

**2. Generate CSV**

```typescript
const csv = generateAzugaExport(orders);

// CSV Headers
const headers = [
  'customer_name', 'address', 'city', 'state', 'zip',
  'phone', 'email', 'delivery_date', 'time_window_start',
  'time_window_end', 'order_id', 'order_value',
  'special_instructions', 'contact_person', 'priority', 'service_time'
];

// CSV Rows
const rows = orders.map(order => [
  escapeCsv(order.customer.name),
  escapeCsv(order.customer.address),
  order.customer.city,
  order.customer.state.toUpperCase(),
  order.customer.zip,
  formatPhone(order.customer.phone),
  order.customer.email || '',
  formatDate(order.deliveryDate),
  order.timeWindowStart || '',
  order.timeWindowEnd || '',
  order.id,
  order.total.toFixed(2),
  escapeCsv(order.deliveryInstructions || ''),
  escapeCsv(order.customer.contactPerson || ''),
  order.priority || 2,
  calculateServiceTime(order.lineItems.length)
]);

return [headers, ...rows].join('\n');
```

**3. Download/Save**

```typescript
// Browser download
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `azuga_export_${formatDate(new Date())}.csv`;
link.click();

// Or save to server
await fs.writeFile(`/exports/azuga_export_${date}.csv`, csv, 'utf8');
```

### Import Process

**1. Upload CSV**

```typescript
const file = await uploadFile(azugaCsvFile);
const content = await file.text();
```

**2. Parse CSV**

```typescript
import { parse } from 'csv-parse/sync';

const records = parse(content, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

// Validate required columns
const requiredColumns = [
  'route_name', 'stop_number', 'sequence', 'order_id',
  'estimated_arrival', 'route_start_time'
];

for (const col of requiredColumns) {
  if (!records[0].hasOwnProperty(col)) {
    throw new Error(`Missing required column: ${col}`);
  }
}
```

**3. Validate Order IDs**

```typescript
const orderIds = [...new Set(records.map(r => r.order_id))];
const existingOrders = await prisma.order.findMany({
  where: { id: { in: orderIds } },
  select: { id: true },
});

const existingIds = new Set(existingOrders.map(o => o.id));
const missingIds = orderIds.filter(id => !existingIds.has(id));

if (missingIds.length > 0) {
  throw new Error(`Order IDs not found: ${missingIds.join(', ')}`);
}
```

**4. Group by Route**

```typescript
const routeGroups = {};

for (const record of records) {
  const routeName = record.route_name;
  if (!routeGroups[routeName]) {
    routeGroups[routeName] = [];
  }
  routeGroups[routeName].push(record);
}

// Sort stops by sequence
for (const route in routeGroups) {
  routeGroups[route].sort((a, b) =>
    parseInt(a.sequence) - parseInt(b.sequence)
  );
}
```

**5. Create Routes**

```typescript
for (const [routeName, stops] of Object.entries(routeGroups)) {
  const route = await prisma.deliveryRoute.create({
    data: {
      name: routeName,
      tenantId: tenantId,
      startTime: parseTime(stops[0].route_start_time),
      status: 'PENDING',
      totalStops: stops.length,
      totalMiles: parseFloat(stops[0].total_distance || 0),
      estimatedDuration: parseInt(stops[0].total_duration || 0),
      driverId: await lookupDriver(stops[0].driver_assigned),
    },
  });

  // Create stops
  for (const stop of stops) {
    await prisma.routeStop.create({
      data: {
        routeId: route.id,
        orderId: stop.order_id,
        sequence: parseInt(stop.sequence),
        stopNumber: parseInt(stop.stop_number),
        estimatedArrival: parseDateTime(stop.estimated_arrival),
        estimatedDuration: parseInt(stop.estimated_duration),
        address: stop.address,
        completed: false,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: stop.order_id },
      data: { status: 'ON_ROUTE' },
    });
  }
}
```

---

## Error Handling

### Export Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Missing address` | Customer has no address | Update customer record |
| `Invalid state code` | State not 2-letter code | Correct to uppercase 2-letter |
| `Invalid delivery date` | Date in past or wrong format | Use future date, YYYY-MM-DD format |
| `Time window end before start` | Invalid time range | Fix time window or remove |
| `No orders selected` | No PICKED orders | Check order status filter |

**Error Response:**
```json
{
  "error": "Export failed",
  "code": "EXPORT_VALIDATION_ERROR",
  "details": [
    {
      "orderId": "ORD-001",
      "field": "customer.address",
      "message": "Address is required"
    },
    {
      "orderId": "ORD-003",
      "field": "deliveryDate",
      "message": "Date must be in future"
    }
  ]
}
```

### Import Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Order ID not found` | order_id doesn't exist | Verify order IDs match export |
| `Duplicate stop` | Same order on multiple routes | Remove duplicate from CSV |
| `Invalid time format` | Time not HH:MM | Use 24-hour format: 09:00 |
| `Missing required column` | CSV missing column | Add column to CSV header |
| `Driver not found` | driver_assigned name doesn't match | Use exact driver name or leave blank |

**Error Response:**
```json
{
  "error": "Import failed",
  "code": "IMPORT_VALIDATION_ERROR",
  "summary": {
    "totalRows": 25,
    "valid": 23,
    "errors": 2
  },
  "details": [
    {
      "row": 5,
      "orderId": "ORD-999",
      "field": "order_id",
      "message": "Order not found in system"
    },
    {
      "row": 12,
      "orderId": "ORD-015",
      "field": "estimated_arrival",
      "message": "Invalid time format. Use HH:MM"
    }
  ]
}
```

---

## Character Encoding

**UTF-8 Required**

Both export and import must use UTF-8 encoding to support:
- International characters (é, ñ, ü)
- Special business names ("Café Français")
- Addresses with accents

**CSV Escaping Rules:**

**Commas in values:**
```
Wrong: Wine Bar XYZ, Inc.
Right: "Wine Bar XYZ, Inc."
```

**Quotes in values:**
```
Wrong: Cafe "Vino"
Right: "Cafe ""Vino"""
```

**Newlines in values:**
```
Wrong: Back door.\nRing twice.
Right: "Back door.
Ring twice."
```

---

## Testing

### Test Export CSV

Create test data:
```sql
INSERT INTO orders VALUES (...);
-- Test cases:
-- 1. Standard order with time window
-- 2. Rush order (priority 1)
-- 3. Large order (30+ bottles, longer service time)
-- 4. Special characters in name/address
-- 5. No time window (Azuga optimizes)
```

Export and verify:
- All columns present
- Data correctly escaped
- UTF-8 encoding
- Valid CSV syntax

### Test Import CSV

Create test CSV:
```csv
route_name,stop_number,sequence,customer_name,address,estimated_arrival,estimated_duration,order_id,driver_assigned,route_start_time
Test Route,1,1,Wine Bar XYZ,123 Main St SF CA 94102,09:15,15,ORD-TEST-001,John Doe,08:00
```

Test cases:
1. Valid import (all data correct)
2. Missing order_id (should error)
3. Invalid time format (should error)
4. Duplicate order (should error)
5. Blank driver_assigned (should accept, leave unassigned)

---

## API Endpoints (Future)

**Planned:** Replace CSV with direct API integration

**Potential Endpoints:**

```
POST /api/azuga/sync/export
- Export orders directly to Azuga via API
- Real-time geocoding validation
- Immediate error feedback

GET /api/azuga/sync/status
- Check optimization status
- Poll for completion

POST /api/azuga/sync/import
- Pull optimized routes from Azuga
- Automatic import on completion
```

**Benefits:**
- No manual CSV download/upload
- Real-time validation
- Automated nightly sync
- Error notifications

---

## Support

**Integration Issues:**
- Email: integrations@yourcompany.com
- Azuga API Docs: https://developer.azuga.com
- Leora API Docs: https://api.yourcompany.com/docs

**CSV Format Issues:**
- Example files: https://github.com/yourorg/leora/examples/azuga
- CSV validator: https://csvlint.io
