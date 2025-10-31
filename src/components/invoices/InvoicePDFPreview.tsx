/**
 * Invoice PDF Preview Component
 *
 * Shows iframe preview of generated PDF before download
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { InvoiceFormatType } from '@prisma/client';

interface InvoicePDFPreviewProps {
  invoiceId: string;
  invoiceNumber: string;
  formatType: InvoiceFormatType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePDFPreview({
  invoiceId,
  invoiceNumber,
  formatType,
  open,
  onOpenChange,
}: InvoicePDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatLabels = {
    STANDARD: 'Standard Invoice',
    VA_ABC_INSTATE: 'VA ABC In-State',
    VA_ABC_TAX_EXEMPT: 'VA ABC Tax-Exempt',
  };

  useEffect(() => {
    if (open && !pdfUrl) {
      generatePreview();
    }
  }, [open]);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `invoice-${invoiceNumber}.pdf`;
      link.click();
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice Preview - {invoiceNumber}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-gray-500">
                {formatLabels[formatType]}
              </span>
              {pdfUrl && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenInNewTab}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Preview your invoice before sending to customer
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center">
          {loading && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Generating PDF preview...</p>
            </div>
          )}

          {error && (
            <div className="text-center text-red-500">
              <p className="font-semibold mb-2">Error generating PDF</p>
              <p className="text-sm">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={generatePreview}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border rounded"
              title="Invoice Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
