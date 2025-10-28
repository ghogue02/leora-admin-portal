# Phase 5 Database Schema Changes

**Phase:** Operations & Warehouse Management
**Date:** 2025-10-25
**Status:** Proposed

---

## Overview

Phase 5 introduces warehouse operations, pick sheet management, and delivery routing capabilities. This document details all database schema changes required.

---

## 1. New Models (6 Total)

### 1.1 WarehouseLocation

Tracks physical locations within the warehouse for inventory management.

```prisma
model WarehouseLocation {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  zone        String   // "A", "B", "C" - major area
  aisle       String   // "01", "02", "03"
  section     String   // "A", "B", "C" - within aisle
  shelf       Int      // 1, 2, 3, 4
  bin         String?  // Optional sub-location

  // Calculated pick order (1-9999)
  pickOrder   Int      // For optimized picking

  // Metadata
  capacity    Int?     // Max units
  isActive    Boolean  @default(true)
  notes       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Relations
  inventories InventoryLocation[]
  pickItems   PickSheetItem[]

  @@unique([tenantId, zone, aisle, section, shelf])
  @@index([tenantId, pickOrder])
  @@index([tenantId, zone])
  @@index([tenantId, isActive])
}
```

**Key Features:**
- Hierarchical location structure (Zone → Aisle → Section → Shelf)
- Pre-calculated `pickOrder` for optimized picking routes
- Flexible capacity tracking
- Tenant-isolated

---

### 1.2 WarehouseZone

Defines major warehouse zones with configuration.

```prisma
model WarehouseZone {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  name        String   // "A", "B", "C"
  description String?  // "Red Wine Storage"
  color       String?  // "#FF5733" for UI

  // Zone configuration
  startOrder  Int      // Starting pickOrder for this zone
  endOrder    Int      // Ending pickOrder for this zone

  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, name])
  @@index([tenantId, sortOrder])
}
```

**Key Features:**
- Zone-based organization (A, B, C, etc.)
- Color coding for visual warehouse map
- Pick order range assignment
- Sortable for UI display

---

### 1.3 PickSheet

Represents a pick sheet document for warehouse operations.

```prisma
enum PickSheetStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model PickSheet {
  id              String          @id @default(uuid()) @db.Uuid
  tenantId        String          @db.Uuid

  // Identification
  sheetNumber     String          @unique // PS-20250125-001
  status          PickSheetStatus @default(PENDING)

  // Assignment
  assignedTo      String?         // Picker name/ID
  assignedAt      DateTime?

  // Dates
  generatedAt     DateTime        @default(now())
  startedAt       DateTime?       // When picking started
  completedAt     DateTime?       // When finished

  // Delivery info
  deliveryDate    DateTime?       // Target delivery date
  deliveryWeek    Int?            // Week number
  routeId         String?         @db.Uuid

  // Metadata
  totalItems      Int             @default(0)
  totalQuantity   Int             @default(0)
  notes           String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  route           DeliveryRoute?  @relation(fields: [routeId], references: [id], onDelete: SetNull)

  // Relations
  items           PickSheetItem[]

  @@index([tenantId, status])
  @@index([tenantId, generatedAt])
  @@index([tenantId, deliveryDate])
  @@index([sheetNumber])
}
```

**Key Features:**
- Unique sheet numbering (PS-YYYYMMDD-XXX)
- Status tracking (pending → in_progress → completed)
- Picker assignment
- Delivery date/week tracking
- Route association

---

### 1.4 PickSheetItem

Individual line items on a pick sheet.

```prisma
model PickSheetItem {
  id              String            @id @default(uuid()) @db.Uuid
  tenantId        String            @db.Uuid
  pickSheetId     String            @db.Uuid

  // Item details
  skuId           String            @db.Uuid
  quantity        Int

  // Location
  locationId      String            @db.Uuid
  pickOrder       Int               // Copied from location for sorting

  // Order reference
  orderId         String            @db.Uuid
  orderLineId     String            @db.Uuid
  customerId      String            @db.Uuid

  // Picking status
  isPicked        Boolean           @default(false)
  pickedAt        DateTime?
  pickedBy        String?

  notes           String?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  pickSheet       PickSheet         @relation(fields: [pickSheetId], references: [id], onDelete: Cascade)
  sku             Sku               @relation(fields: [skuId], references: [id], onDelete: Cascade)
  location        WarehouseLocation @relation(fields: [locationId], references: [id], onDelete: Cascade)
  order           Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderLine       OrderLine         @relation(fields: [orderLineId], references: [id], onDelete: Cascade)
  customer        Customer          @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([tenantId, pickSheetId, pickOrder])
  @@index([tenantId, skuId])
  @@index([tenantId, orderId])
  @@index([isPicked])
}
```

**Key Features:**
- Links to order, sku, location
- Pre-sorted by pickOrder for efficient picking
- Individual item tracking (isPicked)
- Picker assignment at item level
- Customer reference for validation

---

### 1.5 DeliveryRoute

Represents a delivery route with multiple stops.

```prisma
enum RouteStatus {
  DRAFT
  PLANNED
  IN_PROGRESS
  COMPLETED
}

model DeliveryRoute {
  id              String       @id @default(uuid()) @db.Uuid
  tenantId        String       @db.Uuid

  // Identification
  routeName       String       // "Route A - Monday"
  routeNumber     String?      @unique // RTI-20250125-001
  status          RouteStatus  @default(DRAFT)

  // Schedule
  deliveryDate    DateTime
  deliveryWeek    Int?

  // Driver assignment
  driverName      String?
  driverPhone     String?
  vehicleId       String?

  // Azuga integration
  azugaRouteId    String?      @unique
  azugaExportedAt DateTime?

  // Metrics
  totalStops      Int          @default(0)
  totalMiles      Float?
  estimatedTime   Int?         // Minutes

  // Status
  startedAt       DateTime?
  completedAt     DateTime?

  notes           String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  tenant          Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Relations
  stops           RouteStop[]
  pickSheets      PickSheet[]

  @@index([tenantId, deliveryDate])
  @@index([tenantId, status])
  @@index([tenantId, deliveryWeek])
  @@index([azugaRouteId])
}
```

**Key Features:**
- Route naming and numbering
- Driver assignment
- Azuga integration tracking
- Route metrics (stops, miles, time)
- Status lifecycle tracking

---

### 1.6 RouteStop

Individual stops on a delivery route.

```prisma
model RouteStop {
  id              String        @id @default(uuid()) @db.Uuid
  tenantId        String        @db.Uuid
  routeId         String        @db.Uuid

  // Stop details
  stopNumber      Int           // Sequence on route (1, 2, 3...)
  customerId      String        @db.Uuid
  orderId         String?       @db.Uuid

  // Address
  addressLine1    String
  addressLine2    String?
  city            String
  state           String
  postalCode      String

  // Delivery window
  scheduledTime   DateTime?
  arrivalTime     DateTime?
  departureTime   DateTime?

  // Status
  isCompleted     Boolean       @default(false)
  completedAt     DateTime?

  // Azuga integration
  azugaStopId     String?

  notes           String?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  tenant          Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  route           DeliveryRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  customer        Customer      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  order           Order?        @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@unique([routeId, stopNumber])
  @@index([tenantId, routeId, stopNumber])
  @@index([tenantId, customerId])
  @@index([isCompleted])
}
```

**Key Features:**
- Sequenced stops (1, 2, 3...)
- Full address storage
- Delivery time tracking
- Azuga integration
- Completion status

---

## 2. New Enums (2 Total)

### 2.1 PickSheetStatus

```prisma
enum PickSheetStatus {
  PENDING       // Generated, not started
  IN_PROGRESS   // Picker assigned, picking in progress
  COMPLETED     // All items picked
  CANCELLED     // Cancelled (order changes, etc.)
}
```

### 2.2 RouteStatus

```prisma
enum RouteStatus {
  DRAFT         // Being planned
  PLANNED       // Ready for driver
  IN_PROGRESS   // Driver on route
  COMPLETED     // All stops finished
}
```

---

## 3. Modified Existing Models

### 3.1 Inventory

Add warehouse location tracking:

```prisma
model Inventory {
  // ... existing fields ...

  // NEW: Warehouse location tracking
  locationId      String?           @db.Uuid
  location        WarehouseLocation? @relation(fields: [locationId], references: [id], onDelete: SetNull)

  // NEW: Many-to-many for multi-location inventory
  locations       InventoryLocation[]
}
```

### 3.2 Order

Add route assignment:

```prisma
model Order {
  // ... existing fields ...

  // NEW: Routing information
  deliveryRouteId String?        @db.Uuid
  deliveryRoute   DeliveryRoute? @relation(fields: [deliveryRouteId], references: [id], onDelete: SetNull)

  // NEW: Pick sheet tracking
  pickSheets      PickSheet[]
  routeStops      RouteStop[]
}
```

### 3.3 OrderLine

Add pick location reference:

```prisma
model OrderLine {
  // ... existing fields ...

  // NEW: Warehouse location for this line
  pickLocationId      String?            @db.Uuid
  pickLocation        WarehouseLocation? @relation(fields: [pickLocationId], references: [id], onDelete: SetNull)

  // NEW: Pick sheet items
  pickSheetItems      PickSheetItem[]
}
```

### 3.4 Customer

Add route stop reference:

```prisma
model Customer {
  // ... existing fields ...

  // NEW: Route stops
  routeStops RouteStop[]
  pickSheetItems PickSheetItem[]
}
```

### 3.5 Tenant

Add Phase 5 relations:

```prisma
model Tenant {
  // ... existing fields ...

  // NEW: Phase 5 relations
  warehouseLocations  WarehouseLocation[]
  warehouseZones      WarehouseZone[]
  pickSheets          PickSheet[]
  pickSheetItems      PickSheetItem[]
  deliveryRoutes      DeliveryRoute[]
  routeStops          RouteStop[]
  inventoryLocations  InventoryLocation[]
}
```

---

## 4. New Join Tables

### 4.1 InventoryLocation

Many-to-many relationship between Inventory and WarehouseLocation (for items stored in multiple locations):

```prisma
model InventoryLocation {
  id         String            @id @default(uuid()) @db.Uuid
  tenantId   String            @db.Uuid
  inventoryId String           @db.Uuid
  locationId String            @db.Uuid
  quantity   Int               @default(0)

  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  tenant     Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inventory  Inventory         @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
  location   WarehouseLocation @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([inventoryId, locationId])
  @@index([tenantId])
  @@index([locationId])
}
```

---

## 5. Indexes Strategy

### High-Traffic Queries

**Pick Sheet Generation:**
```prisma
@@index([tenantId, deliveryDate])
@@index([tenantId, status])
@@index([pickSheetId, pickOrder]) // Sorted picking
```

**Warehouse Location Lookup:**
```prisma
@@index([tenantId, zone])
@@index([tenantId, pickOrder])
@@index([tenantId, isActive])
```

**Route Planning:**
```prisma
@@index([tenantId, deliveryDate])
@@index([tenantId, deliveryWeek])
@@index([routeId, stopNumber]) // Ordered stops
```

**Inventory Allocation:**
```prisma
@@index([tenantId, skuId])
@@index([locationId])
```

---

## 6. Migration Strategy

### Step 1: Create New Models
```sql
-- Create enums
CREATE TYPE "PickSheetStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RouteStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- Create tables (in dependency order)
-- 1. WarehouseZone (no dependencies)
-- 2. WarehouseLocation (depends on Tenant)
-- 3. InventoryLocation (join table)
-- 4. DeliveryRoute (depends on Tenant)
-- 5. RouteStop (depends on DeliveryRoute, Customer)
-- 6. PickSheet (depends on Tenant, DeliveryRoute)
-- 7. PickSheetItem (depends on PickSheet, WarehouseLocation, Order, etc.)
```

### Step 2: Modify Existing Models
```sql
-- Add foreign keys to existing tables
ALTER TABLE "Inventory" ADD COLUMN "locationId" UUID;
ALTER TABLE "Order" ADD COLUMN "deliveryRouteId" UUID;
ALTER TABLE "OrderLine" ADD COLUMN "pickLocationId" UUID;

-- Add foreign key constraints
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL;

-- (Similar for other tables)
```

### Step 3: Seed Default Data
```sql
-- Insert default warehouse zones
INSERT INTO "WarehouseZone" (id, tenantId, name, description, startOrder, endOrder)
VALUES
  (uuid_generate_v4(), :tenantId, 'A', 'Zone A - Red Wine', 1000, 1999),
  (uuid_generate_v4(), :tenantId, 'B', 'Zone B - White Wine', 2000, 2999),
  (uuid_generate_v4(), :tenantId, 'C', 'Zone C - Spirits', 3000, 3999);
```

### Step 4: Create Indexes
```sql
CREATE INDEX "WarehouseLocation_tenantId_pickOrder_idx" ON "WarehouseLocation"("tenantId", "pickOrder");
CREATE INDEX "PickSheet_tenantId_deliveryDate_idx" ON "PickSheet"("tenantId", "deliveryDate");
CREATE INDEX "PickSheetItem_tenantId_pickSheetId_pickOrder_idx" ON "PickSheetItem"("tenantId", "pickSheetId", "pickOrder");
-- (All other indexes)
```

---

## 7. Rollback Strategy

### If Migration Fails
```sql
-- Drop in reverse dependency order
DROP TABLE IF EXISTS "PickSheetItem" CASCADE;
DROP TABLE IF EXISTS "PickSheet" CASCADE;
DROP TABLE IF EXISTS "RouteStop" CASCADE;
DROP TABLE IF EXISTS "DeliveryRoute" CASCADE;
DROP TABLE IF EXISTS "InventoryLocation" CASCADE;
DROP TABLE IF EXISTS "WarehouseLocation" CASCADE;
DROP TABLE IF EXISTS "WarehouseZone" CASCADE;

-- Remove columns from existing tables
ALTER TABLE "Inventory" DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "deliveryRouteId";
ALTER TABLE "OrderLine" DROP COLUMN IF EXISTS "pickLocationId";

-- Drop enums
DROP TYPE IF EXISTS "PickSheetStatus";
DROP TYPE IF EXISTS "RouteStatus";
```

---

## 8. Data Integrity Checks

### Pre-Migration Validation
- [ ] All existing Orders have valid `customerId`
- [ ] All OrderLines reference existing Orders
- [ ] All Inventory records have valid `skuId`
- [ ] No orphaned records in existing tables

### Post-Migration Validation
- [ ] All new tables created successfully
- [ ] All indexes created
- [ ] All foreign keys enforced
- [ ] Tenant isolation maintained
- [ ] Seed data inserted correctly
- [ ] No data loss in existing tables

---

## 9. Performance Considerations

### Expected Query Patterns

**Pick Sheet Generation (most frequent):**
- Query: Find all orders for delivery date, allocate inventory, assign locations
- Optimization: Index on `deliveryDate`, `pickOrder`, pre-calculated `pickOrder`

**Warehouse Location Lookup:**
- Query: Find location by zone/aisle/section/shelf
- Optimization: Composite unique index, pickOrder index

**Route Planning:**
- Query: Find all orders for week, group by customer, optimize sequence
- Optimization: Index on `deliveryWeek`, `stopNumber`

### Estimated Table Sizes (Year 1)
- `WarehouseLocation`: ~500 rows (relatively static)
- `WarehouseZone`: ~10 rows (very static)
- `PickSheet`: ~5,000 rows (1 per day * 250 business days * 2 years retention)
- `PickSheetItem`: ~100,000 rows (20 items * 5,000 sheets)
- `DeliveryRoute`: ~2,500 rows (5 routes/week * 52 weeks)
- `RouteStop`: ~50,000 rows (20 stops * 2,500 routes)

---

## 10. Security Considerations

### Tenant Isolation
- All models include `tenantId`
- All queries filtered by tenant
- Row-level security enforced

### Access Control
- Pick sheets: Only warehouse staff
- Routes: Only dispatch and drivers
- Warehouse config: Admin only

### Audit Logging
- Pick sheet generation
- Route modifications
- Location changes

---

## Summary

**Total New Models:** 6
**Total New Enums:** 2
**Modified Existing Models:** 5
**New Indexes:** 15+
**Estimated Migration Time:** 5-10 minutes
**Rollback Time:** 2-3 minutes

**Status:** Ready for implementation pending agent coordination

---

**Last Updated:** 2025-10-25
**Reviewed By:** Integration Coordinator
**Approval Status:** Pending final review
