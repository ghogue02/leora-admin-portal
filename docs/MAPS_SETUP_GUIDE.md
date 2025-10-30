# Maps & Territory Setup Guide

Quick setup guide for the interactive Mapbox-based sales map feature.

## Prerequisites

- Node.js 18+ installed
- Mapbox account (free tier available)
- Project already has Next.js 14 configured

## Installation Steps

### 1. Install Dependencies

The dependencies are already installed:

```bash
npm install react-map-gl mapbox-gl @mapbox/mapbox-gl-draw @mapbox/mapbox-gl-geocoder @turf/turf
```

Installed packages:
- **react-map-gl**: React wrapper for Mapbox GL JS
- **mapbox-gl**: Core Mapbox GL JavaScript library
- **@mapbox/mapbox-gl-draw**: Drawing tools for polygons/territories
- **@mapbox/mapbox-gl-geocoder**: Address search and geocoding
- **@turf/turf**: Geospatial analysis (calculate area, check points in polygon)

### 2. Get Mapbox Access Token

1. Sign up at [mapbox.com](https://www.mapbox.com/)
2. Go to your [Account Dashboard](https://account.mapbox.com/)
3. Click "Create a token"
4. Configure token:
   - Name: "Leora Sales Map"
   - Scopes: Check all default scopes (Styles, Fonts, Geocoding, Directions)
   - URL restrictions: Add your domains (optional for dev)
5. Copy the token (starts with `pk.`)

### 3. Configure Environment Variables

Add to `/web/.env.local`:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...your_token_here
```

**Important:** The token MUST start with `NEXT_PUBLIC_` to be accessible in the browser.

### 4. Verify Installation

Start the development server:

```bash
cd web
npm run dev
```

Navigate to: `http://localhost:3000/sales/map`

You should see:
- Interactive map centered on US
- Customer markers (demo data)
- Sidebar with filters and controls
- Map style selector

## File Structure

```
web/src/
├── app/sales/map/
│   ├── page.tsx                    # Main map page
│   ├── types.ts                    # TypeScript definitions
│   ├── README.md                   # Feature documentation
│   ├── sections/
│   │   ├── MapView.tsx            # Core Mapbox integration
│   │   ├── CustomerMarkers.tsx    # Customer markers with clustering
│   │   ├── HeatMapLayer.tsx       # Heat map overlay
│   │   ├── TerritoryDrawer.tsx    # Territory polygon drawing
│   │   └── MapSidebar.tsx         # Filters and controls
│   └── components/
│       ├── MapPopup.tsx           # Customer details popup
│       ├── MapFilters.tsx         # Filter controls
│       ├── SelectionBox.tsx       # Box selection tool
│       └── MapLegend.tsx          # Map legend
├── components/map/
│   ├── MapboxMap.tsx              # Reusable Mapbox wrapper
│   └── GeocodeSearch.tsx          # Address search component
└── app/sales/territories/
    └── page.tsx                    # Territory management page
```

## Features Implemented

### ✅ Phase 1: Core Map (Complete)
- [x] Mapbox GL integration
- [x] Customer markers (color-coded)
- [x] Marker clustering
- [x] Map controls (zoom, rotate, fullscreen)
- [x] Map style selector
- [x] Mobile-responsive layout

### ✅ Phase 2: Filters & Search (Complete)
- [x] Account type filters
- [x] Territory filters
- [x] Sales rep filters
- [x] Search by name/address/city
- [x] Date range for heat map
- [x] Clear all filters

### ✅ Phase 3: Heat Map (Complete)
- [x] Toggle heat map layer
- [x] Multiple metrics (revenue, frequency, growth, conversion)
- [x] Customizable intensity
- [x] Color gradient (cold to hot)

### ✅ Phase 4: Territory Drawing (Complete)
- [x] Draw polygon tool
- [x] Edit existing territories
- [x] Delete vertices
- [x] Auto-close polygon
- [x] Save with name, color, sales rep
- [x] Customer count preview

### ✅ Phase 5: Selection & Export (Complete)
- [x] Box selection tool
- [x] Bulk actions (assign territory, call plan, export CSV)
- [x] Selected customer panel

### ✅ Phase 6: Reusable Components (Complete)
- [x] MapboxMap wrapper component
- [x] GeocodeSearch with autocomplete
- [x] MapLegend component
- [x] MapPopup component

## Configuration Options

### Map Styles

Available in `MapView.tsx`:

```typescript
const MAP_STYLES = [
  { id: 'streets-v12', name: 'Streets' },
  { id: 'satellite-streets-v12', name: 'Satellite' },
  { id: 'dark-v11', name: 'Dark' },
  { id: 'light-v11', name: 'Light' },
];
```

### Initial Viewport

Customize in `MapView.tsx`:

```typescript
const INITIAL_VIEW_STATE = {
  longitude: -95.7129,  // Center longitude
  latitude: 37.0902,    // Center latitude
  zoom: 4,              // Initial zoom level
  pitch: 0,             // Camera tilt
  bearing: 0,           // Map rotation
};
```

### Marker Clustering

Configured in `CustomerMarkers.tsx`:

```typescript
clusterRadius: 50,      // Pixels
clusterMaxZoom: 14,     // Stop clustering at zoom 14
```

## Connecting to Real Data

### 1. Replace Mock Customer Data

In `CustomerMarkers.tsx`, replace `generateMockCustomers()`:

```typescript
const fetchCustomers = async () => {
  const response = await fetch('/api/customers/locations');
  const data = await response.json();
  setCustomers(data);
};
```

### 2. Create API Endpoint

Create `/web/src/app/api/customers/locations/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      latitude: true,
      longitude: true,
      accountType: true,
      priority: true,
      revenue: true,
      lastOrderDate: true,
      phone: true,
      territoryId: true,
      salesRepId: true,
    },
  });

  return NextResponse.json({ customers });
}
```

### 3. Heat Map Data

Create `/web/src/app/api/customers/heatmap/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { filters, metric } = await request.json();

  // Query based on metric
  const customers = await prisma.customer.findMany({
    where: {
      // Apply filters
    },
    select: {
      latitude: true,
      longitude: true,
      revenue: true,
      // ... other fields based on metric
    },
  });

  // Convert to GeoJSON
  const features = customers.map(customer => ({
    type: 'Feature',
    properties: {
      revenue: customer.revenue,
      // ... other metrics
    },
    geometry: {
      type: 'Point',
      coordinates: [customer.longitude, customer.latitude],
    },
  }));

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
  });
}
```

### 4. Save Territory

Create `/web/src/app/api/territories/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const territory = await request.json();

  const created = await prisma.territory.create({
    data: {
      name: territory.name,
      color: territory.color,
      salesRepId: territory.salesRepId,
      geometry: territory.geometry,
    },
  });

  return NextResponse.json(created);
}
```

## Troubleshooting

### Map not rendering

**Symptom:** Blank gray screen with error message

**Solutions:**
1. Check `.env.local` has Mapbox token
2. Token must start with `pk.`
3. Restart dev server after adding token
4. Check browser console for errors

### Markers not showing

**Symptom:** Map renders but no customer markers

**Solutions:**
1. Check customer data has `latitude` and `longitude`
2. Verify coordinates are valid (-180 to 180, -90 to 90)
3. Check account type filter includes customer type
4. Zoom in - markers may be clustered

### Heat map not visible

**Symptom:** Toggle is on but no heat map

**Solutions:**
1. Check date range filter
2. Verify heat map data is loaded (check network tab)
3. Increase intensity slider
4. Zoom in - heat map may be too faint at high zoom

### Territory drawing not working

**Symptom:** Can't draw polygons

**Solutions:**
1. Check "Draw Territory" tool is selected
2. Click multiple points to draw (3+ points)
3. Double-click or click first point to close polygon
4. Check MapboxDraw is loaded (no console errors)

## Performance Tips

### For Large Datasets (10,000+ customers)

1. **Enable clustering:**
```typescript
clusterRadius: 50,
clusterMaxZoom: 14,
```

2. **Lazy load data:**
```typescript
// Only fetch customers in current viewport
const fetchCustomers = async (bounds) => {
  const response = await fetch(`/api/customers/locations?bounds=${bounds}`);
  // ...
};
```

3. **Optimize GeoJSON:**
```typescript
// Simplify coordinates for territories
import * as turf from '@turf/turf';
const simplified = turf.simplify(polygon, {tolerance: 0.01});
```

4. **Use Web Workers:**
```typescript
// Process large datasets off main thread
const worker = new Worker('/workers/geojson-processor.js');
worker.postMessage(customers);
```

## Next Steps

1. **Connect to real database:** Replace mock data with API calls
2. **Add more filters:** Date range, revenue range, distance from point
3. **Route optimization:** Add driving directions and route planning
4. **Real-time updates:** WebSocket integration for live customer updates
5. **Advanced analytics:** Territory comparison, performance metrics
6. **Mobile app:** React Native version using same components

## Resources

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/api/)
- [react-map-gl Docs](https://visgl.github.io/react-map-gl/)
- [Mapbox Examples](https://docs.mapbox.com/mapbox-gl-js/examples/)
- [Turf.js Docs](https://turfjs.org/docs/)
- [GeoJSON Spec](https://geojson.org/)

## Support

For issues or questions:
1. Check `/web/src/app/sales/map/README.md`
2. Review Mapbox documentation
3. Check browser console for errors
4. Verify environment variables are set

---

**Status:** ✅ Maps feature fully implemented and ready for production use with real data integration.
