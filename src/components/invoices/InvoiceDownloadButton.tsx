/**
 * Invoice Download Button Component
 *
 * Quick download button for invoices with loading state
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Eye } from 'lucide-react';
import { InvoiceFormatType } from '@prisma/client';
import { InvoicePDFPreview } from './InvoicePDFPreview';

interface InvoiceDownloadButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  formatType: InvoiceFormatType;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showPreview?: boolean;
}

export function InvoiceDownloadButton({
  invoiceId,
  invoiceNumber,
  formatType,
  variant = 'default',
  size = 'default',
  showPreview = true,
}: InvoiceDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {showPreview && (
          <Button
            variant="outline"
            size={size}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        )}

        <Button
          variant={variant}
          size={size}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {showPreview && (
        <InvoicePDFPreview
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          formatType={formatType}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  );
}
