# Warehouse Configuration Guide

## Overview

This guide walks through the initial setup and ongoing maintenance of your warehouse configuration in Leora.

**Prerequisites:**
- Admin access to Leora
- Physical warehouse measurements
- Existing shelf labeling system (or plan for new one)

**Time Required:**
- Initial setup: 30-60 minutes
- Ongoing maintenance: 5-10 minutes monthly

---

## Initial Setup

### Step 1: Measure Your Warehouse

Before configuring the system, gather these details:

**Physical Layout:**
- Number of aisles: ____
- Rows per aisle: ____
- Shelf levels per location: ____
- Total locations: (aisles × rows × shelves) = ____

**Example Warehouse:**
```
Small Warehouse (500-1000 sq ft):
- Aisles: 5 (A-E)
- Rows: 8
- Shelves: 3 (Bottom, Middle, Top)
- Total: 120 locations

Medium Warehouse (1000-5000 sq ft):
- Aisles: 10 (A-J)
- Rows: 15
- Shelves: 4 (Floor, Low, High, Top)
- Total: 600 locations

Large Warehouse (5000+ sq ft):
- Aisles: 16 (A-P)
- Rows: 20
- Shelves: 5
- Total: 1,600 locations
```

### Step 2: Plan Aisle Names

**Recommendation:** Use single letters (A-Z)

**Best Practices:**
- Start with 'A' near warehouse entrance/loading dock
- Progress alphabetically toward back of warehouse
- Match existing aisle signage if you have it
- Leave gaps for future expansion (e.g., use A, C, E, G if planning to add more aisles)

**Example Naming:**
```
Loading Dock
    ↓
Aisle A ← (Closest, for fast-movers)
Aisle B
Aisle C
Aisle D
Aisle E ← (Furthest, for slow-movers)
```

### Step 3: Plan Row Numbering

**Recommendation:** Start from 1 near entrance, increment going deeper

**Best Practices:**
- Number 1 closest to main walkway
- Increment toward back wall
- Use consistent numbering across all aisles
- Match existing row markers if present

**Example Layout:**
```
        Main Walkway
            ↓
Row 1  [A-1] [B-1] [C-1] [D-1] [E-1]
Row 2  [A-2] [B-2] [C-2] [D-2] [E-2]
Row 3  [A-3] [B-3] [C-3] [D-3] [E-3]
...
Row 10 [A-10][B-10][C-10][D-10][E-10]
            ↑
        Back Wall
```

### Step 4: Define Shelf Levels

**Common Configurations:**

**3-Level (Most Common):**
```
Top      [6-7 feet high]
Middle   [3-5 feet high]
Bottom   [0-2 feet high]
```

**4-Level:**
```
Overhead [7+ feet, requires ladder]
High     [5-7 feet]
Low      [2-5 feet]
Ground   [0-2 feet, floor level]
```

**5-Level (Industrial):**
```
Shelf 4  [8+ feet]
Shelf 3  [6-8 feet]
Shelf 2  [4-6 feet]
Shelf 1  [2-4 feet]
Floor    [0-2 feet]
```

**Custom Names:**
- Use your existing shelf labels
- Keep names short (under 10 characters)
- Avoid spaces and special characters
- Examples: "Top", "Mid", "Bot", "L1", "L2", "L3"

### Step 5: Choose Pick Strategy

**Two strategies available:**

**1. aisle_then_row (Default, Recommended)**

Best for: Most warehouses

How it works:
- Pick all items in Aisle A first
- Then move to Aisle B
- Within each aisle, progress row-by-row
- Minimizes aisle changes (most expensive)

**pickOrder Calculation:**
```
pickOrder = (AisleNumber × 1000) + (RowNumber × 10) + ShelfWeight

Example: Location B-5-Top
- Aisle B = 2
- Row 5 = 5
- Top = 3
- pickOrder = (2 × 1000) + (5 × 10) + 3 = 2053
```

**2. zone_based**

Best for: Very large warehouses with distinct zones

How it works:
- Warehouse divided into zones (e.g., Cold Storage, Dry Goods, Spirits)
- Pick all items in one zone before moving to next
- Optimizes for zone transitions

**Zone Setup:**
1. Define zones (up to 10)
2. Assign aisles to zones
3. Set zone pick priority

---

## Configuring the System

### Access Configuration

1. **Navigate to Settings**
   - Menu: Settings > Warehouse Configuration

2. **Verify Permissions**
   - Must have: Admin or Warehouse Manager role
   - If you don't see this page, request access

### Basic Configuration

**1. Set Aisles**

Click **Configure Aisles**

- **Method 1: Range**
  - From: A
  - To: E
  - Creates: A, B, C, D, E

- **Method 2: Custom List**
  - Enter: A, B, C, D, E
  - Or: 1, 2, 3, 4, 5 (numeric aisles)
  - Or: AA, AB, AC (multi-character)

**2. Set Rows**

Click **Configure Rows**

- **Rows per Aisle**: 10
- **Row Numbering**:
  - Start at: 1
  - End at: 10
  - Or custom: 1, 3, 5, 7, 9 (odd numbers only)

**3. Set Shelves**

Click **Configure Shelves**

- **Number of Levels**: 3
- **Shelf Names** (top to bottom):
  - Level 1: Top
  - Level 2: Middle
  - Level 3: Bottom

- **Shelf Weights** (for pick order):
  - Bottom: 1 (pick first)
  - Middle: 2
  - Top: 3 (pick last)

**4. Set Pick Strategy**

- **Strategy**: aisle_then_row (default)
- Or: zone_based (requires zone setup)

**5. Save Configuration**

- Click **Save Changes**
- Confirmation: "Warehouse configured successfully"
- Location count shown: 150 locations created

### Advanced Configuration (Optional)

**Zone-Based Picking Setup:**

1. **Enable Zone Strategy**
   - Pick Strategy: zone_based

2. **Define Zones**
   - Click **Manage Zones**
   - Add zone: "Cold Storage"
     - Aisles: A, B
     - Priority: 1 (pick first)
   - Add zone: "Dry Goods"
     - Aisles: C, D
     - Priority: 2
   - Add zone: "Spirits"
     - Aisle: E
     - Priority: 3

3. **Save Zone Configuration**

**Custom Shelf Weights:**

If you want to pick top-to-bottom instead:
- Top: 1 (pick first)
- Middle: 2
- Bottom: 3 (pick last)

---

## Location Validation Rules

The system enforces these rules:

**Location Format:**
- Must be: `Aisle-Row-Shelf`
- Examples: `A-1-Bottom`, `C-5-Top`

**Valid Characters:**
- Aisles: Letters (A-Z) or numbers
- Rows: Numbers only
- Shelves: Alphanumeric (no spaces)

**Uniqueness:**
- Each location must be unique
- Cannot have two products at `A-1-Bottom`
- (Unless sharing is explicitly enabled)

**Configuration Limits:**
- Max aisles: 26 (A-Z) or 50 (numeric)
- Max rows per aisle: 100
- Max shelf levels: 10
- Max total locations: 10,000

---

## Recalculating pickOrder

### When to Recalculate

Pick orders need recalculation when:
- Warehouse configuration changes
- Aisles added/removed
- Row counts change
- Shelf weights modified
- Pick strategy changes

**Auto-Recalculation:**
- New location assignments
- Individual location updates

**Manual Recalculation:**
- Bulk configuration changes
- After imports
- When pick orders seem incorrect

### How to Recalculate

**Option 1: Automatic (Recommended)**

System recalculates automatically on save when:
- Warehouse configuration changes
- Pick strategy changes

**Option 2: Manual Trigger**

1. Navigate to **Settings > Warehouse Configuration**
2. Scroll to bottom
3. Click **Recalculate All Pick Orders**
4. Confirm action
5. Wait for completion (30 seconds - 2 minutes)

**Progress Indicator:**
```
Recalculating pick orders...
Progress: 250/1000 locations (25%)
Estimated time remaining: 45 seconds
```

**Completion:**
```
✓ Pick orders recalculated successfully
- 1,000 locations updated
- 0 errors
- Average pick order: 5,523
- Range: 1,011 - 10,533
```

### Verification

After recalculation, verify:

1. **Check Sample Locations**
   - A-1-Bottom should have lowest pickOrder
   - Last aisle, last row, top shelf should have highest

2. **Generate Test Pick Sheet**
   - Create pick sheet with 10+ items
   - Verify items in logical picking sequence
   - Walk route to confirm efficiency

3. **Review Pick Orders Report**
   - Settings > Reports > Pick Order Distribution
   - Histogram should show even distribution
   - No gaps or duplicates

---

## Best Practices

### Layout Optimization

**Fast-Movers Near Entrance:**
- Assign A-aisles (closest) to top 20% of products
- Put top sellers on bottom shelves (fastest access)
- Example: Popular Chardonnays at A-1-Bottom

**Product Grouping:**
- Group by category (all Reds together)
- Or group by supplier (easier receiving)
- Or group by price point (security for expensive wines)

**Safety Considerations:**
- Heavy items on bottom shelves (bottles > 1.5L)
- Light items on top (small formats, accessories)
- Fragile items at eye level (reduces drops)
- Keep high-value items in secure area

### Seasonal Adjustments

**Holiday Seasons:**
- Move seasonal products to A-aisles temporarily
- Example: Champagne to front in December
- Reassign back to normal locations in January

**Inventory Growth:**
- Start with 80% capacity
- Reserve aisles for expansion
- Example: Use A-E now, save F-J for growth

### Regular Maintenance

**Monthly Tasks:**
1. Review pick order accuracy
2. Update fast-mover locations
3. Remove discontinued products from locations
4. Audit 10% of locations for accuracy

**Quarterly Tasks:**
1. Full inventory count
2. Reassess product velocity
3. Reorganize based on sales data
4. Recalculate pick orders if major changes

**Annual Tasks:**
1. Complete warehouse audit
2. Review and update configuration
3. Consider layout changes for efficiency
4. Update signage and labeling

---

## Warehouse Zones (Future Feature)

### Coming Soon: Advanced Zone Management

**Planned Features:**
- Temperature-controlled zones (Cold Storage vs Room Temp)
- Security zones (Locked cabinet for high-value items)
- Receiving zones (Incoming inventory staging)
- Packing zones (Order assembly areas)
- Quarantine zones (Damaged or recalled products)

**How It Will Work:**
1. Define zones with specific attributes
2. Assign aisles or ranges to zones
3. Set zone-specific pick rules
4. Route optimization considers zone restrictions

**Use Cases:**
- Separate cold-chain products
- Secure expensive inventory
- Optimize multi-temperature routes
- Streamline receiving workflow

---

## Migration from Existing System

### Importing Existing Locations

If you have existing warehouse locations in another system:

**Step 1: Export Current Data**
- Export CSV with: SKU, Aisle, Row, Shelf

**Step 2: Map to Leora Format**
```csv
sku_code,aisle,row,shelf
CHARD-001,A,1,Bottom
CAB-002,A,2,Middle
```

**Step 3: Import via Bulk Import**
- Warehouse > Inventory Locations > Bulk Import
- Upload CSV
- Verify and confirm

**Step 4: Recalculate Pick Orders**
- Settings > Warehouse > Recalculate All

### Changing Configuration Later

**Can Be Changed Safely:**
- Shelf names (just cosmetic)
- Shelf weights (triggers recalculation)
- Pick strategy
- Zone definitions

**Requires Careful Planning:**
- Adding aisles (may renumber pick orders)
- Removing aisles (reassign products first!)
- Changing row counts (verify locations still valid)

**Cannot Be Changed:**
- Location format (Aisle-Row-Shelf is fixed)
- After products assigned, avoid major restructuring

---

## Troubleshooting

### "Configuration save failed"

**Cause:** Validation error or duplicate aisles

**Solution:**
1. Check for duplicate aisle names
2. Verify row count is numeric
3. Ensure shelf names are unique
4. Remove special characters from names

### "Pick orders not updating"

**Cause:** Auto-recalculation disabled or failed

**Solution:**
1. Manually trigger recalculation
2. Check browser console for errors
3. Refresh page and try again
4. Verify database connectivity

### "Import failed - invalid configuration"

**Cause:** CSV references aisles/rows/shelves that don't exist in config

**Solution:**
1. Verify warehouse configured first
2. Check CSV uses exact aisle/row/shelf names
3. Update CSV to match configuration
4. Or update configuration to match CSV

---

## Related Documentation

- [Warehouse Operations Guide](./WAREHOUSE_OPERATIONS_GUIDE.md)
- [Pick Sheet Guide](./PICK_SHEET_GUIDE.md)
- [Warehouse Quick Reference](./WAREHOUSE_QUICK_REFERENCE.md)
- [API Reference](./API_REFERENCE.md)

---

## Support

**Configuration Help:**
- Email: warehouse-setup@yourcompany.com
- Phone: 1-800-CONFIG-HELP
- Schedule Setup Call: https://calendly.com/warehouse-setup
