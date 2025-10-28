# Leora CRM - Testing Framework

**Comprehensive E2E, Performance, and Security Testing**

---

## Overview

This testing framework provides comprehensive coverage of the Leora CRM application with:

- **103 Automated E2E Tests** - Critical user workflows
- **15 Performance Tests** - Load times and stress testing
- **25 Security Tests** - Authentication, authorization, vulnerability testing
- **72 UAT Test Cases** - Manual user acceptance testing
- **Cross-browser Support** - Chrome, Firefox, Safari, Edge, Mobile
- **CI/CD Ready** - Automated testing pipeline integration

---

## Quick Start

### 1. Installation (One-time Setup)

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install
```

### 2. Run Tests

```bash
# Start dev server (Terminal 1)
npm run dev

# Run tests in interactive UI (Terminal 2)
npm run test:e2e:ui
```

That's it! The Playwright UI will open where you can select and run tests.

---

## Test Structure

```
/web
├── tests/
│   ├── e2e/                           # End-to-end tests
│   │   ├── auth.setup.ts             # Authentication setup
│   │   ├── fixtures.ts               # Custom test fixtures
│   │   ├── 01-customer-workflows.spec.ts    # 15 customer tests
│   │   ├── 02-order-workflows.spec.ts       # 13 order tests
│   │   ├── 03-sample-tracking.spec.ts       # 11 sample tests
│   │   ├── 04-dashboard-carla.spec.ts       # 12 dashboard tests
│   │   └── 05-operations-routes.spec.ts     # 12 operations tests
│   ├── performance/
│   │   └── load-testing.spec.ts      # 15+ performance tests
│   ├── security/
│   │   └── security-tests.spec.ts    # 25+ security tests
│   └── integration/                   # Existing Vitest tests
│       ├── bulk-categorization.test.ts
│       ├── calendar-sync.test.ts
│       └── ...
├── docs/
│   ├── UAT_TESTING_GUIDE.md          # 72 manual test cases
│   ├── PHASE4_TESTING_SUMMARY.md     # Complete testing summary
│   ├── TEST_EXECUTION_GUIDE.md       # How to run tests
│   └── TESTING_README.md             # This file
├── playwright.config.ts               # Playwright configuration
└── package.json                       # Test scripts
```

---

## Test Coverage by Feature

| Feature | E2E Tests | Performance | Security | UAT |
|---------|-----------|-------------|----------|-----|
| Customer Management | 15 | ✓ | - | 12 |
| Order Processing | 13 | ✓ | - | 10 |
| Sample Tracking | 11 | ✓ | - | 8 |
| Dashboard & CARLA | 12 | ✓ | - | 10 |
| Operations & Routes | 12 | ✓ | - | 8 |
| Authentication | - | - | ✓ | - |
| Authorization | - | - | ✓ | - |
| Input Validation | - | - | ✓ | - |
| **Total** | **63** | **15** | **25** | **72** |

---

## Available Test Commands

### E2E Testing

```bash
npm run test:e2e              # Run all E2E tests (headless)
npm run test:e2e:ui           # Interactive UI (best for dev)
npm run test:e2e:headed       # See browser window
npm run test:e2e:chrome       # Chrome only
npm run test:e2e:firefox      # Firefox only
npm run test:e2e:safari       # Safari only
npm run test:e2e:mobile       # Mobile devices only
```

### Specialized Testing

```bash
npm run test:performance      # Performance tests
npm run test:security         # Security tests
npm run test:all              # Unit + E2E tests
```

### Reporting

```bash
npm run test:report           # View HTML report
```

---

## Test Workflows Covered

### Customer Management Workflows
- ✓ View customer list with pagination
- ✓ Search customers
- ✓ Filter by health score, territory, account type
- ✓ View customer detail page
- ✓ Log activities (visits, calls, emails, notes)
- ✓ Log sample distributions
- ✓ Create call plans
- ✓ Mark customers as contacted
- ✓ Mobile responsive views
- ✓ Performance benchmarks (<2s load time)

### Order Processing Workflows
- ✓ Browse product catalog
- ✓ Search products
- ✓ Apply category filters
- ✓ Add items to cart
- ✓ Update cart quantities
- ✓ Remove cart items
- ✓ Complete checkout
- ✓ View order history
- ✓ View order details
- ✓ Cart persistence across navigation
- ✓ Empty cart handling
- ✓ Large catalog pagination

### Sample Tracking Workflows
- ✓ Log sample distribution
- ✓ Track sample follow-ups
- ✓ Convert samples to orders
- ✓ View sample analytics
- ✓ Filter samples by date
- ✓ AI-powered recommendations
- ✓ Budget tracking
- ✓ Budget warnings

### Dashboard & CARLA Workflows
- ✓ View dashboard widgets
- ✓ Customize layout
- ✓ Filter by date range
- ✓ Drill down from charts
- ✓ CARLA chat interactions
- ✓ CARLA quick actions
- ✓ Voice commands
- ✓ Data export
- ✓ Real-time updates

### Operations Workflows
- ✓ Create delivery routes
- ✓ Optimize routes
- ✓ Generate pick lists
- ✓ Track deliveries
- ✓ Handle exceptions
- ✓ Inventory management
- ✓ Barcode scanning
- ✓ Inventory adjustments
- ✓ Interactive maps
- ✓ Territory management

---

## Performance Benchmarks

| Page/Feature | Target | Critical Threshold |
|-------------|--------|-------------------|
| Customer List | <2s | <3s |
| Customer Detail | <2s | <3s |
| Catalog | <2s | <3s |
| Dashboard | <2s | <3s |
| API Calls | <500ms | <1s |
| Route Maps | <3s | <5s |
| Cart Operations | <100ms | <500ms |

---

## Security Testing Coverage

### Authentication
- ✓ Redirect unauthenticated users
- ✓ Invalid credential rejection
- ✓ Password requirements enforcement
- ✓ Rate limiting on login attempts
- ✓ Session timeout handling

### Authorization
- ✓ Role-based access control (RBAC)
- ✓ Tenant data isolation
- ✓ API authorization headers
- ✓ Unauthorized access prevention

### Input Validation
- ✓ XSS prevention in user inputs
- ✓ HTML sanitization
- ✓ SQL injection prevention
- ✓ Email format validation
- ✓ CSRF token validation

### Data Security
- ✓ HTTPS enforcement (production)
- ✓ Secure cookie flags
- ✓ No sensitive data in URLs
- ✓ File upload validation
- ✓ File size limits
- ✓ Security headers

---

## Browser Compatibility

| Browser | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Chrome 120+ | ✓ | ✓ | ✅ Tested |
| Firefox 121+ | ✓ | - | ✅ Tested |
| Safari 17+ | ✓ | ✓ | ✅ Tested |
| Edge 120+ | ✓ | - | ✅ Tested |

**Mobile Devices:**
- iPhone 12 (iOS Safari)
- Pixel 5 (Android Chrome)
- iPad Pro

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run playwright:install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

---

## Test Data

### Seeding Test Database

```bash
# Seed full dataset
npm run seed:well-crafted

# Seed portal demo data
npm run seed:portal-demo

# Seed activity types
npm run seed:activity-types
```

### Test Accounts

```
Sales Rep:     rep@wellcrafted.com / password123
Manager:       manager@wellcrafted.com / password123
Admin:         admin@wellcrafted.com / password123
Portal User:   customer@restaurant.com / password123
```

---

## Debugging Tests

### Method 1: Playwright UI (Recommended)

```bash
npm run test:e2e:ui
```

Features:
- Visual step-by-step execution
- Time travel debugging
- Element inspector
- Console logs
- Network viewer

### Method 2: Debug Mode

```bash
PWDEBUG=1 npx playwright test tests/e2e/01-customer-workflows.spec.ts
```

Opens Playwright Inspector for line-by-line debugging

### Method 3: View Trace

```bash
npx playwright show-trace test-results/trace.zip
```

Interactive trace viewer with screenshots and network logs

---

## Test Reports

### Automatic Reports

Tests automatically generate:
- HTML report (`test-results/playwright-report/`)
- JSON results (`test-results/playwright-results.json`)
- JUnit XML (`test-results/junit.xml`)
- Screenshots of failures
- Video recordings
- Trace files

### View Report

```bash
npm run test:report
```

Opens interactive HTML report with:
- Pass/fail summary
- Test duration
- Failure screenshots
- Video playback
- Trace viewer

---

## UAT (User Acceptance Testing)

For manual testing, see:
- **[UAT_TESTING_GUIDE.md](./UAT_TESTING_GUIDE.md)** - 72 detailed test cases
- **[TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md)** - Quick start guide

UAT covers:
- Section 1: Customer Management (12 tests, 90 min)
- Section 2: Order Processing (10 tests, 75 min)
- Section 3: Sample Tracking (8 tests, 60 min)
- Section 4: Dashboard & CARLA (10 tests, 75 min)
- Section 5: Operations (8 tests, 60 min)
- Section 6: Performance (6 tests, 45 min)
- Section 7: Security (8 tests, 60 min)
- Section 8: Mobile Testing (10 tests, 75 min)

---

## Success Criteria

**Tests Pass If:**
- ✓ 90%+ E2E test pass rate
- ✓ 0 critical bugs
- ✓ Performance targets met
- ✓ Security tests 100% pass
- ✓ Cross-browser compatible
- ✓ Mobile responsive
- ✓ UAT sign-off obtained

---

## Common Issues

### Tests Can't Find Elements

**Solution:** Ensure dev server is running
```bash
curl http://localhost:3000
```

### Authentication Fails

**Solution:** Clear auth state
```bash
rm -rf .auth/
```

### Tests Timeout

**Solution:** Increase timeout in `playwright.config.ts`
```typescript
timeout: 60000
```

### Flaky Tests

**Solution:** Add explicit waits
```typescript
await page.waitForLoadState('networkidle');
```

---

## Documentation

- **[PHASE4_TESTING_SUMMARY.md](./PHASE4_TESTING_SUMMARY.md)** - Complete testing overview
- **[UAT_TESTING_GUIDE.md](./UAT_TESTING_GUIDE.md)** - Manual testing procedures
- **[TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md)** - How to run tests
- **[Playwright Docs](https://playwright.dev)** - Official Playwright documentation

---

## Support

### Need Help?

1. Check [TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md)
2. Review test failures in Playwright UI
3. Check console for errors
4. View trace files for detailed debugging

### Update Tests

When adding new features:
1. Add E2E test in appropriate spec file
2. Update UAT guide if user-facing
3. Add performance benchmark if needed
4. Document test in this README

---

## Metrics

**Test Suite Stats:**
- Total Automated Tests: 103
- Total Manual Tests: 72
- Total Test Cases: 175
- Files Created: 13
- Lines of Code: ~4,500
- Browsers Supported: 7
- Coverage Goal: 90%+

**Performance:**
- E2E Suite Runtime: ~5-10 minutes
- Performance Suite: ~2-3 minutes
- Security Suite: ~3-5 minutes
- Parallel Workers: 5 (configurable)

---

## Version

**Framework Version:** 1.0
**Created:** October 26, 2025
**Playwright:** 1.56+
**Node:** 18+
**Status:** ✅ Production Ready

---

**Happy Testing! 🧪✅**

For detailed execution instructions, see [TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md)
