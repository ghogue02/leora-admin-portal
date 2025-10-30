# Manual Well Crafted Export - Step-by-Step Guide

**Time Required:** 30-45 minutes
**Goal:** Export 7,774 OrderLines + related data from Well Crafted

---

## 📋 STEP 1: Open Terminal

Open a new terminal window (Command+Space, type "Terminal")

---

## 📋 STEP 2: Connect to Well Crafted Database

**Copy and paste this EXACT command:**

```bash
PGPASSWORD="ZKK5pPySuCq7JhpO" psql "postgresql://postgres.zqezunzlyjkseugujkrl@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

**Expected output:**
```
psql (XX.X)
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

postgres=>
```

If you see `postgres=>` you're connected! ✅

---

## 📋 STEP 3: Verify the Data is There

**Copy and paste this command:**

```sql
SELECT 'Customer' as table_name, COUNT(*) as count FROM "Customer"
UNION ALL
SELECT 'Order', COUNT(*) FROM "Order"
UNION ALL
SELECT 'OrderLine', COUNT(*) FROM "OrderLine"
UNION ALL
SELECT 'Sku', COUNT(*) FROM "Sku"
UNION ALL
SELECT 'Product', COUNT(*) FROM "Product";
```

**Expected output (approximately):**
```
 table_name | count
------------+-------
 Customer   | 4864
 Order      | 2669
 OrderLine  | 7774  ← CRITICAL: Must be 7,774!
 Sku        | 2607
 Product    | 3140
```

If you see **7,774 OrderLines**, continue! ✅

---

## 📋 STEP 4: Export Customer Table

**Copy and paste this command:**

```sql
\copy (SELECT * FROM "Customer") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Customer.csv' WITH CSV HEADER;
```

**Expected output:**
```
COPY 4864
```

✅ Customer exported!

---

## 📋 STEP 5: Export Order Table

**Copy and paste this command:**

```sql
\copy (SELECT * FROM "Order") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Order.csv' WITH CSV HEADER;
```

**Expected output:**
```
COPY 2669
```

✅ Order exported!

---

## 📋 STEP 6: Export OrderLine Table (CRITICAL!)

**Copy and paste this command:**

```sql
\copy (SELECT * FROM "OrderLine") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/OrderLine.csv' WITH CSV HEADER;
```

**Expected output:**
```
COPY 7774
```

**⚠️ CRITICAL:** Must be exactly **7,774** records!

✅ OrderLine exported!

---

## 📋 STEP 7: Export Sku Table

**Copy and paste this command:**

```sql
\copy (SELECT * FROM "Sku") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Sku.csv' WITH CSV HEADER;
```

**Expected output:**
```
COPY 2607
```

✅ Sku exported!

---

## 📋 STEP 8: Export Product Table

**Copy and paste this command:**

```sql
\copy (SELECT * FROM "Product") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Product.csv' WITH CSV HEADER;
```

**Expected output:**
```
COPY 3140
```

✅ Product exported!

---

## 📋 STEP 9: Exit psql

Type:
```
\q
```

Then press Enter. You're back to terminal prompt.

---

## 📋 STEP 10: Verify the Files Exist

**Run this command:**

```bash
ls -lh /Users/greghogue/Leora2/exports/wellcrafted-manual/*.csv
```

**Expected output:**
```
-rw-r--r--  Customer.csv
-rw-r--r--  Order.csv
-rw-r--r--  OrderLine.csv  ← Should be largest file
-rw-r--r--  Sku.csv
-rw-r--r--  Product.csv
```

You should see **5 CSV files**! ✅

---

## 📋 STEP 11: Tell Me You're Done!

**Reply with:** "exports complete"

I'll immediately:
1. Convert CSV to JSON
2. Verify 7,774 OrderLines
3. Deploy migration agents
4. Continue Phase 3 automatically

---

## ❓ Troubleshooting

### "Command not found: psql"
**Solution:** Install PostgreSQL client:
```bash
brew install postgresql
```

### "Connection refused"
**Solution:** Check if you copied the entire command with password

### "Permission denied" on file write
**Solution:** Make sure directory exists:
```bash
mkdir -p /Users/greghogue/Leora2/exports/wellcrafted-manual
```

### "Table doesn't exist"
**Solution:** Make sure to use CAPITAL letters: `"Customer"` not `"customer"`

---

## 🎯 Success Checklist

- [ ] Connected to psql successfully
- [ ] Verified 7,774 OrderLines exist
- [ ] Exported Customer.csv
- [ ] Exported Order.csv
- [ ] Exported OrderLine.csv (7,774 records)
- [ ] Exported Sku.csv
- [ ] Exported Product.csv
- [ ] All 5 files visible with `ls` command
- [ ] Ready to tell Claude "exports complete"

---

**Start with Step 1 and work through each step!**

When you're done, reply with **"exports complete"** and I'll take it from there!
