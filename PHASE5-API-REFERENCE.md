# PHASE 5: User Account Management API Reference

Quick reference guide for all user account management endpoints.

---

## Authentication

All endpoints require admin authentication via `withAdminSession()` middleware.

**Required Headers:**
```
Cookie: sales-session-id=<session-token>
```

**Admin Roles:** `admin`, `sales.admin`, or `portal.admin`

---

## Internal Users API

### List Internal Users

```
GET /api/admin/accounts/users
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Results per page |
| search | string | - | Search name/email |
| role | string | - | Filter by role code |
| status | string | - | 'active' or 'inactive' |
| territory | string | - | Filter by territory |
| sortBy | string | fullName | Sort field |
| sortOrder | string | asc | 'asc' or 'desc' |

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "roles": [{ "id": "uuid", "name": "Admin", "code": "admin" }],
      "primaryRole": "Admin",
      "territory": "Northeast",
      "linkedSalesRepId": "uuid",
      "isActive": true,
      "lastLoginAt": "2025-10-19T12:00:00Z",
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-10-19T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalCount": 100,
    "totalPages": 2
  }
}
```

---

### Get User Details

```
GET /api/admin/accounts/users/:id
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "isActive": true,
    "lastLoginAt": "2025-10-19T12:00:00Z",
    "createdAt": "2025-10-01T10:00:00Z",
    "updatedAt": "2025-10-19T11:00:00Z",
    "roles": [
      {
        "id": "uuid",
        "name": "Admin",
        "code": "admin",
        "permissions": [
          { "id": "uuid", "code": "users.read", "name": "Read Users" }
        ]
      }
    ],
    "permissions": ["users.read", "users.write", "customers.read"],
    "salesRep": {
      "id": "uuid",
      "territoryName": "Northeast",
      "deliveryDay": "Monday",
      "weeklyRevenueQuota": "10000.00",
      "monthlyRevenueQuota": "40000.00",
      "quarterlyRevenueQuota": "120000.00",
      "annualRevenueQuota": "480000.00",
      "weeklyCustomerQuota": 20,
      "sampleAllowancePerMonth": 60,
      "isActive": true,
      "customers": [
        { "id": "uuid", "name": "Acme Corp", "accountNumber": "CUST-001" }
      ]
    }
  }
}
```

---

### Create Internal User

```
POST /api/admin/accounts/users
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "fullName": "Jane Smith",
  "password": "securepassword123",
  "roleIds": ["role-uuid-1", "role-uuid-2"],
  "createSalesRep": true,
  "territoryName": "California"
}
```

**Required Fields:**
- `email` (string, valid email format)
- `fullName` (string)
- `password` (string, min 8 characters)

**Optional Fields:**
- `roleIds` (array of role UUIDs)
- `createSalesRep` (boolean)
- `territoryName` (string, required if createSalesRep=true)

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "fullName": "Jane Smith",
    "isActive": true,
    "roles": [...],
    "salesRepProfile": {...}
  }
}
```

**Errors:**
- `400` - Validation error (invalid email, weak password, etc.)
- `409` - Duplicate email

---

### Update Internal User

```
PUT /api/admin/accounts/users/:id
```

**Request Body:**
```json
{
  "email": "updated@example.com",
  "fullName": "Updated Name",
  "isActive": false
}
```

**All fields optional.** Only provided fields will be updated.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "updated@example.com",
    "fullName": "Updated Name",
    "isActive": false,
    ...
  }
}
```

**Errors:**
- `400` - Invalid email format
- `404` - User not found
- `409` - Email already in use

---

### Update User Roles

```
PUT /api/admin/accounts/users/:id/roles
```

**Request Body:**
```json
{
  "roleIds": ["role-uuid-1", "role-uuid-2", "role-uuid-3"]
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "roles": [
      {
        "id": "role-uuid-1",
        "name": "Admin",
        "code": "admin",
        "permissions": [...]
      }
    ]
  },
  "message": "Roles updated successfully"
}
```

**Errors:**
- `400` - Invalid role IDs
- `404` - User not found

---

### Deactivate User

```
DELETE /api/admin/accounts/users/:id
```

**Response:**
```json
{
  "success": true
}
```

**Note:** This is a soft delete. User's `isActive` field is set to `false`.

---

## Portal Users API

### List Portal Users

```
GET /api/admin/accounts/portal-users
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Results per page |
| search | string | - | Search name/email |
| role | string | - | Filter by role code |
| status | string | - | ACTIVE, INVITED, DISABLED |
| customerId | string | - | Filter by customer ID |
| sortBy | string | fullName | Sort field |
| sortOrder | string | asc | 'asc' or 'desc' |

**Response:**
```json
{
  "portalUsers": [
    {
      "id": "uuid",
      "email": "customer@example.com",
      "fullName": "Bob Customer",
      "portalUserKey": "key-123",
      "status": "ACTIVE",
      "roles": [{ "id": "uuid", "name": "Portal Viewer", "code": "portal.viewer" }],
      "primaryRole": "Portal Viewer",
      "customer": {
        "id": "uuid",
        "name": "Acme Corp",
        "accountNumber": "CUST-001"
      },
      "lastLoginAt": "2025-10-19T12:00:00Z",
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-10-19T11:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### Get Portal User Details

```
GET /api/admin/accounts/portal-users/:id
```

**Response:**
```json
{
  "portalUser": {
    "id": "uuid",
    "email": "customer@example.com",
    "fullName": "Bob Customer",
    "portalUserKey": "key-123",
    "status": "ACTIVE",
    "lastLoginAt": "2025-10-19T12:00:00Z",
    "createdAt": "2025-10-01T10:00:00Z",
    "updatedAt": "2025-10-19T11:00:00Z",
    "roles": [...],
    "permissions": ["orders.read", "orders.create"],
    "customer": {
      "id": "uuid",
      "name": "Acme Corp",
      "accountNumber": "CUST-001",
      "billingEmail": "billing@acme.com",
      "phone": "555-1234",
      "city": "New York",
      "state": "NY",
      "salesRep": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@company.com",
        "territoryName": "Northeast"
      }
    },
    "recentSessions": [
      {
        "id": "uuid",
        "createdAt": "2025-10-19T10:00:00Z",
        "expiresAt": "2025-10-26T10:00:00Z"
      }
    ]
  }
}
```

---

### Create Portal User

```
POST /api/admin/accounts/portal-users
```

**Request Body:**
```json
{
  "email": "newcustomer@example.com",
  "fullName": "Alice Customer",
  "customerId": "customer-uuid",
  "roleIds": ["portal-role-uuid"]
}
```

**Required Fields:**
- `email` (string, valid email)
- `fullName` (string)
- `customerId` (string, must exist)

**Optional Fields:**
- `roleIds` (array of role UUIDs)

**Response:**
```json
{
  "portalUser": {
    "id": "uuid",
    "email": "newcustomer@example.com",
    "fullName": "Alice Customer",
    "status": "INVITED",
    "customer": {...},
    "roles": [...]
  }
}
```

**Errors:**
- `400` - Validation error
- `404` - Customer not found
- `409` - Duplicate email

---

### Update Portal User

```
PUT /api/admin/accounts/portal-users/:id
```

**Request Body:**
```json
{
  "email": "updated@example.com",
  "fullName": "Updated Name",
  "customerId": "new-customer-uuid",
  "status": "ACTIVE"
}
```

**All fields optional.**

**Status Options:** `ACTIVE`, `INVITED`, `DISABLED`

**Response:**
```json
{
  "portalUser": {
    "id": "uuid",
    "email": "updated@example.com",
    "status": "ACTIVE",
    ...
  }
}
```

---

### Update Portal User Roles

```
PUT /api/admin/accounts/portal-users/:id/roles
```

**Request Body:**
```json
{
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}
```

**Response:**
```json
{
  "portalUser": {
    "id": "uuid",
    "roles": [...]
  },
  "message": "Roles updated successfully"
}
```

---

### Disable Portal User

```
DELETE /api/admin/accounts/portal-users/:id
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Sets status to `DISABLED`.

---

## Helper APIs

### List Roles

```
GET /api/admin/roles
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | - | 'internal' or 'portal' filter |

**Response:**
```json
{
  "roles": [
    {
      "id": "uuid",
      "name": "Admin",
      "code": "admin",
      "isDefault": false,
      "permissions": [
        { "id": "uuid", "code": "users.read", "name": "Read Users" }
      ],
      "userCount": 5,
      "portalUserCount": 0,
      "totalAssigned": 5,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-10-01T00:00:00Z"
    }
  ]
}
```

---

### List Permissions

```
GET /api/admin/permissions
```

**Response:**
```json
{
  "permissions": [
    {
      "id": "uuid",
      "code": "users.read",
      "name": "Read Users",
      "roles": [
        { "id": "uuid", "name": "Admin", "code": "admin" }
      ],
      "roleCount": 3,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "error": "Not authenticated."
}
```

### 403 Forbidden
```json
{
  "error": "Access denied. Admin privileges required."
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 409 Conflict
```json
{
  "error": "User with this email already exists"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid email format"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch users"
}
```

---

## Audit Logging

All user account operations are automatically logged to the `AuditLog` table:

**Logged Operations:**
- User creation (CREATE)
- User updates (UPDATE)
- Role changes (UPDATE)
- Status changes (STATUS_CHANGE)
- Deactivation/disabling

**Logged Data:**
- Tenant ID
- User ID (actor)
- Entity Type (User or PortalUser)
- Entity ID
- Action
- Changes (before/after values)
- Metadata (IP address, reason)
- Timestamp

---

## Rate Limiting

**Current Implementation:** None

**Recommendation:** Implement rate limiting for production:
- User creation: 10 requests/minute
- Role updates: 30 requests/minute
- List queries: 100 requests/minute

---

## Testing Examples

### cURL Examples

**List Users:**
```bash
curl -X GET 'http://localhost:3000/api/admin/accounts/users?page=1&limit=10&search=john' \
  -H 'Cookie: sales-session-id=your-session-token'
```

**Create User:**
```bash
curl -X POST 'http://localhost:3000/api/admin/accounts/users' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sales-session-id=your-session-token' \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "password": "password123",
    "roleIds": ["role-uuid"]
  }'
```

**Update User:**
```bash
curl -X PUT 'http://localhost:3000/api/admin/accounts/users/user-uuid' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sales-session-id=your-session-token' \
  -d '{
    "fullName": "Updated Name",
    "isActive": false
  }'
```

**Update Roles:**
```bash
curl -X PUT 'http://localhost:3000/api/admin/accounts/users/user-uuid/roles' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sales-session-id=your-session-token' \
  -d '{
    "roleIds": ["role-uuid-1", "role-uuid-2"]
  }'
```

**Deactivate User:**
```bash
curl -X DELETE 'http://localhost:3000/api/admin/accounts/users/user-uuid' \
  -H 'Cookie: sales-session-id=your-session-token'
```

---

## JavaScript/TypeScript Examples

### Fetch API

```typescript
// List users
const response = await fetch('/api/admin/accounts/users?page=1&limit=10&search=john');
const data = await response.json();

// Create user
const createResponse = await fetch('/api/admin/accounts/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    fullName: 'Test User',
    password: 'password123',
    roleIds: ['role-uuid']
  })
});
const createdUser = await createResponse.json();

// Update user
const updateResponse = await fetch(`/api/admin/accounts/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Updated Name',
    isActive: false
  })
});

// Update roles
const rolesResponse = await fetch(`/api/admin/accounts/users/${userId}/roles`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roleIds: ['role-uuid-1', 'role-uuid-2']
  })
});

// Deactivate
const deleteResponse = await fetch(`/api/admin/accounts/users/${userId}`, {
  method: 'DELETE'
});
```

---

## Best Practices

1. **Always validate input** before calling APIs
2. **Handle errors gracefully** with user-friendly messages
3. **Use pagination** for large result sets
4. **Check audit logs** after sensitive operations
5. **Verify permissions** before allowing actions in UI
6. **Hash passwords** on server-side only (never client-side)
7. **Use HTTPS** in production
8. **Implement rate limiting** for public-facing deployments

---

## Support

For issues or questions:
- Check audit logs for operation history
- Review error messages for specific guidance
- Consult PHASE5-IMPLEMENTATION-SUMMARY.md for detailed documentation
- Contact admin team for access issues
