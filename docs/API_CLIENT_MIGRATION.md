# API Client Migration Guide

## Problem

All fetch calls to `/api/sales/*` endpoints must include `credentials: "include"` to send authentication cookies. Missing this causes 401 Unauthorized errors.

## Solution

Use the new `apiClient` utility from `/src/lib/api-client.ts` which automatically includes credentials.

## Before (❌ WRONG)

```typescript
const response = await fetch("/api/sales/customers");
const data = await response.json();
```

## After (✅ CORRECT)

```typescript
import { api } from "@/lib/api-client";

const data = await api.get("/api/sales/customers");
```

## Usage Examples

### GET Request
```typescript
import { api } from "@/lib/api-client";

// Simple GET
const customers = await api.get("/api/sales/customers");

// GET with query parameters
const filtered = await api.get("/api/sales/customers", {
  status: "active",
  page: 1,
  limit: 20
});
```

### POST Request
```typescript
import { api } from "@/lib/api-client";

const newCustomer = await api.post("/api/sales/customers", {
  name: "New Customer",
  email: "customer@example.com"
});
```

### PUT/PATCH Request
```typescript
import { api } from "@/lib/api-client";

const updated = await api.patch("/api/sales/customers/123", {
  status: "inactive"
});
```

### DELETE Request
```typescript
import { api } from "@/lib/api-client";

await api.delete("/api/sales/customers/123");
```

### Error Handling
```typescript
import { api, ApiError } from "@/lib/api-client";

try {
  const data = await api.get("/api/sales/customers");
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}:`, error.message);
    console.error("Details:", error.data);
  } else {
    console.error("Network error:", error);
  }
}
```

### Advanced Usage
```typescript
import { apiClient } from "@/lib/api-client";

const data = await apiClient({
  path: "/api/sales/customers",
  method: "POST",
  body: { name: "Test" },
  params: { include: "details" },
  headers: {
    "X-Custom-Header": "value"
  }
});
```

## Migration Checklist

Files that need to be migrated:

- [ ] src/app/sales/customers/[customerId]/page.tsx
- [ ] src/app/sales/customers/page.tsx
- [ ] src/app/sales/leora/_components/DrilldownModal.tsx
- [ ] src/app/sales/leora/_components/AutoInsights.tsx
- [ ] src/app/sales/leora/page.tsx
- [ ] src/app/sales/territories/components/BoundaryDrawer.tsx
- [ ] src/app/sales/territories/components/CustomerAssigner.tsx
- [ ] src/app/sales/territories/mobile/page.tsx
- [ ] src/app/sales/territories/page.tsx
- [ ] src/app/sales/territories/analytics/page.tsx
- [ ] src/app/sales/invoices/page.tsx
- [ ] src/app/sales/catalog/sections/CatalogGrid.tsx
- [ ] src/app/sales/catalog/_components/ProductDrilldownModal.tsx
- [ ] src/app/sales/admin/sections/CustomerAssignment.tsx
- [ ] src/app/sales/admin/sections/RepManagement.tsx
- [ ] src/app/sales/admin/sections/ProductGoals.tsx
- [ ] src/app/sales/dashboard/sections/*.tsx
- [ ] src/app/sales/samples/sections/*.tsx
- [ ] src/app/sales/_components/CartProvider.tsx
- [ ] src/app/sales/_components/SalesNav.tsx
- [ ] ... and 20+ more files

## Quick Fix for Immediate Relief

For an immediate fix without migrating all files, add this pattern to each fetch call:

```typescript
const response = await fetch("/api/sales/endpoint", {
  credentials: "include", // ADD THIS LINE
  method: "GET"
});
```

## Testing

After migration, verify:

1. ✅ Login works and sets cookies
2. ✅ `/api/sales/auth/me` returns user data (not 401)
3. ✅ All protected endpoints work without 401 errors
4. ✅ Browser DevTools > Network tab shows cookies being sent

## Root Cause

The issue was that Next.js fetch does NOT include credentials by default. This is different from browser behavior for same-origin requests. All authenticated API calls must explicitly set `credentials: "include"`.

## Prevention

Going forward:
1. **ALWAYS use `api.*` helpers** from `@/lib/api-client`
2. **NEVER use raw `fetch()` for `/api/sales/*` endpoints**
3. Add ESLint rule to prevent raw fetch (TODO)
