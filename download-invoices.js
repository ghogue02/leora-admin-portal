const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'https://www.halapp.com',
  loginUrl: 'https://www.halapp.com/login', // You may need to update this
  invoiceUrl: 'https://www.halapp.com/a/wcb/sales/customer-invoice/',
  downloadDir: './invoices',
  dataDir: './data',
  headless: false, // Set to true to run without UI
};

// Load credentials from config file
function loadCredentials() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('Error loading config.json. Please create it with your credentials.');
    console.error('Example: { "username": "your@email.com", "password": "yourpassword" }');
    process.exit(1);
  }
}

// Calculate date range (last 30 days)
function getDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
}

// Create necessary directories
function setupDirectories() {
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.dataDir)) {
    fs.mkdirSync(CONFIG.dataDir, { recursive: true });
  }
}

async function downloadInvoices() {
  const credentials = loadCredentials();
  setupDirectories();

  const dateRange = getDateRange();
  console.log(`📅 Downloading invoices from ${dateRange.start} to ${dateRange.end}`);

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    downloadsPath: CONFIG.downloadDir
  });

  const context = await browser.newContext({
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('🔐 Navigating to login page...');
    await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle' });

    // Wait a moment to see the page structure (for debugging)
    await page.waitForTimeout(2000);

    // Try to find and fill login form
    // Note: You'll need to inspect the actual login page to get correct selectors
    console.log('📝 Attempting to log in...');

    // Common login field selectors - update these based on actual page
    const loginSelectors = [
      { username: 'input[name="username"]', password: 'input[name="password"]', submit: 'button[type="submit"]' },
      { username: 'input[name="email"]', password: 'input[name="password"]', submit: 'button[type="submit"]' },
      { username: 'input[type="email"]', password: 'input[type="password"]', submit: 'button[type="submit"]' },
      { username: '#username', password: '#password', submit: 'button[type="submit"]' },
      { username: '#email', password: '#password', submit: 'button[type="submit"]' },
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
          console.log('✅ Login successful!');
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!loggedIn) {
      console.log('⚠️  Could not auto-detect login form. Please log in manually.');
      console.log('   The browser window will stay open. Press Enter after logging in...');

      // Wait for manual login
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Navigate to invoice page
    console.log('📄 Navigating to invoice page...');
    await page.goto(CONFIG.invoiceUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Fill in the date range and search
    console.log(`📅 Setting date range: ${dateRange.start} to ${dateRange.end}`);

    // Find date inputs - they appear to be text inputs in the date range section
    const dateInputs = await page.$$('input[type="text"]');

    // Fill start date (first date input)
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill(dateRange.start);
      await dateInputs[1].fill(dateRange.end);
    }

    // Click "Find orders" button
    console.log('🔍 Searching for invoices...');
    const findButton = await page.$('button:has-text("Find orders")');
    if (findButton) {
      await findButton.click();
      await page.waitForTimeout(3000); // Wait for results to load
    }

    // Extract invoice data from the page
    console.log('📊 Extracting invoice information...');

    const invoices = await page.evaluate(() => {
      const results = [];

      // Find the table with orders
      const tables = document.querySelectorAll('table');

      tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            // Based on your screenshot:
            // Date | Customer | Reference number | Delivery method | Status | Invoice
            const invoice = {
              date: cells[0]?.textContent?.trim() || '',
              customer: cells[1]?.textContent?.trim() || '',
              reference: cells[2]?.textContent?.trim() || '',
              deliveryMethod: cells[3]?.textContent?.trim() || '',
              status: cells[4]?.textContent?.trim() || '',
            };

            // Look for invoice links in the last column
            const invoiceLinks = cells[cells.length - 1]?.querySelectorAll('a');
            invoiceLinks?.forEach(link => {
              const href = link.getAttribute('href');
              const text = link.textContent.trim();

              if (href && text.includes('Invoice')) {
                invoice.invoiceUrl = href;
                invoice.invoiceType = text; // "Invoice" or "Tax-exempt invoice"
              }
            });

            if (invoice.reference && invoice.invoiceUrl) {
              results.push(invoice);
            }
          }
        });
      });

      return results;
    });

    console.log(`📊 Found ${invoices.length} invoices`);

    // Save invoice metadata
    const metadataPath = path.join(CONFIG.dataDir, `invoices_${dateRange.start}_to_${dateRange.end}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(invoices, null, 2));
    console.log(`💾 Saved invoice metadata to ${metadataPath}`);

    // Download each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      console.log(`\n⬇️  Downloading invoice ${i + 1}/${invoices.length}`);
      console.log(`   📋 Reference: ${invoice.reference}`);
      console.log(`   👤 Customer: ${invoice.customer}`);
      console.log(`   📅 Date: ${invoice.date}`);
      console.log(`   📄 Type: ${invoice.invoiceType}`);

      if (invoice.invoiceUrl) {
        try {
          const invoiceUrl = invoice.invoiceUrl.startsWith('http')
            ? invoice.invoiceUrl
            : CONFIG.baseUrl + invoice.invoiceUrl;

          // Open invoice in new page to get PDF
          const invoicePage = await context.newPage();

          // Set up download listener before navigating
          const downloadPromise = invoicePage.waitForEvent('download', { timeout: 30000 });

          await invoicePage.goto(invoiceUrl, { waitUntil: 'networkidle' });

          // Try to trigger PDF download
          // Option 1: Look for a download button
          const downloadBtn = await invoicePage.$('a:has-text("Download"), button:has-text("Download"), a:has-text("PDF")');
          if (downloadBtn) {
            await downloadBtn.click();
          } else {
            // Option 2: Use browser print to PDF
            const fileName = invoice.reference
              ? `invoice_${invoice.reference.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              : `invoice_${i + 1}.pdf`;

            await invoicePage.pdf({
              path: path.join(CONFIG.downloadDir, fileName),
              format: 'A4',
              printBackground: true
            });

            console.log(`   ✅ Saved as ${fileName} (via print to PDF)`);
            await invoicePage.close();
            await page.waitForTimeout(500);
            continue;
          }

          // If download button was found, wait for download
          try {
            const download = await downloadPromise;
            const fileName = invoice.reference
              ? `invoice_${invoice.reference.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              : `invoice_${i + 1}.pdf`;

            await download.saveAs(path.join(CONFIG.downloadDir, fileName));
            console.log(`   ✅ Saved as ${fileName}`);
          } catch (downloadError) {
            console.log(`   ⚠️  No download triggered, using print to PDF instead`);

            const fileName = invoice.reference
              ? `invoice_${invoice.reference.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              : `invoice_${i + 1}.pdf`;

            await invoicePage.pdf({
              path: path.join(CONFIG.downloadDir, fileName),
              format: 'A4',
              printBackground: true
            });

            console.log(`   ✅ Saved as ${fileName} (via print to PDF)`);
          }

          await invoicePage.close();
          await page.waitForTimeout(500); // Polite delay

        } catch (error) {
          console.log(`   ❌ Failed to download: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  No invoice URL found`);
      }
    }

    console.log('\n✨ Download complete!');
    console.log(`📁 Invoices saved to: ${CONFIG.downloadDir}`);
    console.log(`📋 Metadata saved to: ${metadataPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (!CONFIG.headless) {
      console.log('\nPress Enter to close the browser...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }
    await browser.close();
  }
}

// Run the script
downloadInvoices().catch(console.error);
