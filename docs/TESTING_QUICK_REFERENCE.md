# Testing Quick Reference Guide

## Running Tests

```bash
# Run all tests
npm run test

# Run in watch mode (for development)
npm run test:watch

# Run specific test file
npm run test src/lib/job-queue.test.ts

# Generate coverage report
npm run test -- --coverage
```

## Test Files Overview

| Test File | Feature Area | Test Count | Priority |
|-----------|-------------|------------|----------|
| `src/lib/job-queue.test.ts` | Job Queue Processing | 39 | High |
| `src/app/api/metrics/definitions/route.test.ts` | Metrics API | 16 | High |
| `src/app/api/dashboard/widgets/route.test.ts` | Widgets API | 22 | High |
| `src/lib/account-types.test.ts` | Account Classification | 21 | Medium |

**Total:** 98 test cases

## What's Tested

### ✅ Job Queue (`job-queue.test.ts`)
- Job enqueueing with different types
- FIFO processing order
- Retry logic (max 3 attempts)
- Success and failure handling
- Image extraction (business cards, licenses)
- Job cleanup (old completed/failed jobs)

### ✅ Metrics API (`metrics/definitions/route.test.ts`)
- GET with pagination, filtering, search
- POST with versioning
- Request validation
- Error handling (400, 409, 500)
- Formula storage as JSON

### ✅ Widgets API (`dashboard/widgets/route.test.ts`)
- GET with user filtering
- POST with position management
- Duplicate prevention
- Widget visibility
- Multi-user isolation
- All 10 widget types

### ✅ Account Types (`account-types.test.ts`)
- ACTIVE classification (< 6 months)
- TARGET classification (6-12 months)
- PROSPECT classification (> 12 months)
- State transitions
- Boundary conditions
- Bulk and single updates

## Expected Results

All tests should pass:

```
Test Files: 4 passed (4)
Tests: 98 passed (98)
Duration: ~15-30s
```

## Troubleshooting

### Tests Fail on First Run
**Solution:** Ensure database is properly initialized
```bash
npx prisma generate
npx prisma migrate deploy
```

### Timeout Errors
**Solution:** Increase timeout in `vitest.config.ts`
```typescript
test: {
  testTimeout: 30000 // 30 seconds
}
```

### Database Lock Errors
**Solution:** Tests are running concurrently on same DB
```bash
# Run tests sequentially
npm run test -- --no-threads
```

## CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Run Tests
  run: npm run test

- name: Generate Coverage
  run: npm run test -- --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Test Maintenance

- **Add tests** when creating new features
- **Update mocks** when external APIs change
- **Review date tests** monthly (account-types.test.ts)
- **Check coverage** before each PR

## Quick Test Commands

```bash
# Test a specific feature
npm run test job-queue
npm run test metrics
npm run test widgets
npm run test account

# Test with debug output
npm run test -- --reporter=verbose

# Test only changed files
npm run test -- --changed
```
