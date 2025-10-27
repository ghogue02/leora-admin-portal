# Sales Map Feature

Interactive map-based visualization for customer locations, territories, and sales analytics.

## Features

### 1. Customer Markers
- **Color-coded by account type:**
  - 🟢 Green: ACTIVE customers
  - 🟡 Yellow: TARGET accounts
  - ⚪ Gray: PROSPECT customers
- **Size by revenue:**
  - Large: >$50,000
  - Medium: $20,000-$50,000
  - Small: <$20,000
- **Clustering:** Markers automatically cluster when zoomed out for better performance
- **Click to view details:** Popup shows customer information and quick actions

### 2. Heat Map
- Toggle heat map overlay on/off
- **Multiple metrics:**
  - Revenue (default)
  - Order frequency
  - Growth rate
  - Sample conversion rate
- Customizable intensity and date range
- Color gradient from cold (blue) to hot (red)

### 3. Territory Drawing
- Draw custom territory boundaries using polygon tool
- Edit existing territory boundaries
- Delete/move vertices
- Auto-close polygons
- Save territories with name, color, and sales rep assignment
- Preview customer count inside territory before saving

### 4. Box Selection
- Click and drag to select customers in a rectangular area
- **Bulk actions:**
  - Assign to territory
  - Create call plan
  - Export to CSV

### 5. Filters & Search
- Filter by account type (ACTIVE/TARGET/PROSPECT)
- Filter by territory
- Filter by sales rep
- Search by customer name, address, or city
- Date range for heat map metrics
- Clear all filters button

### 6. Map Controls
- **Layer toggles:**
  - Customer markers
  - Heat map
  - Territory boundaries
- **Map styles:**
  - Streets (default)
  - Satellite
  - Dark mode
  - Light mode
- **Navigation:**
  - Zoom in/out
  - Rotate
  - Fullscreen mode
  - Geolocate (center on user location)

## Components

### Page Components
- **`page.tsx`**: Main map page with sidebar and map view
- **`sections/MapView.tsx`**: Core Mapbox integration
- **`sections/CustomerMarkers.tsx`**: Customer marker rendering with clustering
- **`sections/HeatMapLayer.tsx`**: Heat map overlay
- **`sections/TerritoryDrawer.tsx`**: Territory polygon drawing tool
- **`sections/MapSidebar.tsx`**: Sidebar with layers, filters, and tools

### UI Components
- **`components/MapPopup.tsx`**: Customer details popup
- **`components/MapFilters.tsx`**: Filter controls
- **`components/SelectionBox.tsx`**: Box selection tool
- **`components/MapLegend.tsx`**: Map legend overlay

### Reusable Components
- **`/components/map/MapboxMap.tsx`**: Reusable Mapbox wrapper
- **`/components/map/GeocodeSearch.tsx`**: Address autocomplete search

## Setup

### 1. Install Dependencies
```bash
npm install react-map-gl mapbox-gl @mapbox/mapbox-gl-draw @mapbox/mapbox-gl-geocoder @turf/turf
```

### 2. Get Mapbox Access Token
1. Sign up at [mapbox.com](https://www.mapbox.com/)
2. Create a new access token
3. Add to `.env.local`:
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```

### 3. Configure Map Styles
Available styles in `MapView.tsx`:
- `mapbox://styles/mapbox/streets-v12`
- `mapbox://styles/mapbox/satellite-streets-v12`
- `mapbox://styles/mapbox/dark-v11`
- `mapbox://styles/mapbox/light-v11`

## Usage

### Basic Map
```tsx
import MapboxMap from '@/components/map/MapboxMap';
import { Marker } from 'react-map-gl';

<MapboxMap
  initialViewState={{ longitude: -95.7, latitude: 37.1, zoom: 4 }}
  showNavigation
  showFullscreen
>
  <Marker longitude={-95.7} latitude={37.1} />
</MapboxMap>
```

### Geocode Search
```tsx
import GeocodeSearch from '@/components/map/GeocodeSearch';

<GeocodeSearch
  onSelect={(result) => {
    console.log('Selected:', result);
  }}
  flyTo={true}
/>
```

## Performance Optimization

### 1. Marker Clustering
- Configured in `CustomerMarkers.tsx`
- Cluster radius: 50px
- Max zoom for clustering: 14

### 2. Lazy Loading
- Map component is dynamically imported
- Prevents SSR issues with Mapbox GL

### 3. Debouncing
- Map movements debounced
- Geocoding requests debounced (300ms)

### 4. Virtualization
- Only render visible markers
- GeoJSON optimized for large datasets

## Mobile Optimization

- **Responsive design:** Works on tablet and phone
- **Touch-friendly:** Large touch targets for controls
- **Bottom sheet:** Filters slide up from bottom on mobile
- **Simplified UI:** Fewer controls on small screens
- **Offline support:** Cache map tiles for PWA

## API Integration

### Customer Locations
```typescript
GET /api/customers/locations
Response: {
  customers: [{
    id: string;
    latitude: number;
    longitude: number;
    accountType: 'ACTIVE' | 'TARGET' | 'PROSPECT';
    revenue: number;
    ...
  }]
}
```

### Heat Map Data
```typescript
POST /api/customers/heatmap
Body: {
  filters: {...};
  metric: 'revenue' | 'frequency' | 'growth' | 'conversion';
}
Response: GeoJSON FeatureCollection
```

### Save Territory
```typescript
POST /api/territories
Body: {
  name: string;
  color: string;
  salesRepId: string;
  geometry: GeoJSON;
}
```

## Troubleshooting

### Map not rendering
- Check Mapbox access token in `.env.local`
- Verify token is public (starts with `pk.`)
- Check browser console for errors

### Markers not clustering
- Increase `clusterRadius` in CustomerMarkers
- Check `clusterMaxZoom` setting
- Verify marker data has coordinates

### Heat map not showing
- Toggle heat map layer on in sidebar
- Check date range filter
- Verify heat map data is loaded

### Performance issues
- Reduce number of visible markers
- Increase clustering threshold
- Optimize GeoJSON data
- Use simpler map style

## Future Enhancements

- [ ] Driving directions between customers
- [ ] Route optimization for call plans
- [ ] Real-time location tracking for sales reps
- [ ] Historical movement patterns
- [ ] Territory performance comparison
- [ ] Predictive analytics overlay
- [ ] Integration with Google Maps
- [ ] Street view integration
- [ ] 3D building visualization
- [ ] Time-based heat map animation
