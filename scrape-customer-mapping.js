const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG = {
  loginUrl: 'https://www.halapp.com/hal/user/sign-in/',
  ordersUrl: 'https://www.halapp.com/a/wcb/sales/customer-invoice/',
  headless: false,
  outputFile: './customer-mapping.json',
};

// Load credentials
function loadCredentials() {
  try {
    return JSON.parse(fs.readFileSync('config.json', 'utf8'));
  } catch (error) {
    console.error('❌ Error loading config.json');
    process.exit(1);
  }
}

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeCustomerMapping() {
  const credentials = loadCredentials();

  console.log('🕷️  HAL APP CUSTOMER SCRAPER');
  console.log('='.repeat(70));
  console.log();

  // We know the range from our imports: 174483-177697 with 2484 valid invoices
  // Just scrape everything from HAL App orders page
  console.log('📋 Target: All orders from Sept 18 - Oct 18, 2025');
  console.log('   Reference range: 174483 → 177697');
  console.log('   Expected: ~2,484 orders with customer names\n');

  const browser = await chromium.launch({ headless: CONFIG.headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  const customerMapping = {};
  const stats = {
    found: 0,
    notFound: 0,
  };

  try {
    // Login
    console.log('🔐 Logging in to HAL App...');
    await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const loginSelectors = [
      { username: 'input[name="username"]', password: 'input[name="password"]', submit: 'button[type="submit"]' },
      { username: 'input[name="email"]', password: 'input[name="password"]', submit: 'button[type="submit"]' },
      { username: 'input[type="email"]', password: 'input[type="password"]', submit: 'button[type="submit"]' },
    ];

    let loggedIn = false;
    for (const selectors of loginSelectors) {
      try {
        const usernameField = await page.$(selectors.username);
        if (usernameField) {
          await page.fill(selectors.username, credentials.username);
          await page.fill(selectors.password, credentials.password);
          await page.click(selectors.submit);
          await page.waitForTimeout(3000);
          loggedIn = true;
          console.log('✅ Login successful!\n');
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!loggedIn) {
      console.log('⚠️  Please log in manually in the browser.');
      console.log('Press Enter after logging in...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
      console.log('✅ Continuing...\n');
    }

    // Navigate to orders page
    console.log('📄 Navigating to orders page...');
    await page.goto(CONFIG.ordersUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Set date range to cover all our invoices (Sept 18 - Oct 18)
    console.log('📅 Setting date range...');
    const dateInputs = await page.$$('input[type="text"]');
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill('2025-09-18');
      await dateInputs[1].fill('2025-10-18');
    }

    // Click "Find orders" button
    const findButton = await page.$('button:has-text("Find orders"), input[value="Find orders"]');
    if (findButton) {
      await findButton.click();
      await page.waitForTimeout(3000);
    }

    console.log('🔍 Scraping customer information from orders table...\n');

    // Scrape the table
    const orderData = await page.evaluate(() => {
      const results = [];
      const tables = document.querySelectorAll('table');

      tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            // Based on your screenshot: Date | Customer | Reference number | ...
            const date = cells[0]?.textContent?.trim();
            const customer = cells[1]?.textContent?.trim();
            const refNum = cells[2]?.textContent?.trim();

            // Try to find reference number link
            const refLink = cells[2]?.querySelector('a');
            const refNumber = refLink ? refLink.textContent.trim() : refNum;

            if (customer && refNumber && /^\d+$/.test(refNumber)) {
              results.push({
                referenceNumber: parseInt(refNumber),
                customerName: customer,
                date: date,
              });
            }
          }
        });
      });

      return results;
    });

    console.log(`📊 Found ${orderData.length} orders with customer information\n`);

    // Build mapping
    orderData.forEach(order => {
      customerMapping[order.referenceNumber] = {
        customerName: order.customerName,
        date: order.date,
      };
      stats.found++;
    });

    console.log('='.repeat(70));
    console.log('📊 SCRAPING COMPLETE');
    console.log('='.repeat(70));
    console.log(`✅ Found customers:     ${stats.found} invoice-customer mappings`);
    console.log();

    // Save mapping
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(customerMapping, null, 2));
    console.log(`💾 Customer mapping saved to: ${CONFIG.outputFile}\n`);

    // Also save as CSV for easy viewing
    const csvPath = './customer-mapping.csv';
    const csvLines = ['referenceNumber,customerName,date'];
    Object.entries(customerMapping).forEach(([ref, data]) => {
      csvLines.push(`${ref},"${data.customerName}","${data.date}"`);
    });
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`📄 CSV mapping saved to: ${csvPath}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (!CONFIG.headless) {
      console.log('Press Enter to close browser...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }
    await browser.close();
  }

  return customerMapping;
}

// Run
if (require.main === module) {
  scrapeCustomerMapping().catch(console.error);
}

module.exports = { scrapeCustomerMapping };
