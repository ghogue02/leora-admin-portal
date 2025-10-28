# Warehouse Operations & Management System

## Overview

Complete warehouse management system for Leora2 including picking, routing, delivery tracking, and location management.

## Features

### 1. Warehouse Picking System

**Purpose:** Streamline warehouse picking with location-optimized pick sheets and barcode scanning.

**Components:**
- Pick sheet generation with automatic route optimization
- Barcode scanner integration (camera + manual input)
- Real-time pick status tracking
- Progress monitoring and completion workflow

**UI Location:** `/sales/operations/picking`

**API Endpoints:**
```
GET    /api/operations/picking          - List all pick sheets
POST   /api/operations/picking          - Create new pick sheet
GET    /api/operations/picking/:id      - Get pick sheet details
PATCH  /api/operations/picking/:id      - Update pick sheet
DELETE /api/operations/picking/:id      - Delete pick sheet
PATCH  /api/operations/picking/:id/items - Update item status
```

**Workflow:**
1. Select orders ready for picking
2. System generates optimized pick sheet (sorted by location)
3. Picker follows location sequence
4. Scan or manually mark items as picked
5. Complete pick sheet when all items picked
6. Orders automatically updated to "picked" status

**Location Optimization:**
- Items sorted by warehouse location (Aisle-Bay-Shelf)
- Minimizes travel distance through warehouse
- Groups items from same location together

### 2. Item Location Management

**Purpose:** Assign and manage warehouse locations for all SKUs.

**Location Format:** `Aisle-Bay-Shelf` (e.g., `A3-B2-S4`)
- **Aisle:** Letter + Number (A1, B2, C3)
- **Bay:** Letter (optional) + Number (B1, B2, 12)
- **Shelf:** Letter (optional) + Number (S1, S2, 3)

**UI Location:** `/sales/operations/locations`

**API Endpoints:**
```
GET    /api/operations/locations        - List all inventory locations
POST   /api/operations/locations        - Set/update location
POST   /api/operations/locations/bulk   - Bulk location updates
```

**Features:**
- Search by location, SKU, or product name
- Bulk upload via CSV
- Export current locations to CSV
- Visual location assignment
- Real-time inventory levels per location

**CSV Format (Bulk Upload/Export):**
```csv
SKU Code,Location,Aisle,Row,On Hand,Allocated,Product Name
SKU001,A3-B2-S4,A3,2,120,45,Product Name
```

### 3. Pick Sheet Generation

**Purpose:** Auto-generate optimized pick sheets for efficient warehouse operations.

**Optimization Algorithms:**
1. **Location-based:** Sort by warehouse location (default)
2. **Customer-based:** Group by customer for packing
3. **Route-based:** Organize by delivery route

**Features:**
- Automatic pick order calculation
- Location-optimized paths
- Customer grouping
- Print-friendly format
- PDF export capability

**Pick Sheet Includes:**
- Pick order sequence
- Product details
- Warehouse location
- Quantity to pick
- Customer information
- Available inventory

### 4. Routing Integration (Azuga Export)

**Purpose:** Export delivery routes in Azuga-compatible CSV format.

**UI Location:** `/sales/operations/routing`

**API Endpoints:**
```
GET    /api/operations/routes              - List all routes
POST   /api/operations/routes              - Create new route
GET    /api/operations/routes/:id          - Get route details
PATCH  /api/operations/routes/:id          - Update route
DELETE /api/operations/routes/:id          - Delete route
GET    /api/operations/routes/:id/azuga    - Export to Azuga CSV
PATCH  /api/operations/routes/:id/stops/:stopId - Update stop status
```

**Route Optimization:**
- Sorts stops by ZIP code (simple optimization)
- Calculates estimated arrival times
- Assigns stop numbers in optimal order
- Can be enhanced with:
  - Geocoding services (Google Maps, Mapbox)
  - Advanced routing algorithms (TSP solvers)
  - Traffic pattern consideration

**Azuga CSV Format:**
```csv
Stop #,Customer Name,Contact,Phone,Address,City,State,Zip,Products,Total Items,Estimated Arrival,Notes
1,ABC Corp,John Doe,555-0101,123 Main St,San Francisco,CA,94105,"Product A (2); Product B (3)",5,09:00 AM,Ring doorbell
```

**Features:**
- Create routes from orders
- Assign driver and truck
- Optimize stop sequence
- Export to CSV for Azuga import
- Track route execution
- Record export history

### 5. Delivery Tracking

**Purpose:** Real-time delivery status updates and customer communication.

**UI Location:** `/sales/operations/delivery-tracking`

**API Endpoints:**
```
GET    /api/operations/delivery-tracking   - Get delivery status
```

**Status Workflow:**
1. **Pending** - Stop not yet started
2. **In Progress** - Driver en route to this stop
3. **Completed/Delivered** - Delivery confirmed

**Features:**
- Real-time route progress
- Current stop tracking
- Estimated vs actual arrival times
- Customer notifications
- Direct driver contact
- Timeline visualization

**Tracking Information:**
- Route name and driver
- Current stop number
- Stops completed/remaining
- Estimated arrival time per stop
- Actual delivery time
- Customer contact information

### 6. Route Publishing & Notifications

**Purpose:** Keep customers informed about delivery status.

**API Endpoints:**
```
POST   /api/operations/notifications       - Send customer notifications
```

**Notification Types:**

**1. On The Way:**
```
Your delivery is on the way!
Estimated arrival: 2:30 PM
Driver: John Smith
```

**2. Stops Away:**
```
Your delivery is 3 stops away!
```

**3. Arrived:**
```
Your delivery driver has arrived!
```

**Implementation:**
- Creates portal notifications (visible in customer portal)
- Can be extended with:
  - SMS notifications (Twilio)
  - Email notifications (SendGrid)
  - Push notifications (Firebase)

**Customer Portal Integration:**
- Customers see delivery status in their portal
- Real-time updates
- Estimated delivery window
- Track driver progress
- Contact information

## Database Schema

### PickSheet
```typescript
{
  id: UUID
  tenantId: UUID
  sheetNumber: string         // PS-2024-001
  status: enum                // DRAFT, READY, PICKING, PICKED, CANCELLED
  pickerName: string
  createdById: UUID
  startedAt: timestamp
  completedAt: timestamp
  notes: string
  items: PickSheetItem[]
}
```

### PickSheetItem
```typescript
{
  id: UUID
  tenantId: UUID
  pickSheetId: UUID
  orderLineId: UUID
  skuId: UUID
  customerId: UUID
  quantity: number
  pickOrder: number           // Optimized sequence
  isPicked: boolean
  pickedAt: timestamp
}
```

### DeliveryRoute
```typescript
{
  id: UUID
  tenantId: UUID
  routeDate: date
  routeName: string
  driverName: string
  truckNumber: string
  startTime: timestamp
  estimatedEndTime: timestamp
  stops: RouteStop[]
}
```

### RouteStop
```typescript
{
  id: UUID
  tenantId: UUID
  routeId: UUID
  orderId: UUID
  stopNumber: number
  estimatedArrival: timestamp
  actualArrival: timestamp
  status: string              // pending, in_progress, completed
  notes: string
}
```

### Inventory (Location Tracking)
```typescript
{
  id: UUID
  tenantId: UUID
  skuId: UUID
  location: string            // A3-B2-S4
  aisle: string               // A3
  row: number                 // 2
  onHand: number
  allocated: number
}
```

## Usage Workflows

### Workflow 1: Complete Picking Process

1. **Generate Pick Sheet**
   - Navigate to `/sales/operations/picking`
   - Click "New Pick Sheet"
   - Select orders to include
   - Choose picker name
   - System optimizes by location
   - Pick sheet created

2. **Pick Items**
   - Open pick sheet
   - Follow location order
   - Scan or manually check items
   - System tracks progress
   - Complete when all picked

3. **Update Order Status**
   - Orders automatically marked as picked
   - Ready for packing/shipping

### Workflow 2: Route Creation & Delivery

1. **Create Route**
   - Navigate to `/sales/operations/routing`
   - Click "Create Route"
   - Select picked orders
   - Assign driver and truck
   - System optimizes stops
   - Route created

2. **Export to Azuga**
   - Open route
   - Click "Export to Azuga"
   - CSV downloads
   - Import to Azuga system

3. **Track Delivery**
   - Navigate to `/sales/operations/delivery-tracking`
   - View real-time progress
   - Update stop status
   - Notify customers
   - Mark stops as completed

### Workflow 3: Location Management

1. **Assign Locations**
   - Navigate to `/sales/operations/locations`
   - Search for SKU
   - Click "Edit"
   - Enter location (A3-B2-S4)
   - Save

2. **Bulk Update**
   - Prepare CSV file
   - Click "Bulk Upload"
   - Select CSV
   - System validates and imports
   - Locations updated

3. **Export for Review**
   - Click "Export CSV"
   - Review current locations
   - Make corrections
   - Re-import if needed

## Integration Points

### Order Management
- Pick sheets pull from orders
- Orders update when picked
- Delivery status syncs to orders
- Customer notifications triggered

### Inventory System
- Location data from Inventory table
- Real-time availability checking
- Allocation tracking
- Stock level warnings

### Customer Portal
- Customers see delivery status
- Estimated arrival times
- Notification history
- Order tracking

## Performance Optimizations

### Pick Sheet Generation
- Location-based sorting: O(n log n)
- Batch database queries
- Indexes on location, tenantId

### Route Optimization
- Current: ZIP code sort (fast, simple)
- Future: TSP algorithms (slower, optimal)
- Consider traffic patterns
- Historical route data

### Real-time Updates
- WebSocket connections for live tracking
- Polling fallback for compatibility
- Optimistic UI updates
- Background sync

## Testing

### Unit Tests
- Pick sheet generation logic
- Location parsing/validation
- Route optimization algorithms
- Notification formatting

### Integration Tests
- API endpoint testing
- Database transactions
- Multi-tenant isolation
- Permission checking

### E2E Tests
- Complete picking workflow
- Route creation and export
- Delivery tracking updates
- Customer notifications

## Future Enhancements

### Phase 1: Advanced Features
- [ ] Mobile app for pickers (React Native)
- [ ] Voice-activated picking
- [ ] RFID tag integration
- [ ] Advanced barcode scanning (QR codes)
- [ ] Photo verification of deliveries

### Phase 2: AI & Optimization
- [ ] ML-based route optimization
- [ ] Predictive inventory allocation
- [ ] Demand forecasting
- [ ] Pick time estimation
- [ ] Driver performance analytics

### Phase 3: Integration
- [ ] WMS (Warehouse Management System) integration
- [ ] ERP system connectors
- [ ] Real-time GPS tracking
- [ ] Traffic API integration (Google, Waze)
- [ ] SMS notifications (Twilio)
- [ ] Email campaigns (SendGrid)

### Phase 4: Analytics
- [ ] Picker performance dashboards
- [ ] Route efficiency metrics
- [ ] Delivery time analysis
- [ ] Customer satisfaction scores
- [ ] Warehouse heatmaps

## Troubleshooting

### Common Issues

**Issue: Pick sheet items not sorted correctly**
- Check inventory locations are assigned
- Verify location format (A1-B2-S3)
- Ensure location field is populated

**Issue: Azuga CSV not importing**
- Verify CSV format matches Azuga requirements
- Check for special characters in addresses
- Ensure phone numbers are formatted correctly

**Issue: Barcode scanner not working**
- Grant camera permissions in browser
- Try manual input mode
- Check barcode format compatibility
- Ensure good lighting conditions

**Issue: Notifications not sending**
- Verify customer email/phone in system
- Check API credentials (Twilio, SendGrid)
- Review notification settings
- Check portal notification creation

## Security Considerations

- Multi-tenant data isolation (all queries filtered by tenantId)
- Role-based access control (picking, routing, admin)
- Audit logging for all operations
- API rate limiting
- Input validation on all endpoints
- SQL injection prevention (Prisma ORM)

## Support

For issues or questions:
- Check this documentation
- Review API endpoint documentation
- Contact system administrator
- Submit bug report with details

---

**Last Updated:** 2024-10-26
**Version:** 1.0.0
**Author:** Leora2 Development Team
