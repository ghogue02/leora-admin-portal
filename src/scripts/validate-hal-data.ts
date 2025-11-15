#!/usr/bin/env tsx
/**
 * HAL Data Validation Script
 *
 * Validates HAL inventory data against the database before import.
 * CRITICAL: Never import SKU codes from HAL - they don't align with Wellcrafted's system!
 *
 * Usage:
 *   npx tsx src/scripts/validate-hal-data.ts [options]
 *
 * Options:
 *   --dry-run        Run validation without making changes (default: true)
 *   --output <file>  Save validation report to JSON file
 *   --verbose        Show detailed logging
 *   --help           Show this help message
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface HalProduct {
  name: string;
  sku: string;
  manufacturer?: string;
  supplier: string;
  labelAlcohol: string;
  itemsPerCase: string;
  virginiaABCCode?: string;
  warehouseLocation?: string;
  itemBarcode?: string;
  inventory: Array<{
    warehouse: string;
    quantity: string;
    cases: string;
    pending?: string;
  }>;
  description?: string;
  url: string;
  extractedAt: string;
}

interface ValidationReport {
  summary: {
    totalHalProducts: number;
    matchedSkus: number;
    missingSkus: number;
    duplicateVintages: number;
    validationErrors: number;
    totalInventoryItems: number;
    suppliersFound: number;
    suppliersMissing: number;
  };
  matchedSkus: Array<{
    sku: string;
    halName: string;
    dbProductName: string;
    currentInventory: number;
    halInventory: number;
    inventoryDelta: number;
  }>;
  missingSkus: Array<{
    sku: string;
    halName: string;
    supplier: string;
    totalQuantity: number;
  }>;
  duplicateVintages: Array<{
    sku: string;
    count: number;
    vintages: Array<{
      year: number | null;
      name: string;
      quantity: number;
    }>;
  }>;
  validationErrors: Array<{
    sku: string;
    halName: string;
    error: string;
    severity: 'warning' | 'error';
  }>;
  dataTransformations: Array<{
    sku: string;
    field: string;
    currentValue: any;
    proposedValue: any;
    action: string;
  }>;
  inventoryUpdates: Array<{
    sku: string;
    location: string;
    currentQuantity: number;
    halQuantity: number;
    delta: number;
  }>;
  suppliers: {
    matched: string[];
    missing: string[];
  };
}

class HalDataValidator {
  private prisma: PrismaClient;
  private halDataPath: string;
  private verbose: boolean;
  private report: ValidationReport;

  constructor(halDataPath: string, verbose = false) {
    this.prisma = new PrismaClient();
    this.halDataPath = halDataPath;
    this.verbose = verbose;
    this.report = {
      summary: {
        totalHalProducts: 0,
        matchedSkus: 0,
        missingSkus: 0,
        duplicateVintages: 0,
        validationErrors: 0,
        totalInventoryItems: 0,
        suppliersFound: 0,
        suppliersMissing: 0,
      },
      matchedSkus: [],
      missingSkus: [],
      duplicateVintages: [],
      validationErrors: [],
      dataTransformations: [],
      inventoryUpdates: [],
      suppliers: {
        matched: [],
        missing: [],
      },
    };
  }

  /**
   * Extract vintage year from product name
   */
  private extractVintage(name: string): number | null {
    // Look for 4-digit year (2000-2099)
    const match = name.match(/\b(20\d{2}|19\d{2})\b/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Parse quantity string to number
   */
  private parseQuantity(quantityStr: string): number {
    // Handle formats like "502", "41.83x12", "0.08x12"
    const cleanStr = quantityStr.replace(/[^\d.]/g, '');
    return parseInt(cleanStr, 10) || 0;
  }

  /**
   * Parse ABV (alcohol by volume) string to float
   */
  private parseAbv(abvStr: string): number | null {
    const parsed = parseFloat(abvStr);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse items per case string to integer
   */
  private parseItemsPerCase(itemsStr: string): number | null {
    const parsed = parseInt(itemsStr, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Calculate total inventory quantity from HAL inventory array
   */
  private calculateTotalInventory(inventory: HalProduct['inventory']): number {
    return inventory.reduce((total, item) => {
      return total + this.parseQuantity(item.quantity);
    }, 0);
  }

  /**
   * Load HAL data from JSON file
   */
  private loadHalData(): HalProduct[] {
    this.log('Loading HAL data...', 'cyan');

    if (!fs.existsSync(this.halDataPath)) {
      throw new Error(`HAL data file not found: ${this.halDataPath}`);
    }

    const data = JSON.parse(fs.readFileSync(this.halDataPath, 'utf-8'));

    if (!Array.isArray(data)) {
      throw new Error('HAL data file must contain an array of products');
    }

    this.log(`✓ Loaded ${data.length} products from HAL data`, 'green');
    return data;
  }

  /**
   * Load all SKUs from database
   */
  private async loadDatabaseSkus() {
    this.log('Loading database SKUs...', 'cyan');

    // Note: Assuming tenantId - you may need to adjust this
    const skus = await this.prisma.sku.findMany({
      select: {
        id: true,
        code: true,
        abv: true,
        itemsPerCase: true,
        pricePerUnit: true,
        isActive: true,
        product: {
          select: {
            id: true,
            name: true,
            supplierId: true,
            vintage: true,
            supplier: {
              select: {
                name: true,
              },
            },
          },
        },
        inventories: {
          select: {
            location: true,
            onHand: true,
          },
        },
      },
    });

    this.log(`✓ Loaded ${skus.length} SKUs from database`, 'green');
    return skus;
  }

  /**
   * Load all suppliers from database
   */
  private async loadDatabaseSuppliers() {
    this.log('Loading database suppliers...', 'cyan');

    const suppliers = await this.prisma.supplier.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    this.log(`✓ Loaded ${suppliers.length} suppliers from database`, 'green');
    return suppliers;
  }

  /**
   * Group HAL products by SKU code
   */
  private groupBySku(products: HalProduct[]): Map<string, HalProduct[]> {
    const grouped = new Map<string, HalProduct[]>();

    for (const product of products) {
      const sku = product.sku;
      if (!grouped.has(sku)) {
        grouped.set(sku, []);
      }
      grouped.get(sku)!.push(product);
    }

    return grouped;
  }

  /**
   * Validate HAL products against database
   */
  private async validateProducts(
    halProducts: HalProduct[],
    dbSkus: Awaited<ReturnType<typeof this.loadDatabaseSkus>>,
    dbSuppliers: Awaited<ReturnType<typeof this.loadDatabaseSuppliers>>
  ) {
    this.log('\nValidating HAL products...', 'cyan');

    const dbSkuMap = new Map(dbSkus.map(sku => [sku.code, sku]));
    const dbSupplierMap = new Map(dbSuppliers.map(s => [s.name.toLowerCase(), s]));
    const supplierSet = new Set<string>();

    // Group by SKU to find duplicates
    const skuGroups = this.groupBySku(halProducts);

    let processed = 0;
    const totalProducts = halProducts.length;

    for (const [sku, products] of skuGroups) {
      // Check for duplicate vintages
      if (products.length > 1) {
        this.report.summary.duplicateVintages++;

        const vintages = products.map(p => ({
          year: this.extractVintage(p.name),
          name: p.name,
          quantity: this.calculateTotalInventory(p.inventory),
        }));

        this.report.duplicateVintages.push({
          sku,
          count: products.length,
          vintages,
        });

        this.log(
          `⚠ Duplicate vintages for SKU ${sku}: ${products.map(p => p.name).join(', ')}`,
          'yellow'
        );
      }

      // Process each product
      for (const product of products) {
        processed++;

        // Show progress
        if (processed % 100 === 0) {
          process.stdout.write(
            `\rProgress: ${processed}/${totalProducts} (${Math.round((processed / totalProducts) * 100)}%)`
          );
        }

        // Check if SKU exists in database
        const dbSku = dbSkuMap.get(sku);

        if (!dbSku) {
          this.report.summary.missingSkus++;
          this.report.missingSkus.push({
            sku,
            halName: product.name,
            supplier: product.supplier,
            totalQuantity: this.calculateTotalInventory(product.inventory),
          });
          continue;
        }

        // SKU matched
        this.report.summary.matchedSkus++;

        // Calculate inventory differences
        const halTotalInventory = this.calculateTotalInventory(product.inventory);
        const dbTotalInventory = dbSku.inventories.reduce((sum, inv) => sum + inv.onHand, 0);

        this.report.matchedSkus.push({
          sku,
          halName: product.name,
          dbProductName: dbSku.product.name,
          currentInventory: dbTotalInventory,
          halInventory: halTotalInventory,
          inventoryDelta: halTotalInventory - dbTotalInventory,
        });

        // Check inventory by location
        for (const halInv of product.inventory) {
          const location = halInv.warehouse;
          const halQty = this.parseQuantity(halInv.quantity);
          const dbInv = dbSku.inventories.find(inv => inv.location === location);
          const dbQty = dbInv?.onHand || 0;

          if (halQty !== dbQty) {
            this.report.inventoryUpdates.push({
              sku,
              location,
              currentQuantity: dbQty,
              halQuantity: halQty,
              delta: halQty - dbQty,
            });
          }
        }

        // Validate ABV
        const halAbv = this.parseAbv(product.labelAlcohol);
        if (halAbv !== null && dbSku.abv !== null && Math.abs(halAbv - dbSku.abv) > 0.5) {
          this.report.dataTransformations.push({
            sku,
            field: 'abv',
            currentValue: dbSku.abv,
            proposedValue: halAbv,
            action: 'WARNING: ABV mismatch detected',
          });

          this.report.validationErrors.push({
            sku,
            halName: product.name,
            error: `ABV mismatch: DB=${dbSku.abv}, HAL=${halAbv}`,
            severity: 'warning',
          });
        }

        // Validate items per case
        const halItemsPerCase = this.parseItemsPerCase(product.itemsPerCase);
        if (
          halItemsPerCase !== null &&
          dbSku.itemsPerCase !== null &&
          halItemsPerCase !== dbSku.itemsPerCase
        ) {
          this.report.dataTransformations.push({
            sku,
            field: 'itemsPerCase',
            currentValue: dbSku.itemsPerCase,
            proposedValue: halItemsPerCase,
            action: 'WARNING: Items per case mismatch',
          });

          this.report.validationErrors.push({
            sku,
            halName: product.name,
            error: `Items per case mismatch: DB=${dbSku.itemsPerCase}, HAL=${halItemsPerCase}`,
            severity: 'warning',
          });
        }

        // Check supplier
        supplierSet.add(product.supplier);
        const supplierMatch = dbSupplierMap.get(product.supplier.toLowerCase());

        if (!supplierMatch) {
          if (!this.report.suppliers.missing.includes(product.supplier)) {
            this.report.suppliers.missing.push(product.supplier);
          }
        } else {
          if (!this.report.suppliers.matched.includes(product.supplier)) {
            this.report.suppliers.matched.push(product.supplier);
          }
        }

        // Validate inventory quantities are non-negative
        for (const inv of product.inventory) {
          const qty = this.parseQuantity(inv.quantity);
          if (qty < 0) {
            this.report.validationErrors.push({
              sku,
              halName: product.name,
              error: `Negative inventory quantity: ${inv.quantity} at ${inv.warehouse}`,
              severity: 'error',
            });
            this.report.summary.validationErrors++;
          }
        }
      }
    }

    process.stdout.write('\n');

    this.report.summary.totalHalProducts = halProducts.length;
    this.report.summary.totalInventoryItems = halProducts.reduce(
      (sum, p) => sum + p.inventory.length,
      0
    );
    this.report.summary.validationErrors = this.report.validationErrors.length;
    this.report.summary.suppliersFound = this.report.suppliers.matched.length;
    this.report.summary.suppliersMissing = this.report.suppliers.missing.length;
  }

  /**
   * Display validation summary
   */
  private displaySummary() {
    console.log('\n' + '='.repeat(80));
    console.log(this.colorize('VALIDATION SUMMARY', 'bright'));
    console.log('='.repeat(80) + '\n');

    const { summary } = this.report;

    // Overall statistics
    console.log(this.colorize('Overall Statistics:', 'cyan'));
    console.log(`  Total HAL Products:        ${summary.totalHalProducts}`);
    console.log(`  Total Inventory Items:     ${summary.totalInventoryItems}`);
    console.log(`  Matched SKUs:              ${this.colorize(summary.matchedSkus.toString(), 'green')}`);
    console.log(`  Missing SKUs:              ${this.colorize(summary.missingSkus.toString(), 'red')}`);
    console.log(`  Duplicate Vintages:        ${this.colorize(summary.duplicateVintages.toString(), 'yellow')}`);
    console.log(`  Validation Errors:         ${this.colorize(summary.validationErrors.toString(), summary.validationErrors > 0 ? 'red' : 'green')}`);

    // Supplier statistics
    console.log(`\n${this.colorize('Supplier Statistics:', 'cyan')}`);
    console.log(`  Suppliers Found:           ${this.colorize(summary.suppliersFound.toString(), 'green')}`);
    console.log(`  Suppliers Missing:         ${this.colorize(summary.suppliersMissing.toString(), 'red')}`);

    // Inventory updates
    console.log(`\n${this.colorize('Inventory Changes:', 'cyan')}`);
    console.log(`  Total Updates Needed:      ${this.report.inventoryUpdates.length}`);

    const increasingInv = this.report.inventoryUpdates.filter(u => u.delta > 0).length;
    const decreasingInv = this.report.inventoryUpdates.filter(u => u.delta < 0).length;

    console.log(`  Increasing Inventory:      ${this.colorize(increasingInv.toString(), 'green')}`);
    console.log(`  Decreasing Inventory:      ${this.colorize(decreasingInv.toString(), 'yellow')}`);

    // Top issues
    if (this.report.missingSkus.length > 0) {
      console.log(`\n${this.colorize('⚠ TOP 10 MISSING SKUs:', 'red')}`);
      this.report.missingSkus
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10)
        .forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.sku} - ${item.halName}`);
          console.log(`     Supplier: ${item.supplier}, Quantity: ${item.totalQuantity}`);
        });
    }

    if (this.report.duplicateVintages.length > 0) {
      console.log(`\n${this.colorize('⚠ TOP 10 DUPLICATE VINTAGES:', 'yellow')}`);
      this.report.duplicateVintages
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.sku} (${item.count} vintages):`);
          item.vintages.forEach(v => {
            console.log(`     - ${v.year || 'NV'}: ${v.name} (${v.quantity} units)`);
          });
        });
    }

    if (this.report.validationErrors.length > 0) {
      console.log(`\n${this.colorize('⚠ TOP 10 VALIDATION ERRORS:', 'red')}`);
      this.report.validationErrors
        .filter(e => e.severity === 'error')
        .slice(0, 10)
        .forEach((error, idx) => {
          console.log(`  ${idx + 1}. ${error.sku} - ${error.halName}`);
          console.log(`     ${error.error}`);
        });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Save report to JSON file
   */
  private saveReport(outputPath: string) {
    this.log(`\nSaving report to ${outputPath}...`, 'cyan');

    const reportData = {
      generatedAt: new Date().toISOString(),
      ...this.report,
    };

    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf-8');
    this.log(`✓ Report saved successfully`, 'green');
  }

  /**
   * Run validation
   */
  async run(outputPath?: string) {
    try {
      console.log(this.colorize('\n🔍 HAL Data Validation Tool\n', 'bright'));

      // Check for DATABASE_URL
      if (!process.env.DATABASE_URL) {
        throw new Error(
          'DATABASE_URL environment variable not set.\n' +
          'Please ensure .env file exists in the web/ directory with a valid DATABASE_URL.'
        );
      }

      await this.prisma.$connect();
      this.log('✓ Connected to database', 'green');

      // Load data
      const halProducts = this.loadHalData();
      const dbSkus = await this.loadDatabaseSkus();
      const dbSuppliers = await this.loadDatabaseSuppliers();

      // Validate
      await this.validateProducts(halProducts, dbSkus, dbSuppliers);

      // Display results
      this.displaySummary();

      // Save report if requested
      if (outputPath) {
        this.saveReport(outputPath);
      }

      // Exit code based on validation results
      const hasErrors = this.report.validationErrors.filter(e => e.severity === 'error').length > 0;
      process.exit(hasErrors ? 1 : 0);

    } catch (error) {
      console.error(this.colorize(`\n❌ Validation failed: ${error}`, 'red'));
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Log message with optional color
   */
  private log(message: string, color?: keyof typeof colors) {
    if (this.verbose || color === 'red') {
      console.log(this.colorize(message, color));
    }
  }

  /**
   * Colorize text for console output
   */
  private colorize(text: string, color?: keyof typeof colors): string {
    if (!color) return text;
    return `${colors[color]}${text}${colors.reset}`;
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function showHelp() {
  console.log(`
HAL Data Validation Tool

Validates HAL inventory data against the database before import.

CRITICAL WARNING:
  ⚠️  NEVER import SKU codes from HAL inventory exports!
  ⚠️  HAL SKU codes do NOT align with Wellcrafted's internal SKU system!
  ⚠️  Importing HAL SKUs will corrupt the product catalog!

Usage:
  npx tsx src/scripts/validate-hal-data.ts [options]

Options:
  --dry-run        Run validation without making changes (default: true)
  --output <file>  Save validation report to JSON file
  --verbose        Show detailed logging
  --help           Show this help message

Examples:
  # Basic validation
  npx tsx src/scripts/validate-hal-data.ts

  # Validation with detailed output
  npx tsx src/scripts/validate-hal-data.ts --verbose

  # Save report to file
  npx tsx src/scripts/validate-hal-data.ts --output validation-report.json

  # Both verbose and save report
  npx tsx src/scripts/validate-hal-data.ts --verbose --output report.json
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const verbose = args.includes('--verbose');
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;

  const halDataPath = path.resolve(
    __dirname,
    '../../../scripts/hal-scraper/output/products-final.json'
  );

  const validator = new HalDataValidator(halDataPath, verbose);
  await validator.run(outputPath);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { HalDataValidator, ValidationReport };
