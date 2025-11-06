# Manual Pricing Override UI - Implementation Summary

**Phase 3 Sprint 2** - Manager Price Override Feature

## Overview

Implemented comprehensive manual pricing override functionality allowing managers and admins to override product prices during order creation with full audit trail and approval workflow.

## Features Implemented

### 1. Permission System (`src/lib/permissions.ts`)

**New Utility Functions**:
```typescript
- hasPermission(session, permissionCode): boolean
- hasRole(session, roleCode): boolean
- canOverridePrices(session): boolean // Manager/Admin only
- canApproveOrders(session): boolean
```

**Roles Allowed to Override**:
- Manager (`manager`)
- Admin (`admin`)
- System Admin (`system_admin`)

### 2. Price Override Dialog (`src/components/orders/PriceOverrideDialog.tsx`)

**Features**:
- ✅ Current price display with product details
- ✅ New price input with validation (must be > $0)
- ✅ Required reason field (minimum 10 characters)
- ✅ Price change indicator (percentage and dollar amount)
- ✅ Warning for large price changes (>20%)
- ✅ Confirmation for very large changes (>50%)
- ✅ Real-time line total calculation

**Validation Rules**:
- Price must be > $0.00
- Reason must be at least 10 characters
- Confirms large price changes with user

### 3. Product Grid Updates (`src/components/orders/ProductGrid.tsx`)

**New Features**:
- ✅ Override button (pencil icon) next to prices
- ✅ Visual "Override" badge on overridden items
- ✅ Original price shown struck through
- ✅ Remove override button (X icon)
- ✅ Override state management with Map
- ✅ Permission-based UI (only shown to managers)

**Props Added**:
```typescript
canOverridePrices?: boolean // Controls visibility
onAddProduct: (product, quantity, inventory, pricing, priceOverride?) => void
```

**Export Types**:
```typescript
export type PriceOverride = {
  price: number;
  reason: string;
};
```

### 4. Order Page Integration (`src/app/sales/orders/new/page.tsx`)

**Changes**:
- ✅ Permission check on page load (checks user roles)
- ✅ OrderItem type extended with `priceOverride` field
- ✅ Visual indicators in order items table
- ✅ Approval required when override detected
- ✅ Override data sent to API

**Visual Indicators**:
- Blue "Manual Price Override" label
- Override reason displayed below product
- "Override Applied" badge on unit price
- Highlighted in blue color scheme

### 5. API Updates (`src/app/api/sales/orders/route.ts`)

**Schema Updated**:
```typescript
CreateOrderSchema = z.object({
  // ... existing fields
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().int().positive(),
      priceOverride: z.object({
        price: z.number().positive(),
        reason: z.string().min(10),
      }).optional(),
    })
  ).min(1),
});
```

**Database Fields Populated**:
```typescript
{
  priceOverridden: boolean,
  overridePrice: Decimal,
  overrideReason: string,
  overriddenBy: userId,
  overriddenAt: timestamp,
}
```

**Approval Logic**:
- Order marked `requiresApproval = true` when price override detected
- Status set to `DRAFT` instead of `PENDING`
- Applied pricing rules updated with `manual_price_override` source

### 6. Database Schema (Already Exists)

**OrderLine Model**:
```prisma
model OrderLine {
  // ... existing fields
  priceOverridden     Boolean         @default(false)
  overridePrice       Decimal?        @db.Decimal(10, 2)
  overrideReason      String?
  overriddenBy        String?
  overriddenAt        DateTime?
  // ...
}
```

## User Flow

### Manager/Admin Workflow:

1. **Add Product to Order**
   - Navigate to "Create New Order"
   - Select customer and products
   - Click pencil icon next to price

2. **Override Price**
   - Modal opens showing current price
   - Enter new price
   - Provide detailed reason (required, min 10 chars)
   - Click "Apply Override"

3. **Visual Confirmation**
   - Original price shown struck through
   - New price highlighted in blue
   - "Override" badge displayed
   - Reason visible in product details

4. **Submit Order**
   - Order automatically flagged for approval
   - Status: DRAFT (requires manager approval)
   - Full audit trail recorded

### Sales Rep Experience:

- Override button NOT visible (no permission)
- Cannot modify prices manually
- Standard pricing rules apply

## Testing

Comprehensive test suite created: `tests/manual-pricing-override.test.ts`

**Test Coverage**:
- ✅ Permission checks (manager/admin/sales_rep)
- ✅ Validation (price > 0, reason length)
- ✅ Audit trail (all fields recorded)
- ✅ UI display (badges, indicators, tooltips)
- ✅ API integration (payload structure)
- ✅ Security (role enforcement, SQL injection prevention)
- ✅ Edge cases (decimal precision, large changes)

## Security Considerations

### Client-Side:
- Permission check before showing UI
- Validation of inputs
- Warning on large price changes

### Server-Side:
- ✅ Role validation in API route
- ✅ Zod schema validation
- ✅ Prisma parameterized queries (SQL injection safe)
- ✅ Audit trail with userId and timestamp

### Approval Workflow:
- Override automatically requires manager approval
- Order status: DRAFT
- Cannot be fulfilled without approval

## Files Created/Modified

### New Files:
```
src/components/orders/PriceOverrideDialog.tsx
src/lib/permissions.ts
tests/manual-pricing-override.test.ts
docs/MANUAL_PRICING_OVERRIDE_IMPLEMENTATION.md
```

### Modified Files:
```
src/components/orders/ProductGrid.tsx
src/app/sales/orders/new/page.tsx
src/app/api/sales/orders/route.ts
```

## Performance Impact

- Minimal: Uses React state management (Map)
- No additional API calls
- Efficient permission checks (cached in state)

## Future Enhancements

Potential improvements for future sprints:

1. **Override History**
   - View all price overrides for a customer
   - Analytics on override frequency/amounts

2. **Approval Notifications**
   - Email/SMS to managers when override needs approval
   - Dashboard widget for pending approvals

3. **Advanced Permissions**
   - Per-user override limits (max % discount)
   - Territory-specific override rules

4. **Bulk Override**
   - Apply same override to multiple products
   - Template-based override reasons

## Notes

- Database schema (Phase 2) already included override fields
- Permission system is role-based (expandable to permission-based)
- Full backward compatibility maintained
- No breaking changes to existing API

## Deployment Checklist

- [x] Components created
- [x] Permission system implemented
- [x] API validation added
- [x] Visual indicators working
- [x] Tests written
- [x] Documentation complete
- [ ] Code review
- [ ] QA testing
- [ ] Manager training
- [ ] Production deployment

---

**Implementation Date**: 2025-01-06
**Developer**: Claude Code (AI Assistant)
**Sprint**: Phase 3 Sprint 2
**Status**: ✅ Complete - Ready for Review
