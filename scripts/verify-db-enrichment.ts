import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });
const prisma = new PrismaClient();

(async () => {
  console.log('\n=== DATABASE ENRICHMENT VERIFICATION ===\n');
  
  const enriched = await prisma.product.count({ 
    where: { enrichedBy: { contains: 'accurate-v2' } } 
  });
  
  const total = await prisma.product.count();
  
  const samples = await prisma.product.findMany({
    where: { enrichedBy: { contains: 'accurate-v2' } },
    select: { name: true, enrichedBy: true, enrichedAt: true },
    orderBy: { enrichedAt: 'desc' },
    take: 10
  });
  
  console.log(`Total products in database: ${total}`);
  console.log(`Enriched products (accurate-v2): ${enriched}`);
  console.log(`Enrichment coverage: ${((enriched/total)*100).toFixed(1)}%`);
  console.log(`\nRecently enriched products (sample of 10):`);
  samples.forEach((p, i) => {
    console.log(`  ${i+1}. ${p.name.substring(0, 60)}${p.name.length > 60 ? '...' : ''}`);
  });
  
  await prisma.$disconnect();
})();