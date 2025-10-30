const fs = require('fs');
const { execSync } = require('child_process');

const matches = JSON.parse(fs.readFileSync('./all-customer-matches.json', 'utf8'));
const DBURL = "postgresql://postgres.zqezunzlyjkseugujkrl:ZKK5pPySuCq7JhpO@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

console.log(`Updating ${matches.length} customer matches...\n`);

let updated = 0;
matches.forEach((m, i) => {
  try {
    const sql = `UPDATE "ImportedInvoices" SET matched_customer_id = '${m.customerId}' WHERE "referenceNumber" = ${m.refNum}`;
    execSync(`psql "${DBURL}" -c "${sql}"`, { stdio: 'ignore' });
    updated++;
    if ((i + 1) % 100 === 0) console.log(`Updated: ${i + 1}/${matches.length}`);
  } catch (e) {}
});

console.log(`\n✅ Successfully updated: ${updated}/${matches.length}`);
