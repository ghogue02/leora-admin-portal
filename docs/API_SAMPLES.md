# Sample Management API Documentation

## Overview

The Sample Management API provides comprehensive endpoints for tracking wine samples, analyzing conversion metrics, managing inventory, and generating supplier reports.

**Base URL**: `/api/samples`

---

## Authentication

All endpoints require authentication. Include the sales rep ID in the `x-sales-rep-id` header.

```
x-sales-rep-id: <uuid>
```

---

## Endpoints

### 1. Quick Sample Assignment

**POST** `/api/samples/quick-assign`

Quickly assign a sample to a customer and automatically create an activity record.

#### Request Body

```json
{
  "skuId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "550e8400-e29b-41d4-a716-446655440001",
  "quantity": 2,
  "feedbackOptions": ["Loved it", "Would buy"],
  "customerResponse": "Customer really enjoyed the taste",
  "sampleSource": "Wine tasting event",
  "notes": "Customer is interested in case purchase"
}
```

#### Response (201 Created)

```json
{
  "sampleUsage": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "skuId": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "550e8400-e29b-41d4-a716-446655440001",
    "salesRepId": "550e8400-e29b-41d4-a716-446655440003",
    "dateGiven": "2025-01-15T10:30:00Z",
    "quantity": 2,
    "feedbackOptions": ["Loved it", "Would buy"],
    "customerResponse": "Customer really enjoyed the taste",
    "sampleSource": "Wine tasting event",
    "notes": "Customer is interested in case purchase",
    "followUpDate": "2025-02-05T10:30:00Z",
    "converted": false,
    "sku": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "skuCode": "CAB-750-2021",
      "size": "750ml",
      "product": {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "Cabernet Sauvignon 2021"
      }
    },
    "customer": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Wine Enthusiast Restaurant"
    }
  },
  "activityCreated": true
}
```

#### Error Responses

- **400 Bad Request**: Invalid input data
- **404 Not Found**: SKU not found or insufficient inventory
- **500 Internal Server Error**: Server error

---

### 2. Sample Analytics

**GET** `/api/samples/analytics`

Get comprehensive analytics on sample usage, conversions, and performance.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO datetime | No | Filter start date |
| endDate | ISO datetime | No | Filter end date |
| skuId | UUID | No | Filter by specific SKU |
| salesRepId | UUID | No | Filter by sales rep |

#### Example Request

```
GET /api/samples/analytics?startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z
```

#### Response (200 OK)

```json
{
  "overview": {
    "totalSamples": 450,
    "totalCustomers": 234,
    "conversions": 89,
    "conversionRate": 19.78,
    "totalRevenue": "45678.90"
  },
  "byProduct": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440004",
      "productName": "Cabernet Sauvignon 2021",
      "sku": "CAB-750-2021",
      "totalSamples": 120,
      "conversions": 35,
      "conversionRate": 29.17,
      "revenue": "15600.00"
    }
  ],
  "byRep": [
    {
      "salesRepId": "550e8400-e29b-41d4-a716-446655440003",
      "salesRepName": "John Smith",
      "totalSamples": 150,
      "conversions": 45,
      "conversionRate": 30.0,
      "revenue": "18900.00"
    }
  ],
  "timeline": [
    {
      "date": "2025-01-01T00:00:00Z",
      "samples": 45,
      "conversions": 12,
      "revenue": "5400.00"
    }
  ]
}
```

---

### 3. Top Performers

**GET** `/api/samples/analytics/top-performers`

Get the best-performing products based on conversion rate or revenue.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Number of results (max 100) |
| sortBy | enum | conversion | Sort by 'conversion' or 'revenue' |
| period | enum | 30d | Time period: '7d', '30d', '90d', '365d', 'all' |

#### Example Request

```
GET /api/samples/analytics/top-performers?limit=5&sortBy=conversion&period=30d
```

#### Response (200 OK)

```json
{
  "performers": [
    {
      "sku": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "skuCode": "CAB-750-2021",
        "size": "750ml",
        "product": {
          "id": "550e8400-e29b-41d4-a716-446655440004",
          "name": "Cabernet Sauvignon 2021"
        }
      },
      "samplesGiven": 50,
      "conversions": 18,
      "conversionRate": 36.0,
      "revenue": "7800.00",
      "rank": 1
    }
  ],
  "metadata": {
    "period": "30d",
    "sortBy": "conversion",
    "totalProducts": 45
  }
}
```

---

### 4. Rep Leaderboard

**GET** `/api/samples/analytics/rep-leaderboard`

Get sales rep rankings based on sample conversion performance.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | enum | 30d | Time period: '7d', '30d', '90d', '365d' |
| limit | integer | 20 | Number of results (max 100) |

#### Example Request

```
GET /api/samples/analytics/rep-leaderboard?period=30d&limit=10
```

#### Response (200 OK)

```json
{
  "leaderboard": [
    {
      "salesRep": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "John Smith",
        "email": "john.smith@example.com"
      },
      "samplesGiven": 150,
      "conversions": 55,
      "conversionRate": 36.67,
      "revenue": "22500.00",
      "rank": 1,
      "trend": "up"
    }
  ],
  "metadata": {
    "period": "30d",
    "totalReps": 12,
    "generatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Trend Values**:
- `up`: Conversion rate increased by >2% from previous period
- `down`: Conversion rate decreased by >2% from previous period
- `stable`: Conversion rate changed by ≤2%

---

### 5. Sample History

**GET** `/api/samples/history/{customerId}`

Get complete sample history for a specific customer.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerId | UUID | Yes | Customer ID |

#### Example Request

```
GET /api/samples/history/550e8400-e29b-41d4-a716-446655440001
```

#### Response (200 OK)

```json
{
  "samples": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "skuId": "550e8400-e29b-41d4-a716-446655440000",
      "dateGiven": "2025-01-15T10:30:00Z",
      "quantity": 2,
      "converted": true,
      "conversionDate": "2025-01-20T14:00:00Z",
      "sku": {
        "skuCode": "CAB-750-2021",
        "product": {
          "name": "Cabernet Sauvignon 2021"
        }
      },
      "salesRep": {
        "name": "John Smith"
      }
    }
  ],
  "stats": {
    "total": 5,
    "conversions": 2,
    "conversionRate": 40.0,
    "lastSample": "2025-01-15T10:30:00Z"
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid customer ID
- **404 Not Found**: Customer not found

---

### 6. Pulled Samples

**GET** `/api/samples/pulled`

Get samples pulled in the last X days and identify those needing follow-up.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| salesRepId | UUID | None | Filter by sales rep |
| days | integer | 21 | Number of days to look back |

#### Example Request

```
GET /api/samples/pulled?salesRepId=550e8400-e29b-41d4-a716-446655440003&days=21
```

#### Response (200 OK)

```json
{
  "pulled": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "dateGiven": "2025-01-10T10:30:00Z",
      "followUpDate": "2025-01-31T10:30:00Z",
      "quantity": 2,
      "converted": false,
      "sku": {
        "product": {
          "name": "Cabernet Sauvignon 2021"
        }
      },
      "customer": {
        "name": "Wine Enthusiast Restaurant"
      }
    }
  ],
  "needFollowup": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "dateGiven": "2024-12-20T10:30:00Z",
      "followUpDate": "2025-01-10T10:30:00Z",
      "quantity": 1,
      "converted": false
    }
  ],
  "summary": {
    "totalPulled": 45,
    "needFollowupCount": 8,
    "conversions": 12,
    "conversionRate": 26.67
  }
}
```

---

### 7. Feedback Templates

**GET** `/api/samples/feedback-templates`

Get all active feedback templates grouped by category.

#### Response (200 OK)

```json
{
  "templates": {
    "Initial Reaction": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "name": "Taste Feedback",
        "category": "Initial Reaction",
        "options": ["Loved it", "Liked it", "Neutral", "Didn't like it"],
        "isActive": true,
        "sortOrder": 0
      }
    ],
    "Purchase Intent": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440011",
        "name": "Buying Interest",
        "category": "Purchase Intent",
        "options": ["Definitely buying", "Considering", "Maybe later", "Not interested"],
        "isActive": true,
        "sortOrder": 1
      }
    ]
  },
  "all": [...]
}
```

**POST** `/api/samples/feedback-templates`

Create a new feedback template.

#### Request Body

```json
{
  "name": "Price Sensitivity",
  "category": "Purchase Intent",
  "options": ["Too expensive", "Fair price", "Good value"],
  "isActive": true,
  "sortOrder": 2
}
```

#### Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440012",
  "name": "Price Sensitivity",
  "category": "Purchase Intent",
  "options": ["Too expensive", "Fair price", "Good value"],
  "isActive": true,
  "sortOrder": 2
}
```

---

### 8. Supplier Report

**GET** `/api/samples/supplier-report`

Generate comprehensive report for a supplier showing all product performance.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| supplierId | UUID | Yes | Supplier ID |
| startDate | ISO datetime | No | Report start date |
| endDate | ISO datetime | No | Report end date |
| format | enum | No | 'json' or 'pdf' (default: json) |

#### Example Request

```
GET /api/samples/supplier-report?supplierId=550e8400-e29b-41d4-a716-446655440020&startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z
```

#### Response (200 OK)

```json
{
  "supplier": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "name": "Napa Valley Vineyards",
    "contactName": "Jane Doe"
  },
  "products": [
    {
      "product": {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "Cabernet Sauvignon 2021"
      },
      "sku": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "skuCode": "CAB-750-2021",
        "size": "750ml"
      },
      "samplesGiven": 120,
      "conversions": 35,
      "conversionRate": 29.17,
      "revenue": "15600.00"
    }
  ],
  "totals": {
    "totalSamples": 450,
    "totalRevenue": "67890.00",
    "avgConversion": 25.5
  },
  "exportUrl": "/api/samples/supplier-report/pdf?supplierId=...",
  "generatedAt": "2025-01-15T10:30:00Z",
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-12-31T23:59:59Z"
  }
}
```

---

### 9. Sample Inventory

**GET** `/api/samples/inventory`

List sample inventory with optional filters.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skuId | UUID | None | Filter by SKU |
| lowStock | boolean | false | Show only low stock items |
| threshold | integer | 10 | Low stock threshold |

#### Example Request

```
GET /api/samples/inventory?lowStock=true&threshold=15
```

#### Response (200 OK)

```json
{
  "inventory": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "skuId": "550e8400-e29b-41d4-a716-446655440000",
      "totalQuantity": 100,
      "availableQuantity": 8,
      "usedQuantity": 92,
      "location": "Warehouse A - Section 3",
      "lastUpdated": "2025-01-15T10:30:00Z",
      "sku": {
        "skuCode": "CAB-750-2021",
        "product": {
          "name": "Cabernet Sauvignon 2021"
        }
      }
    }
  ],
  "summary": {
    "totalItems": 45,
    "lowStockItems": 8,
    "totalAvailable": 1250,
    "totalUsed": 3890
  }
}
```

**PATCH** `/api/samples/inventory`

Update inventory levels.

#### Request Body

```json
{
  "skuId": "550e8400-e29b-41d4-a716-446655440000",
  "availableQuantity": 50,
  "totalQuantity": 150
}
```

#### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "skuId": "550e8400-e29b-41d4-a716-446655440000",
  "totalQuantity": 150,
  "availableQuantity": 50,
  "usedQuantity": 92,
  "lastUpdated": "2025-01-15T11:00:00Z"
}
```

**POST** `/api/samples/inventory`

Create new sample inventory record.

#### Request Body

```json
{
  "skuId": "550e8400-e29b-41d4-a716-446655440001",
  "totalQuantity": 100,
  "location": "Warehouse B - Section 1"
}
```

#### Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440031",
  "skuId": "550e8400-e29b-41d4-a716-446655440001",
  "totalQuantity": 100,
  "availableQuantity": 100,
  "usedQuantity": 0,
  "location": "Warehouse B - Section 1",
  "lastUpdated": "2025-01-15T11:00:00Z"
}
```

---

## Error Handling

All API endpoints use consistent error response format:

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "skuId",
      "message": "Invalid UUID format"
    }
  ]
}
```

### HTTP Status Codes

- **200 OK**: Successful GET request
- **201 Created**: Successful POST request
- **400 Bad Request**: Invalid input or validation error
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **500 Internal Server Error**: Server error

---

## Rate Limiting

API requests are rate-limited to:
- **100 requests per minute** per API key
- **1000 requests per hour** per API key

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

---

## Data Types

### Decimal

Monetary values are returned as strings to preserve precision:
```json
{
  "revenue": "45678.90"
}
```

### Dates

All dates use ISO 8601 format:
```json
{
  "dateGiven": "2025-01-15T10:30:00Z"
}
```

### UUIDs

All IDs use UUID v4 format:
```
550e8400-e29b-41d4-a716-446655440000
```

---

## Best Practices

1. **Always validate input** on the client side before sending requests
2. **Handle errors gracefully** and show user-friendly messages
3. **Cache analytics data** when appropriate (use ETags)
4. **Use pagination** for large datasets
5. **Include authentication headers** on all requests
6. **Monitor rate limits** to avoid throttling
7. **Use query parameters** for filtering instead of fetching all data

---

## Examples

### Quick Sample Assignment Flow

```javascript
// 1. Get available feedback templates
const templates = await fetch('/api/samples/feedback-templates').then(r => r.json());

// 2. Assign sample to customer
const result = await fetch('/api/samples/quick-assign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-sales-rep-id': currentRepId
  },
  body: JSON.stringify({
    skuId: selectedSku.id,
    customerId: customer.id,
    quantity: 2,
    feedbackOptions: templates.all[0].options,
    customerResponse: 'Customer loved the wine',
    notes: 'Interested in case purchase'
  })
});

const { sampleUsage, activityCreated } = await result.json();
console.log('Sample assigned:', sampleUsage.id);
```

### Analytics Dashboard

```javascript
// Get comprehensive analytics
const analytics = await fetch(
  '/api/samples/analytics?startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z'
).then(r => r.json());

// Get top performers
const topProducts = await fetch(
  '/api/samples/analytics/top-performers?limit=10&sortBy=conversion&period=30d'
).then(r => r.json());

// Get rep leaderboard
const leaderboard = await fetch(
  '/api/samples/analytics/rep-leaderboard?period=30d'
).then(r => r.json());

// Render dashboard
renderDashboard({
  overview: analytics.overview,
  topProducts: topProducts.performers,
  leaderboard: leaderboard.leaderboard
});
```

---

## Support

For API support, contact:
- **Email**: api-support@example.com
- **Slack**: #api-support
- **Documentation**: https://docs.example.com/api

---

**Version**: 1.0.0
**Last Updated**: January 15, 2025
