# CARLA Testing Suite

Comprehensive integration tests for CARLA (Call Routing and Logistics Application).

## Quick Start

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/integration/call-plans-route.test.ts

# Watch mode
npm test:watch

# Coverage report
npm test -- --coverage
```

## Test Structure

```
tests/
├── integration/              # Integration tests
│   ├── call-plans-route.test.ts           # 25 tests
│   ├── call-plan-accounts-route.test.ts   # 18 tests
│   ├── calendar-sync.test.ts              # 15 tests
│   ├── voice-recorder.test.tsx            # 12 tests
│   ├── bulk-categorization.test.ts        # 15 tests
│   ├── export-call-plan.test.ts           # 18 tests
│   └── outcomes-tracking.test.ts          # 12 tests
├── mocks/                    # External API mocks
│   ├── google-calendar.ts   # Google Calendar API mock
│   ├── outlook-graph.ts     # Microsoft Graph API mock
│   └── web-speech.ts        # Web Speech API mock
└── README.md                # This file

docs/
└── phase2-testing-report.md  # Comprehensive testing report
```

## Test Coverage

| Feature Area | Test Cases | Status |
|--------------|------------|--------|
| Call Plans CRUD | 25 | ✅ |
| Account Management | 18 | ✅ |
| Calendar Sync | 15 | ✅ |
| Voice Recording | 12 | ✅ |
| Bulk Operations | 15 | ✅ |
| Export Functionality | 18 | ✅ |
| Outcomes Tracking | 12 | ✅ |
| **TOTAL** | **115** | ✅ |

## Phase 2 Features Tested

### 1. Weekly Call Planning
- Create/read/update/delete call plans
- 75-account limit enforcement
- Week-based filtering
- Multi-user isolation

### 2. Account Management
- Add/remove accounts from plans
- Update objectives and priorities
- Record outcomes (X/Y/Blank)
- Bulk operations

### 3. Calendar Integration
- Google Calendar sync
- Outlook Calendar sync
- Event CRUD operations
- Token refresh handling

### 4. Voice Recording
- Speech-to-text transcription
- Objective recording
- Outcome notes recording
- Microphone permission handling

### 5. Bulk Operations
- Bulk customer categorization
- Revenue-based rules
- Activity-based rules
- Dry-run mode

### 6. Export Functionality
- CSV export
- Excel export
- PDF export
- JSON export with statistics

### 7. Outcomes Tracking
- X (Met Objective)
- Y (Progress Made)
- Blank (Not Completed)
- Analytics and trends

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm test tests/integration/call-plans-route.test.ts
```

### Watch Mode
```bash
npm test:watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Specific Test Case
```bash
npm test -- -t "should create weekly call plan"
```

## Writing Tests

### Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it('should do something', async () => {
    // Arrange
    const testData = {...};

    // Act
    const result = await someFunction(testData);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Using Mocks
```typescript
import { createMockGoogleCalendar } from '@/tests/mocks/google-calendar';

const mockCalendar = createMockGoogleCalendar();

vi.mock('googleapis', () => ({
  google: {
    calendar: () => mockCalendar
  }
}));
```

## Test Data Patterns

### Call Plan
```typescript
{
  weekStartDate: new Date('2025-10-20'),
  weekEndDate: new Date('2025-10-26'),
  status: 'active',
  accountsCount: 3
}
```

### Account
```typescript
{
  accountId: 'account-1',
  accountName: 'High Value Account',
  priority: 1,
  objective: 'Discuss Q4 promotion',
  outcome: 'X',
  outcomeNotes: 'Secured 25-case order'
}
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

### CI Configuration
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage
```

## Troubleshooting

### Database Connection Errors
```bash
# Ensure Prisma is set up
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### Mock Not Working
```bash
# Clear mock cache
vi.clearAllMocks()

# Reset all mocks
vi.resetAllMocks()
```

### Test Timeout
```typescript
// Increase timeout for specific test
it('should handle long operation', async () => {
  // ...
}, { timeout: 10000 }); // 10 seconds
```

## Documentation

- **Testing Report:** `/docs/phase2-testing-report.md`
- **API Docs:** `/docs/api-documentation.md`
- **Database Schema:** `/docs/database-schema.md`

## Contributing

When adding new tests:
1. Follow existing test patterns
2. Include beforeEach/afterEach cleanup
3. Mock external APIs
4. Add test case to coverage report
5. Update this README if needed

## Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up test data
3. **Mocking:** Mock external dependencies
4. **Descriptive:** Use clear test names
5. **Coverage:** Aim for 90%+ coverage
6. **Fast:** Keep tests under 100ms each
7. **Deterministic:** Tests should always produce same result

## Contact

For questions about testing:
- Check `/docs/phase2-testing-report.md`
- Review existing test files for patterns
- Ask team for clarification

---

**Last Updated:** 2025-10-25
**Total Tests:** 115
**Framework:** Vitest 2.1.9
**Status:** ✅ All Passing
