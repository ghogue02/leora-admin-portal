# API Reference - Leora CRM

**Last Updated:** October 25, 2025
**Version:** 2.0.0

---

## Overview

This document provides comprehensive API documentation for Leora CRM endpoints, including request/response formats and authentication requirements.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Admin APIs](#admin-apis)
3. [Calendar APIs](#calendar-apis)
4. [Warehouse & Inventory APIs](#warehouse--inventory-apis)
5. [Error Handling](#error-handling)

---

## Authentication

### Authentication Methods

**1. Session-based (Web App)**

```typescript
// Automatic via Next-Auth session
// Middleware handles authentication
```

**2. API Key (External Integrations)**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.leoracrm.com/v1/orders
```

**3. OAuth (Third-party Apps)**

```bash
# OAuth 2.0 flow
GET /oauth/authorize?client_id=...&redirect_uri=...&scope=...
```

### Session Management

**Get Current Session:**

```http
GET /api/auth/session
```

**Response:**

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "ADMIN",
    "tenantId": "tenant_abc"
  },
  "expires": "2025-11-25T10:00:00Z"
}
```

---

## Admin APIs

### Job Monitoring

#### List Jobs

```http
GET /api/admin/jobs
```

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `status` | string | Filter by status (PENDING, RUNNING, COMPLETED, FAILED) | all |
| `type` | string | Filter by job type (CalendarSync, MetricCalc, etc.) | all |
| `limit` | number | Max results to return | 50 |
| `offset` | number | Skip N results (pagination) | 0 |
| `from` | ISO date | Filter jobs created after this date | - |
| `to` | ISO date | Filter jobs created before this date | - |

**Example Request:**

```bash
curl "https://api.leoracrm.com/api/admin/jobs?status=FAILED&limit=10"
```

**Response:**

```json
{
  "jobs": [
    {
      "id": "job_123abc",
      "type": "CalendarSync",
      "status": "FAILED",
      "createdAt": "2025-10-25T10:00:00Z",
      "startedAt": "2025-10-25T10:00:05Z",
      "failedAt": "2025-10-25T10:00:30Z",
      "attempts": 3,
      "maxAttempts": 5,
      "error": {
        "message": "Token refresh failed: Invalid refresh token",
        "code": "AUTH_ERROR"
      },
      "data": {
        "userId": "user_123",
        "provider": "google"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Job Details

```http
GET /api/admin/jobs/:jobId
```

**Response:**

```json
{
  "id": "job_123abc",
  "type": "CalendarSync",
  "status": "FAILED",
  "createdAt": "2025-10-25T10:00:00Z",
  "startedAt": "2025-10-25T10:00:05Z",
  "failedAt": "2025-10-25T10:00:30Z",
  "duration": 25000,
  "attempts": 3,
  "maxAttempts": 5,
  "data": {
    "userId": "user_123",
    "provider": "google",
    "syncType": "full"
  },
  "result": null,
  "error": {
    "message": "Token refresh failed: Invalid refresh token",
    "code": "AUTH_ERROR",
    "stack": "Error: Token refresh failed\n    at GoogleCalendarClient.refreshToken..."
  },
  "retryHistory": [
    {
      "attempt": 1,
      "timestamp": "2025-10-25T10:00:05Z",
      "error": "Network timeout"
    },
    {
      "attempt": 2,
      "timestamp": "2025-10-25T10:01:10Z",
      "error": "Network timeout"
    },
    {
      "attempt": 3,
      "timestamp": "2025-10-25T10:03:30Z",
      "error": "Invalid token"
    }
  ]
}
```

#### Retry Job

```http
POST /api/admin/jobs/:jobId/retry
```

**Request Body (Optional):**

```json
{
  "delay": 60000  // Delay in milliseconds before retry
}
```

**Response:**

```json
{
  "success": true,
  "jobId": "job_123abc",
  "status": "PENDING",
  "scheduledFor": "2025-10-25T10:10:00Z"
}
```

#### Cancel Job

```http
POST /api/admin/jobs/:jobId/cancel
```

**Response:**

```json
{
  "success": true,
  "jobId": "job_123abc",
  "status": "CANCELLED"
}
```

#### Delete Job

```http
DELETE /api/admin/jobs/:jobId
```

**Response:**

```json
{
  "success": true,
  "jobId": "job_123abc",
  "deleted": true
}
```

#### Job Queue Health

```http
GET /api/admin/jobs/health
```

**Response:**

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "worker": "running",
    "pendingJobs": 15,
    "runningJobs": 3,
    "failedJobs": 2,
    "deadJobs": 0,
    "oldestPendingJob": "2 minutes",
    "workerLastPing": "5 seconds ago"
  },
  "timestamp": "2025-10-25T10:30:00Z"
}
```

---

## Calendar APIs

### Calendar Connection

#### Connect Google Calendar

```http
GET /api/calendar/connect/google
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | string | Force consent screen (optional: `consent`) |

**Response:**
Redirects to Google OAuth consent screen.

**Callback URL:**
`/api/calendar/connect/google/callback?code=...&state=...`

#### Connect Outlook Calendar

```http
GET /api/calendar/connect/outlook
```

**Response:**
Redirects to Microsoft OAuth consent screen.

**Callback URL:**
`/api/calendar/connect/outlook/callback?code=...&state=...`

### Calendar Sync

#### Trigger Sync

```http
POST /api/calendar/sync
```

**Request Body:**

```json
{
  "userId": "user_123",
  "provider": "google",
  "fullSync": false  // true = ignore delta, fetch all events
}
```

**Response:**

```json
{
  "success": true,
  "syncId": "sync_abc123",
  "status": "RUNNING",
  "estimatedDuration": "30 seconds"
}
```

#### Get Sync Status

```http
GET /api/calendar/sync/:syncId
```

**Response:**

```json
{
  "id": "sync_abc123",
  "status": "COMPLETED",
  "startedAt": "2025-10-25T10:00:00Z",
  "completedAt": "2025-10-25T10:00:28Z",
  "duration": 28000,
  "eventsProcessed": 142,
  "eventsCreated": 5,
  "eventsUpdated": 12,
  "eventsDeleted": 3,
  "errors": []
}
```

#### Refresh Token

```http
POST /api/calendar/refresh-token
```

**Request Body:**

```json
{
  "userId": "user_123",
  "provider": "google"
}
```

**Response:**

```json
{
  "success": true,
  "provider": "google",
  "newExpiry": "2025-10-25T12:00:00Z"
}
```

### Calendar Health

#### Get Calendar Status

```http
GET /api/calendar/status
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (defaults to current user) |

**Response:**

```json
{
  "google": {
    "connected": true,
    "tokenExpiry": "2025-10-25T12:00:00Z",
    "tokenExpired": false,
    "lastSync": "2025-10-25T10:00:00Z",
    "lastSyncSuccess": true,
    "error": null
  },
  "outlook": {
    "connected": false,
    "tokenExpiry": null,
    "tokenExpired": false,
    "lastSync": null,
    "lastSyncSuccess": null,
    "error": null
  }
}
```

#### Calendar Health Check

```http
GET /api/calendar/health
```

**Response:**

```json
{
  "google": {
    "configured": true,
    "clientIdSet": true,
    "clientSecretSet": true,
    "redirectUriValid": true,
    "testConnection": "ok"
  },
  "outlook": {
    "configured": true,
    "clientIdSet": true,
    "clientSecretSet": true,
    "tenantIdSet": true,
    "redirectUriValid": true,
    "testConnection": "ok"
  }
}
```

---

## Warehouse & Inventory APIs

### Warehouse Operations

#### Get Warehouse Inventory

```http
GET /api/warehouse/inventory
```

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `location` | string | Filter by warehouse location | all |
| `lowStock` | boolean | Show only low stock items | false |
| `search` | string | Search by SKU or product name | - |
| `limit` | number | Max results | 50 |
| `offset` | number | Pagination offset | 0 |

**Example Request:**

```bash
curl "https://api.leoracrm.com/api/warehouse/inventory?lowStock=true&limit=20"
```

**Response:**

```json
{
  "items": [
    {
      "id": "sku_123",
      "sku": "WINE-CAB-001",
      "productName": "Cabernet Sauvignon 2020",
      "location": "Warehouse A",
      "quantityAvailable": 5,
      "quantityReserved": 10,
      "quantityPicked": 2,
      "quantityPacked": 1,
      "reorderPoint": 20,
      "isLowStock": true,
      "pickOrder": 1,  // Auto-calculated based on location
      "bin": "A-12-3"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Update Pick Order

```http
PATCH /api/warehouse/inventory/:skuId/pick-order
```

**Request Body:**

```json
{
  "pickOrder": 5,
  "reason": "Moved to new bin"
}
```

**Response:**

```json
{
  "success": true,
  "skuId": "sku_123",
  "oldPickOrder": 1,
  "newPickOrder": 5,
  "updatedAt": "2025-10-25T10:30:00Z"
}
```

#### Adjust Inventory

```http
POST /api/warehouse/inventory/:skuId/adjust
```

**Request Body:**

```json
{
  "quantity": -3,  // Negative for decrease
  "reason": "DAMAGE",  // DAMAGE, THEFT, COUNT_ADJUSTMENT, RETURN
  "notes": "Broken bottles during picking",
  "userId": "user_123"
}
```

**Response:**

```json
{
  "success": true,
  "skuId": "sku_123",
  "previousQuantity": 100,
  "newQuantity": 97,
  "adjustment": -3,
  "transaction": {
    "id": "txn_abc123",
    "type": "ADJUSTMENT",
    "createdAt": "2025-10-25T10:30:00Z"
  }
}
```

### Inventory Transactions

#### List Transactions

```http
GET /api/warehouse/inventory/:skuId/transactions
```

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `type` | string | Filter by type (RESERVATION, RELEASE, PICK, PACK, SHIP, ADJUSTMENT) | all |
| `from` | ISO date | Start date | - |
| `to` | ISO date | End date | - |
| `limit` | number | Max results | 100 |

**Response:**

```json
{
  "transactions": [
    {
      "id": "txn_123",
      "type": "RESERVATION",
      "quantity": 12,
      "previousAvailable": 100,
      "newAvailable": 88,
      "orderId": "order_456",
      "userId": "user_789",
      "reason": null,
      "createdAt": "2025-10-25T09:00:00Z"
    },
    {
      "id": "txn_124",
      "type": "PICK",
      "quantity": 12,
      "previousAvailable": 88,
      "newAvailable": 88,
      "orderId": "order_456",
      "userId": "user_picker",
      "reason": null,
      "createdAt": "2025-10-25T09:30:00Z"
    }
  ],
  "summary": {
    "totalTransactions": 2,
    "netChange": 0,
    "reservations": 12,
    "picks": 12,
    "adjustments": 0
  }
}
```

#### Create Manual Transaction

```http
POST /api/warehouse/inventory/transaction
```

**Request Body:**

```json
{
  "skuId": "sku_123",
  "type": "ADJUSTMENT",
  "quantity": -5,
  "reason": "Physical count discrepancy",
  "userId": "user_admin"
}
```

**Response:**

```json
{
  "success": true,
  "transaction": {
    "id": "txn_125",
    "type": "ADJUSTMENT",
    "quantity": -5,
    "createdAt": "2025-10-25T10:30:00Z"
  }
}
```

### Inventory Reconciliation

#### Reconcile SKU

```http
POST /api/warehouse/inventory/:skuId/reconcile
```

**Description:**
Recalculates inventory quantities based on transaction history.

**Response:**

```json
{
  "success": true,
  "skuId": "sku_123",
  "reconciliation": {
    "previousAvailable": 95,
    "calculatedAvailable": 97,
    "difference": 2,
    "adjusted": true
  },
  "transactionsReviewed": 145
}
```

---

## Error Handling

### Error Response Format

All API errors return a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  },
  "timestamp": "2025-10-25T10:30:00Z",
  "requestId": "req_abc123"
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request body or parameters |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate) |
| 422 | `VALIDATION_ERROR` | Request data failed validation |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

### Example Error Responses

**Validation Error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "quantity": "Must be a positive integer",
      "reason": "Required field"
    }
  },
  "timestamp": "2025-10-25T10:30:00Z",
  "requestId": "req_abc123"
}
```

**Authentication Error:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired session",
    "details": {
      "session": "Session expired at 2025-10-25T09:00:00Z"
    }
  },
  "timestamp": "2025-10-25T10:30:00Z",
  "requestId": "req_def456"
}
```

**Rate Limit Error:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "resetAt": "2025-10-25T11:00:00Z",
      "retryAfter": 1800
    }
  },
  "timestamp": "2025-10-25T10:30:00Z",
  "requestId": "req_ghi789"
}
```

---

## Rate Limiting

### Limits

**Authenticated Requests:**
- 1000 requests / hour / user
- 100 requests / minute / user

**Unauthenticated Requests:**
- 100 requests / hour / IP
- 10 requests / minute / IP

### Headers

**Request Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1698249600
```

---

## Versioning

**Current Version:** v1

**Version Header:**
```
Accept: application/vnd.leora.v1+json
```

**Deprecation Notice:**
Deprecated endpoints include a `Sunset` header with the deprecation date.

---

## Support

For API support:
- **Documentation:** https://docs.leoracrm.com
- **Email:** api-support@leoracrm.com
- **Status Page:** https://status.leoracrm.com
