# Warehouse PickOrder System

## Overview

The warehouse pickOrder system automatically calculates a numeric sorting value based on inventory location data. This enables efficient warehouse picking by organizing items in their physical order.

## How It Works

### Formula

```
pickOrder = (aisle × 10,000) + (row × 100) + shelf
```

### Examples

| Location | Aisle | Row | Shelf | PickOrder |
|----------|-------|-----|-------|-----------|
| A1-R1-S1 | 1 | 1 | 1 | 10,101 |
| A1-R2-S3 | 1 | 2 | 3 | 10,203 |
| A5-R10-S3 | 5 | 10 | 3 | 51,003 |
| A10-R5-S12 | 10 | 5 | 12 | 100,512 |

This creates a natural sorting order: shelves within rows, rows within aisles.

## Automatic Calculation

### Prisma Middleware

The system uses Prisma middleware to automatically calculate pickOrder whenever inventory location changes:

```typescript
// In src/lib/prisma.ts
prisma.$use(async (params, next) => {
  if (params.model === 'Inventory') {
    // Auto-calculate pickOrder on create/update
  }
  return next(params);
});
```

**Triggers automatically on:**
- `Inventory.create()` - New inventory items
- `Inventory.update()` - Location changes
- `Inventory.upsert()` - Create or update
- `Inventory.createMany()` - Batch creates
- `Inventory.updateMany()` - Batch updates

### What This Means

You **never need to manually calculate pickOrder**. Just set the location field and pickOrder is calculated automatically:

```typescript
// ✅ This is all you need - pickOrder is calculated automatically
await prisma.inventory.create({
  data: {
    tenantId,
    skuId,
    location: 'A5-R10-S3',  // pickOrder: 51003 calculated automatically
    onHand: 100,
  }
});

// ✅ Updates also work automatically
await prisma.inventory.update({
  where: { id: inventoryId },
  data: {
    location: 'A7-R2-S1',  // pickOrder: 70201 calculated automatically
  }
});
```

## Location Format Support

The parser supports multiple location formats:

### Delimiter-Based
- `A1-R2-S3` ✅ (recommended)
- `A1/R2/S3` ✅
- `A1|R2|S3` ✅
- `A1,R2,S3` ✅

### Word-Based
- `Aisle 1, Row 2, Shelf 3` ✅
- `Aisle-1 Row-2 Shelf-3` ✅
- `aisle:1 row:2 shelf:3` ✅

### Object Format (Future)
```typescript
{
  aisle: 'A1',
  row: 'R2',
  shelf: 'S3'
}
```

## Validation

The system validates location data:

- ✅ All three components required (aisle, row, shelf)
- ✅ Values must be non-negative numbers
- ✅ Maximum values: aisle ≤ 999, row ≤ 99, shelf ≤ 99
- ⚠️ Invalid locations log warnings but don't break operations

## Manual Usage (Utilities)

While automatic calculation is preferred, utilities are available for manual use:

```typescript
import {
  calculatePickOrder,
  parseLocation,
  isValidLocation,
  formatLocation
} from '@/lib/warehouse';

// Parse location string
const result = parseLocation('A5-R10-S3');
console.log(result.pickOrder); // 51003

// Calculate from components
const pickOrder = calculatePickOrder({
  aisle: 5,
  row: 10,
  shelf: 3
}); // 51003

// Validate location
if (isValidLocation('A5-R10-S3')) {
  // Valid location
}

// Format components
const formatted = formatLocation({
  aisle: 5,
  row: 10,
  shelf: 3
}); // "A5-R10-S3"
```

## Migration Script

For existing inventory, use the recalculation script:

```bash
# Dry run (preview changes)
npm run tsx scripts/recalculate-pick-orders.ts --dry-run

# Full recalculation (all tenants)
npm run tsx scripts/recalculate-pick-orders.ts

# Specific tenant only
npm run tsx scripts/recalculate-pick-orders.ts --tenant-id=<uuid>

# Verbose output
npm run tsx scripts/recalculate-pick-orders.ts --verbose
```

### When to Use Migration Script

- ✅ Initial setup when adding pickOrder functionality
- ✅ After manually updating location data in database
- ✅ After changing location format
- ❌ During normal operations (middleware handles this)

## API Integration

The system works transparently with existing APIs:

```typescript
// POST /api/admin/inventory/[skuId]/adjust
// pickOrder calculated automatically when inventory created/updated
{
  "location": "A5-R10-S3",
  "adjustmentType": "add",
  "quantity": 50,
  "reason": "Stock receipt"
}

// Response includes calculated pickOrder (if field exists)
{
  "success": true,
  "inventory": {
    "location": "A5-R10-S3",
    "pickOrder": 51003,
    "onHand": 50
  }
}
```

## Testing

Run comprehensive tests:

```bash
# Run warehouse utility tests
npm test -- warehouse.test.ts

# Test coverage includes:
# - Location parsing (20+ formats)
# - PickOrder calculation (edge cases)
# - Validation logic
# - Integration workflows
```

## Database Schema

**Note:** The `pickOrder` field needs to be added to the Inventory model:

```prisma
model Inventory {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  skuId     String   @db.Uuid
  location  String
  pickOrder Int?     // Add this field
  onHand    Int      @default(0)
  allocated Int      @default(0)
  // ... other fields
}
```

### Migration

```sql
-- Add pickOrder column
ALTER TABLE "Inventory" ADD COLUMN "pickOrder" INTEGER;

-- Create index for efficient sorting
CREATE INDEX "Inventory_pickOrder_idx" ON "Inventory"("pickOrder");

-- Optional: Add index for location-based queries
CREATE INDEX "Inventory_location_idx" ON "Inventory"("location");
```

After migration, run recalculation script to populate values.

## Performance Considerations

### Efficient Sorting

With pickOrder indexed, warehouse picking lists are extremely fast:

```typescript
// Fast query - uses pickOrder index
const pickingList = await prisma.inventory.findMany({
  where: { tenantId, onHand: { gt: 0 } },
  orderBy: { pickOrder: 'asc' },  // ⚡ Indexed!
});
```

### Middleware Overhead

The middleware adds ~1-2ms per operation:
- ✅ Negligible for single operations
- ✅ Acceptable for batch operations (100-1000 items)
- ⚠️ Consider disabling for bulk imports (>10,000 items)

To bypass middleware for bulk imports:

```typescript
// Use raw SQL for massive bulk operations
await prisma.$executeRaw`
  INSERT INTO "Inventory" (location, "pickOrder", ...)
  VALUES
    ('A1-R1-S1', 10101, ...),
    ('A1-R1-S2', 10102, ...)
`;
```

## Troubleshooting

### PickOrder Not Calculated

**Symptom:** pickOrder is null/undefined after create/update

**Solutions:**
1. Check middleware is loaded: `import { prisma } from '@/lib/prisma'`
2. Verify location format: `parseLocation(location)` should return `success: true`
3. Check schema: `pickOrder` field must exist in Inventory model
4. Run migration script to backfill values

### Invalid Location Warnings

**Symptom:** Console warnings about failed location parsing

**Solutions:**
1. Check location format matches supported patterns
2. Ensure all three components (aisle, row, shelf) are present
3. Verify values are within limits (aisle ≤ 999, row ≤ 99, shelf ≤ 99)
4. Use `isValidLocation()` to test before saving

### Performance Issues

**Symptom:** Slow queries when sorting by location

**Solutions:**
1. Ensure pickOrder index exists: `CREATE INDEX "Inventory_pickOrder_idx"`
2. Use `pickOrder` for sorting instead of `location`
3. Consider partitioning by tenant for large datasets

## Best Practices

1. **Always use standard format:** `A{n}-R{n}-S{n}` for consistency
2. **Let middleware handle calculation:** Don't manually set pickOrder
3. **Index pickOrder:** Essential for query performance
4. **Validate on input:** Use `isValidLocation()` in forms/APIs
5. **Run migration after schema changes:** Keep data synchronized

## Future Enhancements

Potential improvements:

- [ ] Support for bin/position sub-levels
- [ ] Zone-based picking optimization
- [ ] Multi-warehouse location prefixes
- [ ] Custom weighting for picking efficiency
- [ ] Location proximity calculations
- [ ] Automated location suggestions

## Related Files

- **Utilities:** `/web/src/lib/warehouse.ts`
- **Middleware:** `/web/src/lib/prisma.ts`
- **Tests:** `/web/src/lib/__tests__/warehouse.test.ts`
- **Migration:** `/web/scripts/recalculate-pick-orders.ts`
- **API:** `/web/src/app/api/admin/inventory/*/route.ts`
