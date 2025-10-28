# API Reference - Phase 3: Samples & Analytics

## Overview

This document covers the REST API endpoints added in Phase 3 for sample management, analytics, automated triggers, and AI recommendations.

**Base URL**: `https://yourapp.com/api`
**Authentication**: Bearer token (JWT) required for all endpoints
**Content-Type**: `application/json`

---

## Authentication

All API requests require a valid JWT token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

To obtain a token:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "tenantId": "uuid"
  }
}
```

---

## Sample Management

### POST /api/samples/quick-assign

Quickly assign a sample to a customer during a visit.

**Request**:
```json
{
  "customerId": "uuid",
  "skuId": "uuid",
  "quantity": 1,
  "tastedAt": "2024-10-25T14:30:00Z",
  "feedback": "Customer loved the minerality",
  "needsFollowUp": true
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "skuId": "uuid",
  "salesRepId": "uuid",
  "quantity": 1,
  "tastedAt": "2024-10-25T14:30:00Z",
  "feedback": "Customer loved the minerality",
  "needsFollowUp": true,
  "resultedInOrder": false,
  "createdAt": "2024-10-25T14:30:05Z"
}
```

**Errors**:
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Customer or SKU not found
- `409 Conflict`: Sample budget exceeded

---

### GET /api/samples/history/:customerId

Retrieve sample history for a specific customer.

**Query Parameters**:
- `limit` (optional): Number of results (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)
- `converted` (optional): Filter by conversion status (true/false)

**Request**:
```http
GET /api/samples/history/customer-uuid?limit=20&converted=false
```

**Response** (200 OK):
```json
{
  "samples": [
    {
      "id": "uuid",
      "sku": {
        "id": "uuid",
        "code": "CHARD-001",
        "product": {
          "name": "Burgundy Chardonnay",
          "brand": "Domaine XYZ"
        }
      },
      "quantity": 1,
      "tastedAt": "2024-10-20T14:00:00Z",
      "feedback": "Loved the oak integration",
      "needsFollowUp": true,
      "followedUpAt": null,
      "resultedInOrder": false
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/samples/pulled

Get list of samples pulled from inventory (for budget tracking).

**Query Parameters**:
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `salesRepId` (optional): Filter by sales rep

**Request**:
```http
GET /api/samples/pulled?startDate=2024-10-01&endDate=2024-10-31&salesRepId=rep-uuid
```

**Response** (200 OK):
```json
{
  "samples": [
    {
      "id": "uuid",
      "salesRep": {
        "id": "uuid",
        "name": "John Doe"
      },
      "sku": {
        "code": "CHARD-001",
        "product": {
          "name": "Burgundy Chardonnay"
        }
      },
      "quantity": 1,
      "tastedAt": "2024-10-15T10:30:00Z",
      "customer": {
        "id": "uuid",
        "name": "Wine Bar ABC"
      }
    }
  ],
  "totalQuantity": 45,
  "budgetAllowance": 60,
  "remainingBudget": 15
}
```

---

### GET /api/samples/feedback-templates

Retrieve predefined feedback templates.

**Response** (200 OK):
```json
{
  "templates": [
    {
      "id": "uuid",
      "category": "positive",
      "text": "Loved it",
      "description": "Customer expressed strong interest"
    },
    {
      "id": "uuid",
      "category": "positive",
      "text": "Will order soon",
      "description": "Committed to placing an order"
    },
    {
      "id": "uuid",
      "category": "neutral",
      "text": "Needs time to decide",
      "description": "Wants to think it over"
    },
    {
      "id": "uuid",
      "category": "negative",
      "text": "Not a fit",
      "description": "Product doesn't match their needs"
    }
  ]
}
```

---

### POST /api/samples/feedback-templates

Create a custom feedback template (admin only).

**Request**:
```json
{
  "category": "positive",
  "text": "Perfect for their by-the-glass program",
  "description": "Aligns with BTG pricing and style"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "category": "positive",
  "text": "Perfect for their by-the-glass program",
  "description": "Aligns with BTG pricing and style",
  "createdAt": "2024-10-25T15:00:00Z"
}
```

---

## Sample Analytics

### GET /api/samples/analytics

Retrieve sample analytics dashboard data.

**Query Parameters**:
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `salesRepId` (optional): Filter by sales rep

**Request**:
```http
GET /api/samples/analytics?startDate=2024-09-01&endDate=2024-10-31
```

**Response** (200 OK):
```json
{
  "summary": {
    "totalSamples": 245,
    "totalConversions": 87,
    "conversionRate": 35.5,
    "revenueAttributed": 42350.00,
    "avgRevenuePerSample": 172.86,
    "avgDaysToConversion": 8.3
  },
  "topPerformers": [
    {
      "skuId": "uuid",
      "skuCode": "CHARD-001",
      "productName": "Burgundy Chardonnay",
      "samplesDistributed": 32,
      "conversions": 18,
      "conversionRate": 56.3,
      "revenueGenerated": 8640.00,
      "avgOrderSize": 480.00,
      "roi": 3200.0
    }
  ],
  "byCategory": [
    {
      "category": "White Wine",
      "samples": 120,
      "conversions": 48,
      "conversionRate": 40.0,
      "revenue": 22000.00
    }
  ],
  "trends": [
    {
      "date": "2024-10-01",
      "samples": 25,
      "conversions": 9,
      "revenue": 3850.00
    }
  ]
}
```

---

### GET /api/samples/analytics/top-performers

Get top-performing products by sample conversion.

**Query Parameters**:
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `limit` (optional): Number of results (default: 10, max: 50)
- `sortBy` (optional): `conversionRate`, `revenue`, `roi` (default: conversionRate)

**Request**:
```http
GET /api/samples/analytics/top-performers?startDate=2024-09-01&endDate=2024-10-31&limit=10&sortBy=revenue
```

**Response** (200 OK):
```json
{
  "performers": [
    {
      "rank": 1,
      "sku": {
        "id": "uuid",
        "code": "CHARD-001",
        "product": {
          "name": "Burgundy Chardonnay",
          "brand": "Domaine XYZ",
          "category": "White Wine"
        }
      },
      "metrics": {
        "samplesDistributed": 32,
        "conversions": 18,
        "conversionRate": 56.3,
        "revenueGenerated": 8640.00,
        "avgOrderSize": 480.00,
        "sampleCost": 240.00,
        "roi": 3500.0
      }
    }
  ]
}
```

---

### GET /api/samples/analytics/rep-leaderboard

Get sales rep performance leaderboard.

**Query Parameters**:
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `metric` (optional): `conversionRate`, `revenue`, `efficiency` (default: conversionRate)

**Request**:
```http
GET /api/samples/analytics/rep-leaderboard?startDate=2024-09-01&endDate=2024-10-31&metric=revenue
```

**Response** (200 OK):
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "salesRep": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "metrics": {
        "samplesDistributed": 78,
        "conversions": 34,
        "conversionRate": 43.6,
        "revenueGenerated": 15680.00,
        "avgRevenuePerSample": 201.03,
        "customersReached": 45,
        "followUpRate": 89.7
      }
    }
  ],
  "teamAverage": {
    "conversionRate": 32.5,
    "avgRevenuePerSample": 165.00
  }
}
```

---

### GET /api/samples/supplier-report

Generate supplier performance report.

**Query Parameters**:
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `supplierId` (optional): Filter by supplier
- `format` (optional): `json`, `csv`, `pdf` (default: json)

**Request**:
```http
GET /api/samples/supplier-report?startDate=2024-09-01&endDate=2024-10-31&supplierId=supplier-uuid&format=json
```

**Response** (200 OK):
```json
{
  "supplier": {
    "id": "uuid",
    "name": "Wine Importer XYZ",
    "region": "Burgundy"
  },
  "period": {
    "startDate": "2024-09-01",
    "endDate": "2024-10-31"
  },
  "summary": {
    "totalSamples": 125,
    "uniqueSkus": 18,
    "conversions": 52,
    "conversionRate": 41.6,
    "revenueGenerated": 24500.00
  },
  "topSkus": [
    {
      "sku": {
        "code": "CHARD-001",
        "product": {
          "name": "Burgundy Chardonnay"
        }
      },
      "samples": 32,
      "conversions": 18,
      "revenue": 8640.00
    }
  ],
  "byRep": [
    {
      "salesRep": {
        "name": "John Doe"
      },
      "samples": 45,
      "conversions": 21,
      "revenue": 9800.00
    }
  ]
}
```

---

## AI Recommendations

### POST /api/recommendations/products

Get AI-powered product recommendations for a customer.

**Request**:
```json
{
  "customerId": "uuid",
  "currentOrderItems": [
    {
      "skuId": "sku-uuid",
      "quantity": 6
    }
  ],
  "maxRecommendations": 5,
  "minConfidence": 0.5
}
```

**Response** (200 OK):
```json
{
  "recommendations": [
    {
      "sku": {
        "id": "uuid",
        "code": "CHARD-002",
        "product": {
          "name": "Meursault 2021",
          "brand": "Domaine ABC",
          "category": "White Wine"
        }
      },
      "confidence": 0.87,
      "reasoning": "Customer frequently orders premium Burgundy whites and recently gave positive feedback on a similar Meursault sample. This complements their current order of red Burgundy.",
      "suggestedQuantity": 3,
      "pricing": {
        "pricePerUnit": 52.99,
        "totalPrice": 158.97
      },
      "inStock": true,
      "stockQuantity": 24
    }
  ],
  "context": {
    "purchaseHistoryMonths": 12,
    "samplesConsidered": 15,
    "activitiesAnalyzed": 8
  },
  "apiUsage": {
    "model": "claude-3-5-sonnet-20241022",
    "tokensUsed": 3240,
    "estimatedCost": 0.0324
  }
}
```

**Errors**:
- `400 Bad Request`: Missing customerId
- `402 Payment Required`: API budget exceeded
- `404 Not Found`: Customer not found
- `503 Service Unavailable`: AI service temporarily unavailable

---

### POST /api/recommendations/feedback

Provide feedback on a recommendation.

**Request**:
```json
{
  "recommendationId": "uuid",
  "feedback": "thumbs_up",
  "details": "Customer loved this suggestion and added to order",
  "customerResponse": {
    "addedToOrder": true,
    "quantityOrdered": 3
  }
}
```

**Response** (200 OK):
```json
{
  "message": "Feedback recorded successfully",
  "learningUpdated": true
}
```

---

## Automated Triggers

### GET /api/admin/triggers

Get list of configured triggers (admin only).

**Response** (200 OK):
```json
{
  "triggers": [
    {
      "id": "uuid",
      "name": "Sample No Order Follow-up",
      "type": "sample_no_order",
      "enabled": true,
      "config": {
        "daysAfterSample": 7,
        "activityType": "phone_call",
        "priority": "medium",
        "descriptionTemplate": "Follow up on {product} sample from {date}"
      },
      "stats": {
        "timesFired": 245,
        "tasksCreated": 245,
        "taskCompletionRate": 0.85
      }
    }
  ]
}
```

---

### POST /api/admin/triggers

Create a new trigger (admin only).

**Request**:
```json
{
  "name": "Premium Sample Quick Follow-up",
  "type": "sample_no_order",
  "enabled": true,
  "config": {
    "daysAfterSample": 3,
    "activityType": "phone_call",
    "priority": "high",
    "descriptionTemplate": "URGENT: Follow up on premium {product} sample",
    "conditions": {
      "productCategory": "Premium",
      "minSampleValue": 50.00
    }
  }
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "Premium Sample Quick Follow-up",
  "type": "sample_no_order",
  "enabled": true,
  "config": { ... },
  "createdAt": "2024-10-25T16:00:00Z"
}
```

---

### PUT /api/admin/triggers/:triggerId

Update trigger configuration (admin only).

**Request**:
```json
{
  "enabled": false,
  "config": {
    "daysAfterSample": 5
  }
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Sample No Order Follow-up",
  "enabled": false,
  "config": {
    "daysAfterSample": 5,
    ...
  },
  "updatedAt": "2024-10-25T16:05:00Z"
}
```

---

### DELETE /api/admin/triggers/:triggerId

Delete a trigger (admin only).

**Response** (204 No Content)

---

### GET /api/admin/triggers/:triggerId/logs

Get trigger execution logs.

**Query Parameters**:
- `limit` (optional): Number of results (default: 50, max: 200)
- `startDate` (optional): Filter by date range
- `endDate` (optional): Filter by date range

**Response** (200 OK):
```json
{
  "logs": [
    {
      "id": "uuid",
      "triggerId": "uuid",
      "firedAt": "2024-10-25T09:00:00Z",
      "conditions": {
        "sampleId": "uuid",
        "customerId": "uuid",
        "daysSinceSample": 7
      },
      "action": {
        "taskCreated": true,
        "taskId": "uuid",
        "assignedTo": "rep-uuid"
      }
    }
  ]
}
```

---

## Rate Limiting

All endpoints are rate-limited:

- **Standard endpoints**: 100 requests/minute per user
- **Analytics endpoints**: 30 requests/minute per user
- **AI recommendations**: 10 requests/minute per user

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698249600
```

**429 Too Many Requests** Response:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Business rule violation (e.g., budget exceeded) |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server issue |
| 503 | Service Unavailable - Temporary outage |

**Error Response Format**:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

---

## Pagination

Endpoints supporting pagination use offset-based pagination:

**Request**:
```http
GET /api/samples/history/customer-uuid?limit=20&offset=40
```

**Response Headers**:
```http
X-Total-Count: 125
X-Page-Limit: 20
X-Page-Offset: 40
```

**Response Body**:
```json
{
  "data": [...],
  "pagination": {
    "total": 125,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

---

## Webhook Events

Phase 3 introduces webhook support for real-time notifications:

### Webhook Event Types

- `sample.created` - New sample logged
- `sample.converted` - Sample resulted in order
- `trigger.fired` - Automated trigger created task
- `recommendation.generated` - AI recommendation created
- `analytics.updated` - Analytics data refreshed

### Webhook Payload Example

```json
{
  "event": "sample.converted",
  "timestamp": "2024-10-25T16:30:00Z",
  "tenantId": "uuid",
  "data": {
    "sampleId": "uuid",
    "customerId": "uuid",
    "skuId": "uuid",
    "orderId": "uuid",
    "revenueAttributed": 480.00,
    "daysSinceSample": 5
  }
}
```

### Configuring Webhooks

See [Admin API Documentation](./ADMIN_API_REFERENCE.md) for webhook configuration.

---

---

## Phase 5: Warehouse & Routing APIs

### Warehouse Configuration

#### GET /api/warehouse/config

Get warehouse configuration for tenant.

**Response** (200 OK):
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "aisles": ["A", "B", "C", "D", "E"],
  "rowsPerAisle": 10,
  "shelfLevels": ["Bottom", "Middle", "Top"],
  "pickStrategy": "aisle_then_row",
  "createdAt": "2024-10-25T10:00:00Z",
  "updatedAt": "2024-10-25T10:00:00Z",
  "totalLocations": 150
}
```

#### POST /api/warehouse/config

Create warehouse configuration (first-time setup).

**Request**:
```json
{
  "aisles": ["A", "B", "C", "D", "E"],
  "rowsPerAisle": 10,
  "shelfLevels": ["Bottom", "Middle", "Top"],
  "pickStrategy": "aisle_then_row"
}
```

**Response** (201 Created): Same as GET

**Errors**:
- `409 Conflict`: Configuration already exists (use PATCH to update)

#### PATCH /api/warehouse/config

Update warehouse configuration.

**Request**:
```json
{
  "aisles": ["A", "B", "C", "D", "E", "F"],
  "rowsPerAisle": 12,
  "recalculatePickOrders": true
}
```

**Response** (200 OK): Updated configuration

---

### Inventory Locations

#### GET /api/warehouse/inventory/locations

List inventory locations.

**Query Parameters**:
- `hasLocation` (optional): true/false - Filter by assignment status
- `aisle` (optional): Filter by specific aisle
- `search` (optional): Search by product name or SKU

**Response** (200 OK):
```json
{
  "locations": [
    {
      "id": "uuid",
      "sku": {
        "id": "uuid",
        "code": "CHARD-001",
        "product": {
          "name": "Burgundy Chardonnay"
        }
      },
      "aisle": "A",
      "row": 1,
      "shelf": "Bottom",
      "location": "A-1-Bottom",
      "pickOrder": 1011,
      "lastUpdated": "2024-10-25T09:00:00Z"
    }
  ],
  "total": 150,
  "assigned": 120,
  "unassigned": 30
}
```

#### PATCH /api/warehouse/inventory/locations

Assign or update inventory location.

**Request**:
```json
{
  "skuId": "uuid",
  "aisle": "A",
  "row": 5,
  "shelf": "Middle"
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "skuId": "uuid",
  "aisle": "A",
  "row": 5,
  "shelf": "Middle",
  "location": "A-5-Middle",
  "pickOrder": 1052,
  "lastUpdated": "2024-10-25T11:30:00Z"
}
```

**Errors**:
- `409 Conflict`: Location already occupied
- `404 Not Found`: SKU not found
- `400 Bad Request`: Invalid aisle/row/shelf

#### POST /api/warehouse/locations/import

Bulk import inventory locations via CSV.

**Request** (multipart/form-data):
```
Content-Type: multipart/form-data

file: [CSV file]
```

**CSV Format**:
```csv
sku_code,aisle,row,shelf
CHARD-001,A,1,Bottom
CAB-002,A,2,Middle
PINOT-003,B,1,Bottom
```

**Response** (200 OK):
```json
{
  "success": true,
  "imported": 125,
  "skipped": 5,
  "errors": [
    {
      "row": 45,
      "skuCode": "INVALID-SKU",
      "error": "SKU not found"
    }
  ]
}
```

---

### Pick Sheets

#### GET /api/pick-sheets

List pick sheets.

**Query Parameters**:
- `status` (optional): DRAFT, READY, PICKING, PICKED, CANCELED
- `assignedTo` (optional): Filter by assigned picker
- `startDate` (optional): Filter by creation date
- `limit` (optional): Default 50, max 200
- `offset` (optional): Pagination offset

**Response** (200 OK):
```json
{
  "pickSheets": [
    {
      "id": "uuid",
      "status": "PICKING",
      "priority": "high",
      "orderCount": 5,
      "totalItems": 28,
      "totalQuantity": 95,
      "estimatedTime": 20,
      "assignedTo": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2024-10-25T14:00:00Z",
      "startedAt": "2024-10-25T14:15:00Z",
      "completedAt": null
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

#### POST /api/pick-sheets

Generate a new pick sheet.

**Request**:
```json
{
  "orderIds": ["uuid1", "uuid2", "uuid3"],
  "priority": "normal",
  "assignedTo": "uuid"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "status": "DRAFT",
  "priority": "normal",
  "orderIds": ["uuid1", "uuid2", "uuid3"],
  "totalItems": 28,
  "totalQuantity": 95,
  "estimatedTime": 20,
  "items": [
    {
      "id": "uuid",
      "sku": {
        "code": "CHARD-001",
        "product": {
          "name": "Burgundy Chardonnay"
        }
      },
      "location": "A-1-Bottom",
      "pickOrder": 1011,
      "quantity": 6,
      "customer": {
        "name": "Wine Bar XYZ"
      },
      "orderId": "uuid1"
    }
  ],
  "createdAt": "2024-10-25T14:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: No orders selected
- `422 Unprocessable Entity`: Orders missing locations
- `409 Conflict`: Orders not in READY status

#### GET /api/pick-sheets/[sheetId]

Get pick sheet details.

**Response** (200 OK): Same as POST response with full item list

#### PATCH /api/pick-sheets/[sheetId]

Update pick sheet status or assignment.

**Request**:
```json
{
  "status": "PICKING",
  "assignedTo": "uuid"
}
```

**Response** (200 OK): Updated pick sheet

**Valid Status Transitions**:
- DRAFT → READY, CANCELED
- READY → PICKING, CANCELED
- PICKING → PICKED, READY (pause)
- PICKED → (final, no transitions)

#### DELETE /api/pick-sheets/[sheetId]

Cancel a pick sheet (soft delete).

**Response** (204 No Content)

**Errors**:
- `409 Conflict`: Cannot cancel PICKED sheets

#### GET /api/pick-sheets/[sheetId]/export

Export pick sheet as CSV or PDF.

**Query Parameters**:
- `format`: csv or pdf (default: pdf)
- `includeBarcodes`: true/false (default: true)

**Response** (200 OK):
- **PDF**: Binary PDF file
- **CSV**: CSV file with headers

**CSV Format**:
```csv
item_number,location,sku_code,product_name,quantity,customer_name,order_id,picked
1,A-1-Bottom,CHARD-001,Burgundy Chardonnay,6,Wine Bar XYZ,ORD-001,false
```

#### PATCH /api/pick-sheets/[sheetId]/items/[itemId]

Mark item as picked.

**Request**:
```json
{
  "picked": true,
  "actualQuantity": 6
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "picked": true,
  "pickedAt": "2024-10-25T14:22:00Z",
  "actualQuantity": 6
}
```

---

### Routing & Delivery

#### POST /api/routing/export

Export orders to Azuga CSV format.

**Request**:
```json
{
  "orderIds": ["uuid1", "uuid2", "uuid3"],
  "deliveryDate": "2024-10-26",
  "includeTimeWindows": true
}
```

**Response** (200 OK):
- **Content-Type**: text/csv
- **Content-Disposition**: attachment; filename="azuga_export_2024-10-25.csv"

**CSV Format**:
```csv
customer_name,address,city,state,zip,phone,email,delivery_date,time_window_start,time_window_end,order_id,order_value,special_instructions,contact_person
Wine Bar XYZ,123 Main St,San Francisco,CA,94102,415-555-1234,manager@winebar.com,2024-10-26,09:00,12:00,ORD-001,1250.00,Back door delivery,John Smith
```

#### POST /api/routing/import

Import optimized routes from Azuga CSV.

**Request** (multipart/form-data):
```
Content-Type: multipart/form-data

file: [Azuga optimized CSV]
```

**CSV Format**:
```csv
route_name,stop_number,sequence,customer_name,address,estimated_arrival,estimated_duration,order_id,driver_assigned,route_start_time
Route 1,1,1,Wine Bar XYZ,123 Main St SF CA,09:15,15,ORD-001,John Doe,08:00
```

**Response** (200 OK):
```json
{
  "success": true,
  "routesCreated": 3,
  "totalStops": 25,
  "routes": [
    {
      "id": "uuid",
      "name": "Route 1",
      "driverId": "uuid",
      "totalStops": 9,
      "totalMiles": 35.4,
      "estimatedDuration": 255,
      "startTime": "2024-10-26T08:00:00Z"
    }
  ],
  "errors": []
}
```

**Errors**:
- `400 Bad Request`: Invalid CSV format
- `422 Unprocessable Entity`: Order IDs not found

#### GET /api/routes/today

Get today's delivery routes.

**Response** (200 OK):
```json
{
  "routes": [
    {
      "id": "uuid",
      "name": "Route 1",
      "status": "IN_PROGRESS",
      "driver": {
        "id": "uuid",
        "name": "John Doe"
      },
      "totalStops": 9,
      "completedStops": 3,
      "totalMiles": 35.4,
      "startTime": "2024-10-26T08:00:00Z",
      "nextStop": {
        "sequence": 4,
        "customer": {
          "name": "Cafe ABC"
        },
        "estimatedArrival": "2024-10-26T10:15:00Z"
      }
    }
  ]
}
```

#### GET /api/routes/customer/[customerId]

Get customer delivery ETA (for customer tracking).

**Response** (200 OK):
```json
{
  "orderId": "uuid",
  "routeId": "uuid",
  "routeName": "Route 1",
  "status": "IN_PROGRESS",
  "estimatedArrival": "2024-10-26T10:15:00Z",
  "stopsBeforeYou": 2,
  "driver": {
    "name": "John Doe",
    "phone": "415-555-1234"
  },
  "trackingUrl": "https://app.yourcompany.com/track/route-uuid"
}
```

**Errors**:
- `404 Not Found`: No active delivery for customer today

---

## Related Documentation

- [Sample Management Guide](./SAMPLE_MANAGEMENT_GUIDE.md)
- [Sample Analytics Guide](./SAMPLE_ANALYTICS_GUIDE.md)
- [Automated Triggers Guide](./AUTOMATED_TRIGGERS_GUIDE.md)
- [AI Recommendations Guide](./AI_RECOMMENDATIONS_GUIDE.md)
- [Warehouse Operations Guide](./WAREHOUSE_OPERATIONS_GUIDE.md)
- [Pick Sheet Guide](./PICK_SHEET_GUIDE.md)
- [Routing & Delivery Guide](./ROUTING_DELIVERY_GUIDE.md)
- [Warehouse Configuration Guide](./WAREHOUSE_CONFIGURATION_GUIDE.md)
- [Warehouse Quick Reference](./WAREHOUSE_QUICK_REFERENCE.md)
- [Azuga Integration Spec](./AZUGA_INTEGRATION_SPEC.md)
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [Deployment Guide](./DEPLOYMENT.md)

## Support

- **API Status**: https://status.yourapp.com
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Issues**: https://github.com/yourorg/yourrepo/issues
- **Support**: support@yourcompany.com

## Phase 7: Image Scanning & Email Marketing APIs

### Image Scanning

#### POST /api/scan/business-card

Upload and scan business card image using Claude Vision AI.

**Request** (multipart/form-data):
```
Content-Type: multipart/form-data

image: File (JPG, PNG, WEBP)
```

**Response** (202 Accepted):
```json
{
  "scanId": "uuid",
  "status": "pending",
  "type": "business_card",
  "imageUrl": "https://storage.supabase.co/...",
  "createdAt": "2025-01-25T10:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Missing image or invalid file type
- `413 Payload Too Large`: File exceeds 10MB limit
- `429 Too Many Requests`: Rate limit exceeded

---

#### POST /api/scan/license

Upload and scan liquor license document.

**Request** (multipart/form-data):
```
Content-Type: multipart/form-data

image: File (JPG, PNG, PDF)
state: string (optional - e.g., "CA")
```

**Response** (202 Accepted):
```json
{
  "scanId": "uuid",
  "status": "pending",
  "type": "liquor_license",
  "imageUrl": "https://storage.supabase.co/...",
  "metadata": {
    "state": "CA"
  },
  "createdAt": "2025-01-25T10:00:00Z"
}
```

---

#### GET /api/scan/[scanId]

Check scan processing status and retrieve extracted data.

**Response** (200 OK - Completed):
```json
{
  "scanId": "uuid",
  "status": "completed",
  "type": "business_card",
  "imageUrl": "https://storage.supabase.co/...",
  "extractedData": {
    "name": "John Smith",
    "title": "Sales Manager",
    "company": "Wine Distributors LLC",
    "email": "john.smith@winedist.com",
    "phone": "555-123-4567",
    "address": "123 Wine St, Napa, CA 94558",
    "website": "www.winedist.com"
  },
  "confidence": 0.92,
  "completedAt": "2025-01-25T10:00:08Z"
}
```

---

#### POST /api/scan/[scanId]

Update extracted data or create customer from scan.

**Request** (Create Customer):
```json
{
  "action": "create_customer",
  "extractedData": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "company": "Wine Bar Inc",
    "phone": "555-987-6543"
  }
}
```

**Response** (200 OK):
```json
{
  "scanId": "uuid",
  "customerId": "uuid",
  "customerCreated": true
}
```

---

### Mailchimp Integration

#### POST /api/mailchimp/sync

Sync customers to Mailchimp audience.

**Request**:
```json
{
  "customerIds": ["uuid1", "uuid2", "uuid3"],
  "listId": "abc123xyz0",
  "tags": ["ACTIVE", "VIP"]
}
```

**Response** (200 OK):
```json
{
  "synced": 150,
  "failed": 2,
  "errors": []
}
```

---

#### POST /api/mailchimp/campaigns

Create new email campaign.

**Request**:
```json
{
  "subject": "New Premium Wines This Week",
  "listId": "abc123xyz0",
  "segmentId": 123,
  "products": [
    {
      "id": "uuid",
      "name": "Chardonnay 2022",
      "price": 24.99
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "id": "campaign_2",
  "webId": 12346,
  "status": "save",
  "createdAt": "2025-01-25T10:10:00Z"
}
```

---

#### POST /api/mailchimp/campaigns/[id]/send

Send or schedule campaign.

**Response** (200 OK):
```json
{
  "success": true,
  "campaignId": "campaign_2",
  "recipientCount": 500
}
```

---
