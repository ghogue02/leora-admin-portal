#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

interface TastingNotes {
  aroma: string;
  palate: string;
  finish: string;
}

interface ServingInfo {
  temperature: string;
  decanting: string;
  glassware: string;
}

interface WineDetails {
  region: string;
  grapeVariety: string;
  vintage: number | null;
  style: string;
  ageability: string;
}

interface EnrichedProductData {
  description: string;
  tastingNotes: TastingNotes;
  foodPairings: string[];
  servingInfo: ServingInfo;
  wineDetails: WineDetails;
}

interface CliOptions {
  preview: boolean;
  test: number | null;
  batch: number;
  all: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    preview: false,
    test: null,
    batch: 20,
    all: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--preview') {
      options.preview = true;
    } else if (arg === '--test' && args[i + 1]) {
      options.test = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--batch' && args[i + 1]) {
      options.batch = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--all') {
      options.all = true;
    }
  }

  return options;
}

async function enrichProducts(options: CliOptions) {
  const { preview, test, batch, all } = options;

  console.log('🍷 Claude Code Product Enrichment\n');
  console.log('═'.repeat(80));
  console.log(`Mode: ${preview ? '👁️  PREVIEW (No saves)' : '💾 SAVE to database'}`);
  console.log(`Method: Using Claude Code (FREE - no API key needed!)`);
  console.log(`Batch size: ${batch}`);
  if (test) {
    console.log(`Test mode: Processing ${test} products`);
  } else if (all) {
    console.log('Processing: ALL products without descriptions');
  }
  console.log('═'.repeat(80));
  console.log();

  try {
    // Get products to enrich
    const query = {
      where: {
        description: null,
      },
      include: {
        skus: {
          take: 1,
          select: {
            code: true,
            size: true,
            abv: true,
          },
        },
      },
      orderBy: {
        name: 'asc' as const,
      },
    };

    // Apply limits
    if (test) {
      Object.assign(query, { take: test });
    } else if (!all) {
      Object.assign(query, { take: batch });
    }

    const products = await prisma.product.findMany(query);

    if (products.length === 0) {
      console.log('✅ No products need enrichment!');
      console.log('   All products already have descriptions.');
      return;
    }

    console.log(`📊 Found ${products.length} products to enrich\n`);
    console.log('💡 NOTE: Products are ready for enrichment.');
    console.log('   Since this uses Claude Code (me!), I can enrich them directly.');
    console.log('   The data will be generated using my built-in knowledge as a sommelier.\n');

    console.log('📋 Products to Enrich:\n');
    products.forEach((product, idx) => {
      const sku = product.skus[0];
      console.log(`${idx + 1}. ${product.name}`);
      console.log(`   Brand: ${product.brand || 'N/A'} | Category: ${product.category || 'N/A'}`);
      if (sku) {
        console.log(`   SKU: ${sku.code} | Size: ${sku.size || 'N/A'} | ABV: ${sku.abv || 'N/A'}%`);
      }
      console.log();
    });

    console.log('─'.repeat(80));
    console.log('\n⚠️  MANUAL ENRICHMENT REQUIRED\n');
    console.log('Since I (Claude Code) cannot call external APIs, enrichment needs to be done');
    console.log('in one of these ways:\n');
    console.log('1. Run the enrichment in batches where I generate the data for each batch');
    console.log('2. Export product list and use Anthropic API with the other script');
    console.log('3. Use Claude.ai web interface to generate enrichment data\n');

    console.log('💡 RECOMMENDED APPROACH:');
    console.log('Let me enrich products in small batches (5-10 at a time) where I generate');
    console.log('the enrichment data and save it directly to your database.\n');

    console.log(`✅ Found ${products.length} products ready for enrichment`);
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printUsage() {
  console.log(`
🍷 Claude Code Product Enrichment Script

USAGE:
  tsx scripts/enrich-with-claude-code.ts [options]

OPTIONS:
  --preview       Preview mode - don't save to database (default: save)
  --test N        Process only N products for testing
  --batch N       Set batch size (default: 20)
  --all           Process all products without descriptions

EXAMPLES:
  # List 10 products that need enrichment
  tsx scripts/enrich-with-claude-code.ts --test 10

  # List all products that need enrichment
  tsx scripts/enrich-with-claude-code.ts --all

NOTE:
  This script identifies products that need enrichment.
  Actual enrichment is done by Claude Code directly through conversation.
`);
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const options = parseArgs();
enrichProducts(options);
