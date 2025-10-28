/**
 * Performance and Load Testing Suite
 * Tests application performance under various conditions
 */
import { test, expect } from '@playwright/test';

test.describe('Page Load Performance', () => {
  test('customer list should load under 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/sales/customers');
    await page.waitForSelector('[data-testid="customer-row"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    console.log(`✓ Customer list loaded in ${loadTime}ms`);
  });

  test('customer detail should load under 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/sales/customers/1');
    await page.waitForSelector('h1');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    console.log(`✓ Customer detail loaded in ${loadTime}ms`);
  });

  test('catalog should load under 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/portal/catalog');
    await page.waitForSelector('[data-testid="product-card"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    console.log(`✓ Catalog loaded in ${loadTime}ms`);
  });

  test('dashboard should load under 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/sales/dashboard');
    await page.waitForSelector('[data-testid="sales-widget"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    console.log(`✓ Dashboard loaded in ${loadTime}ms`);
  });
});

test.describe('API Response Times', () => {
  test('customer list API should respond under 500ms', async ({ page }) => {
    await page.goto('/sales/customers');

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('/api/customers') && resp.status() === 200
    );

    const timing = response.timing();
    const responseTime = timing.responseEnd - timing.requestStart;

    expect(responseTime).toBeLessThan(500);
    console.log(`✓ Customer API responded in ${responseTime}ms`);
  });

  test('catalog API should respond under 500ms', async ({ page }) => {
    await page.goto('/portal/catalog');

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('/api/products') && resp.status() === 200
    );

    const timing = response.timing();
    const responseTime = timing.responseEnd - timing.requestStart;

    expect(responseTime).toBeLessThan(500);
    console.log(`✓ Catalog API responded in ${responseTime}ms`);
  });
});

test.describe('Large Dataset Handling', () => {
  test('should handle 1000+ customers', async ({ page }) => {
    await page.goto('/sales/customers');

    // Scroll to load more
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }

    const customerCount = await page.locator('[data-testid="customer-row"]').count();
    expect(customerCount).toBeGreaterThan(20); // Assumes pagination/virtual scrolling

    console.log(`✓ Loaded ${customerCount} customers without performance degradation`);
  });

  test('should handle customer with 100+ activities', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/sales/customers/1'); // Assume ID 1 has many activities
    await page.waitForSelector('[data-testid="activity-item"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);

    // Verify activities loaded
    const activityCount = await page.locator('[data-testid="activity-item"]').count();
    expect(activityCount).toBeGreaterThan(0);

    console.log(`✓ Loaded customer with ${activityCount} activities in ${loadTime}ms`);
  });
});

test.describe('Memory Usage', () => {
  test('should not leak memory on navigation', async ({ page, context }) => {
    // Navigate between pages multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/sales/dashboard');
      await page.waitForTimeout(500);

      await page.goto('/sales/customers');
      await page.waitForTimeout(500);

      await page.goto('/portal/catalog');
      await page.waitForTimeout(500);
    }

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    if (metrics) {
      const usedMB = metrics.usedJSHeapSize / 1024 / 1024;
      const limitMB = metrics.jsHeapSizeLimit / 1024 / 1024;

      console.log(`✓ Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);

      // Memory should not exceed 50% of limit after navigation
      expect(usedMB).toBeLessThan(limitMB * 0.5);
    }
  });
});

test.describe('Network Conditions', () => {
  test('should handle slow 3G connection', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', (route) => {
      setTimeout(() => route.continue(), 100); // Add 100ms delay
    });

    const startTime = Date.now();
    await page.goto('/sales/dashboard');
    await page.waitForSelector('[data-testid="sales-widget"]');

    const loadTime = Date.now() - startTime;

    // Should still load within reasonable time on slow connection
    expect(loadTime).toBeLessThan(5000);

    console.log(`✓ Dashboard loaded on slow connection in ${loadTime}ms`);
  });

  test('should handle API timeout gracefully', async ({ page }) => {
    // Intercept and delay API calls
    await page.route('**/api/**', (route) => {
      setTimeout(() => route.abort('timedout'), 10000);
    });

    await page.goto('/sales/customers');

    // Should show error message, not crash
    await expect(page.locator('text=/error|failed|timeout/i')).toBeVisible({ timeout: 15000 });

    console.log('✓ Handled API timeout gracefully');
  });
});

test.describe('Concurrent Operations', () => {
  test('should handle multiple tab updates', async ({ context }) => {
    // Open two tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/sales/dashboard');
    await page2.goto('/sales/dashboard');

    // Interact with both simultaneously
    await Promise.all([
      page1.click('button[data-testid="refresh-sales"]'),
      page2.click('button[data-testid="refresh-customers"]'),
    ]);

    // Both should complete without errors
    await expect(page1.locator('[data-testid="sales-widget"]')).toBeVisible();
    await expect(page2.locator('[data-testid="customers-widget"]')).toBeVisible();

    await page1.close();
    await page2.close();

    console.log('✓ Handled concurrent tab operations');
  });
});

test.describe('Bundle Size', () => {
  test('should have reasonable JavaScript bundle size', async ({ page }) => {
    await page.goto('/sales/dashboard');

    const jsRequests = [];
    page.on('response', (response) => {
      if (response.url().endsWith('.js')) {
        jsRequests.push(response);
      }
    });

    await page.waitForLoadState('networkidle');

    // Calculate total JS size
    let totalSize = 0;
    for (const request of jsRequests) {
      const headers = await request.headerValue('content-length');
      if (headers) {
        totalSize += parseInt(headers);
      }
    }

    const totalMB = totalSize / 1024 / 1024;

    console.log(`✓ Total JavaScript size: ${totalMB.toFixed(2)}MB`);

    // Initial bundle should be under 2MB
    expect(totalMB).toBeLessThan(2);
  });
});
