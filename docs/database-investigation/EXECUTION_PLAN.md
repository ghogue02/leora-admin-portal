# 🚀 Database Migration Execution Plan

**Client Approval:** ✅ RECEIVED
**Mode:** INTENSIVE - Accuracy above all else
**Strategy:** Lovable Primary + Full Migration
**Sources:** Well Crafted + Hal.app CSV exports

---

## ✅ CLIENT DECISIONS

1. **Delete orphaned records:** YES
2. **Migration scope:** FULL (70%+ orderline coverage)
3. **Timeline:** INTENSIVE (accuracy prioritized)
4. **Strategy:** Lovable is primary (Well Crafted will be deleted after)
5. **Data sources:** Well Crafted + Hal.app CSV exports

---

## 🎯 EXECUTION STRATEGY

### **Parallel Agent Deployment:**

Using Claude Code's Task tool to spawn 6 specialized agents working concurrently:

1. **Backup Agent** - Full database export before changes
2. **Cleanup Agent** - Remove orphaned records with documentation
3. **Export Agent** - Complete Well Crafted data extraction
4. **Transform Agent** - Schema transformation (PascalCase → lowercase)
5. **Migration Agent** - Data import with validation
6. **Verification Agent** - Continuous accuracy validation

### **Key Principles:**

- ✅ **Backup everything first** (rollback capability)
- ✅ **Document all changes** (audit trail)
- ✅ **Validate every step** (100% accuracy)
- ✅ **Verify foreign keys** (no new orphans)
- ✅ **Test before commit** (dry-run first)

---

## 📋 PHASE 1: BACKUP & PREPARATION (Parallel)

### **Agent 1: Backup Specialist**
**Mission:** Create complete backup of Lovable database
**Deliverables:**
- Full export of all 15,892 records
- Backup saved to `/Users/greghogue/Leora2/backups/lovable-pre-cleanup-TIMESTAMP.json`
- Verification checksum
- Restore script ready

### **Agent 2: Well Crafted Export Specialist**
**Mission:** Export complete dataset from Well Crafted
**Deliverables:**
- Export all Customers with UUID mapping
- Export all Orders with UUID mapping
- Export all 7,774 OrderLines
- Export all SKUs and Products
- Create UUID cross-reference tables
- Save to `/Users/greghogue/Leora2/exports/wellcrafted-complete-TIMESTAMP/`

### **Agent 3: Orphan Documentation Specialist**
**Mission:** Document all 2,106 orphaned records before deletion
**Deliverables:**
- List of 801 orders with invalid customer IDs
- List of 641 orderlines with invalid order IDs
- List of 192 orderlines with invalid SKU IDs
- List of 472 SKUs with invalid product IDs
- Export to CSV for review
- Identify if any can be recovered

---

## 📋 PHASE 2: CLEANUP (Sequential with verification)

### **Agent 4: Cleanup Specialist**
**Mission:** Delete orphaned records safely
**Process:**
1. Verify backup exists and is complete
2. Delete in order (avoid cascade issues):
   - DELETE 641 orderlines → non-existent orders
   - DELETE 192 orderlines → non-existent SKUs
   - DELETE 801 orders → non-existent customers
   - DELETE 472 SKUs → non-existent products
3. After each deletion:
   - Verify count matches expected
   - Check no new orphans created
   - Log deletion details
4. Final verification: 0 orphaned records

### **Agent 5: Data Quality Specialist**
**Mission:** Fix data quality issues
**Tasks:**
- Fix 7 orderlines with negative prices
- Mark/merge 48 duplicate orders
- Handle 611 orders with $0 total
- Set proper defaults for NULL values
- Validate all changes

---

## 📋 PHASE 3: SCHEMA TRANSFORMATION (Parallel)

### **Agent 6: Schema Transformation Specialist**
**Mission:** Transform Well Crafted data to Lovable schema
**Transformations Required:**

```typescript
Well Crafted → Lovable
================================
Customer → customer
Order → order
OrderLine → orderline
Sku → skus (note: plural!)
Product → product

Column transformations:
- customerId → customerid
- orderId → orderid
- skuId → skuid
- productId → productid
- orderedAt → orderedat
- createdAt → createdat
- updatedAt → updatedat
- Remove: tenantId (Lovable has no tenant)
```

**Deliverables:**
- Transformation functions tested
- Sample data validated
- UUID mapping tables created

---

## 📋 PHASE 4: DATA MIGRATION (Parallel batches)

### **Agent 7: SKU Migration Specialist**
**Mission:** Migrate missing SKUs (estimate: 1,322)
**Process:**
1. Identify SKUs in Well Crafted but not Lovable
2. Transform to lowercase schema
3. Check products exist in Lovable first
4. Import in batches of 100
5. Verify after each batch
6. Report: SKUs added, SKUs skipped (missing products)

### **Agent 8: Product Migration Specialist**
**Mission:** Migrate missing Products (estimate: 1,252)
**Process:**
1. Identify Products in Well Crafted but not Lovable
2. Transform to lowercase schema
3. Import in batches of 100
4. Verify after each batch
5. Report: Products added

### **Agent 9: OrderLine Migration Specialist**
**Mission:** Migrate 7,774 OrderLines with matching
**Process:**
1. Load Well Crafted OrderLines with order details
2. For each OrderLine:
   - Find matching Lovable order by:
     - Customer name + order date + total
     - Or customer ID + order date
   - Verify SKU exists in Lovable
   - If match found: queue for import
   - If no match: log and skip
3. Import matched OrderLines in batches of 100
4. After each batch:
   - Verify foreign keys valid
   - Check order totals match
   - No orphans created
5. Final report: Coverage percentage achieved

**Target:** 70%+ order coverage (700+ orders with orderlines)

---

## 📋 PHASE 5: CONSTRAINTS & SAFEGUARDS (Sequential)

### **Agent 10: Database Constraints Specialist**
**Mission:** Add foreign key constraints
**Tasks:**
```sql
-- Add constraints to prevent future orphans
ALTER TABLE "order"
  ADD CONSTRAINT fk_order_customer
  FOREIGN KEY (customerid) REFERENCES customer(id)
  ON DELETE RESTRICT;

ALTER TABLE orderline
  ADD CONSTRAINT fk_orderline_order
  FOREIGN KEY (orderid) REFERENCES "order"(id)
  ON DELETE CASCADE;

ALTER TABLE orderline
  ADD CONSTRAINT fk_orderline_sku
  FOREIGN KEY (skuid) REFERENCES skus(id)
  ON DELETE RESTRICT;

ALTER TABLE skus
  ADD CONSTRAINT fk_sku_product
  FOREIGN KEY (productid) REFERENCES product(id)
  ON DELETE RESTRICT;
```

**Verification:** Test constraints prevent invalid inserts

---

## 📋 PHASE 6: VERIFICATION & VALIDATION (Parallel)

### **Agent 11: Data Integrity Verifier**
**Mission:** Verify 100% integrity
**Checks:**
- [ ] 0 orders reference non-existent customers
- [ ] 0 orderlines reference non-existent orders
- [ ] 0 orderlines reference non-existent SKUs
- [ ] 0 SKUs reference non-existent products
- [ ] All foreign keys valid
- [ ] No orphaned records

### **Agent 12: Revenue Accuracy Verifier**
**Mission:** Verify revenue calculations
**Checks:**
- [ ] Order totals = SUM(orderline quantities × prices)
- [ ] Orders with orderlines show correct revenue
- [ ] Orders without orderlines are intentional (samples/cancelled)
- [ ] Financial reports accurate
- [ ] 70%+ order coverage achieved

### **Agent 13: Coverage Analyzer**
**Mission:** Analyze final coverage
**Report:**
- Total orders in Lovable
- Orders with orderlines (count + %)
- Orders without orderlines (breakdown by reason)
- OrderLines migrated (count)
- SKUs available vs used
- Data completeness score

---

## 📋 PHASE 7: DOCUMENTATION & HANDOFF

### **Agent 14: Documentation Specialist**
**Mission:** Complete migration documentation
**Deliverables:**
1. **Migration Report:**
   - Records backed up
   - Records deleted (with reasons)
   - Records migrated (by table)
   - Verification results
   - Coverage achieved
   - Issues encountered

2. **Data Dictionary:**
   - Schema differences documented
   - Transformation rules
   - UUID mappings
   - Field mappings

3. **Validation Scripts:**
   - Daily integrity check script
   - Revenue accuracy validator
   - Orphan detection script
   - Import validation template

4. **Runbook:**
   - How to import CSV data safely
   - How to verify after import
   - How to rollback if needed
   - Troubleshooting guide

---

## 🎯 SUCCESS CRITERIA

### **Must Have (100% Required):**
- ✅ Full backup created and verified
- ✅ 0 orphaned records in Lovable
- ✅ All foreign key constraints in place
- ✅ 70%+ order coverage achieved
- ✅ Revenue calculations accurate
- ✅ No data loss from Well Crafted
- ✅ Complete audit trail

### **Nice to Have:**
- 80%+ order coverage
- All Well Crafted data migrated
- Automated monitoring in place
- Client trained on validation

---

## 📊 MONITORING & PROGRESS

**Progress Tracking:**
- Each agent reports completion percentage
- Central dashboard shows overall progress
- Blockers escalated immediately
- Verification gates at each phase

**Communication:**
- Hourly progress updates
- Immediate notification of issues
- Pause points for approval
- Final report upon completion

---

## 🚨 ROLLBACK PLAN

**If anything goes wrong:**

1. **STOP immediately**
2. **Restore from backup:**
   ```bash
   npm run restore-lovable-backup
   ```
3. **Analyze what went wrong**
4. **Fix issue**
5. **Resume or restart**

**Backup retention:** Keep for 30 days post-migration

---

## 📞 HAL.APP DATA REQUEST

**To expedite Phase 4, please export from Hal.app:**

### **Priority 1: OrderLines**
**CSV Format:**
```
order_date,customer_name,customer_email,sku_code,product_name,quantity,unit_price,total,is_sample
2025-09-15,Acme Wine Shop,acme@example.com,CHARD750,Chardonnay 750ml,12,24.99,299.88,false
```

### **Priority 2: Orders**
**CSV Format:**
```
order_date,customer_name,customer_email,order_total,order_number,status
2025-09-15,Acme Wine Shop,acme@example.com,299.88,ORD-12345,delivered
```

### **Priority 3: Products/SKUs (if different from Well Crafted)**
**CSV Format:**
```
sku_code,product_name,producer,size,category,unit_price
CHARD750,Chardonnay Reserve,Ridge Vineyards,750ml,White Wine,24.99
```

**Timeline:** Not blocking - will integrate once received

---

**EXECUTION START TIME:** Awaiting final confirmation
**ESTIMATED COMPLETION:** 12-17 hours (intensive mode)
**COORDINATION:** Claude Code Task tool with parallel agents
**VERIFICATION:** 100% accuracy requirement

---

**Ready to deploy agents upon your GO signal.**
