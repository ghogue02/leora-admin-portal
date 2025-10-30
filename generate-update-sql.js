const fs = require('fs');

const matches = JSON.parse(fs.readFileSync('./all-customer-matches.json', 'utf8'));

console.log('📝 Generating SQL UPDATE statements...\n');
console.log(`Total matches: ${matches.length}\n`);

const sqlStatements = [
  '-- Update ImportedInvoices with matched customer IDs',
  '-- Run this in Supabase SQL Editor',
  '',
  'BEGIN;',
  ''
];

matches.forEach(m => {
  sqlStatements.push(
    `UPDATE "ImportedInvoices" SET matched_customer_id = '${m.customerId}' WHERE "referenceNumber" = ${m.refNum}; -- ${m.pdfName}`
  );
});

sqlStatements.push('');
sqlStatements.push('COMMIT;');
sqlStatements.push('');
sqlStatements.push('-- Verify updates');
sqlStatements.push('SELECT COUNT(*) as matched_count FROM "ImportedInvoices" WHERE matched_customer_id IS NOT NULL;');

const sql = sqlStatements.join('\n');
fs.writeFileSync('./update-customers.sql', sql);

console.log('✅ SQL file created: update-customers.sql');
console.log(`   ${matches.length} UPDATE statements generated`);
console.log('\nTo apply:');
console.log('1. Open Supabase SQL Editor');
console.log('2. Copy/paste contents of update-customers.sql');
console.log('3. Run the query');
console.log(`4. ${matches.length} invoices will be matched to customers!`);
