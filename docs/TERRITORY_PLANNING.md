# Territory Planning & Management System

## Overview

Comprehensive territory management system for organizing sales regions, assigning customers, and tracking performance.

## Features

### 1. Territory Management (`/sales/territories`)

**Main Features:**
- Visual territory management with interactive maps
- List and map view modes
- Create, edit, and delete territories
- Real-time customer assignment
- Performance metrics tracking
- Territory optimization tools

**Territory Data:**
- Territory name
- Assigned sales rep
- Boundary polygon (GeoJSON)
- Color coding
- Customer count (total and active)
- Revenue metrics (30/90/365 days)
- Last activity date

### 2. Polygon Drawing Tools

**BoundaryDrawer Component:**
- Interactive map-based polygon drawing
- Click to add boundary points
- Edit vertices by dragging
- Delete vertices
- Undo last point
- Clear all points
- Real-time customer count preview

**Uses @turf/turf for:**
- Point-in-polygon detection
- Customer boundary validation
- Territory overlap detection

### 3. Customer Assignment

**Automatic Assignment:**
- Finds all customers within polygon boundary
- Uses point-in-polygon algorithm
- Batch assignment to territory
- Conflict detection (customers in multiple territories)

**Manual Assignment:**
- Reassign customers between territories
- Bulk assignment operations
- Assignment history tracking

### 4. Territory Analytics (`/sales/territories/analytics`)

**Performance Metrics:**
- Total customers per territory
- Revenue comparison (30/90/365 days)
- Growth rate tracking
- Average order value
- Coverage percentage
- Territory balance analysis

**Visualizations:**
- Performance comparison table
- Sortable by revenue, growth, coverage
- Territory recommendations
- Balance optimization suggestions

### 5. Mobile Territory View (`/sales/territories/mobile`)

**Sales Rep Features:**
- View assigned territory on map
- List all customers in territory
- Filter by status (Active/Prospect/All)
- Map and list view modes
- Call customer directly (tel: link)
- Navigate to customer (Google Maps integration)
- Quick access to customer details

**Bottom Navigation:**
- Link to Call Plan (CARLA)
- Link to Customers list
- Link to Dashboard

### 6. CARLA Integration

**Territory Filter in Call Planning:**
- Filter customers by territory
- Multi-territory selection
- Integration with route optimization
- Territory-based call planning

**File:** `/sales/call-plan/carla/components/TerritoryFilter.tsx`

## API Routes

### Territory CRUD
```
GET    /api/sales/territories          - List all territories
POST   /api/sales/territories          - Create territory
GET    /api/sales/territories/[id]     - Get single territory
PUT    /api/sales/territories/[id]     - Update territory
DELETE /api/sales/territories/[id]     - Delete (soft) territory
```

### Customer Assignment
```
POST   /api/sales/territories/[id]/assign
       Body: { customerIds: string[], overwriteExisting: boolean }
```

### Analytics
```
GET    /api/sales/territories/analytics - Performance metrics
```

### Mobile
```
GET    /api/sales/territories/my-territory - Current user's territory
```

## Database Schema

### Territory Table
```prisma
model Territory {
  id          String   @id @default(uuid())
  name        String   @unique
  salesRepId  String?
  salesRep    User?    @relation(fields: [salesRepId], references: [id])
  boundary    String   // JSON array of {lat, lng} points
  color       String   @default("#3B82F6")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Customer Table (Updated)
```prisma
model Customer {
  // ... existing fields
  territory   String?  // Territory name
  latitude    Float?   // For point-in-polygon
  longitude   Float?   // For point-in-polygon
}
```

## Usage Workflows

### 1. Create New Territory

1. Click "Create Territory" button
2. Enter territory name
3. Select sales rep (optional)
4. Choose color
5. Click "Start Drawing" on map
6. Click map to add boundary points (min 3)
7. System shows customer count preview
8. Switch to "Assign Customers" tab
9. Review customers found in boundary
10. Click "Auto-assign" to assign customers
11. Save territory

### 2. Edit Existing Territory

1. Select territory from list or map
2. Click "Edit" button
3. Modify name, sales rep, or color
4. Adjust boundary by dragging vertices
5. Delete vertices by clicking them
6. Reassign customers if needed
7. Save changes

### 3. View Territory Performance

1. Navigate to `/sales/territories/analytics`
2. View summary stats (total customers, revenue, growth, coverage)
3. Sort territories by metric
4. Review performance comparison table
5. Read optimization recommendations

### 4. Mobile Territory Access (Sales Rep)

1. Navigate to `/sales/territories/mobile`
2. View "My Territory" map
3. Toggle between map and list view
4. Filter customers (All/Active/Prospect)
5. Click "Call" to phone customer
6. Click "Navigate" to get directions
7. Click "View" to see customer details

### 5. CARLA Integration

1. Open CARLA call planning
2. Use territory filter to select territories
3. View only customers in selected territories
4. Plan routes within territory boundaries
5. Track territory coverage

## Technical Details

### Map Libraries
- **Leaflet**: Interactive maps
- **React-Leaflet**: React bindings
- **@turf/turf**: Geospatial calculations
- **@turf/boolean-point-in-polygon**: Customer assignment

### Polygon Format
```typescript
type Boundary = Array<{ lat: number; lng: number }>;

// Example:
const boundary = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.7849, lng: -122.4094 },
  { lat: 37.7649, lng: -122.4094 },
];
```

### Customer Assignment Algorithm
```typescript
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

// Create polygon
const polygonCoords = boundary.map(p => [p.lng, p.lat]);
polygonCoords.push(polygonCoords[0]); // Close polygon
const turfPolygon = polygon([polygonCoords]);

// Check if customer is inside
const customerPoint = point([customer.longitude, customer.latitude]);
const isInside = booleanPointInPolygon(customerPoint, turfPolygon);
```

### Performance Metrics
```sql
-- Territory performance query
SELECT
  t.name,
  COUNT(c.id) as customerCount,
  SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '30 days'
      THEN o.totalAmount ELSE 0 END) as revenue30Days,
  AVG(o.totalAmount) as avgOrderValue,
  (COUNT(CASE WHEN c.status = 'ACTIVE' THEN 1 END)::float /
   COUNT(c.id)::float * 100) as coverage
FROM Territory t
LEFT JOIN Customer c ON c.territory = t.name
LEFT JOIN Order o ON o.customerId = c.id
GROUP BY t.id, t.name
```

## Territory Optimization

### Balance Territories
- Split high-customer territories (>80% max)
- Merge small territories (<20 customers)
- Distribute customers evenly
- Balance by revenue potential

### Coverage Analysis
- Track customer contact rate
- Identify underserved areas
- Recommend additional sales reps
- Optimize territory boundaries

### Growth Opportunities
- Identify high-growth territories
- Analyze revenue trends
- Recommend resource allocation
- Track territory performance over time

## Mobile Optimization

### Touch-Friendly UI
- Large tap targets (44px minimum)
- Bottom navigation for thumb access
- Swipe gestures support
- Responsive map controls

### Performance
- Lazy load map components
- Client-side rendering only
- Efficient boundary calculations
- Optimized for 4,838 customers

### Offline Considerations
- Cache territory boundaries
- Store customer list locally
- Sync when online
- Handle connection failures gracefully

## Next Steps

1. **Territory Templates**: Pre-defined territory shapes
2. **Bulk Import**: Import territories from CSV/shapefile
3. **Advanced Analytics**: Heatmaps, trend analysis
4. **Route Integration**: Optimize routes within territories
5. **Historical Tracking**: Territory changes over time
6. **Performance Goals**: Set and track territory targets
7. **Automated Suggestions**: ML-based territory optimization

## Troubleshooting

### Issue: Customer count is 0
- Ensure customers have latitude/longitude
- Check boundary polygon is valid (min 3 points)
- Verify coordinates are in correct format

### Issue: Map not loading
- Check Leaflet CSS is imported
- Verify dynamic import for SSR
- Check browser console for errors

### Issue: Assignment fails
- Verify territory exists
- Check customer IDs are valid
- Review overwriteExisting flag
- Check database permissions

## Support

For issues or questions:
- Check `/docs/TERRITORY_PLANNING.md`
- Review API route documentation
- Test with sample data
- Contact development team
