# Phase 2: Customer Management API Reference

Quick reference guide for all customer management API endpoints.

---

## Authentication

All endpoints require admin authentication via the `admin-session` cookie.

**Required Headers:**
```
Cookie: admin-session=<jwt-token>
```

**Authorization:**
- User must have admin role (`admin`, `sales.admin`, or `portal.admin`)
- All queries are tenant-scoped automatically

---

## Endpoints

### 1. List Customers

```
GET /api/admin/customers
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number for pagination |
| limit | number | 50 | Items per page (max 100) |
| search | string | - | Search in name, accountNumber, billingEmail |
| territory | string | - | Filter by sales rep territory |
| salesRepId | string | - | Filter by assigned sales rep ID |
| riskStatus | string | - | Comma-separated risk statuses |
| dateFrom | string | - | ISO date for last order date >= |
| dateTo | string | - | ISO date for last order date <= |
| sortBy | string | name | Sort column: name, accountNumber, lastOrderDate, riskStatus |
| sortOrder | string | asc | Sort direction: asc or desc |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/customers?page=1&limit=50&search=acme&riskStatus=HEALTHY,AT_RISK_CADENCE&sortBy=name&sortOrder=asc" \
  -H "Cookie: admin-session=<token>"
```

**Example Response:**
```json
{
  "customers": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "accountNumber": "CUST-000123",
      "billingEmail": "billing@acme.com",
      "phone": "(555) 123-4567",
      "territory": "Northeast",
      "salesRep": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@company.com"
      },
      "lastOrderDate": "2024-01-15T00:00:00Z",
      "totalOrders": 42,
      "riskStatus": "HEALTHY",
      "city": "New York",
      "state": "NY"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalCount": 150,
    "totalPages": 3
  }
}
```

---

### 2. Get Customer Details

```
GET /api/admin/customers/:id
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Customer UUID |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/customers/uuid-here" \
  -H "Cookie: admin-session=<token>"
```

**Example Response:**
```json
{
  "customer": {
    "id": "uuid",
    "name": "Acme Corp",
    "accountNumber": "CUST-000123",
    "billingEmail": "billing@acme.com",
    "phone": "(555) 123-4567",
    "street1": "123 Main St",
    "street2": "Suite 100",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "paymentTerms": "Net 30",
    "riskStatus": "HEALTHY",
    "lastOrderDate": "2024-01-15T00:00:00Z",
    "nextExpectedOrderDate": "2024-02-15T00:00:00Z",
    "averageOrderIntervalDays": 30,
    "isPermanentlyClosed": false,
    "closedReason": null,
    "salesRep": {
      "id": "uuid",
      "territoryName": "Northeast",
      "user": {
        "fullName": "John Doe",
        "email": "john@company.com"
      }
    },
    "portalUsers": [
      {
        "id": "uuid",
        "fullName": "Jane Smith",
        "email": "jane@acme.com",
        "status": "ACTIVE",
        "lastLoginAt": "2024-01-10T12:00:00Z"
      }
    ],
    "orders": [...],
    "invoices": [...],
    "totalRevenue": 125000.00,
    "totalOrders": 42,
    "openInvoicesCount": 3,
    "outstandingAmount": 5000.00,
    "daysSinceLastOrder": 5
  }
}
```

---

### 3. Create Customer

```
POST /api/admin/customers
```

**Request Body:**
```json
{
  "name": "New Customer Inc",
  "billingEmail": "billing@newcustomer.com",
  "phone": "(555) 987-6543",
  "street1": "456 Oak Ave",
  "street2": "Floor 2",
  "city": "Boston",
  "state": "MA",
  "postalCode": "02101",
  "country": "US",
  "paymentTerms": "Net 30",
  "accountNumber": "",
  "salesRepId": "uuid-of-sales-rep"
}
```

**Required Fields:**
- name
- billingEmail
- street1 (implicitly required)
- city (implicitly required)
- state (implicitly required)
- postalCode (implicitly required)

**Optional Fields:**
- phone
- street2
- country (default: "US")
- paymentTerms (default: "Net 30")
- accountNumber (auto-generated if empty)
- salesRepId

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/customers" \
  -H "Cookie: admin-session=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Customer Inc",
    "billingEmail": "billing@newcustomer.com",
    "phone": "(555) 987-6543",
    "street1": "456 Oak Ave",
    "city": "Boston",
    "state": "MA",
    "postalCode": "02101"
  }'
```

**Example Response:**
```json
{
  "customer": {
    "id": "new-uuid",
    "name": "New Customer Inc",
    "accountNumber": "CUST-000456",
    "billingEmail": "billing@newcustomer.com",
    ...
  }
}
```

**Error Responses:**
- 400: Missing required fields
- 409: Duplicate account number

---

### 4. Update Customer

```
PUT /api/admin/customers/:id
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Customer UUID |

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "billingEmail": "new-email@customer.com",
  "phone": "(555) 111-2222",
  "street1": "789 New St",
  "street2": "Apt 5",
  "city": "Chicago",
  "state": "IL",
  "postalCode": "60601",
  "country": "US",
  "paymentTerms": "Net 45",
  "salesRepId": "new-sales-rep-uuid",
  "isPermanentlyClosed": false,
  "closedReason": null,
  "updateReason": "Customer requested address change"
}
```

**Allowed Fields:**
- name, billingEmail, phone
- street1, street2, city, state, postalCode, country
- paymentTerms, salesRepId
- isPermanentlyClosed, closedReason
- updateReason (for audit log only)

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/admin/customers/uuid-here" \
  -H "Cookie: admin-session=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentTerms": "Net 45",
    "updateReason": "Negotiated new terms"
  }'
```

**Example Response:**
```json
{
  "customer": {
    "id": "uuid",
    "name": "Acme Corp",
    "paymentTerms": "Net 45",
    ...
  }
}
```

**Error Responses:**
- 404: Customer not found
- 409: Account number already exists

---

### 5. Reassign Customer

```
POST /api/admin/customers/:id/reassign
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Customer UUID |

**Request Body:**
```json
{
  "newSalesRepId": "uuid-of-new-sales-rep",
  "reason": "Territory realignment"
}
```

**Required Fields:**
- newSalesRepId

**Optional Fields:**
- reason (for audit log)

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/customers/uuid-here/reassign" \
  -H "Cookie: admin-session=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newSalesRepId": "new-rep-uuid",
    "reason": "Rep territory change"
  }'
```

**Example Response:**
```json
{
  "customer": {
    "id": "uuid",
    "name": "Acme Corp",
    "salesRepId": "new-rep-uuid",
    "salesRep": {
      "id": "new-rep-uuid",
      "territoryName": "Southeast",
      "user": {
        "fullName": "Jane Doe",
        "email": "jane@company.com"
      }
    },
    ...
  },
  "message": "Customer reassigned successfully"
}
```

**What Happens:**
1. Marks old CustomerAssignment as unassigned (sets unassignedAt)
2. Creates new CustomerAssignment record
3. Updates Customer.salesRepId
4. Logs change to AuditLog

**Error Responses:**
- 400: Missing newSalesRepId
- 404: Customer or sales rep not found

---

### 6. Bulk Reassign Customers

```
POST /api/admin/customers/bulk-reassign
```

**Request Body:**
```json
{
  "customerIds": ["uuid1", "uuid2", "uuid3"],
  "newSalesRepId": "uuid-of-new-sales-rep",
  "reason": "Q1 territory restructuring"
}
```

**Required Fields:**
- customerIds (array of UUIDs)
- newSalesRepId

**Optional Fields:**
- reason (for audit log)

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/customers/bulk-reassign" \
  -H "Cookie: admin-session=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerIds": ["uuid1", "uuid2", "uuid3"],
    "newSalesRepId": "new-rep-uuid",
    "reason": "Territory realignment"
  }'
```

**Example Response:**
```json
{
  "message": "Bulk reassignment completed. 3 successful, 0 failed.",
  "results": {
    "successful": ["uuid1", "uuid2", "uuid3"],
    "failed": []
  }
}
```

**Partial Failure Response:**
```json
{
  "message": "Bulk reassignment completed. 2 successful, 1 failed.",
  "results": {
    "successful": ["uuid1", "uuid2"],
    "failed": [
      {
        "id": "uuid3",
        "error": "Customer not found"
      }
    ]
  }
}
```

**Error Responses:**
- 400: Missing or invalid customerIds
- 404: Sales rep not found

---

### 7. Export Customers to CSV

```
POST /api/admin/customers/export
```

**Request Body (Option 1: Export specific customers):**
```json
{
  "customerIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Request Body (Option 2: Export with filters):**
```json
{
  "filters": {
    "search": "acme",
    "territory": "Northeast",
    "salesRepId": "uuid",
    "riskStatus": "HEALTHY,AT_RISK_CADENCE"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/customers/export" \
  -H "Cookie: admin-session=<token>" \
  -H "Content-Type: application/json" \
  -d '{"filters": {"riskStatus": "AT_RISK_CADENCE,DORMANT"}}' \
  --output customers-export.csv
```

**Response:**
- Content-Type: text/csv
- Content-Disposition: attachment; filename="customers-export-YYYY-MM-DD.csv"
- CSV file with columns:
  - Customer ID, Account Number, Customer Name, Billing Email, Phone
  - Street, City, State, Postal Code
  - Territory, Sales Rep, Sales Rep Email
  - Last Order Date, Total Orders, Total Revenue
  - Risk Status, Payment Terms

**CSV Example:**
```csv
Customer ID,Account Number,Customer Name,Billing Email,Phone,Street,City,State,Postal Code,Territory,Sales Rep,Sales Rep Email,Last Order Date,Total Orders,Total Revenue,Risk Status,Payment Terms
uuid1,CUST-000123,Acme Corp,billing@acme.com,(555) 123-4567,123 Main St,New York,NY,10001,Northeast,John Doe,john@company.com,2024-01-15,42,125000.00,HEALTHY,Net 30
```

---

### 8. List Sales Reps (Helper Endpoint)

```
GET /api/admin/sales-reps
```

**Query Parameters:** None

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/sales-reps" \
  -H "Cookie: admin-session=<token>"
```

**Example Response:**
```json
{
  "salesReps": [
    {
      "id": "uuid1",
      "territoryName": "Northeast",
      "deliveryDay": "Monday",
      "isActive": true,
      "user": {
        "fullName": "John Doe",
        "email": "john@company.com"
      }
    },
    {
      "id": "uuid2",
      "territoryName": "Southeast",
      "deliveryDay": "Tuesday",
      "isActive": true,
      "user": {
        "fullName": "Jane Smith",
        "email": "jane@company.com"
      }
    }
  ]
}
```

**Use Cases:**
- Populate dropdowns in UI
- Customer reassignment modals
- New customer form

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

**Common HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (not admin)
- 404: Not Found
- 409: Conflict (duplicate)
- 500: Internal Server Error

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding in production:
- 100 requests per minute per user
- 1000 requests per hour per tenant

---

## Testing with cURL

**Example workflow:**

1. **Login and get session cookie** (use existing auth endpoint)
2. **List customers:**
   ```bash
   curl -X GET "http://localhost:3000/api/admin/customers?page=1&limit=10" \
     -H "Cookie: admin-session=<token>" | jq
   ```

3. **Create customer:**
   ```bash
   curl -X POST "http://localhost:3000/api/admin/customers" \
     -H "Cookie: admin-session=<token>" \
     -H "Content-Type: application/json" \
     -d @new-customer.json
   ```

4. **Get customer details:**
   ```bash
   curl -X GET "http://localhost:3000/api/admin/customers/<customer-id>" \
     -H "Cookie: admin-session=<token>" | jq
   ```

5. **Update customer:**
   ```bash
   curl -X PUT "http://localhost:3000/api/admin/customers/<customer-id>" \
     -H "Cookie: admin-session=<token>" \
     -H "Content-Type: application/json" \
     -d '{"paymentTerms": "Net 45"}'
   ```

6. **Reassign customer:**
   ```bash
   curl -X POST "http://localhost:3000/api/admin/customers/<customer-id>/reassign" \
     -H "Cookie: admin-session=<token>" \
     -H "Content-Type: application/json" \
     -d '{"newSalesRepId": "<sales-rep-id>", "reason": "Territory change"}'
   ```

7. **Export customers:**
   ```bash
   curl -X POST "http://localhost:3000/api/admin/customers/export" \
     -H "Cookie: admin-session=<token>" \
     -H "Content-Type: application/json" \
     -d '{}' \
     --output all-customers.csv
   ```

---

## Postman Collection

Import this JSON to test all endpoints:

```json
{
  "info": {
    "name": "Customer Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{adminToken}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "List Customers",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/api/admin/customers?page=1&limit=50",
          "host": ["{{baseUrl}}"],
          "path": ["api", "admin", "customers"],
          "query": [
            {"key": "page", "value": "1"},
            {"key": "limit", "value": "50"}
          ]
        }
      }
    }
    // ... add other endpoints
  ]
}
```

---

## Audit Logging

All mutating operations are logged to AuditLog:

**Logged Actions:**
- CREATE: New customer creation
- UPDATE: Customer field updates
- REASSIGN: Sales rep reassignment

**Audit Entry Structure:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "userId": "uuid",
  "entityType": "Customer",
  "entityId": "customer-uuid",
  "action": "UPDATE",
  "changes": {
    "paymentTerms": {
      "old": "Net 30",
      "new": "Net 45"
    }
  },
  "metadata": {
    "reason": "Customer requested",
    "ipAddress": "192.168.1.1"
  },
  "createdAt": "2024-01-15T12:00:00Z"
}
```

---

## Next Steps

1. Add pagination metadata to headers (X-Total-Count, Link)
2. Implement field-level filtering (e.g., ?fields=id,name,email)
3. Add batch operations endpoint
4. Implement webhook notifications
5. Add GraphQL alternative
6. Create OpenAPI/Swagger documentation
