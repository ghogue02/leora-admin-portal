/**
 * E2E Tests: Customer Management Workflows
 * Tests critical customer-related user journeys
 */
import { test, expect, helpers } from './fixtures';

test.describe('Customer Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/customers');
    await helpers.waitForNetworkIdle(authenticatedPage);
  });

  test('should display customer list with search and filters', async ({ authenticatedPage }) => {
    // Verify page loaded
    await expect(authenticatedPage.locator('h1')).toContainText('Customers');

    // Check customer list is visible
    const customerRows = authenticatedPage.locator('[data-testid="customer-row"]');
    await expect(customerRows.first()).toBeVisible();

    // Test search functionality
    await authenticatedPage.fill('input[placeholder*="Search"]', 'Well');
    await authenticatedPage.waitForTimeout(500); // Debounce

    const searchResults = await customerRows.count();
    expect(searchResults).toBeGreaterThan(0);
  });

  test('should navigate to customer detail and log activity', async ({ authenticatedPage }) => {
    // Click first customer
    await authenticatedPage.click('[data-testid="customer-row"]:first-child');

    // Verify detail page loaded
    await expect(authenticatedPage).toHaveURL(/\/sales\/customers\/\d+/);
    await expect(authenticatedPage.locator('h1')).toBeVisible();

    // Open activity log modal
    await authenticatedPage.click('button:has-text("Log Activity")');

    // Fill activity form
    await authenticatedPage.selectOption('select[name="type"]', 'VISIT');
    await authenticatedPage.fill('textarea[name="notes"]', 'E2E test visit note');

    // Submit activity
    await authenticatedPage.click('button[type="submit"]');

    // Verify toast notification
    await expect(authenticatedPage.locator('.toast')).toContainText('Activity logged');

    // Verify activity appears in timeline
    await expect(authenticatedPage.locator('text=E2E test visit note')).toBeVisible();
  });

  test('should filter customers by health score', async ({ authenticatedPage }) => {
    // Open filters
    await authenticatedPage.click('button:has-text("Filters")');

    // Select health filter
    await authenticatedPage.click('input[value="at-risk"]');
    await authenticatedPage.click('button:has-text("Apply")');

    // Verify filtered results
    const healthBadges = authenticatedPage.locator('[data-testid="health-badge"]');
    const count = await healthBadges.count();

    for (let i = 0; i < count; i++) {
      const badge = healthBadges.nth(i);
      await expect(badge).toHaveClass(/at-risk/);
    }
  });

  test('should load customer detail page under 2 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();

    // Navigate to customer detail
    await authenticatedPage.click('[data-testid="customer-row"]:first-child');
    await expect(authenticatedPage.locator('h1')).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    helpers.log('Performance', `Customer detail loaded in ${loadTime}ms`);
  });

  test('should handle customer with large activity history', async ({ authenticatedPage }) => {
    // Navigate to customer with many activities
    await authenticatedPage.goto('/sales/customers/1'); // Assuming ID 1 has lots of data

    // Verify activity timeline loads
    const activities = authenticatedPage.locator('[data-testid="activity-item"]');
    const count = await activities.count();

    expect(count).toBeGreaterThan(0);

    // Test infinite scroll / pagination
    if (count >= 10) {
      await authenticatedPage.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for more activities to load
      await authenticatedPage.waitForTimeout(1000);
    }
  });
});

test.describe('Customer Interactions', () => {
  test('should create call plan with selected accounts', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/customers');

    // Select multiple customers
    const checkboxes = authenticatedPage.locator('[data-testid="customer-checkbox"]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();

    // Create call plan
    await authenticatedPage.click('button:has-text("Create Call Plan")');

    // Fill call plan form
    await authenticatedPage.fill('input[name="name"]', 'E2E Test Call Plan');
    await authenticatedPage.selectOption('select[name="frequency"]', 'WEEKLY');

    // Submit
    await authenticatedPage.click('button[type="submit"]');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Call plan created');

    // Verify redirect to call plan page
    await expect(authenticatedPage).toHaveURL(/\/sales\/call-plans/);
  });

  test('should mark customer as contacted from call plan', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/call-plans');

    // Click first call plan
    await authenticatedPage.click('[data-testid="call-plan-row"]:first-child');

    // Mark first account as contacted
    await authenticatedPage.click('[data-testid="contact-button"]:first-child');

    // Fill contact form
    await authenticatedPage.selectOption('select[name="outcome"]', 'CONNECTED');
    await authenticatedPage.fill('textarea[name="notes"]', 'Discussed new products');

    // Submit
    await authenticatedPage.click('button:has-text("Save Contact")');

    // Verify status updated
    await expect(authenticatedPage.locator('[data-testid="account-status"]:first-child'))
      .toContainText('Contacted');
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile-friendly customer list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/customers');

    // Verify mobile layout
    const customerCards = authenticatedPage.locator('[data-testid="customer-card"]');
    await expect(customerCards.first()).toBeVisible();

    // Test mobile navigation
    await authenticatedPage.click('button[aria-label="Menu"]');
    await expect(authenticatedPage.locator('nav[role="navigation"]')).toBeVisible();
  });
});
