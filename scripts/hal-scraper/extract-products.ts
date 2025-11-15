#!/usr/bin/env tsx
/**
 * HAL Product Data Extraction Script
 *
 * Extracts product information from halapp.com warehouse interface
 * Requires active login session in browser
 */

import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

interface ProductData {
  // Basic info
  name: string;
  sku: string;
  category: string;
  status: string;

  // Details
  manufacturer?: string;
  supplier?: string;
  labelAlcohol?: string;
  itemsPerCase?: string;
  virginiaABCCode?: string;
  warehouseLocation?: string;
  itemBarcode?: string;

  // Inventory
  totalQuantity?: string;
  totalCases?: string;
  pending?: string;
  warehouseInventory?: Array<{
    warehouse: string;
    quantity: string;
    cases: string;
    pending?: string;
  }>;

  // Description
  description?: string;

  // Images
  packshot?: string;
  frontLabel?: string;
  backLabel?: string;
  techSheet?: string;

  // Metadata
  url: string;
  extractedAt: string;
}

class HALProductScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'https://halapp.com';
  private outputDir = 'scripts/hal-scraper/output';

  async initialize() {
    console.log('🚀 Initializing HAL Product Scraper...');

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Launch browser in headed mode to use existing session
    this.browser = await chromium.launch({
      headless: false, // Use visible browser to leverage existing login
      slowMo: 100, // Slow down for stability
    });

    const context = await this.browser.newContext();
    this.page = await context.newPage();

    console.log('✅ Browser initialized');
  }

  async navigateToItemsList() {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('📋 Navigating to items list...');
    await this.page.goto('https://halapp.com/a/wcb/warehouse/item/', {
      waitUntil: 'networkidle'
    });

    // Wait for items table to load
    await this.page.waitForSelector('table', { timeout: 10000 });
    console.log('✅ Items list loaded');
  }

  async extractProductLinks(): Promise<string[]> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🔍 Extracting product links...');
    const links: string[] = [];
    let pageNum = 1;

    while (true) {
      // Extract links from current page
      const pageLinks = await this.page.$$eval(
        'table tbody tr td:nth-child(2) a',
        (anchors) => anchors.map(a => (a as HTMLAnchorElement).href)
      );

      links.push(...pageLinks);
      console.log(`  Page ${pageNum}: Found ${pageLinks.length} products (Total: ${links.length})`);

      // Check if there's a next page
      const nextButton = await this.page.$('a.next:not(.disabled)');
      if (!nextButton) {
        console.log('✅ Reached last page');
        break;
      }

      // Click next and wait for load
      await nextButton.click();
      await this.page.waitForLoadState('networkidle');
      pageNum++;
    }

    console.log(`✅ Total products found: ${links.length}`);
    return links;
  }

  async extractProductDetail(url: string): Promise<ProductData | null> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });

      // Extract basic info from header
      const name = await this.page.textContent('h1') || '';

      // Extract tags/metadata section
      const tags: Record<string, string> = {};
      const tagElements = await this.page.$$('.tags > div');

      for (const tag of tagElements) {
        const label = await tag.$eval('strong', el => el.textContent?.trim() || '');
        const value = await tag.evaluate(el => {
          const text = el.textContent || '';
          const labelText = el.querySelector('strong')?.textContent || '';
          return text.replace(labelText, '').trim();
        });

        if (label) {
          tags[label] = value;
        }
      }

      // Extract description
      const description = await this.page.$eval(
        'p',
        el => el.textContent?.trim() || ''
      ).catch(() => '');

      // Extract inventory table
      const inventory: ProductData['warehouseInventory'] = [];
      const invRows = await this.page.$$('table.inventory tbody tr');

      for (const row of invRows) {
        const cells = await row.$$('td');
        if (cells.length >= 3) {
          inventory.push({
            warehouse: await cells[0].textContent() || '',
            quantity: await cells[1].textContent() || '',
            cases: await cells[2].textContent() || '',
            pending: cells[3] ? await cells[3].textContent() || undefined : undefined,
          });
        }
      }

      // Extract image URLs
      const packshot = await this.page.$eval(
        'img[alt="Packshot"]',
        el => (el as HTMLImageElement).src
      ).catch(() => undefined);

      const frontLabel = await this.page.$eval(
        'img[alt="Front label"]',
        el => (el as HTMLImageElement).src
      ).catch(() => undefined);

      const backLabel = await this.page.$eval(
        'img[alt="Back label"]',
        el => (el as HTMLImageElement).src
      ).catch(() => undefined);

      const techSheet = await this.page.$eval(
        'a:has-text("Tech sheet")',
        el => (el as HTMLAnchorElement).href
      ).catch(() => undefined);

      // Get status from tags
      const statusBadge = await this.page.$eval(
        '.badge',
        el => el.textContent?.trim() || ''
      ).catch(() => 'Unknown');

      const product: ProductData = {
        name: name.trim(),
        sku: tags['SKU'] || '',
        category: tags['Category'] || '',
        status: statusBadge,
        manufacturer: tags['Manufacturer'],
        supplier: tags['Supplier'],
        labelAlcohol: tags['Label alcohol'],
        itemsPerCase: tags['Items per case'],
        virginiaABCCode: tags['Virginia ABC Code'],
        warehouseLocation: tags['Warehouse Location'],
        itemBarcode: tags['Item barcode'],
        description,
        warehouseInventory: inventory,
        packshot,
        frontLabel,
        backLabel,
        techSheet,
        url,
        extractedAt: new Date().toISOString(),
      };

      // Calculate totals from inventory
      if (inventory.length > 0) {
        product.totalQuantity = inventory.reduce((sum, inv) => {
          return sum + (parseInt(inv.quantity) || 0);
        }, 0).toString();

        product.totalCases = inventory.reduce((sum, inv) => {
          return sum + (parseFloat(inv.cases) || 0);
        }, 0).toFixed(2);
      }

      return product;

    } catch (error) {
      console.error(`❌ Error extracting ${url}:`, error);
      return null;
    }
  }

  async extractAllProducts() {
    console.log('\n🎯 Starting full product extraction...\n');

    await this.initialize();
    await this.navigateToItemsList();

    // Get all product URLs
    const productUrls = await this.extractProductLinks();

    console.log(`\n📦 Extracting details for ${productUrls.length} products...\n`);

    const products: ProductData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < productUrls.length; i++) {
      const url = productUrls[i];
      console.log(`[${i + 1}/${productUrls.length}] Extracting: ${url}`);

      const product = await this.extractProductDetail(url);

      if (product) {
        products.push(product);

        // Save incremental progress every 50 products
        if ((i + 1) % 50 === 0) {
          this.saveProgress(products, 'incremental');
          console.log(`💾 Saved progress: ${products.length} products`);
        }
      } else {
        errors.push(url);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Extraction complete!\n');
    console.log(`✓ Successful: ${products.length}`);
    console.log(`✗ Failed: ${errors.length}`);

    // Save final results
    this.saveProgress(products, 'final');

    if (errors.length > 0) {
      fs.writeFileSync(
        path.join(this.outputDir, 'errors.json'),
        JSON.stringify(errors, null, 2)
      );
    }

    return products;
  }

  private saveProgress(products: ProductData[], type: 'incremental' | 'final') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = type === 'final'
      ? 'products-final.json'
      : `products-progress-${timestamp}.json`;

    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(products, null, 2));

    // Also save as CSV
    if (type === 'final') {
      this.saveAsCSV(products);
    }
  }

  private saveAsCSV(products: ProductData[]) {
    if (products.length === 0) return;

    // Flatten data for CSV
    const headers = [
      'SKU', 'Name', 'Category', 'Status',
      'Manufacturer', 'Supplier', 'Label Alcohol', 'Items Per Case',
      'Virginia ABC Code', 'Warehouse Location', 'Item Barcode',
      'Total Quantity', 'Total Cases', 'Pending',
      'Description', 'URL', 'Extracted At'
    ];

    const rows = products.map(p => [
      p.sku,
      p.name,
      p.category,
      p.status,
      p.manufacturer || '',
      p.supplier || '',
      p.labelAlcohol || '',
      p.itemsPerCase || '',
      p.virginiaABCCode || '',
      p.warehouseLocation || '',
      p.itemBarcode || '',
      p.totalQuantity || '',
      p.totalCases || '',
      p.pending || '',
      p.description?.replace(/"/g, '""') || '',
      p.url,
      p.extractedAt
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    fs.writeFileSync(
      path.join(this.outputDir, 'products-final.csv'),
      csv
    );

    console.log('✅ CSV file saved');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Main execution
async function main() {
  const scraper = new HALProductScraper();

  try {
    await scraper.extractAllProducts();
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await scraper.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { HALProductScraper, ProductData };
