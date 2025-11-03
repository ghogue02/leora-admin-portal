# Next Session Tasks - Week 1 Completion

**Goal**: Build direct order entry system to complete Week 1

---

## 🎯 Priority Tasks (Do These First)

### 1. Create Direct Order Entry Page
**File**: `/web/src/app/sales/orders/new/page.tsx`

**Requirements**:
- Customer searchable dropdown
- Auto-populate delivery defaults from customer
- Delivery date picker (with validation warnings)
- Warehouse selector (Baltimore, Warrenton, main, + search for others)
- Delivery time window selector
- PO number input (required if customer.requiresPO)
- Special instructions textarea
- Product grid with live inventory
- Order summary with pricing

**Validation Rules**:
- Warn if `deliveryDate === today` (same-day order)
- Warn if `deliveryDate` not in `salesRep.deliveryDaysArray`
- Require PO number if `customer.requiresPO === true`
- Show warning if `inventory.available < quantity` (set requiresApproval=true)

---

### 2. Create Supporting Components

#### A. ProductGrid Component
**File**: `/web/src/components/orders/ProductGrid.tsx`

**Features**:
- Search/filter products by name, SKU, category
- Display columns: Product, SKU, Size, Price, Inventory, Quantity, Add
- Use `<InventoryStatusBadge>` for each product ✅ (already created)
- Call `/api/inventory/check-availability` when quantity changes
- Show volume discount messaging ("Add 2 more cases for 10% discount")
- "Add to Order" button

**Example**:
```tsx
<ProductGrid
  onAddProduct={(skuId, quantity) => {
    // Add to order items array
  }}
  warehouseLocation="Baltimore"
  existingItems={orderItems}
/>
```

#### B. DeliveryDatePicker Component
**File**: `/web/src/components/orders/DeliveryDatePicker.tsx`

**Features**:
- Calendar date picker
- Highlight suggested delivery days (from `salesRep.deliveryDaysArray`)
- Show warning dialog if same-day selected
- Show warning dialog if non-delivery day selected
- Allow override with "Continue Anyway" button

**Example**:
```tsx
<DeliveryDatePicker
  value={deliveryDate}
  onChange={setDeliveryDate}
  suggestedDays={["Monday", "Wednesday", "Friday"]}
  onWarning={(type, date) => {
    // Show warning modal
  }}
/>
```

#### C. WarehouseSelector Component
**File**: `/web/src/components/orders/WarehouseSelector.tsx`

**Features**:
- Dropdown with 4 locations: Baltimore, Warrenton, main
- Show inventory count for each location (optional)
- Default to `customer.defaultWarehouseLocation`

**Example**:
```tsx
<WarehouseSelector
  value={warehouseLocation}
  onChange={setWarehouseLocation}
  showInventoryCounts={true}
/>
```

---

### 3. Implement Direct Order Creation API
**File**: `/web/src/app/api/sales/orders/route.ts`

**Replace existing POST handler with**:

```typescript
POST /api/sales/orders

Request Body:
{
  customerId: "uuid",
  deliveryDate: "2025-11-05",
  warehouseLocation: "Baltimore",
  deliveryTimeWindow: "8am-12pm",
  poNumber: "PO-12345",  // Optional unless customer.requiresPO
  specialInstructions: "Leave at side door",
  items: [
    { skuId: "uuid", quantity: 12 }
  ]
}

Logic:
1. Validate customer belongs to sales rep
2. Check inventory availability
3. Determine if requiresApproval needed
4. Create order with status = PENDING (if approval) or DRAFT
5. Create inventory reservations with expiresAt = NOW + 48 hours
6. Create order lines
7. Create activity log
8. Return order with inventory status

Response:
{
  orderId: "uuid",
  status: "PENDING",
  requiresApproval: true,
  inventoryStatus: { ... },
  order: { ... }
}
```

**Key Logic**:
- If any item has `insufficient inventory` → set `requiresApproval = true`, `status = DRAFT`
- If all items sufficient → set `status = PENDING`
- Create `InventoryReservation` records with `expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)`
- Update `Inventory.allocated` for each item
- Log activity with `activityCode = "ORDER_CREATED"`

---

## 🔄 Workflow After Implementation

### Sales Rep Creates Order:
1. Navigate to `/sales/orders`
2. Click "New Order" button → `/sales/orders/new`
3. Select customer (auto-fills defaults)
4. Choose delivery date (gets warned if same-day)
5. Select warehouse location
6. Add products to order
7. See real-time inventory status for each product
8. If low inventory → sees warning but can proceed
9. Submit order
10. Order status:
    - **DRAFT** if needs approval (insufficient inventory)
    - **PENDING** if all inventory sufficient

### Manager Approves (Week 2):
1. Navigate to `/sales/manager/approvals`
2. See list of orders needing approval
3. Review inventory situation
4. Approve or reject
5. If approved → status changes to **PENDING**

### Operations Processes (Week 3):
1. Sales rep marks order **READY_TO_DELIVER**
2. Operations sees in queue at `/sales/operations/queue`
3. Warehouse picks order → marks **PICKED**
4. Driver delivers → marks **DELIVERED**
5. Inventory decremented from onHand when marked **DELIVERED**

---

## 📋 Testing Checklist

After building order entry form:

- [ ] Can create order with sufficient inventory
- [ ] Can create order with insufficient inventory (requiresApproval=true)
- [ ] Delivery date validation warns on same-day
- [ ] Delivery date validation warns on non-delivery day
- [ ] PO number required when customer.requiresPO=true
- [ ] Warehouse selector shows 4 locations
- [ ] Inventory status updates in real-time
- [ ] Order total calculates correctly
- [ ] Special instructions save
- [ ] Activity log created
- [ ] Inventory reservations created with 48hr expiration

---

## 🗄️ Database State After Day 1

**Current Data**:
- ✅ 5,064 customers
- ✅ 34,350 orders
- ✅ 4 warehouse locations (Baltimore, Warrenton, main, "Not specified")
- ✅ All orders have new fields (null values)
- ✅ OrderStatus enum expanded
- ✅ Ready for new order creation

**Migration Applied**: `prisma db push` on October 31, 2025

---

## 💡 Pro Tips for Next Session

1. **Start with mock data**: Build the form UI first with hardcoded data
2. **Use existing components**: Leverage `InventoryStatusBadge` ✅
3. **Copy from existing forms**: Look at customer creation forms for patterns
4. **Test incrementally**: Build one section at a time
5. **Use TypeScript**: Prisma types are now updated with all new fields

---

## 🔗 Related Files to Reference

**For form patterns**:
- `/src/app/admin/sales-reps/new/page.tsx` - Form layout example
- `/src/app/sales/customers/page.tsx` - Search/filter patterns

**For API patterns**:
- `/src/app/api/sales/cart/checkout/route.ts` - Order creation logic (now deleted, but git history has it)
- `/src/lib/orders.ts` - Inventory allocation functions ✅

**For inventory**:
- `/src/lib/inventory.ts` - Inventory transaction service ✅
- `/src/app/api/inventory/check-availability/route.ts` - NEW ✅

**For UI components**:
- `/src/components/orders/InventoryStatusBadge.tsx` - NEW ✅

---

## ⚡ Quick Start Command for Next Session

```bash
# Navigate to project
cd /Users/greghogue/Leora2/web

# Verify schema is up to date
npx prisma generate

# Start dev server
npm run dev

# In another terminal, watch the build
npm run build -- --watch

# Create the new order page
mkdir -p src/app/sales/orders/new
# Then create page.tsx file
```

---

**Ready for Week 1 completion! 🚀**