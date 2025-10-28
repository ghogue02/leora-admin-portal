/**
 * E2E Tests: Sample Management Workflows
 * Tests sample logging, tracking, and conversion
 */
import { test, expect, helpers } from './fixtures';

test.describe('Sample Management', () => {
  test('should log sample distribution', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/customers/1');

    // Open sample modal
    await authenticatedPage.click('button:has-text("Log Sample")');

    // Verify modal opened
    await expect(authenticatedPage.locator('[role="dialog"]')).toBeVisible();

    // Fill sample form
    await authenticatedPage.selectOption('select[name="productId"]', { index: 1 });
    await authenticatedPage.fill('input[name="quantity"]', '2');
    await authenticatedPage.fill('textarea[name="notes"]', 'E2E test sample distribution');

    // Submit
    await authenticatedPage.click('button:has-text("Log Sample")');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Sample logged');

    // Verify sample appears in activity timeline
    await expect(authenticatedPage.locator('text=E2E test sample distribution')).toBeVisible();
  });

  test('should track sample follow-up workflow', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/samples');

    // Filter pending samples
    await authenticatedPage.click('button:has-text("Pending Follow-up")');

    // Click first sample
    await authenticatedPage.click('[data-testid="sample-row"]:first-child');

    // Mark as followed up
    await authenticatedPage.click('button:has-text("Follow Up")');

    // Fill follow-up form
    await authenticatedPage.selectOption('select[name="outcome"]', 'INTERESTED');
    await authenticatedPage.fill('textarea[name="notes"]', 'Customer interested in ordering');

    // Submit
    await authenticatedPage.click('button:has-text("Save Follow-up")');

    // Verify status updated
    await expect(authenticatedPage.locator('[data-testid="sample-status"]'))
      .toContainText('Followed Up');
  });

  test('should convert sample to order', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/samples');

    // Find convertible sample
    await authenticatedPage.click('button:has-text("Ready to Convert")');

    // Click convert button
    await authenticatedPage.click('[data-testid="convert-sample-btn"]:first-child');

    // Verify cart modal
    await expect(authenticatedPage.locator('[role="dialog"]')).toBeVisible();
    await expect(authenticatedPage.locator('text=Convert Sample to Order')).toBeVisible();

    // Adjust quantity
    await authenticatedPage.fill('input[name="quantity"]', '12');

    // Add to cart
    await authenticatedPage.click('button:has-text("Add to Cart")');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Added to cart');

    // Verify cart updated
    await expect(authenticatedPage.locator('[data-testid="cart-badge"]')).toBeVisible();
  });

  test('should view sample analytics dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/samples/analytics');

    // Verify dashboard loaded
    await expect(authenticatedPage.locator('h1')).toContainText('Sample Analytics');

    // Verify key metrics displayed
    await expect(authenticatedPage.locator('[data-testid="conversion-rate"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="total-samples"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="pending-followups"]')).toBeVisible();

    // Verify charts rendered
    await expect(authenticatedPage.locator('[data-testid="conversion-chart"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="trend-chart"]')).toBeVisible();
  });

  test('should filter samples by date range', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/samples');

    // Open date filter
    await authenticatedPage.click('button:has-text("Date Range")');

    // Select last 30 days
    await authenticatedPage.click('button:has-text("Last 30 Days")');

    // Verify results filtered
    const samples = authenticatedPage.locator('[data-testid="sample-row"]');
    const count = await samples.count();
    expect(count).toBeGreaterThan(0);

    // Verify date range displayed
    await expect(authenticatedPage.locator('[data-testid="date-range-display"]'))
      .toBeVisible();
  });
});

test.describe('Sample Recommendations', () => {
  test('should display AI-powered sample recommendations', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/customers/1');

    // Open sample recommendations
    await authenticatedPage.click('button:has-text("Sample Recommendations")');

    // Verify recommendations modal
    await expect(authenticatedPage.locator('[role="dialog"]')).toBeVisible();
    await expect(authenticatedPage.locator('text=Recommended Products')).toBeVisible();

    // Verify recommendations loaded
    const recommendations = authenticatedPage.locator('[data-testid="recommendation-card"]');
    await expect(recommendations.first()).toBeVisible();

    // Click a recommendation
    await recommendations.first().click();

    // Verify product details shown
    await expect(authenticatedPage.locator('[data-testid="product-details"]')).toBeVisible();
  });

  test('should log sample from recommendation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/customers/1');

    // Open recommendations
    await authenticatedPage.click('button:has-text("Sample Recommendations")');

    // Log sample from first recommendation
    await authenticatedPage.click('[data-testid="log-sample-btn"]:first-child');

    // Fill quantity
    await authenticatedPage.fill('input[name="quantity"]', '1');

    // Submit
    await authenticatedPage.click('button:has-text("Log Sample")');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Sample logged');
  });
});

test.describe('Sample Budget Management', () => {
  test('should track sample budget usage', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/samples/budget');

    // Verify budget dashboard
    await expect(authenticatedPage.locator('h1')).toContainText('Sample Budget');

    // Verify budget metrics
    await expect(authenticatedPage.locator('[data-testid="total-budget"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="used-budget"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="remaining-budget"]')).toBeVisible();

    // Verify budget chart
    await expect(authenticatedPage.locator('[data-testid="budget-chart"]')).toBeVisible();
  });

  test('should warn when approaching budget limit', async ({ authenticatedPage }) => {
    // Note: This test assumes test data with budget near limit
    await authenticatedPage.goto('/sales/customers/1');

    // Try to log expensive sample
    await authenticatedPage.click('button:has-text("Log Sample")');
    await authenticatedPage.selectOption('select[name="productId"]', { index: 1 });
    await authenticatedPage.fill('input[name="quantity"]', '100');

    // Verify budget warning
    await expect(authenticatedPage.locator('[data-testid="budget-warning"]'))
      .toContainText('budget limit');
  });
});
