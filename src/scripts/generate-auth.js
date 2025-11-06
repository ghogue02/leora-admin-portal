const { chromium } = require('@playwright/test');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  await page.goto(`${baseUrl}/sales/login`);
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@wellcrafted.com');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'test123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForURL('**/sales/dashboard', { timeout: 10000 }).catch(() => {});
  const authDir = path.join(__dirname, '..', '.auth');
  const fs = require('fs');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir);
  }
  const storagePath = path.join(authDir, 'user.json');
  await context.storageState({ path: storagePath });
  await browser.close();
  console.log(`Saved storage state to ${storagePath}`);
})();
