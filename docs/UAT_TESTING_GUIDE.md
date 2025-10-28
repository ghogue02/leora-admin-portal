# User Acceptance Testing (UAT) Guide
## Leora CRM - Phase 4 Comprehensive Testing

**Version:** 1.0
**Date:** October 26, 2025
**Testing Period:** 16 hours allocated
**Success Criteria:** 90%+ test pass rate, no critical bugs

---

## Table of Contents

1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [User Roles](#user-roles)
4. [Testing Sections](#testing-sections)
5. [Bug Reporting](#bug-reporting)
6. [Sign-off Criteria](#sign-off-criteria)

---

## Overview

This UAT guide validates all features of the Leora CRM system from an end-user perspective. Testing covers:

- **Customer Management** - All customer-related workflows
- **Order Processing** - Catalog browsing, cart, and checkout
- **Sample Tracking** - Sample distribution and conversion
- **Dashboard & Analytics** - Data visualization and insights
- **Operations** - Warehouse, routes, and delivery tracking
- **CARLA AI** - AI assistant interactions
- **Mobile Responsiveness** - All features on mobile devices
- **Performance** - Page load times and responsiveness

---

## Test Environment Setup

### Prerequisites

1. **Browser Requirements:**
   - Chrome 120+ (primary)
   - Safari 17+ (macOS/iOS)
   - Firefox 121+
   - Edge 120+

2. **Test Accounts:**
   ```
   Sales Rep:     rep@wellcrafted.com / password123
   Manager:       manager@wellcrafted.com / password123
   Admin:         admin@wellcrafted.com / password123
   Portal User:   customer@restaurant.com / password123
   ```

3. **Test Data:**
   - Database seeded with sample customers, products, orders
   - At least 100 customers with activity history
   - 50+ products in catalog
   - Historical orders and samples

4. **Environment URL:**
   - Development: `http://localhost:3000`
   - Staging: `https://staging.leora.app`
   - Production: `https://app.leora.com`

### Setup Steps

1. Clear browser cache and cookies
2. Open browser developer tools (F12)
3. Enable console logging
4. Take screenshots of any issues
5. Note browser version and OS

---

## User Roles

### 1. Sales Representative
**Capabilities:**
- View and manage customers
- Log activities and samples
- Create call plans
- View personal dashboard
- Submit orders via portal

### 2. Sales Manager
**Capabilities:**
- All rep capabilities
- View team performance
- Manage territories
- Approve sample budgets
- Access analytics dashboard

### 3. Administrator
**Capabilities:**
- All manager capabilities
- User management
- System configuration
- Warehouse operations
- Route planning

### 4. Portal User (Customer)
**Capabilities:**
- Browse catalog
- Place orders
- View order history
- Manage account details

---

## Testing Sections

## Section 1: Customer Management (12 tests, 90 minutes)

### Test 1.1: View Customer List
**Steps:**
1. Login as sales rep
2. Navigate to Customers page
3. Verify customer list displays

**Expected Results:**
- [x] Customer list loads within 2 seconds
- [x] At least 10 customers visible
- [x] Each customer shows: name, account #, health score, last contact
- [x] Search bar is visible and functional

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.2: Search Customers
**Steps:**
1. Enter "Well" in search box
2. Wait for results

**Expected Results:**
- [x] Search debounces (no instant search)
- [x] Results update within 500ms
- [x] Results match search query
- [x] "No results" message if no matches

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.3: Filter by Health Score
**Steps:**
1. Click Filters button
2. Select "At Risk" health filter
3. Click Apply

**Expected Results:**
- [x] Only at-risk customers shown
- [x] Health badges show "At Risk" status
- [x] Filter can be cleared
- [x] Filter persists on refresh

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.4: View Customer Detail
**Steps:**
1. Click first customer in list
2. Verify detail page loads

**Expected Results:**
- [x] Page loads within 2 seconds
- [x] Customer name and details visible
- [x] Activity timeline displays
- [x] Recent orders visible
- [x] Samples logged visible
- [x] Contact information accurate

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.5: Log Customer Activity
**Steps:**
1. On customer detail page, click "Log Activity"
2. Select "Visit" from type dropdown
3. Enter notes: "Discussed new wine selection"
4. Click Save

**Expected Results:**
- [x] Modal opens instantly
- [x] All activity types available (Visit, Call, Email, Note)
- [x] Date defaults to today
- [x] Success toast appears
- [x] Activity appears in timeline immediately
- [x] Activity shows correct timestamp

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.6: Log Sample Distribution
**Steps:**
1. Click "Log Sample" button
2. Select product from dropdown
3. Enter quantity: 2
4. Add notes
5. Submit

**Expected Results:**
- [x] Product list loads quickly
- [x] Quantity validation works
- [x] Sample logged successfully
- [x] Appears in activity timeline
- [x] Sample budget updates
- [x] Follow-up reminder created

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.7: Create Call Plan
**Steps:**
1. Go to Customers page
2. Select 5 customers via checkboxes
3. Click "Create Call Plan"
4. Fill form: "Weekly Route - North", frequency: Weekly
5. Submit

**Expected Results:**
- [x] Multiple customers can be selected
- [x] Selection count shows correctly
- [x] Call plan form opens
- [x] All fields required
- [x] Success message appears
- [x] Redirects to call plan detail

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.8: Mark Customer Contacted
**Steps:**
1. Go to Call Plans page
2. Open first call plan
3. Click "Contact" on first customer
4. Select outcome: "Connected"
5. Add notes
6. Submit

**Expected Results:**
- [x] Contact form opens
- [x] Outcome options available
- [x] Notes field works
- [x] Status updates to "Contacted"
- [x] Timestamp recorded
- [x] Progress bar updates

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.9: Customer with Large Activity History
**Steps:**
1. Navigate to customer with 50+ activities
2. Scroll through timeline
3. Load more activities

**Expected Results:**
- [x] Page loads without timeout
- [x] Timeline renders properly
- [x] Infinite scroll or pagination works
- [x] No performance degradation
- [x] All activities load correctly

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.10: Export Customer List
**Steps:**
1. Go to Customers page
2. Apply filters if desired
3. Click "Export" button
4. Select CSV format

**Expected Results:**
- [x] Export button visible
- [x] Format options available
- [x] File downloads
- [x] CSV contains correct data
- [x] All columns present
- [x] Data matches filtered view

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.11: Mobile - View Customers
**Device:** iPhone/Android
**Steps:**
1. Open customers page on mobile
2. Scroll through list
3. Tap customer to view detail

**Expected Results:**
- [x] Mobile-optimized layout
- [x] Cards stack vertically
- [x] Touch targets adequate size
- [x] Scrolling smooth
- [x] Detail page readable

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 1.12: Performance - Customer List Load Time
**Steps:**
1. Clear cache
2. Navigate to customers page
3. Measure load time

**Expected Results:**
- [x] Page loads under 2 seconds
- [x] No JavaScript errors
- [x] Images load properly
- [x] Data populates correctly

**Actual Results:**
Load Time: _____ ms

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## Section 2: Order Processing (10 tests, 75 minutes)

### Test 2.1: Browse Catalog
**Steps:**
1. Login as portal user
2. Navigate to Catalog
3. Browse products

**Expected Results:**
- [x] Catalog loads under 2 seconds
- [x] Products display in grid
- [x] Images load correctly
- [x] Prices visible
- [x] Product details available

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.2: Search Catalog
**Steps:**
1. Enter "Pinot" in search
2. View results

**Expected Results:**
- [x] Search works instantly
- [x] Results relevant to query
- [x] Can clear search
- [x] "No results" for invalid search

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.3: Filter by Category
**Steps:**
1. Open filters
2. Select "Wine" category
3. Apply

**Expected Results:**
- [x] Only wine products shown
- [x] Filter badge appears
- [x] Can remove filter
- [x] Multiple filters work together

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.4: Add to Cart
**Steps:**
1. Click "Add to Cart" on 3 products
2. Check cart badge

**Expected Results:**
- [x] Cart badge updates (shows 3)
- [x] Success toast appears
- [x] Can continue shopping
- [x] Cart persists across pages

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.5: View Cart
**Steps:**
1. Click cart icon
2. Review items

**Expected Results:**
- [x] All added items visible
- [x] Quantities correct
- [x] Prices accurate
- [x] Subtotal calculates
- [x] Can update quantities
- [x] Can remove items

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.6: Update Cart Quantity
**Steps:**
1. In cart, change quantity to 5
2. Click Update

**Expected Results:**
- [x] Quantity updates
- [x] Subtotal recalculates
- [x] Total updates
- [x] No page reload

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.7: Remove from Cart
**Steps:**
1. Click remove on one item
2. Confirm deletion

**Expected Results:**
- [x] Confirmation dialog appears
- [x] Item removed after confirm
- [x] Cart total updates
- [x] Cart badge updates
- [x] Empty state shows if cart empty

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.8: Place Order
**Steps:**
1. With items in cart, click "Place Order"
2. Review order summary
3. Confirm order

**Expected Results:**
- [x] Order summary accurate
- [x] Delivery address shown
- [x] Order total correct
- [x] Success message appears
- [x] Redirects to order confirmation
- [x] Order number provided
- [x] Cart clears

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.9: View Order History
**Steps:**
1. Navigate to Orders
2. Review order list

**Expected Results:**
- [x] Recent orders visible
- [x] Order status shown
- [x] Order date visible
- [x] Order total displayed
- [x] Can click for details

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test 2.10: View Order Detail
**Steps:**
1. Click on order from history
2. Review details

**Expected Results:**
- [x] All order items listed
- [x] Quantities correct
- [x] Prices accurate
- [x] Delivery address shown
- [x] Order status visible
- [x] Can download invoice (if available)

**Actual Results:**
_[Tester notes]_

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## Section 3: Sample Tracking (8 tests, 60 minutes)

_[Similar detailed test cases for sample management workflows]_

## Section 4: Dashboard & CARLA (10 tests, 75 minutes)

_[Test cases for dashboard widgets and CARLA interactions]_

## Section 5: Operations (8 tests, 60 minutes)

_[Test cases for warehouse, routes, delivery tracking]_

## Section 6: Performance Testing (6 tests, 45 minutes)

_[Load time, responsiveness, large dataset tests]_

## Section 7: Security Testing (8 tests, 60 minutes)

_[Authentication, authorization, input validation tests]_

## Section 8: Mobile Testing (10 tests, 75 minutes)

_[All critical workflows on mobile devices]_

---

## Bug Reporting

### Bug Template

```markdown
**Bug ID:** UAT-XXX
**Severity:** Critical / High / Medium / Low
**Test Case:** [Test number and name]
**Browser:** Chrome 120 / Safari 17 / Firefox 121
**OS:** macOS 14 / Windows 11 / iOS 17

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshot:**
[Attach screenshot]

**Console Errors:**
[Any JavaScript errors from console]

**Additional Notes:**
[Any other relevant information]
```

### Severity Definitions

- **Critical:** System crash, data loss, security vulnerability, complete feature failure
- **High:** Major feature not working, significant impact on usability
- **Medium:** Feature works but with issues, workaround available
- **Low:** Minor cosmetic issue, typo, minor UI inconsistency

---

## Sign-off Criteria

### Required for UAT Approval

- [ ] **90%+ test pass rate** across all sections
- [ ] **Zero critical bugs** unresolved
- [ ] **All high bugs** have fix timeline
- [ ] **Performance targets met** (page load <2s, API <500ms)
- [ ] **Cross-browser testing complete** (Chrome, Safari, Firefox, Edge)
- [ ] **Mobile testing complete** (iOS Safari, Android Chrome)
- [ ] **Security tests passed** (auth, authorization, XSS, CSRF)
- [ ] **Accessibility score >90** (if applicable)

### Sign-off

**Tester Name:** ___________________
**Date:** ___________________
**Overall Status:** Pass / Fail / Conditional Pass
**Comments:**

_______________________________________________

**Product Owner Approval:** ___________________
**Date:** ___________________

---

## Appendix

### A. Test Data Reference

**Customers:**
- Well Crafted Wine & Spirits (ID: 1) - High value, many activities
- The Wine Cellar (ID: 2) - Medium value
- Cork & Barrel (ID: 3) - At-risk status

**Products:**
- Pinot Noir 2020 (SKU: WINE-001)
- Chardonnay 2021 (SKU: WINE-002)
- Cabernet Sauvignon 2019 (SKU: WINE-003)

**Orders:**
- Order #1001 - Completed
- Order #1002 - In Progress
- Order #1003 - Pending

### B. Performance Benchmarks

| Page | Target Load Time | Critical Threshold |
|------|------------------|-------------------|
| Dashboard | <2s | <3s |
| Customer List | <2s | <3s |
| Customer Detail | <2s | <3s |
| Catalog | <2s | <3s |
| Cart | <1s | <2s |
| Order History | <2s | <3s |

### C. Browser Compatibility Matrix

| Feature | Chrome | Safari | Firefox | Edge | Mobile Chrome | Mobile Safari |
|---------|--------|--------|---------|------|---------------|---------------|
| Customer Mgmt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Orders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Samples | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Maps | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CARLA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

**Document Version:** 1.0
**Last Updated:** October 26, 2025
**Next Review:** After UAT completion
