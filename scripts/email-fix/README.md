# Customer Email Fix Scripts

## Overview

This directory contains scripts to fix missing customer email addresses by importing them from the original CSV export file.

## Problem

- **Total Customers**: 4,871
- **Missing Emails**: 3,792 (78%)
- **Impact**: Cannot use for email marketing, Mailchimp sync blocked

## Solution

### Step 1: Parse Customer Emails from CSV

```bash
npx tsx scripts/email-fix/parse-customer-emails.ts
```

**What it does:**
- Reads `Export customers 2025-10-25.csv`
- Extracts emails from "E-mail address" and "Billing e-mail address" columns
- Creates company name → email mapping
- Saves to `email-mappings.json`

**Expected output:**
- ~4,377 companies with email addresses
- JSON file for review before database update

### Step 2: Update Database with Emails

```bash
npx tsx scripts/email-fix/update-customer-emails.ts
```

**What it does:**
- Loads `email-mappings.json`
- Matches customers by company name
- Updates database with real emails from CSV
- Reports statistics on updates

**Safety features:**
- Only updates customers with NULL emails
- Preserves existing emails
- Transaction-based updates
- Detailed logging

### Step 3: Handle Remaining Customers (Optional)

For customers still without emails after CSV import, choose a strategy:

**Option A: Leave as NULL**
```typescript
// In update-customer-emails.ts, set:
const placeholderStrategy = 'none';
```

**Option B: Create Unique Placeholders**
```typescript
const placeholderStrategy = 'placeholder';
// Creates: companyname.id@placeholder.local
```

**Option C: Mark as No Email**
```typescript
const placeholderStrategy = 'noemail';
// Sets: noemail@wellcrafted.com
```

## Files

### Scripts
- `parse-customer-emails.ts` - Extract emails from CSV
- `update-customer-emails.ts` - Update database with emails

### Generated Files
- `email-mappings.json` - Company → email mapping
- `update-results.json` - Update statistics and results

## Usage

### Quick Start (Full Process)

```bash
# 1. Parse CSV emails
npx tsx scripts/email-fix/parse-customer-emails.ts

# 2. Review mappings (optional)
cat scripts/email-fix/email-mappings.json | jq '.totalMappings'

# 3. Update database
npx tsx scripts/email-fix/update-customer-emails.ts

# 4. Check results
cat scripts/email-fix/update-results.json | jq '.stats'
```

### Verify Results

```sql
-- Check email coverage
SELECT
  COUNT(*) as total,
  COUNT("email") as has_email,
  COUNT(*) - COUNT("email") as missing_email,
  ROUND(COUNT("email")::numeric / COUNT(*)::numeric * 100, 2) as coverage_pct
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- Sample emails
SELECT name, email
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NOT NULL
LIMIT 10;
```

## Expected Results

### Before
- Total: 4,871 customers
- With emails: 1,079 (22%)
- Missing: 3,792 (78%)

### After
- Total: 4,871 customers
- With emails: ~4,500+ (92%+)
- Missing: <400 (8%)

**Improvement**: +3,400 customers with valid emails!

## CSV Data Structure

```csv
"Company name","First name","Last name",...,"E-mail address","Billing e-mail address",...
"West O Bottle Shop & Bar",Sara,Hamburg,...,"","",...
"&pizza Hotel Hive",Meghan,Horn,...,"Mh@andpizza.com","",...
```

**Email Sources**:
1. "E-mail address" column (primary)
2. "Billing e-mail address" column (fallback)

## Matching Strategy

Customers are matched by exact company name:
- CSV `"Company name"` → DB `Customer.name`
- Case-sensitive matching
- Handles duplicate company names (updates all)

## Error Handling

- **Company not found**: Logged, counted in stats
- **Already has email**: Skipped, not overwritten
- **Invalid email**: Filtered during parsing
- **Database errors**: Logged, transaction continues

## Rollback

If update fails or produces unexpected results:

```sql
-- Revert to previous state (if needed)
UPDATE "Customer"
SET "email" = NULL
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND "email" LIKE '%@placeholder.local'
  OR "email" = 'noemail@wellcrafted.com';
```

## Next Steps

After email fix:
1. ✅ Verify email coverage increased
2. ✅ Test Mailchimp sync with real emails
3. ✅ Filter out placeholder emails for marketing campaigns
4. ✅ Update customer records with real emails as they're discovered

## Support

- CSV file: `/Users/greghogue/Leora2/Export customers 2025-10-25.csv`
- Tenant ID: `58b8126a-2d2f-4f55-bc98-5b6784800bed`
- Database: Supabase (wellcrafted)

---

**Fix customer emails and enable marketing campaigns!** 🚀
