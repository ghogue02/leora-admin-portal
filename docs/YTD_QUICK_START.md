# YTD Implementation - Quick Start

## ✅ What's Done (Backend API)

**All 3 dashboard APIs now include YTD metrics:**

### 1. Sales Dashboard
**Endpoint:** `GET /api/sales/dashboard`

**New Data:**
```json
{
  "metrics": {
    "ytd": {
      "revenue": 12100000,
      "uniqueCustomers": 1907
    }
  }
}
```

### 2. Customers List
**Endpoint:** `GET /api/sales/customers`

**New Data:**
```json
{
  "customers": [
    {
      "ytdRevenue": 1192
    }
  ],
  "summary": {
    "ytdRevenue": 12100000
  }
}
```

### 3. Manager Dashboard
**Endpoint:** `GET /api/sales/manager/dashboard`

**New Data:**
```json
{
  "reps": [
    {
      "ytdRevenue": 12100000
    }
  ],
  "teamStats": {
    "ytdRevenue": 19100000
  }
}
```

---

## 🎨 UI Updates Needed

### Add to Sales Dashboard Page
**File:** `/web/src/app/sales/dashboard/page.tsx`

Add YTD card:
```tsx
<Card>
  <CardHeader>
    <CardTitle>YTD Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">
      ${metrics.ytd.revenue.toLocaleString()}
    </div>
    <p className="text-sm text-muted-foreground">
      {metrics.ytd.uniqueCustomers} customers
    </p>
  </CardContent>
</Card>
```

### Add to Customers Table
**File:** `/web/src/app/sales/customers/page.tsx`

Add YTD column:
```tsx
<TableHead>YTD Revenue</TableHead>
...
<TableCell>
  ${customer.ytdRevenue.toLocaleString()}
</TableCell>
```

### Add to Manager Dashboard
**File:** `/web/src/app/sales/manager/page.tsx`

Add YTD column to reps table:
```tsx
<TableHead>YTD</TableHead>
...
<TableCell>
  ${rep.ytdRevenue.toLocaleString()}
</TableCell>
```

---

## 🧪 Test It

```bash
# Start server
cd /Users/greghogue/Leora2/web
npm run dev

# Open browser
open http://localhost:3000/sales/login

# Login as Travis
# Email: travis@wellcraftedbeverage.com

# Expected YTD Revenue: ~$12.1M
```

---

## 📊 Expected Values

| Dashboard | Metric | Expected |
|-----------|--------|----------|
| Sales Dashboard (Travis) | YTD Revenue | ~$12.1M |
| Manager Dashboard | Team YTD | ~$19.1M |
| Customer List | YTD Summary | ~$12.1M |

---

## ✅ Checklist

- [x] Sales dashboard API updated
- [x] Customers API updated
- [x] Manager dashboard API updated
- [x] YTD calculations tested
- [ ] Sales dashboard UI updated
- [ ] Customers list UI updated
- [ ] Manager dashboard UI updated
- [ ] End-to-end testing complete

---

**Status:** Backend Complete ✅
**Next:** Update UI components
**ETA:** 30 minutes for UI updates
