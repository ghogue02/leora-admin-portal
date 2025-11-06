/**
 * Create Invoice Dialog Component
 *
 * Enhanced dialog for creating invoices with VA ABC field support
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InvoiceFormatType } from '@prisma/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceFormatSelector } from './InvoiceFormatSelector';
import { Loader2 } from 'lucide-react';
import { formatUTCDate } from '@/lib/dates';

interface CreateInvoiceDialogProps {
  orderId: string;
  customerId: string;
  customerName: string;
  customerState?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (invoiceId: string) => void;
  apiRoute?: 'admin' | 'sales'; // Which API route to use
}

export function CreateInvoiceDialog({
  orderId,
  customerId,
  customerName,
  customerState,
  open,
  onOpenChange,
  onSuccess,
  apiRoute = 'admin', // Default to admin for backward compatibility
}: CreateInvoiceDialogProps) {
  const deriveFormatForState = (state?: string | null): InvoiceFormatType => {
    if (state === 'VA') {
      return 'VA_ABC_INSTATE';
    }
    if (state && state !== 'VA') {
      return 'VA_ABC_TAX_EXEMPT';
    }
    return 'STANDARD';
  };

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Format, 2 = Details

  // Form state
  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormatType>(() =>
    deriveFormatForState(customerState)
  );
  const [recommendedFormat, setRecommendedFormat] = useState<InvoiceFormatType>(() =>
    deriveFormatForState(customerState)
  );
  const [poNumber, setPoNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [shippingMethod, setShippingMethod] = useState('Hand deliver');
  const [dueDate, setDueDate] = useState('');

  // Determine recommended format based on customer state
  useEffect(() => {
    const nextFormat = deriveFormatForState(customerState);
    setRecommendedFormat(nextFormat);
    setInvoiceFormat(nextFormat);
  }, [customerState]);

  // Set default due date (30 days from now)
  useEffect(() => {
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setDueDate(formatUTCDate(dueDate));
  }, []);

  const handleCreate = async () => {
    setLoading(true);

    try {
      const endpoint = apiRoute === 'sales'
        ? `/api/sales/orders/${orderId}/create-invoice`
        : `/api/sales/admin/orders/${orderId}/create-invoice`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate,
          poNumber: poNumber || undefined,
          specialInstructions: specialInstructions || undefined,
          shippingMethod,
          formatType: invoiceFormat,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Invoice creation failed:', response.status, error);
        throw new Error(error.error || `Failed to create invoice (${response.status})`);
      }

      const data = await response.json();
      const invoiceId = data.invoice.id;

      // Auto-open PDF in new tab
      const pdfUrl = `/api/invoices/${invoiceId}/pdf`;

      // Try to open PDF automatically
      const pdfWindow = window.open(pdfUrl, '_blank');

      // Check for pop-up blocker
      if (!pdfWindow || pdfWindow.closed || typeof pdfWindow.closed === 'undefined') {
        // Pop-up was blocked - show fallback
        alert(`Invoice created successfully!\n\nPop-up blocker detected. Click "Download PDF" to view your invoice.`);
      }

      onSuccess?.(invoiceId);
      onOpenChange(false);

      // Reset form
      setStep(1);
      setPoNumber('');
      setSpecialInstructions('');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert(error instanceof Error ? error.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice for {customerName}
            {step === 1 && ' - Select invoice format'}
            {step === 2 && ' - Enter invoice details'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div>
            <InvoiceFormatSelector
              selectedFormat={invoiceFormat}
              recommendedFormat={recommendedFormat}
              customerState={customerState}
              onChange={setInvoiceFormat}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="poNumber">Customer PO Number</Label>
              <Input
                id="poNumber"
                placeholder="Optional"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="shippingMethod">Shipping Method</Label>
              <Select value={shippingMethod} onValueChange={setShippingMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hand deliver">Hand deliver</SelectItem>
                  <SelectItem value="Common carrier">Common carrier</SelectItem>
                  <SelectItem value="Customer pickup">Customer pickup</SelectItem>
                  <SelectItem value="Third party">Third party</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Optional delivery or handling instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)}>
                Next: Invoice Details
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
