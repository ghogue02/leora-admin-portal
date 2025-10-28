# Phase 6 Manual Test Checklist

## Overview

Manual testing checklist for Phase 6 (Maps & Territory) features. Complete this checklist before production deployment.

**Tester:** _____________
**Date:** _____________
**Browser:** _____________
**Device:** _____________

---

## Pre-Testing Setup

- [ ] Database seeded with test customers (at least 100)
- [ ] Mapbox API token configured
- [ ] Test users created (Manager, Sales Rep, Admin)
- [ ] Development environment running
- [ ] Browser console open for errors

---

## 1. Customer Map Display

### Basic Map Loading

- [ ] Navigate to `/map` page
- [ ] Map loads without errors
- [ ] Map tiles load completely
- [ ] Zoom controls visible and functional
- [ ] Pan controls work (drag map)
- [ ] Home button returns to default view

### Customer Markers

- [ ] Customer markers appear on map
- [ ] Marker count matches geocoded customer count
- [ ] Marker colors correct (Premium=Blue, Standard=Green, etc.)
- [ ] Clicking marker shows customer popup
- [ ] Popup displays customer name, tier, revenue
- [ ] "View Details" link works
- [ ] "Get Directions" link works
- [ ] Multiple markers clickable

### Marker Clustering

- [ ] Zoom out to trigger clustering
- [ ] Cluster markers show customer count
- [ ] Cluster color indicates customer tiers
- [ ] Clicking cluster zooms to that area
- [ ] Clusters split into individual markers when zoomed in

---

## 2. Map Filtering

### Filter Panel

- [ ] Click "Filters" button opens filter panel
- [ ] Filter panel displays all filter options
- [ ] Filters organized in sections

### Territory Filter

- [ ] Select specific territory from dropdown
- [ ] Only customers in that territory appear
- [ ] "My Territory" shows current user's assigned customers
- [ ] "All Territories" shows all customers
- [ ] Multiple territory selection works

### Tier Filter

- [ ] Check/uncheck Premium tier
- [ ] Markers update in real-time
- [ ] Check/uncheck Standard tier
- [ ] Check/uncheck Basic tier
- [ ] Check/uncheck Inactive
- [ ] "All Tiers" selects/deselects all

### Status Filter

- [ ] Filter by Active status
- [ ] Filter by At Risk status
- [ ] Filter by Churned status
- [ ] Combined filters work correctly

### Revenue Filter

- [ ] Revenue range sliders functional
- [ ] Minimum revenue filter works
- [ ] Maximum revenue filter works
- [ ] Revenue values display correctly
- [ ] Marker count updates as sliders move

### Activity Filter

- [ ] Filter "Last contacted: 7 days" works
- [ ] Filter "Last contacted: 30 days" works
- [ ] Filter "Last contacted: 90 days" works
- [ ] Filter "Never contacted" works
- [ ] Filter "Upcoming appointments" works

### Saved Filters

- [ ] Apply multiple filters
- [ ] Click "Save Filter"
- [ ] Name filter and save
- [ ] Load saved filter from dropdown
- [ ] Saved filter applies correctly
- [ ] Delete saved filter works

---

## 3. Heat Map Visualization

### Heat Map Toggle

- [ ] Click "Heat Map" toggle
- [ ] Heat map overlay appears
- [ ] Heat map updates in real-time with filters
- [ ] Toggle off removes heat map
- [ ] Heat map and markers can display together

### Heat Map Modes

- [ ] Default mode shows customer density
- [ ] Open "Heat Map Options"
- [ ] Select "Weight by Revenue"
- [ ] Heat map intensity changes based on revenue
- [ ] High-revenue areas show red/yellow
- [ ] Low-revenue areas show blue/green
- [ ] Select "Weight by Activity"
- [ ] Heat map shows recent activity hotspots

### Heat Map Performance

- [ ] Heat map loads in under 2 seconds
- [ ] Heat map doesn't slow map panning
- [ ] Heat map zoom transitions smooth
- [ ] Large dataset (1000+ customers) renders properly

---

## 4. Territory Creation & Management

### Create Territory (Manager Role)

- [ ] Click "Create Territory" button
- [ ] Map enters drawing mode
- [ ] Click to add polygon vertices
- [ ] Polygon outline visible as drawn
- [ ] Click starting point closes polygon
- [ ] "Territory Details" form appears
- [ ] Enter territory name: "Test Territory SF"
- [ ] Select color: Red (#FF6B6B)
- [ ] Assign to sales rep from dropdown
- [ ] Enable "Auto-assign customers"
- [ ] Click "Save Territory"
- [ ] Success message appears
- [ ] Territory polygon visible on map
- [ ] Territory appears in territories list

### View Territory Details

- [ ] Click on territory polygon
- [ ] Territory details popup appears
- [ ] Shows territory name
- [ ] Shows assigned sales rep
- [ ] Shows customer count
- [ ] Shows total revenue
- [ ] "Edit Territory" button visible
- [ ] "Delete Territory" button visible

### Edit Territory

- [ ] Click "Edit Territory"
- [ ] Polygon becomes editable
- [ ] Drag vertex to new position
- [ ] Polygon boundary updates
- [ ] Change territory name
- [ ] Change assigned sales rep
- [ ] Click "Save Changes"
- [ ] Success message appears
- [ ] Customers reassigned if boundary changed

### Delete Territory

- [ ] Click "Delete Territory"
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Territory removed from map
- [ ] Customers unassigned from territory
- [ ] Territory removed from list

### Overlapping Territories

- [ ] Create two overlapping territories
- [ ] Warning message appears: "Overlapping territories detected"
- [ ] View overlapping areas list
- [ ] Resolve overlaps by editing boundaries

---

## 5. Geocoding Workflows

### Manual Single Geocoding

- [ ] Navigate to customer without coordinates
- [ ] Customer details page shows "Not Geocoded"
- [ ] Click "Geocode Address" button
- [ ] Geocoding spinner appears
- [ ] Success message: "Address geocoded successfully"
- [ ] Latitude and longitude displayed
- [ ] "View on Map" link appears
- [ ] Click "View on Map"
- [ ] Redirects to map with customer centered
- [ ] Customer marker highlighted

### Failed Geocoding

- [ ] Create customer with invalid address: "XYZ Invalid 123"
- [ ] Click "Geocode Address"
- [ ] Error message: "Unable to geocode address"
- [ ] Suggested actions displayed
- [ ] Click "Enter Manually"
- [ ] Enter latitude: 37.7749
- [ ] Enter longitude: -122.4194
- [ ] Click "Save Coordinates"
- [ ] Success message appears
- [ ] Customer appears on map

### Batch Geocoding

- [ ] Navigate to Customers list page
- [ ] Filter customers with missing coordinates
- [ ] Select 10 customers
- [ ] Click "Geocode Selected"
- [ ] Progress bar appears
- [ ] Progress updates in real-time
- [ ] Completion message shows: "9/10 geocoded, 1 failed"
- [ ] View geocoding report
- [ ] Failed addresses listed with errors
- [ ] Successfully geocoded customers appear on map

### CSV Import with Geocoding

- [ ] Click "Import Customers"
- [ ] Upload CSV file with 20 customers
- [ ] Map CSV columns to CRM fields
- [ ] Enable "Geocode after import"
- [ ] Click "Import"
- [ ] Import completes
- [ ] Geocoding starts automatically
- [ ] Progress bar shows geocoding status
- [ ] All customers geocoded successfully
- [ ] Navigate to map
- [ ] All new customers visible on map

---

## 6. Box Selection & Route Planning

### Box Selection Tool

- [ ] Click "Box Select" button
- [ ] Cursor changes to crosshair
- [ ] Click and drag to draw selection box
- [ ] Selection box visible
- [ ] Customers within box highlighted
- [ ] Selection count displayed: "8 customers selected"
- [ ] Click outside box maintains selection

### Add Selected to Call Plan

- [ ] With customers selected, click "Add to Call Plan"
- [ ] Call plan date picker appears
- [ ] Select date: Tomorrow
- [ ] Click "Add to Plan"
- [ ] Success message appears
- [ ] Navigate to Call Plans page
- [ ] Tomorrow's plan shows 8 customers

### Optimize Route

- [ ] On Call Plans page, click "Optimize Route"
- [ ] Route optimization runs
- [ ] Route line appears on map connecting customers
- [ ] Visit order displayed (1, 2, 3...)
- [ ] Total distance shown: "12.5 miles"
- [ ] Estimated time shown: "2 hours 15 minutes"
- [ ] Route order makes sense geographically

### Export to Azuga

- [ ] Click "Export to Azuga"
- [ ] Export dialog appears
- [ ] Select format: "Azuga CSV"
- [ ] Click "Export"
- [ ] File downloads
- [ ] Open file
- [ ] Route data formatted correctly

---

## 7. Nearby Customers

### Find Nearby (GPS)

- [ ] Click "Nearby" button
- [ ] GPS permission requested (allow)
- [ ] Current location detected
- [ ] Radius selector shows: 0.5, 1, 2, 5, 10 miles
- [ ] Select 5 miles
- [ ] Click "Search"
- [ ] Nearby customers list appears
- [ ] Results sorted by distance
- [ ] Distance shown for each customer
- [ ] Map centers on current location

### Find Nearby (Address)

- [ ] Click "Nearby"
- [ ] Enter address: "350 5th Ave, New York, NY"
- [ ] Select radius: 2 miles
- [ ] Click "Search"
- [ ] Results appear sorted by distance
- [ ] Map shows address + nearby customers
- [ ] Distance calculations accurate

### Nearby Customer Actions

- [ ] Select all nearby customers
- [ ] Click "Add All to Call Plan"
- [ ] Call plan created with optimized route
- [ ] Click "Export List"
- [ ] Nearby customers exported to CSV

---

## 8. Mobile Map Testing

### Mobile Responsive Layout (iPhone)

- [ ] Open map on iPhone (or mobile emulator)
- [ ] Map fills screen
- [ ] Controls accessible
- [ ] Filters accessible (hamburger menu)
- [ ] Landscape and portrait modes work

### Touch Gestures

- [ ] Pinch to zoom in
- [ ] Pinch to zoom out
- [ ] Single finger drag to pan
- [ ] Tap marker to view customer
- [ ] Long press for context menu

### Customer Popup (Mobile)

- [ ] Tap customer marker
- [ ] Bottom sheet slides up
- [ ] Customer details visible
- [ ] Scroll within bottom sheet works
- [ ] "Call" button works (opens phone dialer)
- [ ] "Get Directions" opens Maps app
- [ ] "Add to Plan" button works

### Mobile Performance

- [ ] Map loads quickly (<5 seconds)
- [ ] No lag when panning
- [ ] Smooth zoom transitions
- [ ] Marker clusters render properly
- [ ] Heat map works on mobile

---

## 9. Territory Performance Tracking

### View Territory Metrics (Manager)

- [ ] Navigate to Territories page
- [ ] List of territories displayed
- [ ] Click "SF Downtown" territory
- [ ] Territory detail page loads
- [ ] Customer count shown: 45
- [ ] Total revenue shown: $450,000
- [ ] Active customer rate: 95%
- [ ] Average customer value: $10,000
- [ ] Click "View on Map"
- [ ] Territory highlighted on map
- [ ] Territory customers visible

### Compare Territories

- [ ] On Territories page, select 2 territories
- [ ] Click "Compare"
- [ ] Side-by-side comparison appears
- [ ] Metrics compared:
  - Customer count
  - Total revenue
  - Active rate
  - Avg customer value
- [ ] Visual charts displayed

---

## 10. Performance Testing

### Large Dataset Performance

- [ ] Ensure 1000+ customers geocoded
- [ ] Navigate to map
- [ ] Map loads in under 5 seconds
- [ ] Pan map smoothly (no lag)
- [ ] Zoom in/out smoothly
- [ ] Apply filters quickly (<1 second update)
- [ ] Heat map generates in under 2 seconds

### Batch Operations Performance

- [ ] Select 100 customers for geocoding
- [ ] Start batch geocoding
- [ ] Completes in under 20 seconds
- [ ] Progress updates smooth (no freezing)
- [ ] Browser remains responsive during batch

---

## 11. Error Handling

### Network Errors

- [ ] Disconnect internet
- [ ] Try to load map
- [ ] Error message: "Unable to load map. Check connection."
- [ ] Reconnect internet
- [ ] Click "Retry"
- [ ] Map loads successfully

### Invalid Data

- [ ] Enter invalid coordinates (lat: 200, lng: 300)
- [ ] Save customer
- [ ] Error message: "Invalid coordinates"
- [ ] Cannot save until corrected

### API Failures

- [ ] Simulate Mapbox API failure (invalid token)
- [ ] Try to geocode address
- [ ] Error message: "Geocoding service unavailable"
- [ ] Fallback to manual entry offered

---

## 12. Security & Permissions

### Role-Based Access

#### Sales Rep

- [ ] Log in as sales rep
- [ ] Can view map
- [ ] Can view own territory
- [ ] CANNOT create territories
- [ ] CANNOT edit territories
- [ ] CANNOT delete territories
- [ ] CAN view customers in territory

#### Manager

- [ ] Log in as manager
- [ ] CAN view all territories
- [ ] CAN create territories
- [ ] CAN edit territories
- [ ] CAN delete territories
- [ ] CAN assign territories to reps

#### Admin

- [ ] Log in as admin
- [ ] Full access to all features
- [ ] Can view geocoding usage
- [ ] Can run batch operations
- [ ] Can export all data

### Data Privacy

- [ ] Customer addresses not exposed in URLs
- [ ] Map screenshots don't contain sensitive data
- [ ] Geocoding cache secured
- [ ] Mapbox token properly restricted

---

## 13. Cross-Browser Testing

### Chrome

- [ ] All features work in Chrome 90+
- [ ] No console errors
- [ ] Map renders correctly
- [ ] Performance acceptable

### Firefox

- [ ] All features work in Firefox 88+
- [ ] No console errors
- [ ] Map renders correctly
- [ ] Performance acceptable

### Safari

- [ ] All features work in Safari 14+
- [ ] No console errors
- [ ] Map renders correctly
- [ ] Performance acceptable

### Edge

- [ ] All features work in Edge 90+
- [ ] No console errors
- [ ] Map renders correctly
- [ ] Performance acceptable

---

## 14. Accessibility Testing

### Keyboard Navigation

- [ ] Tab through map controls
- [ ] Focus indicators visible
- [ ] All controls accessible via keyboard
- [ ] Enter key activates buttons
- [ ] Esc key closes modals/popups

### Screen Reader

- [ ] Screen reader announces map loaded
- [ ] Customer markers have ARIA labels
- [ ] Filter changes announced
- [ ] Territory actions announced

### Color Contrast

- [ ] Map controls meet 4.5:1 contrast ratio
- [ ] Text readable on all backgrounds
- [ ] Color not sole indicator (use icons too)

---

## 15. Edge Cases

### No Customers

- [ ] View map with no customers
- [ ] Appropriate message: "No customers to display"
- [ ] Map still functional
- [ ] Can create territories

### No Geocoded Customers

- [ ] All customers missing coordinates
- [ ] Message: "No customers geocoded yet"
- [ ] "Geocode All" button visible
- [ ] Link to geocoding guide

### Single Customer

- [ ] Only one customer on map
- [ ] Map centers on customer
- [ ] No clustering
- [ ] All features still work

### Overlapping Customers

- [ ] Multiple customers at exact same address
- [ ] Marker shows customer count
- [ ] Clicking marker lists all customers
- [ ] Can select specific customer

---

## Sign-Off

### Test Results

- **Total Tests:** _____
- **Passed:** _____
- **Failed:** _____
- **Blocked:** _____

### Critical Issues Found

1. ___________________________________
2. ___________________________________
3. ___________________________________

### Recommendations

- [ ] Approve for production deployment
- [ ] Fix critical issues first
- [ ] Requires additional testing

### Approvals

**Tester:** _________________ Date: _______

**QA Lead:** _________________ Date: _______

**Product Manager:** _________________ Date: _______

---

**Checklist Version:** 1.0
**Last Updated:** 2024-12-15
**Phase:** 6 (Maps & Territory)
