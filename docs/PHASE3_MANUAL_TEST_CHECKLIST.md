# Phase 3 Manual Test Checklist

**Test Date:** _____________
**Tester Name:** _____________
**Environment:** ☐ Staging  ☐ Production
**Browser:** ☐ Chrome  ☐ Safari  ☐ Firefox  ☐ Edge

---

## Pre-Test Setup

- [ ] Test database seeded with sample data
- [ ] Test user accounts created (sales rep, admin)
- [ ] Test products and inventory available
- [ ] AI API key configured (for recommendations)
- [ ] Browser console cleared
- [ ] Network tab open for performance monitoring

---

## 1. Sample Assignment Flow

### Quick Assign Sample

- [ ] Navigate to customer detail page
- [ ] Click "Assign Sample" button
- [ ] Select product from dropdown
- [ ] Enter quantity (test: 2 bottles)
- [ ] Click "Assign"
- [ ] **Verify:** Success message appears
- [ ] **Verify:** Sample appears in customer's sample history
- [ ] **Verify:** Activity created in timeline
- [ ] **Verify:** Inventory decremented correctly

### Edge Cases

- [ ] Try assigning more samples than available inventory
- [ ] **Verify:** Error message: "Insufficient inventory"
- [ ] Try assigning 0 quantity
- [ ] **Verify:** Validation error appears
- [ ] Try assigning without selecting product
- [ ] **Verify:** Required field validation works

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 2. Sample Analytics Dashboard

### View Dashboard

- [ ] Navigate to `/sales/analytics/samples`
- [ ] **Verify:** Dashboard loads within 2 seconds
- [ ] **Verify:** Summary cards display:
  - [ ] Total Samples Given
  - [ ] Conversion Rate
  - [ ] Total Revenue Attributed
  - [ ] Average Days to Conversion
- [ ] **Verify:** Conversion chart renders
- [ ] **Verify:** Top Performers table displays
- [ ] **Verify:** Rep Leaderboard displays

### Apply Filters

- [ ] Select date range (e.g., Last 30 Days)
- [ ] **Verify:** Data updates accordingly
- [ ] Filter by specific sales rep
- [ ] **Verify:** Only that rep's samples shown
- [ ] Filter by product
- [ ] **Verify:** Only samples for that product shown
- [ ] Apply multiple filters simultaneously
- [ ] **Verify:** All filters work together
- [ ] Clear filters
- [ ] **Verify:** Data returns to full view

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 3. Sample Feedback & Tracking

### Log Feedback

- [ ] Open a sample from customer history
- [ ] Click "Add Feedback" button
- [ ] Test quick feedback buttons:
  - [ ] "Loved it!"
  - [ ] "Wants to order more"
  - [ ] "Too dry"
  - [ ] "Wrong varietal"
- [ ] **Verify:** Feedback saves instantly
- [ ] Try custom feedback (type freely)
- [ ] **Verify:** Custom text saves
- [ ] **Verify:** Feedback appears in sample record

### Track Sample Status

- [ ] View sample without order
- [ ] **Verify:** Status shows "Pending"
- [ ] View sample that resulted in order
- [ ] **Verify:** Status shows "Converted"
- [ ] **Verify:** Order link appears and works
- [ ] **Verify:** Conversion date displayed

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 4. Conversion Tracking

### Test Conversion Attribution

- [ ] Create a sample for customer X
- [ ] Wait or manually set date to 5 days ago
- [ ] Create order for customer X
- [ ] Navigate to sample analytics
- [ ] **Verify:** Sample marked as "Resulted in Order"
- [ ] **Verify:** Revenue attributed to sample
- [ ] **Verify:** Days to conversion calculated (should be 5)

### Test 30-Day Window

- [ ] Create sample dated 35 days ago
- [ ] Create order for same customer today
- [ ] **Verify:** Sample NOT marked as converted
- [ ] **Verify:** No revenue attribution
- [ ] **Verify:** Sample still shows as "Pending"

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 5. Automated Triggers

### Sample No-Order Trigger (7 days)

- [ ] Create sample
- [ ] Set date to 7 days ago (or wait 7 days in staging)
- [ ] Run trigger check (or wait for scheduled job)
- [ ] **Verify:** Task created: "Follow up on sample"
- [ ] **Verify:** Task assigned to sales rep
- [ ] **Verify:** Task appears in rep's task list
- [ ] Complete task
- [ ] **Verify:** Task marked complete
- [ ] **Verify:** No duplicate task created

### Sample No-Order Trigger (30 days)

- [ ] Create sample
- [ ] Set date to 30 days ago
- [ ] Run trigger check
- [ ] **Verify:** High-priority task created
- [ ] **Verify:** Task title: "Final followup on sample"

### First Order Followup

- [ ] Customer places first order
- [ ] Wait 3 days (or set date)
- [ ] Run trigger check
- [ ] **Verify:** Task created: "First order followup"
- [ ] **Verify:** Task linked to order

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 6. AI Wine Recommendations

### Get Recommendations

- [ ] Open customer detail page
- [ ] Click "Get AI Recommendations"
- [ ] **Verify:** Loading indicator appears
- [ ] Wait for response (should be <3 seconds)
- [ ] **Verify:** 3-5 wine recommendations appear
- [ ] **Verify:** Each has reasoning/explanation
- [ ] **Verify:** Products are valid from catalog

### Test Recommendation Quality

- [ ] Review customer's past orders
- [ ] Check if recommendations align with preferences
- [ ] **Verify:** Recommendations seem relevant
- [ ] Click "Show Different Recommendations"
- [ ] **Verify:** New recommendations appear
- [ ] **Verify:** Different from first set

### Error Handling

- [ ] Disconnect internet (simulate network failure)
- [ ] Try getting recommendations
- [ ] **Verify:** Error message appears
- [ ] **Verify:** Retry button works
- [ ] Reconnect internet and retry
- [ ] **Verify:** Recommendations load successfully

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 7. Reports

### Generate Supplier Report

- [ ] Navigate to Reports section
- [ ] Click "Generate Supplier Report"
- [ ] Select supplier
- [ ] Select date range (e.g., Last Quarter)
- [ ] Click "Generate PDF"
- [ ] **Verify:** Report generates within 5 seconds
- [ ] Download PDF
- [ ] **Verify:** PDF opens correctly
- [ ] **Verify:** Data matches dashboard
- [ ] Check report sections:
  - [ ] Sample breakdown by product
  - [ ] Conversion rates
  - [ ] Revenue attribution
  - [ ] Charts/visualizations

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 8. Performance Tests (Manual)

### Dashboard Load Time

- [ ] Open analytics dashboard
- [ ] Measure load time (use browser DevTools)
- [ ] **Verify:** Initial load < 2 seconds
- [ ] **Verify:** No console errors
- [ ] **Verify:** Charts render smoothly

### Large Dataset Performance

- [ ] Filter for "All Time" (largest dataset)
- [ ] Apply filters
- [ ] **Verify:** Filtering completes < 1 second
- [ ] Sort by different columns
- [ ] **Verify:** Sorting instant
- [ ] Scroll through large tables
- [ ] **Verify:** Smooth scrolling (no lag)

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 9. Mobile Responsiveness

**Test on mobile device or resize browser to mobile width (375px)**

### Dashboard

- [ ] Navigate to sample analytics
- [ ] **Verify:** Cards stack vertically
- [ ] **Verify:** Charts resize appropriately
- [ ] **Verify:** Tables scroll horizontally
- [ ] **Verify:** All text readable
- [ ] **Verify:** Buttons accessible

### Forms

- [ ] Open "Assign Sample" form
- [ ] **Verify:** Form fields full width
- [ ] **Verify:** Dropdowns work on mobile
- [ ] **Verify:** Submit button accessible
- [ ] **Verify:** Validation messages visible

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 10. Error Scenarios

### Network Errors

- [ ] Disconnect internet
- [ ] Try loading analytics
- [ ] **Verify:** Friendly error message
- [ ] **Verify:** Retry option available
- [ ] Reconnect and retry
- [ ] **Verify:** Data loads successfully

### Invalid Data

- [ ] Manually enter invalid date range (end before start)
- [ ] **Verify:** Validation error appears
- [ ] Try filtering by non-existent product ID
- [ ] **Verify:** "No results" message appears
- [ ] Try assigning sample to deleted customer
- [ ] **Verify:** Error handled gracefully

### API Failures

- [ ] Simulate 500 error from backend (if possible)
- [ ] **Verify:** Error boundary catches it
- [ ] **Verify:** User-friendly error message
- [ ] **Verify:** App doesn't crash

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 11. Regression Testing (Phase 1 & 2)

### Customer Management

- [ ] Create new customer
- [ ] **Verify:** Still works
- [ ] Edit customer
- [ ] **Verify:** Still works
- [ ] Delete customer
- [ ] **Verify:** Still works (cascades to samples?)

### Order Management

- [ ] Create new order
- [ ] **Verify:** Still works
- [ ] Edit order
- [ ] **Verify:** Still works
- [ ] Link order to sample
- [ ] **Verify:** Attribution works

### CARLA Call Planning

- [ ] Navigate to call planning
- [ ] **Verify:** Still functional
- [ ] Create call plan
- [ ] **Verify:** No errors
- [ ] **Verify:** Samples don't interfere

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## 12. Integration Tests

### Sample → Order → Revenue Flow

- [ ] Assign sample to customer "Test Customer"
- [ ] Customer places order within 30 days
- [ ] **Verify:** Sample auto-marked as converted
- [ ] **Verify:** Revenue attributed correctly
- [ ] **Verify:** Metrics update immediately
- [ ] **Verify:** Rep leaderboard updates
- [ ] **Verify:** Product top performers updates

### Cross-Feature Integration

- [ ] Create sample
- [ ] Log feedback
- [ ] Create automated trigger
- [ ] Trigger fires and creates task
- [ ] Complete task
- [ ] Order created
- [ ] Revenue attributed
- [ ] Export report
- [ ] **Verify:** All data consistent across features

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
```

---

## Issues Found

### High Priority
```
Issue 1:
_________________________________________________________________
_________________________________________________________________

Issue 2:
_________________________________________________________________
_________________________________________________________________
```

### Medium Priority
```
Issue 1:
_________________________________________________________________
_________________________________________________________________

Issue 2:
_________________________________________________________________
_________________________________________________________________
```

### Low Priority
```
Issue 1:
_________________________________________________________________
_________________________________________________________________

Issue 2:
_________________________________________________________________
_________________________________________________________________
```

---

## Browser Compatibility

Test in all browsers:

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Dashboard | ☐ | ☐ | ☐ | ☐ |
| Sample Assignment | ☐ | ☐ | ☐ | ☐ |
| AI Recommendations | ☐ | ☐ | ☐ | ☐ |
| Reports | ☐ | ☐ | ☐ | ☐ |
| Triggers | ☐ | ☐ | ☐ | ☐ |

---

## Final Sign-Off

**Testing Summary:**

- Total Tests Executed: _______
- Tests Passed: _______
- Tests Failed: _______
- Pass Rate: _______%

**Overall Assessment:**

☐ Ready for Production
☐ Needs Minor Fixes
☐ Needs Major Fixes
☐ Not Ready

**Tester Signature:** _____________________
**Date:** _____________________

**Notes/Comments:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

**End of Checklist**
