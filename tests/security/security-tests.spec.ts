/**
 * Security Testing Suite
 * Tests authentication, authorization, and common security vulnerabilities
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Security', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/sales/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login|\/auth/);
  });

  test('should prevent access with invalid credentials', async ({ page }) => {
    await page.goto('/');

    // Try invalid login
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid|incorrect|failed/i')).toBeVisible();

    // Should remain on login page
    await expect(page).toHaveURL(/\/login|\/auth|\/$/);
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/register');

    // Try weak password
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    // Should show password validation error
    await expect(page.locator('text=/password.*requirements|too short|weak password/i'))
      .toBeVisible();
  });

  test('should implement rate limiting on login attempts', async ({ page }) => {
    await page.goto('/');

    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'wrongpassword' + i);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Should show rate limit message
    await expect(page.locator('text=/too many attempts|rate limit|try again later/i'))
      .toBeVisible();
  });

  test('should enforce session timeout', async ({ page, context }) => {
    // Login
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@wellcrafted.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/sales/dashboard');

    // Manipulate session cookie to simulate expiration
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name.includes('session') || c.name.includes('token'));

    if (sessionCookie) {
      await context.addCookies([{
        ...sessionCookie,
        expires: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      }]);

      // Try to access protected page
      await page.goto('/sales/customers');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login|\/auth/);
    }
  });
});

test.describe('Authorization and Access Control', () => {
  test('should enforce role-based access control', async ({ page }) => {
    // Login as regular user
    await page.goto('/');
    await page.fill('input[name="email"]', 'rep@wellcrafted.com');
    await page.fill('input[name="password"]', 'reppassword');
    await page.click('button[type="submit"]');

    // Try to access admin-only route
    await page.goto('/admin/users');

    // Should show access denied or redirect
    const accessDenied = await page.locator('text=/access denied|unauthorized|forbidden/i').isVisible();
    const redirected = page.url().includes('/login') || page.url().includes('/dashboard');

    expect(accessDenied || redirected).toBeTruthy();
  });

  test('should prevent tenant data leakage', async ({ page }) => {
    // Login as tenant A user
    await page.goto('/');
    await page.fill('input[name="email"]', 'tenantA@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('/sales/customers');

    // Try to access tenant B's data via URL manipulation
    await page.goto('/sales/customers/99999'); // Different tenant's customer ID

    // Should show not found or access denied
    const notFound = await page.locator('text=/not found|does not exist/i').isVisible();
    const accessDenied = await page.locator('text=/access denied|unauthorized/i').isVisible();

    expect(notFound || accessDenied).toBeTruthy();
  });

  test('should validate API authorization headers', async ({ page }) => {
    await page.goto('/');

    // Intercept API calls
    const responses = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        responses.push(response);
      }
    });

    await page.fill('input[name="email"]', 'test@wellcrafted.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/sales/dashboard');

    // Check that API calls include auth headers
    const apiCalls = responses.filter((r) => r.url().includes('/api/'));

    for (const call of apiCalls) {
      const headers = call.headers();
      const hasAuth = headers['authorization'] || headers['cookie'];
      expect(hasAuth).toBeTruthy();
    }
  });
});

test.describe('Input Validation and XSS Prevention', () => {
  test('should prevent XSS in customer notes', async ({ page }) => {
    await page.goto('/sales/customers/1');

    // Try to inject script
    const xssPayload = '<script>alert("XSS")</script>';

    await page.click('button:has-text("Log Activity")');
    await page.selectOption('select[name="type"]', 'NOTE');
    await page.fill('textarea[name="notes"]', xssPayload);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Verify script tag is escaped/sanitized
    const noteContent = await page.locator('[data-testid="activity-item"]').first().textContent();
    expect(noteContent).not.toContain('<script>');

    // XSS should not execute
    page.on('dialog', () => {
      throw new Error('XSS alert dialog appeared!');
    });

    await page.waitForTimeout(1000); // Wait to see if alert fires
  });

  test('should sanitize HTML in product descriptions', async ({ page }) => {
    await page.goto('/portal/catalog');

    // Check if any product descriptions contain raw HTML
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const description = await productCards.nth(i).locator('[data-testid="product-description"]').textContent();

      // Should not contain script tags or event handlers
      expect(description).not.toMatch(/<script/i);
      expect(description).not.toMatch(/onerror=/i);
      expect(description).not.toMatch(/onclick=/i);
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/sales/customers');
    await page.click('button:has-text("Add Customer")');

    // Try invalid email
    await page.fill('input[name="email"]', 'notanemail');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/invalid email|valid email required/i')).toBeVisible();
  });

  test('should prevent SQL injection in search', async ({ page }) => {
    await page.goto('/sales/customers');

    // Try SQL injection payload
    const sqlPayload = "'; DROP TABLE customers; --";
    await page.fill('input[placeholder*="Search"]', sqlPayload);
    await page.waitForTimeout(1000);

    // Application should still function normally
    await expect(page.locator('[data-testid="customer-row"]')).toBeVisible();

    // Verify database wasn't affected by navigating elsewhere
    await page.goto('/portal/catalog');
    await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
  });
});

test.describe('CSRF Protection', () => {
  test('should include CSRF tokens in forms', async ({ page }) => {
    await page.goto('/sales/customers/1');

    // Open activity form
    await page.click('button:has-text("Log Activity")');

    // Check for CSRF token
    const csrfToken = await page.locator('input[name="csrf_token"], input[name="_csrf"]').count();
    const hasCsrfMeta = await page.locator('meta[name="csrf-token"]').count();

    expect(csrfToken + hasCsrfMeta).toBeGreaterThan(0);
  });

  test('should reject requests without valid CSRF token', async ({ page, context }) => {
    await page.goto('/sales/customers/1');

    // Intercept form submission and remove CSRF token
    await page.route('**/api/**', async (route) => {
      const postData = route.request().postDataJSON();
      if (postData && postData.csrf_token) {
        delete postData.csrf_token;
      }

      await route.continue();
    });

    // Try to submit form
    await page.click('button:has-text("Log Activity")');
    await page.selectOption('select[name="type"]', 'NOTE');
    await page.fill('textarea[name="notes"]', 'Test note');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=/csrf|invalid token|forbidden/i')).toBeVisible();
  });
});

test.describe('Secure Data Transmission', () => {
  test('should use HTTPS in production', async ({ page }) => {
    // This test is more relevant in production/staging environments
    const url = page.url();

    if (process.env.NODE_ENV === 'production') {
      expect(url).toMatch(/^https:/);
    }
  });

  test('should not expose sensitive data in URLs', async ({ page }) => {
    await page.goto('/sales/customers');

    // Navigate through the app
    await page.click('[data-testid="customer-row"]:first-child');
    await page.waitForURL(/\/sales\/customers\/\d+/);

    // Check URL doesn't contain passwords, tokens, etc.
    const url = page.url();
    expect(url).not.toMatch(/password|token|secret|key/i);
  });

  test('should set secure cookie flags', async ({ page, context }) => {
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@wellcrafted.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/sales/dashboard');

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name.includes('session') || c.name.includes('token'));

    if (sessionCookie) {
      // In production, should be secure and httpOnly
      if (process.env.NODE_ENV === 'production') {
        expect(sessionCookie.secure).toBeTruthy();
        expect(sessionCookie.httpOnly).toBeTruthy();
      }

      // Should have sameSite set
      expect(sessionCookie.sameSite).toBeTruthy();
    }
  });
});

test.describe('File Upload Security', () => {
  test('should validate file types on upload', async ({ page }) => {
    await page.goto('/sales/customers/1');

    // Find file upload input
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.count() > 0) {
      // Try to upload executable file
      await fileInput.setInputFiles({
        name: 'malicious.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('fake executable content'),
      });

      // Should show error
      await expect(page.locator('text=/invalid file type|file not allowed/i')).toBeVisible();
    }
  });

  test('should enforce file size limits', async ({ page }) => {
    await page.goto('/sales/customers/1');

    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.count() > 0) {
      // Try to upload large file (10MB)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);

      await fileInput.setInputFiles({
        name: 'large-file.pdf',
        mimeType: 'application/pdf',
        buffer: largeBuffer,
      });

      // Should show error
      await expect(page.locator('text=/file too large|size limit/i')).toBeVisible();
    }
  });
});

test.describe('Security Headers', () => {
  test('should include security headers', async ({ page }) => {
    const response = await page.goto('/sales/dashboard');

    const headers = response.headers();

    // Check for important security headers
    // Note: Some headers may vary based on deployment environment
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
    ];

    const presentHeaders = securityHeaders.filter((h) => headers[h]);

    console.log(`✓ Security headers present: ${presentHeaders.join(', ')}`);

    // At least some security headers should be present
    expect(presentHeaders.length).toBeGreaterThan(0);
  });
});
