import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

describe('E2E Scanning Workflows', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();

    // Grant camera permissions
    const context = await browser.newContext({
      permissions: ['camera']
    });
    page = await context.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Workflow A: Business Card Scan', () => {
    it('should complete full business card scanning workflow', async () => {
      // Step 1: Navigate to scan page
      await page.goto('http://localhost:3000/scan/business-card');
      await expect(page.locator('h1')).toContainText('Scan Business Card');

      // Step 2: Open camera on mobile
      const cameraButton = page.locator('[data-testid="open-camera"]');
      await cameraButton.click();

      // Wait for camera permission
      await page.waitForSelector('[data-testid="video-preview"]', {
        timeout: 5000
      });

      // Step 3: Capture business card photo
      // Note: In real E2E, you'd need to mock camera feed or use actual device
      const captureButton = page.locator('[data-testid="capture-btn"]');
      await captureButton.click();

      // Verify photo captured
      await page.waitForSelector('[data-testid="photo-preview"]');

      // Step 4: Confirm capture
      const confirmButton = page.locator('[data-testid="confirm-btn"]');
      await confirmButton.click();

      // Upload should start
      await page.waitForSelector('[data-testid="upload-progress"]');
      await expect(page.locator('.status')).toContainText('Uploading');

      // Step 5: Wait for Claude extraction
      await page.waitForSelector('[data-testid="extraction-complete"]', {
        timeout: 30000 // Claude can take up to 10s
      });

      // Step 6: Review extracted data
      await expect(page.locator('[data-testid="extracted-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="extracted-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="extracted-phone"]')).toBeVisible();

      const nameField = page.locator('[name="name"]');
      const nameValue = await nameField.inputValue();
      expect(nameValue).toBeTruthy();
      expect(nameValue.length).toBeGreaterThan(0);

      // Step 7: Edit if needed
      const emailField = page.locator('[name="email"]');
      await emailField.clear();
      await emailField.fill('corrected@example.com');

      // Step 8: Create customer
      const createButton = page.locator('[data-testid="create-customer-btn"]');
      await createButton.click();

      // Wait for customer creation
      await page.waitForURL('**/customers/*', { timeout: 5000 });

      // Step 9: Verify customer appears in system
      await expect(page.locator('.customer-name')).toContainText(nameValue);
      await expect(page.locator('.customer-email')).toContainText('corrected@example.com');

      // Verify success message
      await expect(page.locator('.success-message')).toContainText(
        'Customer created from business card scan'
      );
    });

    it('should handle scan retry on poor quality', async () => {
      await page.goto('http://localhost:3000/scan/business-card');

      // Open camera
      await page.click('[data-testid="open-camera"]');
      await page.waitForSelector('[data-testid="video-preview"]');

      // Capture
      await page.click('[data-testid="capture-btn"]');

      // Simulate poor quality detection
      await page.waitForSelector('[data-testid="quality-warning"]');
      await expect(page.locator('.warning')).toContainText(
        'Image quality may be too low'
      );

      // Retake
      await page.click('[data-testid="retake-btn"]');

      // Camera should reopen
      await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();
    });

    it('should handle extraction errors gracefully', async () => {
      await page.goto('http://localhost:3000/scan/business-card');

      // Simulate upload of invalid image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'invalid.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('not a real image')
      });

      // Wait for error
      await page.waitForSelector('[data-testid="extraction-error"]');
      await expect(page.locator('.error-message')).toContainText(
        'Unable to extract data from image'
      );

      // Retry option should be available
      await expect(page.locator('[data-testid="retry-btn"]')).toBeVisible();
    });

    it('should allow manual entry if scan fails', async () => {
      await page.goto('http://localhost:3000/scan/business-card');

      // Click manual entry option
      await page.click('[data-testid="manual-entry-btn"]');

      // Should show customer form
      await expect(page.locator('form.customer-form')).toBeVisible();

      // Fill manually
      await page.fill('[name="name"]', 'Manual Entry');
      await page.fill('[name="email"]', 'manual@example.com');
      await page.fill('[name="phone"]', '555-0000');

      await page.click('[type="submit"]');

      // Should create customer
      await page.waitForURL('**/customers/*');
      await expect(page.locator('.customer-name')).toContainText('Manual Entry');
    });
  });

  describe('Workflow B: Mailchimp Campaign', () => {
    it('should complete email campaign creation workflow', async () => {
      // Step 1: Navigate to campaigns
      await page.goto('http://localhost:3000/marketing/campaigns');
      await expect(page.locator('h1')).toContainText('Email Campaigns');

      // Step 2: Click create campaign
      await page.click('[data-testid="create-campaign-btn"]');

      // Step 3: Select customer segment (PROSPECT)
      await page.waitForSelector('[data-testid="segment-selector"]');

      const segmentDropdown = page.locator('[data-testid="segment-selector"]');
      await segmentDropdown.click();

      await page.click('[data-value="PROSPECT"]');

      // Verify segment selected
      await expect(page.locator('.selected-segment')).toContainText('Prospects');

      // Show segment count
      const segmentCount = page.locator('[data-testid="segment-count"]');
      const count = await segmentCount.textContent();
      expect(parseInt(count!)).toBeGreaterThan(0);

      // Step 4: Choose products to feature
      await page.click('[data-testid="select-products-btn"]');

      await page.waitForSelector('.product-selector');

      // Select 3 products
      await page.click('[data-product-id="prod_1"]');
      await page.click('[data-product-id="prod_2"]');
      await page.click('[data-product-id="prod_3"]');

      await page.click('[data-testid="confirm-products-btn"]');

      // Verify products selected
      await expect(page.locator('.selected-products')).toContainText('3 products selected');

      // Step 5: Configure campaign details
      await page.fill('[name="subject"]', 'New Wine Arrivals This Week');
      await page.fill('[name="preview_text"]', 'Premium selections just in stock');
      await page.fill('[name="from_name"]', 'Wine Sales Team');

      // Step 6: Preview email
      await page.click('[data-testid="preview-btn"]');

      await page.waitForSelector('.email-preview');

      // Verify products appear in preview
      await expect(page.locator('.email-preview')).toContainText('prod_1');
      await expect(page.locator('.email-preview')).toContainText('New Wine Arrivals');

      // Step 7: Create Mailchimp campaign
      await page.click('[data-testid="create-in-mailchimp-btn"]');

      await page.waitForSelector('[data-testid="campaign-created"]', {
        timeout: 10000
      });

      await expect(page.locator('.success-message')).toContainText(
        'Campaign created in Mailchimp'
      );

      // Step 8: Send to segment
      await page.click('[data-testid="send-campaign-btn"]');

      // Confirm send
      await page.waitForSelector('.send-confirmation-modal');

      const recipientCount = page.locator('[data-testid="recipient-count"]');
      const recipients = await recipientCount.textContent();
      expect(parseInt(recipients!)).toBeGreaterThan(0);

      await page.click('[data-testid="confirm-send-btn"]');

      // Step 9: Wait for send completion
      await page.waitForSelector('[data-testid="campaign-sent"]', {
        timeout: 15000
      });

      await expect(page.locator('.success-message')).toContainText('Campaign sent successfully');

      // Step 10: Track opens/clicks
      await page.click('[data-testid="view-stats-btn"]');

      await page.waitForSelector('.campaign-stats');

      // Verify stats display
      await expect(page.locator('[data-testid="total-sent"]')).toBeVisible();
      await expect(page.locator('[data-testid="opens"]')).toBeVisible();
      await expect(page.locator('[data-testid="clicks"]')).toBeVisible();
    });

    it('should sync customers to Mailchimp before campaign', async () => {
      await page.goto('http://localhost:3000/marketing/sync');

      // Step 1: View sync status
      await expect(page.locator('.sync-status')).toBeVisible();

      const lastSync = page.locator('[data-testid="last-sync-time"]');
      await expect(lastSync).toBeVisible();

      // Step 2: Trigger manual sync
      await page.click('[data-testid="sync-now-btn"]');

      // Show progress
      await page.waitForSelector('[data-testid="sync-progress"]');

      const progressBar = page.locator('.progress-bar');
      await expect(progressBar).toBeVisible();

      // Step 3: Wait for completion
      await page.waitForSelector('[data-testid="sync-complete"]', {
        timeout: 60000 // Can take up to 30s for 100+ customers
      });

      // Step 4: Verify sync results
      const syncedCount = page.locator('[data-testid="synced-count"]');
      const count = await syncedCount.textContent();
      expect(parseInt(count!)).toBeGreaterThan(0);

      // Show any errors
      const errors = page.locator('[data-testid="sync-errors"]');
      const errorText = await errors.textContent();
      expect(errorText).toContain('0 errors');
    });

    it('should handle opt-out requests', async () => {
      await page.goto('http://localhost:3000/customers/cust_123');

      // Step 1: View customer details
      await expect(page.locator('.customer-details')).toBeVisible();

      // Step 2: Check current email preference
      const emailPref = page.locator('[data-testid="email-preference"]');
      await expect(emailPref).toContainText('Subscribed');

      // Step 3: Opt out
      await page.click('[data-testid="opt-out-btn"]');

      // Confirm
      await page.waitForSelector('.opt-out-confirmation');
      await page.click('[data-testid="confirm-opt-out-btn"]');

      // Step 4: Verify update
      await page.waitForSelector('[data-testid="opt-out-success"]');

      await expect(emailPref).toContainText('Unsubscribed');

      // Step 5: Verify Mailchimp sync
      await expect(page.locator('.mailchimp-status')).toContainText('Updated in Mailchimp');
    });
  });

  describe('Performance Tests', () => {
    it('should upload image in under 2 seconds', async () => {
      await page.goto('http://localhost:3000/scan/business-card');

      const fileInput = page.locator('input[type="file"]');

      const start = Date.now();

      await fileInput.setInputFiles({
        name: 'card.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('image data')
      });

      await page.waitForSelector('[data-testid="upload-complete"]');

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it('should extract data in under 10 seconds', async () => {
      await page.goto('http://localhost:3000/scan/business-card');

      const fileInput = page.locator('input[type="file"]');

      await fileInput.setInputFiles({
        name: 'card.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('valid business card image')
      });

      const start = Date.now();

      await page.waitForSelector('[data-testid="extraction-complete"]', {
        timeout: 15000
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000);
    });
  });
});
