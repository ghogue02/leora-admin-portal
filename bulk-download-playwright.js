const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration - you can edit these
const CONFIG = {
  baseUrl: 'https://www.halapp.com',
  loginUrl: 'https://www.halapp.com/hal/user/sign-in/',
  invoiceUrlTemplate: 'https://www.halapp.com/a/wcb/document/?for_type=customer_invoice&for_id={ref_num}',
  startRef: 174483,  // Starting from recent invoices (skipping 16xxxx range)
  endRef: 177697,
  downloadDir: './invoices',
  dataDir: './data',
  headless: false, // Set to true to hide browser
  delayMs: 500, // Delay between downloads
};

// Load credentials from config file
function loadCredentials() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('❌ Error loading config.json');
    console.error('Please create config.json with: { "username": "your@email.com", "password": "yourpassword" }');
    process.exit(1);
  }
}

// Create directories
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

  console.log('🚀 HAL App Bulk Invoice Downloader (Playwright)');
  console.log('=' .repeat(70));
  console.log(`📊 Reference range: ${CONFIG.startRef} → ${CONFIG.endRef}`);
  console.log(`📦 Total to check: ${CONFIG.endRef - CONFIG.startRef + 1}`);
  console.log('=' .repeat(70));
  console.log();

  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext({
    acceptDownloads: true,
  });

  const page = await context.newPage();

  // Statistics
  const stats = {
    successful: 0,
    notFound: 0,
    errors: 0,
    totalChecked: 0,
    startTime: Date.now(),
  };

  // CSV log
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const csvPath = path.join(CONFIG.dataDir, `download_log_${timestamp}.csv`);
  const csvStream = fs.createWriteStream(csvPath);
  csvStream.write('Reference,Status,Filename,Size,Message\n');

  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try common login selectors
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
          console.log('✅ Login successful!\n');
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!loggedIn) {
      console.log('⚠️  Could not auto-login. Please log in manually in the browser.');
      console.log('Press Enter after you finish logging in...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
      console.log('✅ Continuing...\n');
    }

    // Start downloading
    console.log('⬇️  Starting bulk download...\n');

    for (let refNum = CONFIG.startRef; refNum <= CONFIG.endRef; refNum++) {
      stats.totalChecked++;

      const url = CONFIG.invoiceUrlTemplate.replace('{ref_num}', refNum);

      try {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

        // Navigate to the URL
        const responsePromise = page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        }).catch(() => null);

        // Wait for either download or response
        const [download, response] = await Promise.all([downloadPromise, responsePromise]);

        if (download) {
          // PDF download was triggered
          const filename = path.join(CONFIG.downloadDir, `${refNum}.pdf`);
          await download.saveAs(filename);

          const fileStats = fs.statSync(filename);
          const sizeKB = (fileStats.size / 1024).toFixed(1);
          stats.successful++;

          console.log(`✅ ${refNum}: Downloaded (${sizeKB} KB)`);
          csvStream.write(`${refNum},Downloaded,${refNum}.pdf,${sizeKB} KB,\n`);

        } else if (response) {
          const contentType = response.headers()['content-type'] || '';

          if (response.status() === 200 && contentType.includes('pdf')) {
            // PDF in response body (alternative method)
            const buffer = await response.body();
            const filename = path.join(CONFIG.downloadDir, `${refNum}.pdf`);
            fs.writeFileSync(filename, buffer);

            const sizeKB = (buffer.length / 1024).toFixed(1);
            stats.successful++;

            console.log(`✅ ${refNum}: Downloaded (${sizeKB} KB)`);
            csvStream.write(`${refNum},Downloaded,${refNum}.pdf,${sizeKB} KB,\n`);

          } else if (response.status() === 404 || contentType.includes('html')) {
            // Not found
            stats.notFound++;
            csvStream.write(`${refNum},Not Found,,,\n`);

            // Only print every 100th not found to reduce noise
            if (stats.notFound % 100 === 0) {
              console.log(`⚪ Checked ${stats.totalChecked}, found ${stats.successful} invoices...`);
            }

          } else {
            // Unexpected response
            stats.errors++;
            console.log(`❌ ${refNum}: Unexpected response (${response.status()})`);
            csvStream.write(`${refNum},Error,,,"Status ${response.status()}"\n`);
          }
        } else {
          // No response and no download
          stats.notFound++;
          csvStream.write(`${refNum},Not Found,,,\n`);
        }

      } catch (error) {
        stats.errors++;
        console.log(`❌ ${refNum}: ${error.message}`);
        csvStream.write(`${refNum},Error,,,${error.message}\n`);
      }

      // Progress update every 100 items
      if (stats.totalChecked % 100 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = stats.totalChecked / elapsed;
        const remaining = (CONFIG.endRef - refNum) / rate;

        console.log(`📊 Progress: ${stats.totalChecked} checked | ${stats.successful} downloaded | ~${(remaining / 60).toFixed(1)}min remaining`);
      }

      // Polite delay
      await page.waitForTimeout(CONFIG.delayMs);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    csvStream.end();

    // Summary
    const elapsed = (Date.now() - stats.startTime) / 1000;

    console.log('\n' + '='.repeat(70));
    console.log('📊 DOWNLOAD COMPLETE!');
    console.log('='.repeat(70));
    console.log(`✅ Successfully downloaded: ${stats.successful}`);
    console.log(`⚠️  Not found (expected): ${stats.notFound}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`📦 Total checked: ${stats.totalChecked}`);
    console.log(`⏱️  Time elapsed: ${(elapsed / 60).toFixed(1)} minutes`);
    console.log(`📁 PDFs saved to: ${CONFIG.downloadDir}/`);
    console.log(`📋 Log saved to: ${csvPath}`);
    console.log('='.repeat(70));

    // Save summary
    const summaryPath = path.join(CONFIG.dataDir, `download_summary_${timestamp}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify({
      statistics: stats,
      config: CONFIG,
      timestamp: new Date().toISOString(),
      elapsed_seconds: elapsed,
    }, null, 2));

    console.log(`💾 Summary saved to: ${summaryPath}\n`);

    if (!CONFIG.headless) {
      console.log('Press Enter to close the browser...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }

    await browser.close();
  }
}

// Run
downloadInvoices().catch(console.error);
