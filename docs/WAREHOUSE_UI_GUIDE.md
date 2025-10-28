# Warehouse Location Management UI - User Guide

**Version:** 1.0
**Date:** October 25, 2025

## Overview

The Warehouse Location Management system provides visual tools for assigning inventory locations, viewing warehouse layout, and bulk importing location data.

## Accessing the System

**URL:** `/sales/warehouse`

## Four Main Tabs

### 1. 📦 Locations Tab - Assign & Edit Locations

**Purpose:** Manage individual product locations with search, filter, and bulk editing

**Features:**
- Search by SKU, product name, or location
- Inline editing for individual items
- Bulk select and assign multiple items at once
- Undo capability
- Auto-calculated pick order
- Validation against warehouse configuration

**How to Use:**

**Single Item Edit:**
1. Search for the product
2. Click "Edit" button
3. Select Aisle, Row, Shelf (and optional Bin)
4. See pick order preview (auto-calculated)
5. Click "Done"
6. Click "Save Changes"

**Bulk Assignment:**
1. Select multiple items using checkboxes
2. Click "Bulk Assign (X)" button
3. Set location for all selected items
4. Confirm assignment

**Undo Mistakes:**
- Click "Undo" to revert the last change
- Undo stack maintains history of changes

### 2. 🗺️ Map Tab - Visual Warehouse Grid

**Purpose:** Interactive visualization of warehouse layout with color-coded inventory status

**Color Legend:**
- 🟢 **Green** - Location has inventory (≥10 units)
- 🟡 **Yellow** - Low stock (<10 units)
- ⚪ **Gray** - Empty location
- 🔵 **Blue (pulsing)** - Highlighted SKU search result

**Controls:**
- **Shelf Level Selector** - Switch between Top/Middle/Bottom
- **Zoom Controls** - Compact (-) / Normal (=) / Large (+)
- **Search SKU** - Highlight product location on map

**Interaction:**
- **Click Cell** - View all products in that location
- **Hover Cell** - Quick tooltip with item count
- **Search** - Enter SKU to highlight location (pulsing yellow)

**Layout:**
- **X-Axis** - Aisles (A, B, C, D, ...)
- **Y-Axis** - Rows (1, 2, 3, ... 25)
- **Each Cell** - Represents one location (Aisle-Row-Shelf)

### 3. ⚙️ Configuration Tab - Warehouse Settings

**Purpose:** Configure warehouse dimensions and picking strategy

**Settings:**

**1. Warehouse Dimensions**
- **Aisles** - Number of aisles (1-26, labeled A-Z)
- **Rows per Aisle** - Number of rows in each aisle (1-99)
- **Shelf Levels** - List of shelf names (Top/Middle/Bottom or custom)

**2. Shelf Level Management**
- Add new shelf levels
- Rename existing levels
- Remove levels (minimum 1 required)
- Common configurations: Top/Middle/Bottom or Level 1/2/3

**3. Pick Strategy**
- **Aisle Then Row (Default)** - Optimizes for sequential aisle picking
- **Zone Based (Coming Soon)** - Groups by warehouse zones
- **Optimize by Frequency (Coming Soon)** - Places high-frequency items in accessible locations

**4. Configuration Summary**
- Shows total locations calculated from settings
- Preview impact before saving

**⚠️ Warning:** Saving configuration recalculates ALL pick orders for existing inventory!

### 4. 📥 Import Tab - Bulk Location Import

**Purpose:** Import hundreds of location assignments via CSV file

**Workflow:**

**Step 1: Download Template**
- Click "Download CSV Template"
- Opens template with correct format

**Step 2: Fill in Data**
Required columns:
- **SKU** - Product SKU (required)
- **Aisle** - Aisle letter (A-Z)
- **Row** - Row number (1-99)
- **Shelf** - Shelf name (Top/Middle/Bottom or custom)

Optional columns:
- **Product Name** - For reference
- **Bin** - Sub-location within shelf

**Step 3: Upload CSV**
- Drag and drop CSV file
- Or click to browse and select file

**Step 4: Review Preview**
- System validates all rows
- Shows preview table (first 50 rows)
- Lists any validation errors

**Step 5: Import**
- Fix errors if needed
- Click "Import X Locations"
- Progress bar shows status
- Success message confirms completion

**CSV Template Example:**
```csv
SKU,Product Name,Aisle,Row,Shelf,Bin
KJ-CHARD-750,Kendall-Jackson Chardonnay,A,5,Top,A1
BB-PINOT-750,Bread & Butter Pinot Noir,A,5,Middle,A2
SILVER-CAB-750,Silver Oak Cabernet,B,10,Bottom,B1
```

## Location Format

**Standard Format:** `Aisle + Row + Shelf + Bin (optional)`

**Examples:**
- `A5-Top-A1` = Aisle A, Row 5, Top shelf, Bin A1
- `B10-Middle` = Aisle B, Row 10, Middle shelf (no bin)
- `C3-Bottom-C5` = Aisle C, Row 3, Bottom shelf, Bin C5

**Display Format:**
- In tables: `A5-Top` or `A5-Top-A1`
- On map: Grid cell at intersection of Aisle A, Row 5

## Pick Order System

**What is Pick Order?**
A numeric value that determines the sequence for picking items in the warehouse. Lower numbers = picked first.

**Formula:** `(aisle number × 10,000) + (row × 100) + (shelf number)`

**Examples:**
- A1-R1-S1 → Pick Order 10101
- A1-R2-S3 → Pick Order 10203
- B5-R10-S2 → Pick Order 21002

**Why It Matters:**
- Optimizes warehouse flow
- Reduces picking time
- Groups nearby items
- Calculated automatically

## Warehouse Statistics

**Shown in Page Header:**
- **Utilization %** - Percentage of locations occupied
- **Occupied** - Number of locations with inventory
- **Empty** - Number of available locations

**Additional Stats (from validation utilities):**
- Most crowded aisle
- Least used aisle
- Average items per location

## Mobile/Tablet Optimization

**Designed for iPad Warehouse Use:**
- ✅ Minimum 44px touch targets (easy tapping)
- ✅ Large, readable fonts
- ✅ Responsive layouts for portrait/landscape
- ✅ Touch-friendly dropdowns and inputs
- ✅ Barcode scanner compatible (keyboard wedge)
- ✅ Offline-capable (PWA ready)
- ✅ Quick save buttons for fast workflows

**Best Practices for iPad:**
1. Use **landscape** orientation for map view
2. Set zoom to "Large" for better visibility
3. Keep brightness at 75%+ for warehouse lighting
4. Use stylus or finger (both work well)
5. Enable "Tap to Wake" for quick access

## Common Tasks

### Task: Assign Location to New Product
1. Go to **Locations** tab
2. Search for product by SKU
3. Click **Edit**
4. Select Aisle, Row, Shelf
5. (Optional) Enter Bin
6. Verify green checkmark and pick order
7. Click **Done**
8. Click **Save Changes**

### Task: Move Product to Different Location
1. Go to **Locations** tab
2. Find product
3. Click **Edit**
4. Change Aisle/Row/Shelf
5. New pick order calculated automatically
6. Click **Done** then **Save Changes**

### Task: Assign Same Location to Multiple Products
1. Go to **Locations** tab
2. Select products (check boxes)
3. Click **Bulk Assign (X)**
4. Set location in modal
5. Confirm assignment
6. All selected items updated

### Task: Find Product on Warehouse Map
1. Go to **Map** tab
2. Select correct shelf level
3. Enter SKU in search box
4. Location highlights in pulsing yellow
5. Click cell to see details

### Task: Import 100+ Locations from Spreadsheet
1. Go to **Import** tab
2. Download template
3. Open in Excel/Google Sheets
4. Fill in SKU, Aisle, Row, Shelf columns
5. Save/export as CSV
6. Upload to system
7. Review validation results
8. Fix errors if any
9. Click **Import**

### Task: Change Warehouse Layout
1. Go to **Configuration** tab
2. Modify aisle count, rows, or shelf levels
3. Review configuration summary
4. Preview impact (⚠️ recalculates ALL pick orders)
5. Click **Save & Recalculate**

### Task: See What's in a Location
1. Go to **Map** tab
2. Select shelf level
3. Click on grid cell
4. Details panel shows all products in that location

## Tips & Best Practices

### Organizing by Velocity
- **Aisle A (Front)** - High-frequency items (fast movers)
- **Aisles B-D (Middle)** - Medium-frequency items
- **Aisles E+ (Back)** - Low-frequency items (slow movers)

### Shelf Level Strategy
- **Top Shelf** - Lightweight, low-frequency items
- **Middle Shelf** - Most accessible, high-frequency items
- **Bottom Shelf** - Heavy items, bulk storage

### Error Prevention
- Always click **Save Changes** before navigating away
- Use **Undo** immediately if you make a mistake
- **Preview** configuration changes before saving
- **Validate** CSV in preview before importing

### Performance Optimization
- Use **Search** instead of scrolling through long lists
- Use **Bulk Assign** for 10+ items with same location
- Use **CSV Import** for 100+ items
- Clear search filter to see all items

## Troubleshooting

### Issue: Location Won't Save

**Possible Causes:**
- Missing required field (Aisle, Row, or Shelf)
- Invalid aisle (not in configuration)
- Row number out of range
- Shelf name doesn't match configuration

**Solution:**
1. Check for red validation errors
2. Verify all three fields selected
3. Look for green checkmark confirmation
4. Ensure values match warehouse configuration

### Issue: CSV Import Errors

**Error: "Missing required fields"**
- CSV must have columns: SKU, Aisle, Row, Shelf

**Error: "Invalid aisle"**
- Aisle must be in configured range (A through Z)
- Check Configuration tab for valid aisles

**Error: "Row must be between 1 and X"**
- Row number exceeds configured rows per aisle
- Check Configuration tab settings

**Error: "Invalid shelf"**
- Shelf name must match configured names exactly
- Check Configuration tab for valid shelf names
- Common: Top, Middle, Bottom (case-sensitive)

### Issue: Pick Order Not Calculating

**Check:**
1. All three fields filled (Aisle, Row, Shelf)?
2. Green validation checkmark showing?
3. Bin is optional (doesn't affect pick order)
4. Location valid according to configuration?

### Issue: Product Not Showing on Map

**Check:**
1. Correct shelf level selected?
2. Location actually assigned to product?
3. Zoom level appropriate?
4. No SKU search filter active?

### Issue: Can't Find Product

**Try:**
1. Clear search box (see all items)
2. Search by partial SKU
3. Search by product name
4. Check if product exists in system

## File Locations

**Source Code:**
- Page: `/web/src/app/sales/warehouse/page.tsx`
- Sections: `/web/src/app/sales/warehouse/sections/`
  - `LocationEditor.tsx`
  - `WarehouseMap.tsx`
  - `ConfigEditor.tsx`
  - `LocationImport.tsx`
- Components: `/web/src/app/sales/warehouse/components/`
  - `LocationInput.tsx`
  - `WarehouseGrid.tsx`
- Utilities: `/web/src/lib/warehouse-validation.ts`

**Documentation:**
- Implementation: `/web/docs/WAREHOUSE_IMPLEMENTATION_SUMMARY.md`
- Pick Order: `/web/docs/WAREHOUSE_QUICK_START.md`

---

**Need Help?**
Contact your system administrator or refer to the implementation documentation.

**Last Updated:** October 25, 2025
**Version:** 1.0
**Status:** Production Ready
