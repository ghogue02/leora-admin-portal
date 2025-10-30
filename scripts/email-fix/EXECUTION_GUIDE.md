# Customer Email Fix - Execution Guide

## 🎯 Mission

Fix 3,792 customers missing email addresses (78% of total) by importing from the original CSV export.

---

## 📊 Current State

- **Total Customers**: 4,871
- **With Emails**: 1,079 (22%)
- **Missing Emails**: 3,792 (78%)
- **CSV Has Emails**: ~4,377 rows

**Expected Improvement**: +3,400 customers with valid emails!

---

## 🚀 Quick Start (Recommended)

### One-Command Execution

```bash
cd /Users/greghogue/Leora2/scripts/email-fix
./run-fix.sh
```

This runs the complete process:
1. ✅ Parse CSV and extract emails
2. ✅ Review mappings (with pause for confirmation)
3. ✅ Update database with real emails
4. ✅ Show final statistics

---

## 📋 Step-by-Step Execution

### Step 1: Parse Customer Emails from CSV

```bash
cd /Users/greghogue/Leora2/scripts/email-fix
npx tsx parse-customer-emails.ts
```

**Output:**
- Creates `email-mappings.json`
- Contains company name → email mapping
- ~4,377 companies with emails

**Review the mappings:**
```bash
cat email-mappings.json | jq '.totalMappings'
cat email-mappings.json | jq '.mappings | to_entries[:10]'
```

### Step 2: Update Database

```bash
npx tsx update-customer-emails.ts
```

**What happens:**
- Loads `email-mappings.json`
- Matches customers by company name
- Updates NULL emails with CSV data
- Preserves existing emails (no overwrites)
- Creates `update-results.json`

**Expected output:**
```
📊 Initial Database State:
   Total customers: 4871
   With emails: 1079
   Missing emails: 3792

🔄 Updating emails from CSV mapping...
   ✓ Updated 100 emails...
   ✓ Updated 200 emails...
   ...

📊 EMAIL UPDATE RESULTS
📈 Database State:
   Total Customers: 4871
   With Emails: 4500+ (92%+)
   Missing Emails: <400 (8%)

🔄 Update Operations:
   ✅ Updated from CSV: ~3400
   ⏭️  Already had email: 1079
   ⚠️  Not found in DB: <100

✨ Improvement:
   ~3400 customers now have email addresses!
```

### Step 3: Verify Results

```bash
# View update statistics
cat update-results.json | jq '.stats'

# Run SQL verification queries
# Copy queries from verify-email-fix.sql and run in Supabase
```

---

## 🔍 Verification Queries

### Quick Check

```sql
SELECT
  COUNT(*) as total,
  COUNT("email") as has_email,
  COUNT(*) - COUNT("email") as missing_email,
  ROUND(COUNT("email")::numeric / COUNT(*)::numeric * 100, 2) as coverage_pct
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

**Expected:**
- Total: 4,871
- Has email: 4,500+ (92%+)
- Coverage: 92%+

### Sample Updated Emails

```sql
SELECT name, email
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NOT NULL
LIMIT 20;
```

### See All Verification Queries

```bash
cat verify-email-fix.sql
```

Includes:
- ✅ Overall statistics
- ✅ Email type breakdown
- ✅ Sample emails
- ✅ Customers still missing emails
- ✅ Email domain distribution
- ✅ Duplicate email check
- ✅ Mailchimp-ready count
- ✅ Email quality checks

---

## 📁 Generated Files

After execution, you'll have:

### `email-mappings.json`
```json
{
  "generatedAt": "2025-10-26T...",
  "totalMappings": 4377,
  "mappings": {
    "West O Bottle Shop & Bar": "contact@example.com",
    "&pizza Hotel Hive": "Mh@andpizza.com",
    ...
  }
}
```

### `update-results.json`
```json
{
  "completedAt": "2025-10-26T...",
  "stats": {
    "totalCustomers": 4871,
    "customersWithEmails": 4500,
    "customersMissingEmails": 371,
    "emailsUpdatedFromCSV": 3421,
    "emailsAlreadyPresent": 1079,
    "customersNotFound": 56,
    "placeholdersCreated": 0
  }
}
```

---

## 🛡️ Safety Features

### No Data Loss
- ✅ Only updates customers with NULL emails
- ✅ Never overwrites existing emails
- ✅ Transaction-based updates
- ✅ Detailed logging of all operations

### Matching Strategy
- ✅ Exact company name matching
- ✅ Case-sensitive (preserves data integrity)
- ✅ Handles duplicate company names
- ✅ Uses primary email, fallback to billing email

### Error Handling
- ✅ Company not found: Logged and counted
- ✅ Already has email: Skipped
- ✅ Invalid email: Filtered during parsing
- ✅ Database errors: Logged, process continues

---

## 🔄 Handling Remaining Customers

After CSV import, some customers may still lack emails. Options:

### Option 1: Leave as NULL (Recommended)
```typescript
// In update-customer-emails.ts, line ~145:
const placeholderStrategy: 'none' | 'placeholder' | 'noemail' = 'none';
```

**Pros:**
- Clean data
- No fake emails
- Clear about missing data

**Cons:**
- Cannot use for email marketing

### Option 2: Create Unique Placeholders
```typescript
const placeholderStrategy = 'placeholder';
```

Creates: `companyname.id123@placeholder.local`

**Pros:**
- Every customer has an email
- Unique per customer
- Easy to filter out

**Cons:**
- Fake emails in database

### Option 3: Mark as "No Email"
```typescript
const placeholderStrategy = 'noemail';
```

Sets: `noemail@wellcrafted.com`

**Pros:**
- Simple marker
- Easy to filter

**Cons:**
- Multiple customers share same email

---

## 🚨 Troubleshooting

### CSV File Not Found
```bash
# Check file exists
ls -lh "/Users/greghogue/Leora2/Export customers 2025-10-25.csv"

# Update path in parse-customer-emails.ts if needed
```

### Prisma Connection Issues
```bash
# Check .env file has DATABASE_URL
cat /Users/greghogue/Leora2/.env | grep DATABASE_URL

# Test connection
npx prisma db pull
```

### No Emails Updated
- ✅ Check company names match exactly
- ✅ Verify customers already have emails
- ✅ Review email-mappings.json has data
- ✅ Check tenantId is correct

### TypeScript Errors
```bash
# Install dependencies
cd /Users/greghogue/Leora2
npm install csv-parse
npm install -D tsx @types/node

# Or in scripts/email-fix
npm install
```

---

## 📈 Success Metrics

### Before Fix
| Metric | Value |
|--------|-------|
| Total Customers | 4,871 |
| With Emails | 1,079 (22%) |
| Missing Emails | 3,792 (78%) |
| Mailchimp Ready | ~1,000 |

### After Fix (Expected)
| Metric | Value |
|--------|-------|
| Total Customers | 4,871 |
| With Emails | 4,500+ (92%+) |
| Missing Emails | <400 (8%) |
| Mailchimp Ready | ~4,400+ |

**Improvement**: +3,400 customers ready for email marketing! 🎉

---

## 🎯 Next Steps After Fix

1. ✅ **Verify Results**
   - Run verification SQL queries
   - Check update-results.json stats
   - Sample random customers to confirm

2. ✅ **Test Mailchimp Sync**
   - Sync customers with real emails
   - Filter out placeholder/noemail addresses
   - Verify sync works for ~4,400 customers

3. ✅ **Update Customer Records**
   - As new emails discovered, update individually
   - Maintain email quality
   - Remove placeholders when real emails obtained

4. ✅ **Monitor Email Bounces**
   - Track bounce rates in Mailchimp
   - Update or remove invalid emails
   - Keep database clean

---

## 📞 Support

**Files:**
- CSV: `/Users/greghogue/Leora2/Export customers 2025-10-25.csv`
- Scripts: `/Users/greghogue/Leora2/scripts/email-fix/`
- Tenant ID: `58b8126a-2d2f-4f55-bc98-5b6784800bed`

**Database:**
- Platform: Supabase
- Schema: wellcrafted
- Table: Customer

---

## ✅ Execution Checklist

- [ ] Navigate to scripts/email-fix directory
- [ ] Run `./run-fix.sh` (or step-by-step)
- [ ] Review email-mappings.json
- [ ] Confirm database update
- [ ] Check update-results.json
- [ ] Run verification SQL queries
- [ ] Verify email coverage improved
- [ ] Test Mailchimp sync (optional)
- [ ] Document final results

---

**Ready to fix customer emails!** 🚀

Run: `cd /Users/greghogue/Leora2/scripts/email-fix && ./run-fix.sh`
