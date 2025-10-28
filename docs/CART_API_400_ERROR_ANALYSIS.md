# Cart API 400 Error Analysis

## Problem Summary

The `/api/sales/cart` endpoint is returning a **400 Bad Request** error because it requires a `customerId` query parameter, but the `CartProvider` component is calling the endpoint without providing one.

## Root Cause

### API Route Requirements (`/src/app/api/sales/cart/route.ts`)

```typescript
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const customerId = request.nextUrl.searchParams.get("customerId");

      if (!customerId) {
        return NextResponse.json(
          { error: "customerId query parameter is required." },
          { status: 400 },  // ← THIS IS THE ERROR
        );
      }
      // ... rest of handler
    }
  );
}
```

**The API explicitly checks for `customerId` and returns 400 if missing.**

### Client-Side Call (`/src/app/sales/_components/CartProvider.tsx`)

```typescript
const fetchCart = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch("/api/sales/cart", { cache: "no-store" })
                                              // ↑ NO customerId parameter!

    if (!response.ok) {
      // Silently handle 400 - expected when no customerId is in context
      if (response.status === 401 || response.status === 400) {
        setCart(null);
        return;
      }
      // ...
    }
  }
}, []);
```

**The cart is fetched WITHOUT any `customerId` query parameter.**

## Why This Happens

The sales cart is designed to work **per-customer** basis:
1. A sales rep selects/views a specific customer
2. The cart should be loaded for that customer
3. Orders are placed on behalf of that customer

However, the `CartProvider` is rendered at the **layout level** (`/src/app/sales/layout.tsx`) and has no context of which customer is currently selected.

## Architecture Issue

```
/sales/layout.tsx
  └─ <CartProvider>  ← Mounted at layout level, no customer context
      └─ children (all sales pages)
```

The cart provider runs on ALL sales pages, including:
- `/sales/dashboard` - No specific customer
- `/sales/catalog` - No specific customer
- `/sales/customers/[customerId]` - Has customer context
- `/sales/cart` - Expects cart to exist

## Evidence from Code

### 1. CartProvider silently handles 400 errors
```typescript
// Line 111 in CartProvider.tsx
if (response.status === 401 || response.status === 400) {
  setCart(null);
  return;
}
```
This suggests the developers knew about the issue but chose to silently ignore it.

### 2. API validates customer ownership
```typescript
// Lines 18-32 in route.ts
const customer = await db.customer.findFirst({
  where: {
    id: customerId,
    tenantId,
    salesRepId: session.user.salesRep?.id,
  },
});

if (!customer) {
  return NextResponse.json(
    { error: "Customer not found or not assigned to this sales rep." },
    { status: 404 },
  );
}
```
The API properly validates that the customer belongs to the logged-in sales rep.

### 3. PortalUser creation for cart ownership
```typescript
// Lines 43-53 in route.ts
if (!portalUser) {
  portalUser = await db.portalUser.create({
    data: {
      tenantId,
      customerId,
      email: customer.billingEmail ?? `${customer.accountNumber}@placeholder.local`,
      fullName: customer.name,
      status: "ACTIVE",
    },
  });
}
```
The cart is associated with a `portalUser`, which is created from the customer.

## Impact

- **Current behavior**: Cart always returns 400, cart badge shows 0 items
- **Silent failure**: No visible error to users, cart appears empty
- **Session validation passes**: The error happens AFTER successful authentication
- **Console logs**: "Session validated successfully" then 400 error

## Solution Options

### Option 1: Customer Context Provider (Recommended)
Create a `CustomerContext` to track the currently selected customer:

```typescript
// New: CustomerProvider.tsx
export function CustomerProvider({ children }) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  // ... context implementation
}

// CartProvider.tsx
const { customerId } = useCustomer();
const url = customerId
  ? `/api/sales/cart?customerId=${customerId}`
  : null;
```

**Pros**: Clean architecture, works with existing code
**Cons**: Requires new context provider

### Option 2: URL-Based Customer Selection
Store customer ID in URL/localStorage:

```typescript
// CartProvider.tsx
const searchParams = useSearchParams();
const customerId = searchParams.get('customerId')
  ?? localStorage.getItem('lastCustomerId');
```

**Pros**: Simple implementation
**Cons**: Fragile, breaks on page navigation

### Option 3: Remove Cart from Global Layout
Only mount cart on pages that have customer context:

```typescript
// Move CartProvider from layout.tsx to specific pages
// catalog/page.tsx, customers/[customerId]/page.tsx
```

**Pros**: No breaking changes
**Cons**: Cart not available globally, poor UX

### Option 4: Change API to Not Require Customer (Alternative Design)
Make the cart work at the sales rep level, not customer level:

```typescript
// API would load cart for the logged-in sales rep
// Customer association happens at checkout time
```

**Pros**: Simpler cart logic
**Cons**: Major API redesign, breaks existing assumptions

## Recommended Fix

**Implement Option 1: Customer Context Provider**

1. Create `CustomerProvider` to manage selected customer state
2. Update `CartProvider` to use customer context
3. Add customer selection UI to catalog/cart pages
4. Persist selection in localStorage for convenience

This maintains the current architecture while providing proper customer context.

## Files to Modify

1. `/src/app/sales/_components/CustomerProvider.tsx` - NEW
2. `/src/app/sales/_components/CartProvider.tsx` - Update to use customer context
3. `/src/app/sales/layout.tsx` - Wrap with CustomerProvider
4. `/src/app/sales/catalog/sections/CatalogGrid.tsx` - Add customer selector
5. `/src/app/sales/cart/page.tsx` - Add customer selector
6. `/src/app/sales/customers/[customerId]/page.tsx` - Set customer context

## Timeline

- **Immediate**: Document the issue (this file)
- **Short-term**: Add customer selector to critical pages
- **Long-term**: Implement full customer context system
