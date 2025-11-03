# Database Migration Instructions

**Date**: October 31, 2025
**Migration**: Add Order Delivery and Approval Fields

---

## 🚨 Current Status

**Database Connection Issue**: The automated Prisma migration is failing with authentication errors. This may be due to:
- Supabase password rotation
- Connection pooling issues
- Network/firewall issues

## ✅ What's Ready

All code changes are complete:
- ✅ Schema file updated (needs to be re-applied)
- ✅ Manual SQL migration created
- ✅ API endpoints created
- ✅ React components created

## 🔧 How to Run the Migration

### Option 1: Manual SQL Execution (Recommended for Now)

**If you have access to Supabase dashboard**:

1. Go to Supabase SQL Editor
2. Run the migration file:
   ```bash
   # Location: /web/prisma/migrations/MANUAL_add_order_delivery_and_approval_fields.sql
   ```

3. Then update Prisma schema manually or run:
   ```bash
   cd /Users/greghogue/Leora2/web
   npx prisma db pull  # Pull current schema
   # Then re-apply our custom changes to the schema file
   npx prisma generate  # Generate Prisma Client
   ```

### Option 2: Fix Database Connection & Use Prisma

**If database credentials need updating**:

1. Check/update credentials in `.env`:
   ```bash
   # Current (from .env):
   DATABASE_URL="postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"
   ```

2. Get new password from Supabase dashboard if needed

3. Re-apply schema changes to `prisma/schema.prisma`:
   - See `/docs/ORDER_SYSTEM_IMPLEMENTATION_PROGRESS.md` for full schema diff
   - Or use git to see changes: `git diff HEAD prisma/schema.prisma`

4. Run Prisma migration:
   ```bash
   cd /Users/greghogue/Leora2/web
   npx prisma migrate dev --name add_order_delivery_and_approval_fields
   npx prisma generate
   ```

### Option 3: Use psql Directly

```bash
# Connect to database
psql "postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"

# Run migration file
\i /Users/greghogue/Leora2/web/prisma/migrations/MANUAL_add_order_delivery_and_approval_fields.sql
```

---

## 📋 Schema Changes Summary

### Order Table
**New Columns**:
- `deliveryDate` - Scheduled delivery date
- `requestedDeliveryDate` - Original request
- `warehouseLocation` - "Baltimore", "Warrenton", "main"
- `deliveryTimeWindow` - Time window preferences
- `requiresApproval` - Boolean flag for low-inventory orders
- `approvedById` - UUID reference to User
- `approvedAt` - Timestamp of approval

**New Indexes**:
- `Order_deliveryDate_idx`
- `Order_requiresApproval_status_idx`

**New Foreign Key**:
- `Order.approvedById` → `User.id`

### OrderStatus Enum
**New Values**:
- `PENDING` - Awaiting approval/processing
- `READY_TO_DELIVER` - Ready for operations
- `PICKED` - Warehouse has picked
- `DELIVERED` - Order delivered

### Customer Table
**New Columns**:
- `requiresPO` - Boolean, requires PO number
- `defaultWarehouseLocation` - Default warehouse
- `defaultDeliveryTimeWindow` - Default time window

### SalesRep Table
**New Column**:
- `deliveryDaysArray` - TEXT[] array of delivery days

### InventoryReservation Table
**New Index**:
- `InventoryReservation_expiresAt_idx` - For expiration job

---

## ✅ Verification Steps

After running migration:

1. **Check tables updated**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'Order'
   AND column_name IN ('deliveryDate', 'warehouseLocation', 'requiresApproval');
   ```

2. **Check enum values**:
   ```sql
   SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status;
   ```

3. **Verify indexes**:
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'Order'
   AND indexname LIKE '%delivery%';
   ```

4. **Test Prisma Client**:
   ```bash
   cd /Users/greghogue/Leora2/web
   npx tsx -e "import { PrismaClient, OrderStatus } from '@prisma/client';
               const prisma = new PrismaClient();
               console.log('OrderStatus values:', Object.keys(OrderStatus));
               prisma.\$disconnect();"
   ```

---

## 🔍 Troubleshooting

### "Authentication failed" Error
- Password may have been rotated in Supabase
- Check Supabase dashboard → Project Settings → Database
- Update PASSWORD_URL and DIRECT_URL in `.env`

### "Type already exists" Error
- If enum values already added, that's OK - SQL uses `ADD VALUE IF NOT EXISTS`
- Safe to re-run the SQL

### Prisma Client Not Updated
```bash
cd /Users/greghogue/Leora2/web
rm -rf node_modules/.prisma
npx prisma generate
```

---

## 📞 Need Help?

1. **Check Supabase Status**: https://status.supabase.com/
2. **Verify Database Connection**: Use Supabase dashboard SQL editor
3. **Review Logs**: Check Supabase logs for connection attempts

---

## 🎯 Next Steps After Migration

Once migration is complete:

1. ✅ Verify Prisma types are updated
2. ✅ Test `/api/inventory/check-availability` endpoint
3. ✅ Test `InventoryStatusBadge` component
4. 🚧 Continue with cart removal (next phase)
5. 🚧 Build direct order entry form

**See**: `/docs/ORDER_SYSTEM_IMPLEMENTATION_PROGRESS.md` for full implementation plan