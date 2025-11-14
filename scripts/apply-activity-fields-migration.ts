/**
 * Apply Activity Type-Specific Fields Migration
 *
 * Adds 8 new optional columns to the Activity table for dynamic conditional forms.
 * Run this script to apply the migration to the database.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Applying activity type-specific fields migration...');

  const migrationPath = path.join(
    process.cwd(),
    'prisma/migrations/20251114000000_add_activity_type_specific_fields/migration.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // Execute the migration SQL
    await prisma.$executeRawUnsafe(sql);

    console.log('✅ Migration applied successfully!');
    console.log('\nNew columns added to Activity table:');
    console.log('  - callDuration (TEXT)');
    console.log('  - visitDuration (TEXT)');
    console.log('  - attendees (TEXT)');
    console.log('  - location (TEXT)');
    console.log('  - changeType (TEXT)');
    console.log('  - effectiveDate (TIMESTAMP)');
    console.log('  - impactAssessment (TEXT)');
    console.log('  - portalInteraction (TEXT)');
    console.log('\n✨ Dynamic activity fields are now available!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
