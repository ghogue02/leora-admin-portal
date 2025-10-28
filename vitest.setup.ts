/**
 * Vitest Setup File
 * Configures test environment and database
 */

import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
beforeAll(() => {
  // Use test database URL (SQLite for tests)
  process.env.DATABASE_URL = 'file:./test.db';

  // Disable other environment checks
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup can go here
});
