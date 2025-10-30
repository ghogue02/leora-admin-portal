const fs = require('fs');

const data = JSON.parse(fs.readFileSync('import-results/parsed-invoices-1760806180133.json', 'utf8'));

const stats = {
  total: data.length,
  hasInvoiceNumber: 0,
  hasDate: 0,
  hasTotal: 0,
  hasItems: 0,
  totalValue: 0,
};

data.forEach(inv => {
  if (inv.invoiceNumber) stats.hasInvoiceNumber++;
  if (inv.date) stats.hasDate++;
  if (inv.total) {
    stats.hasTotal++;
    stats.totalValue += inv.total;
  }
  if (inv.items && inv.items.length > 0) stats.hasItems++;
});

console.log('📊 PARSED DATA ANALYSIS');
console.log('='.repeat(60));
console.log(`Total Invoices:        ${stats.total.toLocaleString()}`);
console.log(`Has Invoice Number:    ${stats.hasInvoiceNumber.toLocaleString()} (${(stats.hasInvoiceNumber/stats.total*100).toFixed(1)}%)`);
console.log(`Has Date:              ${stats.hasDate.toLocaleString()} (${(stats.hasDate/stats.total*100).toFixed(1)}%)`);
console.log(`Has Total Amount:      ${stats.hasTotal.toLocaleString()} (${(stats.hasTotal/stats.total*100).toFixed(1)}%)`);
console.log(`Has Line Items:        ${stats.hasItems.toLocaleString()} (${(stats.hasItems/stats.total*100).toFixed(1)}%)`);
console.log();
console.log(`💰 Total Invoice Value: $${stats.totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`📊 Average Invoice:     $${(stats.totalValue/stats.total).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
