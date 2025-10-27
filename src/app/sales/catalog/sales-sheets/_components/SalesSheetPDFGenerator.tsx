'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import { SelectedProduct, LayoutTemplate } from './SalesSheetBuilder';

type SalesSheetPDFGeneratorProps = {
  products: SelectedProduct[];
  layout: LayoutTemplate;
  sheetTitle: string;
  headerText: string;
  footerText: string;
  onClose: () => void;
};

export function SalesSheetPDFGenerator({
  products,
  layout,
  sheetTitle,
  headerText,
  footerText,
  onClose,
}: SalesSheetPDFGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  const generatePDF = async () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(sheetTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Header Text
      if (headerText) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const headerLines = doc.splitTextToSize(headerText, pageWidth - 40);
        doc.text(headerLines, 20, yPosition);
        yPosition += (headerLines.length * 5) + 10;
      }

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // Determine products per page based on layout
      const productsPerPage = layout === 'single-featured' ? 2 : layout === '4-grid' ? 4 : 3;

      // Products
      products.forEach((product, index) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        // Product header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(product.productName, 20, yPosition);
        yPosition += 6;

        // Brand and details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (product.brand) {
          doc.text(product.brand, 20, yPosition);
          yPosition += 5;
        }

        // Technical details line
        const details = [];
        if (product.vintage) details.push(product.vintage);
        if (product.region) details.push(product.region);
        if (product.abv) details.push(`${product.abv}% ABV`);

        if (details.length > 0) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(details.join(' • '), 20, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 7;
        }

        // Tasting Notes
        if (product.tastingNotes) {
          doc.setFontSize(9);

          if (product.tastingNotes.aroma) {
            doc.setFont('helvetica', 'bold');
            doc.text('Aroma: ', 20, yPosition);
            doc.setFont('helvetica', 'normal');
            const aromaLines = doc.splitTextToSize(product.tastingNotes.aroma, pageWidth - 50);
            doc.text(aromaLines, 40, yPosition);
            yPosition += (aromaLines.length * 4) + 2;
          }

          if (product.tastingNotes.palate) {
            doc.setFont('helvetica', 'bold');
            doc.text('Palate: ', 20, yPosition);
            doc.setFont('helvetica', 'normal');
            const palateLines = doc.splitTextToSize(product.tastingNotes.palate, pageWidth - 50);
            doc.text(palateLines, 40, yPosition);
            yPosition += (palateLines.length * 4) + 2;
          }

          if (product.tastingNotes.finish) {
            doc.setFont('helvetica', 'bold');
            doc.text('Finish: ', 20, yPosition);
            doc.setFont('helvetica', 'normal');
            const finishLines = doc.splitTextToSize(product.tastingNotes.finish, pageWidth - 50);
            doc.text(finishLines, 40, yPosition);
            yPosition += (finishLines.length * 4) + 2;
          }

          // Food Pairings
          if (product.tastingNotes.foodPairings && product.tastingNotes.foodPairings.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Food Pairings: ', 20, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(product.tastingNotes.foodPairings.join(', '), 55, yPosition);
            yPosition += 6;
          }
        }

        // Custom Text
        if (product.customText) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          const customLines = doc.splitTextToSize(product.customText, pageWidth - 40);
          doc.text(customLines, 20, yPosition);
          yPosition += (customLines.length * 4) + 2;
        }

        // Price
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const priceText = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: product.currency,
        }).format(product.price);
        doc.text(`${priceText} per unit`, 20, yPosition);
        yPosition += 10;

        // Divider between products
        if (index < products.length - 1) {
          doc.setDrawColor(220, 220, 220);
          doc.line(20, yPosition, pageWidth - 20, yPosition);
          yPosition += 10;
        }
      });

      // Footer
      if (footerText) {
        const footerY = pageHeight - 30;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const footerLines = doc.splitTextToSize(footerText, pageWidth - 40);
        doc.text(footerLines, 20, footerY);
      }

      // Generate filename
      const filename = `${sheetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;

      // Download
      doc.save(filename);

      // Success message
      alert('PDF generated successfully!');
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailPDF = async () => {
    if (!emailAddress) {
      alert('Please enter an email address');
      return;
    }

    // For now, just download and show message
    // In production, you would send the PDF via email API
    await generatePDF();
    alert(`PDF will be sent to ${emailAddress} (Email functionality coming soon)`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Generate PDF</h3>
            <p className="mt-1 text-sm text-gray-600">
              Download or email your sales sheet
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 space-y-4">
          {/* Summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Sheet Summary</h4>
            <dl className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Products:</dt>
                <dd className="font-medium text-gray-900">{products.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Layout:</dt>
                <dd className="font-medium text-gray-900">{layout}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Title:</dt>
                <dd className="font-medium text-gray-900">{sheetTitle}</dd>
              </div>
            </dl>
          </div>

          {/* Email Option */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email to (optional)
            </label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="customer@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to download only
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          {emailAddress ? (
            <button
              onClick={handleEmailPDF}
              disabled={generating}
              className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Email PDF'}
            </button>
          ) : (
            <button
              onClick={generatePDF}
              disabled={generating}
              className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
