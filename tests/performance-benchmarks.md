# Performance Benchmarks - Leora CRM

## 🎯 Purpose

This document defines performance targets and benchmarks for the Leora CRM system. Use these as acceptance criteria during testing.

---

## 📊 Core Performance Metrics

### Page Load Times (Time to Interactive)

| Page | Target | Acceptable | Poor |
|------|--------|------------|------|
| Customer List | <1s | 1-2s | >2s |
| Customer Detail | <1s | 1-2s | >2s |
| CARLA Call Plan | <1.5s | 1.5-3s | >3s |
| Sales Dashboard | <1.5s | 1.5-3s | >3s |
| Samples Page | <1s | 1-2s | >2s |
| Sample Analytics | <2s | 2-4s | >4s |

### API Response Times

| API Endpoint | Target | Acceptable | Poor |
|--------------|--------|------------|------|
| GET /api/sales/customers | <300ms | 300-500ms | >500ms |
| GET /api/sales/customers/[id] | <200ms | 200-400ms | >400ms |
| GET /api/sales/orders | <300ms | 300-500ms | >500ms |
| GET /api/sales/activities | <200ms | 200-400ms | >400ms |
| POST /api/sales/samples/quick-assign | <200ms | 200-500ms | >500ms |
| GET /api/sales/samples/analytics/* | <500ms | 500-1000ms | >1000ms |
| POST /api/ai/recommendations | <5s | 5-10s | >10s |
| POST /api/sales/call-plans | <1s | 1-2s | >2s |

### Database Query Times

| Query Type | Target | Acceptable | Poor |
|------------|--------|------------|------|
| Simple SELECT (indexed) | <10ms | 10-50ms | >50ms |
| Complex JOIN (2-3 tables) | <50ms | 50-100ms | >100ms |
| Aggregation (COUNT, SUM) | <100ms | 100-200ms | >200ms |
| Full-text search | <200ms | 200-500ms | >500ms |

### Frontend Rendering Times

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| First Contentful Paint (FCP) | <800ms | 800-1500ms | >1500ms |
| Largest Contentful Paint (LCP) | <1.5s | 1.5-2.5s | >2.5s |
| Time to Interactive (TTI) | <2s | 2-4s | >4s |
| First Input Delay (FID) | <50ms | 50-100ms | >100ms |
| Cumulative Layout Shift (CLS) | <0.1 | 0.1-0.25 | >0.25 |

### Chart Rendering Times

| Chart Type | Target | Acceptable | Poor |
|------------|--------|------------|------|
| Simple bar/line chart | <500ms | 500-1000ms | >1000ms |
| Complex chart (multi-series) | <1s | 1-2s | >2s |
| Interactive chart (tooltips, zoom) | <1.5s | 1.5-3s | >3s |

---

## 🧪 Performance Test Scenarios

### Scenario 1: Customer List Load (4,838 customers)

**Test Steps:**
1. Clear browser cache
2. Navigate to /sales/customers
3. Measure time from navigation to fully interactive

**Targets:**
- Initial load: <1.5s
- API response: <400ms
- Table render: <500ms
- Total TTI: <2s

**What to measure:**
- Network: DOMContentLoaded time
- API: /api/sales/customers response time
- Rendering: Time to render first 50 rows
- Interaction: Time until search/filters work

---

### Scenario 2: Customer Detail Load

**Test Steps:**
1. Navigate to customer detail page
2. Measure time to load all sections

**Targets:**
- Header load: <300ms
- Metrics cards load: <400ms
- Order history load: <500ms
- Activity timeline load: <500ms
- Total page load: <1.5s

**What to measure:**
- Individual API calls for each section
- Rendering time for each component
- Time until page is fully interactive

---

### Scenario 3: CARLA Call Plan Generation

**Test Steps:**
1. Open create call plan modal
2. Select 10 customers
3. Set X and Y goals
4. Click "Generate Call Plan"
5. Measure time until grid is displayed

**Targets:**
- Modal open: <200ms
- Customer selection load: <300ms
- Plan generation (API): <1s
- Grid render: <500ms
- Total time: <2s

**What to measure:**
- API response time for plan creation
- Time to render grid with 10 customers
- Time until grid is interactive

---

### Scenario 4: Sample Quick Assign

**Test Steps:**
1. Click "Log Sample Usage"
2. Select customer
3. Select SKU
4. Fill form and submit
5. Measure time until success confirmation

**Targets:**
- Modal open: <200ms
- Customer dropdown load: <300ms
- SKU dropdown load: <300ms
- Form submit (API): <200ms
- Total time: <1s

**What to measure:**
- API response for sample assignment
- Inventory update time
- Activity creation time
- UI update time

---

### Scenario 5: Sample Analytics Dashboard Load

**Test Steps:**
1. Navigate to /sales/samples/analytics
2. Select date range: Last 90 days
3. Measure time until all metrics and charts load

**Targets:**
- Initial API call: <1s
- Metrics calculation: <500ms
- Charts render: <1s
- Total load: <2.5s

**What to measure:**
- API response time for analytics data
- Time to calculate conversion rate, ROI
- Chart rendering time (funnel, leaderboard)
- Total TTI

---

### Scenario 6: AI Product Recommendations

**Test Steps:**
1. On customer detail page, click "Get AI Recommendations"
2. Measure time until recommendations are displayed

**Targets:**
- API request initiation: <100ms
- AI processing: <8s
- Recommendations display: <500ms
- Total time: <10s

**What to measure:**
- Time to send request to Claude API
- Claude API response time
- Parsing and formatting time
- UI rendering time

---

### Scenario 7: Dashboard Widget Load

**Test Steps:**
1. Navigate to /sales dashboard
2. Measure time for each widget to load

**Targets:**
- Dashboard page load: <1s
- Each widget load: <500ms
- All widgets loaded: <2s

**What to measure:**
- Individual API calls for each widget
- Rendering time for each widget
- Total dashboard TTI

---

### Scenario 8: Search Performance

**Test Steps:**
1. On customer list page, type in search box
2. Measure time from keystroke to results displayed

**Targets:**
- Debounce delay: 300ms
- API response: <300ms
- Table update: <200ms
- Total time: <800ms

**What to measure:**
- Search API response time
- Client-side filtering time (if applicable)
- Table re-render time

---

### Scenario 9: Pagination Performance

**Test Steps:**
1. On customer list page with 4,838 customers
2. Click "Next" to go to page 2
3. Measure time until new page is displayed

**Targets:**
- API response: <300ms
- Table re-render: <200ms
- Total time: <500ms

**What to measure:**
- API response for page 2 data
- Table component re-render time
- Scroll position reset time

---

### Scenario 10: Mobile Performance

**Test Steps:**
1. Resize browser to mobile viewport (375px)
2. Navigate through key pages
3. Measure load times on mobile

**Targets:**
- Customer list: <2.5s
- Customer detail: <2s
- Dashboard: <3s
- Sample assign: <1.5s

**What to measure:**
- Mobile-specific CSS/JS load time
- Touch interaction responsiveness
- Scroll performance (60fps target)

---

## 🔧 Performance Optimization Checklist

### Database Optimizations
- [ ] Indexes created on frequently queried columns:
  - customer.accountNumber
  - customer.riskStatus
  - customer.nextExpectedOrderDate
  - order.customerId
  - order.orderDate
  - activity.customerId
  - sample.customerId
  - sample.skuId
- [ ] Database connection pooling configured
- [ ] Query result caching implemented (where applicable)
- [ ] Pagination used for large datasets
- [ ] Limit use of SELECT * (only select needed columns)

### API Optimizations
- [ ] Response compression (gzip) enabled
- [ ] API responses are paginated
- [ ] Unnecessary data excluded from responses
- [ ] Parallel API calls where possible
- [ ] API rate limiting configured
- [ ] Caching headers set correctly (Cache-Control, ETag)

### Frontend Optimizations
- [ ] Code splitting implemented (Next.js automatic)
- [ ] Images optimized (Next.js Image component)
- [ ] Lazy loading for below-fold content
- [ ] Debouncing on search inputs (300ms)
- [ ] Skeleton loaders for perceived performance
- [ ] Minimized re-renders (React.memo, useMemo)
- [ ] Virtual scrolling for long lists (if applicable)

### Chart Optimizations
- [ ] Chart libraries optimized (use lightweight charts)
- [ ] Limit data points displayed (max 100-200 points)
- [ ] Aggregate data server-side
- [ ] Use canvas rendering instead of SVG for large datasets
- [ ] Lazy load charts below the fold

### Network Optimizations
- [ ] HTTP/2 enabled
- [ ] CDN used for static assets (if applicable)
- [ ] Critical CSS inlined
- [ ] Fonts preloaded
- [ ] Prefetch/preconnect for API calls

---

## 📈 Performance Monitoring

### Tools to Use

#### Chrome DevTools
- **Network Tab**: Measure API response times, resource load times
- **Performance Tab**: Record page load, analyze rendering, identify bottlenecks
- **Lighthouse**: Generate performance audit reports
- **Coverage Tab**: Identify unused CSS/JS

#### Performance Metrics to Track
- **TTFB (Time to First Byte)**: Server response time
- **FCP (First Contentful Paint)**: First visual element
- **LCP (Largest Contentful Paint)**: Main content loaded
- **TTI (Time to Interactive)**: Page is fully interactive
- **FID (First Input Delay)**: Responsiveness to user input
- **CLS (Cumulative Layout Shift)**: Visual stability

#### Lighthouse Targets
- Performance Score: >90 (Good), 50-90 (Needs Improvement), <50 (Poor)
- Accessibility Score: >90
- Best Practices Score: >90
- SEO Score: >90

---

## 🚨 Performance Alerts

### When to Raise Performance Issues

**Critical (Blocker)**:
- Page load >5s
- API response >2s (excluding AI)
- Database query >500ms
- Page crash or freeze

**High Priority**:
- Page load >3s
- API response >1s
- User interaction delay >500ms
- Mobile performance significantly worse than desktop

**Medium Priority**:
- Page load >2s but <3s
- API response >500ms but <1s
- Chart rendering >2s
- Lighthouse score <70

**Low Priority**:
- Minor CLS issues (<0.25)
- Slight delay in animations (<100ms)
- Lighthouse score 70-90

---

## 📊 Performance Test Results Template

### Test Session Information
- **Date**: _______________
- **Environment**: Local / Staging / Production
- **Database Size**: _____ customers, _____ orders
- **Browser**: Chrome / Safari / Firefox
- **Device**: Desktop / Tablet / Mobile

### Performance Results

| Scenario | Target | Actual | Status |
|----------|--------|--------|--------|
| Customer List Load | <2s | _____ | ✅ / ⚠️ / ❌ |
| Customer Detail Load | <1.5s | _____ | ✅ / ⚠️ / ❌ |
| CARLA Plan Generation | <2s | _____ | ✅ / ⚠️ / ❌ |
| Sample Quick Assign | <1s | _____ | ✅ / ⚠️ / ❌ |
| Analytics Dashboard | <2.5s | _____ | ✅ / ⚠️ / ❌ |
| AI Recommendations | <10s | _____ | ✅ / ⚠️ / ❌ |
| Dashboard Load | <2s | _____ | ✅ / ⚠️ / ❌ |
| Search Performance | <800ms | _____ | ✅ / ⚠️ / ❌ |
| Pagination | <500ms | _____ | ✅ / ⚠️ / ❌ |

### Lighthouse Scores
- **Performance**: _____ / 100
- **Accessibility**: _____ / 100
- **Best Practices**: _____ / 100
- **SEO**: _____ / 100

### Issues Identified
1. _______________
2. _______________
3. _______________

### Recommendations
1. _______________
2. _______________
3. _______________

---

**Tested by**: _______________
**Date**: _______________
