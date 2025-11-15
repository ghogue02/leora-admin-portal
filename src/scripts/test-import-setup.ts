#!/usr/bin/env tsx
/**
 * Test Import Setup Script
 *
 * This script validates the database schema and HAL data file
 * before running the actual import.
 *
 * Usage:
 *   npx tsx src/scripts/test-import-setup.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const TENANT_ID = '4519729e-cd63-4fc1-84b6-d0d75abe2796';
const HAL_DATA_FILE = '/Users/greghogue/Leora2/scripts/hal-scraper/output/products-progress-2025-11-15T02-19-05-574Z.json';

interface HALProduct {
  name: string;
  sku: string;
  manufacturer?: string;
  supplier?: string;
  labelAlcohol?: string;
  itemsPerCase?: string;
  virginiaABCCode?: string;
  warehouseLocation?: string;
  itemBarcode?: string;
  inventory: any[];
}

async function main() {
  console.log('🔍 HAL Import Setup Validation\n');

  const prisma = new PrismaClient();

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Connected to database\n');

    // Test 2: Verify Schema Fields
    console.log('2️⃣ Verifying schema fields...');

    // Check Product fields
    const sampleProduct = await prisma.product.findFirst({
      where: { tenantId: TENANT_ID },
      select: {
        id: true,
        name: true,
        description: true,
        manufacturer: true,
        abcCode: true,
        vintage: true,
        supplierId: true,
      }
    });

    if (sampleProduct) {
      console.log('   ✅ Product schema verified:', Object.keys(sampleProduct));
    } else {
      console.log('   ⚠️  No products found in tenant');
    }

    // Check SKU fields
    const sampleSku = await prisma.sku.findFirst({
      where: { tenantId: TENANT_ID },
      select: {
        id: true,
        code: true,
        abv: true,
        itemsPerCase: true,
        bottleBarcode: true,
        abcCodeNumber: true,
      }
    });

    if (sampleSku) {
      console.log('   ✅ SKU schema verified:', Object.keys(sampleSku));
    } else {
      console.log('   ⚠️  No SKUs found in tenant');
    }

    // Check Inventory fields
    const sampleInventory = await prisma.inventory.findFirst({
      where: { tenantId: TENANT_ID },
      select: {
        location: true,
        onHand: true,
        aisle: true,
        row: true,
        shelf: true,
        binLocation: true,
      }
    });

    if (sampleInventory) {
      console.log('   ✅ Inventory schema verified:', Object.keys(sampleInventory));
    } else {
      console.log('   ⚠️  No inventory records found');
    }

    console.log();

    // Test 3: HAL Data File
    console.log('3️⃣ Validating HAL data file...');

    if (!fs.existsSync(HAL_DATA_FILE)) {
      console.log('   ❌ HAL data file not found:', HAL_DATA_FILE);
      console.log('   Update HAL_DATA_FILE constant to point to your file\n');
      process.exit(1);
    }

    const halData = JSON.parse(fs.readFileSync(HAL_DATA_FILE, 'utf-8')) as HALProduct[];
    console.log(`   ✅ HAL data file loaded: ${halData.length} products`);

    // Sample a few products
    const sampleSize = Math.min(5, halData.length);
    console.log(`   📊 Sample of ${sampleSize} products:\n`);

    for (let i = 0; i < sampleSize; i++) {
      const product = halData[i];
      console.log(`      ${i + 1}. ${product.name}`);
      console.log(`         SKU: ${product.sku}`);
      console.log(`         Manufacturer: ${product.manufacturer || 'N/A'}`);
      console.log(`         Supplier: ${product.supplier || 'N/A'}`);
      console.log(`         ABV: ${product.labelAlcohol || 'N/A'}%`);
      console.log(`         Items/Case: ${product.itemsPerCase || 'N/A'}`);
      console.log(`         Inventory: ${product.inventory.length} locations`);
      console.log();
    }

    // Test 4: Check for Existing SKUs
    console.log('4️⃣ Checking SKU matches...');

    const halSkus = halData.map(p => p.sku);
    const uniqueHalSkus = [...new Set(halSkus)];

    console.log(`   📦 Unique SKUs in HAL data: ${uniqueHalSkus.length}`);

    // Sample 10 SKUs to check
    const skuSample = uniqueHalSkus.slice(0, 10);
    const foundSkus = await prisma.sku.findMany({
      where: {
        tenantId: TENANT_ID,
        code: { in: skuSample }
      },
      select: { code: true }
    });

    const foundSkuCodes = foundSkus.map(s => s.code);
    const matchRate = (foundSkuCodes.length / skuSample.length) * 100;

    console.log(`   ✅ SKU match rate: ${foundSkuCodes.length}/${skuSample.length} (${matchRate.toFixed(1)}%)`);

    if (matchRate < 50) {
      console.log('   ⚠️  Warning: Low SKU match rate. Many products may be skipped.');
    }

    console.log('\n   Sample SKUs found in database:');
    foundSkuCodes.slice(0, 5).forEach(sku => {
      console.log(`      - ${sku}`);
    });

    // Test 5: Check for Vintage Variants
    console.log('\n5️⃣ Checking for vintage variants...');

    const productsWithVintages = halData.filter(p => {
      const match = p.name.match(/\b(20\d{2}|19\d{2})\s*$/);
      return match !== null;
    });

    console.log(`   📅 Products with vintages: ${productsWithVintages.length}/${halData.length}`);

    if (productsWithVintages.length > 0) {
      console.log('   Sample vintage products:');
      productsWithVintages.slice(0, 5).forEach(p => {
        const vintageMatch = p.name.match(/\b(20\d{2}|19\d{2})\s*$/);
        console.log(`      - ${p.name} (${p.sku}) -> Vintage ${vintageMatch?.[1]}`);
      });
    }

    // Test 6: Supplier Analysis
    console.log('\n6️⃣ Analyzing suppliers...');

    const suppliers = [...new Set(halData.map(p => p.supplier).filter(Boolean))];
    console.log(`   🏢 Unique suppliers in HAL data: ${suppliers.length}`);

    const existingSuppliers = await prisma.supplier.findMany({
      where: {
        tenantId: TENANT_ID,
        name: { in: suppliers as string[] }
      },
      select: { name: true }
    });

    const newSuppliers = suppliers.filter(s =>
      !existingSuppliers.some(es => es.name === s)
    );

    console.log(`   ✅ Existing suppliers: ${existingSuppliers.length}`);
    console.log(`   🆕 New suppliers to create: ${newSuppliers.length}`);

    if (newSuppliers.length > 0 && newSuppliers.length <= 10) {
      console.log('\n   New suppliers:');
      newSuppliers.forEach(s => console.log(`      - ${s}`));
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Database connection:     OK`);
    console.log(`✅ Schema verification:     OK`);
    console.log(`✅ HAL data file:           OK (${halData.length} products)`);
    console.log(`✅ SKU match rate:          ${matchRate.toFixed(1)}%`);
    console.log(`✅ Vintage products:        ${productsWithVintages.length}`);
    console.log(`✅ New suppliers:           ${newSuppliers.length}`);
    console.log('\n🎯 Setup validated successfully!');
    console.log('   You can now run the import script.\n');

  } catch (error: any) {
    console.error('\n❌ Validation failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
