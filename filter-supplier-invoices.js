const fs = require('fs');

const unmatched = JSON.parse(fs.readFileSync('./unmatched-for-review.json', 'utf8'));

// Known suppliers (these are invoices FROM suppliers TO Well Crafted)
const suppliers = [
  'Noble Hill Wines',
  'MYS WINES INC',
  'CSEN Inc',
  'Point Seven',
  'Soil Expedition',
  'JAMES A YAEGER INC',
  'Kily Import'
];

const isSupplier = (name) => {
  if (!name) return false;
  return suppliers.some(s => name.includes(s));
};

const supplierInvoices = unmatched.filter(inv => isSupplier(inv.customerName));
const realCustomers = unmatched.filter(inv =>
  inv.customerName &&
  !isSupplier(inv.customerName) &&
  !inv.customerName.includes('Shipping method') &&
  inv.customerName.length > 2
);

console.log('📊 INVOICE TYPE ANALYSIS');
console.log('='.repeat(70));
console.log(`Total unmatched:        ${unmatched.length}`);
console.log(`Supplier invoices:      ${supplierInvoices.length} (${(supplierInvoices.length/unmatched.length*100).toFixed(1)}%)`);
console.log(`Real customer invoices: ${realCustomers.length} (${(realCustomers.length/unmatched.length*100).toFixed(1)}%)`);
console.log();

console.log('💰 Supplier Invoices (purchases):');
const supplierStats = {};
supplierInvoices.forEach(inv => {
  const name = inv.customerName;
  if (!supplierStats[name]) supplierStats[name] = { count: 0, total: 0 };
  supplierStats[name].count++;
  supplierStats[name].total += inv.total || 0;
});

Object.entries(supplierStats)
  .sort((a, b) => b[1].total - a[1].total)
  .forEach(([name, stats]) => {
    console.log(`  ${name}: ${stats.count} invoices, \$${stats.total.toLocaleString()}`);
  });

console.log();
console.log('📋 Unique real customers to add:', [...new Set(realCustomers.map(i => i.customerName))].length);

// Save filtered lists
fs.writeFileSync('./supplier-invoices.json', JSON.stringify(supplierInvoices, null, 2));
fs.writeFileSync('./real-customers-to-add.json', JSON.stringify(realCustomers, null, 2));

console.log();
console.log('✅ Files created:');
console.log('   supplier-invoices.json - Purchase orders (ignore these)');
console.log('   real-customers-to-add.json - Legitimate customers to add');
