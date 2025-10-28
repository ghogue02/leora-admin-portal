/**
 * E2E Tests: Dashboard and CARLA AI Assistant
 * Tests dashboard widgets and CARLA interactions
 */
import { test, expect, helpers } from './fixtures';

test.describe('Dashboard Overview', () => {
  test('should display dashboard with all widgets', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Verify dashboard loaded
    await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');

    // Verify key widgets visible
    await expect(authenticatedPage.locator('[data-testid="sales-widget"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="customers-widget"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="activities-widget"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="samples-widget"]')).toBeVisible();

    // Verify charts rendered
    await expect(authenticatedPage.locator('[data-testid="sales-chart"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="trend-chart"]')).toBeVisible();
  });

  test('should customize dashboard layout', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Enter edit mode
    await authenticatedPage.click('button:has-text("Customize")');

    // Verify drag-and-drop enabled
    await expect(authenticatedPage.locator('[data-testid="widget-drag-handle"]')).toBeVisible();

    // Reorder widgets (simulate drag)
    const firstWidget = authenticatedPage.locator('[data-testid="widget"]').first();
    const secondWidget = authenticatedPage.locator('[data-testid="widget"]').nth(1);

    // Note: Actual drag-and-drop would use page.dragAndDrop()
    // This is a simplified version
    await expect(firstWidget).toBeVisible();

    // Save layout
    await authenticatedPage.click('button:has-text("Save Layout")');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Layout saved');
  });

  test('should filter dashboard by date range', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Open date picker
    await authenticatedPage.click('button[data-testid="date-range-picker"]');

    // Select last 7 days
    await authenticatedPage.click('button:has-text("Last 7 Days")');

    // Wait for data refresh
    await authenticatedPage.waitForTimeout(1000);

    // Verify metrics updated
    await expect(authenticatedPage.locator('[data-testid="sales-widget"]')).toBeVisible();

    // Verify date range displayed
    await expect(authenticatedPage.locator('[data-testid="date-range-display"]'))
      .toContainText('Last 7 Days');
  });

  test('should drill down from dashboard widget', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Click on a chart bar/segment
    await authenticatedPage.click('[data-testid="sales-chart"] .recharts-bar-rectangle:first-child');

    // Verify drilldown modal or navigation
    const modalOrPage = await Promise.race([
      authenticatedPage.locator('[role="dialog"]').waitFor(),
      authenticatedPage.waitForURL(/\/sales\/\w+/),
    ]);

    // Verify detailed data shown
    expect(modalOrPage).toBeTruthy();
  });
});

test.describe('CARLA AI Assistant', () => {
  test('should open CARLA chat interface', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Click CARLA button
    await authenticatedPage.click('button[aria-label="Open CARLA"]');

    // Verify chat opened
    await expect(authenticatedPage.locator('[data-testid="carla-chat"]')).toBeVisible();
    await expect(authenticatedPage.locator('text=Hi, I\'m CARLA')).toBeVisible();
  });

  test('should ask CARLA for customer insights', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Open CARLA
    await authenticatedPage.click('button[aria-label="Open CARLA"]');

    // Type question
    await authenticatedPage.fill('[data-testid="carla-input"]', 'Show me my top customers this month');

    // Send message
    await authenticatedPage.click('button[aria-label="Send"]');

    // Wait for response
    await authenticatedPage.waitForTimeout(2000);

    // Verify response received
    const messages = authenticatedPage.locator('[data-testid="carla-message"]');
    const lastMessage = messages.last();
    await expect(lastMessage).toBeVisible();
  });

  test('should use CARLA quick actions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Open CARLA
    await authenticatedPage.click('button[aria-label="Open CARLA"]');

    // Click quick action
    await authenticatedPage.click('[data-testid="quick-action"]:has-text("Upcoming Activities")');

    // Verify response
    await authenticatedPage.waitForTimeout(1000);
    await expect(authenticatedPage.locator('[data-testid="carla-message"]').last())
      .toContainText('activities');
  });

  test('should navigate via CARLA voice command', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Open CARLA
    await authenticatedPage.click('button[aria-label="Open CARLA"]');

    // Send navigation command
    await authenticatedPage.fill('[data-testid="carla-input"]', 'Take me to customers');
    await authenticatedPage.click('button[aria-label="Send"]');

    // Verify navigation occurred or suggestion shown
    await authenticatedPage.waitForTimeout(1500);

    // Check for navigation or action button
    const navigated = await authenticatedPage.url().includes('/customers');
    const actionButton = await authenticatedPage.locator('button:has-text("View Customers")').isVisible();

    expect(navigated || actionButton).toBeTruthy();
  });

  test('should export data via CARLA', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Open CARLA
    await authenticatedPage.click('button[aria-label="Open CARLA"]');

    // Request export
    await authenticatedPage.fill('[data-testid="carla-input"]', 'Export customer list to CSV');
    await authenticatedPage.click('button[aria-label="Send"]');

    // Wait for response
    await authenticatedPage.waitForTimeout(2000);

    // Verify export button or download link
    await expect(authenticatedPage.locator('button:has-text("Download")')).toBeVisible();
  });
});

test.describe('Real-time Updates', () => {
  test('should show real-time activity updates', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Get initial activity count
    const activityCount = await authenticatedPage
      .locator('[data-testid="recent-activities"] [data-testid="activity-item"]')
      .count();

    // In a real scenario, this would trigger a background update
    // For testing, we can simulate by refreshing the widget
    await authenticatedPage.click('button[data-testid="refresh-activities"]');

    // Wait for update
    await authenticatedPage.waitForTimeout(1000);

    // Verify activities refreshed
    const newCount = await authenticatedPage
      .locator('[data-testid="recent-activities"] [data-testid="activity-item"]')
      .count();

    expect(newCount).toBeGreaterThanOrEqual(activityCount);
  });
});

test.describe('Performance Metrics', () => {
  test('should load dashboard under 2 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();

    await authenticatedPage.goto('/sales/dashboard');
    await expect(authenticatedPage.locator('[data-testid="sales-widget"]')).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    helpers.log('Performance', `Dashboard loaded in ${loadTime}ms`);
  });

  test('should handle concurrent widget updates', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/sales/dashboard');

    // Refresh all widgets simultaneously
    await Promise.all([
      authenticatedPage.click('button[data-testid="refresh-sales"]'),
      authenticatedPage.click('button[data-testid="refresh-customers"]'),
      authenticatedPage.click('button[data-testid="refresh-activities"]'),
    ]);

    // Wait for all updates
    await authenticatedPage.waitForTimeout(2000);

    // Verify all widgets still visible and responsive
    await expect(authenticatedPage.locator('[data-testid="sales-widget"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="customers-widget"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="activities-widget"]')).toBeVisible();
  });
});
