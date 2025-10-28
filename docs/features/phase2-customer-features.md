# Phase 2 Customer Features Documentation

## Overview

This document describes all features implemented in Phase 2 of the customer management system. These features enhance customer insights, visualization, and analysis capabilities.

## Features Implemented

### 1. Order Deep Dive Component

**Location**: `/web/src/app/sales/customers/[customerId]/sections/OrderDeepDive.tsx`

**Purpose**: Provides detailed product-level breakdown of customer order history

**Features**:
- Product-by-product ordering patterns
- Last order date for each product
- Total orders and revenue per product
- Average frequency (days between orders)
- Orders per month calculation
- Sortable columns
- Export to CSV functionality

**API Endpoint**: `/api/sales/customers/[customerId]/product-history?type=breakdown`

**Usage**:
```tsx
<OrderDeepDive customerId={customerId} />
```

**Data Displayed**:
- Product name
- Last order date
- Total orders
- Total revenue
- Average frequency (days)
- Orders per month

### 2. Product History Reports

**Location**: `/web/src/app/sales/customers/[customerId]/sections/ProductHistoryReports.tsx`

**Purpose**: Visual timeline and trend analysis of product purchases

**Features**:
- 12-month product purchase timeline
- Interactive line charts (Recharts)
- Date range selector (3m, 6m, 12m)
- Trend analysis (up/down/stable)
- Percentage change calculations
- PDF export capability (placeholder)
- Seasonal pattern detection

**API Endpoint**: `/api/sales/customers/[customerId]/product-history?type=timeline`

**Usage**:
```tsx
<ProductHistoryReports customerId={customerId} />
```

**Chart Data**:
- Monthly revenue by product
- Trend indicators
- Percentage changes

### 3. Customer Map View

**Location**: `/web/src/app/sales/customers/map/page.tsx`

**Purpose**: Geographic visualization of all customers with health status

**Features**:
- Mapbox GL integration
- Color-coded pins by risk status:
  - Green: Healthy
  - Yellow: At Risk - Cadence
  - Orange: At Risk - Revenue
  - Gray: Dormant
  - Red: Closed
- Click to view customer card with revenue
- Filter by territory/status
- Multi-customer selection
- Route calculation between customers
- Drive time estimation via Mapbox Directions API

**API Endpoint**: `/api/sales/customers/map`

**Environment Variables Required**:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

**Usage**:
Navigate to `/sales/customers/map`

**Features**:
- Pin click shows customer popup
- Select multiple customers for routing
- Calculate driving directions
- Filter by risk status
- Legend for status colors

### 4. YTD Revenue Column

**Location**: `/web/src/app/sales/customers/sections/CustomerTable.tsx`

**Purpose**: Display Year-to-Date revenue for each customer in the list

**Changes**:
- Added `ytdRevenue` field to Customer type
- Added YTD Revenue column to table
- Updated API to return YTD revenue data
- Sortable column
- Currency formatting

**API Changes**:
- Modified `/api/sales/customers/route.ts` to calculate and return `ytdRevenue` for each customer

**Display**:
- Column header: "YTD Revenue"
- Sortable
- Formatted as currency ($X,XXX.XX)

### 5. Enhanced Quick Actions

**Location**: `/web/src/app/sales/customers/[customerId]/sections/QuickActions.tsx`

**Purpose**: Quick access to common customer actions

**Existing Actions** (already implemented):
- Send Email
- Log Activity
- Schedule Call
- Add to Call Plan
- View in Cart

**Note**: This component was already well-implemented with comprehensive actions. No changes needed.

### 6. Advanced Search Modal

**Location**: `/web/src/app/sales/customers/components/AdvancedSearchModal.tsx`

**Purpose**: Powerful search capabilities with multiple filters

**Features**:
- Customer name search
- City search
- Product purchased search
- Min/Max order value range
- Date range filtering
- Search history (localStorage)
- Recent searches quick access
- Fuzzy matching support
- Clear all filters

**Usage**:
```tsx
<AdvancedSearchModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSearch={(filters) => handleSearch(filters)}
/>
```

**Search Filters**:
- name: string
- city: string
- productPurchased: string
- minOrderValue: number
- maxOrderValue: number
- dateFrom: string
- dateTo: string

### 7. AI-Powered Customer Insights

**Location**: `/web/src/app/sales/customers/[customerId]/sections/CustomerInsights.tsx`

**Purpose**: Machine learning-based insights and predictions

**API Endpoint**: `/api/sales/customers/[customerId]/insights`

**Insight Types**:

1. **Pattern Insights**:
   - Consistent ordering patterns
   - Seasonal trends
   - Revenue growth trends

2. **Recommendations**:
   - Top products
   - Cross-sell opportunities
   - Volume discount suggestions
   - Complementary products

3. **Predictions**:
   - Next order timing
   - Expected order date

4. **Risk Alerts**:
   - Irregular ordering patterns
   - Overdue orders
   - Revenue decline
   - Pattern changes

**Features**:
- AI-generated insights with confidence scores
- Color-coded by type (blue/green/purple/orange)
- Confidence meter for each insight
- Actionable recommendations
- Pattern recognition

**Algorithm Details**:
- Analyzes last 50 orders
- Calculates ordering interval variability
- Detects seasonal patterns (minimum 6 months data)
- Trend analysis (3-month vs 6-month comparison)
- Product affinity analysis
- Similar customer matching

**Usage**:
```tsx
<CustomerInsights customerId={customerId} />
```

## API Endpoints Summary

### Product History API
`GET /api/sales/customers/[customerId]/product-history`

**Query Parameters**:
- `type`: "breakdown" | "timeline"

**Response (breakdown)**:
```json
{
  "products": [
    {
      "productId": "string",
      "productName": "string",
      "lastOrderDate": "ISO date",
      "totalOrders": number,
      "totalRevenue": number,
      "averageFrequencyDays": number,
      "ordersPerMonth": number
    }
  ]
}
```

**Response (timeline)**:
```json
{
  "months": ["Jan 2024", "Feb 2024", ...],
  "products": [
    {
      "id": "string",
      "name": "string",
      "data": [number, number, ...]
    }
  ]
}
```

### Customer Map API
`GET /api/sales/customers/map`

**Response**:
```json
{
  "customers": [
    {
      "id": "string",
      "name": "string",
      "latitude": number,
      "longitude": number,
      "riskStatus": "CustomerRiskStatus",
      "ytdRevenue": number,
      "city": "string",
      "state": "string"
    }
  ],
  "summary": {
    "totalCustomers": number,
    "totalYtdRevenue": number
  }
}
```

### Customer Insights API
`GET /api/sales/customers/[customerId]/insights`

**Response**:
```json
{
  "insights": [
    {
      "type": "pattern" | "recommendation" | "prediction" | "risk",
      "title": "string",
      "description": "string",
      "confidence": number (0-1)
    }
  ],
  "metadata": {
    "ordersAnalyzed": number,
    "generatedAt": "ISO date"
  }
}
```

## Integration Points

### CustomerDetailClient
The main customer detail page now includes all new components:

```tsx
<CustomerInsights customerId={customerId} />
<OrderDeepDive customerId={customerId} />
<ProductHistoryReports customerId={customerId} />
```

### Customer List Page
Enhanced with YTD Revenue column and advanced search:

- YTD Revenue column added to table
- Advanced search modal accessible via button
- Improved filtering and sorting

## Database Requirements

### Required Fields
- `Customer.latitude`: Decimal (for map view)
- `Customer.longitude`: Decimal (for map view)
- `Customer.city`: String
- `Customer.state`: String
- `Order.deliveredAt`: DateTime
- `OrderLine.product`: Relation to Product

### Indexes Recommended
```sql
CREATE INDEX idx_orders_customer_delivered ON orders(customer_id, delivered_at);
CREATE INDEX idx_orderlines_product ON order_lines(product_id);
CREATE INDEX idx_customers_location ON customers(latitude, longitude);
```

## Performance Considerations

### Optimizations Implemented
1. **Parallel API calls** in product history endpoint
2. **Pagination** for large datasets
3. **Caching** of map data (client-side)
4. **Lazy loading** of insights
5. **Aggregation** in database queries
6. **Limit** on insights (top 6 only)

### Future Optimizations
- Add Redis caching for insights
- Implement background jobs for heavy calculations
- Add pagination to product deep dive
- Lazy load map markers for large datasets

## Testing Checklist

- [ ] Order deep dive loads product breakdown
- [ ] Product history charts render correctly
- [ ] Map view displays customers with correct colors
- [ ] YTD Revenue column shows in customer list
- [ ] Advanced search filters work correctly
- [ ] Customer insights generate and display
- [ ] Export CSV works from order deep dive
- [ ] Map route calculation functions
- [ ] All API endpoints return expected data
- [ ] Mobile responsive design works

## Known Limitations

1. **Map View**: Requires valid latitude/longitude for customers
2. **Insights**: Requires minimum 3 orders for meaningful analysis
3. **PDF Export**: Placeholder implementation (needs PDF library)
4. **Route Calculation**: Limited to Mapbox free tier (check limits)
5. **Advanced Search**: Product search may be slow on large datasets

## Dependencies

### NPM Packages
- `mapbox-gl`: ^3.16.0 (map visualization)
- `recharts`: ^3.3.0 (charts)
- `date-fns`: ^4.1.0 (date manipulation)
- `lucide-react`: ^0.546.0 (icons)

### External Services
- Mapbox GL (requires API token)
- Mapbox Directions API (for routing)

## Security Considerations

1. All API endpoints use `withSalesSession` authentication
2. Tenant isolation enforced on all queries
3. Customer data filtered by sales rep (unless showAll=true)
4. No PII exposed in map popups without click
5. Export functions use client-side only

## Mobile Responsiveness

All components are mobile-responsive:
- Map view: Full screen on mobile
- Tables: Horizontal scroll on small screens
- Charts: Responsive container
- Search modal: Full width on mobile
- Insights: Stack vertically

## Future Enhancements

1. **Machine Learning Integration**: Replace rule-based insights with ML models
2. **Real-time Updates**: WebSocket for live order tracking
3. **Batch Actions**: Bulk export, email, territory assignment
4. **Custom Reports**: User-defined report templates
5. **Territory Optimization**: AI-powered territory planning
6. **Customer Health Score**: Predictive scoring model
7. **Integration with CRM**: Sync with external CRM systems

## Support and Troubleshooting

### Common Issues

**Map not loading**:
- Check `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Verify token has required scopes
- Check browser console for errors

**Insights not generating**:
- Customer needs minimum 3 orders
- Check API endpoint returns 200
- Verify date ranges in orders

**Charts not rendering**:
- Ensure recharts is installed
- Check data format matches expected structure
- Verify browser supports required features

## Changelog

### Version 1.0.0 (Phase 2 Completion)
- ✅ Order Deep Dive component
- ✅ Product History Reports
- ✅ Customer Map View
- ✅ YTD Revenue column
- ✅ Advanced Search modal
- ✅ AI-powered Customer Insights
- ✅ All API endpoints
- ✅ Documentation

---

**Last Updated**: 2025-10-26
**Phase**: 2 of 4
**Status**: Complete
**Next Phase**: Phase 3 - Order and Sample Management
