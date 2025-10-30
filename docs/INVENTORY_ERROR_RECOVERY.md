# Inventory Error Recovery Guide

## Overview

This document describes error scenarios in the inventory transaction system, automatic recovery mechanisms, and manual recovery procedures.

## Transaction Guarantees

All inventory operations use Prisma transactions with `Serializable` isolation level to ensure:

1. **Atomicity**: Either all operations succeed or all rollback
2. **Consistency**: Inventory state is always valid
3. **Isolation**: Concurrent transactions don't interfere
4. **Durability**: Committed changes persist across failures

## Error Scenarios

### 1. Insufficient Inventory

**Error**: `InsufficientInventoryError`

**When**: Attempting to allocate more inventory than available

**Automatic Recovery**:
- Transaction automatically rolls back
- No inventory is allocated
- Order remains in DRAFT status

**Manual Recovery**:
- Option 1: Add more inventory using adjustment API
  ```bash
  POST /api/inventory/{skuId}/adjust
  {
    "tenantId": "...",
    "quantity": 100,
    "reason": "Stock replenishment"
  }
  ```
- Option 2: Reduce order quantity
- Option 3: Wait for inventory to be released from other orders

**Prevention**:
- Use `GET /api/orders/{id}/allocate` to check before allocation
- Implement real-time inventory tracking in UI
- Set up low-stock alerts

---

### 2. Concurrent Allocation (Race Condition)

**Error**: `InsufficientInventoryError` or Prisma write conflict

**When**: Two orders try to allocate the same inventory simultaneously

**Automatic Recovery**:
- Transaction with `Serializable` isolation prevents double-allocation
- First transaction wins, second gets error
- Failed transaction rolls back completely

**Manual Recovery**:
- Retry allocation for failed order
- Check inventory availability again
- Consider implementing allocation queue for high-contention scenarios

**Prevention**:
- Transaction isolation handles this automatically
- No manual prevention needed

---

### 3. Inventory Not Found

**Error**: `InventoryNotFoundError`

**When**:
- SKU exists but has no inventory record at location
- Inventory record was deleted

**Automatic Recovery**:
- Transaction rolls back
- No changes made to order or inventory

**Manual Recovery**:
1. Create inventory record using adjustment:
   ```bash
   POST /api/inventory/{skuId}/adjust
   {
     "tenantId": "...",
     "quantity": 100,
     "reason": "Initial inventory setup",
     "location": "main"
   }
   ```
2. Retry allocation

**Prevention**:
- Ensure all SKUs have inventory records created
- Use migration scripts to create default inventory records
- Add inventory creation to SKU creation workflow

---

### 4. Invalid Order Status

**Error**: `InventoryError` with code `INVALID_ORDER_STATUS`

**When**:
- Trying to allocate already-allocated order
- Trying to ship non-allocated order
- Trying to release fulfilled order

**Automatic Recovery**:
- Transaction rolls back
- Order status unchanged

**Manual Recovery**:
1. Check current order status:
   ```sql
   SELECT id, status, orderedAt, fulfilledAt
   FROM "Order"
   WHERE id = '...';
   ```

2. Take appropriate action based on status:
   - **DRAFT**: Can allocate
   - **SUBMITTED**: Already allocated, can ship
   - **FULFILLED**: Cannot modify, order complete
   - **CANCELLED**: Cannot modify, order cancelled

**Prevention**:
- Check order status before operations
- Implement UI state guards
- Use status-based button enabling/disabling

---

### 5. Optimistic Locking Conflict

**Error**: Prisma write conflict

**When**: Inventory record was updated between read and write

**Automatic Recovery**:
- Transaction automatically rolls back
- No partial updates applied

**Manual Recovery**:
- Retry the operation
- System will use latest inventory state

**Prevention**:
- Handled automatically by Prisma
- Implement retry logic in API layer if needed

---

### 6. Network/Database Timeout

**Error**: Prisma timeout error

**When**:
- Database is slow or overloaded
- Network issues
- Long-running transactions

**Automatic Recovery**:
- Transaction times out after 10 seconds
- All changes rolled back

**Manual Recovery**:
1. Check if operation completed:
   ```sql
   SELECT * FROM "AuditLog"
   WHERE "entityType" = 'Order'
     AND "entityId" = '...'
   ORDER BY "createdAt" DESC
   LIMIT 5;
   ```

2. If not completed, retry operation

3. If repeatedly failing:
   - Check database health
   - Check network connectivity
   - Review transaction complexity

**Prevention**:
- Monitor database performance
- Add connection pooling
- Implement circuit breakers
- Use appropriate timeout values

---

## Audit Trail Analysis

All inventory operations create audit logs. Use these to understand what happened:

### Check Allocation History
```sql
SELECT
  al."createdAt",
  al."action",
  al."changes"->>'type' as transaction_type,
  al."changes"->>'quantity' as quantity,
  al."changes"->>'before' as before_state,
  al."changes"->>'after' as after_state
FROM "AuditLog" al
WHERE al."entityType" = 'Inventory'
  AND al."changes"->>'skuId' = '...'
ORDER BY al."createdAt" DESC;
```

### Check Order Status Changes
```sql
SELECT
  al."createdAt",
  al."action",
  al."changes",
  al."metadata"
FROM "AuditLog" al
WHERE al."entityType" = 'Order'
  AND al."entityId" = '...'
ORDER BY al."createdAt" DESC;
```

### Verify Inventory Consistency
```sql
SELECT
  i."skuId",
  i."location",
  i."onHand",
  i."allocated",
  (i."onHand" - i."allocated") as available,
  COUNT(ol."id") as active_order_lines,
  SUM(ol."quantity") as total_allocated_in_orders
FROM "Inventory" i
LEFT JOIN "OrderLine" ol ON ol."skuId" = i."skuId"
LEFT JOIN "Order" o ON o."id" = ol."orderId"
WHERE i."tenantId" = '...'
  AND o."status" = 'SUBMITTED'
GROUP BY i."id", i."skuId", i."location", i."onHand", i."allocated";
```

---

## Common Recovery Procedures

### Procedure 1: Stuck Allocation

**Symptom**: Order shows as SUBMITTED but inventory not allocated

**Steps**:
1. Check current state:
   ```sql
   SELECT o.*,
     (SELECT SUM(quantity) FROM "OrderLine" WHERE "orderId" = o.id) as line_total
   FROM "Order" o WHERE id = '...';
   ```

2. Check inventory allocation:
   ```sql
   SELECT * FROM "Inventory" i
   JOIN "OrderLine" ol ON ol."skuId" = i."skuId"
   WHERE ol."orderId" = '...';
   ```

3. If allocated in inventory but order status wrong:
   ```sql
   UPDATE "Order"
   SET status = 'SUBMITTED', "orderedAt" = NOW()
   WHERE id = '...';
   ```

4. If not allocated but order status SUBMITTED:
   - Release the order (will reset to DRAFT/CANCELLED)
   - Re-allocate using allocation API

### Procedure 2: Over-Allocated Inventory

**Symptom**: Inventory.allocated > sum of active order lines

**Steps**:
1. Calculate correct allocation:
   ```sql
   SELECT
     i."skuId",
     i."location",
     i."allocated" as current_allocated,
     COALESCE(SUM(ol."quantity"), 0) as should_be_allocated,
     (i."allocated" - COALESCE(SUM(ol."quantity"), 0)) as discrepancy
   FROM "Inventory" i
   LEFT JOIN "OrderLine" ol ON ol."skuId" = i."skuId"
   LEFT JOIN "Order" o ON o."id" = ol."orderId"
   WHERE i."tenantId" = '...'
     AND (o."status" = 'SUBMITTED' OR o."status" IS NULL)
   GROUP BY i."id", i."skuId", i."location", i."allocated"
   HAVING i."allocated" != COALESCE(SUM(ol."quantity"), 0);
   ```

2. Fix allocation manually:
   ```sql
   UPDATE "Inventory"
   SET allocated = (
     SELECT COALESCE(SUM(ol."quantity"), 0)
     FROM "OrderLine" ol
     JOIN "Order" o ON o."id" = ol."orderId"
     WHERE ol."skuId" = "Inventory"."skuId"
       AND o."status" = 'SUBMITTED'
   )
   WHERE id = '...';
   ```

3. Create audit log for manual fix:
   ```sql
   INSERT INTO "AuditLog" ("tenantId", "entityType", "entityId", "action", "changes")
   VALUES (
     '...',
     'Inventory',
     '...',
     'MANUAL_CORRECTION',
     '{"reason": "Fixed over-allocation", "correctedBy": "admin"}'
   );
   ```

### Procedure 3: Negative Inventory

**Symptom**: Inventory.onHand or allocated becomes negative

**Note**: This should be prevented by constraints, but if it occurs:

**Steps**:
1. Identify negative inventory:
   ```sql
   SELECT * FROM "Inventory"
   WHERE "onHand" < 0 OR "allocated" < 0;
   ```

2. Check recent transactions:
   ```sql
   SELECT * FROM "AuditLog"
   WHERE "entityType" = 'Inventory'
     AND "entityId" IN (SELECT id FROM "Inventory" WHERE "onHand" < 0)
   ORDER BY "createdAt" DESC;
   ```

3. Correct based on audit trail:
   - If shipment error: reverse shipment
   - If adjustment error: reverse adjustment
   - If unknown: set to 0 and investigate

4. Add constraint to prevent future occurrences:
   ```sql
   ALTER TABLE "Inventory"
   ADD CONSTRAINT "Inventory_onHand_positive" CHECK ("onHand" >= 0),
   ADD CONSTRAINT "Inventory_allocated_positive" CHECK ("allocated" >= 0);
   ```

---

## Emergency Procedures

### Full Inventory Reset for SKU

**When**: Data corruption detected, need to start fresh

**Steps**:
1. Release all active orders for SKU:
   ```sql
   SELECT id FROM "Order" o
   WHERE status = 'SUBMITTED'
     AND EXISTS (
       SELECT 1 FROM "OrderLine"
       WHERE "orderId" = o.id AND "skuId" = '...'
     );
   ```

2. Call release API for each order

3. Perform physical count

4. Reset inventory:
   ```bash
   POST /api/inventory/{skuId}/adjust
   {
     "tenantId": "...",
     "quantity": <physical_count>,
     "reason": "Emergency inventory reset - full reconciliation"
   }
   ```

### Database Restore from Backup

**When**: Critical data corruption

**Steps**:
1. Stop application
2. Restore database from latest backup
3. Replay transactions from audit log if needed
4. Verify data integrity
5. Restart application

---

## Monitoring and Alerts

### Set Up Alerts For:

1. **High Allocation Failures**
   - More than 5% of allocations failing
   - Indicates inventory sync issues

2. **Negative Inventory**
   - Should never happen
   - Critical error requiring immediate attention

3. **Allocation/Order Mismatch**
   - Run daily reconciliation
   - Alert if discrepancies found

4. **Transaction Timeouts**
   - More than 1% timing out
   - Indicates performance issues

### Daily Health Checks

Run these queries daily:

```sql
-- Check for orphaned allocations
SELECT * FROM "Inventory"
WHERE "allocated" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "OrderLine" ol
    JOIN "Order" o ON o."id" = ol."orderId"
    WHERE ol."skuId" = "Inventory"."skuId"
      AND o."status" IN ('SUBMITTED', 'DRAFT')
  );

-- Check for orders stuck in SUBMITTED
SELECT * FROM "Order"
WHERE status = 'SUBMITTED'
  AND "orderedAt" < NOW() - INTERVAL '7 days';

-- Check inventory consistency
SELECT
  "skuId",
  "location",
  "onHand",
  "allocated",
  ("onHand" - "allocated") as available
FROM "Inventory"
WHERE ("onHand" - "allocated") < 0
   OR "allocated" < 0
   OR "onHand" < 0;
```

---

## Support Contacts

- **Database Issues**: DBA team
- **Application Errors**: Development team
- **Business Process**: Operations team

## Version History

- **1.0.0** (2024-01-25): Initial documentation
