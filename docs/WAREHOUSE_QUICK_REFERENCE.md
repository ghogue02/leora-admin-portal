# Warehouse Quick Reference

One-page cheat sheet for warehouse operations.

---

## Common Commands

```bash
# View warehouse configuration
GET /api/warehouse/config

# Assign inventory location
PATCH /api/warehouse/inventory/locations
{
  "skuId": "uuid",
  "aisle": "A",
  "row": 5,
  "shelf": "Bottom"
}

# Generate pick sheet
POST /api/pick-sheets
{
  "orderIds": ["uuid1", "uuid2"],
  "priority": "normal"
}

# Export to Azuga
POST /api/routing/export
{
  "orderIds": ["uuid1", "uuid2"],
  "deliveryDate": "2024-10-26"
}
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/warehouse/config` | GET | Get warehouse configuration |
| `/api/warehouse/config` | POST/PATCH | Update warehouse config |
| `/api/warehouse/inventory/locations` | GET | List inventory locations |
| `/api/warehouse/inventory/locations` | PATCH | Assign/update location |
| `/api/warehouse/locations/import` | POST | Bulk import locations |
| `/api/pick-sheets` | GET | List pick sheets |
| `/api/pick-sheets` | POST | Create pick sheet |
| `/api/pick-sheets/[id]` | GET | Get pick sheet details |
| `/api/pick-sheets/[id]` | PATCH | Update pick sheet status |
| `/api/pick-sheets/[id]/export` | GET | Export pick sheet (CSV/PDF) |
| `/api/pick-sheets/[id]/items/[itemId]` | PATCH | Mark item picked |
| `/api/routing/export` | POST | Export orders to Azuga |
| `/api/routing/import` | POST | Import optimized routes |
| `/api/routes/today` | GET | Get today's routes |
| `/api/routes/customer/[id]` | GET | Get customer route ETA |

---

## CSV Formats

### Bulk Location Import

```csv
sku_code,aisle,row,shelf
CHARD-001,A,1,Bottom
CAB-SAUV-002,A,1,Middle
PINOT-NOIR-003,A,2,Bottom
```

### Azuga Export

```csv
customer_name,address,city,state,zip,phone,delivery_date,order_id
Wine Bar XYZ,123 Main St,San Francisco,CA,94102,415-555-1234,2024-10-26,ORD-001
```

### Azuga Import

```csv
route_name,stop_number,customer_name,address,estimated_arrival,order_id
Route 1,1,Wine Bar XYZ,123 Main St SF CA,09:15,ORD-001
```

---

## pickOrder Formula

**aisle_then_row Strategy:**

```
pickOrder = (Aisle × 1000) + (Row × 10) + ShelfWeight

Shelf Weights:
- Bottom: 1
- Middle: 2
- Top: 3

Example: B-5-Top
= (2 × 1000) + (5 × 10) + 3
= 2053
```

**Result:** Lower pickOrder = earlier in pick sequence

---

## Location Format

**Format:** `Aisle-Row-Shelf`

**Examples:**
- `A-1-Bottom` - Aisle A, Row 1, Bottom shelf
- `C-5-Top` - Aisle C, Row 5, Top shelf
- `J-10-Middle` - Aisle J, Row 10, Middle shelf

**Rules:**
- Aisle: Letter (A-Z) or number
- Row: Number (1-100)
- Shelf: Alphanumeric, no spaces

---

## Pick Sheet Status Flow

```
DRAFT → READY → PICKING → PICKED
  ↓       ↓        ↓         ↓
Edit    Start    Work      Done
```

**Actions by Status:**
- **DRAFT**: Can edit/delete, not yet started
- **READY**: Locked and ready to pick
- **PICKING**: Currently being picked
- **PICKED**: Complete, ready for packing/delivery

---

## Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Location already assigned | Check warehouse map, reassign existing product |
| Pick order seems wrong | Recalculate: Settings > Warehouse > Recalculate |
| CSV import failed | Verify format matches template, check for duplicates |
| Product not at location | Update location or do physical inventory count |
| Pick sheet empty | Check orders are status READY with locations assigned |
| Route import failed | Verify order IDs match exactly (case-sensitive) |
| Driver not receiving route | Check app sync, reassign route |

---

## Warehouse Configuration

### Small Warehouse (120 locations)
```
Aisles: A-E (5)
Rows: 8 per aisle
Shelves: Bottom, Middle, Top (3)
Total: 5 × 8 × 3 = 120
```

### Medium Warehouse (600 locations)
```
Aisles: A-J (10)
Rows: 15 per aisle
Shelves: Ground, Low, High, Top (4)
Total: 10 × 15 × 4 = 600
```

### Large Warehouse (1,600 locations)
```
Aisles: A-P (16)
Rows: 20 per aisle
Shelves: Floor, S1, S2, S3, S4 (5)
Total: 16 × 20 × 5 = 1,600
```

---

## Keyboard Shortcuts (Web App)

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New pick sheet |
| `Ctrl+E` | Export current view |
| `Ctrl+F` | Search/filter |
| `Space` | Mark item picked (on pick sheet) |
| `←` `→` | Navigate items |
| `Esc` | Close modal |
| `Ctrl+S` | Save changes |

---

## Mobile Gestures (iPad)

| Gesture | Action |
|---------|--------|
| Tap | Mark item picked |
| Swipe left | Skip item |
| Swipe right | Undo pick |
| Pinch | Zoom warehouse map |
| Double-tap | View item details |
| Long-press | Access options menu |

---

## Performance Benchmarks

**Target Metrics:**
- Pick sheet generation: < 2 seconds
- Pick order calculation: < 500ms per 1000 locations
- CSV export: < 1 second for 100 orders
- Bulk import: < 5 seconds for 500 locations
- Route import: < 3 seconds for 50 stops

**Picking Efficiency:**
- Items per hour: 40-60 (standard)
- Items per hour: 60-80 (with scanner)
- Accuracy: > 99% (with scanner)
- Picking time reduction: 30-50% (vs un-optimized)

---

## Database Models

```typescript
WarehouseConfig {
  id: string
  tenantId: string
  aisles: string[]
  rowsPerAisle: number
  shelfLevels: string[]
  pickStrategy: 'aisle_then_row' | 'zone_based'
}

InventoryLocation {
  id: string
  skuId: string
  aisle: string
  row: number
  shelf: string
  pickOrder: number
  lastUpdated: DateTime
}

PickSheet {
  id: string
  status: 'DRAFT' | 'READY' | 'PICKING' | 'PICKED'
  orderIds: string[]
  assignedTo: string?
  createdAt: DateTime
  completedAt: DateTime?
}

PickSheetItem {
  id: string
  pickSheetId: string
  skuId: string
  location: string
  pickOrder: number
  quantity: number
  picked: boolean
  pickedAt: DateTime?
}

DeliveryRoute {
  id: string
  name: string
  driverId: string?
  startTime: DateTime
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  totalStops: number
  totalMiles: number
}

RouteStop {
  id: string
  routeId: string
  orderId: string
  sequence: number
  estimatedArrival: DateTime
  actualArrival: DateTime?
  completed: boolean
}
```

---

## Support Contacts

| Issue | Contact |
|-------|---------|
| Warehouse setup | warehouse-setup@yourcompany.com |
| Pick sheet issues | warehouse-support@yourcompany.com |
| Routing/Azuga | routing-support@yourcompany.com |
| Mobile app | mobile-support@yourcompany.com |
| API integration | api-support@yourcompany.com |
| Emergency (after hours) | 1-800-EMERGENCY |

---

## Training Resources

- **Video Tutorials**: https://help.yourcompany.com/warehouse
- **Live Webinars**: Tuesdays 2pm EST
- **Documentation**: https://docs.yourcompany.com/warehouse
- **API Docs**: https://api.yourcompany.com/docs
- **Community Forum**: https://community.yourcompany.com

---

## Version Info

**Current Version**: 4.0.0 (Phase 5)

**Release Date**: October 2024

**Features Added:**
- Warehouse location management
- Pick sheet generation
- Azuga routing integration
- Real-time route tracking
- Customer ETA notifications

**Upcoming Features:**
- Barcode scanning
- Voice-activated picking
- AR warehouse navigation
- Advanced zone management
- Predictive inventory placement
