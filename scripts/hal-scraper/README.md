# HAL Product Data Extraction

Automated scraper for extracting product data from halapp.com warehouse interface.

## Prerequisites

- Active HAL login session
- Node.js and npm installed
- Playwright installed (already in project)

## Quick Start

```bash
# Run the extraction script
npx tsx scripts/hal-scraper/extract-products.ts
```

## What It Does

1. **Opens Browser**: Launches Chrome in visible mode (uses your existing login)
2. **Navigates to Items**: Goes to warehouse items list
3. **Extracts Links**: Collects all product URLs from paginated list (~2000 SKUs)
4. **Scrapes Details**: Visits each product page and extracts:
   - Basic info (Name, SKU, Category, Status)
   - Manufacturer & Supplier info
   - Specifications (Alcohol %, Case size, ABC code, etc.)
   - Warehouse locations and inventory
   - Product descriptions
   - Image URLs (Packshot, Labels, Tech sheets)
5. **Saves Data**: Exports to JSON and CSV formats

## Output Files

Located in `scripts/hal-scraper/output/`:

- `products-final.json` - Complete structured data
- `products-final.csv` - Spreadsheet format
- `products-progress-*.json` - Incremental saves (every 50 products)
- `errors.json` - Failed extractions (if any)

## Data Structure

```json
{
  "name": "17 by Pinea 2020",
  "sku": "SPA1174",
  "category": "Spanish",
  "status": "Active",
  "manufacturer": "Pinea",
  "supplier": "Wine Smith",
  "labelAlcohol": "15.00",
  "itemsPerCase": "12",
  "virginiaABCCode": "13244 - 12-C1 / 12-G3",
  "warehouseLocation": "12-C1 / 12-G3",
  "itemBarcode": "8437018375004 (On Bottle)",
  "totalQuantity": "502",
  "totalCases": "41.83",
  "warehouseInventory": [
    {
      "warehouse": "Warrenton",
      "quantity": "502",
      "cases": "41.83x12"
    }
  ],
  "description": "\"17 by Pinea\" celebrates the year 2017...",
  "packshot": "https://...",
  "frontLabel": "https://...",
  "backLabel": "https://...",
  "techSheet": "https://...",
  "url": "https://halapp.com/a/wcb/warehouse/item/123",
  "extractedAt": "2025-01-14T..."
}
```

## Features

- ✅ Handles pagination automatically
- ✅ Incremental saves (every 50 products)
- ✅ Error tracking and retry capability
- ✅ Progress logging
- ✅ Both JSON and CSV output
- ✅ Rate limiting (500ms delay between requests)

## Estimated Time

- ~2000 SKUs × 0.5s delay = ~17 minutes
- Add page load time = ~20-25 minutes total

## Troubleshooting

**Issue**: "Not logged in" error
- **Solution**: Keep your HAL browser tab open, the script will use that session

**Issue**: Extraction stops mid-way
- **Solution**: Check `products-progress-*.json` files for partial data
- The script saves progress every 50 products

**Issue**: Some products show errors
- **Solution**: Check `errors.json` for failed URLs
- You can re-run just those URLs if needed

## Next Steps

After extraction completes:

1. Review `products-final.csv` for data quality
2. Use `products-final.json` for database import
3. Run database sync script (to be created)

## Notes

- The scraper runs in **visible browser mode** to leverage your active login
- Don't close the browser window while it's running
- The script is intentionally slow (0.5s delay) to be respectful to HAL's servers
