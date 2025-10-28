# Visual Regression Test Checklist

## 📸 Purpose

This checklist ensures that the Leora CRM visual design and layout remain consistent across updates. Use this to capture screenshots for visual comparison.

---

## 🎯 Screenshot Guidelines

### When to Take Screenshots
- Before major code changes (baseline)
- After UI updates (comparison)
- On different browsers
- On different screen sizes
- After bug fixes affecting UI

### Screenshot Naming Convention
Format: `[page]-[section]-[viewport]-[date].png`

Examples:
- `customer-list-desktop-2025-01-25.png`
- `dashboard-widgets-mobile-2025-01-25.png`
- `carla-callplan-tablet-2025-01-25.png`

### Screenshot Storage
- **Location**: `/web/tests/screenshots/`
- **Organize by date**: Create subfolder for each test session
- **Example**: `/web/tests/screenshots/2025-01-25/`

---

## 📱 Viewports to Test

### Desktop
- **Large**: 1920px × 1080px (Full HD)
- **Medium**: 1440px × 900px (Macbook Pro)
- **Small**: 1280px × 720px (HD)

### Tablet
- **Portrait**: 768px × 1024px (iPad)
- **Landscape**: 1024px × 768px (iPad Landscape)

### Mobile
- **iPhone 14**: 390px × 844px
- **iPhone SE**: 375px × 667px
- **Android**: 360px × 800px

---

## ✅ Screenshot Checklist

### 1. Customer Management Pages

#### Customer List Page (`/sales/customers`)
- [ ] **Desktop - Full page**
  - File: `customer-list-full-desktop.png`
  - Verify: Header, summary cards, filters, search, table, pagination

- [ ] **Desktop - Filter states**
  - File: `customer-list-filter-active-desktop.png`
  - Verify: ACTIVE filter highlighted, table filtered
  - File: `customer-list-filter-target-desktop.png`
  - Verify: TARGET filter highlighted, table filtered
  - File: `customer-list-filter-due-desktop.png`
  - Verify: DUE filter highlighted, table filtered

- [ ] **Desktop - Search active**
  - File: `customer-list-search-desktop.png`
  - Verify: Search box filled, filtered results

- [ ] **Desktop - Sorted columns**
  - File: `customer-list-sort-name-desktop.png`
  - Verify: Name column sorted, arrow indicator
  - File: `customer-list-sort-revenue-desktop.png`
  - Verify: Revenue column sorted, arrow indicator

- [ ] **Mobile - Customer list**
  - File: `customer-list-mobile.png`
  - Verify: Responsive table or card layout, readable on small screen

- [ ] **Tablet - Customer list**
  - File: `customer-list-tablet.png`
  - Verify: Optimal layout for tablet size

#### Customer Detail Page (`/sales/customers/[customerId]`)
- [ ] **Desktop - Customer header**
  - File: `customer-detail-header-desktop.png`
  - Verify: Customer name, account #, location, risk badge

- [ ] **Desktop - Metrics cards**
  - File: `customer-detail-metrics-desktop.png`
  - Verify: Revenue, orders, products, avg order cards

- [ ] **Desktop - Order history**
  - File: `customer-detail-orders-desktop.png`
  - Verify: Order table with dates, amounts, status

- [ ] **Desktop - Activity timeline**
  - File: `customer-detail-timeline-desktop.png`
  - Verify: Timeline with activities, dates, icons

- [ ] **Desktop - Product recommendations (Phase 3)**
  - File: `customer-detail-recommendations-desktop.png`
  - Verify: AI recommendations with SKUs, confidence scores

- [ ] **Desktop - Sample history (Phase 3)**
  - File: `customer-detail-samples-desktop.png`
  - Verify: Sample log with dates, SKUs, feedback

- [ ] **Mobile - Customer detail**
  - File: `customer-detail-mobile.png`
  - Verify: All sections stack vertically, readable

---

### 2. CARLA Call Planning Pages

#### Call Plan Page (`/sales/call-plan/carla`)
- [ ] **Desktop - Initial state (no plan)**
  - File: `carla-empty-desktop.png`
  - Verify: "Create Weekly Call Plan" button, instructions

- [ ] **Desktop - Create plan modal open**
  - File: `carla-modal-open-desktop.png`
  - Verify: Week selector, customer list, X/Y inputs, generate button

- [ ] **Desktop - Call plan grid populated**
  - File: `carla-grid-populated-desktop.png`
  - Verify: 5 weekday columns, customers in grid, X/Y products assigned

- [ ] **Desktop - Call plan stats**
  - File: `carla-stats-desktop.png`
  - Verify: Total calls, X goal progress, Y goal progress

- [ ] **Desktop - Add activity modal**
  - File: `carla-add-activity-modal-desktop.png`
  - Verify: Activity form with customer pre-filled

- [ ] **Mobile - Call plan grid**
  - File: `carla-grid-mobile.png`
  - Verify: Grid adapts to mobile (horizontal scroll or stacked)

---

### 3. Dashboard Pages

#### Sales Dashboard (`/sales`)
- [ ] **Desktop - Full dashboard**
  - File: `dashboard-full-desktop.png`
  - Verify: All widgets visible, layout grid

- [ ] **Desktop - Upcoming tasks widget**
  - File: `dashboard-tasks-desktop.png`
  - Verify: Task list with due dates, priorities

- [ ] **Desktop - Calendar widget**
  - File: `dashboard-calendar-desktop.png`
  - Verify: Calendar view, events marked

- [ ] **Desktop - Product goals widget**
  - File: `dashboard-goals-desktop.png`
  - Verify: X/Y goal progress bars, percentages

- [ ] **Desktop - Revenue chart widget**
  - File: `dashboard-revenue-chart-desktop.png`
  - Verify: Chart renders correctly, axes labeled

- [ ] **Desktop - Incentives widget**
  - File: `dashboard-incentives-desktop.png`
  - Verify: Incentive information displayed

- [ ] **Mobile - Dashboard widgets stacked**
  - File: `dashboard-mobile.png`
  - Verify: Widgets stack vertically, fully visible

---

### 4. Sample Management Pages (Phase 3)

#### Samples Page (`/sales/samples`)
- [ ] **Desktop - Sample management full page**
  - File: `samples-page-desktop.png`
  - Verify: Budget tracker, log sample button, usage log

- [ ] **Desktop - Sample budget tracker**
  - File: `samples-budget-tracker-desktop.png`
  - Verify: Budget allocated, used, remaining, progress bar with colors

- [ ] **Desktop - Quick assign modal**
  - File: `samples-assign-modal-desktop.png`
  - Verify: Customer dropdown, SKU dropdown, quantity, feedback, notes

- [ ] **Desktop - Sample usage log**
  - File: `samples-usage-log-desktop.png`
  - Verify: Table with date, customer, SKU, quantity, feedback

- [ ] **Mobile - Samples page**
  - File: `samples-page-mobile.png`
  - Verify: Budget tracker readable, button accessible

#### Sample Analytics (`/sales/samples/analytics`)
- [ ] **Desktop - Analytics dashboard**
  - File: `samples-analytics-full-desktop.png`
  - Verify: All metrics and charts visible

- [ ] **Desktop - Conversion rate metric**
  - File: `samples-conversion-metric-desktop.png`
  - Verify: Percentage, visual indicator

- [ ] **Desktop - Revenue attribution metric**
  - File: `samples-revenue-metric-desktop.png`
  - Verify: Dollar amount, comparison

- [ ] **Desktop - ROI metric**
  - File: `samples-roi-metric-desktop.png`
  - Verify: ROI percentage or multiplier

- [ ] **Desktop - Conversion funnel chart**
  - File: `samples-funnel-chart-desktop.png`
  - Verify: Funnel shape, stages labeled, percentages

- [ ] **Desktop - Rep leaderboard**
  - File: `samples-rep-leaderboard-desktop.png`
  - Verify: Reps ranked, columns visible

- [ ] **Desktop - Supplier report**
  - File: `samples-supplier-report-desktop.png`
  - Verify: Suppliers listed, conversion rates, revenue

- [ ] **Desktop - Date range selector**
  - File: `samples-date-range-desktop.png`
  - Verify: Date picker open, ranges selectable

- [ ] **Mobile - Analytics dashboard**
  - File: `samples-analytics-mobile.png`
  - Verify: Metrics stack, charts resize

---

### 5. Job Queue Monitoring (Admin)

#### Admin Job Queue (`/sales/admin`)
- [ ] **Desktop - Job queue list**
  - File: `admin-job-queue-desktop.png`
  - Verify: Active jobs, completed jobs, failed jobs

- [ ] **Desktop - Job details/logs**
  - File: `admin-job-logs-desktop.png`
  - Verify: Log entries, timestamps, error messages

---

### 6. Common UI Elements

#### Navigation
- [ ] **Desktop - Main navigation**
  - File: `nav-desktop.png`
  - Verify: Logo, menu items, user menu

- [ ] **Mobile - Hamburger menu open**
  - File: `nav-mobile-open.png`
  - Verify: Menu slides in, all links visible

- [ ] **Mobile - Hamburger menu closed**
  - File: `nav-mobile-closed.png`
  - Verify: Hamburger icon visible, menu hidden

#### Modals
- [ ] **Desktop - Sample modal**
  - File: `modal-sample-assign-desktop.png`
  - Already captured above

- [ ] **Desktop - Activity modal**
  - File: `modal-activity-desktop.png`
  - Verify: Form fields, buttons, close icon

- [ ] **Desktop - Modal overlay**
  - File: `modal-overlay-desktop.png`
  - Verify: Background dimmed, modal centered

#### Forms
- [ ] **Desktop - Form with validation errors**
  - File: `form-validation-errors-desktop.png`
  - Verify: Error messages in red, fields highlighted

- [ ] **Desktop - Form success state**
  - File: `form-success-desktop.png`
  - Verify: Success message, green checkmark

#### Loading States
- [ ] **Desktop - Table loading skeleton**
  - File: `loading-skeleton-desktop.png`
  - Verify: Skeleton rows animated

- [ ] **Desktop - Chart loading spinner**
  - File: `loading-spinner-chart-desktop.png`
  - Verify: Spinner centered

- [ ] **Desktop - Button loading state**
  - File: `button-loading-desktop.png`
  - Verify: Spinner on button, button disabled

#### Error States
- [ ] **Desktop - Error message**
  - File: `error-message-desktop.png`
  - Verify: Error banner, retry button

- [ ] **Desktop - Empty state (no data)**
  - File: `empty-state-no-customers-desktop.png`
  - Verify: Illustration, helpful message

- [ ] **Desktop - 404 page**
  - File: `error-404-desktop.png`
  - Verify: 404 message, navigation options

---

## 🎨 Visual Checks for Each Screenshot

When reviewing screenshots, check for:

### Layout & Spacing
- ✅ Elements are properly aligned
- ✅ Consistent padding and margins
- ✅ No overlapping elements
- ✅ No content cutoff
- ✅ Responsive breakpoints work correctly

### Typography
- ✅ Font sizes are consistent with design
- ✅ Headings have correct hierarchy (h1 > h2 > h3)
- ✅ Text is readable (sufficient contrast)
- ✅ No text overflow or truncation issues

### Colors & Theming
- ✅ Colors match design system
- ✅ Status colors correct (green = good, red = error, yellow = warning)
- ✅ Brand colors used consistently
- ✅ Dark mode works (if applicable)

### Interactive Elements
- ✅ Buttons have hover states (if captured in screenshot)
- ✅ Links are distinguishable
- ✅ Form inputs are clearly defined
- ✅ Disabled states are visually distinct

### Charts & Visualizations
- ✅ Charts render correctly (no broken SVGs)
- ✅ Axes are labeled
- ✅ Legend is visible and correct
- ✅ Colors are distinct and accessible

### Responsiveness
- ✅ Mobile layouts are usable
- ✅ No horizontal scroll on mobile
- ✅ Touch targets are large enough (44px minimum)
- ✅ Text is readable on small screens

### Accessibility
- ✅ Sufficient color contrast (WCAG AA)
- ✅ Focus indicators visible (if captured)
- ✅ Icons have labels or tooltips
- ✅ Alt text present for images

---

## 📊 Screenshot Comparison Tools

### Manual Comparison
1. Open baseline screenshot and new screenshot side-by-side
2. Look for differences in layout, colors, spacing
3. Note any regressions or unexpected changes

### Automated Comparison (Optional)
Tools to consider:
- **Percy**: https://percy.io (visual regression testing)
- **Chromatic**: https://www.chromatic.com (Storybook visual testing)
- **BackstopJS**: https://github.com/garris/BackstopJS (local comparison)

---

## 📝 Screenshot Test Results Template

### Session Information
- **Date**: _______________
- **Branch/Commit**: _______________
- **Tester**: _______________
- **Total Screenshots**: _______________

### Screenshot Summary
- **Total Screenshots Captured**: _______________
- **Matching Baseline**: _______________
- **Visual Regressions Found**: _______________
- **New Features (no baseline)**: _______________

### Visual Regressions Detected
1. **Screenshot**: _______________
   - **Issue**: _______________
   - **Severity**: Critical / High / Medium / Low
   - **Action**: _______________

2. **Screenshot**: _______________
   - **Issue**: _______________
   - **Severity**: Critical / High / Medium / Low
   - **Action**: _______________

(Continue for all regressions...)

### Recommendations
1. _______________
2. _______________
3. _______________

---

## 🚀 Next Steps

After capturing screenshots:
1. **Organize**: Move to dated folder
2. **Review**: Check each screenshot against checklist
3. **Compare**: Compare to baseline (if exists)
4. **Document**: Note any visual regressions
5. **Share**: Provide screenshots to design/dev team
6. **Update Baseline**: Replace baseline screenshots after approved changes

---

**Checklist completed by**: _______________
**Date**: _______________
