# OrderLine Migration Instructions
## Copy OrderLines from Well Crafted to Lovable

**Critical:** Lovable has only 10 orderlines, needs 7,774+ to display revenue correctly

---

## 🎯 The Issue

- **Lovable has:** Orders, Invoices, Customers ✅
- **Lovable missing:** OrderLine records (only 10, needs ~7,774)
- **Result:** Revenue shows $0 because calculations use OrderLines

---

## ✅ Recommended Solution: Direct SQL Copy

### Step 1: Get Lovable Database Password

1. Go to: https://supabase.com/dashboard/project/wlwqkblueezqydturcpv/settings/database
2. Find "Connection string" section
3. Click "Reveal" to see password
4. Copy it

### Step 2: Export OrderLines from Well Crafted

```bash
# Export OrderLines as CSV
psql "postgresql://postgres.zqezunzlyjkseugujkrl:ZKK5pPySuCq7JhpO@aws-1-us-east-1.pooler.supabase.com:5432/postgres" -c "
COPY (
  SELECT
    id,
    \"tenantId\" as tenant_id,
    \"orderId\" as order_id,
    \"skuId\" as sku_id,
    quantity,
    \"unitPrice\" as unit_price,
    COALESCE(\"isSample\", false) as is_sample,
    \"createdAt\" as created_at,
    \"updatedAt\" as updated_at
  FROM \"OrderLine\"
  ORDER BY \"createdAt\"
) TO STDOUT WITH CSV HEADER" > /tmp/orderlines.csv
```

### Step 3: Import to Lovable

```bash
# Import to Lovable (replace [PASSWORD] with actual password)
psql "postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres" -c "
COPY orderline (
  id,
  tenant_id,
  order_id,
  sku_id,
  quantity,
  unit_price,
  is_sample,
  created_at,
  updated_at
)
FROM STDIN WITH CSV HEADER" < /tmp/orderlines.csv
```

### Step 4: Verify

```bash
# Check Lovable orderline count
psql "postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres" -c "
SELECT COUNT(*) FROM orderline;"
```

Should show ~7,774+ rows

---

## 🔧 Alternative: Use Supabase Dashboard

If psql doesn't work:

1. Export from Well Crafted:
   - Go to Well Crafted Supabase dashboard
   - Database → Table Editor → OrderLine
   - Export as CSV

2. Import to Lovable:
   - Go to Lovable Supabase dashboard
   - Database → Table Editor → orderline
   - Import CSV
   - Map columns (tenantId → tenant_id, etc.)

---

## ⏱️ Estimated Time

- Export: 1 minute
- Import: 2-3 minutes
- Verify: 1 minute

**Total:** ~5 minutes

---

## ✅ After Migration

Revenue should display correctly in UI because orderlines will be populated!

---

**Status:** Waiting for Lovable database password to proceed
