# Testing Setup Guide

## Overview

This project uses **Vitest** for testing with a separate test database to ensure isolation from development and production data.

## Prerequisites

1. **Node.js** 20+ installed
2. **Prisma** CLI installed
3. **Database** access configured

## Initial Setup

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Configure Test Environment

The test suite uses a separate SQLite database for isolation:

**File:** `vitest.setup.ts`
```typescript
process.env.DATABASE_URL = 'file:./test.db';
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Migrations (Optional)

For SQLite test database:
```bash
DATABASE_URL="file:./test.db" npx prisma migrate deploy
```

Or let tests create tables automatically via Prisma.

## Running Tests

### All Tests
```bash
npm run test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Specific Test File
```bash
npm run test src/lib/job-queue.test.ts
```

### With Coverage
```bash
npm run test -- --coverage
```

## Test Structure

```
web/
├── src/
│   ├── lib/
│   │   ├── job-queue.ts
│   │   ├── job-queue.test.ts          # 39 tests
│   │   ├── account-types.ts
│   │   └── account-types.test.ts      # 21 tests
│   └── app/
│       └── api/
│           ├── metrics/
│           │   └── definitions/
│           │       ├── route.ts
│           │       └── route.test.ts  # 16 tests
│           └── dashboard/
│               └── widgets/
│                   ├── route.ts
│                   └── route.test.ts  # 22 tests
├── vitest.config.ts                   # Vitest configuration
├── vitest.setup.ts                    # Test environment setup
└── test.db                            # SQLite test database
```

## Test Database Strategy

### SQLite for Tests
- **Fast:** In-memory or file-based
- **Isolated:** Separate from dev/prod
- **Portable:** No external dependencies

### Setup Pattern
```typescript
beforeEach(async () => {
  // Create isolated tenant for test
  const tenant = await prisma.tenant.create({ ... });
  testTenantId = tenant.id;
});

afterEach(async () => {
  // Clean up test data
  await prisma.records.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: testTenantId } });
});
```

## Environment Variables

### Development
```bash
# .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/leora_dev"
```

### Test
```bash
# Set in vitest.setup.ts
DATABASE_URL="file:./test.db"
```

### Production
```bash
# .env.production
DATABASE_URL="<production-database-url>"
```

## Common Issues

### Issue: "Environment variable not found: DATABASE_URL"
**Solution:** Ensure `vitest.setup.ts` is configured in `vitest.config.ts`:
```typescript
setupFiles: ["./vitest.setup.ts"]
```

### Issue: Tests timeout
**Solution:** Increase timeout in `vitest.config.ts`:
```typescript
test: {
  testTimeout: 30000 // 30 seconds
}
```

### Issue: Database lock errors
**Solution:** Run tests sequentially:
```bash
npm run test -- --no-threads
```

### Issue: Prisma client not generated
**Solution:** Generate client:
```bash
npx prisma generate
```

## Mocking Strategy

### Authentication
```typescript
vi.mock('@/lib/auth/admin', () => ({
  withAdminSession: (request, callback) => {
    return callback({ tenantId, user, db: prisma });
  }
}));
```

### External APIs
```typescript
vi.mock('./image-extraction', () => ({
  extractBusinessCard: vi.fn().mockResolvedValue({ ... })
}));
```

### Database
- **NOT mocked** - Uses real Prisma client with isolated test data
- Ensures database constraints and relationships work correctly

## Coverage Targets

- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install
        working-directory: ./web

      - name: Generate Prisma Client
        run: npx prisma generate
        working-directory: ./web

      - name: Run tests
        run: npm run test
        working-directory: ./web

      - name: Generate coverage
        run: npm run test -- --coverage
        working-directory: ./web

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Next Steps

1. ✅ Tests are created and documented
2. 🔄 Configure test database (use SQLite or separate PostgreSQL)
3. 🔄 Add to CI/CD pipeline
4. 🔄 Set up code coverage reporting
5. 🔄 Add E2E tests with Playwright

## Reference

- **Full Report:** See `docs/phase1-testing-report.md`
- **Quick Reference:** See `docs/TESTING_QUICK_REFERENCE.md`
- **Vitest Docs:** https://vitest.dev
- **Prisma Testing:** https://www.prisma.io/docs/guides/testing
