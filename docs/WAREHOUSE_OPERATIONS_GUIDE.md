# Warehouse Operations Guide

## Overview

The Leora Warehouse Management System helps you organize your inventory by assigning specific locations to each product, optimize picking routes, and streamline your warehouse operations.

**Who This Guide Is For:**
- Warehouse managers
- Warehouse staff
- Operations managers
- Inventory coordinators

**What You'll Learn:**
- Setting up warehouse locations
- Assigning inventory locations
- Using the warehouse map
- Importing locations in bulk
- Understanding pick order optimization

---

## Quick Start: Set Up Your Warehouse in 10 Minutes

### Step 1: Configure Warehouse Layout (2 minutes)

1. Navigate to **Settings > Warehouse Configuration**
2. Configure your warehouse structure:
   - **Aisles**: A-Z (usually A-J for most warehouses)
   - **Rows per Aisle**: How many rows deep each aisle is (typically 1-20)
   - **Shelf Levels**: Names for vertical shelves (e.g., "Bottom", "Middle", "Top")

**Example Configuration:**
```
Aisles: A, B, C, D, E
Rows per Aisle: 10
Shelf Levels: Bottom, Middle, Top
```

This creates 150 locations: 5 aisles × 10 rows × 3 shelves = 150 locations

### Step 2: View Warehouse Map (1 minute)

1. Go to **Warehouse > Map View**
2. See your warehouse laid out visually
3. Empty locations show in gray
4. Locations with inventory show in color

### Step 3: Assign Locations (3 minutes)

**Option A: Individual Assignment**
1. Go to **Warehouse > Inventory Locations**
2. Find a product without a location
3. Click **Assign Location**
4. Select: Aisle → Row → Shelf
5. Click **Save**

**Option B: Bulk Import** (faster for many products)
1. Download CSV template
2. Fill in locations for each SKU
3. Upload CSV file
4. Review and confirm

### Step 4: Test Pick Sheet (2 minutes)

1. Create a test order with 3-5 products
2. Go to **Warehouse > Pick Sheets**
3. Click **Generate Pick Sheet**
4. Select your test order
5. See items sorted by optimal pick order

### Step 5: Start Picking (2 minutes)

1. Open pick sheet on iPad/tablet
2. Walk through warehouse following pick order
3. Check off items as you pick them
4. Complete pick sheet when done

---

## Location Assignment

### Understanding Location Format

Locations use this format: **Aisle-Row-Shelf**

**Examples:**
- `A-1-Bottom` - Aisle A, Row 1, Bottom shelf
- `C-5-Top` - Aisle C, Row 5, Top shelf
- `J-10-Middle` - Aisle J, Row 10, Middle shelf

### Assigning Locations

**Best Practices:**
- Put fast-moving products near the warehouse entrance
- Group similar products together
- Keep heavy items on bottom shelves
- Reserve top shelves for lightweight items
- Leave some empty locations for growth

**Step-by-Step:**

1. **Navigate to Inventory Locations**
   - Menu: Warehouse > Inventory Locations

2. **Find Product to Assign**
   - Filter: "No Location Assigned"
   - Search by product name or SKU code

3. **Click Assign Location**
   - Choose Aisle (A-J)
   - Choose Row (1-10)
   - Choose Shelf (Bottom, Middle, Top)

4. **Verify Location**
   - Check location is empty or has enough space
   - Confirm product fits on shelf

5. **Save Assignment**
   - Location is immediately active
   - Pick order automatically calculated

### Reassigning Locations

When moving inventory to a new location:

1. Go to product's current location
2. Click **Edit Location**
3. Select new location
4. Click **Update**
5. Pick order recalculates automatically

---

## Warehouse Map

### Using the Visual Map

The warehouse map provides a bird's-eye view of your warehouse.

**Map Features:**
- **Grid Layout**: Visual representation of aisles and rows
- **Color Coding**:
  - Gray: Empty location
  - Blue: Contains inventory
  - Green: Fast-moving product
  - Yellow: Low stock
  - Red: Out of stock (location assigned but inventory depleted)
- **Click Location**: View products at that location
- **Hover**: See product count and names

**Example Map:**
```
     Row 1    Row 2    Row 3    Row 4    Row 5
A    [🟦]     [🟦]     [⬜]     [🟦]     [⬜]
B    [🟩]     [🟦]     [🟦]     [⬜]     [🟦]
C    [🟦]     [⬜]     [🟩]     [🟦]     [🟦]
D    [🟦]     [🟦]     [🟦]     [⬜]     [⬜]
E    [⬜]     [⬜]     [⬜]     [⬜]     [⬜]

🟩 Fast-moving  🟦 In stock  ⬜ Empty
```

### Navigating the Map

**Zoom Controls:**
- Zoom in: See shelf-level details
- Zoom out: See entire warehouse
- Reset: Return to default view

**Filters:**
- Show only: Fast-movers, Low stock, Empty locations
- Search by product name
- Filter by category

---

## Bulk Import Locations

For warehouses with many products, bulk import is much faster than manual assignment.

### Step 1: Download Template

1. Go to **Warehouse > Inventory Locations**
2. Click **Bulk Import**
3. Click **Download CSV Template**

**Template Format:**
```csv
sku_code,aisle,row,shelf
CHARD-001,A,1,Bottom
CAB-SAUV-002,A,1,Middle
PINOT-NOIR-003,A,2,Bottom
MERLOT-004,A,2,Middle
```

### Step 2: Fill Out CSV

**Required Columns:**
- `sku_code`: Existing SKU code from your inventory
- `aisle`: Single letter (A-Z)
- `row`: Number (1-20)
- `shelf`: Shelf name (Bottom, Middle, Top)

**Tips:**
- Use Excel or Google Sheets
- Don't include header row duplicates
- Ensure SKU codes match exactly
- Validate aisles/rows exist in your configuration

### Step 3: Upload CSV

1. Click **Upload CSV**
2. Select your file
3. Review preview (shows first 10 rows)
4. Check for errors:
   - ❌ Invalid SKU codes
   - ❌ Non-existent aisles/rows/shelves
   - ❌ Duplicate locations
5. Fix errors in CSV and re-upload, or click **Import Anyway** to skip errors

### Step 4: Confirm Import

1. Review summary:
   - ✅ 125 locations assigned
   - ⚠️ 5 errors skipped
   - 📊 Pick orders recalculated
2. Click **Confirm Import**
3. Locations are assigned immediately

---

## Pick Order Optimization

### What is Pick Order?

Pick order is a number that determines the sequence in which items should be picked to minimize walking distance.

**Example:**
```
Item               Location        Pick Order
Chardonnay         A-1-Bottom      1
Cabernet           A-3-Middle      2
Pinot Noir         B-2-Top         3
Merlot             C-1-Bottom      4
```

Picker walks: A1 → A3 → B2 → C1 (efficient!)

### How Pick Order is Calculated

The system uses **aisle_then_row** strategy by default:

```
pickOrder = (Aisle × 1000) + (Row × 10) + ShelfWeight

Shelf Weights:
- Bottom: 1
- Middle: 2
- Top: 3
```

**Example Calculation:**
- Location: `B-5-Top`
- Aisle B = 2nd aisle = 2
- Row 5 = 5
- Top shelf = 3
- **pickOrder = (2 × 1000) + (5 × 10) + 3 = 2053**

**Why This Works:**
- Lower numbers = earlier in pick route
- Aisle changes are most expensive (walk entire aisle)
- Row changes are moderate (walk down aisle)
- Shelf changes are cheapest (just reach up/down)

### Alternative: Zone-Based Picking

For very large warehouses, switch to zone-based picking:

1. Go to **Settings > Warehouse Configuration**
2. Change **Pick Strategy** to `zone_based`
3. Define zones (e.g., "Cold Storage", "Dry Goods", "Spirits")
4. Assign zones to aisles

---

## Warehouse Configuration

### Aisle Configuration

**Standard Setup:**
- Small warehouse: A-E (5 aisles)
- Medium warehouse: A-J (10 aisles)
- Large warehouse: A-P (16 aisles)

**Naming Tips:**
- Use single letters for simplicity
- Start from A near warehouse entrance
- Letters match physical warehouse signage

### Row Configuration

**Typical Row Counts:**
- Narrow aisles: 5-8 rows
- Standard aisles: 10-15 rows
- Long aisles: 20+ rows

**Numbering:**
- Start at 1 near main entrance
- Increment toward back of warehouse
- Match physical row markers

### Shelf Configuration

**Common Configurations:**

**3-Level:**
- Bottom
- Middle
- Top

**4-Level:**
- Ground
- Low
- High
- Overhead

**5-Level:**
- Floor
- Shelf 1
- Shelf 2
- Shelf 3
- Shelf 4

**Custom Names:**
- Use your existing shelf labels
- Keep names short (under 10 characters)
- Avoid special characters

### Recalculating Pick Order

Pick order recalculates automatically when:
- Location is assigned
- Location is changed
- Warehouse configuration changes

**Manual Recalculation:**
1. Go to **Settings > Warehouse Configuration**
2. Click **Recalculate All Pick Orders**
3. Confirm action
4. Wait for completion (may take 1-2 minutes for large inventory)

---

## Mobile/iPad Usage

### Optimizing for Warehouse Use

**Device Recommendations:**
- iPad 10.2" or larger
- Rugged case recommended
- Screen protector
- Stylus for checking off items

**Settings:**
1. **Brightness**: Set to maximum (warehouse lighting varies)
2. **Auto-Lock**: Set to "Never" (during picking)
3. **Text Size**: Increase for easy reading while moving
4. **Offline Mode**: Enable for areas with poor Wi-Fi

### Picking Workflow on iPad

1. **Open Pick Sheet**
   - Tap **Warehouse > Pick Sheets**
   - Select your assigned pick sheet
   - Tap **Start Picking**

2. **Follow Pick Order**
   - Items listed in optimal order
   - Location shown clearly: **A-3-Middle**
   - Product name and SKU visible
   - Quantity to pick displayed

3. **Check Off Items**
   - Tap checkbox when picked
   - Item grays out
   - Next item highlights

4. **Complete Pick Sheet**
   - When all items checked
   - Tap **Complete Pick Sheet**
   - Confirmation shown

### Tips for Mobile Picking

- Hold iPad in landscape mode (more info visible)
- Use voice commands (if enabled): "Mark item 3 picked"
- Attach iPad to cart for hands-free viewing
- Use barcode scanner (if integrated) to verify SKU

---

## Best Practices

### Warehouse Organization

**Fast-Movers First:**
- Assign A-aisles (nearest entrance) to fastest-moving products
- Bottom shelves for heavy, fast-moving items
- Review velocity quarterly and reassign

**Product Grouping:**
- Group by category (all Chardonnays together)
- Group by supplier (easier for receiving)
- Keep complementary products near each other

**Safety First:**
- Heavy items on bottom shelves (under 20 lbs on top)
- Keep aisles clear (no boxes in walkways)
- Mark fragile items clearly
- Store hazmat according to regulations

### Maintaining Accuracy

**Regular Audits:**
- Cycle count 10% of locations weekly
- Full inventory count quarterly
- Reconcile discrepancies immediately

**Update Locations:**
- When products move, update system immediately
- Remove discontinued products from locations
- Reassign empty high-value locations

**Training:**
- Train all pickers on system usage
- Review pick order logic
- Conduct refresher training quarterly

---

## Troubleshooting

### "Location Already Assigned"

**Problem:** Trying to assign a location already in use

**Solutions:**
1. Check map to see what's currently there
2. Reassign existing product to different location
3. Share location if products are compatible
4. Create additional shelf levels if needed

### "Pick Order Seems Wrong"

**Problem:** Items not in logical picking order

**Solutions:**
1. Verify warehouse configuration matches physical layout
2. Check location assignments are accurate
3. Recalculate pick orders manually
4. Consider switching to zone-based strategy

### "Can't Find Product in Warehouse"

**Problem:** Product shows location but isn't there

**Solutions:**
1. Check if product was recently moved
2. Verify location label is correct
3. Search nearby locations (may be misplaced)
4. Conduct physical count and update system
5. Update location if product relocated

### "Bulk Import Failed"

**Problem:** CSV upload rejected

**Solutions:**
1. Check CSV format matches template exactly
2. Verify all SKU codes exist in system
3. Ensure aisles/rows/shelves match configuration
4. Look for duplicate locations
5. Remove special characters from location names
6. Save CSV as UTF-8 encoded

### "Map Not Loading"

**Problem:** Warehouse map shows error or blank

**Solutions:**
1. Refresh browser (Ctrl+R / Cmd+R)
2. Clear browser cache
3. Check warehouse configuration is complete
4. Verify JavaScript is enabled
5. Try different browser
6. Contact support if issue persists

---

## Related Documentation

- [Pick Sheet Guide](./PICK_SHEET_GUIDE.md)
- [Routing & Delivery Guide](./ROUTING_DELIVERY_GUIDE.md)
- [Warehouse Configuration Guide](./WAREHOUSE_CONFIGURATION_GUIDE.md)
- [Warehouse Quick Reference](./WAREHOUSE_QUICK_REFERENCE.md)
- [API Reference](./API_REFERENCE.md)

---

## Support

**Need Help?**
- Email: support@yourcompany.com
- Phone: 1-800-WAREHOUSE
- Live Chat: Available 8am-6pm EST
- Training Videos: https://help.yourcompany.com/warehouse

**Report Issues:**
- Bug reports: https://github.com/yourorg/leora/issues
- Feature requests: product@yourcompany.com
