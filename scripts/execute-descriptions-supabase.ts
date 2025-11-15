import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeChunks() {
  console.log('🔄 Executing description updates via Supabase client...\n');

  const scriptsDir = '/Users/greghogue/Leora2/scripts';
  const chunkFiles = readdirSync(scriptsDir)
    .filter(f => f.startsWith('mcp-chunk-') && f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/mcp-chunk-(\d+)\.sql/)?.[1] || '0');
      const numB = parseInt(b.match(/mcp-chunk-(\d+)\.sql/)?.[1] || '0');
      return numA - numB;
    });

  console.log(`📦 Found ${chunkFiles.length} chunks to execute\n`);

  let successfulChunks = 0;
  let failedChunks = 0;
  let totalUpdates = 0;

  for (const chunkFile of chunkFiles) {
    const chunkPath = join(scriptsDir, chunkFile);
    const chunkNum = chunkFile.match(/mcp-chunk-(\d+)\.sql/)?.[1] || '?';
    const sql = readFileSync(chunkPath, 'utf-8');
    const updateCount = sql.split('UPDATE').length - 1;

    console.log(`⚡ Executing Chunk ${chunkNum}/${chunkFiles.length} (${updateCount} updates)...`);

    try {
      // Execute using Supabase RPC for raw SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        // Try alternative: execute via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ sql_query: sql })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        console.log(`✅ Chunk ${chunkNum} completed successfully`);
        successfulChunks++;
        totalUpdates += updateCount;
      } else {
        console.log(`✅ Chunk ${chunkNum} completed successfully`);
        successfulChunks++;
        totalUpdates += updateCount;
      }

    } catch (error: any) {
      failedChunks++;
      console.error(`❌ Chunk ${chunkNum} failed:`, error.message);
      console.log('   Trying direct SQL execution...\n');

      // Fallback: try executing update by update
      const updates = sql.split('\n\n').filter(s => s.trim().startsWith('UPDATE'));
      let chunkSuccessCount = 0;

      for (const update of updates) {
        try {
          const { error: updateError } = await supabase.rpc('exec_sql', { sql_query: update });
          if (!updateError) {
            chunkSuccessCount++;
          }
        } catch {
          // Skip failed individual updates
        }
      }

      if (chunkSuccessCount > 0) {
        console.log(`   ✅ Partial success: ${chunkSuccessCount}/${updateCount} updates completed\n`);
        totalUpdates += chunkSuccessCount;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total chunks: ${chunkFiles.length}`);
  console.log(`✅ Successful: ${successfulChunks}`);
  console.log(`❌ Failed: ${failedChunks}`);
  console.log(`📝 Total updates applied: ${totalUpdates}`);
  console.log('='.repeat(60) + '\n');

  // Verify sample products
  console.log('🔍 Verifying sample products...\n');

  const sampleSKUs = ['SPA1072', 'SPA1074', 'ARG1001'];

  for (const skuCode of sampleSKUs) {
    const { data, error } = await supabase
      .from('Product')
      .select('name, description')
      .eq('skus.code', skuCode)
      .single();

    if (data) {
      console.log(`\n📦 ${skuCode}:`);
      console.log(`   Product: ${data.name}`);
      console.log(`   Description: ${data.description?.substring(0, 100)}...`);
    } else {
      console.log(`\n⚠️  ${skuCode}: Not found`);
    }
  }

  // Count products with descriptions
  console.log('\n📊 Final statistics...\n');

  const { count: totalProducts } = await supabase
    .from('Product')
    .select('*', { count: 'exact', head: true });

  const { count: withDescriptions } = await supabase
    .from('Product')
    .select('*', { count: 'exact', head: true })
    .not('description', 'is', null)
    .neq('description', '');

  console.log(`Total products: ${totalProducts}`);
  console.log(`Products with descriptions: ${withDescriptions}`);
  console.log(`Percentage: ${((withDescriptions! / totalProducts!) * 100).toFixed(1)}%`);
}

executeChunks()
  .then(() => {
    console.log('\n✅ Execution complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
