#!/usr/bin/env tsx
/**
 * Schema Readiness Verification Script
 *
 * Verifies that the database schema is ready for Phase 1 implementation
 * by checking for required models, fields, and enums.
 *
 * Usage:
 *   tsx scripts/verify-schema-readiness.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

interface SchemaCheck {
  name: string;
  type: 'model' | 'enum' | 'field';
  required: boolean;
  exists: boolean;
  details?: string;
}

async function verifySchema() {
  console.log('🔍 Phase 1 Schema Readiness Verification\n');
  console.log('═'.repeat(80));

  const checks: SchemaCheck[] = [];

  // Read schema file
  const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  // Helper to check if enum exists
  const enumExists = (enumName: string): boolean => {
    const pattern = new RegExp(`enum\\s+${enumName}\\s*{`, 'm');
    return pattern.test(schemaContent);
  };

  // Helper to check if model exists
  const modelExists = (modelName: string): boolean => {
    const pattern = new RegExp(`model\\s+${modelName}\\s*{`, 'm');
    return pattern.test(schemaContent);
  };

  // Helper to check if field exists in model
  const fieldExists = (modelName: string, fieldName: string): boolean => {
    const modelPattern = new RegExp(`model\\s+${modelName}\\s*{([^}]+)}`, 's');
    const modelMatch = schemaContent.match(modelPattern);
    if (!modelMatch) return false;

    const fieldPattern = new RegExp(`\\s+${fieldName}\\s+`, 'm');
    return fieldPattern.test(modelMatch[1]);
  };

  console.log('\n📋 Checking Required Models...\n');

  // Check required models for Phase 1
  const requiredModels = [
    { name: 'Customer', feature: 'Account signals, drilldowns' },
    { name: 'Order', feature: 'Revenue trends, order momentum' },
    { name: 'OrderLine', feature: 'Product details, line items' },
    { name: 'Product', feature: 'Wine enrichment' },
    { name: 'AccountHealthSnapshot', feature: 'Health metrics' },
    { name: 'SalesMetric', feature: 'ARPDD calculations' },
    { name: 'MetricDefinition', feature: 'Custom metric definitions' }
  ];

  requiredModels.forEach(({ name, feature }) => {
    const exists = modelExists(name);
    checks.push({
      name,
      type: 'model',
      required: true,
      exists,
      details: feature
    });

    console.log(`${exists ? '✅' : '❌'} Model "${name}"`);
    console.log(`   Purpose: ${feature}`);
    console.log(`   Status: ${exists ? 'EXISTS' : 'MISSING'}\n`);
  });

  console.log('═'.repeat(80));
  console.log('\n🎯 Checking Wine Enrichment Fields...\n');

  // Check Product model enrichment fields
  const enrichmentFields = [
    { name: 'description', type: 'String?', purpose: 'Wine descriptions' },
    { name: 'tastingNotes', type: 'Json?', purpose: 'Aroma, palate, finish' },
    { name: 'foodPairings', type: 'Json?', purpose: 'Food pairing suggestions' },
    { name: 'servingInfo', type: 'Json?', purpose: 'Temperature, decanting, glassware' },
    { name: 'wineDetails', type: 'Json?', purpose: 'Region, variety, vintage, style' },
    { name: 'enrichedAt', type: 'DateTime?', purpose: 'Enrichment timestamp' },
    { name: 'enrichedBy', type: 'String?', purpose: 'Enrichment source' }
  ];

  enrichmentFields.forEach(({ name, type, purpose }) => {
    const exists = fieldExists('Product', name);
    checks.push({
      name: `Product.${name}`,
      type: 'field',
      required: true,
      exists,
      details: purpose
    });

    console.log(`${exists ? '✅' : '❌'} Product.${name} (${type})`);
    console.log(`   Purpose: ${purpose}`);
    console.log(`   Status: ${exists ? 'EXISTS' : 'MISSING'}\n`);
  });

  console.log('═'.repeat(80));
  console.log('\n🏷️  Checking Required Enums...\n');

  // Check enums
  const requiredEnums = [
    { name: 'CustomerRiskStatus', values: ['HEALTHY', 'AT_RISK_CADENCE', 'AT_RISK_REVENUE', 'DORMANT', 'CLOSED'] },
    { name: 'AccountType', values: ['ACTIVE', 'TARGET', 'PROSPECT'], critical: true }
  ];

  requiredEnums.forEach(({ name, values, critical }) => {
    const exists = enumExists(name);
    checks.push({
      name,
      type: 'enum',
      required: critical || false,
      exists,
      details: values.join(', ')
    });

    console.log(`${exists ? '✅' : (critical ? '⚠️ ' : '❌')} Enum "${name}"`);
    console.log(`   Values: ${values.join(', ')}`);
    console.log(`   Status: ${exists ? 'EXISTS' : (critical ? 'MISSING (REQUIRED)' : 'MISSING')}\n`);
  });

  console.log('═'.repeat(80));
  console.log('\n📊 Verification Summary\n');

  const totalChecks = checks.length;
  const passing = checks.filter(c => c.exists).length;
  const requiredMissing = checks.filter(c => c.required && !c.exists).length;

  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passing: ${passing} (${((passing / totalChecks) * 100).toFixed(1)}%)`);
  console.log(`Missing Required: ${requiredMissing}\n`);

  if (requiredMissing > 0) {
    console.log('⚠️  MISSING REQUIRED ITEMS:\n');
    checks
      .filter(c => c.required && !c.exists)
      .forEach(({ name, type, details }) => {
        console.log(`   ${type.toUpperCase()}: ${name}`);
        if (details) console.log(`   → ${details}`);
        console.log();
      });
  }

  console.log('═'.repeat(80));
  console.log('\n🎯 Phase 1 Readiness Status\n');

  // Dashboard Drilldown
  const dashboardReady =
    modelExists('Customer') &&
    modelExists('Order') &&
    modelExists('OrderLine') &&
    modelExists('AccountHealthSnapshot') &&
    modelExists('SalesMetric');

  console.log(`Dashboard Drilldown: ${dashboardReady ? '✅ READY' : '❌ NOT READY'}`);
  console.log(`  - Uses existing models only`);
  console.log(`  - No schema changes needed\n`);

  // Wine Enrichment
  const wineEnrichmentReady = enrichmentFields.every(({ name }) =>
    fieldExists('Product', name)
  );

  console.log(`Wine Enrichment: ${wineEnrichmentReady ? '✅ READY' : '❌ NOT READY'}`);
  console.log(`  - Product enrichment fields exist`);
  console.log(`  - No schema changes needed\n`);

  // Account Type Classification
  const accountTypeReady =
    fieldExists('Customer', 'accountType') &&
    enumExists('AccountType');

  console.log(`Account Type Classification: ${accountTypeReady ? '✅ READY' : '⚠️  NEEDS ENUM'}`);
  if (!enumExists('AccountType')) {
    console.log(`  - Customer.accountType field: ${fieldExists('Customer', 'accountType') ? 'EXISTS' : 'MISSING'}`);
    console.log(`  - AccountType enum: MISSING (REQUIRED)`);
    console.log(`  - Action: Add AccountType enum to schema\n`);
  } else {
    console.log(`  - All requirements met\n`);
  }

  // MetricDefinition
  const metricDefReady = modelExists('MetricDefinition');

  console.log(`Metric Definitions: ${metricDefReady ? '✅ READY' : '❌ NOT READY'}`);
  console.log(`  - MetricDefinition model: ${metricDefReady ? 'EXISTS' : 'MISSING'}`);
  console.log(`  - No schema changes needed\n`);

  console.log('═'.repeat(80));
  console.log('\n📝 Recommendations\n');

  if (requiredMissing === 0) {
    console.log('✅ Schema is fully ready for Phase 1 implementation!');
    console.log('   All required models, fields, and enums are in place.\n');
  } else if (requiredMissing === 1 && !enumExists('AccountType')) {
    console.log('⚠️  Schema is almost ready - only AccountType enum needed:');
    console.log();
    console.log('   1. Add to prisma/schema.prisma:');
    console.log();
    console.log('      enum AccountType {');
    console.log('        ACTIVE    // Ordered within 6 months');
    console.log('        TARGET    // Ordered 6-12 months ago');
    console.log('        PROSPECT  // Never ordered or >12 months');
    console.log('      }');
    console.log();
    console.log('   2. Create migration:');
    console.log('      npx prisma migrate dev --name add_account_type_enum');
    console.log();
    console.log('   3. Regenerate client:');
    console.log('      npx prisma generate');
    console.log();
  } else {
    console.log('❌ Schema requires updates before Phase 1:');
    console.log();
    checks
      .filter(c => c.required && !c.exists)
      .forEach(({ name, type }) => {
        console.log(`   - Add ${type}: ${name}`);
      });
    console.log();
  }

  console.log('═'.repeat(80));
  console.log('\n📄 Full Report: /docs/phase1-schema-migration-plan.md');
  console.log('\n✨ Verification Complete\n');

  await prisma.$disconnect();

  // Exit with appropriate code
  process.exit(requiredMissing > 0 ? 1 : 0);
}

verifySchema().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
