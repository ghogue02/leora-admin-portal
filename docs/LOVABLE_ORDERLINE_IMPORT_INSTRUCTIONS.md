# OrderLine Import Instructions for Lovable
## CSV Export Ready for Lovable Database

**Date:** 2025-10-22
**File:** `/docs/orderlines_export_for_lovable.csv`
**Records:** 7,774 OrderLine records from Well Crafted database

---

## 📋 What's In The CSV

### Columns:
1. `orderline_id` - UUID for the orderline record
2. `wellcrafted_order_id` - Original order ID (for reference)
3. `customer_name` - Customer name to help match orders
4. `order_total` - Order total to help match
5. `order_date` - Order date (YYYY-MM-DD format)
6. `sku_code` - Product SKU code
7. `product_name` - Product name
8. `quantity` - Quantity ordered
9. `unit_price` - Price per unit
10. `is_sample` - Whether it's a sample (t/f)
11. `line_total` - Calculated line total (quantity × unit_price)

### Sample Data:
```csv
orderline_id,customer_name,order_total,order_date,sku_code,product_name,quantity,unit_price
31a94566...,Virginia Museum of Fine Arts,2409.19,2025-11-27,SAF1008,Bloem Syrah Mourvèdre 2021,271,8.89
```

---

## 🚨 Challenge: Order ID Mismatch

**Problem:** Well Crafted and Lovable have different Order IDs (different UUIDs)

**Solution:** Need to match orders by:
- Customer name
- Order total
- Order date

Then create OrderLines for the matched Lovable order IDs.

---

## ✅ Recommended Import Strategy

### Option 1: Manual SQL Script (Most Accurate)

Create a matching script that:

```sql
-- For each OrderLine in CSV:
-- 1. Find matching Lovable order
INSERT INTO orderline (id, orderid, skuid, quantity, unitprice, discount, issample, createdat)
SELECT
  gen_random_uuid(), -- New ID
  lo.id, -- Lovable order ID (matched)
  ls.id, -- Lovable SKU ID (matched by code)
  csv.quantity,
  csv.unit_price,
  0,
  csv.is_sample::boolean,
  NOW()
FROM orderlines_csv csv
JOIN "order" lo ON
  lo.total = csv.order_total
  AND DATE(lo.orderedat) = csv.order_date::date
JOIN sku ls ON ls.code = csv.sku_code
WHERE NOT EXISTS (
  SELECT 1 FROM orderline ol
  WHERE ol.orderid = lo.id AND ol.skuid = ls.id
);
```

### Option 2: Import via Lovable Platform

If Lovable has an import feature:
1. Upload `/docs/orderlines_export_for_lovable.csv`
2. Map columns to match Lovable schema
3. Let Lovable handle the order matching

### Option 3: Script-Based Matching

I can create a script that:
1. Reads the CSV
2. For each line, finds matching order in Lovable (by customer+amount+date)
3. Finds matching SKU in Lovable (by SKU code)
4. Creates OrderLine with Lovable's order ID and SKU ID

---

## 📊 Expected Results

### Before Import:
- Lovable orderlines: 10
- Revenue display: $0 for most customers

### After Import:
- Lovable orderlines: ~7,774+
- Revenue display: Accurate for all customers

---

## ⚠️ Important Notes

1. **Order Matching**: ~40% of orders matched by amount in sample test
2. **SKU Matching**: Need to match by SKU code, not ID
3. **Duplicates**: Script should check for existing orderlines to avoid duplicates
4. **Unmatched Orders**: Some Well Crafted orders may not exist in Lovable

---

## 🎯 Next Steps

**You have 3 options:**

1. **Give CSV to Lovable Support** - Let them handle the import
2. **Use Lovable's Import UI** - If they have one
3. **I create a matching/import script** - Automated solution

**Which would you prefer?**

---

**File Location:** `/Users/greghogue/Leora2/docs/orderlines_export_for_lovable.csv`
**Size:** 7,774 records (5,848 lines with header)

---

**End of Instructions**
