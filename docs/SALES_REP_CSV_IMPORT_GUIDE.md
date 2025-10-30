# Sales Rep CSV Import Guide

## Overview

This guide explains how to import customer-to-sales-rep assignments from the "sales reps.csv" file into the Leora system.

**Source**: Travis Vernon's comprehensive customer list by rep and territory (1,200+ accounts)

**Purpose**: Update sales rep assignments with authoritative data, augment HAL customer records, and add new prospect accounts.

---

## Prerequisites

### 1. Database Schema Migration

**IMPORTANT**: Run the migration BEFORE importing to add HOLD enum value and optional Customer fields.

```bash
cd web
npx prisma migrate dev --name add_csv_import_fields_and_hold_status
```

This adds:
- `AccountType.HOLD` enum value
- `Customer.quarterlyRevenueTarget` field
- `Customer.buyerFirstName` field
- `Customer.buyerLastName` field
- `Customer.csvImportedAt` timestamp
- `Customer.csvLastSyncedAt` timestamp

**If migration fails** (database connection issue):
- The script can still run without these fields (they're optional)
- Contact admin to apply migration manually

### 2. CSV File Location

Ensure `sales reps.csv` is in project root:
```
/Users/greghogue/Leora2/sales reps.csv
```

### 3. Install Dependencies

```bash
npm install csv-parse tsx
```

---

## Import Modes

### Mode 1: Preview (Recommended First Step)

**Shows first 50 customer matches without making any changes**

```bash
npx tsx scripts/import-sales-rep-assignments.ts --preview
```

**Output Example**:
```
✓ MATCH: 1608 Crafthouse
✓ MATCH: Aldo's Ristorante
+ NEW:   ABC Wine Shop (will be created)
```

### Mode 2: Dry Run

**Processes all rows and shows what WOULD happen (no database changes)**

```bash
npx tsx scripts/import-sales-rep-assignments.ts --dry-run
```

**Use this to**:
- Verify customer matching accuracy
- See how many new customers would be created
- Identify potential issues before live import

### Mode 3: Live Import

**Actual import - MODIFIES DATABASE**

```bash
npx tsx scripts/import-sales-rep-assignments.ts
```

⚠️ **WARNING**: This will:
- Update ~1,000 existing customer records
- Create ~200 new customer records
- Reassign sales reps (CSV is authoritative)
- Override territory, account type, contact info

---

## What the Import Does

### For EXISTING Customers (Matched):
1. **Updates salesRepId** → CSV assignment is authoritative
2. **Updates territory** → If provided in CSV
3. **Updates accountType** → Active/Target/Prospect/Hold from CSV
4. **Updates contact info** → Email and phone if provided
5. **Updates buyer details** → First/last name if provided
6. **Updates revenue target** → Quarterly target if provided
7. **Tracks assignment history** → Creates CustomerAssignment record
8. **Sets csvLastSyncedAt** → Timestamp of last import

### For NEW Customers (Not Matched):
1. **Creates Customer record** with:
   - Name from CSV
   - Sales rep assignment
   - Territory
   - Account type (or defaults to PROSPECT)
   - Contact info (email, phone, buyer name)
   - Revenue target
   - csvImportedAt timestamp

2. **Creates CustomerAssignment** → Initial assignment record

### For NWVA Accounts (129 accounts):
- Sets `salesRepId = null` (unassigned)
- Flags as Northern Virginia territory
- Available for manual assignment later

---

## Customer Matching Strategy

The script uses **3-level matching** to find existing customers:

### Level 1: Exact Match (Case-Insensitive)
```
CSV: "Aldo's Ristorante"
DB:  "Aldo's Ristorante" → ✅ MATCH
```

### Level 2: Normalized Match
```
CSV: "The Wine Shop"
DB:  "Wine Shop" → ✅ MATCH (removes "The", punctuation)
```

### Level 3: Fuzzy Match (Partial + Territory)
```
CSV: "ABC Wines & Spirits" (Territory: Norfolk)
DB:  "ABC Wines" (Territory: Norfolk) → ✅ MATCH
```

If no match found → **Creates new customer**

---

## Account Type Mapping

| CSV Value | Database Enum | Note |
|-----------|---------------|------|
| "Active" | ACTIVE | Current customers |
| "Current" | ACTIVE | Alias for Active |
| "Avtive" | ACTIVE | Handles typo |
| "Target" | TARGET | Prospective customers |
| "Prospect" | PROSPECT | Early stage prospects |
| "Re-Establish" | PROSPECT | Re-engagement prospects |
| "Hold" | HOLD | Temporarily on hold |
| (blank) | null | No type set |

---

## Sales Rep Mapping

| CSV Name | Lookup | Result |
|----------|--------|--------|
| "Angela" | First name match | Angela Fultz's ID |
| "Ebony Booth" | Full name match | Ebony Booth's ID |
| "Rosa-Anna" | Full name match | Rosa-Anna Winchell's ID |
| "Jose Bustillo" | Full name match | Jose Bustillo's ID |
| "Mike" | First name match | Mike Allen's ID |
| "Nicole" | First name match | Nicole Shenandoah's ID |
| "NWVA" | Special case | null (unassigned) |

**Note**: Script auto-detects reps by matching CSV names to User.fullName or first name only.

---

## Expected Results

Based on CSV analysis:

### Customer Distribution:
```
Total CSV Rows:          1,200
Expected Matches:        ~1,000 (83%)
Expected New Customers:  ~200 (17%)
Expected Failures:       <10 (<1%)
```

### Rep Assignment Counts:
```
Ebony Booth:       229 accounts
Rosa-Anna:         222 accounts
Angela:            197 accounts
Jose Bustillo:     194 accounts
NWVA (unassigned): 129 accounts
Mike:              104 accounts
Nicole:            102 accounts
```

### Account Type Distribution:
```
ACTIVE:   672 (56%)
TARGET:   235 (20%)
PROSPECT: 175 (15%)
HOLD:      20 (2%)
Other:     98 (8%)
```

### Territory Distribution:
```
Virginia Beach: ~150
Norfolk:        ~120
Richmond:       ~100
DC Metro:       ~80
Maryland:       ~70
Others:         ~680
```

---

## Post-Import Validation

### Step 1: Check Import Report

The script automatically shows:
```
================================================================
📊 IMPORT COMPLETE

Total Rows:          1200
Matched & Updated:   1015 (84.6%)
New Customers:       180 (15.0%)
Failed:              5 (0.4%)
Rep Reassignments:   342
================================================================

📊 Customers per Sales Rep:

  Ebony Booth: 229
  Rosa-Anna Winchell: 222
  Angela Fultz: 197
  Jose Bustillo: 194
  Unassigned (NWVA): 129
  Mike Allen: 104
  Nicole Shenandoah: 102
```

### Step 2: Manual Verification Queries

```sql
-- Count customers per rep
SELECT
  sr.user.fullName,
  COUNT(*) as customer_count
FROM "Customer" c
LEFT JOIN "SalesRep" sr ON c."salesRepId" = sr.id
WHERE c."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY sr.id
ORDER BY customer_count DESC;

-- Find customers created from CSV
SELECT name, territory, "salesRepId", "csvImportedAt"
FROM "Customer"
WHERE "csvImportedAt" IS NOT NULL
LIMIT 20;

-- Find customers with rep changes
SELECT c.name, c.territory, old.assignedAt as old_date, new.assignedAt as new_date
FROM "Customer" c
JOIN "CustomerAssignment" old ON c.id = old."customerId" AND old."unassignedAt" IS NOT NULL
JOIN "CustomerAssignment" new ON c.id = new."customerId" AND new."unassignedAt" IS NULL
WHERE c."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND old."unassignedAt" > NOW() - INTERVAL '1 day'
LIMIT 20;
```

### Step 3: Frontend Verification

1. **Log in as each sales rep**
2. **Navigate to Sales → Customers**
3. **Verify their assigned customers match CSV**
4. **Check customer detail pages**
5. **Test filtering by territory**

---

## Troubleshooting

### Issue: "Unknown rep" errors

**Symptom**: Script shows `❌ Unknown rep: John Doe`

**Cause**: Sales rep doesn't exist in database

**Fix**:
1. Check if rep exists: `SELECT * FROM "SalesRep" WHERE "tenantId" = '...'`
2. Create missing rep in admin portal
3. Or update `REP_NAME_MAP` in script to map to existing rep

### Issue: Low match rate (<70%)

**Symptom**: Too many "NEW" customers created

**Cause**: Customer names in CSV don't match database names

**Fix**:
1. Run in `--preview` mode
2. Review first 50 matches
3. Adjust normalization logic in `normalizeName()` function
4. Or manually update customer names in database for better matching

### Issue: Duplicate customers created

**Symptom**: Same customer appears twice in database

**Cause**: Matching algorithm failed

**Prevention**:
- Always run `--dry-run` first
- Review matching logic
- Add database unique constraint on normalized name

**Fix**:
1. Identify duplicates:
```sql
SELECT name, COUNT(*) FROM "Customer"
GROUP BY name HAVING COUNT(*) > 1;
```
2. Merge duplicates manually
3. Delete unnecessary records

### Issue: Database connection timeout

**Symptom**: `Error: unexpected message from server`

**Cause**: Supabase connection pooling or network issue

**Fix**:
1. Check DATABASE_URL environment variable
2. Verify database is accessible
3. Try running during off-peak hours
4. Reduce batch size in script (line 357: change 100 to 50)

---

## Rollback Procedure

If import creates incorrect data:

### Option 1: Delete CSV-imported customers
```sql
DELETE FROM "Customer"
WHERE "csvImportedAt" IS NOT NULL
  AND "csvImportedAt" > NOW() - INTERVAL '1 hour';
```

### Option 2: Restore from backup
```sql
-- Restore customer assignments
UPDATE "Customer" c
SET "salesRepId" = backup."salesRepId"
FROM customer_backup_table backup
WHERE c.id = backup.id;
```

### Option 3: Re-run with correct data
1. Fix issues in CSV file
2. Delete incorrectly imported records
3. Run import script again

---

## Best Practices

### Before First Import:
1. ✅ Run database backup
2. ✅ Run `--preview` mode to sample matching
3. ✅ Run `--dry-run` to see full import plan
4. ✅ Review import report carefully
5. ✅ Get approval from Travis
6. ✅ Run live import during low-traffic time

### After Import:
1. ✅ Verify import statistics match expectations
2. ✅ Check customer counts per rep
3. ✅ Test frontend as each sales rep
4. ✅ Monitor for user-reported issues
5. ✅ Keep CSV file for future re-imports

### Future Updates:
- Save CSV file with timestamp: `sales-reps-2025-10-30.csv`
- Run import again when rep assignments change
- Use `csvLastSyncedAt` to track update frequency
- Consider scheduling monthly imports

---

## Script Improvements (Future)

Potential enhancements:
- [ ] Export unmatched customers to CSV for manual review
- [ ] Add email notifications to reps about new assignments
- [ ] Support incremental updates (only changed rows)
- [ ] Web UI for import (instead of command line)
- [ ] Automatic matching confidence scores
- [ ] Integration with HAL API for real-time sync
- [ ] Support for multiple CSV formats
- [ ] Undo last import feature

---

## Support

**Script Location**: `/Users/greghogue/Leora2/web/scripts/import-sales-rep-assignments.ts`

**CSV Location**: `/Users/greghogue/Leora2/sales reps.csv`

**Schema Changes**: `/Users/greghogue/Leora2/web/prisma/schema.prisma` (lines 441-445, 1988)

**Questions?** Contact Greg Hogue or review Travis Vernon's original email (Oct 29, 9:10 AM)

---

## Quick Start Command

```bash
# 1. Preview first 50 matches
npx tsx scripts/import-sales-rep-assignments.ts --preview

# 2. Dry run (see full plan, no changes)
npx tsx scripts/import-sales-rep-assignments.ts --dry-run

# 3. Live import (when ready)
npx tsx scripts/import-sales-rep-assignments.ts
```

**Estimated Runtime**: 5-10 minutes for 1,200 rows (batched processing)
