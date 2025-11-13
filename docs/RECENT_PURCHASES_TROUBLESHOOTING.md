# Recent Purchases - Troubleshooting Guide

**Issue**: Recent Purchases section is expanded but showing nothing for Wells Discount Wine customer
**Customer**: Wells Discount Wine (Baltimore City)
**Known Data**: 189 total orders, last order 10/23/2025 (20 days ago)

## Diagnostic Steps

### 1. Check Browser Developer Console

**Open DevTools** (F12 or Cmd+Option+I)

#### Console Tab
Look for errors or logs:
```javascript
// Filter for useRecentItems
[useRecentItems]

// Check for API errors
[recent-items]

// Any React errors
TypeError
```

#### Network Tab
1. **Clear** existing requests (trash icon)
2. **Refresh** the page or select a different customer then back to Wells Discount Wine
3. **Look for** request to `/api/sales/customers/{id}/recent-items`
4. **Check response**:
   - Status: Should be `200 OK`
   - Response body: Should have `{"items": [...]}`
   - If 401/403: Authentication issue
   - If 404: Customer not found
   - If 500: Server error

**Expected Request**:
```
GET /api/sales/customers/7b482d59-3fbf-4353-9708-2506f7859aeb/recent-items
```

**Expected Response (if has orders)**:
```json
{
  "items": [
    {
      "skuId": "...",
      "skuCode": "ABC123",
      "productName": "Product Name",
      "lastQuantity": 12,
      "lastUnitPrice": 25.50,
      "lastOrderedAt": "2025-10-23T...",
      "timesOrdered": 5,
      "priceMatchesStandard": true
    }
  ]
}
```

**Expected Response (if no recent orders)**:
```json
{
  "items": []
}
```

### 2. Check Server Logs

**Terminal running dev server** should show:

```bash
# When Recent Purchases section loads:
[recent-items] Customer: Wells Discount Wine (Baltimore City)
[recent-items] Found X order lines
[recent-items] After filtering: X lines
[recent-items] After aggregation: X suggestions
[recent-items] Returning X recent purchase suggestions
```

**If you see**:
- `Found 0 order lines` → Database query returned nothing (RLS issue or no orders)
- `After filtering: 0 lines` → Orders exist but being filtered out (missing SKUs or dates)
- `After aggregation: 0 suggestions` → Logic error in aggregation function

### 3. Possible Issues

#### Issue A: Dev Server Not Reloaded

**Symptom**: Code changes not reflected in running server

**Solution**: Hard refresh browser
```bash
# In browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Or clear Next.js cache
rm -rf .next
npm run dev
```

#### Issue B: RLS Policy Blocking Query

**Symptom**: API returns empty results despite orders existing

**Cause**: After connection pool fix, queries need `withTenant` for RLS context

**Status**: ✅ Already fixed in commit `f93d3c0`

**Verify**: Check that recent-items/route.ts uses `withTenant`:
```typescript
const result = await withTenant(tenantId, async (tx) => {
  const customer = await tx.customer.findFirst({ ... });
  const orderLines = await tx.orderLine.findMany({ ... });
  return { customer, orderLines };
});
```

#### Issue C: Order Lines Missing SKU Relationships

**Symptom**: Orders exist but have no SKU data loaded

**Cause**: SKUs deleted or relationship broken

**Check Filter Logic** (line 136):
```typescript
.filter((line) => line.order?.orderedAt && line.sku)
```

This filters out any line where:
- `line.order` is null
- `line.order.orderedAt` is null
- `line.sku` is null (deleted SKU)

#### Issue D: Sales Rep Assignment Issue

**Symptom**: Customer exists but query returns 404

**Code** (lines 36-49):
```typescript
const customer = await tx.customer.findFirst({
  where: {
    id: customerId,
    tenantId,
    ...(managerScope ? {} : { salesRepId }), // ← Filters by salesRepId
  },
});
```

**If not a manager**: Customer must be assigned to logged-in sales rep

**Check**: Is Wells Discount Wine assigned to Jose Bustillo (the logged-in user)?

### 4. Manual Test in Browser Console

Open browser console (F12) and run:

```javascript
// Get customer ID from the page
const customerSelect = document.querySelector('select, input[type="text"]')?.closest('[data-customer-id]');
const customerId = '7b482d59-3fbf-4353-9708-2506f7859aeb'; // Wells Discount Wine ID

// Test API directly
fetch(`/api/sales/customers/${customerId}/recent-items`)
  .then(response => {
    console.log('Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Response:', data);
    console.log('Items count:', data.items?.length || 0);
    if (data.items?.length > 0) {
      console.log('Sample item:', data.items[0]);
    } else {
      console.log('Reason for empty:', data.error || 'No orders in last 6 months');
    }
  })
  .catch(err => console.error('API Error:', err));
```

### 5. Debugging with Added Logs

The recent-items endpoint now has extensive logging. After refreshing the page and selecting the customer, check the terminal for:

```
[recent-items] Customer: Wells Discount Wine (Baltimore City)
[recent-items] Found 42 order lines
[recent-items] Sample order line: { skuId: '...', hasSku: true, hasOrder: true, hasOrderedAt: true }
[recent-items] After filtering: 42 lines (filtered out 0)
[recent-items] After aggregation: 20 suggestions
[recent-items] Returning 20 recent purchase suggestions
```

**If you see 0 at any step**, that's where the problem is.

## Quick Solutions

### Solution 1: Hard Refresh Browser

```bash
# Browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Solution 2: Restart Dev Server

```bash
# Kill existing servers
pkill -f "next dev"

# Start fresh
cd /Users/greghogue/Leora2/web
npm run dev
```

### Solution 3: Clear Next.js Cache

```bash
rm -rf .next
npm run dev
```

### Solution 4: Check Customer Assignment

If the logged-in user is NOT a manager and Wells Discount Wine is NOT assigned to them:

```sql
-- Check customer assignment
SELECT c."name", c."salesRepId", sr."user"."fullName" as "assignedTo"
FROM "Customer" c
LEFT JOIN "SalesRep" sr ON sr."id" = c."salesRepId"
WHERE c."name" ILIKE '%Wells Discount Wine%';
```

**If not assigned**: Either:
- Assign customer to Jose Bustillo
- Log in as a manager account
- Change the API to allow all users (remove salesRepId filter)

## Expected Timeline

1. **Immediate**: Add console logs (✅ done)
2. **Next 1 min**: Hard refresh browser, check Network tab
3. **Next 2 min**: Check server terminal for logs
4. **Next 5 min**: Identify issue from logs/Network tab
5. **Next 10 min**: Apply targeted fix based on findings

## Files with Debugging

- [src/app/api/sales/customers/[customerId]/recent-items/route.ts](../src/app/api/sales/customers/[customerId]/recent-items/route.ts#L125-L177) - Added 4 console.log statements

## What to Look For

### ✅ Working Correctly

- Network request shows 200 status
- Response has `items` array with > 0 length
- Console shows no errors
- Server logs show successful query with results

### ❌ Not Working

**Scenario A**: Network tab shows no request
→ Frontend not calling API (check useRecentItems hook)

**Scenario B**: Network request returns 404
→ Customer not assigned to this sales rep

**Scenario C**: Network request returns 500
→ Server error (check terminal logs)

**Scenario D**: Network request returns 200 but `items: []`
→ Orders exist but filtered out (check server logs for counts)

## Next Actions

1. **Hard refresh** the browser page (Cmd+Shift+R)
2. **Open DevTools** Network tab
3. **Select** Wells Discount Wine customer again
4. **Check** Network tab for `/recent-items` request
5. **Check** server terminal for console logs
6. **Report** what you see in Network tab and terminal

This will pinpoint exactly where the issue is!
