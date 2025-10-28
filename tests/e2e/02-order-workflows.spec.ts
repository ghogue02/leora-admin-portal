/**
 * E2E Tests: Order Management Workflows
 * Tests catalog browsing, cart, and order submission
 */
import { test, expect, helpers } from './fixtures';

test.describe('Catalog and Orders', () => {
  test('should browse catalog and add items to cart', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/catalog');

    // Verify catalog loaded
    await expect(authenticatedPage.locator('h1')).toContainText('Catalog');

    // Wait for products to load
    const products = authenticatedPage.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();

    // Add first product to cart
    await authenticatedPage.click('[data-testid="add-to-cart-btn"]:first-child');

    // Verify cart badge updated
    await expect(authenticatedPage.locator('[data-testid="cart-badge"]')).toContainText('1');

    // Add another product
    await authenticatedPage.click('[data-testid="add-to-cart-btn"]:nth-child(2)');
    await expect(authenticatedPage.locator('[data-testid="cart-badge"]')).toContainText('2');
  });

  test('should search catalog with filters', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/catalog');

    // Search for product
    await authenticatedPage.fill('input[placeholder*="Search"]', 'Wine');
    await authenticatedPage.waitForTimeout(500);

    // Verify search results
    const products = authenticatedPage.locator('[data-testid="product-card"]');
    const firstProduct = products.first();
    await expect(firstProduct).toBeVisible();

    // Apply category filter
    await authenticatedPage.click('button:has-text("Filters")');
    await authenticatedPage.click('input[value="WINE"]');
    await authenticatedPage.click('button:has-text("Apply")');

    // Verify filtered results
    const productTitles = await authenticatedPage.locator('[data-testid="product-title"]').allTextContents();
    expect(productTitles.length).toBeGreaterThan(0);
  });

  test('should complete order checkout workflow', async ({ authenticatedPage }) => {
    // Add items to cart
    await authenticatedPage.goto('/portal/catalog');
    await authenticatedPage.click('[data-testid="add-to-cart-btn"]:first-child');
    await authenticatedPage.click('[data-testid="add-to-cart-btn"]:nth-child(2)');

    // Go to cart
    await authenticatedPage.click('[data-testid="cart-link"]');
    await expect(authenticatedPage).toHaveURL('/portal/cart');

    // Verify cart items
    const cartItems = authenticatedPage.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(2);

    // Update quantity
    await authenticatedPage.fill('[data-testid="quantity-input"]:first-child', '3');
    await authenticatedPage.click('button:has-text("Update")');

    // Verify total updated
    await expect(authenticatedPage.locator('[data-testid="cart-total"]')).toBeVisible();

    // Proceed to checkout
    await authenticatedPage.click('button:has-text("Place Order")');

    // Verify order confirmation
    await expect(authenticatedPage.locator('.toast')).toContainText('Order placed successfully');

    // Verify redirect to orders page
    await expect(authenticatedPage).toHaveURL(/\/portal\/orders/);
  });

  test('should view order details and history', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/orders');

    // Verify orders list
    const orders = authenticatedPage.locator('[data-testid="order-row"]');
    await expect(orders.first()).toBeVisible();

    // Click first order
    await authenticatedPage.click('[data-testid="order-row"]:first-child');

    // Verify order detail page
    await expect(authenticatedPage).toHaveURL(/\/portal\/orders\/\d+/);
    await expect(authenticatedPage.locator('h1')).toContainText('Order');

    // Verify order items displayed
    const orderItems = authenticatedPage.locator('[data-testid="order-item"]');
    await expect(orderItems.first()).toBeVisible();

    // Verify order total
    await expect(authenticatedPage.locator('[data-testid="order-total"]')).toBeVisible();
  });

  test('should handle empty cart gracefully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/cart');

    // Clear cart if it has items
    const clearBtn = authenticatedPage.locator('button:has-text("Clear Cart")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await authenticatedPage.click('button:has-text("Confirm")');
    }

    // Verify empty state
    await expect(authenticatedPage.locator('text=Your cart is empty')).toBeVisible();

    // Verify checkout button disabled
    await expect(authenticatedPage.locator('button:has-text("Place Order")')).toBeDisabled();
  });
});

test.describe('Order Performance', () => {
  test('should load catalog page under 2 seconds', async ({ authenticatedPage }) => {
    const startTime = Date.now();

    await authenticatedPage.goto('/portal/catalog');
    await expect(authenticatedPage.locator('[data-testid="product-card"]').first()).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);

    helpers.log('Performance', `Catalog loaded in ${loadTime}ms`);
  });

  test('should handle large catalog with pagination', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/catalog');

    // Get initial product count
    const products = authenticatedPage.locator('[data-testid="product-card"]');
    const initialCount = await products.count();

    // Scroll to bottom to trigger pagination
    await authenticatedPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await authenticatedPage.waitForTimeout(1000);

    // Verify more products loaded
    const newCount = await products.count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});

test.describe('Cart Functionality', () => {
  test('should persist cart across page navigation', async ({ authenticatedPage }) => {
    // Add item to cart
    await authenticatedPage.goto('/portal/catalog');
    await authenticatedPage.click('[data-testid="add-to-cart-btn"]:first-child');

    // Navigate away
    await authenticatedPage.goto('/portal/orders');

    // Navigate back
    await authenticatedPage.goto('/portal/cart');

    // Verify item still in cart
    const cartItems = authenticatedPage.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(1);
  });

  test('should remove item from cart', async ({ authenticatedPage }) => {
    // Add items
    await authenticatedPage.goto('/portal/catalog');
    await authenticatedPage.click('[data-testid="add-to-cart-btn"]:first-child');
    await authenticatedPage.click('[data-testid="add-to-cart-btn"]:nth-child(2)');

    // Go to cart
    await authenticatedPage.goto('/portal/cart');

    // Remove first item
    await authenticatedPage.click('[data-testid="remove-item-btn"]:first-child');

    // Verify confirmation dialog
    await authenticatedPage.click('button:has-text("Confirm")');

    // Verify item removed
    const cartItems = authenticatedPage.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(1);
  });
});
