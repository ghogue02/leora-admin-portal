# 📊 Data Quality Test Checklist
## Comprehensive Data Validation for Leora CRM

**Test Date:** _______________
**Tester:** Data Quality Agent
**Database:** PostgreSQL (Supabase)
**Tenant:** 58b8126a-2d2f-4f55-bc98-5b6784800bed

---

## 🎯 **OBJECTIVE**

Validate data completeness and accuracy across all tables.
Identify missing data, NULL fields, and data quality issues.
Provide recommendations for data population.

---

## 📋 **SECTION 1: CUSTOMER DATA VALIDATION**

### **Test 1.1: Customer Count & Distribution**

**Query:**
```sql
SELECT
  COUNT(*) as total,
  COUNT("salesRepId") as assigned,
  COUNT(*) - COUNT("salesRepId") as unassigned
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Expected:** 4,838 total customers, all assigned to sales reps

**Results:**
- Total customers: _____
- Assigned to reps: _____
- Unassigned: _____
- **Status:** PASS / FAIL

---

### **Test 1.2: Customer Classification**

**Query:**
```sql
SELECT
  "accountType",
  "accountPriority",
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'), 2) as percentage
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "accountType", "accountPriority"
ORDER BY "accountType";
```

**Expected:**
- ACTIVE (HIGH): ~728 (15%)
- TARGET (MEDIUM): ~122 (2.5%)
- PROSPECT (LOW): ~3,988 (82.5%)

**Results:**
```
ACTIVE: _____ (_____%)
TARGET: _____ (_____%)
PROSPECT: _____ (_____%)
```

**Status:** PASS / FAIL

---

### **Test 1.3: Customer Contact Information**

**Query:**
```sql
SELECT
  COUNT(*) as total,
  COUNT("email") as has_email,
  COUNT("phone") as has_phone,
  COUNT("street1") as has_address,
  COUNT("city") as has_city,
  COUNT("state") as has_state,
  COUNT("postalCode") as has_zip
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total: _____
Has Email: _____ (_____%)
Has Phone: _____ (_____%)
Has Address: _____ (_____%)
Has City: _____ (_____%)
Has State: _____ (_____%)
Has Zip: _____ (_____%)
```

**Issues:** List customers with missing critical data

---

### **Test 1.4: Customer Revenue Data**

**Query:**
```sql
SELECT
  COUNT(*) as total,
  COUNT("lastOrderDate") as has_last_order,
  COUNT("nextExpectedOrderDate") as has_next_expected,
  COUNT("establishedRevenue") as has_revenue
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Has Last Order Date: _____ / 4838 (_____%)
Has Next Expected Order: _____ / 4838 (_____%)
Has Established Revenue: _____ / 4838 (_____%)
```

**Status:** PASS / FAIL
**Issue:** Most customers showing $0 revenue in UI

---

### **Test 1.5: Territory Distribution**

**Query:**
```sql
SELECT
  "territory",
  COUNT(*) as count
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "territory"
ORDER BY count DESC
LIMIT 10;
```

**Expected:** VA (~1,907), MD (~1,201), DC (~499)

**Results:**
```
Top 10 Territories:
1. _____ : _____ customers
2. _____ : _____ customers
3. _____ : _____ customers
...
```

---

## 📦 **SECTION 2: PRODUCT & INVENTORY DATA**

### **Test 2.1: Product Completeness**

**Query:**
```sql
SELECT
  COUNT(*) as total,
  COUNT("brand") as has_brand,
  COUNT("category") as has_category,
  COUNT("description") as has_description,
  COUNT(NULLIF("brand", '')) as brand_not_empty
FROM "Product"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total Products: _____
Has Brand: _____ (_____%)
Brand Not Empty: _____ (_____%)
Has Category: _____ (_____%)
Has Description: _____ (_____%)
```

**Status:** Should be 100% after fixes

---

### **Test 2.2: SKU & Inventory**

**Query:**
```sql
SELECT
  COUNT(DISTINCT s.id) as total_skus,
  COUNT(DISTINCT i.id) as skus_with_inventory,
  SUM(i."onHand") as total_inventory
FROM "Sku" s
LEFT JOIN "Inventory" i ON i."skuId" = s.id
WHERE s."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total SKUs: _____
SKUs with Inventory: _____ (_____%)
Total Units in Stock: _____
```

**Expected:** All SKUs should have inventory after fixes

---

### **Test 2.3: Inventory Status Distribution**

**Query:**
```sql
SELECT
  "status",
  COUNT(*) as count
FROM "Inventory"
GROUP BY "status";
```

**Results:**
```
AVAILABLE: _____
ALLOCATED: _____
PICKED: _____
SHIPPED: _____
```

---

## 📋 **SECTION 3: ORDER & INVOICE DATA**

### **Test 3.1: Order Count & Status**

**Query:**
```sql
SELECT
  "status",
  COUNT(*) as count,
  SUM("total") as total_value
FROM "Order"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "status";
```

**Results:**
```
DRAFT: _____ orders, $_____ total
SUBMITTED: _____ orders, $_____ total
FULFILLED: _____ orders, $_____ total
CANCELLED: _____ orders, $_____ total
```

**Issue to investigate:** If 0 orders, revenue metrics will be $0

---

### **Test 3.2: OrderLine Details**

**Query:**
```sql
SELECT
  COUNT(*) as total_lines,
  COUNT(DISTINCT "orderId") as orders_with_lines,
  SUM("quantity") as total_units,
  SUM("quantity" * "unitPrice") as total_revenue
FROM "OrderLine"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total Order Lines: _____
Orders with Lines: _____
Total Units: _____
Total Revenue: $_____
```

---

### **Test 3.3: Invoice Status**

**Query:**
```sql
SELECT
  "status",
  COUNT(*) as count,
  SUM("total") as total_amount
FROM "Invoice"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "status";
```

**Results:**
```
DRAFT: _____
SENT: _____
PAID: _____
OVERDUE: _____
```

---

## 📊 **SECTION 4: SALES REP & ACTIVITY DATA**

### **Test 4.1: Sales Rep Distribution**

**Query:**
```sql
SELECT
  sr."territoryName",
  u."email",
  COUNT(c.id) as customer_count
FROM "SalesRep" sr
JOIN "User" u ON sr."userId" = u.id
LEFT JOIN "Customer" c ON c."salesRepId" = sr.id
WHERE sr."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY sr.id, sr."territoryName", u."email"
ORDER BY customer_count DESC;
```

**Results:**
```
South Territory (Travis): _____ customers
North Territory (Kelly): _____ customers
East Territory (Carolyn): _____ customers
...
```

**Expected:** 4,838 total distributed across 6 reps

---

### **Test 4.2: Activity Data**

**Query:**
```sql
SELECT
  "type",
  COUNT(*) as count
FROM "Activity"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "type";
```

**Results:**
```
Total Activities: _____
By Type:
  CALL: _____
  VISIT: _____
  EMAIL: _____
  TEXT: _____
```

---

## 🎯 **SECTION 5: CALL PLAN & SAMPLES DATA**

### **Test 5.1: Call Plans**

**Query:**
```sql
SELECT
  COUNT(*) as total_plans,
  COUNT(CASE WHEN "status" = 'ACTIVE' THEN 1 END) as active,
  COUNT(CASE WHEN "status" = 'COMPLETED' THEN 1 END) as completed
FROM "CallPlan"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total Call Plans: _____
Active: _____
Completed: _____
```

---

### **Test 5.2: Sample Usage**

**Query:**
```sql
SELECT
  COUNT(*) as total_samples,
  COUNT(CASE WHEN "resultedInOrder" = true THEN 1 END) as converted,
  ROUND(COUNT(CASE WHEN "resultedInOrder" = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as conversion_rate
FROM "SampleUsage"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total Samples: _____
Converted to Orders: _____
Conversion Rate: _____%
```

---

### **Test 5.3: Sample Feedback Templates**

**Query:**
```sql
SELECT "category", COUNT(*) as count
FROM "SampleFeedbackTemplate"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "category";
```

**Expected:** 11 templates (4 Positive, 4 Negative, 3 Neutral)

**Results:**
```
Positive: _____
Negative: _____
Neutral: _____
Total: _____
```

---

## 📦 **SECTION 6: WAREHOUSE & OPERATIONS DATA**

### **Test 6.1: Warehouse Configuration**

**Query:**
```sql
SELECT
  "aisleCount",
  "rowsPerAisle",
  "shelfLevels",
  "pickStrategy"
FROM "WarehouseConfig"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Expected:** 15 aisles, 25 rows, 3 shelf levels

**Results:**
```
Aisles: _____
Rows per Aisle: _____
Shelf Levels: _____
Pick Strategy: _____
```

---

### **Test 6.2: Inventory Locations**

**Query:**
```sql
SELECT
  COUNT(*) as total_inventory,
  COUNT("aisle") as has_aisle,
  COUNT("row") as has_row,
  COUNT("shelf") as has_shelf,
  COUNT("pickOrder") as has_pick_order
FROM "Inventory";
```

**Results:**
```
Total Inventory Records: _____
Has Aisle: _____ (_____%)
Has Row: _____ (_____%)
Has Shelf: _____ (_____%)
Has pickOrder: _____ (_____%)
```

**Expected:** All inventory created, but locations not yet assigned

---

### **Test 6.3: Pick Sheets**

**Query:**
```sql
SELECT
  COUNT(*) as total,
  "status",
  COUNT(*) as count
FROM "PickSheet"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "status";
```

**Results:**
```
Total Pick Sheets: _____
DRAFT: _____
READY: _____
PICKING: _____
PICKED: _____
```

---

## 🗺️ **SECTION 7: MAPS & TERRITORY DATA**

### **Test 7.1: Customer Geocoding**

**Query:**
```sql
SELECT
  COUNT(*) as total,
  COUNT("latitude") as has_lat,
  COUNT("longitude") as has_lng,
  COUNT("geocodedAt") as geocoded
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total Customers: 4,838
Has Latitude: _____ (_____%)
Has Longitude: _____ (_____%)
Geocoded: _____ (_____%)
```

**Expected:** 0 (geocoding not run yet)

---

### **Test 7.2: Territories**

**Query:**
```sql
SELECT
  COUNT(*) as total_territories,
  COUNT("boundaries") as has_boundaries,
  COUNT("salesRepId") as assigned_to_rep
FROM "Territory"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
Total Territories: _____
Has Boundaries: _____
Assigned to Rep: _____
```

**Expected:** 0 or few (territories manually created)

---

## 🔧 **SECTION 8: AUTOMATED TRIGGERS & JOBS**

### **Test 8.1: Automated Triggers**

**Query:**
```sql
SELECT
  "triggerType",
  "name",
  "isActive"
FROM "AutomatedTrigger"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Expected:** 4 triggers seeded

**Results:**
```
1. _____________________ (Active: Y/N)
2. _____________________ (Active: Y/N)
3. _____________________ (Active: Y/N)
4. _____________________ (Active: Y/N)
```

---

### **Test 8.2: Job Queue**

**Query:**
```sql
SELECT
  "type",
  "status",
  COUNT(*) as count
FROM "Job"
GROUP BY "type", "status";
```

**Results:**
```
Pending Jobs: _____
Completed Jobs: _____
Failed Jobs: _____
```

---

## 📧 **SECTION 9: EMAIL & IMAGE SCANNING**

### **Test 9.1: Mailchimp Sync**

**Query:**
```sql
SELECT COUNT(*) FROM "MailchimpSync"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:** _____ (Expected: 0 - not configured yet)

---

### **Test 9.2: Image Scans**

**Query:**
```sql
SELECT
  "scanType",
  "status",
  COUNT(*) as count
FROM "ImageScan"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY "scanType", "status";
```

**Results:**
```
Business Cards: _____
Licenses: _____
Completed: _____
Failed: _____
```

---

## ⚠️ **SECTION 10: MISSING DATA IDENTIFICATION**

### **Critical Missing Data:**

**Customer Revenue Metrics:**
- [ ] establishedRevenue is NULL for most customers
- [ ] nextExpectedOrderDate is NULL
- [ ] averageOrderIntervalDays is NULL
- **Impact:** Revenue widgets show $0, predictive ordering broken

**Recommendation:**
```
Need to calculate from Order history OR
Import historical revenue data OR
Manually set for key accounts
```

---

**Customer Last Order Date:**
- [ ] Check if lastOrderDate is populated
- [ ] If NULL, customers classified as PROSPECT

**Query:**
```sql
SELECT
  COUNT(CASE WHEN "lastOrderDate" IS NULL THEN 1 END) as no_last_order,
  COUNT(CASE WHEN "lastOrderDate" IS NOT NULL THEN 1 END) as has_last_order
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Results:**
```
No Last Order: _____
Has Last Order: _____
```

---

**Order Data:**
- [ ] Check if Order table has records

**Query:**
```sql
SELECT COUNT(*) FROM "Order"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Result:** _____ orders

**Issue:** If 0 orders, all revenue will be $0

---

**OrderLine Data:**
- [ ] Check if OrderLines exist

**Query:**
```sql
SELECT COUNT(*) FROM "OrderLine"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Result:** _____ order lines

---

## 📊 **SECTION 11: DATA QUALITY SUMMARY**

### **Completeness Score:**

| Data Category | Completeness | Grade |
|---------------|--------------|-------|
| Customer Basic Info | _____% | A-F |
| Customer Classification | _____% | A-F |
| Customer Contact | _____% | A-F |
| Customer Revenue | _____% | A-F |
| Products | _____% | A-F |
| Inventory | _____% | A-F |
| Orders | _____% | A-F |
| Activities | _____% | A-F |

**Overall Data Quality:** _____ / 100

---

### **Critical Missing Data:**

**Priority 1 (Blocking Features):**
```
1. _____________________________________
2. _____________________________________
3. _____________________________________
```

**Priority 2 (Degraded Features):**
```
1. _____________________________________
2. _____________________________________
3. _____________________________________
```

**Priority 3 (Nice to Have):**
```
1. _____________________________________
2. _____________________________________
3. _____________________________________
```

---

## 💡 **SECTION 12: RECOMMENDATIONS**

### **Immediate Actions:**

**1. Import Historical Orders** (If available)
```
Rationale: Customers show $0 revenue because no orders exist
Impact: Revenue dashboards will populate, metrics will be accurate
Effort: Medium (need order data source)
```

**2. Calculate Established Revenue** (From existing data)
```sql
-- If orders exist, calculate:
UPDATE "Customer" c
SET "establishedRevenue" = (
  SELECT SUM(o."total")
  FROM "Order" o
  WHERE o."customerId" = c.id
    AND o."status" = 'FULFILLED'
)
WHERE c."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**3. Geocode Customers** (For map features)
```bash
# Run geocoding script
npx tsx scripts/geocode-all-customers.ts 58b8126a-2d2f-4f55-bc98-5b6784800bed
```

**4. Assign Warehouse Locations** (For pick sheets)
```
Import locations from CSV or manually assign
Enables optimized pick sheet generation
```

---

## 📝 **SECTION 13: DATA GAPS ANALYSIS**

### **What's Missing and Why:**

**Customer Revenue = $0:**
- **Cause:** No Order records imported yet
- **Fix:** Import historical orders OR accept $0 for new system
- **Alternative:** Manually set establishedRevenue for key accounts

**Next Expected Order = NULL:**
- **Cause:** Requires order history to calculate
- **Fix:** Run calculation after importing orders
- **Formula:** lastOrderDate + averageOrderIntervalDays

**Inventory Locations = NULL:**
- **Cause:** Not assigned yet (warehouse layout needed)
- **Fix:** Run location assignment or import from CSV
- **Impact:** Pick sheets can't optimize route

**Customer Geocoding = NULL:**
- **Cause:** Geocoding script not run (requires Mapbox token)
- **Fix:** Configure Mapbox token and run geocode script
- **Impact:** Map features won't show markers

---

## ✅ **SECTION 14: VERIFICATION CHECKLIST**

### **Core Data Present:**
- [ ] 4,838 customers imported ✅
- [ ] Customer names populated ✅
- [ ] Customer addresses populated ✅
- [ ] Customer classification (ACTIVE/TARGET/PROSPECT) ✅
- [ ] Sales rep assignments ✅
- [ ] 3,140 products with brands ✅
- [ ] 2,607 SKUs with inventory ✅
- [ ] 11 sample feedback templates ✅
- [ ] 4 automated triggers ✅
- [ ] Warehouse configuration ✅

### **Data Gaps (Expected):**
- [ ] No historical orders (explains $0 revenue)
- [ ] No customer geocoding (map markers won't show)
- [ ] No warehouse locations (pick sheets won't optimize)
- [ ] No sample history (analytics will be empty)
- [ ] No email campaigns (Mailchimp not configured)

---

## 🎯 **FINAL ASSESSMENT**

**Data Quality Status:** _____ / 10

**Production Readiness:**
- **For Testing/Demo:** ✅ READY
- **For Production:** ⚠️ NEEDS ORDER DATA

**Recommendation:**
```
The CRM has excellent foundational data:
- Customer information complete
- Product catalog complete
- Infrastructure tables ready

To unlock full functionality:
1. Import historical order data (if available)
2. Run geocoding for map features (requires Mapbox)
3. Assign warehouse locations (if using pick sheets)
4. Configure integrations (Mailchimp, etc.)

Current state is perfect for:
- Testing all UI/UX
- Training sales team
- Demonstrating features
- Planning deployment
```

---

## 📤 **DELIVERABLES**

**Save this completed checklist as:**
```
DATA_QUALITY_RESULTS_[DATE].md
```

**Include:**
- All query results
- Completeness percentages
- Missing data analysis
- Recommendations
- Priority of fixes

---

**Test completed by:** _______________
**Date:** _______________
**Overall Data Quality:** _____ / 100

---

**This checklist provides complete visibility into data quality!** 📊
