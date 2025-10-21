# Drill-Down Functionality Testing Plan

## Overview
This document provides a comprehensive testing strategy for the analytics dashboard drill-down functionality, including manual testing procedures, automated test scripts, and quality assurance criteria.

---

## 1. Manual Testing Checklist

### 1.1 Tile Click Behavior
- [ ] **Credit Utilization Tile**
  - Click tile → Modal opens
  - Modal displays credit details table
  - Data matches dashboard summary
  - Close button (X) works
  - ESC key closes modal
  - Click outside modal closes it
  - No console errors

- [ ] **Active Users Tile**
  - Click tile → Modal opens
  - Modal shows user list with activity
  - User count matches dashboard
  - Sorting/filtering works (if implemented)
  - All close methods work
  - No console errors

- [ ] **API Usage Tile**
  - Click tile → Modal opens
  - Modal displays API call breakdown
  - Charts/graphs render correctly
  - Data aggregation is accurate
  - All close methods work
  - No console errors

- [ ] **System Health Tile**
  - Click tile → Modal opens
  - Modal shows health metrics
  - Status indicators correct
  - Real-time updates work (if applicable)
  - All close methods work
  - No console errors

### 1.2 Modal Interaction
- [ ] Modal opens with smooth animation
- [ ] Modal centers on screen
- [ ] Background overlay darkens
- [ ] Scrolling works for long content
- [ ] Modal is responsive (adapts to screen size)
- [ ] Header shows correct title
- [ ] Footer has proper actions (if any)

### 1.3 Data Integrity
- [ ] Dashboard data matches modal data
- [ ] Timestamps are correct and formatted
- [ ] Numbers are properly formatted (commas, decimals)
- [ ] Currency symbols display correctly
- [ ] Percentages calculate accurately
- [ ] Empty states handled gracefully

---

## 2. Expected Behaviors

### 2.1 Standard Flow
```
1. User clicks tile
   → Loading indicator appears (if data fetch needed)
   → Modal fades in over 200-300ms
   → Background overlay prevents interaction
   → Focus moves to modal

2. User views data
   → Data displays in organized format
   → Interactive elements (charts, tables) work
   → Scrolling enabled if content exceeds viewport

3. User closes modal
   → Modal fades out
   → Focus returns to tile
   → Dashboard remains unchanged
   → Memory cleaned up
```

### 2.2 Error Handling
```
1. API call fails
   → Error message displays in modal
   → Retry button available
   → User can close modal
   → No data corruption

2. Invalid data received
   → Fallback to safe defaults
   → Warning message shown
   → No application crash

3. Network timeout
   → Timeout message displays
   → Retry option available
   → User notified clearly
```

---

## 3. Edge Cases

### 3.1 Data Edge Cases
- [ ] **Empty Data**
  - No users to display
  - Zero API calls
  - No credit usage
  - Health metrics unavailable
  - **Expected**: Friendly empty state message

- [ ] **Large Datasets**
  - 1000+ users
  - 10,000+ API calls
  - Pagination works
  - Performance remains acceptable
  - **Expected**: Smooth scrolling, no lag

- [ ] **Extreme Values**
  - Credit utilization > 100%
  - Negative values
  - Very large numbers (billions)
  - **Expected**: Proper formatting, no overflow

### 3.2 Interaction Edge Cases
- [ ] **Rapid Clicking**
  - Click tile multiple times quickly
  - **Expected**: Only one modal opens

- [ ] **Multiple Tiles**
  - Click different tiles in succession
  - **Expected**: Previous modal closes, new one opens

- [ ] **Escape During Load**
  - Press ESC while modal loading
  - **Expected**: Load cancels, modal closes

- [ ] **Browser Back Button**
  - Open modal, press browser back
  - **Expected**: Modal closes (if using URL state)

### 3.3 State Edge Cases
- [ ] **Dashboard Refresh**
  - Refresh dashboard while modal open
  - **Expected**: Modal closes gracefully

- [ ] **Data Update**
  - Data changes while modal open
  - **Expected**: Modal shows latest or notifies user

- [ ] **Session Timeout**
  - Session expires during modal interaction
  - **Expected**: Redirect to login, no crash

---

## 4. Mobile Testing Requirements

### 4.1 Touch Interactions
- [ ] Tiles have 44x44px minimum touch target
- [ ] Tap tile → Modal opens
- [ ] Swipe down to close modal (if implemented)
- [ ] Pinch to zoom works (if needed)
- [ ] No accidental double-taps

### 4.2 Responsive Design
- [ ] **Small Mobile (320px-480px)**
  - Modal takes full screen
  - Text is readable
  - Buttons are tappable
  - No horizontal scroll

- [ ] **Tablet (768px-1024px)**
  - Modal scales appropriately
  - Layout adjusts gracefully
  - Touch targets remain accessible

- [ ] **Desktop (1024px+)**
  - Modal centered with max-width
  - Optimal readability
  - Mouse and keyboard work

### 4.3 Mobile-Specific
- [ ] Virtual keyboard doesn't break layout
- [ ] Orientation change handled
- [ ] Touch events don't conflict with click
- [ ] Performance acceptable on slower devices

---

## 5. Accessibility Testing

### 5.1 Keyboard Navigation
```
Test Sequence:
1. Tab to tile → Tile receives focus (visible outline)
2. Enter/Space → Modal opens
3. Tab → Focus moves to first interactive element in modal
4. Tab → Focus cycles through modal elements only
5. Shift+Tab → Reverse focus order
6. ESC → Modal closes, focus returns to tile
```

- [ ] All interactive elements reachable by keyboard
- [ ] Focus trap works (can't tab outside modal)
- [ ] Focus indicators visible
- [ ] Logical tab order

### 5.2 Screen Reader Support
- [ ] Tile has descriptive `aria-label`
- [ ] Modal has `role="dialog"`
- [ ] Modal has `aria-labelledby` pointing to title
- [ ] Modal has `aria-describedby` for description
- [ ] Close button has `aria-label="Close modal"`
- [ ] Screen reader announces modal opening
- [ ] Dynamic content updates announced

### 5.3 ARIA Attributes
```html
<!-- Tile -->
<div role="button"
     aria-label="View credit utilization details"
     tabindex="0">

<!-- Modal -->
<div role="dialog"
     aria-modal="true"
     aria-labelledby="modal-title"
     aria-describedby="modal-description">

  <h2 id="modal-title">Credit Utilization Details</h2>
  <div id="modal-description">Detailed breakdown of credit usage</div>

  <button aria-label="Close modal">×</button>
</div>
```

### 5.4 Color & Contrast
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] Interactive elements contrast ≥ 3:1
- [ ] Focus indicators contrast ≥ 3:1
- [ ] Information not conveyed by color alone

---

## 6. Performance Testing Criteria

### 6.1 Load Times
- [ ] **Modal Open**: < 200ms (no API call)
- [ ] **Modal Open with API**: < 1000ms (with loading indicator)
- [ ] **Modal Close**: < 200ms
- [ ] **Data Fetch**: < 2000ms (with timeout handling)

### 6.2 Animation Performance
- [ ] Modal animation 60fps (no jank)
- [ ] Smooth fade in/out transitions
- [ ] No layout shifts during animation
- [ ] Hardware acceleration used for transforms

### 6.3 Memory Usage
- [ ] No memory leaks after closing modal
- [ ] Event listeners cleaned up
- [ ] API calls cancelled if modal closed
- [ ] No dangling references

### 6.4 Bundle Size
- [ ] Modal code < 50KB (gzipped)
- [ ] Code-splitting for modals (lazy load)
- [ ] No unnecessary dependencies
- [ ] Tree-shaking applied

### 6.5 API Efficiency
- [ ] Data cached appropriately
- [ ] No duplicate requests
- [ ] Requests cancelled on modal close
- [ ] Batch requests when possible

---

## 7. Browser & Device Testing

### 7.1 Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome (version - 2)

### 7.2 Mobile Browsers
- [ ] Safari iOS (latest 2 versions)
- [ ] Chrome Android (latest)
- [ ] Samsung Internet
- [ ] Firefox Mobile

### 7.3 Device Testing
- [ ] iPhone (SE, 12, 14)
- [ ] Android (Pixel, Samsung)
- [ ] iPad
- [ ] Desktop (Mac, Windows)

---

## 8. Quick Test Commands

### 8.1 Development Server
```bash
# Start dev server with hot reload
npm run dev

# Open in browser
open http://localhost:5173
```

### 8.2 Console Error Monitoring
```javascript
// Run in browser console to catch all errors
window.addEventListener('error', (e) => {
  console.error('Error caught:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
```

### 8.3 Performance Testing
```javascript
// Measure modal open time
performance.mark('modal-open-start');
// ... open modal ...
performance.mark('modal-open-end');
performance.measure('modal-open', 'modal-open-start', 'modal-open-end');
console.log(performance.getEntriesByName('modal-open')[0].duration);
```

### 8.4 Accessibility Audit
```bash
# Install axe-core devtools extension
# Or run in console:
npm install -g @axe-core/cli
axe http://localhost:5173 --tags wcag2a,wcag2aa
```

### 8.5 Lighthouse Testing
```bash
# Run Lighthouse CI
npx lighthouse http://localhost:5173 \
  --only-categories=accessibility,performance \
  --output=html \
  --output-path=./lighthouse-report.html
```

### 8.6 Visual Regression Testing
```bash
# Take screenshots for comparison
npm run test:visual

# Compare with baseline
npm run test:visual:compare
```

---

## 9. Automated Test Scripts

### 9.1 Simple Modal Test Script
Create `/web/tests/test-modals.js`:
```javascript
// Simple automated modal test
async function testModal(tileName) {
  console.log(`Testing ${tileName} modal...`);

  // Find tile
  const tile = document.querySelector(`[aria-label*="${tileName}"]`);
  if (!tile) {
    console.error(`❌ Tile not found: ${tileName}`);
    return false;
  }

  // Click tile
  tile.click();
  await new Promise(r => setTimeout(r, 500));

  // Check modal exists
  const modal = document.querySelector('[role="dialog"]');
  if (!modal) {
    console.error(`❌ Modal did not open: ${tileName}`);
    return false;
  }

  // Check modal title
  const title = modal.querySelector('h2');
  console.log(`✓ Modal opened with title: ${title?.textContent}`);

  // Close modal
  const closeBtn = modal.querySelector('[aria-label*="Close"]');
  closeBtn?.click();
  await new Promise(r => setTimeout(r, 500));

  // Check modal closed
  const stillOpen = document.querySelector('[role="dialog"]');
  if (stillOpen) {
    console.error(`❌ Modal did not close: ${tileName}`);
    return false;
  }

  console.log(`✅ ${tileName} modal test passed`);
  return true;
}

// Run all tests
async function runAllTests() {
  const tiles = [
    'Credit Utilization',
    'Active Users',
    'API Usage',
    'System Health'
  ];

  for (const tile of tiles) {
    await testModal(tile);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('All tests complete!');
}

// Run tests
runAllTests();
```

### 9.2 Keyboard Navigation Test
```javascript
// Test keyboard navigation
async function testKeyboardNav() {
  console.log('Testing keyboard navigation...');

  // Simulate Tab key
  const tiles = document.querySelectorAll('[role="button"]');
  tiles[0].focus();

  console.log('✓ Tile focused');

  // Simulate Enter key
  const event = new KeyboardEvent('keydown', { key: 'Enter' });
  tiles[0].dispatchEvent(event);

  await new Promise(r => setTimeout(r, 500));

  const modal = document.querySelector('[role="dialog"]');
  if (!modal) {
    console.error('❌ Modal did not open with Enter key');
    return;
  }

  console.log('✓ Modal opened with Enter key');

  // Simulate ESC key
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
  document.dispatchEvent(escEvent);

  await new Promise(r => setTimeout(r, 500));

  const stillOpen = document.querySelector('[role="dialog"]');
  if (stillOpen) {
    console.error('❌ Modal did not close with ESC key');
    return;
  }

  console.log('✅ Keyboard navigation test passed');
}

testKeyboardNav();
```

### 9.3 API Error Simulation
```javascript
// Test error handling
async function testErrorHandling() {
  console.log('Testing error handling...');

  // Mock fetch to simulate error
  const originalFetch = window.fetch;
  window.fetch = () => Promise.reject(new Error('Network error'));

  // Open modal
  const tile = document.querySelector('[role="button"]');
  tile.click();

  await new Promise(r => setTimeout(r, 1000));

  // Check for error message
  const modal = document.querySelector('[role="dialog"]');
  const errorMsg = modal?.textContent.toLowerCase();

  if (errorMsg?.includes('error') || errorMsg?.includes('failed')) {
    console.log('✅ Error message displayed');
  } else {
    console.error('❌ No error message shown');
  }

  // Restore fetch
  window.fetch = originalFetch;

  // Close modal
  document.querySelector('[aria-label*="Close"]')?.click();
}

testErrorHandling();
```

---

## 10. Test Execution Guide

### 10.1 Daily Testing (5 minutes)
```bash
# Start dev server
npm run dev

# In browser console, run:
# 1. Basic modal tests
runAllTests()

# 2. Check for console errors
# (Visual inspection)

# 3. Test one mobile view
# (Use DevTools device emulation)
```

### 10.2 Pre-Deployment Testing (15 minutes)
```bash
# 1. Run all automated tests
npm run test

# 2. Run Lighthouse audit
npx lighthouse http://localhost:5173

# 3. Test all browsers (Chrome, Firefox, Safari)
# 4. Test mobile devices (iOS, Android)
# 5. Run accessibility audit
axe http://localhost:5173

# 6. Visual inspection of all modals
# 7. Verify API calls in Network tab
```

### 10.3 Full QA Testing (1 hour)
- [ ] Complete all manual checklist items
- [ ] Test all edge cases
- [ ] Full accessibility audit
- [ ] Performance profiling
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Document any issues found

---

## 11. Issue Reporting Template

```markdown
### Issue: [Brief Description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:

**Actual Behavior**:

**Environment**:
- Browser:
- Device:
- Screen Size:
- OS:

**Screenshots/Videos**:

**Console Errors**:
```

---

## 12. Success Criteria

### All tests pass if:
✅ All tiles open modals correctly
✅ All close methods work
✅ No console errors
✅ Keyboard navigation functional
✅ Screen reader compatible
✅ Mobile responsive
✅ Performance metrics met
✅ API errors handled gracefully
✅ Data integrity maintained
✅ Cross-browser compatible

---

## 13. Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run preview                # Preview build

# Testing
npm run test                   # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report

# Quality
npm run lint                   # Lint code
npm run format                 # Format code
npm run typecheck              # TypeScript check

# Performance
npx lighthouse [url]           # Lighthouse audit
axe [url]                      # Accessibility audit

# Browser Console Tests
runAllTests()                  # Test all modals
testKeyboardNav()              # Test keyboard
testErrorHandling()            # Test errors
```

---

## Notes
- Update this document as new features are added
- Track issues in GitHub/Linear
- Review and update test scripts regularly
- Keep automation scripts in `/web/tests/` directory
- Document any new edge cases discovered
- Share findings with team

**Last Updated**: 2025-10-20
