# Maps & Territory API Setup Guide

## Overview

The Maps & Territory APIs provide geocoding, geospatial queries, territory management, and route optimization capabilities.

## Prerequisites

1. **Mapbox Account**: Sign up at https://mapbox.com
2. **Mapbox Access Token**: Get from Mapbox dashboard
3. **@turf/turf Package**: Already installed
4. **PostgreSQL Database**: Running with Prisma

## Environment Configuration

Add to your `.env` file:

```bash
# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6InlvdXJ0b2tlbiJ9.xxx

# Optional: Mapbox API Base URL (default: https://api.mapbox.com)
MAPBOX_API_URL=https://api.mapbox.com

# Rate Limiting (default: 600 requests/minute for free tier)
MAPBOX_RATE_LIMIT=600
```

## Database Setup

Run the migration to add geocoding cache:

```bash
npx prisma migrate dev --name add_geocoding_cache
```

This creates the `GeocodingCache` table for storing geocoded addresses (30-day cache).

## API Endpoints

### 1. Geocoding APIs

#### Single Address Geocoding
```http
POST /api/geocoding
Content-Type: application/json

{
  "address": "1600 Pennsylvania Avenue NW, Washington, DC 20500"
}

Response:
{
  "latitude": 38.8977,
  "longitude": -77.0365,
  "formattedAddress": "1600 Pennsylvania Avenue Northwest, Washington, District of Columbia 20500, United States"
}
```

#### Batch Geocoding
```http
POST /api/geocoding/batch
Content-Type: application/json

{
  "customerIds": ["customer-1", "customer-2", "customer-3"]
}

Response:
{
  "geocoded": 2,
  "failed": 1,
  "results": [
    {
      "customerId": "customer-1",
      "success": true,
      "coordinates": { "latitude": 38.8977, "longitude": -77.0365 }
    },
    {
      "customerId": "customer-2",
      "success": true,
      "coordinates": { "latitude": 40.7128, "longitude": -74.0060 }
    },
    {
      "customerId": "customer-3",
      "success": false,
      "error": "No geocoding results found"
    }
  ]
}
```

### 2. Map Data APIs

#### Get Customers on Map
```http
GET /api/map/customers?bounds=38.8,-77.1,38.9,-77.0&accountType=ACTIVE

Response:
{
  "customers": [
    {
      "id": "customer-1",
      "name": "ABC Corp",
      "latitude": 38.8977,
      "longitude": -77.0365,
      "accountType": "ACTIVE",
      "accountPriority": "HIGH",
      "territory": "DC Metro",
      "lastOrderDate": "2025-10-20T00:00:00.000Z",
      "revenue": 125000
    }
  ]
}
```

#### Heat Map Data
```http
GET /api/map/heat?metric=revenue&startDate=2025-01-01&endDate=2025-10-25

Response:
{
  "points": [
    { "latitude": 38.8977, "longitude": -77.0365, "weight": 125000 },
    { "latitude": 40.7128, "longitude": -74.0060, "weight": 89500 }
  ],
  "max": 125000,
  "min": 15000
}
```

Metrics:
- `revenue`: Sum of order amounts
- `orders`: Count of orders
- `growth`: Percentage change (last 30 days vs previous 30 days)

#### Nearby Customers
```http
GET /api/map/nearby?lat=38.8977&lng=-77.0365&radiusMiles=10&limit=20

Response:
{
  "customers": [
    {
      "id": "customer-1",
      "name": "ABC Corp",
      "latitude": 38.9,
      "longitude": -77.0,
      "distance": 0.15,
      "accountType": "ACTIVE"
    }
  ],
  "total": 15
}
```

### 3. Territory APIs

#### List All Territories
```http
GET /api/territories

Response:
{
  "territories": [
    {
      "id": "territory-1",
      "name": "DC Metro",
      "boundaries": { "type": "Polygon", "coordinates": [...] },
      "color": "#FF5733",
      "salesRep": {
        "id": "user-1",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2025-10-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Territory
```http
POST /api/territories
Content-Type: application/json

{
  "name": "Virginia Region",
  "salesRepId": "user-1",
  "boundaries": {
    "type": "Polygon",
    "coordinates": [[
      [-77.5, 38.5],
      [-77.0, 38.5],
      [-77.0, 39.0],
      [-77.5, 39.0],
      [-77.5, 38.5]
    ]]
  },
  "color": "#3498DB"
}

Response: Territory object
```

#### Update Territory
```http
PATCH /api/territories/[territoryId]
Content-Type: application/json

{
  "name": "Updated Name",
  "salesRepId": "user-2"
}
```

#### Delete Territory
```http
DELETE /api/territories/[territoryId]

Response: { "success": true }
```

### 4. Territory Customer Assignment

#### Get Customers in Territory
```http
GET /api/territories/[territoryId]/customers

Response:
{
  "customers": [
    {
      "id": "customer-1",
      "name": "ABC Corp",
      "latitude": 38.8977,
      "longitude": -77.0365,
      "accountType": "ACTIVE",
      "territory": "DC Metro"
    }
  ]
}
```

#### Auto-Assign Customers
```http
POST /api/territories/[territoryId]/customers

Response:
{
  "assigned": 15,
  "customers": [...]
}
```

This automatically assigns all customers within the territory polygon.

### 5. Territory Suggestions

```http
POST /api/territories/suggest
Content-Type: application/json

{
  "salesRepId": "user-1",
  "clusterCount": 3
}

Response:
{
  "suggestions": [
    {
      "type": "Polygon",
      "coordinates": [[...]]
    },
    {
      "type": "Polygon",
      "coordinates": [[...]]
    }
  ]
}
```

Uses k-means clustering to suggest territory boundaries.

### 6. Route Optimization

```http
POST /api/map/optimize-route
Content-Type: application/json

{
  "customerIds": ["customer-1", "customer-2", "customer-3"],
  "startLocation": { "lat": 38.8977, "lng": -77.0365 }
}

Response:
{
  "optimizedOrder": [
    {
      "id": "customer-2",
      "name": "Nearest Customer",
      "latitude": 38.9,
      "longitude": -77.0,
      "distance": 0.15
    },
    {
      "id": "customer-1",
      "name": "Second Nearest",
      "latitude": 38.85,
      "longitude": -77.05,
      "distance": 0.3
    }
  ],
  "totalDistance": 5.2
}
```

## Rate Limiting

Mapbox free tier: 600 requests/minute

The geocoding service includes:
- Automatic rate limiting queue
- 30-day caching of geocoded addresses
- Exponential backoff on errors
- Batch processing support

## Auto-Geocoding

Customer addresses are automatically geocoded when:
1. Customer is created with address
2. Customer address is updated
3. Batch geocoding is triggered

Use the `customer-geocoding` service:

```typescript
import { autoGeocodeCustomer } from '@/lib/services/customer-geocoding';

// During customer update
const geoData = await autoGeocodeCustomer(customerId, {
  addressLine1: '1600 Pennsylvania Ave',
  city: 'Washington',
  state: 'DC',
  postalCode: '20500'
});

// Returns: { latitude, longitude, territory }
```

## Geospatial Helpers

```typescript
import {
  calculateDistance,
  getBoundingBox,
  centerOfPolygon,
  validateGeoJSON,
  isPointInPolygon,
  findPointsWithinRadius,
  optimizeRoute,
  clusterPoints
} from '@/lib/geospatial';

// Calculate distance in miles
const distance = calculateDistance(point1, point2);

// Validate GeoJSON polygon
const isValid = validateGeoJSON(polygonData);

// Check if point is in polygon
const isInside = isPointInPolygon(point, polygon);

// Find nearby points
const nearby = findPointsWithinRadius(center, points, radiusMiles);

// Optimize route (TSP approximation)
const { optimizedOrder, totalDistance } = optimizeRoute(start, destinations);

// Cluster points
const clusters = clusterPoints(points, clusterCount);
```

## Testing

Run integration tests:

```bash
npm test src/app/api/map/__tests__/integration.test.ts
```

Tests cover:
- Geocoding accuracy
- Cache performance
- Point-in-polygon detection
- Distance calculations
- Route optimization
- Clustering algorithms
- Territory assignment

## Performance Optimization

1. **Viewport Filtering**: Map customers API limits results to viewport bounds
2. **Caching**: 30-day cache for geocoded addresses
3. **Rate Limiting**: Prevents quota exhaustion
4. **Batch Operations**: Process multiple addresses efficiently
5. **Database Indexing**: Spatial queries optimized

## Error Handling

All APIs return appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Validation error
- `404`: Not found
- `500`: Server error

Error response format:
```json
{
  "error": "Error message",
  "details": [...]
}
```

## Security Considerations

1. Never expose Mapbox token in client-side code
2. Validate all GeoJSON input
3. Sanitize user-provided addresses
4. Rate limit API endpoints
5. Implement authentication/authorization

## Monitoring

Track these metrics:
- Geocoding success rate (target: 95%+)
- API response time (target: <500ms)
- Cache hit rate
- Rate limit usage
- Territory assignment accuracy

## Troubleshooting

### Geocoding Fails
- Check Mapbox token validity
- Verify rate limit not exceeded
- Ensure address format is correct
- Check Mapbox API status

### Point-in-Polygon Not Working
- Validate GeoJSON format (use `validateGeoJSON`)
- Ensure polygon is closed (first point = last point)
- Check coordinate order (longitude, latitude)

### Performance Issues
- Enable caching
- Use viewport bounds filtering
- Limit result sets
- Optimize database queries
- Consider spatial indexes

## Next Steps

1. Add frontend map visualization (Mapbox GL JS)
2. Implement real-time territory updates
3. Add heatmap visualization
4. Create territory analytics dashboard
5. Build route planning UI
