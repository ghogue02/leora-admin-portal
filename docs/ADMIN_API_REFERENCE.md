# Admin API Reference

## Authentication

All admin API endpoints require authentication with a user that has the `sales.admin` role.

### Headers
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

### Error Responses
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User does not have admin role
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error

---

## Global Search

### Search Across Entities
**Endpoint**: `GET /api/admin/search`

Search across customers, orders, users, and products.

**Query Parameters**:
- `q` (required): Search query (minimum 2 characters)

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/search?q=acme" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
```json
{
  "results": [
    {
      "type": "customers",
      "label": "Customers",
      "results": [
        {
          "id": "uuid",
          "type": "customer",
          "title": "Acme Corporation",
          "subtitle": "contact@acme.com",
          "url": "/admin/customers/uuid"
        }
      ]
    },
    {
      "type": "orders",
      "label": "Orders",
      "results": [
        {
          "id": "uuid",
          "type": "order",
          "title": "Order 12345",
          "subtitle": "Acme Corporation - FULFILLED",
          "url": "/sales/admin/orders/uuid"
        }
      ]
    }
  ]
}
```

---

## Customers

### List Customers
**Endpoint**: `GET /api/admin/customers`

**Query Parameters**:
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 50)
- `search`: Search query
- `salesRepId`: Filter by sales rep UUID
- `riskStatus`: Filter by risk status (HEALTHY, AT_RISK, DORMANT, CHURNED)
- `sortBy`: Sort field (name, revenue, lastOrder)
- `sortOrder`: Sort order (asc, desc)

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/customers?page=1&pageSize=50&riskStatus=AT_RISK" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
```json
{
  "customers": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Get Customer Details
**Endpoint**: `GET /api/admin/customers/:id`

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/customers/uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
```json
{
  "id": "uuid",
  "accountName": "Acme Corporation",
  "accountNumber": "ACME001",
  "billingEmail": "billing@acme.com",
  "salesRep": {
    "id": "uuid",
    "name": "John Smith"
  },
  "riskStatus": "HEALTHY",
  "establishedRevenue": 50000.00,
  "lastOrderDate": "2025-09-15T00:00:00Z",
  "orderHistory": [...],
  "activities": [...]
}
```

### Create Customer
**Endpoint**: `POST /api/admin/customers`

**Request Body**:
```json
{
  "accountName": "New Company Inc",
  "billingEmail": "billing@newcompany.com",
  "salesRepId": "uuid",
  "phone": "+1234567890",
  "street1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "US"
}
```

**Example Response**:
```json
{
  "id": "uuid",
  "accountName": "New Company Inc",
  ...
}
```

### Update Customer
**Endpoint**: `PATCH /api/admin/customers/:id`

**Request Body**:
```json
{
  "accountName": "Updated Company Name",
  "salesRepId": "new-uuid"
}
```

### Bulk Reassign Customers
**Endpoint**: `POST /api/admin/customers/bulk-reassign`

**Request Body**:
```json
{
  "customerIds": ["uuid1", "uuid2", "uuid3"],
  "newSalesRepId": "uuid",
  "reason": "Territory realignment"
}
```

**Example Response**:
```json
{
  "success": true,
  "updated": 3,
  "failed": 0
}
```

---

## Sales Representatives

### List Sales Reps
**Endpoint**: `GET /api/admin/sales-reps`

**Query Parameters**:
- `page`: Page number
- `pageSize`: Items per page
- `isActive`: Filter by active status (true/false)

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/sales-reps?isActive=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Sales Rep Details
**Endpoint**: `GET /api/admin/sales-reps/:id`

**Example Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "John Smith",
  "email": "john@leora2.com",
  "isActive": true,
  "assignedCustomers": 45,
  "totalRevenue": 500000.00,
  "metrics": {
    "monthlyRevenue": 42000.00,
    "ordersThisMonth": 12
  }
}
```

---

## Orders

### List Orders
**Endpoint**: `GET /api/admin/orders`

**Query Parameters**:
- `page`: Page number
- `pageSize`: Items per page
- `customerId`: Filter by customer
- `status`: Filter by status (DRAFT, SUBMITTED, FULFILLED, CANCELLED)
- `startDate`: Filter by date range (start)
- `endDate`: Filter by date range (end)

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/orders?status=FULFILLED&startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Order Details
**Endpoint**: `GET /api/admin/orders/:id`

**Example Response**:
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "customer": {
    "accountName": "Acme Corporation"
  },
  "status": "FULFILLED",
  "orderedAt": "2025-09-01T10:00:00Z",
  "total": 5000.00,
  "lines": [
    {
      "skuId": "SKU001",
      "quantity": 100,
      "unitPrice": 50.00,
      "total": 5000.00
    }
  ]
}
```

### Update Order Status
**Endpoint**: `PATCH /api/admin/orders/:id/status`

**Request Body**:
```json
{
  "status": "FULFILLED",
  "reason": "Order processed and shipped"
}
```

---

## Inventory

### List Inventory
**Endpoint**: `GET /api/admin/inventory`

**Query Parameters**:
- `page`: Page number
- `pageSize`: Items per page
- `location`: Filter by location
- `skuId`: Filter by SKU
- `lowStock`: Filter by low stock (true/false)

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/inventory?location=WAREHOUSE_A" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Inventory Details
**Endpoint**: `GET /api/admin/inventory/:skuId`

**Example Response**:
```json
{
  "skuId": "SKU001",
  "description": "Product Name",
  "uom": "EA",
  "locations": [
    {
      "location": "WAREHOUSE_A",
      "onHand": 500,
      "allocated": 50,
      "available": 450
    }
  ],
  "pricing": {
    "retail": 100.00,
    "wholesale": 75.00
  }
}
```

### Adjust Inventory
**Endpoint**: `POST /api/admin/inventory/:skuId/adjust`

**Request Body**:
```json
{
  "location": "WAREHOUSE_A",
  "quantity": -10,
  "reason": "Damaged goods removed"
}
```

**Example Response**:
```json
{
  "success": true,
  "newQuantity": 490,
  "auditLogId": "uuid"
}
```

---

## Users

### List Users
**Endpoint**: `GET /api/admin/users`

**Query Parameters**:
- `page`: Page number
- `pageSize`: Items per page
- `type`: Filter by type (internal, portal)
- `isActive`: Filter by active status
- `role`: Filter by role

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/users?type=internal&isActive=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get User Details
**Endpoint**: `GET /api/admin/users/:id`

**Example Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "type": "internal",
  "roles": ["sales.admin"],
  "isActive": true,
  "lastLoginAt": "2025-10-19T09:30:00Z",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Create User
**Endpoint**: `POST /api/admin/users`

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "fullName": "New User",
  "type": "internal",
  "roles": ["sales.rep"],
  "sendInvite": true
}
```

### Update User
**Endpoint**: `PATCH /api/admin/users/:id`

**Request Body**:
```json
{
  "fullName": "Updated Name",
  "roles": ["sales.admin"]
}
```

### Deactivate User
**Endpoint**: `POST /api/admin/users/:id/deactivate`

**Request Body**:
```json
{
  "reason": "Employee left company"
}
```

---

## Audit Logs

### List Audit Logs
**Endpoint**: `GET /api/admin/audit-logs`

**Query Parameters**:
- `page`: Page number
- `pageSize`: Items per page
- `entityType`: Filter by entity type (Customer, Order, etc.)
- `entityId`: Filter by specific entity UUID
- `action`: Filter by action (CREATE, UPDATE, DELETE)
- `userId`: Filter by user UUID
- `startDate`: Filter by date range (start)
- `endDate`: Filter by date range (end)

**Example Request**:
```bash
curl -X GET "https://api.leora2.com/api/admin/audit-logs?entityType=Customer&action=UPDATE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "entityType": "Customer",
      "entityId": "uuid",
      "action": "UPDATE",
      "user": {
        "id": "uuid",
        "fullName": "John Smith"
      },
      "changes": {
        "salesRepId": {
          "before": "old-uuid",
          "after": "new-uuid"
        }
      },
      "metadata": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "createdAt": "2025-10-19T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 1500,
    "totalPages": 30
  }
}
```

### Get Audit Log Statistics
**Endpoint**: `GET /api/admin/audit-logs/stats`

**Query Parameters**:
- `startDate`: Statistics start date
- `endDate`: Statistics end date

**Example Response**:
```json
{
  "totalLogs": 15000,
  "byEntityType": {
    "Customer": 5000,
    "Order": 7000,
    "User": 3000
  },
  "byAction": {
    "CREATE": 2000,
    "UPDATE": 12000,
    "DELETE": 1000
  },
  "byUser": [
    {
      "userId": "uuid",
      "fullName": "John Smith",
      "count": 500
    }
  ],
  "timeline": [
    {
      "date": "2025-10-01",
      "count": 150
    }
  ]
}
```

---

## Data Integrity

### Run Integrity Check
**Endpoint**: `POST /api/admin/data-integrity/check`

**Request Body**:
```json
{
  "rules": ["orphaned-orders", "missing-sales-reps"], // Optional, defaults to all rules
  "autoFix": false
}
```

**Example Response**:
```json
{
  "checkId": "uuid",
  "startedAt": "2025-10-19T10:00:00Z",
  "status": "running"
}
```

### Get Check Results
**Endpoint**: `GET /api/admin/data-integrity/check/:checkId`

**Example Response**:
```json
{
  "checkId": "uuid",
  "status": "completed",
  "startedAt": "2025-10-19T10:00:00Z",
  "completedAt": "2025-10-19T10:05:00Z",
  "qualityScore": 95.5,
  "totalIssues": 10,
  "criticalIssues": 2,
  "issuesByRule": {
    "orphaned-orders": 5,
    "missing-sales-reps": 3,
    "negative-inventory": 2
  },
  "issues": [
    {
      "rule": "orphaned-orders",
      "severity": "high",
      "description": "Order has no associated customer",
      "entityId": "uuid",
      "canAutoFix": false
    }
  ]
}
```

---

## Export

### Export Data
**Endpoint**: `POST /api/admin/export`

**Request Body**:
```json
{
  "entityType": "customers",
  "format": "csv",
  "filters": {
    "riskStatus": "AT_RISK"
  },
  "columns": ["accountName", "billingEmail", "salesRep", "lastOrderDate"]
}
```

**Example Response**:
```json
{
  "exportId": "uuid",
  "status": "processing",
  "estimatedCompletion": "2025-10-19T10:05:00Z"
}
```

### Get Export Status
**Endpoint**: `GET /api/admin/export/:exportId`

**Example Response**:
```json
{
  "exportId": "uuid",
  "status": "completed",
  "downloadUrl": "https://cdn.leora2.com/exports/uuid.csv",
  "expiresAt": "2025-10-20T10:00:00Z",
  "recordCount": 150
}
```

---

## Rate Limits

- **Per User**: 100 requests per minute
- **Per IP**: 1000 requests per minute

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

When rate limit is exceeded:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Webhooks

Subscribe to real-time events from the admin portal.

### Available Events
- `customer.created`
- `customer.updated`
- `customer.deleted`
- `order.created`
- `order.status_changed`
- `inventory.adjusted`
- `user.created`
- `user.deactivated`

### Register Webhook
**Endpoint**: `POST /api/admin/webhooks`

**Request Body**:
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["customer.created", "order.status_changed"],
  "secret": "your-webhook-secret"
}
```

---

**Last Updated**: 2025-10-19
**API Version**: 1.0
