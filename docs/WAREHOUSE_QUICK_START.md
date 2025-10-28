# Warehouse PickOrder - Quick Start Guide

## TL;DR

PickOrder is **automatically calculated** from inventory locations. You don't need to do anything special - just set the `location` field and pickOrder is handled automatically.

## 5-Minute Setup

### 1. Add Schema Field (Required)

```prisma
// In prisma/schema.prisma
model Inventory {
  // ... existing fields
  pickOrder Int?     // Add this line

  @@index([pickOrder])  // Add this index
}
```

### 2. Run Migration

```bash
npx prisma migrate dev --name add_inventory_pick_order
```

### 3. Populate Existing Data

```bash
npm run tsx scripts/recalculate-pick-orders.ts
```

### 4. Verify

```bash
npm test -- warehouse.test.ts
```

✅ Done! The system is now active.

---

## Usage Examples

### Create Inventory (Automatic)

```typescript
// ✅ pickOrder calculated automatically
await prisma.inventory.create({
  data: {
    location: 'A5-R10-S3',  // That's it!
    onHand: 100,
    // pickOrder: 51003 added automatically
  }
});
```

### Update Location (Automatic)

```typescript
// ✅ pickOrder recalculated automatically
await prisma.inventory.update({
  where: { id },
  data: {
    location: 'A7-R2-S1',  // Just update location
    // pickOrder: 70201 recalculated automatically
  }
});
```

### Picking List (Use pickOrder)

```typescript
// ✅ Fast, efficient warehouse order
const items = await prisma.inventory.findMany({
  where: { onHand: { gt: 0 } },
  orderBy: { pickOrder: 'asc' },  // Indexed!
});
```

---

## Location Formats Supported

All these work automatically:

```typescript
'A1-R2-S3'              ✅ Recommended
'A1/R2/S3'              ✅
'Aisle 1, Row 2, Shelf 3'  ✅
'aisle:1 row:2 shelf:3'    ✅
{ aisle: 'A1', row: 'R2', shelf: 'S3' }  ✅
```

## PickOrder Formula

```
pickOrder = (aisle × 10,000) + (row × 100) + shelf
```

| Location | PickOrder |
|----------|-----------|
| A1-R1-S1 | 10,101 |
| A5-R10-S3 | 51,003 |
| A10-R5-S12 | 100,512 |

---

## Common Tasks

### Validate Location Before Saving

```typescript
import { isValidLocation } from '@/lib/warehouse';

if (!isValidLocation(locationInput)) {
  return { error: 'Invalid location format' };
}
```

### Manual Calculation (Rare)

```typescript
import { calculatePickOrder } from '@/lib/warehouse';

const pickOrder = calculatePickOrder({
  aisle: 5,
  row: 10,
  shelf: 3
}); // 51003
```

### Parse Unknown Format

```typescript
import { parseLocation } from '@/lib/warehouse';

const result = parseLocation(userInput);
if (result.success) {
  console.log('PickOrder:', result.pickOrder);
  console.log('Components:', result.components);
}
```

---

## Migration Script

```bash
# Preview changes (safe)
npm run tsx scripts/recalculate-pick-orders.ts --dry-run

# Recalculate all
npm run tsx scripts/recalculate-pick-orders.ts

# Specific tenant
npm run tsx scripts/recalculate-pick-orders.ts --tenant-id=<uuid>

# Verbose output
npm run tsx scripts/recalculate-pick-orders.ts --verbose
```

---

## Troubleshooting

### PickOrder is Null

**Check:**
1. Is `pickOrder` field in schema?
2. Did you run migration?
3. Is location format valid?

**Fix:**
```bash
# Run migration script
npm run tsx scripts/recalculate-pick-orders.ts
```

### Location Parse Failed

**Check console for warning:**
```
[Warehouse Middleware] Failed to parse location "X": error details
```

**Fix:** Ensure location has all three components (aisle, row, shelf)

### Tests Failing

```bash
# Run tests with details
npm test -- warehouse.test.ts --reporter=verbose
```

---

## Best Practices

✅ **DO:**
- Use format `A{n}-R{n}-S{n}` for consistency
- Let middleware calculate pickOrder
- Index pickOrder for performance
- Validate location in UI/API

❌ **DON'T:**
- Manually set pickOrder
- Use negative numbers
- Exceed limits (aisle: 999, row: 99, shelf: 99)
- Skip migration after schema change

---

## Performance Tips

### Fast Picking Lists
```typescript
// ✅ Uses index - very fast
.orderBy({ pickOrder: 'asc' })

// ❌ No index - slower
.orderBy({ location: 'asc' })
```

### Batch Operations
```typescript
// ✅ Middleware handles automatically
await prisma.inventory.createMany({
  data: locations.map(loc => ({
    location: loc,
    // pickOrder calculated for each
  }))
});
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Run tests | `npm test -- warehouse.test.ts` |
| Migrate schema | `npx prisma migrate dev` |
| Recalculate all | `npm run tsx scripts/recalculate-pick-orders.ts` |
| Dry run | `npm run tsx scripts/recalculate-pick-orders.ts --dry-run` |
| Check valid | `isValidLocation(location)` |
| Parse location | `parseLocation(location)` |

---

## Documentation

- **Full docs:** `/web/docs/WAREHOUSE_PICKORDER.md`
- **Implementation:** `/web/docs/WAREHOUSE_IMPLEMENTATION_SUMMARY.md`
- **Source code:** `/web/src/lib/warehouse.ts`
- **Tests:** `/web/src/lib/__tests__/warehouse.test.ts`
- **Migration:** `/web/scripts/recalculate-pick-orders.ts`

---

## Need Help?

1. Check tests: `npm test -- warehouse.test.ts`
2. Read full docs: `/web/docs/WAREHOUSE_PICKORDER.md`
3. Review examples in tests: `/web/src/lib/__tests__/warehouse.test.ts`
4. Run migration: `npm run tsx scripts/recalculate-pick-orders.ts --verbose`

---

**Remember:** pickOrder is automatic! Just set `location` and it works. 🚀
