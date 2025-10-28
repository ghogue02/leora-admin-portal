# Leora CRM - Comprehensive Testing Guide

## 🎯 Overview

This document provides a complete guide to testing the Leora CRM system, including manual testing with Claude Chrome extension, automated testing, and quality assurance processes.

---

## 📚 Table of Contents

1. [Test Suite Organization](#test-suite-organization)
2. [Quick Start for Claude Extension](#quick-start-for-claude-extension)
3. [Manual Testing](#manual-testing)
4. [Automated Testing](#automated-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [Browser Compatibility](#browser-compatibility)
9. [Test Data Management](#test-data-management)
10. [Continuous Integration](#continuous-integration)
11. [Best Practices](#best-practices)

---

## 📦 Test Suite Organization

### Test Files Structure

```
/web/tests/
├── chrome-extension-test-suite.md    # Main test suite (76 tests)
├── CLAUDE_EXTENSION_TEST_GUIDE.md    # Guide for Claude extension
├── phase3-samples-tests.md           # Phase 3 specific tests
├── api-tests.http                    # API test collection
├── performance-benchmarks.md         # Performance targets
├── browser-compatibility.md          # Browser testing checklist
├── accessibility-checklist.md        # WCAG 2.1 AA compliance
├── visual-regression-checklist.md    # Visual testing checklist
├── TEST_RESULTS_TEMPLATE.md          # Test results template
├── generate-test-data.ts             # Test data generator
└── screenshots/                      # Visual regression screenshots
```

### Test Suite Summary

| Suite | Tests | Purpose |
|-------|-------|---------|
| **Customer Management** | 12 | Customer list, filters, search, detail pages |
| **CARLA Call Planning** | 10 | Weekly call plan creation and management |
| **Dashboard & Widgets** | 8 | Dashboard functionality and widgets |
| **Job Queue Monitoring** | 6 | Admin job queue and monitoring |
| **Samples & Analytics** | 14 | Phase 3 sample management (run after Phase 3 complete) |
| **Mobile Responsiveness** | 8 | Mobile viewport and touch interactions |
| **Performance** | 6 | Page load times, API speed, rendering |
| **Security** | 6 | Authentication, XSS, SQL injection |
| **TOTAL** | **76** | Comprehensive coverage |

---

## 🚀 Quick Start for Claude Extension

### Prerequisites
1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Ensure Database is Seeded**
   ```bash
   npm run seed:well-crafted
   ```
   This loads 4,838 customers.

3. **Open Application**
   ```
   http://localhost:3000
   ```

### Running Tests with Claude Extension

1. **Open Main Test Suite**
   - File: `/web/tests/chrome-extension-test-suite.md`
   - Contains all 76 tests with step-by-step instructions

2. **Open Testing Guide**
   - File: `/web/tests/CLAUDE_EXTENSION_TEST_GUIDE.md`
   - Detailed instructions on how to execute tests

3. **Execute Tests**
   - Follow each test sequentially
   - Mark Pass/Fail for each test
   - Record results in template

4. **Fill Results Template**
   - File: `/web/tests/TEST_RESULTS_TEMPLATE.md`
   - Copy and rename: `TEST_RESULTS_2025-01-25.md`
   - Fill in all sections

5. **Generate Screenshots**
   - Use checklist: `/web/tests/visual-regression-checklist.md`
   - Save to: `/web/tests/screenshots/[DATE]/`

---

## 🧪 Manual Testing

### Test Execution Process

#### 1. Pre-Test Setup
```bash
# Start development server
npm run dev

# Verify database is seeded
npm run seed:well-crafted

# Optional: Generate test data
npx tsx web/tests/generate-test-data.ts
```

#### 2. Execute Test Suites

**Recommended Order:**
1. Customer Management (foundation)
2. CARLA Call Planning
3. Dashboard & Widgets
4. Job Queue Monitoring
5. Mobile Responsiveness
6. Performance Tests
7. Security Tests
8. Samples & Analytics (after Phase 3 complete)

#### 3. Record Results

For each test:
- ✅ Mark as Pass if all expected results are met
- ❌ Mark as Fail if any expected result is not met
- ⏭️ Mark as Skipped if test cannot be run (missing feature, blocker)
- 🚫 Mark as Blocked if dependent test failed

Record:
- Actual results (counts, times, values)
- Error messages (if any)
- Screenshots (for visual issues)
- Console errors (if any)

#### 4. Report Results

- Fill in `TEST_RESULTS_TEMPLATE.md`
- Attach screenshots
- List all failures with details
- Provide recommendations

---

## 🤖 Automated Testing

### Unit Tests (Vitest)

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test path/to/test.ts
```

**Unit Test Files:**
- `/web/src/lib/cart.test.ts` - Cart functionality
- `/web/src/lib/analytics.test.ts` - Analytics calculations
- `/web/src/lib/api/parsers.test.ts` - API parsing
- `/web/src/lib/prisma.test.ts` - Database interactions

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

**Integration Test Files:**
- `/web/tests/integration/` - API integration tests

### API Testing (REST Client)

1. **Install REST Client Extension**
   - VS Code: Search "REST Client" in extensions
   - Install by Huachao Mao

2. **Open API Test Collection**
   - File: `/web/tests/api-tests.http`

3. **Update Variables**
   ```http
   @baseUrl = http://localhost:3000/api
   @token = YOUR_AUTH_TOKEN_HERE
   @customerId = CUSTOMER_ID_HERE
   ```

4. **Execute Tests**
   - Click "Send Request" above each API call
   - Verify response status and data

---

## ⚡ Performance Testing

### Performance Targets

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Page Load (TTI) | <2s | 2-4s | >4s |
| API Response | <500ms | 500-1000ms | >1000ms |
| Database Query | <100ms | 100-200ms | >200ms |
| Chart Render | <1s | 1-2s | >2s |

### How to Test Performance

#### 1. Using Chrome DevTools

**Network Tab:**
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to page
4. Check "DOMContentLoaded" (blue line) and "Load" (red line) times

**Performance Tab:**
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Navigate to page or perform action
5. Stop recording
6. Analyze timeline for bottlenecks

**Lighthouse:**
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Performance" category
4. Click "Generate report"
5. Target: Score 90+

#### 2. Performance Benchmarks

See: `/web/tests/performance-benchmarks.md`

Contains:
- 10 performance test scenarios
- Detailed measurement steps
- Expected vs actual results template
- Optimization checklist

---

## 🔒 Security Testing

### Security Test Checklist

- [ ] **Authentication**: Login required for protected routes
- [ ] **Session Management**: Sessions expire correctly
- [ ] **API Authentication**: APIs require auth tokens
- [ ] **XSS Protection**: Script tags are escaped
- [ ] **SQL Injection Protection**: SQL is parameterized
- [ ] **HTTPS/SSL**: Enforced in production

### How to Test Security

#### XSS (Cross-Site Scripting)
1. In search box, enter: `<script>alert('XSS')</script>`
2. Submit search
3. Verify: Script is escaped, no alert appears

#### SQL Injection
1. In search box, enter: `'; DROP TABLE customers; --`
2. Submit search
3. Verify: Query is safe, no database error

#### Authentication
1. Open incognito window
2. Navigate to protected route
3. Verify: Redirected to login (if auth enabled)

#### API Security
1. Open DevTools Network tab
2. Make API call
3. Verify: Auth header is present, 401 if missing

---

## ♿ Accessibility Testing

### Accessibility Standards
**Target**: WCAG 2.1 Level AA Compliance

### Automated Testing

#### 1. axe DevTools (Chrome Extension)
1. Install: https://www.deque.com/axe/devtools/
2. Open page
3. Open DevTools (F12)
4. Go to axe DevTools tab
5. Click "Scan ALL of my page"
6. Fix all Critical and Serious issues

#### 2. Lighthouse Accessibility Audit
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility"
4. Click "Generate report"
5. Target: Score 90+

#### 3. WAVE (Chrome Extension)
1. Install: https://wave.webaim.org/extension/
2. Open page
3. Click WAVE icon
4. Review errors and alerts
5. Fix all errors

### Manual Testing

#### Keyboard Navigation
- Tab through all interactive elements
- Verify all elements are accessible
- Check focus indicators are visible
- Test dropdown menus, modals, forms

#### Screen Reader Testing
**VoiceOver (macOS):**
- Activate: Cmd+F5
- Navigate: VO+Right Arrow
- Check: Headings, links, buttons are announced correctly

**NVDA (Windows):**
- Activate: Ctrl+Alt+N
- Navigate: Down Arrow
- Check: Content is read correctly

#### Color Contrast
- Use: https://contrast-ratio.com/
- Check: All text meets 4.5:1 ratio
- Check: UI components meet 3:1 ratio

### Accessibility Checklist

See: `/web/tests/accessibility-checklist.md`

Covers:
- Text alternatives (alt text)
- Color contrast
- Keyboard navigation
- Form labels
- ARIA attributes
- Screen reader compatibility
- Mobile accessibility

---

## 🌐 Browser Compatibility

### Supported Browsers

**Desktop (Priority 1):**
- Chrome (latest)
- Safari (latest - macOS)
- Firefox (latest)
- Edge (latest)

**Mobile (Priority 1):**
- Mobile Safari (iOS 15+)
- Chrome Mobile (Android 11+)

### How to Test Browser Compatibility

#### 1. Manual Testing
- Test on each browser manually
- Use different OS versions
- Test desktop and mobile

#### 2. BrowserStack (Optional)
- https://www.browserstack.com
- Test on real devices and browsers
- Automated and manual testing

#### 3. Chrome DevTools Device Mode
- Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)
- Select device from list
- Test responsive layouts

### Browser Compatibility Checklist

See: `/web/tests/browser-compatibility.md`

Tests for:
- Core functionality on each browser
- Browser-specific issues (date pickers, flexbox, etc.)
- Visual consistency
- Performance differences
- Mobile-specific issues (touch, zoom, keyboard)

---

## 📊 Test Data Management

### Seeding Production-Like Data

```bash
# Seed 4,838 customers (Well-Crafted Wines)
npm run seed:well-crafted

# Seed portal demo data
npm run seed:portal-demo

# Seed activity types
npm run seed:activity-types
```

### Generating Test Data

```bash
# Generate test data for testing
npx tsx web/tests/generate-test-data.ts
```

**What it creates:**
- 10 test customers
- 50 test orders
- 30 test samples
- 80 test activities
- 2 test call plans

**Test data is prefixed with "TEST-"** for easy identification.

### Cleaning Test Data

```bash
# Delete all test data (prefix TEST-)
npm run test:clean-data
```

*(Script to be created if needed)*

---

## 🔄 Continuous Integration (CI/CD)

### GitHub Actions (Future)

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm run test
      - name: Run linter
        run: npm run lint
      - name: Build project
        run: npm run build
```

### Automated Testing Pipeline (Future)

1. **Unit Tests**: Run on every commit
2. **Integration Tests**: Run on PR
3. **E2E Tests**: Run before merge
4. **Performance Tests**: Run nightly
5. **Accessibility Tests**: Run on PR

---

## ✅ Best Practices

### Testing Guidelines

#### 1. Test Early, Test Often
- Write tests as you develop features
- Run tests before committing code
- Fix failing tests immediately

#### 2. Test Pyramid
- **Many Unit Tests**: Fast, focused, isolated
- **Some Integration Tests**: Test interactions
- **Few E2E Tests**: Test critical user flows

#### 3. Clear Test Names
```typescript
// ❌ Bad
test('test1', () => { ... });

// ✅ Good
test('should calculate total revenue correctly', () => { ... });
```

#### 4. Independent Tests
- Each test should run independently
- Don't rely on test execution order
- Clean up after each test

#### 5. Test Data
- Use realistic test data
- Avoid hard-coded values when possible
- Clean up test data after tests

#### 6. Document Test Failures
- Always record why a test failed
- Include error messages and screenshots
- Provide steps to reproduce

### Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: All critical APIs covered
- **E2E Tests**: All user flows covered
- **Manual Tests**: All features tested before release

---

## 📝 Test Reporting

### Test Results Template

Use: `/web/tests/TEST_RESULTS_TEMPLATE.md`

**Required Sections:**
- Test summary (passed, failed, skipped)
- Detailed failure reports
- Performance metrics
- Browser compatibility results
- Accessibility results
- Recommendations

**When to Create Report:**
- Before each release
- After major features
- Weekly regression testing
- After bug fixes

### Sharing Test Results

**Distribution:**
- Development team (always)
- Product manager (for major releases)
- QA manager (for regression testing)
- Stakeholders (for production releases)

---

## 🛠️ Troubleshooting

### Common Test Issues

#### Tests Failing Locally
1. Check if dev server is running
2. Check if database is seeded
3. Clear browser cache
4. Check for port conflicts (3000)

#### Tests Passing Locally, Failing in CI
1. Check environment variables
2. Check database connection
3. Check for timing issues (add waits)
4. Check for hardcoded URLs/ports

#### Flaky Tests
1. Add explicit waits (not arbitrary timeouts)
2. Check for race conditions
3. Ensure test data is clean
4. Check for async issues

---

## 📞 Getting Help

### Resources
- **Project README**: `/web/README.md`
- **Testing Guide**: `/web/docs/TESTING.md` (this file)
- **Test Suite**: `/web/tests/chrome-extension-test-suite.md`
- **API Tests**: `/web/tests/api-tests.http`

### Contact
- Development Team: [Contact Info]
- QA Team: [Contact Info]
- Project Manager: [Contact Info]

---

## 🚀 Next Steps

### After Reading This Guide
1. ✅ Run through Quick Start
2. ✅ Execute test suite with Claude extension
3. ✅ Fill in test results template
4. ✅ Review and address any failures
5. ✅ Schedule regular regression testing

### For New Team Members
1. Read this guide
2. Set up local development environment
3. Run test suite on localhost
4. Familiarize with test data
5. Practice writing tests for new features

---

**Last Updated**: 2025-01-25
**Version**: 1.0.0
**Maintained by**: QA Team
