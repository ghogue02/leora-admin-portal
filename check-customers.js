const fs = require('fs');

const data = JSON.parse(fs.readFileSync('import-results/parsed-invoices-1760811546877.json', 'utf8'));
const withCustomers = data.filter(i => i.customerName && i.customerName.length > 3 && !i.customerName.includes('shall be'));

console.log('Total invoices:', data.length);
console.log('With valid customer names:', withCustomers.length, '(' + (withCustomers.length/data.length*100).toFixed(1) + '%)');
console.log('\nSample customers:');
withCustomers.slice(0, 20).forEach(i => console.log('  ' + i.refNum + ': ' + i.customerName));
