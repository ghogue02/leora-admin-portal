# Maps & Territory Management System Documentation

## Overview

The Maps & Territory Management System provides comprehensive geographic visualization and territory planning capabilities for the Leora2 sales platform. Built with Mapbox GL and integrated with the customer database, it enables sales teams to visualize customer distribution, optimize routes, and manage territories effectively.

## Features

### 1. **Interactive Map Visualization** ✅
- Mapbox GL-based interactive map
- Customer markers color-coded by account type:
  - **Green**: Active accounts
  - **Yellow**: Target accounts
  - **Gray**: Prospects
- Marker size based on revenue (larger = higher revenue)
- Real-time filtering by territories, sales reps, and account types
- Multiple map styles (Streets, Satellite, Dark, Light)

### 2. **Heat Map Layer** ✅
- Revenue density visualization
- Multiple metric options:
  - Revenue (total sales)
  - Frequency (order count)
  - Growth (revenue trends)
  - Conversion rate
- Dynamic intensity based on zoom level
- Color-coded from cold (blue) to hot (red)

### 3. **"Who's Closest" Feature** ✅
- Geolocation-based proximity search
- Find customers within configurable radius (5, 10, 25, 50, 100 miles)
- Distance and driving time calculations
- Sort by proximity
- Bulk selection for call plans
- One-click "Show on Map" visualization

### 4. **Route Optimization** ✅
- Advanced route planning using 2-opt algorithm
- Automatic route optimization for multiple customer visits
- Turn-by-turn directions
- Total distance and time estimates
- Export options:
  - JSON format for archiving
  - Google Maps integration (one-click open)
- Efficiency scoring (0-100)

### 5. **Geocoding System** ✅
- Automatic address-to-coordinates conversion
- Mapbox Geocoding API integration
- Rate-limited batch processing (600 requests/minute)
- Caching to prevent duplicate API calls
- Command-line tool for bulk geocoding

## Architecture

### Database Schema

The system uses the existing `Customer` table with geocoding fields:

```prisma
model Customer {
  // ... other fields
  latitude      Float?
  longitude     Float?
  geocodedAt    DateTime?
}
```

### API Endpoints

#### `GET /api/maps/customers`
Fetch customers with location data for map display.

**Query Parameters:**
- `tenantId` (required)
- `territories[]` (optional, array)
- `accountTypes[]` (optional, array)
- `salesReps[]` (optional, array)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Customer Name",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "revenue": 125000,
    "accountType": "ACTIVE",
    "priority": "HIGH"
  }
]
```

#### `POST /api/maps/heatmap`
Generate heat map data based on selected metrics.

**Request:**
```json
{
  "tenantId": "uuid",
  "filters": {
    "territories": ["territory-1"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  },
  "metric": "revenue"
}
```

**Response:** GeoJSON FeatureCollection

#### `POST /api/maps/closest`
Find customers near a specific location.

**Request:**
```json
{
  "tenantId": "uuid",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radiusMiles": 25,
  "limit": 50
}
```

**Response:**
```json
{
  "origin": { "latitude": 37.7749, "longitude": -122.4194 },
  "radiusMiles": 25,
  "total": 42,
  "customers": [
    {
      "id": "uuid",
      "name": "Customer Name",
      "distance": 2.3,
      "drivingTime": 8,
      "revenue": 50000
    }
  ]
}
```

#### `POST /api/maps/optimize-route`
Optimize visiting order for multiple customers.

**Request:**
```json
{
  "tenantId": "uuid",
  "startLatitude": 37.7749,
  "startLongitude": -122.4194,
  "customerIds": ["uuid1", "uuid2", "uuid3"],
  "algorithm": "2-opt"
}
```

**Response:**
```json
{
  "optimizedRoute": {
    "stops": [...],
    "totalDistance": 45.2,
    "totalDuration": 180,
    "directions": [...]
  }
}
```

## Utilities

### Distance Calculations (`/src/lib/distance.ts`)

```typescript
import { calculateDistance, estimateDrivingTime } from '@/lib/distance';

// Calculate distance between two points (in miles)
const distance = calculateDistance(
  { latitude: 37.7749, longitude: -122.4194 },
  { latitude: 37.3382, longitude: -121.8863 }
); // Returns: 34.2 miles

// Estimate driving time
const drivingTime = estimateDrivingTime(34.2); // Returns: 59 minutes
```

### Geocoding (`/src/lib/geocoding.ts`)

```typescript
import { geocodeAddress, geocodeCustomer } from '@/lib/geocoding';

// Geocode a single address
const result = await geocodeAddress({
  street1: '1600 Amphitheatre Parkway',
  city: 'Mountain View',
  state: 'CA',
  postalCode: '94043',
});
// Returns: { latitude: 37.4224, longitude: -122.0856 }

// Geocode a customer by ID
await geocodeCustomer('customer-uuid');
```

### Route Optimization (`/src/lib/route-optimizer.ts`)

```typescript
import { optimizeRoute2Opt } from '@/lib/route-optimizer';

const optimizedRoute = optimizeRoute2Opt(
  { latitude: 37.7749, longitude: -122.4194 }, // Start
  [
    { id: '1', name: 'Customer A', latitude: 37.8, longitude: -122.3 },
    { id: '2', name: 'Customer B', latitude: 37.7, longitude: -122.5 },
    // ... more stops
  ]
);
```

## Setup & Configuration

### 1. Environment Variables

Add to `.env.local`:

```bash
# Mapbox Access Token (Required)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_public_token_here
MAPBOX_SECRET_TOKEN=sk.your_secret_token_here  # For geocoding API

# Tenant Configuration
NEXT_PUBLIC_TENANT_ID=your-tenant-uuid
```

### 2. Get Mapbox Token

1. Sign up at [mapbox.com](https://www.mapbox.com/)
2. Go to Account → Tokens
3. Create a new token with scopes:
   - `styles:read`
   - `fonts:read`
   - `geocoding:read` (for secret token)
4. Copy both public and secret tokens

### 3. Geocode Existing Customers

Run the geocoding script to add coordinates to customers:

```bash
# Geocode all customers for a tenant
npm run geocode:customers -- --tenant-id=<uuid>

# Dry run (see what would be geocoded)
npm run geocode:customers -- --tenant-id=<uuid> --dry-run

# Geocode for all tenants
npm run geocode:customers -- --all

# Custom batch size
npm run geocode:customers -- --tenant-id=<uuid> --batch-size=100
```

**Note:** Mapbox free tier includes 100,000 geocoding requests/month.

## Usage Guide

### Basic Map Navigation

1. Navigate to `/sales/map`
2. Use sidebar to toggle layers:
   - Customer Markers
   - Heat Map
   - Territories
3. Filter by:
   - Account Type
   - Territory
   - Sales Rep
   - Date Range
4. Change map style (Streets, Satellite, Dark, Light)

### Finding Nearby Customers

1. Click **"Closest"** tab in sidebar
2. Click **"Use My Location"** or enter coordinates manually
3. Select search radius (5-100 miles)
4. Click **"Find Nearby Customers"**
5. Results show distance, driving time, and revenue
6. Select customers and:
   - **Show on Map** - Highlight selected customers
   - **Add to Call Plan** - Create visit schedule

### Route Planning

1. Select customers on map (use Box Selection tool or from "Closest" results)
2. Click **"Route"** tab in sidebar
3. Set starting location (use current location or manual entry)
4. Click **"Optimize Route"**
5. Review:
   - Optimized stop order
   - Total distance
   - Total time
   - Turn-by-turn directions
6. Export:
   - Download JSON
   - Open in Google Maps

### Heat Map Analysis

1. Toggle **"Heat Map"** layer on
2. Heat map shows revenue density by default
3. Zoom in/out to see different detail levels
4. Color coding:
   - **Blue**: Low revenue density
   - **Yellow/Orange**: Medium revenue
   - **Red**: High revenue concentration

## Performance Considerations

### API Rate Limits

**Mapbox Geocoding:**
- Free tier: 100,000 requests/month
- Rate limit: 600 requests/minute
- The geocoding script includes automatic rate limiting

**Best Practices:**
1. Run geocoding during off-peak hours
2. Use batch geocoding script for bulk operations
3. Cache geocoding results (built-in)
4. Monitor Mapbox usage dashboard

### Optimization Tips

1. **Large Customer Datasets:**
   - Enable clustering for 1000+ markers
   - Use filters to reduce visible markers
   - Load heat map instead of individual markers

2. **Route Optimization:**
   - Limit to 50 stops per route for best performance
   - Use 2-opt for routes with 2-20 stops
   - Consider nearest-neighbor for 20+ stops (faster but less optimal)

3. **Mobile Performance:**
   - Disable heat map on mobile devices
   - Reduce marker detail levels on zoom out
   - Use simplified map styles

## Future Enhancements

### Planned Features

1. **Territory Boundaries Visualization** (Pending)
   - Draw and save custom territories
   - Territory performance overlays
   - Auto-assignment based on boundaries

2. **Map Export** (Pending)
   - Export map as PNG/PDF
   - Include selected filters and legends
   - Scheduled report generation

3. **Advanced Analytics** (Pending)
   - Territory performance comparison
   - Coverage gap analysis
   - Predictive route planning

4. **Integration Features** (Future)
   - Calendar integration for route scheduling
   - Real-time traffic data
   - Weather overlays
   - CRM sync for real-time updates

## Troubleshooting

### Common Issues

**Issue:** Map not loading
- **Check:** Mapbox token in `.env.local`
- **Verify:** Token has correct scopes
- **Try:** Clear browser cache and reload

**Issue:** No customers showing on map
- **Check:** Customers have been geocoded
- **Run:** `npm run geocode:customers -- --tenant-id=<uuid>`
- **Verify:** Database has latitude/longitude values

**Issue:** Geocoding fails
- **Check:** Mapbox secret token is set
- **Verify:** Customer addresses are valid
- **Try:** Test with a single customer first

**Issue:** Route optimization slow
- **Reduce:** Number of stops (try < 20)
- **Check:** All customers have valid coordinates
- **Try:** Nearest-neighbor algorithm instead of 2-opt

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('DEBUG_MAPS', 'true');
```

## API Reference

See full API documentation in `/docs/api/maps.md`

## Contributing

When adding map features:

1. Add API endpoint in `/src/app/api/maps/`
2. Create utility functions in `/src/lib/`
3. Add UI components in `/src/app/sales/map/components/`
4. Update documentation
5. Add tests for critical paths

## Support

For issues or questions:
- Create issue in GitHub repository
- Check existing documentation
- Review Mapbox documentation: https://docs.mapbox.com/

---

**Version:** 1.0.0
**Last Updated:** 2025-10-26
**Status:** Production Ready (Core Features), Enhancements Pending
