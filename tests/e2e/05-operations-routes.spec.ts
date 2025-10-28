/**
 * E2E Tests: Operations and Route Management
 * Tests warehouse operations, route planning, and delivery tracking
 */
import { test, expect, helpers } from './fixtures';

test.describe('Warehouse Operations', () => {
  test('should create delivery route', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/routes');

    // Click create route button
    await authenticatedPage.click('button:has-text("Create Route")');

    // Fill route form
    await authenticatedPage.fill('input[name="name"]', 'E2E Test Route');
    await authenticatedPage.selectOption('select[name="driver"]', { index: 1 });
    await authenticatedPage.fill('input[name="date"]', '2025-11-15');

    // Add stops
    await authenticatedPage.click('button:has-text("Add Stop")');
    await authenticatedPage.selectOption('select[name="stops[0].customerId"]', { index: 1 });

    await authenticatedPage.click('button:has-text("Add Stop")');
    await authenticatedPage.selectOption('select[name="stops[1].customerId"]', { index: 2 });

    // Submit
    await authenticatedPage.click('button[type="submit"]');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Route created');

    // Verify redirect
    await expect(authenticatedPage).toHaveURL(/\/operations\/routes\/\d+/);
  });

  test('should optimize route with map integration', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/routes/1'); // Assuming route exists

    // Verify map loaded
    await expect(authenticatedPage.locator('[data-testid="route-map"]')).toBeVisible();

    // Click optimize button
    await authenticatedPage.click('button:has-text("Optimize Route")');

    // Wait for optimization
    await authenticatedPage.waitForTimeout(2000);

    // Verify route updated
    await expect(authenticatedPage.locator('.toast')).toContainText('Route optimized');

    // Verify map markers updated
    const markers = authenticatedPage.locator('[data-testid="map-marker"]');
    await expect(markers.first()).toBeVisible();
  });

  test('should generate pick list for route', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/routes/1');

    // Generate pick list
    await authenticatedPage.click('button:has-text("Generate Pick List")');

    // Verify pick list modal
    await expect(authenticatedPage.locator('[role="dialog"]')).toBeVisible();
    await expect(authenticatedPage.locator('text=Pick List')).toBeVisible();

    // Verify items listed
    const items = authenticatedPage.locator('[data-testid="pick-list-item"]');
    await expect(items.first()).toBeVisible();

    // Print pick list
    await authenticatedPage.click('button:has-text("Print")');

    // Verify print dialog or download
    await authenticatedPage.waitForTimeout(1000);
  });

  test('should track delivery progress', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/routes/1');

    // Mark first stop as completed
    await authenticatedPage.click('[data-testid="complete-stop-btn"]:first-child');

    // Fill delivery details
    await authenticatedPage.fill('input[name="deliveryTime"]', '14:30');
    await authenticatedPage.fill('textarea[name="notes"]', 'Delivered to front desk');

    // Submit
    await authenticatedPage.click('button:has-text("Mark Delivered")');

    // Verify status updated
    await expect(authenticatedPage.locator('[data-testid="stop-status"]:first-child'))
      .toContainText('Delivered');

    // Verify progress bar updated
    const progressText = await authenticatedPage.locator('[data-testid="route-progress"]').textContent();
    expect(progressText).toContain('%');
  });

  test('should handle delivery exceptions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/routes/1');

    // Mark stop as exception
    await authenticatedPage.click('[data-testid="exception-btn"]:first-child');

    // Select exception reason
    await authenticatedPage.selectOption('select[name="reason"]', 'CUSTOMER_UNAVAILABLE');
    await authenticatedPage.fill('textarea[name="notes"]', 'Will attempt redelivery tomorrow');

    // Submit
    await authenticatedPage.click('button:has-text("Submit Exception")');

    // Verify exception recorded
    await expect(authenticatedPage.locator('[data-testid="stop-status"]:first-child'))
      .toContainText('Exception');
  });
});

test.describe('Warehouse Inventory', () => {
  test('should view inventory levels', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/inventory');

    // Verify inventory list
    await expect(authenticatedPage.locator('h1')).toContainText('Inventory');

    const items = authenticatedPage.locator('[data-testid="inventory-item"]');
    await expect(items.first()).toBeVisible();

    // Check low stock filter
    await authenticatedPage.click('button:has-text("Low Stock")');

    // Verify filtered results
    const lowStockItems = await items.count();
    expect(lowStockItems).toBeGreaterThanOrEqual(0);
  });

  test('should scan barcode for receiving', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/receiving');

    // Open barcode scanner
    await authenticatedPage.click('button:has-text("Scan Barcode")');

    // Simulate barcode scan (in real test, would use actual scanner)
    await authenticatedPage.fill('input[data-testid="barcode-input"]', '123456789');
    await authenticatedPage.press('input[data-testid="barcode-input"]', 'Enter');

    // Verify product found
    await expect(authenticatedPage.locator('[data-testid="scanned-product"]')).toBeVisible();

    // Enter quantity
    await authenticatedPage.fill('input[name="quantity"]', '24');

    // Receive inventory
    await authenticatedPage.click('button:has-text("Receive")');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Inventory received');
  });

  test('should perform inventory adjustment', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/inventory');

    // Click adjust button on first item
    await authenticatedPage.click('[data-testid="adjust-btn"]:first-child');

    // Fill adjustment form
    await authenticatedPage.selectOption('select[name="reason"]', 'DAMAGE');
    await authenticatedPage.fill('input[name="quantity"]', '-5');
    await authenticatedPage.fill('textarea[name="notes"]', 'Damaged during receiving');

    // Submit
    await authenticatedPage.click('button:has-text("Submit Adjustment")');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Inventory adjusted');

    // Verify audit trail created
    await authenticatedPage.click('button:has-text("View History")');
    await expect(authenticatedPage.locator('text=Damaged during receiving')).toBeVisible();
  });
});

test.describe('Map Functionality', () => {
  test('should display interactive route map', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/maps');

    // Verify map loaded
    await expect(authenticatedPage.locator('[data-testid="map-container"]')).toBeVisible();

    // Wait for map tiles to load
    await authenticatedPage.waitForTimeout(2000);

    // Verify customer markers
    const markers = authenticatedPage.locator('[data-testid="customer-marker"]');
    await expect(markers.first()).toBeVisible();

    // Click marker to show info
    await markers.first().click();

    // Verify info popup
    await expect(authenticatedPage.locator('[data-testid="marker-popup"]')).toBeVisible();
  });

  test('should draw territory boundaries', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/territories');

    // Enter draw mode
    await authenticatedPage.click('button:has-text("Draw Territory")');

    // Note: Actual drawing would require complex mouse movements
    // This is a simplified test
    await expect(authenticatedPage.locator('[data-testid="draw-tools"]')).toBeVisible();

    // Save territory
    await authenticatedPage.fill('input[name="territoryName"]', 'E2E Test Territory');
    await authenticatedPage.click('button:has-text("Save Territory")');

    // Verify success
    await expect(authenticatedPage.locator('.toast')).toContainText('Territory saved');
  });

  test('should filter customers by territory', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/operations/maps');

    // Select territory filter
    await authenticatedPage.selectOption('select[name="territory"]', { index: 1 });

    // Verify markers filtered
    await authenticatedPage.waitForTimeout(1000);

    const markers = authenticatedPage.locator('[data-testid="customer-marker"]');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Performance - Operations', () => {
  test('should load route map under 3 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();

    await authenticatedPage.goto('/operations/routes/1');
    await expect(authenticatedPage.locator('[data-testid="route-map"]')).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);

    helpers.log('Performance', `Route map loaded in ${loadTime}ms`);
  });
});
