# Pick Sheet Guide

## What is a Pick Sheet?

A pick sheet is a document that lists all items to be picked from warehouse inventory for one or more orders, organized in the most efficient picking sequence.

**Benefits:**
- **30-50% faster picking** - Items sorted by location
- **Reduced errors** - Clear item identification
- **Batch picking** - Multiple orders on one sheet
- **Progress tracking** - Check off items as you pick
- **Mobile friendly** - Use on iPad or phone while picking

---

## Quick Start

### Generating Your First Pick Sheet

1. Go to **Warehouse > Pick Sheets**
2. Click **Generate Pick Sheet**
3. Select orders (status: READY)
4. Click **Create Pick Sheet**
5. Pick sheet opens with items sorted by location

**That's it!** Start picking from top to bottom.

---

## Pick Sheet Lifecycle

```
DRAFT → READY → PICKING → PICKED → (ARCHIVED)
  ↓       ↓        ↓         ↓
Create  Start   In Prog   Done
```

### Status Definitions

**DRAFT**
- Pick sheet created but not started
- Can be edited or deleted
- Orders not yet locked
- Use for: Planning future pick runs

**READY**
- Pick sheet finalized and ready to pick
- Orders locked (can't be modified)
- Assigned to picker (optional)
- Use for: Queued pick sheets

**PICKING**
- Currently being picked
- Some items checked off
- Can pause and resume
- Use for: Active pick runs

**PICKED**
- All items picked and verified
- Orders ready for packing/shipping
- Can generate delivery routes
- Use for: Completed picks

**ARCHIVED** (optional)
- Historical record
- No longer active
- Can be referenced later
- Use for: Reporting and audits

---

## Generating Pick Sheets

### Step-by-Step Process

**1. Navigate to Pick Sheets**
   - Menu: Warehouse > Pick Sheets
   - Click **Generate New Pick Sheet**

**2. Select Orders**

**Filter Options:**
- **Status**: Only READY orders shown
- **Date Range**: Orders within specific dates
- **Customer**: Pick sheets for specific customer
- **Priority**: High-priority orders first
- **Delivery Date**: Orders due soon

**Selection:**
- Click checkbox next to each order
- Or click **Select All** (max 50 orders per sheet)
- Review order count and total items

**3. Review Summary**

Preview shows:
- Total orders: 8
- Total items: 45
- Total quantity: 127 bottles
- Estimated pick time: 25 minutes

**4. Assign Picker (Optional)**
- Select from dropdown
- Or leave unassigned
- Picker will see sheet in their queue

**5. Set Priority**
- **Normal**: Standard pick sheet
- **High**: Rush orders
- **Critical**: Same-day shipping

**6. Generate Sheet**
- Click **Create Pick Sheet**
- Pick sheet created with unique ID
- Status: DRAFT (until you start picking)

---

## Understanding the Pick Sheet Layout

### Header Section

```
Pick Sheet #PS-2024-001
Created: Oct 25, 2024 2:30 PM
Status: PICKING
Assigned to: John Doe
Priority: HIGH
Orders: 5 orders
Items: 28 items
Total Qty: 85 bottles
```

### Item List (Optimized Order)

```
Item  Location     Product                    SKU          Qty  Customer       ☐
1     A-1-Bottom   Burgundy Chardonnay        CHARD-001    6    Wine Bar XYZ   ☐
2     A-1-Middle   Napa Chardonnay            CHARD-002    3    Restaurant ABC ☐
3     A-3-Bottom   Bordeaux Cabernet          CAB-001      12   Wine Bar XYZ   ☐
4     A-5-Top      Napa Cabernet              CAB-002      6    Bistro 123     ☐
5     B-2-Middle   Oregon Pinot Noir          PINOT-001    6    Restaurant ABC ☐
...
```

### Footer Section

```
Started: 2:45 PM
Completed: _______
Picked by: _____________ (signature)
Verified by: ___________ (signature)
```

---

## Picking Process

### Before You Start

**Prepare:**
1. Get pick sheet (iPad or printed)
2. Grab picking cart
3. Grab boxes/bins for orders
4. Label bins with order numbers
5. Review any special handling notes

### During Picking

**Follow This Process:**

**For Each Item:**

1. **Read Location**
   - Note: A-3-Bottom
   - Navigate to Aisle A

2. **Find Row**
   - Look for Row 3 marker
   - Scan shelf labels

3. **Identify Shelf**
   - Bottom shelf
   - Locate product

4. **Verify Product**
   - Match SKU code (CHARD-001)
   - Check product name
   - Verify you're grabbing correct item

5. **Pick Quantity**
   - Count bottles carefully
   - 6 bottles needed
   - Double-check count

6. **Place in Bin**
   - Use bin labeled with customer/order
   - Keep orders separated
   - Handle fragile items carefully

7. **Mark Picked**
   - Tap checkbox on iPad
   - Or mark with pen on printed sheet
   - Item grays out

8. **Move to Next Item**
   - Next item is A-1-Middle (nearby!)
   - No backtracking needed

### Efficiency Tips

**Batching:**
- Pick all items from one aisle before moving
- If item requires special handling, flag it for later
- Group heavy items at bottom of cart

**Scanning (if available):**
- Scan SKU barcode to verify
- System auto-checks item if matched
- Alert if wrong SKU scanned

**Voice Commands (if enabled):**
- "Mark item 5 picked"
- "Skip item 7" (out of stock)
- "Complete pick sheet"

### Handling Issues

**Item Not Found:**
1. Mark as "Out of Stock" (flag icon)
2. System notifies inventory team
3. Continue with remaining items
4. Report location discrepancy

**Wrong Quantity:**
1. Pick available quantity
2. Note actual quantity picked
3. Update in system
4. Backorder remainder

**Damaged Product:**
1. Do not pick damaged item
2. Flag item as "Damaged"
3. Note damage description
4. Notify quality control
5. Pick replacement if available

---

## CSV/PDF Export

### Exporting for Printing

**Generate PDF:**
1. Open pick sheet
2. Click **Export > PDF**
3. Options:
   - Include barcodes: Yes/No
   - Include customer notes: Yes/No
   - Font size: Normal/Large (for warehouse lighting)
4. Download PDF
5. Print on letter size paper

**Print Settings:**
- Orientation: Portrait
- Margins: Narrow
- Color: Black & white (saves ink)
- Pages per sheet: 1 (for readability)

### Exporting to CSV

**Use Cases:**
- Import into external warehouse system
- Analyze pick metrics
- Create custom reports

**Generate CSV:**
1. Open pick sheet
2. Click **Export > CSV**
3. Download file: `pick_sheet_PS-2024-001.csv`

**CSV Format:**
```csv
item_number,location,aisle,row,shelf,sku_code,product_name,quantity,customer_name,order_id,picked
1,A-1-Bottom,A,1,Bottom,CHARD-001,Burgundy Chardonnay,6,Wine Bar XYZ,ORD-001,false
2,A-1-Middle,A,1,Middle,CHARD-002,Napa Chardonnay,3,Restaurant ABC,ORD-002,false
```

---

## Completing Pick Sheets

### Finalizing the Pick

**1. Verify All Items Checked**
   - Scroll through entire list
   - Ensure all checkboxes marked
   - Or all items in "Picked" status

**2. Review Exceptions**
   - Check any "Out of Stock" flags
   - Verify "Partial Pick" quantities
   - Note "Damaged" items

**3. Complete Pick Sheet**
   - Click **Complete Pick Sheet** button
   - Confirm completion
   - Status changes to PICKED

**4. Print Summary**
   - Completion receipt generated
   - Shows:
     - Time started/completed
     - Items picked: 42/45
     - Exceptions: 3
     - Picker name
   - Attach to order paperwork

**5. Next Steps**
   - Orders move to PICKED status
   - Packing team notified
   - Delivery routing can begin

### Partial Completion

If you can't complete entire sheet:

**Option 1: Save Progress**
- Items remain checked
- Status stays PICKING
- Resume later from where you left off

**Option 2: Complete Partial**
1. Click **Complete Partial**
2. System creates new pick sheet for unpicked items
3. Current sheet marked PICKED
4. Remaining items go to new sheet

---

## Canceling Pick Sheets

### When to Cancel

- Orders were canceled
- Incorrect orders selected
- Need to regenerate with different items
- Priority changed (need rush sheet instead)

### How to Cancel

**1. Open Pick Sheet**
   - Navigate to Warehouse > Pick Sheets
   - Click sheet to cancel

**2. Check Status**
   - **DRAFT or READY**: Can cancel freely
   - **PICKING**: Must confirm (some items may be picked)
   - **PICKED**: Cannot cancel (archive instead)

**3. Click Cancel Button**
   - Click **Cancel Pick Sheet**
   - Confirm action

**4. Specify Reason** (optional but recommended)
   - Orders canceled
   - Incorrect selection
   - System error
   - Other (describe)

**5. Handle Picked Items** (if status was PICKING)
   - If items already picked, choose:
     - **Return to Inventory**: Put items back
     - **Keep Aside**: Hold for new sheet
     - **Create New Sheet**: Auto-generate replacement

**6. Confirm Cancellation**
   - Orders unlocked (can be added to new sheet)
   - Pick sheet marked CANCELED
   - Picker notified (if assigned)

---

## Tips for Pickers

### Speed Up Picking Time

**Route Familiarization:**
- Walk warehouse layout daily
- Memorize aisle contents
- Know fast-movers by heart
- Learn shelf heights

**Cart Organization:**
- Use dividers for multiple orders
- Heavy items at bottom
- Fragile items on top
- Keep scan gun accessible

**Batch Similar Items:**
- If picking 10 bottles of same SKU for different orders
- Pick all 10 at once from location
- Sort into order bins at cart

**Use Both Hands:**
- Scan with right hand
- Pick with left hand
- Or vice versa (your preference)

**Stay Hydrated:**
- Warehouse work is physical
- Keep water bottle on cart
- Take short breaks

### Reduce Errors

**Always Verify:**
- SKU code matches (don't trust location alone)
- Product name correct
- Vintage/year correct (if applicable)
- Quantity exact

**Count Twice:**
- Count bottles as you pick
- Count again as you place in bin
- Especially important for large quantities

**Scan Everything:**
- Use barcode scanner if available
- Catches 99% of errors
- Faster than manual verification

**Stay Focused:**
- Avoid distractions
- Don't rush
- One item at a time
- Check off immediately after picking

---

## Common Issues

### "Pick sheet is empty"

**Cause:** No orders in READY status

**Solution:**
1. Check order status (should be READY, not PENDING or PACKED)
2. Verify orders have inventory locations assigned
3. Ensure orders have line items

### "Items not in optimal order"

**Cause:** Inventory locations not assigned or pick order not calculated

**Solution:**
1. Verify all SKUs have locations assigned
2. Go to Settings > Warehouse > Recalculate Pick Orders
3. Regenerate pick sheet

### "Can't mark item as picked"

**Cause:** App offline or network issue

**Solution:**
1. Check Wi-Fi connection
2. Refresh page
3. Marks will sync when connection restored
4. Use offline mode if available

### "Wrong quantity on pick sheet"

**Cause:** Order was modified after pick sheet generated

**Solution:**
1. Note actual quantity needed
2. Update pick sheet manually
3. Notify order management team
4. Consider canceling and regenerating sheet

---

## Mobile App Features

### Offline Mode

**Enable Offline Mode:**
1. Settings > Enable Offline Picking
2. Download pick sheets while on Wi-Fi
3. Pick without internet
4. Syncs when connection restored

**What Works Offline:**
- View pick sheet items
- Check off items as picked
- View product images
- Access location map

**What Doesn't Work:**
- Generating new pick sheets
- Updating quantities
- Viewing real-time inventory

### Barcode Scanning

**Setup:**
1. Connect Bluetooth scanner to iPad
2. Or use iPad camera as scanner
3. Settings > Enable Barcode Verification

**Usage:**
1. Navigate to item on pick sheet
2. Scan SKU barcode on product
3. If matches: Auto-checks item
4. If doesn't match: Warning alert

**Benefits:**
- 99.9% picking accuracy
- 40% faster than manual
- Prevents wrong SKU picks

### Voice Commands

**Enable:**
1. Settings > Voice Commands > On
2. Allow microphone access

**Commands:**
- "Next item" - Scroll to next unpicked item
- "Mark picked" - Check current item
- "Quantity [number]" - Set quantity picked
- "Out of stock" - Flag item unavailable
- "Complete sheet" - Finish pick sheet

---

## Reporting

### Pick Sheet Analytics

**View Reports:**
1. Warehouse > Reports > Pick Sheet Analytics

**Available Metrics:**
- Average pick time per sheet
- Items per hour (by picker)
- Error rate (wrong items picked)
- Completion rate
- Time by aisle (identify bottlenecks)

**Use Cases:**
- Identify top performers
- Find warehouse layout issues
- Calculate labor costs
- Forecast pick times

---

## Related Documentation

- [Warehouse Operations Guide](./WAREHOUSE_OPERATIONS_GUIDE.md)
- [Routing & Delivery Guide](./ROUTING_DELIVERY_GUIDE.md)
- [Warehouse Configuration Guide](./WAREHOUSE_CONFIGURATION_GUIDE.md)
- [Warehouse Quick Reference](./WAREHOUSE_QUICK_REFERENCE.md)
- [API Reference](./API_REFERENCE.md)

---

## Support

**Questions?**
- Live Chat: In-app help button
- Email: warehouse-support@yourcompany.com
- Phone: 1-800-PICK-HELP
- Training Videos: https://help.yourcompany.com/picking
