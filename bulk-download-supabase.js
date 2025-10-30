const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const CONFIG = {
  baseUrl: 'https://www.halapp.com',
  loginUrl: 'https://www.halapp.com/hal/user/sign-in/',
  invoiceUrlTemplate: 'https://www.halapp.com/a/wcb/document/?for_type=customer_invoice&for_id={ref_num}',
  startRef: 174483,
  endRef: 177697,
  downloadDir: './invoices',
  headless: false,
  delayMs: 500,
};

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load credentials
function loadCredentials() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('❌ Error loading config.json');
    process.exit(1);
  }
}

// Setup directories
function setupDirectories() {
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
}

// Log download attempt to Supabase
async function logDownloadAttempt(refNum, status, message = null, errorDetails = null) {
  try {
    await supabase.from('download_log').insert({
      reference_number: refNum,
      attempt_status: status,
      message: message,
      error_details: errorDetails
    });
  } catch (error) {
    console.error(`⚠️  Failed to log attempt for ${refNum}:`, error.message);
  }
}

// Save invoice to Supabase
async function saveInvoiceToSupabase(refNum, filePath, sizeKB) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .upsert({
        reference_number: refNum,
        file_path: filePath,
        file_size_kb: sizeKB,
        download_status: 'completed',
        downloaded_at: new Date().toISOString()
      }, {
        onConflict: 'reference_number'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`⚠️  Failed to save ${refNum} to Supabase:`, error.message);
    return false;
  }
}

// Get already downloaded invoices
async function getDownloadedInvoices() {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('reference_number')
      .eq('download_status', 'completed');

    if (error) throw error;

    return new Set(data.map(row => row.reference_number));
  } catch (error) {
    console.error('⚠️  Failed to fetch downloaded invoices:', error.message);
    return new Set();
  }
}

async function downloadInvoices() {
  const credentials = loadCredentials();
  setupDirectories();

  console.log('🚀 HAL App Invoice Downloader with Supabase Integration');
  console.log('=' .repeat(70));
  console.log(`📊 Reference range: ${CONFIG.startRef} → ${CONFIG.endRef}`);
  console.log(`📦 Total to check: ${CONFIG.endRef - CONFIG.startRef + 1}`);
  console.log(`💾 Database: ${process.env.SUPABASE_URL}`);
  console.log('=' .repeat(70));
  console.log();

  // Check what's already downloaded
  console.log('🔍 Checking Supabase for already downloaded invoices...');
  const alreadyDownloaded = await getDownloadedInvoices();
  console.log(`✅ Found ${alreadyDownloaded.size} already downloaded\n`);

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
    skipped: 0,
    notFound: 0,
    errors: 0,
    totalChecked: 0,
    startTime: Date.now(),
  };

  try {
    // Login
    console.log('🔐 Logging in...');
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
      console.log('⚠️  Could not auto-login. Please log in manually.');
      console.log('Press Enter after logging in...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
      console.log('✅ Continuing...\n');
    }

    // Start downloading
    console.log('⬇️  Starting bulk download...\n');

    for (let refNum = CONFIG.startRef; refNum <= CONFIG.endRef; refNum++) {
      stats.totalChecked++;

      // Skip if already downloaded
      if (alreadyDownloaded.has(refNum)) {
        stats.skipped++;
        if (stats.skipped % 50 === 0) {
          console.log(`⏭️  Skipped ${stats.skipped} already downloaded...`);
        }
        continue;
      }

      const url = CONFIG.invoiceUrlTemplate.replace('{ref_num}', refNum);

      try {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

        // Navigate
        const responsePromise = page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        }).catch(() => null);

        const [download, response] = await Promise.all([downloadPromise, responsePromise]);

        if (download) {
          // PDF download triggered
          const filename = path.join(CONFIG.downloadDir, `${refNum}.pdf`);
          await download.saveAs(filename);

          const fileStats = fs.statSync(filename);
          const sizeKB = parseFloat((fileStats.size / 1024).toFixed(1));

          // Save to Supabase
          await saveInvoiceToSupabase(refNum, filename, sizeKB);
          await logDownloadAttempt(refNum, 'success', `Downloaded ${sizeKB} KB`);

          stats.successful++;
          console.log(`✅ ${refNum}: Downloaded (${sizeKB} KB) → Supabase`);

        } else if (response) {
          const contentType = response.headers()['content-type'] || '';

          if (response.status() === 200 && contentType.includes('pdf')) {
            // PDF in response body
            const buffer = await response.body();
            const filename = path.join(CONFIG.downloadDir, `${refNum}.pdf`);
            fs.writeFileSync(filename, buffer);

            const sizeKB = parseFloat((buffer.length / 1024).toFixed(1));

            await saveInvoiceToSupabase(refNum, filename, sizeKB);
            await logDownloadAttempt(refNum, 'success', `Downloaded ${sizeKB} KB`);

            stats.successful++;
            console.log(`✅ ${refNum}: Downloaded (${sizeKB} KB) → Supabase`);

          } else {
            // Not found
            stats.notFound++;
            await logDownloadAttempt(refNum, 'not_found', `Status ${response.status()}`);

            if (stats.notFound % 100 === 0) {
              console.log(`⚪ Checked ${stats.totalChecked}, found ${stats.successful} invoices...`);
            }
          }
        } else {
          stats.notFound++;
          await logDownloadAttempt(refNum, 'not_found', 'No response');
        }

      } catch (error) {
        stats.errors++;
        await logDownloadAttempt(refNum, 'error', error.message, error.stack);
        console.log(`❌ ${refNum}: ${error.message}`);
      }

      // Progress every 100
      if (stats.totalChecked % 100 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = stats.totalChecked / elapsed;
        const remaining = (CONFIG.endRef - refNum) / rate;

        console.log(`📊 Progress: ${stats.totalChecked} checked | ${stats.successful} downloaded | ${stats.skipped} skipped | ~${(remaining / 60).toFixed(1)}min remaining`);
      }

      await page.waitForTimeout(CONFIG.delayMs);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    // Summary
    const elapsed = (Date.now() - stats.startTime) / 1000;

    console.log('\n' + '='.repeat(70));
    console.log('📊 DOWNLOAD COMPLETE!');
    console.log('='.repeat(70));
    console.log(`✅ Successfully downloaded: ${stats.successful}`);
    console.log(`⏭️  Skipped (already downloaded): ${stats.skipped}`);
    console.log(`⚠️  Not found: ${stats.notFound}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`📦 Total checked: ${stats.totalChecked}`);
    console.log(`⏱️  Time elapsed: ${(elapsed / 60).toFixed(1)} minutes`);
    console.log(`📁 PDFs saved to: ${CONFIG.downloadDir}/`);
    console.log(`💾 Metadata in Supabase: ${process.env.SUPABASE_URL}`);
    console.log('='.repeat(70));

    if (!CONFIG.headless) {
      console.log('\nPress Enter to close...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }

    await browser.close();
  }
}

// Run
downloadInvoices().catch(console.error);
