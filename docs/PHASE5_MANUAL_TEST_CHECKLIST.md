# Phase 5 Manual Test Checklist

## Overview

This checklist covers human testing scenarios that cannot be fully automated. Test on actual devices (iPad, mobile) in real warehouse conditions when possible.

**Tester:** _________________
**Date:** _________________
**Environment:** [ ] Staging [ ] Production

---

## 1. Warehouse Location Management

### Desktop/Web Interface

- [ ] Navigate to Warehouse Settings
- [ ] View current warehouse configuration
  - [ ] Verify aisles displayed correctly (A-Z)
  - [ ] Verify rack/shelf ranges shown
  - [ ] Verify location format example visible

- [ ] Assign location to inventory item
  - [ ] Search for inventory item by SKU
  - [ ] Enter warehouse location (e.g., A-01-01)
  - [ ] Verify location format validation
  - [ ] Save location
  - [ ] Verify pickOrder auto-calculated
  - [ ] Verify location saved successfully

- [ ] Update existing location
  - [ ] Find item with existing location
  - [ ] Change to new location
  - [ ] Verify pickOrder updates
  - [ ] Save and verify

- [ ] Invalid location handling
  - [ ] Try entering "A-1-1" (should fail)
  - [ ] Try entering "AA-01-01" (should fail)
  - [ ] Try entering "Z-100-01" (should fail if out of range)
  - [ ] Verify error messages are clear

- [ ] Bulk location import
  - [ ] Download CSV template
  - [ ] Fill in 10-20 test locations
  - [ ] Upload CSV file
  - [ ] Verify import progress indicator
  - [ ] Verify success/error summary
  - [ ] Check that locations were applied
  - [ ] Verify pickOrder calculated for all

- [ ] Warehouse map view
  - [ ] Open warehouse map
  - [ ] Verify all aisles visible
  - [ ] Click on a location
  - [ ] Verify items at location shown
  - [ ] Verify quantity counts displayed
  - [ ] Check map loads in <2 seconds

---

## 2. Pick Sheet Generation

### Desktop Interface

- [ ] Create new pick sheet
  - [ ] Navigate to Orders → Create Pick Sheet
  - [ ] Select 3-5 orders with SUBMITTED status
  - [ ] Click "Generate Pick Sheet"
  - [ ] Verify pick sheet created
  - [ ] Verify items listed in pickOrder
  - [ ] Verify locations displayed

- [ ] View pick sheet details
  - [ ] Open generated pick sheet
  - [ ] Verify all order items included
  - [ ] Verify quantities correct
  - [ ] Verify locations match inventory
  - [ ] Verify items sorted by aisle/location
  - [ ] Check items in aisle A before aisle B

- [ ] Print pick sheet
  - [ ] Click Print button
  - [ ] Verify print preview
  - [ ] Check formatting (readable on paper)
  - [ ] Verify all columns visible
  - [ ] Print actual copy (optional)

### iPad/Mobile Interface

- [ ] Open pick sheet on iPad
  - [ ] Navigate to Warehouse → Pick Sheets
  - [ ] Select active pick sheet
  - [ ] Verify layout optimized for tablet
  - [ ] Verify text large enough to read while moving

- [ ] Mark items as picked
  - [ ] Tap first item checkbox
  - [ ] Verify checked state persists
  - [ ] Move to location A-01-01
  - [ ] Pick item from shelf
  - [ ] Check off item
  - [ ] Repeat for 5-10 items
  - [ ] Verify progress indicator updates

- [ ] Barcode scanning (if implemented)
  - [ ] Scan product barcode
  - [ ] Verify correct item highlighted
  - [ ] Auto-check item
  - [ ] Scan location barcode
  - [ ] Verify matches expected location

- [ ] Complete pick sheet
  - [ ] Pick all remaining items
  - [ ] Click "Complete Pick Sheet"
  - [ ] Verify confirmation dialog
  - [ ] Confirm completion
  - [ ] Verify status changed to COMPLETED
  - [ ] Verify timestamp recorded

- [ ] Cancel pick sheet
  - [ ] Start new pick sheet
  - [ ] Pick 2-3 items
  - [ ] Click "Cancel Pick Sheet"
  - [ ] Verify warning shown
  - [ ] Confirm cancellation
  - [ ] Verify items unmarked
  - [ ] Verify status changed to CANCELLED

### Error Scenarios

- [ ] Try to complete with unpicked items
  - [ ] Leave 1 item unchecked
  - [ ] Try to complete
  - [ ] Verify error: "All items must be picked"

- [ ] Offline/network loss
  - [ ] Disable Wi-Fi mid-pick
  - [ ] Try to check off item
  - [ ] Verify offline indicator
  - [ ] Re-enable Wi-Fi
  - [ ] Verify sync occurs
  - [ ] Verify no data lost

---

## 3. Azuga Routing Export

### Export Process

- [ ] Navigate to Routing → Export to Azuga
- [ ] Select date range (today)
- [ ] Select territory (if applicable)
- [ ] Click "Export to CSV"
- [ ] Verify download starts
- [ ] Open CSV file in Excel
- [ ] Verify headers exact: `Name,Address,City,State,Zip,Phone,Notes`
- [ ] Verify all fulfilled orders included
- [ ] Verify customer names formatted correctly
- [ ] Verify addresses complete
- [ ] Verify phone numbers formatted
- [ ] Verify delivery instructions in Notes column
- [ ] Check for any data errors

### CSV Format Validation

- [ ] Check special characters
  - [ ] Verify apostrophes preserved (O'Brien)
  - [ ] Verify accents preserved (José)
  - [ ] Verify commas in addresses quoted
  - [ ] Verify quotes escaped ("ABC" → ""ABC"")

- [ ] Check data accuracy
  - [ ] Compare 3 orders against database
  - [ ] Verify addresses match exactly
  - [ ] Verify phone numbers correct
  - [ ] Verify no missing fields

- [ ] Territory filtering
  - [ ] Export "North" territory only
  - [ ] Verify only North orders included
  - [ ] Export "South" territory
  - [ ] Verify different orders

---

## 4. Route Import from Azuga

### Import Process

- [ ] Navigate to Routing → Import Route
- [ ] Upload Azuga route CSV
- [ ] Verify file validation
- [ ] Click "Import Route"
- [ ] Verify progress indicator
- [ ] Verify import success message
- [ ] Check number of stops imported

### Route Verification

- [ ] View imported route
  - [ ] Navigate to Routing → Today's Routes
  - [ ] Select imported route
  - [ ] Verify route name matches CSV
  - [ ] Verify date correct
  - [ ] Verify all stops listed

- [ ] Check stop details
  - [ ] Verify stops in correct order
  - [ ] Verify stop 1 matches CSV row 1
  - [ ] Verify customer names match
  - [ ] Verify addresses match
  - [ ] Verify ETAs match
  - [ ] Check all stops have PENDING status

- [ ] Order linking
  - [ ] Verify stops linked to orders
  - [ ] Click on a stop
  - [ ] Verify order details shown
  - [ ] Verify order status updated

### Error Handling

- [ ] Upload invalid CSV
  - [ ] Upload file with wrong headers
  - [ ] Verify clear error message
  - [ ] Upload empty file
  - [ ] Verify error handling

- [ ] Duplicate route import
  - [ ] Import same route twice
  - [ ] Verify duplicate detection
  - [ ] Verify appropriate warning

---

## 5. Driver Route View

### Mobile/Tablet Interface

- [ ] Open route on mobile device
  - [ ] Navigate to Driver → My Routes
  - [ ] Select today's route
  - [ ] Verify route overview shown
  - [ ] Verify stop count displayed
  - [ ] Verify estimated duration shown

- [ ] Navigate stops
  - [ ] Tap "Start Route"
  - [ ] Verify first stop highlighted
  - [ ] View stop details
  - [ ] Verify customer name
  - [ ] Verify address
  - [ ] Verify phone number (clickable)
  - [ ] Verify delivery notes

- [ ] Get directions
  - [ ] Tap "Navigate" button
  - [ ] Verify maps app opens
  - [ ] Verify correct address passed

- [ ] Update stop status
  - [ ] Mark stop as "En Route"
  - [ ] Verify status updates
  - [ ] Mark as "Delivered"
  - [ ] Verify timestamp recorded
  - [ ] Verify actual arrival time saved
  - [ ] Verify next stop highlighted

- [ ] Handle exceptions
  - [ ] Mark stop as "Customer Not Home"
  - [ ] Add notes
  - [ ] Take photo (if implemented)
  - [ ] Save exception
  - [ ] Verify exception logged

---

## 6. End-to-End Workflows

### Workflow A: Order to Delivery

- [ ] **Day 1: Order Received**
  - [ ] Create new order for customer
  - [ ] Add 3-5 line items
  - [ ] Mark order as SUBMITTED
  - [ ] Verify inventory allocated

- [ ] **Day 2: Pick Items**
  - [ ] Generate pick sheet
  - [ ] Open on iPad
  - [ ] Walk warehouse picking items
  - [ ] Check off each item
  - [ ] Complete pick sheet
  - [ ] Verify order status → FULFILLED

- [ ] **Day 3: Create Route**
  - [ ] Export fulfilled orders to Azuga
  - [ ] Open CSV in Azuga (simulated)
  - [ ] Import optimized route back
  - [ ] Verify route created
  - [ ] Verify stops in order

- [ ] **Day 4: Deliver**
  - [ ] Driver opens route on mobile
  - [ ] Navigate to first stop
  - [ ] Mark as delivered
  - [ ] Repeat for all stops
  - [ ] Verify route completed
  - [ ] Verify all orders delivered

### Workflow B: Location Management

- [ ] Receive new inventory
  - [ ] Add new inventory items (5 items)
  - [ ] Assign to warehouse locations
  - [ ] Verify pickOrder calculated

- [ ] Reorganize warehouse
  - [ ] Create CSV with new locations
  - [ ] Import CSV
  - [ ] Verify all updated
  - [ ] Verify pickOrder recalculated

- [ ] Use in pick sheet
  - [ ] Create pick sheet with relocated items
  - [ ] Verify locations correct
  - [ ] Verify sorted by new pickOrder

---

## 7. Performance & UX

### Page Load Times

- [ ] Warehouse Settings page: _____s (target <2s)
- [ ] Pick Sheet list: _____s (target <1s)
- [ ] Pick Sheet detail (100 items): _____s (target <1s)
- [ ] Warehouse map (500 items): _____s (target <2s)
- [ ] Route list: _____s (target <1s)
- [ ] Route detail (20 stops): _____s (target <1s)

### Mobile Performance

- [ ] iPad pick sheet scrolling smooth
- [ ] Mobile route view responsive
- [ ] Touch targets large enough (44x44px minimum)
- [ ] No layout shifts while loading

### Usability

- [ ] All buttons labeled clearly
- [ ] Icons intuitive
- [ ] Error messages helpful
- [ ] Success confirmations visible
- [ ] Loading states shown
- [ ] No confusing workflows

---

## 8. Data Accuracy Validation

### Cross-Reference Data

- [ ] Pick 3 random orders
- [ ] For each order:
  - [ ] Verify items match database
  - [ ] Verify quantities correct
  - [ ] Verify locations accurate
  - [ ] Verify customer info correct
  - [ ] Verify pricing matches

- [ ] Pick 3 random routes
- [ ] For each route:
  - [ ] Verify stops match exported orders
  - [ ] Verify addresses exact
  - [ ] Verify ETAs reasonable
  - [ ] Verify no duplicate stops

---

## 9. Edge Cases

### Large Data Sets

- [ ] Generate pick sheet with 100+ items
  - [ ] Verify loads in <1s
  - [ ] Verify scrolling smooth
  - [ ] Verify can complete

- [ ] Import route with 50+ stops
  - [ ] Verify imports successfully
  - [ ] Verify all stops created
  - [ ] Verify no timeouts

### Concurrent Users

- [ ] Two users pick from same sheet
  - [ ] User 1 checks item 1
  - [ ] User 2 checks item 2
  - [ ] Verify both updates saved
  - [ ] Verify no conflicts

- [ ] Two users update same inventory location
  - [ ] Both navigate to same item
  - [ ] Both change location
  - [ ] Verify last write wins (or conflict handled)

### Data Edge Cases

- [ ] Item with no location
  - [ ] Create pick sheet
  - [ ] Verify item shown (at end of list)
  - [ ] Verify pickable

- [ ] Customer with special characters
  - [ ] Name: O'Brien & Associates, LLC
  - [ ] Address: 100 "Main" St, Apt #5
  - [ ] Export to Azuga
  - [ ] Verify CSV properly escaped

- [ ] Very long delivery instructions
  - [ ] 500 character note
  - [ ] Export to Azuga
  - [ ] Verify truncated to 200 chars

---

## 10. Browser/Device Compatibility

### Desktop Browsers

- [ ] Chrome (latest): All features work
- [ ] Firefox (latest): All features work
- [ ] Safari (latest): All features work
- [ ] Edge (latest): All features work

### Mobile Devices

- [ ] iPad (iOS 16+): Pick sheet works
- [ ] iPhone (iOS 16+): Route view works
- [ ] Android Tablet: Pick sheet works
- [ ] Android Phone: Route view works

### Screen Sizes

- [ ] Desktop (1920x1080): Layout correct
- [ ] Laptop (1366x768): Layout correct
- [ ] iPad (768x1024): Tablet layout
- [ ] iPhone (375x667): Mobile layout

---

## Issues Found

| # | Description | Severity | Status | Notes |
|---|-------------|----------|--------|-------|
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 4 |  |  |  |  |
| 5 |  |  |  |  |

**Severity:** P1 (Blocker) | P2 (Major) | P3 (Minor) | P4 (Nice-to-have)

---

## Sign-Off

**All critical paths tested:** [ ] Yes [ ] No
**All major bugs resolved:** [ ] Yes [ ] No
**Ready for production:** [ ] Yes [ ] No

**Tester Signature:** _________________
**Date:** _________________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
