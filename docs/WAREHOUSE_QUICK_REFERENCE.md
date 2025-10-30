# Warehouse Operations - Quick Reference

## 🎯 Access URLs

- **Pick Sheets Dashboard**: `/sales/operations/pick-sheets`
- **Pick Sheet Detail**: `/sales/operations/pick-sheets/[sheetId]`
- **Warehouse Management**: `/sales/warehouse`
- **Routing**: `/sales/operations/routing`

## 📦 Pick Sheets Workflow

### Create Pick Sheet
1. Navigate to `/sales/operations/pick-sheets`
2. Click "New Pick Sheet"
3. Select orders (SUBMITTED status only)
4. Enter picker name
5. Click "Generate Pick Sheet"

### Execute Picking
1. Open pick sheet detail page
2. Click "Start Picking" (READY → PICKING)
3. Check off items as picked (sorted by location: A-1-1, A-1-2, etc.)
4. Click "Complete" when all items checked (PICKING → PICKED)

### Export Options
- **CSV**: Comma-separated for Excel
- **PDF**: Print-optimized view
- **Print**: Direct print from browser
- **Email**: Send to picker

## 🏭 Warehouse Management

### Configure Warehouse
1. Go to `/sales/warehouse`
2. Click "Configuration" tab
3. Set:
   - Aisles: A,B,C,D (comma-separated)
   - Rows per Aisle: 5
   - Shelves per Row: 4
4. Click "Save Configuration"

### Assign Locations (Individual)
1. Click "Assign Locations" tab
2. Search for product by SKU/name
3. Select product from list
4. Choose Aisle, Row, Shelf
5. Preview location (e.g., A-1-1)
6. Click "Save Location"

### Bulk Import Locations
1. Click "Bulk Import" tab
2. Download CSV template
3. Fill template:
   ```
   SKU,Aisle,Row,Shelf
   WG-001,A,1,1
   CS-102,A,1,2
   ```
4. Upload CSV
5. Review preview
6. Click "Import X Locations"

### View Warehouse Map
1. Click "Warehouse Map" tab
2. See visual grid layout
3. Green = occupied, Gray = empty
4. Click any location to see products

## 🚚 Delivery Routing

### Export to Azuga
1. Go to `/sales/operations/routing`
2. Click "Export to Azuga"
3. Select delivery date
4. Filter by territory (optional)
5. Select orders
6. Click "Export CSV"
7. Upload to Azuga platform

### Today's Routes
1. Click "Today's Routes" tab
2. See all active routes
3. Grouped by driver/truck
4. View progress bars
5. Click "Contact" to call driver
6. Click "View" for route details

### Route Details
1. Click "Route Details" tab
2. See sequential stops
3. Click "Open Route" for full route in Google Maps
4. Click "Map" on individual stop for directions

## 🎨 Component Reference

### Pick Sheets
- **PickSheetCard**: Summary card with progress
- **PickItemRow**: Individual item with checkbox (large touch target)
- **PickingControls**: Start/Complete/Cancel buttons
- **ExportButtons**: CSV/PDF/Print/Email options
- **PickSheetGenerator**: Create new pick sheet

### Warehouse
- **LocationEditor**: Assign individual locations
- **WarehouseMap**: Visual grid display
- **LocationImport**: Bulk CSV import
- **ConfigEditor**: Warehouse settings

### Routing
- **ExportDialog**: Azuga CSV export
- **RouteViewer**: Detailed route with stops
- **TodayRoutes**: Live route tracking

## 📱 Mobile Usage

All components optimized for iPad/mobile:
- **Touch targets**: Minimum 44px for easy tapping
- **Large checkboxes**: 6x6 (24px) for warehouse picking
- **Responsive layout**: Mobile-first design
- **Large fonts**: SKUs in monospace for readability

### Recommended Setup
- Use iPad in landscape mode
- Font size: 16px+ for easy reading
- Enable "Request Desktop Site" if needed
- Barcode scanner ready (future feature)

## 🖨️ Print Formats

### Pick Sheet Print Layout
- Header with sheet number, date, picker
- Table with: Location | SKU | Product | Qty | Customer
- Large checkboxes for manual marking
- Monospace fonts for clarity
- Page breaks for long sheets

### Print Tips
- Use "Print" button in UI (not browser print)
- Portrait orientation recommended
- 1cm margins (auto-set)
- Black & white OK

## 🔄 Status Workflows

### Pick Sheet Status
```
READY → PICKING → PICKED
           ↓
       CANCELLED
```

### Route Status
```
not_started → in_progress → completed
```

### Order Item Status
```
unpicked → picked
```

## 🗄️ Data Flow

### Pick Sheet Creation
1. User selects SUBMITTED orders
2. System creates pick_sheet record
3. System creates pick_sheet_items from order_items
4. Items sorted by pickOrder (calculated from location)
5. Sheet status = READY

### Picking Process
1. User clicks "Start Picking"
2. Status: READY → PICKING
3. User checks items as picked
4. Each item gets picked=true, pickedAt=timestamp
5. When all picked, user clicks "Complete"
6. Status: PICKING → PICKED

### Routing Export
1. User selects picked orders (PICKED status)
2. System generates CSV with:
   - Order Number
   - Customer Name
   - Full Address
   - Delivery Date
   - Territory
3. User uploads to Azuga
4. Azuga returns optimized routes
5. User imports routes back to system

## 🔧 Troubleshooting

### "No orders ready for picking"
- Orders must be in SUBMITTED status
- Check order status in orders dashboard

### "Missing locations" warning
- Some products don't have warehouse locations
- Assign locations in Warehouse Management
- Or use bulk import

### Items not sorted correctly
- Check that locations are assigned
- Verify pickOrder calculation
- Format: Aisle-Row-Shelf (A-1-1, A-1-2, etc.)

### Export not working
- Check browser pop-up blocker
- Enable downloads
- Try different browser

### Google Maps not opening
- Allow pop-ups
- Check internet connection
- Verify address format

## 📊 Reports & Analytics

### Pick Sheet Metrics
- Total sheets created
- Average pick time
- Items per sheet
- Picker productivity

### Warehouse Metrics
- Location utilization
- Products without locations
- High-traffic aisles
- Pick order efficiency

### Routing Metrics
- Orders per route
- Territory distribution
- On-time delivery rate
- Route completion time

## 🔐 Permissions

Required permissions by role:
- **Warehouse Manager**: Full access
- **Picker**: View/update pick sheets
- **Driver**: View routes only
- **Sales**: View only

## 📞 Support

For issues:
1. Check this guide first
2. Review implementation docs
3. Contact IT support
4. File bug report with screenshots

---

**Last Updated**: October 2024
**Version**: 1.0.0
**Phase**: 5 (Operations & Warehouse)
