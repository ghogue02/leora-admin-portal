# Dashboard Widgets API

**Phase 1.3 Implementation - Dashboard Customization**

## Overview

The Dashboard Widgets API allows sales reps to customize their dashboard by adding, removing, and configuring widgets. Each user has a personalized dashboard layout with support for 10 different widget types.

## Authentication

All endpoints require sales session authentication via `withSalesSession`. The session automatically provides:
- `tenantId` - Multi-tenant isolation
- `userId` - User-specific dashboard customization

## Endpoints

### GET /api/dashboard/widgets

Get user's dashboard layout with all widgets.

**Query Parameters:**
- `includeHidden` (boolean, optional) - Include hidden widgets (default: false)

**Response:**
```json
{
  "widgets": [
    {
      "id": "uuid",
      "widgetType": "at_risk_customers",
      "position": 0,
      "size": "medium",
      "isVisible": true,
      "config": {
        "riskTypes": ["AT_RISK_CADENCE", "DORMANT"],
        "limit": 10
      },
      "createdAt": "2025-10-25T15:00:00.000Z",
      "updatedAt": "2025-10-25T15:00:00.000Z"
    }
  ],
  "availableWidgets": ["top_products", "new_customers"],
  "metadata": {
    "at_risk_customers": {
      "name": "At Risk Customers",
      "description": "Customers who need attention based on ordering patterns",
      "defaultSize": "medium",
      "category": "customers"
    }
  }
}
```

---

### POST /api/dashboard/widgets

Add a widget to user's dashboard.

**Request Body:**
```json
{
  "widgetType": "revenue_trend",
  "position": 1,
  "size": "large",
  "config": {
    "period": "month",
    "showComparison": true
  }
}
```

**Response:** (201 Created)
```json
{
  "widget": {
    "id": "uuid",
    "widgetType": "revenue_trend",
    "position": 1,
    "size": "large",
    "isVisible": true,
    "config": {
      "period": "month",
      "showComparison": true
    },
    "createdAt": "2025-10-25T15:00:00.000Z",
    "updatedAt": "2025-10-25T15:00:00.000Z"
  }
}
```

**Validation:**
- Widget type must be valid
- Widget cannot already exist for user
- Position auto-increments if not specified

---

### PATCH /api/dashboard/widgets/[widgetId]

Update widget position, size, visibility, or configuration.

**Request Body:** (at least one field required)
```json
{
  "position": 2,
  "size": "small",
  "isVisible": false,
  "config": {
    "limit": 5,
    "period": "week"
  }
}
```

**Response:**
```json
{
  "widget": {
    "id": "uuid",
    "widgetType": "revenue_trend",
    "position": 2,
    "size": "small",
    "isVisible": false,
    "config": {
      "limit": 5,
      "period": "week"
    },
    "createdAt": "2025-10-25T15:00:00.000Z",
    "updatedAt": "2025-10-25T15:05:00.000Z"
  }
}
```

**Features:**
- Position conflicts auto-resolve via position swapping
- User can only update their own widgets
- Tenant isolation enforced

---

### DELETE /api/dashboard/widgets/[widgetId]

Remove widget from user's dashboard.

**Response:**
```json
{
  "success": true,
  "message": "Widget removed successfully"
}
```

**Features:**
- Auto-reorders remaining widgets to fill gap
- User can only delete their own widgets
- Tenant isolation enforced

---

## Widget Types

### 1. at_risk_customers
Customers who need attention based on ordering patterns

**Config Options:**
```typescript
{
  riskTypes?: Array<"AT_RISK_CADENCE" | "AT_RISK_REVENUE" | "DORMANT">,
  limit?: number
}
```

### 2. revenue_trend
Revenue performance over time

**Config Options:**
```typescript
{
  period?: "week" | "month" | "quarter",
  showComparison?: boolean
}
```

### 3. tasks_from_management
Assigned tasks and action items (TOP position recommended)

**Config Options:**
```typescript
{
  showCompleted?: boolean,
  limit?: number
}
```

### 4. top_products
Best selling products by revenue or quantity

**Config Options:**
```typescript
{
  period?: "week" | "month" | "quarter",
  limit?: number,
  sortBy?: "revenue" | "quantity"
}
```

### 5. new_customers
Recently added customers

**Config Options:**
```typescript
{
  period?: "week" | "month",
  limit?: number
}
```

### 6. customer_balances
Customers with outstanding balances

**Config Options:**
```typescript
{
  threshold?: number,  // Show customers with balance > threshold
  limit?: number
}
```

### 7. upcoming_events
Scheduled appointments and events

**Config Options:**
```typescript
{
  days?: number,  // Next N days
  limit?: number
}
```

### 8. activity_summary
Summary of recent sales activities

**Config Options:**
```typescript
{
  period?: "week" | "month",
  activityTypes?: string[]
}
```

### 9. quota_progress
Progress toward sales quotas

**Config Options:**
```typescript
{
  period?: "week" | "month" | "quarter" | "year"
}
```

### 10. customers_due
Customers expected to order soon

**Config Options:**
```typescript
{
  days?: number,  // Next N days
  limit?: number
}
```

---

## Widget Sizes

- **small** - Compact widget, minimal space
- **medium** - Standard widget size (default for most)
- **large** - Expanded widget, more detailed view

---

## Security

### Multi-tenant Isolation
- All queries scoped to `tenantId` from session
- No cross-tenant data access possible

### User Isolation
- Users can only view/modify their own widgets
- Widget ownership enforced at database level

### Validation
- All inputs validated with Zod schemas
- Type-safe configurations
- SQL injection protection via Prisma

---

## Database Schema

```prisma
model DashboardWidget {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  userId      String?  @db.Uuid // null = tenant default
  widgetType  String   // "at_risk_customers", etc.
  position    Int      // Display order
  size        String   @default("medium") // "small", "medium", "large"
  isVisible   Boolean  @default(true)
  config      Json?    // Widget-specific configuration
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, widgetType])
  @@index([tenantId, userId])
}
```

---

## Implementation Files

- **Types:** `/web/src/types/dashboard-widget.ts`
- **Main Routes:** `/web/src/app/api/dashboard/widgets/route.ts`
- **Detail Routes:** `/web/src/app/api/dashboard/widgets/[widgetId]/route.ts`

---

## Error Handling

### 400 Bad Request
- Invalid JSON body
- Missing required fields
- Invalid widget type
- Invalid configuration

### 403 Forbidden
- Attempting to modify another user's widget
- Cross-tenant access attempt

### 404 Not Found
- Widget ID doesn't exist

### 409 Conflict
- Widget already exists for user
- Duplicate widget type

---

## Next Steps

1. **Frontend Components** - Build React components for each widget type
2. **Drag & Drop** - Implement grid layout with position management
3. **Widget Library** - Create UI for browsing and adding widgets
4. **Data Integration** - Connect widgets to existing data endpoints
5. **Testing** - Create comprehensive API tests

---

**Status:** ✅ Completed
**Phase:** 1.3 - Dashboard Customization
**Date:** 2025-10-25
