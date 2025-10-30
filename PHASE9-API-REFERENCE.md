# Phase 9: Data Integrity & Validation - API Reference

## Authentication

All endpoints require admin authentication via `withAdminSession()`.

**Required Roles**: `sales.admin` or `admin`

**Headers**:
```
Authorization: Bearer <session-token>
```

---

## GET /api/admin/data-integrity

Get current data integrity status and alerts.

### Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalIssues": 42,
      "criticalIssues": 15,
      "qualityScore": 87.5,
      "lastChecked": "2025-10-19T10:30:00Z",
      "cached": true
    },
    "alerts": [
      {
        "ruleId": "customers-without-sales-rep",
        "name": "Customers Without Sales Rep",
        "description": "Active customers that do not have an assigned sales representative",
        "severity": "high",
        "count": 15,
        "hasFix": true
      },
      {
        "ruleId": "orders-without-invoice",
        "name": "Orders Without Invoice",
        "description": "Fulfilled orders that do not have a linked invoice",
        "severity": "high",
        "count": 8,
        "hasFix": true
      }
    ]
  }
}
```

### Caching

- Results cached for 5 minutes
- Use `cached: true` in response to indicate cached data
- Manual check bypasses cache

### Error Response

```json
{
  "success": false,
  "error": "Failed to fetch data integrity status"
}
```

Status: `500 Internal Server Error`

---

## POST /api/admin/data-integrity/run-check

Manually trigger a fresh integrity check.

### Request

No body required.

### Response

```json
{
  "success": true,
  "data": {
    "totalIssues": 42,
    "criticalIssues": 15,
    "qualityScore": 87.5,
    "issuesByRule": {
      "customers-without-sales-rep": 15,
      "orders-without-invoice": 8,
      "customers-missing-email": 12,
      "invoice-amount-mismatch": 7
    },
    "timestamp": "2025-10-19T10:35:00Z"
  },
  "message": "Data integrity check completed successfully"
}
```

### Notes

- Runs all validation rules
- Saves snapshot to database
- Bypasses cache
- Can take 10-30 seconds depending on data size

---

## GET /api/admin/data-integrity/[ruleId]

Get detailed results for a specific validation rule.

### Path Parameters

- `ruleId` (required): Validation rule identifier

### Query Parameters

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Records per page

### Example Request

```
GET /api/admin/data-integrity/customers-without-sales-rep?page=1&limit=50
```

### Response

```json
{
  "success": true,
  "data": {
    "rule": {
      "id": "customers-without-sales-rep",
      "name": "Customers Without Sales Rep",
      "description": "Active customers that do not have an assigned sales representative",
      "severity": "high",
      "hasFix": true
    },
    "issueCount": 15,
    "affectedRecords": [
      {
        "id": "uuid-1",
        "entityType": "Customer",
        "details": {
          "name": "ABC Wine Shop",
          "accountNumber": "CUST-001",
          "billingEmail": "orders@abcwine.com",
          "lastOrderDate": "2025-10-15T00:00:00Z"
        }
      },
      {
        "id": "uuid-2",
        "entityType": "Customer",
        "details": {
          "name": "XYZ Liquor Store",
          "accountNumber": "CUST-002",
          "billingEmail": "manager@xyzliquor.com",
          "lastOrderDate": "2025-10-12T00:00:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

### Error Responses

**Rule Not Found**:
```json
{
  "success": false,
  "error": "Validation rule not found"
}
```
Status: `404 Not Found`

---

## POST /api/admin/data-integrity/[ruleId]/fix

Execute auto-fix for a validation rule.

### Path Parameters

- `ruleId` (required): Validation rule identifier

### Request Body

```json
{
  "recordIds": ["uuid-1", "uuid-2", "uuid-3"],
  "params": {
    "salesRepId": "uuid-4"
  }
}
```

**Fields**:
- `recordIds` (required): Array of record IDs to fix
- `params` (optional): Rule-specific parameters

### Rule-Specific Parameters

**customers-without-sales-rep**:
```json
{
  "params": {
    "salesRepId": "uuid"
  }
}
```

**missing-inventory-locations**:
```json
{
  "params": {
    "location": "MAIN"
  }
}
```

**orders-without-invoice**: No params required

**invoice-amount-mismatch**: No params required

**inactive-customers-with-orders**: No params required

**orphaned-portal-users**: No params required

### Response

```json
{
  "success": true,
  "data": {
    "successCount": 3,
    "ruleId": "customers-without-sales-rep",
    "ruleName": "Customers Without Sales Rep"
  },
  "message": "Successfully fixed 3 record(s)"
}
```

### Error Responses

**No Auto-Fix Available**:
```json
{
  "success": false,
  "error": "This rule does not have an auto-fix implementation"
}
```
Status: `400 Bad Request`

**Invalid Request**:
```json
{
  "success": false,
  "error": "recordIds array is required"
}
```
Status: `400 Bad Request`

**Fix Failed**:
```json
{
  "success": false,
  "error": "salesRepId is required"
}
```
Status: `500 Internal Server Error`

### Audit Log

All fixes are logged to `AuditLog`:
```sql
SELECT * FROM "AuditLog"
WHERE "entityType" = 'DataIntegrity'
AND "action" = 'FIX'
ORDER BY "createdAt" DESC;
```

---

## GET /api/admin/data-integrity/history

Get historical integrity snapshots for graphing.

### Query Parameters

- `days` (optional, default: 30): Number of days to retrieve

### Example Request

```
GET /api/admin/data-integrity/history?days=30
```

### Response

```json
{
  "success": true,
  "data": {
    "snapshots": [
      {
        "date": "2025-10-01T02:00:00Z",
        "qualityScore": 85.3,
        "totalIssues": 52,
        "criticalIssues": 18,
        "issuesByRule": {
          "customers-without-sales-rep": 20,
          "orders-without-invoice": 12
        }
      },
      {
        "date": "2025-10-02T02:00:00Z",
        "qualityScore": 87.1,
        "totalIssues": 45,
        "criticalIssues": 15,
        "issuesByRule": {
          "customers-without-sales-rep": 18,
          "orders-without-invoice": 10
        }
      }
    ],
    "period": {
      "days": 30,
      "start": "2025-10-01T02:00:00Z",
      "end": "2025-10-19T02:00:00Z"
    }
  }
}
```

### Use Case

Generate trend graphs showing:
- Quality score over time
- Issue count trends
- Critical issue resolution

---

## POST /api/admin/data-integrity/fix/assign-sales-reps

Bulk assign sales rep to customers.

### Request Body

```json
{
  "customerIds": ["uuid-1", "uuid-2", "uuid-3"],
  "salesRepId": "uuid-4"
}
```

**Fields**:
- `customerIds` (required): Array of customer IDs
- `salesRepId` (required): Sales rep ID to assign

### Response

```json
{
  "success": true,
  "data": {
    "updatedCount": 3,
    "salesRepName": "John Smith"
  },
  "message": "Assigned 3 customer(s) to John Smith"
}
```

### Error Responses

**Missing Fields**:
```json
{
  "success": false,
  "error": "customerIds array is required"
}
```
Status: `400 Bad Request`

**Sales Rep Not Found**:
```json
{
  "success": false,
  "error": "Sales rep not found"
}
```
Status: `404 Not Found`

---

## POST /api/admin/data-integrity/fix/create-invoices

Batch create invoices for fulfilled orders.

### Request Body

```json
{
  "orderIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Fields**:
- `orderIds` (required): Array of order IDs

### Response

```json
{
  "success": true,
  "data": {
    "createdCount": 3,
    "invoiceIds": ["inv-uuid-1", "inv-uuid-2", "inv-uuid-3"]
  },
  "message": "Created 3 invoice(s)"
}
```

### Notes

- Only processes FULFILLED orders
- Creates DRAFT invoices
- Copies order total to invoice
- Links invoice to customer

### Error Responses

**No Valid Orders**:
```json
{
  "success": false,
  "error": "No valid fulfilled orders found"
}
```
Status: `404 Not Found`

---

## POST /api/admin/data-integrity/fix/reactivate-customers

Bulk reactivate closed customers.

### Request Body

```json
{
  "customerIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Fields**:
- `customerIds` (required): Array of customer IDs

### Response

```json
{
  "success": true,
  "data": {
    "reactivatedCount": 3
  },
  "message": "Reactivated 3 customer(s)"
}
```

### Side Effects

Sets for each customer:
- `isPermanentlyClosed = false`
- `reactivatedDate = now()`
- `riskStatus = 'HEALTHY'`

---

## Validation Rules Reference

### Rule IDs and Severity

| Rule ID | Name | Severity | Has Fix |
|---------|------|----------|---------|
| `customers-without-sales-rep` | Customers Without Sales Rep | HIGH | ✅ |
| `orders-without-invoice` | Orders Without Invoice | HIGH | ✅ |
| `customers-missing-email` | Customers Missing Email | HIGH | ❌ |
| `invoice-amount-mismatch` | Invoice Amount Mismatch | HIGH | ✅ |
| `inactive-customers-with-orders` | Inactive Customers with Recent Orders | MEDIUM | ✅ |
| `sales-reps-no-customers` | Sales Reps with No Customers | MEDIUM | ❌ |
| `out-of-stock-in-price-lists` | Out of Stock in Price Lists | LOW | ❌ |
| `duplicate-customers` | Duplicate Customer Entries | HIGH | ❌ |
| `users-without-roles` | Users Without Roles | MEDIUM | ❌ |
| `orders-negative-totals` | Orders with Negative Totals | HIGH | ❌ |
| `orphaned-portal-users` | Orphaned Portal Users | HIGH | ✅ |
| `missing-inventory-locations` | Missing Inventory Locations | MEDIUM | ✅ |

### Record Details Structure

Each rule returns different details based on entity type:

**Customer Records**:
```json
{
  "id": "uuid",
  "entityType": "Customer",
  "details": {
    "name": "string",
    "accountNumber": "string",
    "billingEmail": "string",
    "lastOrderDate": "timestamp"
  }
}
```

**Order Records**:
```json
{
  "id": "uuid",
  "entityType": "Order",
  "details": {
    "customerName": "string",
    "orderedAt": "timestamp",
    "fulfilledAt": "timestamp",
    "total": "decimal"
  }
}
```

**Invoice Records**:
```json
{
  "id": "uuid",
  "entityType": "Invoice",
  "details": {
    "invoiceNumber": "string",
    "invoiceTotal": "decimal",
    "orderTotal": "decimal",
    "customerName": "string",
    "difference": "decimal"
  }
}
```

---

## Rate Limiting

No rate limiting currently implemented. Consider adding for production:
- Max 10 manual checks per hour
- Max 100 API calls per minute

---

## Webhooks (Future)

Planned webhook events:
- `integrity.check.completed`
- `integrity.critical_issues_found`
- `integrity.issue.fixed`

---

## Error Codes

| Code | Description |
|------|-------------|
| `RULE_NOT_FOUND` | Validation rule ID does not exist |
| `NO_FIX_AVAILABLE` | Rule has no auto-fix implementation |
| `INVALID_PARAMS` | Missing or invalid request parameters |
| `FIX_FAILED` | Auto-fix execution failed |
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |

---

## Best Practices

1. **Use Cached Results**: Don't run manual checks too frequently
2. **Batch Fixes**: Fix multiple records at once for efficiency
3. **Review Before Fixing**: Check affected records before applying fixes
4. **Monitor History**: Track quality score trends over time
5. **Schedule Checks**: Run automated checks during off-peak hours
6. **Set Alerts**: Monitor critical issues count
7. **Audit Regularly**: Review fix audit logs

---

## Testing

### cURL Examples

**Get Status**:
```bash
curl -X GET https://api.example.com/api/admin/data-integrity \
  -H "Authorization: Bearer <token>"
```

**Run Manual Check**:
```bash
curl -X POST https://api.example.com/api/admin/data-integrity/run-check \
  -H "Authorization: Bearer <token>"
```

**Get Rule Details**:
```bash
curl -X GET "https://api.example.com/api/admin/data-integrity/customers-without-sales-rep?page=1&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Execute Fix**:
```bash
curl -X POST https://api.example.com/api/admin/data-integrity/customers-without-sales-rep/fix \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recordIds": ["uuid-1", "uuid-2"],
    "params": {"salesRepId": "uuid-3"}
  }'
```

**Get History**:
```bash
curl -X GET "https://api.example.com/api/admin/data-integrity/history?days=30" \
  -H "Authorization: Bearer <token>"
```

### JavaScript Examples

**Using fetch**:
```javascript
// Get status
const response = await fetch('/api/admin/data-integrity');
const { data } = await response.json();

// Run manual check
await fetch('/api/admin/data-integrity/run-check', {
  method: 'POST',
});

// Execute fix
await fetch('/api/admin/data-integrity/customers-without-sales-rep/fix', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recordIds: ['uuid-1', 'uuid-2'],
    params: { salesRepId: 'uuid-3' },
  }),
});
```

---

## Support

For API questions or issues:
- Check audit logs: `SELECT * FROM "AuditLog" WHERE "entityType" = 'DataIntegrity'`
- Review server logs for detailed error messages
- Test with single record before bulk operations
- Verify authentication token is valid
