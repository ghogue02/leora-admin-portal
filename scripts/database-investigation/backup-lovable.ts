#!/usr/bin/env tsx

/**
 * Lovable Database Backup Script
 *
 * Creates a complete backup of all tables in the Lovable database
 * with verification and checksums.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';

// Database configuration
const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

// Tables to backup with expected record counts
const TABLES = [
  { name: 'customer', expectedCount: 4947 },
  { name: 'order', expectedCount: 2843 },
  { name: 'orderline', expectedCount: 2817 },
  { name: 'skus', expectedCount: 1285 },
  { name: 'product', expectedCount: 1888 },
  { name: 'invoice', expectedCount: 2112 }
];

const BATCH_SIZE = 1000; // Fetch records in batches to avoid memory issues

interface BackupMetadata {
  timestamp: string;
  tables: Array<{
    name: string;
    recordCount: number;
    expectedCount: number;
    fileSize: number;
    checksum: string;
    status: 'success' | 'warning' | 'error';
    message?: string;
  }>;
  totalRecords: number;
  totalSize: number;
  backupPath: string;
}

/**
 * Calculate SHA256 checksum of data
 */
function calculateChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Fetch all records from a table in batches
 */
async function fetchAllRecords(
  supabase: ReturnType<typeof createClient>,
  tableName: string
): Promise<any[]> {
  let allRecords: any[] = [];
  let offset = 0;
  let hasMore = true;

  console.log(`  📥 Fetching records from ${tableName}...`);

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`Error fetching ${tableName}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      offset += BATCH_SIZE;
      console.log(`    ↳ Fetched ${allRecords.length} records...`);
    } else {
      hasMore = false;
    }

    // Safety check to prevent infinite loops
    if (offset > 100000) {
      console.warn(`    ⚠️  Safety limit reached at ${offset} records`);
      hasMore = false;
    }
  }

  console.log(`  ✅ Total records fetched: ${allRecords.length}`);
  return allRecords;
}

/**
 * Backup a single table
 */
async function backupTable(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  expectedCount: number,
  backupDir: string
): Promise<{
  recordCount: number;
  fileSize: number;
  checksum: string;
  status: 'success' | 'warning' | 'error';
  message?: string;
}> {
  try {
    console.log(`\n📦 Backing up table: ${tableName}`);

    // Fetch all records
    const records = await fetchAllRecords(supabase, tableName);
    const recordCount = records.length;

    // Prepare data for export
    const exportData = {
      table: tableName,
      exportedAt: new Date().toISOString(),
      recordCount,
      expectedCount,
      records
    };

    // Convert to JSON with pretty print
    const jsonData = JSON.stringify(exportData, null, 2);
    const fileSize = Buffer.byteLength(jsonData, 'utf8');
    const checksum = calculateChecksum(jsonData);

    // Write to file
    const filePath = join(backupDir, `${tableName}.json`);
    await writeFile(filePath, jsonData, 'utf8');

    // Determine status
    let status: 'success' | 'warning' | 'error' = 'success';
    let message: string | undefined;

    if (recordCount !== expectedCount) {
      status = 'warning';
      message = `Record count mismatch: got ${recordCount}, expected ${expectedCount}`;
      console.log(`  ⚠️  ${message}`);
    }

    console.log(`  ✅ Saved: ${filePath}`);
    console.log(`  📊 Records: ${recordCount} | Size: ${formatBytes(fileSize)}`);
    console.log(`  🔐 Checksum: ${checksum.substring(0, 16)}...`);

    return { recordCount, fileSize, checksum, status, message };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error backing up ${tableName}: ${errorMessage}`);
    return {
      recordCount: 0,
      fileSize: 0,
      checksum: '',
      status: 'error',
      message: errorMessage
    };
  }
}

/**
 * Main backup function
 */
async function performBackup(): Promise<void> {
  console.log('🚀 Starting Lovable Database Backup\n');
  console.log('═'.repeat(60));

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create backup directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `/Users/greghogue/Leora2/backups/lovable-pre-cleanup-${timestamp}`;

  console.log(`📁 Backup directory: ${backupDir}\n`);
  await mkdir(backupDir, { recursive: true });

  // Backup all tables
  const metadata: BackupMetadata = {
    timestamp: new Date().toISOString(),
    tables: [],
    totalRecords: 0,
    totalSize: 0,
    backupPath: backupDir
  };

  for (const table of TABLES) {
    const result = await backupTable(
      supabase,
      table.name,
      table.expectedCount,
      backupDir
    );

    metadata.tables.push({
      name: table.name,
      recordCount: result.recordCount,
      expectedCount: table.expectedCount,
      fileSize: result.fileSize,
      checksum: result.checksum,
      status: result.status,
      message: result.message
    });

    metadata.totalRecords += result.recordCount;
    metadata.totalSize += result.fileSize;
  }

  // Save metadata
  const metadataPath = join(backupDir, 'backup-metadata.json');
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 BACKUP SUMMARY\n');

  console.log('Table Breakdown:');
  metadata.tables.forEach(table => {
    const icon = table.status === 'success' ? '✅' :
                 table.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${table.name.padEnd(15)} ${table.recordCount.toString().padStart(6)} records  ${formatBytes(table.fileSize).padStart(10)}`);
    if (table.message) {
      console.log(`     └─ ${table.message}`);
    }
  });

  console.log(`\n📈 Total Records: ${metadata.totalRecords.toLocaleString()}`);
  console.log(`💾 Total Size: ${formatBytes(metadata.totalSize)}`);
  console.log(`📁 Location: ${backupDir}`);
  console.log(`📋 Metadata: ${metadataPath}`);

  // Check for warnings or errors
  const errors = metadata.tables.filter(t => t.status === 'error');
  const warnings = metadata.tables.filter(t => t.status === 'warning');

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} table(s) failed to backup`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} table(s) have warnings`);
  }

  console.log('\n✅ Backup completed successfully!');
  console.log('═'.repeat(60));
}

// Run backup
performBackup().catch(error => {
  console.error('\n💥 Backup failed:', error);
  process.exit(1);
});
