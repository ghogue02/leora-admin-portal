/**
 * Compare Well Crafted vs Lovable Databases
 */

import { createClient } from '@supabase/supabase-js';

const WELLCRAFTED_URL = 'https://zqezunzlyjkseugujkrl.supabase.co';
const WELLCRAFTED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXp1bnpseWprc2V1Z3Vqa3JsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM1Mzk1OSwiZXhwIjoyMDc0OTI5OTU5fQ.wsMKWFKQBWa8qOSqSoGLH0xnhitT-NYV13s2wcCRfzk';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = '***SUPABASE_JWT_REMOVED***';

async function compareDatabases() {
  console.log('\n📊 Comparing Well Crafted vs Lovable Databases\n');
  console.log('='.repeat(80));

  const wellcrafted = createClient(WELLCRAFTED_URL, WELLCRAFTED_KEY);
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  // Tables to check with their name variations
  // Well Crafted uses PascalCase, Lovable uses lowercase
  const tables = [
    { name: 'Customer/customer', wc: 'Customer', lovable: 'customer' },
    { name: 'Product/product', wc: 'Product', lovable: 'product' },
    { name: 'Sku/sku', wc: 'Sku', lovable: 'sku' },
    { name: 'Order/order', wc: 'Order', lovable: 'order' },
    { name: 'OrderLine/orderline', wc: 'OrderLine', lovable: 'orderline' },
    { name: 'Invoice/invoice', wc: 'Invoice', lovable: 'invoice' },
    { name: 'User/user', wc: 'User', lovable: 'user' },
    { name: 'SalesRep/salesrep', wc: 'SalesRep', lovable: 'salesrep' },
    { name: 'PortalUser/portaluser', wc: 'PortalUser', lovable: 'portaluser' },
  ];

  console.log('\nTable Name        | Well Crafted | Lovable    | Difference | Status');
  console.log('-'.repeat(80));

  for (const { name, wc, lovable: lov } of tables) {
    try {
      const { count: wcCount } = await wellcrafted
        .from(wc)
        .select('*', { count: 'exact', head: true });

      const { count: lovCount } = await lovable
        .from(lov)
        .select('*', { count: 'exact', head: true });

      const diff = (wcCount ?? 0) - (lovCount ?? 0);
      const status = diff === 0 ? '✅ Match' : diff > 0 ? '⚠️ Missing' : '❓ Extra';

      console.log(
        `${name.padEnd(22)}| ${(wcCount ?? 0).toString().padStart(12)} | ${(lovCount ?? 0).toString().padStart(10)} | ${diff.toString().padStart(10)} | ${status}`
      );
    } catch (error) {
      console.log(`${name.padEnd(22)}| Error checking`);
    }
  }

  console.log('='.repeat(80));
  console.log('\n📋 Summary:\n');
  console.log('Well Crafted = Source database (fully populated with all fixes)');
  console.log('Lovable = Target database (partially populated)');
  console.log('\n⚠️ Differences show what needs to be migrated to Lovable\n');
}

compareDatabases();
