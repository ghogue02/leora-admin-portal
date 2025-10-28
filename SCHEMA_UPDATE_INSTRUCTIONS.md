# Prisma Schema Manual Update Instructions

## ⚠️ IMPORTANT: Read This First

This guide provides **exact instructions** for manually updating `/web/prisma/schema.prisma` with warehouse operations support.

**Why Manual?** The changes involve multiple model updates, new enums, and complex relations. Manual update ensures proper integration and understanding.

**Time Required**: 15-20 minutes

---

## Before You Start

1. **Backup your current schema**:
   ```bash
   cp /Users/greghogue/Leora2/web/prisma/schema.prisma /Users/greghogue/Leora2/web/prisma/schema.prisma.backup
   ```

2. **Open the schema** in your editor:
   ```bash
   code /Users/greghogue/Leora2/web/prisma/schema.prisma
   # or
   vim /Users/greghogue/Leora2/web/prisma/schema.prisma
   ```

3. **Have the reference file open**:
   ```bash
   code /Users/greghogue/Leora2/web/prisma/schema-warehouse-update.prisma
   ```

---

## Step 1: Add InventoryStatus Enum

**Location**: Before the `Inventory` model (around line 302)

**Add this enum**:
```prisma
enum InventoryStatus {
  AVAILABLE
  ALLOCATED
  PICKED
  SHIPPED
}
```

---

## Step 2: Update Inventory Model

**Location**: Find the `Inventory` model (around line 303-318)

**Current**:
```prisma
model Inventory {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  skuId     String   @db.Uuid
  location  String
  onHand    Int      @default(0)
  allocated Int      @default(0)
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sku    Sku    @relation(fields: [skuId], references: [id], onDelete: Cascade)

  @@unique([tenantId, skuId, location])
  @@index([tenantId])
}
```

**Update to**:
```prisma
model Inventory {
  id        String          @id @default(uuid()) @db.Uuid
  tenantId  String          @db.Uuid
  skuId     String          @db.Uuid
  location  String
  aisle     String?
  row       Int?
  shelf     String?
  bin       String?
  status    InventoryStatus @default(AVAILABLE)
  pickOrder Int?
  onHand    Int             @default(0)
  allocated Int             @default(0)
  updatedAt DateTime        @updatedAt
  createdAt DateTime        @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sku    Sku    @relation(fields: [skuId], references: [id], onDelete: Cascade)

  @@unique([tenantId, skuId, location])
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([pickOrder])
}
```

**Changes**:
- Added 6 new fields: `aisle`, `row`, `shelf`, `bin`, `status`, `pickOrder`
- Added 2 new indexes: `[tenantId, status]`, `[pickOrder]`

---

## Step 3: Update Order Model

**Location**: Find the `Order` model (around line 413-440)

**Current**:
```prisma
model Order {
  id           String      @id @default(uuid()) @db.Uuid
  tenantId     String      @db.Uuid
  customerId   String      @db.Uuid
  portalUserId String?     @db.Uuid
  status       OrderStatus @default(DRAFT)
  orderedAt    DateTime?
  fulfilledAt  DateTime?
  deliveredAt  DateTime?
  deliveryWeek Int?
  isFirstOrder Boolean     @default(false)
  total        Decimal?    @db.Decimal(12, 2)
  currency     String      @default("USD")
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  tenant     Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer   Customer    @relation(fields: [customerId], references: [id], onDelete: Cascade)
  portalUser PortalUser? @relation(fields: [portalUserId], references: [id], onDelete: SetNull)
  lines      OrderLine[]
  invoices   Invoice[]
  payments   Payment[]
  activities Activity[]

  @@index([tenantId])
  @@index([deliveredAt])
  @@index([deliveryWeek])
}
```

**Update to**:
```prisma
model Order {
  id              String      @id @default(uuid()) @db.Uuid
  tenantId        String      @db.Uuid
  customerId      String      @db.Uuid
  portalUserId    String?     @db.Uuid
  status          OrderStatus @default(DRAFT)
  orderedAt       DateTime?
  fulfilledAt     DateTime?
  deliveredAt     DateTime?
  deliveryWeek    Int?
  isFirstOrder    Boolean     @default(false)
  total           Decimal?    @db.Decimal(12, 2)
  currency        String      @default("USD")
  pickSheetStatus String?     @default("not_picked")
  pickSheetId     String?     @db.Uuid
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  tenant     Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer   Customer    @relation(fields: [customerId], references: [id], onDelete: Cascade)
  portalUser PortalUser? @relation(fields: [portalUserId], references: [id], onDelete: SetNull)
  lines      OrderLine[]
  invoices   Invoice[]
  payments   Payment[]
  activities Activity[]
  routeStop  RouteStop?

  @@index([tenantId])
  @@index([deliveredAt])
  @@index([deliveryWeek])
  @@index([pickSheetStatus])
}
```

**Changes**:
- Added 2 new fields: `pickSheetStatus`, `pickSheetId`
- Added 1 new relation: `routeStop`
- Added 1 new index: `[pickSheetStatus]`

---

## Step 4: Update OrderLine Model

**Location**: Find the `OrderLine` model (around line 450-467)

**Current**:
```prisma
model OrderLine {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @db.Uuid
  orderId             String   @db.Uuid
  skuId               String   @db.Uuid
  quantity            Int
  unitPrice           Decimal  @db.Decimal(10, 2)
  appliedPricingRules Json?
  isSample            Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  order  Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  sku    Sku    @relation(fields: [skuId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}
```

**Update to**:
```prisma
model OrderLine {
  id                  String          @id @default(uuid()) @db.Uuid
  tenantId            String          @db.Uuid
  orderId             String          @db.Uuid
  skuId               String          @db.Uuid
  quantity            Int
  unitPrice           Decimal         @db.Decimal(10, 2)
  appliedPricingRules Json?
  isSample            Boolean         @default(false)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  tenant         Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  order          Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  sku            Sku             @relation(fields: [skuId], references: [id], onDelete: Cascade)
  pickSheetItems PickSheetItem[]

  @@index([tenantId])
}
```

**Changes**:
- Added 1 new relation: `pickSheetItems`

---

## Step 5: Update Sku Model

**Location**: Find the `Sku` model (around line 273-301)

**Current** (relations section):
```prisma
  inventories    Inventory[]
  priceListItems PriceListItem[]
  orderLines     OrderLine[]
  cartItems      CartItem[]
  sampleUsage    SampleUsage[]
  productGoals   RepProductGoal[]
  topProducts    TopProduct[]
  incentives     SalesIncentive[]
  sampleMetrics  SampleMetrics[]
```

**Update to**:
```prisma
  inventories    Inventory[]
  priceListItems PriceListItem[]
  orderLines     OrderLine[]
  cartItems      CartItem[]
  sampleUsage    SampleUsage[]
  productGoals   RepProductGoal[]
  topProducts    TopProduct[]
  incentives     SalesIncentive[]
  sampleMetrics  SampleMetrics[]
  pickSheetItems PickSheetItem[]
```

**Changes**:
- Added 1 new relation: `pickSheetItems`

---

## Step 6: Update Customer Model

**Location**: Find the `Customer` model (around line 357-411)

**Current** (relations section):
```prisma
  portalUsers        PortalUser[]
  orders             Order[]
  invoices           Invoice[]
  activities         Activity[]
  accountSnapshots   AccountHealthSnapshot[]
  tasks              Task[]
  addresses          CustomerAddress[]
  assignments        CustomerAssignment[]
  sampleUsage        SampleUsage[]
  calendarEvents     CalendarEvent[]
  callPlanAccounts   CallPlanAccount[]
  callPlanActivities CallPlanActivity[]
  triggeredTasks     TriggeredTask[]
```

**Update to**:
```prisma
  portalUsers        PortalUser[]
  orders             Order[]
  invoices           Invoice[]
  activities         Activity[]
  accountSnapshots   AccountHealthSnapshot[]
  tasks              Task[]
  addresses          CustomerAddress[]
  assignments        CustomerAssignment[]
  sampleUsage        SampleUsage[]
  calendarEvents     CalendarEvent[]
  callPlanAccounts   CallPlanAccount[]
  callPlanActivities CallPlanActivity[]
  triggeredTasks     TriggeredTask[]
  pickSheetItems     PickSheetItem[]
```

**Changes**:
- Added 1 new relation: `pickSheetItems`

---

## Step 7: Update User Model

**Location**: Find the `User` model (around line 122-148)

**Current** (relations section):
```prisma
  roles             UserRole[]
  activities        Activity[]
  assignedTasks     Task[]             @relation("AssignedTasks")
  createdTasks      Task[]             @relation("CreatedTasks")
  callPlans         CallPlan[]
  salesRepProfile   SalesRep?
  calendarEvents    CalendarEvent[]
  salesSessions     SalesSession[]
  auditLogs         AuditLog[]
  metricDefinitions MetricDefinition[]
  calendarSyncs     CalendarSync[]
```

**Update to**:
```prisma
  roles             UserRole[]
  activities        Activity[]
  assignedTasks     Task[]             @relation("AssignedTasks")
  createdTasks      Task[]             @relation("CreatedTasks")
  callPlans         CallPlan[]
  salesRepProfile   SalesRep?
  calendarEvents    CalendarEvent[]
  salesSessions     SalesSession[]
  auditLogs         AuditLog[]
  metricDefinitions MetricDefinition[]
  calendarSyncs     CalendarSync[]
  pickSheets        PickSheet[]
  routeExports      RouteExport[]
```

**Changes**:
- Added 2 new relations: `pickSheets`, `routeExports`

---

## Step 8: Update Tenant Model

**Location**: Find the `Tenant` model (around line 13-71)

**Current** (relations section, at the end):
```prisma
  automatedTriggers       AutomatedTrigger[]
  triggeredTasks          TriggeredTask[]
  sampleFeedbackTemplates SampleFeedbackTemplate[]
  sampleMetrics           SampleMetrics[]
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt
```

**Update to**:
```prisma
  automatedTriggers       AutomatedTrigger[]
  triggeredTasks          TriggeredTask[]
  sampleFeedbackTemplates SampleFeedbackTemplate[]
  sampleMetrics           SampleMetrics[]
  warehouseConfig         WarehouseConfig?
  pickSheets              PickSheet[]
  pickSheetItems          PickSheetItem[]
  deliveryRoutes          DeliveryRoute[]
  routeStops              RouteStop[]
  routeExports            RouteExport[]
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt
```

**Changes**:
- Added 6 new relations: `warehouseConfig`, `pickSheets`, `pickSheetItems`, `deliveryRoutes`, `routeStops`, `routeExports`

---

## Step 9: Add New Models at End of File

**Location**: At the very end of the schema file (after the last model)

**Copy and paste** these models from `schema-warehouse-update.prisma`:

```prisma
// ============================================================================
// WAREHOUSE & OPERATIONS MODELS
// ============================================================================

model WarehouseConfig {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @unique @db.Uuid
  aisleCount   Int      @default(10)
  rowsPerAisle Int      @default(20)
  shelfLevels  String[] @default(["Top", "Middle", "Bottom"])
  pickStrategy String   @default("aisle_then_row")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

enum PickSheetStatus {
  DRAFT
  READY
  PICKING
  PICKED
  CANCELLED
}

model PickSheet {
  id          String          @id @default(uuid()) @db.Uuid
  tenantId    String          @db.Uuid
  sheetNumber String
  status      PickSheetStatus @default(DRAFT)
  pickerName  String?
  createdById String          @db.Uuid
  startedAt   DateTime?
  completedAt DateTime?
  notes       String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  tenant    Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy User            @relation(fields: [createdById], references: [id])
  items     PickSheetItem[]

  @@unique([tenantId, sheetNumber])
  @@index([tenantId, status])
}

model PickSheetItem {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  pickSheetId String    @db.Uuid
  orderLineId String    @db.Uuid
  skuId       String    @db.Uuid
  customerId  String    @db.Uuid
  quantity    Int
  pickOrder   Int
  isPicked    Boolean   @default(false)
  pickedAt    DateTime?

  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  pickSheet PickSheet @relation(fields: [pickSheetId], references: [id], onDelete: Cascade)
  orderLine OrderLine @relation(fields: [orderLineId], references: [id], onDelete: Cascade)
  sku       Sku       @relation(fields: [skuId], references: [id])
  customer  Customer  @relation(fields: [customerId], references: [id])

  @@index([tenantId, pickSheetId, pickOrder])
  @@index([pickSheetId])
}

model DeliveryRoute {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  routeDate        DateTime
  routeName        String
  driverName       String
  truckNumber      String?
  startTime        DateTime
  estimatedEndTime DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  tenant Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  stops  RouteStop[]

  @@unique([tenantId, routeDate, routeName])
  @@index([tenantId, routeDate])
}

model RouteStop {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  routeId          String    @db.Uuid
  orderId          String    @unique @db.Uuid
  stopNumber       Int
  estimatedArrival DateTime
  actualArrival    DateTime?
  status           String    @default("pending")
  notes            String?

  tenant Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  route  DeliveryRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  order  Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([routeId, stopNumber])
  @@index([tenantId, routeId])
  @@index([orderId])
}

model RouteExport {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @db.Uuid
  exportDate DateTime @default(now())
  orderCount Int
  filename   String
  exportedBy String   @db.Uuid

  tenant         Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  exportedByUser User   @relation(fields: [exportedBy], references: [id])

  @@index([tenantId, exportDate])
}
```

---

## Step 10: Save and Verify

1. **Save the file** (Ctrl+S or :w)

2. **Format the schema**:
   ```bash
   npx prisma format
   ```

3. **Validate the schema**:
   ```bash
   npx prisma validate
   ```

4. **Check for errors**:
   - Look for syntax errors
   - Verify all model names are correct
   - Ensure all relations have inverse relations

---

## Step 11: Create Migration

Once the schema is validated:

```bash
cd /Users/greghogue/Leora2/web
npx prisma migrate dev --name add_warehouse_operations
```

This will:
1. Generate SQL migration file
2. Apply migration to database
3. Regenerate Prisma Client

---

## Step 12: Seed Warehouse Configurations

```bash
npx ts-node scripts/seed-warehouse-config.ts
```

This creates default warehouse configuration for all tenants.

---

## Step 13: Verify

```bash
# Check migration applied
npx prisma migrate status

# Generate Prisma Client
npx prisma generate

# Run tests
npm test pick-sheet-generator
```

---

## Rollback (If Needed)

If something goes wrong:

1. **Restore backup**:
   ```bash
   cp /Users/greghogue/Leora2/web/prisma/schema.prisma.backup /Users/greghogue/Leora2/web/prisma/schema.prisma
   ```

2. **Rollback migration**:
   ```bash
   npx prisma migrate reset
   ```

---

## Quick Checklist

- [ ] Backup created
- [ ] InventoryStatus enum added
- [ ] Inventory model updated (6 fields, 2 indexes)
- [ ] Order model updated (2 fields, 1 relation, 1 index)
- [ ] OrderLine model updated (1 relation)
- [ ] Sku model updated (1 relation)
- [ ] Customer model updated (1 relation)
- [ ] User model updated (2 relations)
- [ ] Tenant model updated (6 relations)
- [ ] 6 new models added at end
- [ ] Schema formatted (`npx prisma format`)
- [ ] Schema validated (`npx prisma validate`)
- [ ] Migration created (`npx prisma migrate dev`)
- [ ] Warehouse configs seeded
- [ ] Tests passing

---

## Support

If you encounter issues:
1. Check Prisma error messages carefully
2. Verify all relation inverses exist
3. Ensure UUID types match (`@db.Uuid`)
4. Review `/web/docs/WAREHOUSE_IMPLEMENTATION.md`
5. Compare with `/web/prisma/schema-warehouse-update.prisma`

---

**Estimated Time**: 15-20 minutes
**Difficulty**: Medium
**Risk**: Low (backup created)
