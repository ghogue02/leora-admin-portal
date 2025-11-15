# HAL Validation Script - Quick Start

## Installation

No installation needed! Uses existing project dependencies.

## Quick Commands

### 1. Run Basic Validation
```bash
cd /Users/greghogue/Leora2/web
tsx --env-file=.env src/scripts/validate-hal-data.ts
```

### 2. Save Report to JSON
```bash
tsx --env-file=.env src/scripts/validate-hal-data.ts --output hal-report.json
```

### 3. Verbose Output
```bash
tsx --env-file=.env src/scripts/validate-hal-data.ts --verbose
```

### 4. Everything (Verbose + Save)
```bash
tsx --env-file=.env src/scripts/validate-hal-data.ts --verbose --output report.json
```

## What You'll See

### Console Output
```
🔍 HAL Data Validation Tool

✓ Connected to database
✓ Loaded 1904 products from HAL data
✓ Loaded 1750 SKUs from database
✓ Loaded 50 suppliers from database

Validating HAL products...
Progress: 1904/1904 (100%)

================================================================================
VALIDATION SUMMARY
================================================================================

Overall Statistics:
  Total HAL Products:        1904
  Matched SKUs:              1650 ✅
  Missing SKUs:              254 ❌
  Duplicate Vintages:        89 ⚠️
  Validation Errors:         12 🔴

⚠ TOP 10 MISSING SKUs:
  1. SPA1234 - Example Wine 2023
     Supplier: Wine Imports LLC, Quantity: 500
```

### JSON Report Structure
```json
{
  "generatedAt": "2025-11-15T12:00:00.000Z",
  "summary": {
    "totalHalProducts": 1904,
    "matchedSkus": 1650,
    "missingSkus": 254,
    "duplicateVintages": 89,
    "validationErrors": 12
  },
  "matchedSkus": [...],
  "missingSkus": [...],
  "duplicateVintages": [...],
  "validationErrors": [...]
}
```

## Next Steps

### If Validation Passes (Exit Code 0)
- Review warnings (if any)
- Proceed with import (using separate import script)

### If Validation Fails (Exit Code 1)
1. Review validation errors in console or JSON report
2. Fix issues in HAL or database
3. Re-run validation until it passes

## Common Issues

### "DATABASE_URL not set"
**Solution**: Make sure you're in the `web/` directory and using `--env-file=.env`

### "HAL data file not found"
**Solution**: Ensure HAL data exists at:
```
/Users/greghogue/Leora2/scripts/hal-scraper/output/products-final.json
```

### "Authentication failed"
**Solution**: Check DATABASE_URL in `.env` file is correct

## Exit Codes

- `0` = Success (warnings OK, no errors)
- `1` = Failed (errors found, do not proceed with import)

## Full Documentation

- **Usage Guide**: `README-HAL-VALIDATION.md` (same directory)
- **Implementation Details**: `/docs/HAL_VALIDATION_SCRIPT.md`

## Help

```bash
tsx --env-file=.env src/scripts/validate-hal-data.ts --help
```

---

**TL;DR**: Run `tsx --env-file=.env src/scripts/validate-hal-data.ts` from the `web/` directory to validate HAL data before import.
