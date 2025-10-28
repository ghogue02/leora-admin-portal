# Account Type System - Quick Reference Card

**Phase:** 2.1 | **Status:** ✅ Complete | **Date:** 2025-10-25

---

## 🎯 Account Types

| Type | Threshold | Sales Action |
|------|-----------|--------------|
| **ACTIVE** | < 6 months since order | Regular calls, upsell |
| **TARGET** | 6-12 months since order | Reactivation, win-back |
| **PROSPECT** | Never OR >12 months | Prospecting, education |

---

## 🔄 State Transitions

```
PROSPECT ──order──► ACTIVE ──6mo──► TARGET ──6mo──► PROSPECT
            ▲                          │
            └──────order────────────────┘
```

---

## 🚀 Quick Commands

```bash
# Test logic (dry run - no changes)
tsx src/scripts/test-account-type-logic.ts

# Update all customers (run manually)
npm run jobs:update-account-types

# Update specific tenant
npm run jobs:run -- update-account-types --tenant-slug well-crafted
```

---

## 📁 Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/account-types.ts` | Core service | 177 |
| `src/jobs/update-account-types.ts` | Daily job | 92 |
| `src/lib/hooks/after-order-create.ts` | Real-time hook | 145 |
| `src/scripts/test-account-type-logic.ts` | Test script | 249 |

---

## 🔌 Integration Example

```typescript
// POST /api/orders route
import { afterOrderCreate } from '@/lib/hooks/after-order-create';

const order = await prisma.order.create({ data });

await afterOrderCreate({
  orderId: order.id,
  customerId: order.customerId,
  orderedAt: order.orderedAt,
  total: order.total
});
```

---

## 📊 Expected Distribution

- **ACTIVE:** 60-75% (healthy)
- **TARGET:** 5-15% (normal)
- **PROSPECT:** 15-30% (typical)

⚠️ **Alert if:** ACTIVE < 50% OR TARGET > 20%

---

## ⚙️ Production Setup

**Vercel Cron (vercel.json):**
```json
{
  "crons": [{
    "path": "/api/cron/update-account-types",
    "schedule": "0 2 * * *"
  }]
}
```

**API Route:** Create `/api/cron/update-account-types/route.ts`
```typescript
import { updateAccountTypes } from '@/lib/account-types';

export async function GET() {
  const results = await updateAccountTypes();
  return Response.json({ success: true, results });
}
```

---

## 📚 Documentation

- **Detailed Guide:** `/docs/jobs/account-type-updates.md` (474 lines)
- **Implementation Summary:** `/docs/PHASE2.1_ACCOUNT_TYPE_IMPLEMENTATION.md`
- **Implementation Plan:** `/docs/LEORA_IMPLEMENTATION_PLAN.md` (Lines 387-495)

---

**Need Help?** See full documentation at `/web/docs/jobs/account-type-updates.md`
