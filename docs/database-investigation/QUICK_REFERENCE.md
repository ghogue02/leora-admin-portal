# Database Cleanup - Quick Reference

## Current Status (as of October 23, 2025)

| Metric | Value | Status |
|--------|-------|--------|
| **Customers** | 4,947 | ✅ Clean |
| **Products** | 3,479 | ✅ Clean |
| **SKUs** | 2,243 | ✅ Clean |
| **Orders** | 2,635 | ✅ Clean |
| **Orderlines** | 9,042 | ✅ Clean |
| **Coverage** | 55.10% | ⚠️ Below 70% target |
| **Orphaned Records** | 0 | ✅ Perfect integrity |
| **FK Constraints** | Ready | ✅ Can enable |

---

## Quick Commands

### Verify Database Integrity
```bash
cd /Users/greghogue/Leora2/scripts/database-investigation
npx tsx verify-integrity.ts
```
**Expected output**: ✅ Perfect integrity, 55.10% coverage

### Re-run Cleanup (if needed)
```bash
npx tsx final-cleanup.ts
```
**Caution**: Only run if orphaned records detected

### Check Schema
```bash
npx tsx check-schema.ts
```
**Output**: Displays actual column names for each table

---

## File Locations

### Documentation
- 📄 **Final Status Report**: `/Users/greghogue/Leora2/docs/database-investigation/FINAL_STATUS_REPORT.md`
- 📊 **Coverage Analysis**: `/Users/greghogue/Leora2/docs/database-investigation/COVERAGE_ANALYSIS.md`
- 📝 **Cleanup Summary**: `/Users/greghogue/Leora2/docs/database-investigation/CLEANUP_SUMMARY.md`
- 🔖 **Quick Reference**: This file

### Scripts
- 🧹 **Final Cleanup**: `/Users/greghogue/Leora2/scripts/database-investigation/final-cleanup.ts`
- 🔍 **Verify Integrity**: `/Users/greghoque/Leora2/scripts/database-investigation/verify-integrity.ts`
- 🛠️ **Check Schema**: `/Users/greghogue/Leora2/scripts/database-investigation/check-schema.ts`

### Audit Trails (in `deleted/` directory)
- 📦 **Orphaned Orders**: `orphaned-orders-final-cleanup.json` (567 records)
- 📊 **First Cleanup Report**: `final-cleanup-report.json`
- ✅ **Second Cleanup Report**: `second-cleanup-report.json`

---

## Understanding the Numbers

### What Coverage Means
**Coverage** = (Orders with Orderlines / Total Orders) × 100

- **55.10% Coverage** = 1,452 orders have orderlines out of 2,635 total
- **1,183 orders** (44.90%) have zero orderlines
- **Target** is 70% (1,845 orders should have orderlines)
- **Gap** is 393 orders

### Why Coverage Dropped
- **Before cleanup**: 60.18% (1,927 / 3,202)
- **After cleanup**: 55.10% (1,452 / 2,635)
- **Why**: Deleted 567 orphaned orders that had 2,786 orderlines
- **Result**: Lost 475 orders from numerator, 567 from denominator
- **Trade-off**: Data integrity > coverage percentage ✅

---

## Common Questions

### Q: Can we enable foreign key constraints now?
**A**: ✅ **YES!** Zero orphaned records, perfect integrity.

### Q: Is 55% coverage acceptable?
**A**: **Depends on business requirements.** Database is technically sound. 55% represents clean, valid data. The 1,183 empty orders need investigation.

### Q: How to reach 70% coverage?
**A**: Import orderlines for 393 of the 1,183 empty orders. Check legacy database for their orderlines.

### Q: What were the 567 deleted orders?
**A**: Orphaned orders referencing non-existent customers. Full details in `deleted/orphaned-orders-final-cleanup.json`.

### Q: Can we recover deleted data?
**A**: Yes, all deleted records are in audit trail JSON files. Review before recovery.

### Q: How long did cleanup take?
**A**: ~15 minutes total (automated scripts).

---

## Database Schema (Column Names)

### order table
```
id, tenantid, customerid, salesrepid, ordernumber,
orderdate, subtotal, tax, total, notes, createdat,
updatedat, orderedat, fulfilleda, deliveredat,
deliveryweek, isfirstorder, currency, status,
import_session_id
```

### orderline table
```
id, orderid, skuid, quantity, unitprice, discount,
issample, createdat, appliedpricingrules
```

### skus table
```
id, tenantid, productid, code, size, unitofmeasure,
abv, casesperpallet, priceperunit, isactive,
createdat, updatedat
```

**Note**: Column names are lowercase without underscores (e.g., `customerid` not `customer_id`).

---

## To Reach 70% Coverage

### Option 1: Import Orderlines for Empty Orders ⭐ RECOMMENDED
1. Query legacy database for orderlines of the 1,183 empty orders
2. Select 393 orders that have orderlines available
3. Import orderlines for these orders
4. Result: 1,452 + 393 = 1,845 / 2,635 = 70.02% ✅

**Effort**: ~8 hours
**Risk**: Low
**Success**: 95%+

### Option 2: Import Skipped Orderlines + More
1. Import 757 skipped orderlines → +122 orders (59.73%)
2. Import orderlines for 271 more empty orders
3. Result: 70% coverage

**Effort**: ~8 hours
**Risk**: Low
**Success**: 90%+

### Option 3: Migrate New Orders
1. Migrate 1,308+ new orders with orderlines from legacy
2. Result: 70% coverage

**Effort**: ~40 hours
**Risk**: Medium
**Success**: 70%

---

## Red Flags to Watch For

### 🚩 Orphaned Records Detected
- **Action**: Run cleanup scripts immediately
- **Impact**: Cannot enable FK constraints
- **Fix**: `npx tsx final-cleanup.ts`

### 🚩 Coverage Dropping
- **Cause**: Data deletions or migrations
- **Check**: Run verify-integrity.ts
- **Review**: Check if deletions were intentional

### 🚩 Foreign Key Violations
- **Symptom**: Insert/update failures
- **Cause**: Orphaned records exist
- **Fix**: Run verification and cleanup

### 🚩 Duplicate Primary Keys
- **Symptom**: Insert failures
- **Check**: Review import scripts
- **Fix**: De-duplicate before import

---

## Next Steps Checklist

### For Production Deployment
- [x] Verify zero orphaned records
- [x] Run integrity verification
- [x] Archive cleanup reports
- [ ] Enable foreign key constraints
- [ ] Test application with constraints
- [ ] Monitor for FK violations
- [ ] Document any exceptions

### For 70% Coverage (Optional)
- [ ] Query legacy database for empty orders
- [ ] Analyze the 1,183 empty orders
- [ ] Determine orderline availability
- [ ] Import orderlines for 393 orders
- [ ] Re-run coverage verification
- [ ] Update final report

---

## Emergency Recovery

### If You Need to Restore Deleted Records
1. Review audit trail: `deleted/orphaned-orders-final-cleanup.json`
2. Verify customer references exist
3. Re-import orders and orderlines
4. Run integrity verification

### If Coverage Drops Unexpectedly
1. Run `npx tsx verify-integrity.ts`
2. Check for accidental deletions
3. Review recent migrations
4. Compare counts with previous reports

### If FK Constraint Fails
1. Identify violated constraint
2. Run orphaned records check
3. Clean up orphaned data
4. Retry constraint enablement

---

## Success Metrics

| Goal | Target | Current | Status |
|------|--------|---------|--------|
| Zero orphaned orders | 0 | ✅ 0 | ✅ MET |
| Zero orphaned orderlines | 0 | ✅ 0 | ✅ MET |
| Zero orphaned SKUs | 0 | ✅ 0 | ✅ MET |
| FK constraints ready | Yes | ✅ Yes | ✅ MET |
| 70% coverage | 70% | ⚠️ 55.10% | ⚠️ PARTIAL |

**Overall**: 4 out of 5 goals met ✅

---

## Contacts & Resources

- **Database URL**: https://wlwqkblueezqydturcpv.supabase.co
- **Scripts Location**: `/Users/greghogue/Leora2/scripts/database-investigation/`
- **Docs Location**: `/Users/greghogue/Leora2/docs/database-investigation/`
- **Audit Trails**: `scripts/database-investigation/deleted/`

---

**Last Updated**: October 23, 2025
**Database Status**: 🟢 Production Ready
**Next Review**: After enabling FK constraints or reaching 70% coverage
