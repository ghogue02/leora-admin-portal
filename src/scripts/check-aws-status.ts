#!/usr/bin/env tsx

/**
 * AWS/Supabase Status Checker
 *
 * Checks if database is accessible and ready for enrichment upload
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
const prisma = new PrismaClient();

async function checkStatus() {
  console.log('🔍 Checking AWS/Supabase Status...\n');

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const elapsed = Date.now() - start;

    console.log('✅ DATABASE IS ONLINE!');
    console.log(`   Connection time: ${elapsed}ms`);
    console.log(`   Status: Ready for enrichment upload\n`);

    // Check how many products need enrichment
    const count = await prisma.product.count({
      where: {
        description: null,
      },
    });

    console.log(`📊 Products without enrichment: ${count}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Run: tsx scripts/upload-enrichment.ts');
    console.log('   2. Verify enrichment in database');
    console.log('   3. Check UI displays correctly\n');

    process.exit(0);
  } catch (error) {
    console.log('❌ DATABASE IS DOWN');

    if (error instanceof Error) {
      if (error.message.includes('Can\'t reach database')) {
        console.log('   AWS/Supabase is currently unreachable');
        console.log('   Connection error: Timeout or service down\n');
      } else {
        console.log(`   Error: ${error.message}\n`);
      }
    }

    console.log('⏳ Waiting for AWS to come back online...');
    console.log('   Run this script again in a few minutes\n');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();
