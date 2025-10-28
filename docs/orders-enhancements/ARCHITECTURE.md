# Orders Enhancement Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│  /sales/catalog        │  /sales/promotions  │  /sales/orders/  │
│  (Browse Products)     │  (Special Offers)   │  purchase-orders │
└──────────┬──────────────┴────────────┬────────┴─────────┬───────┘
           │                           │                   │
           ▼                           ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  GET /api/sales/catalog                                         │
│  GET /api/sales/promotions                                      │
│  POST /api/sales/orders/inventory-check                         │
│  GET /api/sales/orders/purchase-orders                          │
│  POST /api/sales/orders/purchase-orders                         │
│  POST /api/sales/orders/[id]/receive                            │
│  POST /api/sales/orders/[id]/cancel                             │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  /src/lib/inventory/reservation.ts                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  • checkInventoryAvailability()                           │  │
│  │  • reserveInventory()                                     │  │
│  │  • releaseInventoryReservation()                          │  │
│  │  • fulfillInventoryReservation()                          │  │
│  │  • getInventoryStatus()                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  /src/lib/auth/sales.ts                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  • withSalesSession()                                     │  │
│  │  • Role-based access control                              │  │
│  │  • Permission validation                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Product    │  │  Inventory   │  │  InventoryReservation│  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤  │
│  │ isPromotion  │  │ onHand       │  │ skuId                │  │
│  │ discount     │  │ allocated    │  │ orderId              │  │
│  │ isCloseout   │  │ status       │  │ quantity             │  │
│  └──────────────┘  └──────────────┘  │ status               │  │
│                                      │ reservedAt           │  │
│  ┌──────────────┐  ┌──────────────┐  └──────────────────────┘  │
│  │PurchaseOrder │  │PurchaseOrder │                            │
│  ├──────────────┤  │     Line     │                            │
│  │ poNumber     │  ├──────────────┤                            │
│  │ status       │  │ skuId        │                            │
│  │ expectedAt   │  │ quantity     │                            │
│  │ receivedAt   │  │ unitCost     │                            │
│  └──────────────┘  │ receivedQty  │                            │
│                    └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Order Submission with Inventory Check

```
User adds to cart
     │
     ▼
[Check Inventory]
     │
     ├──> POST /api/sales/orders/inventory-check
     │         │
     │         ├──> checkInventoryAvailability()
     │         │         │
     │         │         ├──> Query Inventory.onHand
     │         │         ├──> Query Inventory.allocated
     │         │         └──> Query InventoryReservation (active)
     │         │
     │         └──> Calculate: available = onHand - allocated - reserved
     │
     ▼
Available >= Requested?
     │
     ├─ YES ──> [Submit Order]
     │              │
     │              ├──> Create Order
     │              └──> reserveInventory()
     │                        │
     │                        └──> INSERT InventoryReservation
     │
     └─ NO ───> [Block Order]
                     │
                     └──> Show error: "Insufficient inventory"
```

### 2. Order Cancellation Flow

```
User cancels order
     │
     ▼
POST /api/sales/orders/[id]/cancel
     │
     ├──> Check permissions
     │         │
     │         ├──> Is assigned sales rep?
     │         └──> OR has admin/manager role?
     │
     ├──> Update Order.status = 'CANCELLED'
     │
     └──> releaseInventoryReservation()
              │
              └──> UPDATE InventoryReservation
                   SET status = 'RELEASED'
                   WHERE orderId = [id]
```

### 3. Purchase Order Receipt Flow

```
Manager receives shipment
     │
     ▼
POST /api/sales/orders/[id]/receive
     │
     ├──> Get PO lines
     │
     ├──> For each line:
     │    ├──> Update PurchaseOrderLine.receivedQuantity
     │    └──> UPDATE Inventory
     │         SET onHand = onHand + receivedQty
     │
     └──> UPDATE PurchaseOrder
          SET status = 'RECEIVED'
          SET receivedAt = NOW()
```

### 4. Catalog Display with Reservations

```
User views catalog
     │
     ▼
GET /api/sales/catalog
     │
     ├──> Query all active SKUs
     │
     ├──> For each SKU:
     │    └──> getInventoryStatus()
     │              │
     │              ├──> Calculate total onHand
     │              ├──> Calculate total allocated
     │              ├──> Query active reservations
     │              └──> Return: {
     │                    onHand,
     │                    available: onHand - allocated - reserved,
     │                    reserved,
     │                    lowStock: available < 10,
     │                    outOfStock: available <= 0
     │                  }
     │
     └──> Return catalog with:
          - Real-time availability
          - Low stock warnings
          - Promotion badges
          - Closeout flags
```

## Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                         ROLES & PERMISSIONS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SALES REP                                                       │
│  ├── View own customer orders                                   │
│  ├── Cancel own customer orders                                 │
│  ├── View catalog                                               │
│  ├── View promotions                                            │
│  └── Submit orders (with inventory check)                       │
│                                                                  │
│  SALES MANAGER                                                   │
│  ├── All SALES REP permissions                                  │
│  ├── View all orders in territory                               │
│  ├── Cancel any order                                           │
│  ├── Create purchase orders                                     │
│  ├── Receive purchase orders                                    │
│  └── View PO list                                               │
│                                                                  │
│  SALES ADMIN                                                     │
│  ├── All SALES MANAGER permissions                              │
│  ├── View all orders (all territories)                          │
│  ├── Manage promotions                                          │
│  └── System configuration                                       │
│                                                                  │
│  WAREHOUSE MANAGER                                               │
│  ├── Create purchase orders                                     │
│  ├── Receive purchase orders                                    │
│  ├── View inventory reservations                                │
│  └── Manage inventory                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Transaction Flow

```
All inventory operations use database transactions:

BEGIN TRANSACTION
  ├── Check availability
  ├── Create/update records
  ├── Update inventory
  └── Create audit log
COMMIT or ROLLBACK on error
```

## Error Handling

```
Try/Catch blocks at all levels:

API Layer
  └─> Catch HTTP errors
      └─> Return 400/403/404/500 with error message

Business Logic
  └─> Catch domain errors
      └─> Throw custom exceptions

Database Layer
  └─> Catch Prisma errors
      └─> Rollback transaction
```

## Performance Optimizations

1. **Batch Queries**: Catalog loads all SKUs then processes inventory in parallel
2. **Indexes**: Added on promotion flags, PO status, reservation status
3. **Raw SQL**: Used for complex aggregations (reservations count)
4. **Transaction Batching**: Multiple operations in single transaction

## Security Layers

1. **Authentication**: withSalesSession() validates JWT token
2. **Authorization**: Role-based permission checks
3. **Tenant Isolation**: All queries filtered by tenantId
4. **Input Validation**: Request body validation before processing
5. **SQL Injection Protection**: Parameterized queries only

## Monitoring Points

- Inventory reservation failures
- Low stock warnings
- Out of stock blocks
- PO receipt operations
- Order cancellations
- Permission denials

---

**Enterprise-grade architecture with comprehensive error handling and security** ✅
