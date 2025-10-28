/**
 * Authentication setup for Playwright tests
 * This file handles login state that can be reused across tests
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/');

  // Fill in login form
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@wellcrafted.com');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/sales/dashboard');

  // Verify we're logged in
  await expect(page.locator('nav')).toBeVisible();

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
