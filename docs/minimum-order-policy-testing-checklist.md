# Minimum Order Policy - Frontend Testing Checklist

## ✅ Migration Status
- [x] Database schema updated (TenantSettings, Customer, Order tables)
- [x] Migration tracked in Prisma
- [ ] Frontend testing (use this checklist)

---

## 🎯 Testing Overview

This feature adds configurable minimum order enforcement with three levels:
1. **Tenant-level default** (applies to all customers)
2. **Customer-level overrides** (specific exceptions)
3. **Order-level tracking** (audit trail of violations and approvals)

---

## 1️⃣ Admin: Configure Tenant-Level Minimum Order Policy

**Location**: Admin Console → Settings → Orders (hits `/api/admin/orders/minimum-order`)  
**API**: `GET/PUT /api/admin/orders/minimum-order`

### Test Steps:
- [ ] **Navigate** to admin area where tenant settings are configured
- [ ] **Look for** minimum order policy configuration
- [ ] **Verify** you can see:
  - [ ] Minimum order amount field (should default to $200.00)
  - [ ] Enforcement enabled/disabled toggle (should default to OFF)
- [ ] **Test enabling enforcement**:
  - [ ] Toggle enforcement ON
  - [ ] Set minimum order amount to `$250.00`
  - [ ] Click Save
  - [ ] Refresh page - settings should persist
- [ ] **Test disabling enforcement**:
  - [ ] Toggle enforcement OFF
  - [ ] Click Save
  - [ ] Verify warning/info message that enforcement is disabled

### Expected Results:
✅ Settings save successfully  
✅ Values persist after page reload (re-fetch hits the same API)  
✅ Toggle clearly indicates enabled/disabled state  
✅ No requests made to `/api/admin/orders/settings` (that path is deprecated)

---

## 2️⃣ Admin: Customer-Level Overrides

**Location**: Admin → Customers → [Select Customer] → Edit  
**API**: `PUT /api/admin/customers/[id]` (override fields live here)

### Test Steps:
- [ ] **Navigate** to customer detail/edit page
- [ ] **Look for** "Minimum Order Override" section/card
- [ ] **Verify** you can see:
  - [ ] Current tenant default amount displayed (e.g., "$250.00")
  - [ ] Override amount input field
  - [ ] Override notes/reason text area
  - [ ] Save button

### Test Case A: Set Lower Override
- [ ] Enter override amount: `$100.00`
- [ ] Enter notes: `VIP customer - reduced minimum`
- [ ] Click Save
- [ ] Verify success message
- [ ] Refresh page - override should persist
- [ ] Verify "Updated by" and "Updated at" fields are populated

### Test Case B: Set Higher Override
- [ ] Enter override amount: `$500.00`
- [ ] Enter notes: `New customer - requires higher minimum`
- [ ] Click Save
- [ ] Verify success message

### Test Case C: Remove Override
- [ ] Clear the override amount field
- [ ] Click Save
- [ ] Verify customer reverts to tenant default
- [ ] Verify override notes are cleared

### Expected Results:
✅ Override saves successfully  
✅ Audit fields (`minimumOrderOverrideUpdatedBy/At`) populate  
✅ UI shows tenant default vs. customer override clearly  
✅ Overrides reflected in subsequent GET requests / customer drawer

---

## 3️⃣ Sales Rep: View Minimum Order Policy

**Location**: Sales → Orders → New (`/sales/orders/new`)  
**API**: `GET /api/sales/settings/minimum-order` + `GET /api/sales/customers/search`

### Prerequisites:
- [ ] Tenant minimum order enforcement is ENABLED
- [ ] Tenant default is set (e.g., $250.00)

### Test Steps:
- [ ] **Login** as a sales representative
- [ ] **Navigate** to New Order page
- [ ] **Select** a customer WITHOUT an override
- [ ] **Verify** you see:
  - [ ] Minimum order policy displayed (e.g., "Minimum order: $250.00")
  - [ ] Policy source indicated (e.g., "Tenant default")

### Test with Customer Override:
- [ ] **Select** a customer WITH a lower override (e.g., $100.00)
- [ ] **Verify** you see:
  - [ ] Override amount displayed (e.g., "Minimum order: $100.00")
  - [ ] Source indicated (e.g., "Customer override")
  - [ ] Maybe show override notes/reason

### Expected Results:
✅ Policy amount displays correctly in sidebar + preview  
✅ Source badge shows tenant default vs. customer override  
✅ If enforcement disabled, no warning indicator shows

---

## 4️⃣ Sales Rep: Create Order BELOW Minimum (Violation)

**Prerequisites**:
- [ ] Customer has $250 minimum (tenant default)
- [ ] Enforcement is ENABLED

### Test Steps:
- [ ] Start a new order for this customer
- [ ] Add products totaling **$150.00** (below minimum)
- [ ] **Review order summary** - you should see:
  - [ ] Order total: $150.00
  - [ ] Minimum required: $250.00
  - [ ] Warning badge/message: "Below minimum order amount"
  - [ ] Indication that order requires manager approval

### Test Submission:
- [ ] Click "Submit Order" or equivalent
- [ ] **Verify** submission succeeds (order is created)
- [ ] **Verify** you see confirmation:
  - [ ] "Order submitted for manager approval"
  - [ ] Reason includes "Below minimum order amount"
  - [ ] Order status is "Pending Approval"

### Expected Results:
✅ Warning displays BEFORE submission (sidebar + modal)  
✅ Order submits successfully (API returns `minimumOrderViolation: true`)  
✅ Order goes to Pending Approval status  
✅ `approvalReasons` array includes `{ code: "MIN_ORDER", … }`

---

## 5️⃣ Sales Rep: Create Order ABOVE Minimum (No Violation)

**Prerequisites**:
- [ ] Customer has $250 minimum
- [ ] Enforcement is ENABLED

### Test Steps:
- [ ] Start a new order for this customer
- [ ] Add products totaling **$300.00** (above minimum)
- [ ] **Review order summary** - you should see:
  - [ ] Order total: $300.00
  - [ ] Minimum required: $250.00
  - [ ] ✅ Green checkmark or "Meets minimum" indicator
  - [ ] NO approval warning

### Test Submission:
- [ ] Click "Submit Order"
- [ ] **Verify** order processes normally
- [ ] **Verify** order does NOT require manager approval (assuming no other violations)
- [ ] Order should go straight to "Confirmed" or normal processing status

### Expected Results:
✅ No minimum-order warning  
✅ Order confirms immediately (requiresApproval=false unless other triggers)  
✅ API response shows `minimumOrderViolation: false`

---

## 6️⃣ Sales Rep: Order WITH Customer Override

**Prerequisites**:
- [ ] Customer has override set to $100.00 (lower than tenant default of $250)
- [ ] Enforcement is ENABLED

### Test Case A: Below Override (Violation)
- [ ] Create order totaling **$75.00**
- [ ] **Verify** warning shows: "Below minimum ($100.00)"
- [ ] Submit order
- [ ] **Verify** requires manager approval

### Test Case B: Above Override (No Violation)
- [ ] Create order totaling **$150.00**
- [ ] **Verify** NO warning (above customer's $100 minimum, even though below tenant $250)
- [ ] Submit order
- [ ] **Verify** order confirms immediately

### Expected Results:
✅ Customer override takes precedence over tenant default  
✅ Warnings/approvals based on override threshold  
✅ Order payload stores applied threshold (`minimumOrderThreshold`)

---

## 7️⃣ Sales Rep: Enforcement DISABLED

**Prerequisites**:
- [ ] Tenant minimum order enforcement is DISABLED
- [ ] Tenant default amount still exists (e.g., $250.00)

### Test Steps:
- [ ] Create order for any amount (e.g., $50.00)
- [ ] **Verify** NO minimum order warning displays
- [ ] Submit order
- [ ] **Verify** order confirms immediately (no approval required for minimum violation)

### Expected Results:
✅ No enforcement when toggle is OFF  
✅ Orders process normally regardless of total  
✅ `minimumOrderViolation` always false

---

## 8️⃣ Manager: Review Orders with Minimum Violations

**Location**: Sales Manager → Approvals Dashboard

### Test Steps:
- [ ] **Login** as sales manager
- [ ] **Navigate** to pending approvals
- [ ] **Find** an order with minimum order violation (created in test 4)
- [ ] **Verify** you can see:
  - [ ] Order details (customer, total amount)
  - [ ] Badge/indicator: "Below minimum order"
  - [ ] Minimum threshold that was applied (e.g., "$250.00 tenant default")
  - [ ] Actual order total (e.g., "$150.00")
  - [ ] Shortfall amount (e.g., "$100.00 below minimum")

### Test Approval:
- [ ] Click "Approve" or equivalent
- [ ] **Verify** order status changes to "Approved" or next status
- [ ] **Verify** approval is recorded in order history

### Test with Multiple Violations:
- [ ] **Find** an order with BOTH minimum violation AND another issue (e.g., pricing override)
- [ ] **Verify** both violations display as separate badges/reasons
- [ ] **Verify** `approvalReasons` array contains both items

### Expected Results:
✅ Manager sees badge “Below minimum order” with threshold + shortfall  
✅ Approvals API returns `approvalReasons` array (with `code: "MIN_ORDER"`)  
✅ Approving order transitions it to the next state

---

## 9️⃣ Order Details: Audit Trail

**Location**: Order detail page (admin or sales view)

### Test Steps:
- [ ] **Open** an order that had a minimum violation
- [ ] **Verify** you can see:
  - [ ] `minimumOrderThreshold` value (e.g., $250.00)
  - [ ] `minimumOrderViolation` = true
  - [ ] `approvalReasons` includes minimum-order entry with:
    - [ ] Type: "minimum-order"
    - [ ] Applied threshold
    - [ ] Actual total
    - [ ] Whether it was tenant default or customer override

### Expected Results:
✅ `minimumOrderThreshold` and `minimumOrderViolation` fields present  
✅ `approvalReasons` entry for minimum-order shows source + shortfall  
✅ Activity log notes include reason summary

---

## 🔟 Edge Cases & Error Handling

### Test Case A: Customer with No Override, Tenant Enforcement Disabled
- [ ] Create order for any amount
- [ ] **Verify** no enforcement
- [ ] Order confirms immediately

### Test Case B: Invalid Override Amount (e.g., negative)
- [ ] Try to set customer override to `-$50.00`
- [ ] **Verify** validation error
- [ ] Save is blocked

### Test Case C: Concurrent Updates
- [ ] Admin updates tenant minimum while sales rep has order open
- [ ] **Verify** sales rep sees current policy when they refresh
- [ ] Order submission uses policy active at submission time

### Test Case D: Customer Override Removal During Order Creation
- [ ] Sales rep starts order (sees $100 override)
- [ ] Admin removes override (reverts to $250 tenant default)
- [ ] Sales rep submits order
- [ ] **Verify** final submission uses the policy active at submission time (tenant default)

---

## 📊 Summary Checklist

**Admin Functionality**:
- [ ] Can configure tenant-level minimum order amount (settings page + API)
- [ ] Can enable/disable enforcement and see status badge
- [ ] Can set/clear customer-specific overrides (with notes + audit)
- [ ] GET requests show consistent values after save

**Sales Rep Functionality**:
- [ ] Sidebar + preview show correct policy info
- [ ] Warnings trigger when totals fall below threshold
- [ ] Can submit orders below minimum (auto route to approval)
- [ ] Orders above minimum bypass approval (unless other triggers)
- [ ] Customer overrides override tenant defaults

**Manager Functionality**:
- [ ] Approvals dashboard lists minimum-order violations
- [ ] Each card shows threshold + shortfall + other reasons
- [ ] Approve/Reject flows keep reason tags intact
- [ ] Multiple violation types (inventory, pricing, minimum) are distinct

**Data Integrity**:
- [ ] `minimumOrderThreshold` persisted on every order
- [ ] `minimumOrderViolation` flag set correctly
- [ ] `approvalReasons` contains structured JSON entries
- [ ] Audit fields (updatedBy/At) on customer overrides populated

---

## 🐛 Issues to Report

If you encounter any issues during testing, report them with:

1. **Test section** (e.g., "4️⃣ - Order Below Minimum")
2. **Expected behavior** (from checklist)
3. **Actual behavior** (what happened)
4. **Steps to reproduce**
5. **Screenshot** (if UI issue)

---

## 📝 Notes

- All monetary amounts should display with proper formatting (e.g., `$250.00`)
- Currency symbol should match tenant settings
- Dates/times should show in user's timezone
- All text should be clear and user-friendly
- UI should be responsive on mobile/tablet

---

## ✅ Sign-off

Once all tests pass:
- [ ] Update Jira ticket [CRM-80](https://greghogue.atlassian.net/browse/CRM-80)
- [ ] Mark feature as "Ready for Production"
- [ ] Document any known issues or limitations
- [ ] Notify stakeholders of feature availability
