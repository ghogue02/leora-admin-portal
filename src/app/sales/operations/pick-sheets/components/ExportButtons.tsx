'use client';

import { Button } from '@/components/ui/button';
import { FileText, Printer, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonsProps {
  sheetId: string;
  sheetNumber: string;
  items: any[];
  pickerEmail?: string;
}

export function ExportButtons({ sheetId, sheetNumber, items, pickerEmail }: ExportButtonsProps) {
  const exportCSV = () => {
    const headers = ['Location', 'Pick Order', 'SKU', 'Product', 'Quantity', 'Customer', 'Picked'];
    const rows = items.map(item => [
      item.location ? `${item.location.aisle}-${item.location.row}-${item.location.shelf}` : '',
      item.pickOrder || '',
      item.sku,
      item.productName,
      item.quantity,
      item.customerName,
      item.picked ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pick-sheet-${sheetNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  const exportPDF = () => {
    // Create print-optimized view
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pick Sheet ${sheetNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 10px; }
          .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; font-weight: bold; }
          .location { font-family: monospace; font-size: 18px; font-weight: bold; }
          .sku { font-family: monospace; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #000; display: inline-block; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pick Sheet: ${sheetNumber}</h1>
          <p>Total Items: ${items.length}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>✓</th>
              <th>Location</th>
              <th>#</th>
              <th>SKU</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td><span class="checkbox"></span></td>
                <td class="location">${item.location ? `${item.location.aisle}-${item.location.row}-${item.location.shelf}` : 'N/A'}</td>
                <td>${item.pickOrder || '-'}</td>
                <td class="sku">${item.sku}</td>
                <td>${item.productName}</td>
                <td><strong>${item.quantity}</strong></td>
                <td>${item.customerName}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Print</button>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('PDF view opened');
  };

  const printSheet = () => {
    exportPDF(); // Use PDF view for printing
  };

  const emailPicker = () => {
    if (!pickerEmail) {
      toast.error('No picker email configured');
      return;
    }

    // Generate CSV for attachment
    const headers = ['Location', 'Pick Order', 'SKU', 'Product', 'Quantity', 'Customer'];
    const rows = items.map(item => [
      item.location ? `${item.location.aisle}-${item.location.row}-${item.location.shelf}` : '',
      item.pickOrder || '',
      item.sku,
      item.productName,
      item.quantity,
      item.customerName,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const csvData = encodeURIComponent(csv);

    const subject = `Pick Sheet ${sheetNumber}`;
    const body = `Please find attached your pick sheet ${sheetNumber} with ${items.length} items.`;

    window.location.href = `mailto:${pickerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success(`Email draft created for ${pickerEmail}`);
  };

  return (
    <div className="flex gap-2">
      <Button onClick={exportCSV} variant="outline" className="touch-target">
        <FileText className="mr-2 h-4 w-4" />
        CSV
      </Button>
      <Button onClick={exportPDF} variant="outline" className="touch-target">
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button onClick={printSheet} variant="outline" className="touch-target">
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      {pickerEmail && (
        <Button onClick={emailPicker} variant="outline" className="touch-target">
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
      )}
    </div>
  );
}
