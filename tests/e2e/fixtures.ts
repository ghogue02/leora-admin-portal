/**
 * Custom Playwright fixtures for Leora CRM testing
 */
import { test as base, expect } from '@playwright/test';
import path from 'path';

type CustomFixtures = {
  authenticatedPage: any;
};

export const test = base.extend<CustomFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '../../.auth/user.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

/**
 * Helper functions for common operations
 */
export const helpers = {
  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(page: any) {
    await page.waitForLoadState('networkidle');
  },

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(page: any, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  },

  /**
   * Log to console with test context
   */
  log(context: string, message: string) {
    console.log(`[${context}] ${message}`);
  },

  /**
   * Generate random test data
   */
  randomString(length: number = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  },

  /**
   * Format currency for assertions
   */
  formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  },
};
