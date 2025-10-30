# Customer Tagging & Segmentation Database Schema

## Architecture Overview

This schema supports flexible customer segmentation with:
- Multi-tag support per customer
- Revenue tracking by tag type
- Event sale tracking
- Soft deletion for historical analysis
- Hierarchical tag organization

---

## Prisma Schema Models

### 1. TagDefinition Model
Pre-defined tag categories for consistent tagging across the system.

```prisma
model TagDefinition {
  id          String   @id @default(cuid())
  tenantId    String

  // Tag identification
  tagType     String   // e.g., "WINE_CLUB", "EVENTS", "WINEMAKER_TYPE"
  tagValue    String?  // Optional value for hierarchical tags

  // Tag metadata
  displayName String   // Human-readable name
  description String?  // Optional description
  category    String   // Grouping: "SEGMENT", "PREFERENCE", "BEHAVIOR", "DEMOGRAPHIC"

  // Hierarchy support
  parentId    String?  // For nested tag structures
  parent      TagDefinition?  @relation("TagHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children    TagDefinition[] @relation("TagHierarchy")

  // Tag behavior
  isActive    Boolean  @default(true)
  allowMultiple Boolean @default(true)  // Can a customer have multiple values?
  priority    Int      @default(0)      // Display/processing priority

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customerTags CustomerTag[]

  @@unique([tenantId, tagType, tagValue])
  @@index([tenantId, category])
  @@index([tenantId, isActive])
  @@index([tenantId, tagType])
  @@map("tag_definitions")
}
```

### 2. CustomerTag Model
Core tagging model linking customers to their segments.

```prisma
model CustomerTag {
  id          String   @id @default(cuid())
  tenantId    String
  customerId  String

  // Tag identification
  tagType     String   // e.g., "WINE_CLUB", "FEMALE_WINEMAKER", "ORGANIC"
  tagValue    String?  // Optional: tier level, specific event name, etc.

  // Tag lifecycle
  addedAt     DateTime @default(now())
  addedBy     String?  // User who added the tag (optional)
  removedAt   DateTime? // Soft delete for historical analysis
  removedBy   String?  // User who removed the tag (optional)

  // Tag metadata
  source      String   @default("MANUAL") // "MANUAL", "IMPORT", "AUTOMATION", "EVENT"
  notes       String?  // Optional context

  // Revenue tracking (denormalized for performance)
  totalRevenue Decimal  @default(0) @db.Decimal(12, 2)
  orderCount   Int      @default(0)
  lastOrderAt  DateTime?

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  tagDefinition TagDefinition? @relation(fields: [tagType, tagValue], references: [tagType, tagValue])

  @@unique([tenantId, customerId, tagType, tagValue, removedAt])
  @@index([tenantId, tagType, removedAt]) // Active tags by type
  @@index([tenantId, customerId, removedAt]) // Active tags for customer
  @@index([tenantId, tagType, totalRevenue]) // Revenue ranking
  @@index([tenantId, removedAt, lastOrderAt]) // Active customers by recency
  @@index([customerId, addedAt]) // Tag history
  @@map("customer_tags")
}
```

### 3. Order Model Extensions
Add event sale tracking to existing Order model.

```prisma
model Order {
  // ... existing Order fields ...

  // Event sale tracking
  isEventSale  Boolean  @default(false)
  eventType    String?  // "SUPPLIER_TASTING", "PUBLIC_EVENT", "WINE_CLUB_PICKUP", "PRIVATE_TASTING"
  eventId      String?  // Reference to specific event (if events stored separately)
  eventNotes   String?  @db.Text
  eventDate    DateTime? // When the event occurred

  // Metadata
  salesChannel String?  // "IN_STORE", "ONLINE", "EVENT", "PHONE"

  @@index([tenantId, isEventSale, createdAt]) // Event sales reporting
  @@index([tenantId, eventType, createdAt]) // Event type analysis
  @@index([tenantId, customerId, isEventSale]) // Customer event purchase history
  @@map("orders")
}
```

### 4. Optional: Event Model
For comprehensive event management (if needed).

```prisma
model Event {
  id          String   @id @default(cuid())
  tenantId    String

  // Event details
  name        String
  eventType   String   // "SUPPLIER_TASTING", "PUBLIC_EVENT", "WINE_CLUB_PICKUP"
  description String?  @db.Text

  // Timing
  startDate   DateTime
  endDate     DateTime?

  // Location
  location    String?
  isVirtual   Boolean  @default(false)

  // Tracking
  expectedAttendees Int?
  actualAttendees   Int?
  totalRevenue      Decimal @default(0) @db.Decimal(12, 2)

  // Status
  status      String   @default("PLANNED") // "PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  orders      Order[]

  @@index([tenantId, eventType, startDate])
  @@index([tenantId, status])
  @@map("events")
}
```

---

## Migration Strategy

### Phase 1: Create New Tables (Non-Breaking)

```sql
-- Migration: 001_add_customer_tagging_system.sql

-- Create TagDefinition table
CREATE TABLE "tag_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tagType" TEXT NOT NULL,
    "tagValue" TEXT,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_definitions_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "tag_definitions_parentId_fkey"
        FOREIGN KEY ("parentId") REFERENCES "tag_definitions"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "tag_definitions_tenantId_tagType_tagValue_key"
    ON "tag_definitions"("tenantId", "tagType", "tagValue");
CREATE INDEX "tag_definitions_tenantId_category_idx"
    ON "tag_definitions"("tenantId", "category");
CREATE INDEX "tag_definitions_tenantId_isActive_idx"
    ON "tag_definitions"("tenantId", "isActive");
CREATE INDEX "tag_definitions_tenantId_tagType_idx"
    ON "tag_definitions"("tenantId", "tagType");

-- Create CustomerTag table
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tagType" TEXT NOT NULL,
    "tagValue" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_tags_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "customer_tags_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "customer_tags_tenantId_customerId_tagType_tagValue_removedAt_key"
    ON "customer_tags"("tenantId", "customerId", "tagType", "tagValue", "removedAt");
CREATE INDEX "customer_tags_tenantId_tagType_removedAt_idx"
    ON "customer_tags"("tenantId", "tagType", "removedAt");
CREATE INDEX "customer_tags_tenantId_customerId_removedAt_idx"
    ON "customer_tags"("tenantId", "customerId", "removedAt");
CREATE INDEX "customer_tags_tenantId_tagType_totalRevenue_idx"
    ON "customer_tags"("tenantId", "tagType", "totalRevenue");
CREATE INDEX "customer_tags_tenantId_removedAt_lastOrderAt_idx"
    ON "customer_tags"("tenantId", "removedAt", "lastOrderAt");
CREATE INDEX "customer_tags_customerId_addedAt_idx"
    ON "customer_tags"("customerId", "addedAt");
```

### Phase 2: Extend Order Table (Non-Breaking)

```sql
-- Migration: 002_add_event_sale_tracking.sql

-- Add event sale fields to orders table
ALTER TABLE "orders"
    ADD COLUMN "isEventSale" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "eventType" TEXT,
    ADD COLUMN "eventId" TEXT,
    ADD COLUMN "eventNotes" TEXT,
    ADD COLUMN "eventDate" TIMESTAMP(3),
    ADD COLUMN "salesChannel" TEXT;

-- Create indexes for event sale queries
CREATE INDEX "orders_tenantId_isEventSale_createdAt_idx"
    ON "orders"("tenantId", "isEventSale", "createdAt");
CREATE INDEX "orders_tenantId_eventType_createdAt_idx"
    ON "orders"("tenantId", "eventType", "createdAt");
CREATE INDEX "orders_tenantId_customerId_isEventSale_idx"
    ON "orders"("tenantId", "customerId", "isEventSale");
```

### Phase 3: Seed Initial Tag Definitions

```sql
-- Migration: 003_seed_tag_definitions.sql

-- Insert common tag definitions (adjust tenantId as needed)
INSERT INTO "tag_definitions"
    ("id", "tenantId", "tagType", "tagValue", "displayName", "category", "isActive", "priority")
VALUES
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'WINE_CLUB', NULL, 'Wine Club Member', 'SEGMENT', true, 100),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'EVENTS', NULL, 'Event Attendee', 'SEGMENT', true, 90),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'WINEMAKER_TYPE', 'FEMALE', 'Female Winemakers', 'PREFERENCE', true, 80),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'PREFERENCE', 'ORGANIC', 'Organic Wines', 'PREFERENCE', true, 70),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'PREFERENCE', 'BIODYNAMIC', 'Biodynamic Wines', 'PREFERENCE', true, 70),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'VIP', NULL, 'VIP Customer', 'SEGMENT', true, 110),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'WHOLESALE', NULL, 'Wholesale Account', 'SEGMENT', true, 85),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'REGION', 'NAPA', 'Napa Valley Preference', 'PREFERENCE', true, 60),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'REGION', 'SONOMA', 'Sonoma Preference', 'PREFERENCE', true, 60),
    (gen_random_uuid(), 'YOUR_TENANT_ID', 'BEHAVIOR', 'HIGH_FREQUENCY', 'Frequent Buyer', 'BEHAVIOR', true, 50);
```

---

## Index Optimization Recommendations

### Performance Indexes

```sql
-- Revenue ranking within tag types (most common query)
CREATE INDEX "customer_tags_revenue_ranking_idx"
    ON "customer_tags"("tenantId", "tagType", "removedAt", "totalRevenue" DESC);

-- Customer tag lookup with active filter
CREATE INDEX "customer_tags_active_lookup_idx"
    ON "customer_tags"("customerId", "removedAt")
    WHERE "removedAt" IS NULL;

-- Recent activity tracking
CREATE INDEX "customer_tags_recent_activity_idx"
    ON "customer_tags"("tenantId", "lastOrderAt" DESC)
    WHERE "removedAt" IS NULL;

-- Event sales analysis
CREATE INDEX "orders_event_analysis_idx"
    ON "orders"("tenantId", "eventType", "isEventSale", "createdAt")
    WHERE "isEventSale" = true;

-- Composite index for tag definition lookup
CREATE INDEX "tag_definitions_lookup_idx"
    ON "tag_definitions"("tenantId", "category", "isActive")
    WHERE "isActive" = true;
```

### Partial Indexes for Active Records

```sql
-- Active customer tags only (most queries don't need historical data)
CREATE INDEX "customer_tags_active_only_idx"
    ON "customer_tags"("tenantId", "tagType", "totalRevenue")
    WHERE "removedAt" IS NULL;

-- Active tag definitions only
CREATE INDEX "tag_definitions_active_only_idx"
    ON "tag_definitions"("tenantId", "tagType")
    WHERE "isActive" = true;
```

---

## Sample Queries & Use Cases

### 1. Get All Wine Club Customers Ranked by Revenue

```sql
SELECT
    c.id,
    c.email,
    c.firstName,
    c.lastName,
    ct.totalRevenue,
    ct.orderCount,
    ct.lastOrderAt,
    ct.addedAt as memberSince
FROM customer_tags ct
JOIN customers c ON ct.customerId = c.id
WHERE ct.tenantId = 'YOUR_TENANT_ID'
    AND ct.tagType = 'WINE_CLUB'
    AND ct.removedAt IS NULL
ORDER BY ct.totalRevenue DESC
LIMIT 100;
```

### 2. Get Customer's All Active Tags

```sql
SELECT
    ct.tagType,
    ct.tagValue,
    td.displayName,
    td.category,
    ct.addedAt,
    ct.totalRevenue,
    ct.orderCount
FROM customer_tags ct
LEFT JOIN tag_definitions td
    ON ct.tagType = td.tagType
    AND (ct.tagValue = td.tagValue OR ct.tagValue IS NULL)
WHERE ct.customerId = 'CUSTOMER_ID'
    AND ct.removedAt IS NULL
ORDER BY td.priority DESC, ct.addedAt DESC;
```

### 3. Revenue by Tag Type

```sql
SELECT
    ct.tagType,
    td.displayName,
    COUNT(DISTINCT ct.customerId) as customerCount,
    SUM(ct.totalRevenue) as totalRevenue,
    AVG(ct.totalRevenue) as avgRevenuePerCustomer,
    SUM(ct.orderCount) as totalOrders
FROM customer_tags ct
LEFT JOIN tag_definitions td ON ct.tagType = td.tagType
WHERE ct.tenantId = 'YOUR_TENANT_ID'
    AND ct.removedAt IS NULL
GROUP BY ct.tagType, td.displayName
ORDER BY totalRevenue DESC;
```

### 4. Top 10 Customers in Each Tag Segment

```sql
WITH ranked_customers AS (
    SELECT
        ct.tagType,
        ct.customerId,
        c.email,
        c.firstName,
        c.lastName,
        ct.totalRevenue,
        ct.orderCount,
        ROW_NUMBER() OVER (
            PARTITION BY ct.tagType
            ORDER BY ct.totalRevenue DESC
        ) as rank
    FROM customer_tags ct
    JOIN customers c ON ct.customerId = c.id
    WHERE ct.tenantId = 'YOUR_TENANT_ID'
        AND ct.removedAt IS NULL
)
SELECT *
FROM ranked_customers
WHERE rank <= 10
ORDER BY tagType, rank;
```

### 5. Event Sales Analysis

```sql
SELECT
    o.eventType,
    COUNT(*) as saleCount,
    COUNT(DISTINCT o.customerId) as uniqueCustomers,
    SUM(o.totalAmount) as totalRevenue,
    AVG(o.totalAmount) as avgOrderValue,
    DATE_TRUNC('month', o.createdAt) as month
FROM orders o
WHERE o.tenantId = 'YOUR_TENANT_ID'
    AND o.isEventSale = true
    AND o.createdAt >= NOW() - INTERVAL '12 months'
GROUP BY o.eventType, DATE_TRUNC('month', o.createdAt)
ORDER BY month DESC, totalRevenue DESC;
```

### 6. Customers with Multiple Tag Types (Cross-Segment Analysis)

```sql
SELECT
    ct.customerId,
    c.email,
    c.firstName,
    c.lastName,
    STRING_AGG(DISTINCT ct.tagType, ', ') as tags,
    COUNT(DISTINCT ct.tagType) as tagCount,
    SUM(ct.totalRevenue) as totalRevenue
FROM customer_tags ct
JOIN customers c ON ct.customerId = c.id
WHERE ct.tenantId = 'YOUR_TENANT_ID'
    AND ct.removedAt IS NULL
GROUP BY ct.customerId, c.email, c.firstName, c.lastName
HAVING COUNT(DISTINCT ct.tagType) >= 2
ORDER BY totalRevenue DESC;
```

### 7. Tag Growth Over Time

```sql
SELECT
    ct.tagType,
    DATE_TRUNC('month', ct.addedAt) as month,
    COUNT(*) as newTags,
    COUNT(*) FILTER (WHERE ct.removedAt IS NOT NULL) as removedTags,
    COUNT(*) - COUNT(*) FILTER (WHERE ct.removedAt IS NOT NULL) as netGrowth
FROM customer_tags ct
WHERE ct.tenantId = 'YOUR_TENANT_ID'
    AND ct.addedAt >= NOW() - INTERVAL '12 months'
GROUP BY ct.tagType, DATE_TRUNC('month', ct.addedAt)
ORDER BY month DESC, ct.tagType;
```

### 8. Customer Lifetime Value by Tag

```sql
SELECT
    ct.tagType,
    td.displayName,
    COUNT(DISTINCT ct.customerId) as totalCustomers,
    AVG(
        EXTRACT(EPOCH FROM (
            COALESCE(ct.removedAt, NOW()) - ct.addedAt
        )) / 86400
    ) as avgDaysActive,
    AVG(ct.totalRevenue) as avgLifetimeValue,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY ct.totalRevenue
    ) as medianLifetimeValue
FROM customer_tags ct
LEFT JOIN tag_definitions td ON ct.tagType = td.tagType
WHERE ct.tenantId = 'YOUR_TENANT_ID'
GROUP BY ct.tagType, td.displayName
ORDER BY avgLifetimeValue DESC;
```

### 9. Recently Inactive Tagged Customers (Re-engagement)

```sql
SELECT
    c.id,
    c.email,
    c.firstName,
    c.lastName,
    ct.tagType,
    ct.lastOrderAt,
    ct.totalRevenue,
    ct.orderCount,
    EXTRACT(DAY FROM (NOW() - ct.lastOrderAt)) as daysSinceLastOrder
FROM customer_tags ct
JOIN customers c ON ct.customerId = c.id
WHERE ct.tenantId = 'YOUR_TENANT_ID'
    AND ct.removedAt IS NULL
    AND ct.lastOrderAt IS NOT NULL
    AND ct.lastOrderAt < NOW() - INTERVAL '90 days'
    AND ct.totalRevenue > 500 -- High-value customers
ORDER BY ct.totalRevenue DESC, ct.lastOrderAt ASC;
```

### 10. Event Attendee Conversion to Wine Club

```sql
SELECT
    e.customerId,
    c.email,
    c.firstName,
    c.lastName,
    e.addedAt as eventTagDate,
    w.addedAt as wineClubJoinDate,
    EXTRACT(DAY FROM (w.addedAt - e.addedAt)) as daysToConvert,
    w.totalRevenue as wineClubRevenue
FROM customer_tags e
JOIN customer_tags w ON e.customerId = w.customerId
JOIN customers c ON e.customerId = c.id
WHERE e.tenantId = 'YOUR_TENANT_ID'
    AND e.tagType = 'EVENTS'
    AND w.tagType = 'WINE_CLUB'
    AND e.removedAt IS NULL
    AND w.removedAt IS NULL
    AND w.addedAt > e.addedAt -- Wine club joined after event tag
ORDER BY daysToConvert ASC;
```

---

## Data Integrity Triggers

### Auto-Update Revenue on Order Changes

```sql
CREATE OR REPLACE FUNCTION update_customer_tag_revenue()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all active tags for this customer
    UPDATE customer_tags
    SET
        totalRevenue = (
            SELECT COALESCE(SUM(totalAmount), 0)
            FROM orders
            WHERE customerId = NEW.customerId
                AND tenantId = NEW.tenantId
        ),
        orderCount = (
            SELECT COUNT(*)
            FROM orders
            WHERE customerId = NEW.customerId
                AND tenantId = NEW.tenantId
        ),
        lastOrderAt = (
            SELECT MAX(createdAt)
            FROM orders
            WHERE customerId = NEW.customerId
                AND tenantId = NEW.tenantId
        ),
        updatedAt = NOW()
    WHERE customerId = NEW.customerId
        AND tenantId = NEW.tenantId
        AND removedAt IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_update_tag_revenue
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_tag_revenue();
```

---

## Application Layer Considerations

### TypeScript Types

```typescript
// Tag-related types
export enum TagCategory {
  SEGMENT = 'SEGMENT',
  PREFERENCE = 'PREFERENCE',
  BEHAVIOR = 'BEHAVIOR',
  DEMOGRAPHIC = 'DEMOGRAPHIC'
}

export enum EventType {
  SUPPLIER_TASTING = 'SUPPLIER_TASTING',
  PUBLIC_EVENT = 'PUBLIC_EVENT',
  WINE_CLUB_PICKUP = 'WINE_CLUB_PICKUP',
  PRIVATE_TASTING = 'PRIVATE_TASTING'
}

export enum SalesChannel {
  IN_STORE = 'IN_STORE',
  ONLINE = 'ONLINE',
  EVENT = 'EVENT',
  PHONE = 'PHONE'
}

export interface CustomerTagWithRevenue {
  tagType: string;
  tagValue?: string;
  displayName: string;
  totalRevenue: number;
  orderCount: number;
  lastOrderAt?: Date;
  rank?: number;
}
```

### Service Layer Functions

```typescript
// Example service methods
class CustomerTagService {
  async addTag(
    customerId: string,
    tagType: string,
    tagValue?: string,
    addedBy?: string
  ): Promise<CustomerTag>;

  async removeTag(
    customerId: string,
    tagType: string,
    removedBy?: string
  ): Promise<CustomerTag>;

  async getCustomerTags(
    customerId: string,
    includeRemoved?: boolean
  ): Promise<CustomerTag[]>;

  async getRankedCustomersByTag(
    tagType: string,
    limit?: number
  ): Promise<CustomerTagWithRevenue[]>;

  async getTagRevenueSummary(): Promise<Map<string, TagRevenue>>;
}
```

---

## Performance Considerations

1. **Denormalized Revenue Fields**: `totalRevenue`, `orderCount`, and `lastOrderAt` are denormalized in `CustomerTag` for query performance. Keep in sync with triggers or scheduled jobs.

2. **Soft Deletes**: Use `removedAt IS NULL` in WHERE clauses for active records. Consider archiving old removed tags periodically.

3. **Index Usage**: Composite indexes on `(tenantId, tagType, removedAt, totalRevenue)` optimize the most common revenue ranking queries.

4. **Partial Indexes**: Create partial indexes for `removedAt IS NULL` to speed up active-tag queries.

5. **Materialized Views**: For complex cross-tag analytics, consider materialized views refreshed nightly.

---

## Future Enhancements

- **Tag Scoring**: Add numeric scores/weights to tags for algorithmic ranking
- **Tag Automation Rules**: Auto-tag based on purchase patterns
- **Tag Expiration**: Auto-remove tags after inactivity period
- **Tag Analytics Dashboard**: Real-time tag performance metrics
- **Customer Journey Tracking**: Link tags to customer lifecycle stages
- **A/B Testing**: Tag-based cohort analysis for marketing campaigns
