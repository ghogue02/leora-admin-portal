# PHASE 3: API REFERENCE - Sales Rep & Territory Management

## Authentication
All endpoints require `sales.admin` or `admin` role via `withSalesSession()` middleware.

---

## Sales Rep Endpoints

### 1. List Sales Reps
```
GET /api/sales/admin/sales-reps
```

**Query Parameters:**
- `territory` (optional) - Filter by territory name
- `status` (optional) - Filter by "active" or "inactive"
- `search` (optional) - Search by name or email

**Response:**
```json
{
  "reps": [
    {
      "id": "uuid",
      "userId": "uuid",
      "territoryName": "North District",
      "deliveryDay": "Tuesday",
      "weeklyRevenueQuota": 5000,
      "monthlyRevenueQuota": 20000,
      "annualRevenueQuota": 240000,
      "sampleAllowancePerMonth": 60,
      "isActive": true,
      "user": {
        "id": "uuid",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "performance": {
        "ytdRevenue": 150000,
        "ordersThisWeek": 12,
        "customerCount": 45,
        "activeCustomerCount": 38,
        "quotaAchievementPercent": 62.5
      }
    }
  ]
}
```

---

### 2. Get Sales Rep Details
```
GET /api/sales/admin/sales-reps/:id
```

**Response:**
```json
{
  "rep": {
    "id": "uuid",
    "userId": "uuid",
    "territoryName": "North District",
    "deliveryDay": "Tuesday",
    "weeklyRevenueQuota": 5000,
    "monthlyRevenueQuota": 20000,
    "quarterlyRevenueQuota": 60000,
    "annualRevenueQuota": 240000,
    "weeklyCustomerQuota": 15,
    "sampleAllowancePerMonth": 60,
    "isActive": true,
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "performance": {
      "ytdRevenue": 150000,
      "ytdOrders": 450,
      "annualQuotaPercent": 62.5,
      "customersAssigned": 45,
      "activeCustomers": 38
    },
    "productGoals": [
      {
        "id": "uuid",
        "skuId": "uuid",
        "targetRevenue": 50000,
        "targetCases": 200,
        "periodStart": "2025-01-01T00:00:00Z",
        "periodEnd": "2025-03-31T23:59:59Z",
        "sku": {
          "code": "SKU-001",
          "product": {
            "name": "Product Name"
          }
        }
      }
    ]
  }
}
```

---

### 3. Update Sales Rep
```
PUT /api/sales/admin/sales-reps/:id
```

**Request Body:**
```json
{
  "territoryName": "South District",
  "deliveryDay": "Wednesday",
  "weeklyRevenueQuota": 6000,
  "monthlyRevenueQuota": 25000,
  "quarterlyRevenueQuota": 75000,
  "annualRevenueQuota": 300000,
  "weeklyCustomerQuota": 20,
  "sampleAllowancePerMonth": 80,
  "isActive": true
}
```

**Validation Rules:**
- All quota values must be >= 0
- Sample allowance must be >= 0
- Returns 400 with error message for invalid values

**Response:**
```json
{
  "rep": {
    "id": "uuid",
    "userId": "uuid",
    "territoryName": "South District",
    "deliveryDay": "Wednesday",
    // ... (all updated fields)
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Audit Logging:**
- Creates AuditLog entry with action "UPDATE"
- Captures all changed fields in `changes` JSON
- Includes user context in `metadata`

---

### 4. Change Territory
```
PUT /api/sales/admin/sales-reps/:id/territory
```

**Request Body:**
```json
{
  "newTerritoryName": "West District",
  "reassignCustomers": true
}
```

**Parameters:**
- `newTerritoryName` (required) - New territory name
- `reassignCustomers` (optional) - Whether to reassign customers (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Territory updated successfully",
  "changes": {
    "oldTerritory": "North District",
    "newTerritory": "West District",
    "customersAffected": 45
  }
}
```

**Transaction Details:**
- Updates SalesRep.territoryName
- If `reassignCustomers` is true, creates CustomerAssignment records
- All changes happen atomically in a transaction

**Audit Logging:**
- Creates AuditLog entry with action "TERRITORY_CHANGE"
- Captures old/new territory in `changes` JSON
- Includes customer count and rep details in `metadata`

---

## Territory Endpoints

### 5. List Territories
```
GET /api/sales/admin/territories
```

**Response:**
```json
{
  "territories": [
    {
      "territoryName": "North District",
      "repCount": 3,
      "customerCount": 120,
      "totalRevenue": 450000,
      "primaryRep": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "territoryName": "South District",
      "repCount": 2,
      "customerCount": 85,
      "totalRevenue": 320000,
      "primaryRep": {
        "id": "uuid",
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    }
  ]
}
```

**Calculation Notes:**
- `repCount`: Number of SalesRep records with this territoryName
- `customerCount`: Sum of customers across all reps in territory
- `totalRevenue`: Sum of all orders for customers in territory
- `primaryRep`: First active rep, or first rep if none active

---

### 6. Get Territory Details
```
GET /api/sales/admin/territories/:name
```

**URL Parameter:**
- `:name` - Territory name (URL-encoded)

**Response:**
```json
{
  "territory": {
    "territoryName": "North District",
    "salesReps": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "customerCount": 45,
        "isActive": true
      },
      {
        "id": "uuid",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "customerCount": 38,
        "isActive": true
      }
    ],
    "customers": [
      {
        "id": "uuid",
        "name": "Customer ABC Corp",
        "lastOrderDate": "2025-10-15T00:00:00Z"
      },
      {
        "id": "uuid",
        "name": "Customer XYZ Inc",
        "lastOrderDate": "2025-10-10T00:00:00Z"
      }
    ],
    "revenueByQuarter": [
      {
        "quarter": "Q1 2025",
        "revenue": 120000
      },
      {
        "quarter": "Q2 2025",
        "revenue": 135000
      },
      {
        "quarter": "Q3 2025",
        "revenue": 145000
      },
      {
        "quarter": "Q4 2025",
        "revenue": 50000
      }
    ]
  }
}
```

**Data Processing:**
- Customers list removes duplicates (if assigned to multiple reps)
- Revenue by quarter shows all 4 quarters of current year
- Quarters are calculated based on calendar year (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Weekly revenue quota must be >= 0"
}
```

### 401 Unauthorized
```json
{
  "error": "Not authenticated."
}
```

### 403 Forbidden
```json
{
  "error": "Missing required role."
}
```

### 404 Not Found
```json
{
  "error": "Sales rep not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to update territory"
}
```

---

## Audit Log Schema

All changes are logged to the `AuditLog` table:

```typescript
{
  id: string;              // UUID
  tenantId: string;        // Tenant UUID
  userId: string | null;   // User who made change
  entityType: string;      // "SalesRep"
  entityId: string;        // SalesRep UUID
  action: string;          // "UPDATE" | "TERRITORY_CHANGE"
  changes: object | null;  // Changed fields
  metadata: object | null; // Additional context
  createdAt: Date;         // Timestamp
}
```

**Example Audit Log Entry:**
```json
{
  "id": "audit-uuid",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "entityType": "SalesRep",
  "entityId": "rep-uuid",
  "action": "UPDATE",
  "changes": {
    "weeklyRevenueQuota": 6000,
    "monthlyRevenueQuota": 25000,
    "isActive": true
  },
  "metadata": {
    "updatedBy": "admin@example.com",
    "updatedByName": "Admin User"
  },
  "createdAt": "2025-10-19T14:30:00Z"
}
```

---

## Performance Metrics

### YTD Revenue Calculation
```typescript
// Aggregates all non-cancelled orders delivered this year
const ytdStats = await db.order.aggregate({
  where: {
    tenantId,
    customer: { salesRepId: repId },
    deliveredAt: { gte: yearStart },
    status: { not: "CANCELLED" },
  },
  _sum: { total: true },
  _count: true,
});
```

### Active Customer Definition
Customers with orders in the last 45 days:
```typescript
const fortyFiveDaysAgo = new Date(now);
fortyFiveDaysAgo.setDate(now.getDate() - 45);

const activeCustomers = customers.filter(customer => {
  if (!customer.lastOrderDate) return false;
  return new Date(customer.lastOrderDate) >= fortyFiveDaysAgo;
}).length;
```

### Quota Achievement Calculation
```typescript
const quotaAchievementPercent = 
  annualQuota > 0 
    ? (ytdRevenue / annualQuota) * 100 
    : 0;
```

---

## Rate Limiting & Caching

**Current Implementation:**
- No rate limiting (relies on auth)
- No caching (always fresh data)

**Recommendations:**
- Add Redis caching for territory lists (TTL: 5 minutes)
- Add rate limiting for PUT endpoints (10 requests/minute)
- Consider ETags for GET endpoints

---

## Testing Examples

### cURL Examples

**List Sales Reps:**
```bash
curl -X GET "http://localhost:3000/api/sales/admin/sales-reps?territory=North%20District&status=active" \
  -H "Cookie: sales-session-id=YOUR_SESSION_ID" \
  -H "X-Tenant-Slug: your-tenant"
```

**Update Sales Rep:**
```bash
curl -X PUT "http://localhost:3000/api/sales/admin/sales-reps/rep-uuid" \
  -H "Cookie: sales-session-id=YOUR_SESSION_ID" \
  -H "X-Tenant-Slug: your-tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "weeklyRevenueQuota": 6000,
    "isActive": true
  }'
```

**Change Territory:**
```bash
curl -X PUT "http://localhost:3000/api/sales/admin/sales-reps/rep-uuid/territory" \
  -H "Cookie: sales-session-id=YOUR_SESSION_ID" \
  -H "X-Tenant-Slug: your-tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "newTerritoryName": "West District",
    "reassignCustomers": true
  }'
```

---

## Database Indexes

Ensure these indexes exist for optimal performance:

```sql
-- SalesRep indexes
CREATE INDEX idx_salesrep_tenant_territory ON "SalesRep"("tenantId", "territoryName");
CREATE INDEX idx_salesrep_tenant_active ON "SalesRep"("tenantId", "isActive");

-- Customer indexes
CREATE INDEX idx_customer_salesrep ON "Customer"("salesRepId");
CREATE INDEX idx_customer_lastorder ON "Customer"("lastOrderDate");

-- Order indexes
CREATE INDEX idx_order_customer_delivered ON "Order"("customerId", "deliveredAt");
CREATE INDEX idx_order_tenant_delivered ON "Order"("tenantId", "deliveredAt");

-- AuditLog indexes (already exist)
CREATE INDEX idx_auditlog_tenant ON "AuditLog"("tenantId");
CREATE INDEX idx_auditlog_entity ON "AuditLog"("tenantId", "entityType", "entityId");
CREATE INDEX idx_auditlog_user ON "AuditLog"("userId");
CREATE INDEX idx_auditlog_created ON "AuditLog"("createdAt");
```

---

## Version History

**v1.0.0** - October 19, 2025
- Initial implementation
- Sales rep CRUD operations
- Territory management
- Audit logging
- Performance metrics
