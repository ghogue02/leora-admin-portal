# Test Execution Guide
## Quick Start for Running Leora CRM Tests

---

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Playwright installed (`npm run playwright:install`)
- [ ] Development server running (`npm run dev`)
- [ ] Database seeded with test data (`npm run seed:well-crafted`)
- [ ] `.env.test` file configured (optional)

---

## Quick Start (5 Minutes)

### 1. Install Everything
```bash
npm install
npm run playwright:install
```

### 2. Start Dev Server
```bash
# Terminal 1
npm run dev
```

### 3. Run Tests in UI Mode
```bash
# Terminal 2
npm run test:e2e:ui
```

The Playwright UI will open where you can:
- See all test files
- Run individual tests
- Watch tests execute live
- Inspect failures
- View screenshots and traces

---

## Test Execution Options

### Interactive Mode (Recommended for Development)

**Playwright UI - Best for debugging:**
```bash
npm run test:e2e:ui
```

Features:
- Visual test runner
- Watch mode
- Time travel debugging
- Inspect each step
- View screenshots/videos
- Pick-and-choose tests

### Headed Mode (See the Browser)

```bash
npm run test:e2e:headed
```

- Opens actual browser windows
- See tests execute in real-time
- Good for debugging visual issues
- Slower than headless

### Headless Mode (Fast, CI/CD)

```bash
npm run test:e2e
```

- Runs in background
- Fastest execution
- Good for CI/CD pipelines
- Generates reports

---

## Running Specific Test Suites

### By Workflow Category

```bash
# Customer management tests
npx playwright test tests/e2e/01-customer-workflows.spec.ts

# Order processing tests
npx playwright test tests/e2e/02-order-workflows.spec.ts

# Sample tracking tests
npx playwright test tests/e2e/03-sample-tracking.spec.ts

# Dashboard and CARLA tests
npx playwright test tests/e2e/04-dashboard-carla.spec.ts

# Operations and routes tests
npx playwright test tests/e2e/05-operations-routes.spec.ts
```

### By Test Type

```bash
# Performance tests only
npm run test:performance

# Security tests only
npm run test:security

# All E2E tests
npm run test:e2e
```

### By Browser

```bash
# Chrome only
npm run test:e2e:chrome

# Firefox only
npm run test:e2e:firefox

# Safari only
npm run test:e2e:safari

# All mobile devices
npm run test:e2e:mobile
```

---

## Running Individual Tests

### Single Test File
```bash
npx playwright test tests/e2e/01-customer-workflows.spec.ts
```

### Single Test Case
```bash
npx playwright test -g "should display customer list"
```

### Single Test in UI Mode
```bash
npm run test:e2e:ui
# Then click on specific test in the UI
```

---

## Viewing Test Results

### HTML Report (Auto-opens on failures)

```bash
npm run test:report
```

Shows:
- Pass/fail summary
- Test duration
- Screenshots of failures
- Video recordings
- Trace files

### Console Output

```bash
npm run test:e2e
```

Shows:
- Test names and status
- Error messages
- Stack traces
- Performance metrics

### JSON Results

```bash
# Results automatically saved to:
test-results/playwright-results.json
```

Good for:
- CI/CD integration
- Custom reporting
- Metrics tracking

---

## Debugging Failed Tests

### Method 1: Playwright UI (Easiest)

```bash
npm run test:e2e:ui
```

1. Click on failed test
2. See each step highlighted
3. Hover over steps to see screenshots
4. View console logs
5. Inspect network requests

### Method 2: Headed Mode

```bash
npm run test:e2e:headed
```

Watch the browser execute and see where it fails

### Method 3: Debug Mode

```bash
PWDEBUG=1 npx playwright test tests/e2e/01-customer-workflows.spec.ts
```

Opens Playwright Inspector:
- Step through tests line-by-line
- Pause execution
- Inspect elements
- View state

### Method 4: Screenshots & Videos

Failed tests automatically save:
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`
- Traces: `test-results/traces/`

View traces:
```bash
npx playwright show-trace test-results/trace.zip
```

---

## Test Data Management

### Seed Test Database

```bash
# Full dataset
npm run seed:well-crafted

# Portal demo data
npm run seed:portal-demo

# Activity types
npm run seed:activity-types
```

### Reset Database Between Tests

Tests should clean up after themselves, but if needed:

```bash
# Reset and re-seed
npx prisma migrate reset --force
npm run seed:well-crafted
```

---

## Environment Variables

### Create `.env.test` (Optional)

```bash
# Test user credentials
TEST_USER_EMAIL=test@wellcrafted.com
TEST_USER_PASSWORD=testpassword123

# Test URLs
BASE_URL=http://localhost:3000

# Database (if different from .env)
DATABASE_URL=postgresql://...

# API Keys for integration tests
ANTHROPIC_API_KEY=...
MAPBOX_ACCESS_TOKEN=...
```

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
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npm run playwright:install

      - name: Run tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

### Run Specific Browsers in CI

```yaml
- name: Run Chrome tests
  run: npm run test:e2e:chrome

- name: Run Firefox tests
  run: npm run test:e2e:firefox
```

---

## Performance Benchmarking

### Run with Performance Metrics

```bash
npm run test:performance
```

Measures:
- Page load times
- API response times
- Memory usage
- Bundle size
- Network conditions

### Set Performance Budget

Edit `playwright.config.ts`:

```typescript
expect(loadTime).toBeLessThan(2000); // 2 seconds
```

---

## Common Issues & Solutions

### Issue: Tests Fail to Find Elements

**Solution 1:** Check if server is running
```bash
# Verify dev server is on http://localhost:3000
curl http://localhost:3000
```

**Solution 2:** Increase timeout
```typescript
await page.waitForSelector('[data-testid="customer-row"]', { timeout: 10000 });
```

**Solution 3:** Check test selectors
- Use `data-testid` attributes (most reliable)
- Avoid text selectors (can change)
- Verify element actually exists in UI

### Issue: Authentication Fails

**Solution:** Check test credentials
```bash
# Verify user exists in database
npx prisma studio
# Look for test@wellcrafted.com
```

**Or recreate auth state:**
```bash
rm -rf .auth/
npm run test:e2e:ui
```

### Issue: Tests Timeout

**Solution 1:** Increase global timeout in `playwright.config.ts`
```typescript
timeout: 60000, // 60 seconds
```

**Solution 2:** Check database performance
```bash
# Verify database is responding
npm run prisma:studio
```

**Solution 3:** Reduce parallel workers
```typescript
workers: 1, // Run tests one at a time
```

### Issue: Flaky Tests

**Solution 1:** Add explicit waits
```typescript
await page.waitForLoadState('networkidle');
```

**Solution 2:** Enable retries
```typescript
retries: 2, // Retry failed tests twice
```

**Solution 3:** Use more specific selectors
```typescript
// Bad (can match multiple elements)
await page.click('button');

// Good (specific)
await page.click('button[data-testid="submit-button"]');
```

---

## Best Practices

### 1. Run Tests Locally First
Always run tests locally before pushing to CI/CD

### 2. Use UI Mode for Debugging
When a test fails, run it in UI mode to see what happened

### 3. Keep Tests Independent
Each test should work on its own, not depend on others

### 4. Clean Up Test Data
Tests should create and clean up their own data

### 5. Use Data Test IDs
Add `data-testid` attributes to important elements

```tsx
<button data-testid="submit-button">Submit</button>
```

### 6. Check Test Stability
Run tests multiple times to ensure they're not flaky

```bash
# Run same test 10 times
npx playwright test --repeat-each=10 tests/e2e/01-customer-workflows.spec.ts
```

---

## Test Execution Checklist

### Before Running Tests

- [ ] Dev server running
- [ ] Database seeded
- [ ] Playwright installed
- [ ] No other tests running
- [ ] Browser closed (for clean state)

### After Running Tests

- [ ] Review test report
- [ ] Check for new failures
- [ ] Document any bugs found
- [ ] Update test data if needed
- [ ] Commit test changes

---

## Getting Help

### Playwright Documentation
https://playwright.dev/docs/intro

### View Test Traces
```bash
npx playwright show-trace test-results/trace.zip
```

### Enable Verbose Logging
```bash
DEBUG=pw:api npx playwright test
```

### Check Playwright Version
```bash
npx playwright --version
```

### Update Playwright
```bash
npm install -D @playwright/test@latest playwright@latest
npx playwright install
```

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `npm run test:e2e:ui` | Open interactive test UI |
| `npm run test:e2e` | Run all E2E tests headless |
| `npm run test:e2e:headed` | Run tests with browser visible |
| `npm run test:performance` | Run performance tests only |
| `npm run test:security` | Run security tests only |
| `npm run test:all` | Run unit + E2E tests |
| `npm run test:report` | View HTML test report |
| `npm run playwright:install` | Install browser binaries |

---

**Happy Testing! 🧪**
