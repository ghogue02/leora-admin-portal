# SAGE Export UTC Date Formatting Fix

## Problem

When selecting October 29, 2025 in the date picker, the SAGE export filename was showing "10.28.25-invoices.csv" instead of "10.29.25-invoices.csv". This was caused by timezone conversion issues where dates formatted in local time would shift to the previous day when converted to UTC.

## Root Cause

The issue occurred in multiple places where date formatting was using local timezone methods instead of UTC methods:

1. **API Route** (`src/app/api/sage/export/route.ts`):
   - Used `format()` from `date-fns` for filename generation (line 230)
   - `format()` formats in local time by default, causing timezone shifts

2. **SAGE Formatting Library** (`src/lib/sage/formatting.ts`):
   - `formatDate()` function used `.getMonth()`, `.getDate()`, `.getFullYear()`
   - These methods return local time values, not UTC

3. **Export Script** (`scripts/export-to-sage.ts`):
   - Used `format()` from `date-fns` for internal filename generation (line 708)

## Solution

All date formatting now uses UTC methods to ensure dates remain consistent regardless of the server's timezone.

### Changes Made

#### 1. API Route (`src/app/api/sage/export/route.ts`)

**Before:**
```typescript
import { parse, differenceInDays, format } from 'date-fns';

// Line 230
const fileDate = format(startDate, 'MM.dd.yy');
const fileName = `${fileDate}-invoices.csv`;
```

**After:**
```typescript
import { parse, differenceInDays } from 'date-fns';
import { formatUTCDate } from '@/lib/dates';

// Line 230-235
// Generate filename: MM.DD.YY-invoices.csv (using UTC to prevent timezone shift)
const year = String(startDate.getUTCFullYear()).slice(-2);
const month = String(startDate.getUTCMonth() + 1).padStart(2, '0');
const day = String(startDate.getUTCDate()).padStart(2, '0');
const fileDate = `${month}.${day}.${year}`;
const fileName = `${fileDate}-invoices.csv`;
```

#### 2. SAGE Formatting Library (`src/lib/sage/formatting.ts`)

**Before:**
```typescript
export function formatDate(date: Date): string {
  const month = date.getMonth() + 1;  // Local time
  const day = date.getDate();         // Local time
  const year = date.getFullYear();    // Local time
  return `${month}/${day}/${year}`;
}
```

**After:**
```typescript
export function formatDate(date: Date): string {
  const month = date.getUTCMonth() + 1;  // UTC
  const day = date.getUTCDate();         // UTC
  const year = date.getUTCFullYear();    // UTC
  return `${month}/${day}/${year}`;
}
```

#### 3. Export Script (`scripts/export-to-sage.ts`)

**Before:**
```typescript
import { parse, format } from 'date-fns';

// Line 708
const dateStr = format(startDate, 'yyyy-MM-dd');
const fileName = `SAGE_Export_${dateStr}.csv`;
```

**After:**
```typescript
import { parse } from 'date-fns';
import { formatDateForSAGE, parseUTCDate, formatUTCDate } from '../src/lib/dates';

// Line 708
const dateStr = formatUTCDate(startDate);
const fileName = `SAGE_Export_${dateStr}.csv`;
```

## Verification

A test script was created to verify the fix:

```bash
npx tsx scripts/test-date-formatting.ts
```

**Test Results:**
```
Testing UTC Date Formatting for SAGE Export
============================================================

Input date string: 2025-10-29

Parsed Date Object:
  ISO String: 2025-10-29T00:00:00.000Z
  UTC Date: 2025-10-29

formatDateForSAGE() - for CSV content:
  Result: 10/29/2025
  Expected: 10/29/2025
  Status: ✅ PASS

formatUTCDate() - for internal use:
  Result: 2025-10-29
  Expected: 2025-10-29
  Status: ✅ PASS

Filename generation - for API route:
  Result: 10.29.25-invoices.csv
  Expected: 10.29.25-invoices.csv
  Status: ✅ PASS

============================================================
Test complete!
```

## Impact

### Fixed Behavior

- ✅ **Filename**: Oct 29 selection → `10.29.25-invoices.csv` (correct)
- ✅ **CSV Content**: Invoice dates formatted correctly in UTC
- ✅ **Consistency**: All date formatting now uses UTC throughout the system

### No Breaking Changes

- The centralized date library (`/src/lib/dates.ts`) already had `formatDateForSAGE()` using UTC
- The export script was already using `formatDateForSAGE()` for CSV content
- Only the filename generation and `formatting.ts` helper needed updates

## Files Modified

1. `/web/src/app/api/sage/export/route.ts` - Updated filename generation to use UTC
2. `/web/src/lib/sage/formatting.ts` - Updated `formatDate()` to use UTC methods
3. `/web/scripts/export-to-sage.ts` - Updated internal filename generation to use UTC

## Files Created

1. `/web/scripts/test-date-formatting.ts` - Automated test for date formatting
2. `/web/docs/SAGE_UTC_DATE_FIX.md` - This documentation

## Testing Recommendations

After deployment, verify:

1. Select **October 29, 2025** in date picker
2. Export to SAGE
3. Verify filename is `10.29.25-invoices.csv` (not 10.28.25)
4. Open CSV and verify invoice dates show `10/29/2025`

## Related Documentation

- `/web/src/lib/dates.ts` - Centralized date utilities with UTC handling guidelines
- `/web/docs/SAGE_PAYMENT_TERMS.md` - SAGE export business logic
