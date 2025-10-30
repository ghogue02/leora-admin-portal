#!/usr/bin/env tsx

/**
 * Lovable Database Restore Script
 *
 * Restores database from backup files with verification.
 * Supports dry-run mode for testing.
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';

// Database configuration
const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const BATCH_SIZE = 100; // Insert records in batches

interface BackupFile {
  table: string;
  exportedAt: string;
  recordCount: number;
  expectedCount: number;
  records: any[];
}

interface RestoreMetadata {
  timestamp: string;
  backupPath: string;
  dryRun: boolean;
  tables: Array<{
    name: string;
    recordCount: number;
    backupChecksum: string;
    verifiedChecksum: string;
    checksumMatch: boolean;
    restoredCount: number;
    status: 'success' | 'warning' | 'error' | 'skipped';
    message?: string;
  }>;
  totalRecordsRestored: number;
}

/**
 * Calculate SHA256 checksum of data
 */
function calculateChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Parse command line arguments
 */
function parseArgs(): { backupPath: string; dryRun: boolean } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Backup path required');
    console.log('\nUsage:');
    console.log('  tsx restore-lovable.ts <backup-path> [--dry-run]');
    console.log('\nExample:');
    console.log('  tsx restore-lovable.ts /Users/greghogue/Leora2/backups/lovable-pre-cleanup-2025-10-23');
    console.log('  tsx restore-lovable.ts /Users/greghogue/Leora2/backups/lovable-pre-cleanup-2025-10-23 --dry-run');
    process.exit(1);
  }

  return {
    backupPath: args[0],
    dryRun: args.includes('--dry-run')
  };
}

/**
 * Load and verify backup file
 */
async function loadBackupFile(
  backupPath: string,
  tableName: string,
  metadata: any
): Promise<{ data: BackupFile; checksumMatch: boolean }> {
  const filePath = join(backupPath, `${tableName}.json`);

  console.log(`\n📂 Loading: ${tableName}.json`);

  const fileContent = await readFile(filePath, 'utf8');
  const data: BackupFile = JSON.parse(fileContent);

  // Verify checksum
  const calculatedChecksum = calculateChecksum(fileContent);
  const tableMetadata = metadata.tables.find((t: any) => t.name === tableName);
  const storedChecksum = tableMetadata?.checksum || '';
  const checksumMatch = calculatedChecksum === storedChecksum;

  console.log(`  📊 Records in backup: ${data.recordCount}`);
  console.log(`  🔐 Checksum: ${checksumMatch ? '✅ Valid' : '⚠️  Mismatch'}`);

  if (!checksumMatch && storedChecksum) {
    console.log(`     Expected: ${storedChecksum.substring(0, 16)}...`);
    console.log(`     Got:      ${calculatedChecksum.substring(0, 16)}...`);
  }

  return { data, checksumMatch };
}

/**
 * Restore table data
 */
async function restoreTable(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  records: any[],
  dryRun: boolean
): Promise<{ restoredCount: number; status: 'success' | 'error'; message?: string }> {
  try {
    if (dryRun) {
      console.log(`  🔍 DRY RUN: Would restore ${records.length} records to ${tableName}`);
      return { restoredCount: records.length, status: 'success' };
    }

    console.log(`  🔄 Restoring ${records.length} records...`);

    let restoredCount = 0;

    // Insert in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const { error } = await supabase
        .from(tableName)
        .insert(batch);

      if (error) {
        throw new Error(`Batch insert failed: ${error.message}`);
      }

      restoredCount += batch.length;

      if (restoredCount % 500 === 0 || restoredCount === records.length) {
        console.log(`    ↳ Restored ${restoredCount}/${records.length} records...`);
      }
    }

    console.log(`  ✅ Restored ${restoredCount} records successfully`);
    return { restoredCount, status: 'success' };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error restoring ${tableName}: ${errorMessage}`);
    return { restoredCount: 0, status: 'error', message: errorMessage };
  }
}

/**
 * Verify restore by counting records
 */
async function verifyRestore(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  expectedCount: number,
  dryRun: boolean
): Promise<{ actualCount: number; match: boolean }> {
  if (dryRun) {
    return { actualCount: expectedCount, match: true };
  }

  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`  ⚠️  Error verifying ${tableName}: ${error.message}`);
    return { actualCount: 0, match: false };
  }

  const actualCount = count || 0;
  const match = actualCount === expectedCount;

  console.log(`  🔍 Verification: ${actualCount} records in database ${match ? '✅' : '❌'}`);

  return { actualCount, match };
}

/**
 * Main restore function
 */
async function performRestore(): Promise<void> {
  const { backupPath, dryRun } = parseArgs();

  console.log('🔄 Starting Lovable Database Restore\n');
  console.log('═'.repeat(60));
  console.log(`📁 Backup path: ${backupPath}`);
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RESTORE'}`);
  console.log('═'.repeat(60));

  // Load backup metadata
  const metadataPath = join(backupPath, 'backup-metadata.json');
  console.log(`\n📋 Loading metadata: ${metadataPath}`);

  const metadataContent = await readFile(metadataPath, 'utf8');
  const backupMetadata = JSON.parse(metadataContent);

  console.log(`  📅 Backup date: ${backupMetadata.timestamp}`);
  console.log(`  📊 Total records: ${backupMetadata.totalRecords.toLocaleString()}`);

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Restore metadata
  const restoreMetadata: RestoreMetadata = {
    timestamp: new Date().toISOString(),
    backupPath,
    dryRun,
    tables: [],
    totalRecordsRestored: 0
  };

  // Process each table
  for (const tableInfo of backupMetadata.tables) {
    const tableName = tableInfo.name;

    try {
      // Load backup file
      const { data, checksumMatch } = await loadBackupFile(
        backupPath,
        tableName,
        backupMetadata
      );

      // Restore data
      const restoreResult = await restoreTable(
        supabase,
        tableName,
        data.records,
        dryRun
      );

      // Verify restore (optional, only if not dry-run)
      let verifyMatch = true;
      if (!dryRun && restoreResult.status === 'success') {
        const verification = await verifyRestore(
          supabase,
          tableName,
          restoreResult.restoredCount,
          dryRun
        );
        verifyMatch = verification.match;
      }

      restoreMetadata.tables.push({
        name: tableName,
        recordCount: data.recordCount,
        backupChecksum: tableInfo.checksum,
        verifiedChecksum: checksumMatch ? tableInfo.checksum : 'mismatch',
        checksumMatch,
        restoredCount: restoreResult.restoredCount,
        status: restoreResult.status,
        message: restoreResult.message
      });

      restoreMetadata.totalRecordsRestored += restoreResult.restoredCount;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error processing ${tableName}: ${errorMessage}`);

      restoreMetadata.tables.push({
        name: tableName,
        recordCount: 0,
        backupChecksum: '',
        verifiedChecksum: '',
        checksumMatch: false,
        restoredCount: 0,
        status: 'error',
        message: errorMessage
      });
    }
  }

  // Save restore metadata (if not dry-run)
  if (!dryRun) {
    const restoreMetadataPath = join(backupPath, `restore-metadata-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await writeFile(restoreMetadataPath, JSON.stringify(restoreMetadata, null, 2), 'utf8');
    console.log(`\n💾 Restore metadata saved: ${restoreMetadataPath}`);
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESTORE SUMMARY\n');

  console.log('Table Breakdown:');
  restoreMetadata.tables.forEach(table => {
    const icon = table.status === 'success' ? '✅' : '❌';
    console.log(`  ${icon} ${table.name.padEnd(15)} ${table.restoredCount.toString().padStart(6)} records`);
    if (table.message) {
      console.log(`     └─ ${table.message}`);
    }
  });

  console.log(`\n📈 Total Records ${dryRun ? 'Validated' : 'Restored'}: ${restoreMetadata.totalRecordsRestored.toLocaleString()}`);

  const errors = restoreMetadata.tables.filter(t => t.status === 'error');

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} table(s) failed to restore`);
    console.log('═'.repeat(60));
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n✅ Dry run completed successfully!');
    console.log('   Run without --dry-run to perform actual restore.');
  } else {
    console.log('\n✅ Restore completed successfully!');
  }

  console.log('═'.repeat(60));
}

// Import writeFile for saving metadata
import { writeFile } from 'fs/promises';

// Run restore
performRestore().catch(error => {
  console.error('\n💥 Restore failed:', error);
  process.exit(1);
});
