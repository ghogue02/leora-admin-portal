'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InvoiceFormatType } from '@prisma/client';
import { formatUTCDate } from '@/lib/dates';
import { showError, showSuccess } from '@/lib/toast-helpers';
import { InvoiceDownloadButton } from '@/components/invoices/InvoiceDownloadButton';
import { Loader2 } from 'lucide-react';

const INVOICE_FORMAT_OPTIONS: Array<{ value: InvoiceFormatType; label: string }> = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'VA_ABC_INSTATE', label: 'VA ABC – In-State' },
  { value: 'VA_ABC_TAX_EXEMPT', label: 'VA ABC – Tax Exempt/Out-of-State' },
];

const SHIPPING_METHOD_PRESETS = [
  { value: 'Rep Delivery', label: 'Rep Delivery' },
  { value: 'WCB Delivery', label: 'WCB Delivery' },
  { value: 'Customer Pickup', label: 'Customer Pickup' },
  { value: 'Virginia Tax Exempt', label: 'Virginia Tax Exempt' },
];

type InvoiceSummary = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  total: number | null;
  dueDate: string | null;
  invoiceFormatType: InvoiceFormatType | null;
  shippingMethod?: string | null;
  specialInstructions?: string | null;
  poNumber?: string | null;
  paymentTermsText?: string | null;
};

type Props = {
  orderId: string;
  customerName: string;
  customerState?: string | null;
  customerPaymentTerms?: string | null;
  defaultPoNumber?: string | null;
  defaultSpecialInstructions?: string | null;
  invoice?: InvoiceSummary;
  onRefresh?: () => Promise<void> | void;
};

const deriveRecommendedFormat = (state?: string | null): InvoiceFormatType => {
  if (state?.toUpperCase() === 'VA') {
    return 'VA_ABC_INSTATE';
  }
  if (state && state.length > 0) {
    return 'VA_ABC_TAX_EXEMPT';
  }
  return 'STANDARD';
};

const deriveDueDateString = (existing?: string | null, paymentTerms?: string | null) => {
  if (existing) {
    try {
      return formatUTCDate(new Date(existing));
    } catch {
      // fall through to default
    }
  }

  const extractedDays = paymentTerms ? parseInt(paymentTerms.replace(/\D/g, ''), 10) : NaN;
  const days = Number.isFinite(extractedDays) && extractedDays > 0 ? extractedDays : 30;
  const base = new Date();
  base.setDate(base.getDate() + days);
  return formatUTCDate(base);
};

const sanitizePayloadString = (value: string) => (value.trim().length ? value.trim() : null);

export function OrderInvoicePanel({
  orderId,
  customerName,
  customerState,
  customerPaymentTerms,
  defaultPoNumber,
  defaultSpecialInstructions,
  invoice,
  onRefresh,
}: Props) {
  const recommendedFormat = useMemo(
    () => deriveRecommendedFormat(customerState),
    [customerState],
  );
  const [formState, setFormState] = useState(() => ({
    formatType: invoice?.invoiceFormatType ?? recommendedFormat,
    shippingMethod: invoice?.shippingMethod ?? SHIPPING_METHOD_PRESETS[0].value,
    dueDate: deriveDueDateString(invoice?.dueDate, customerPaymentTerms),
    poNumber: invoice?.poNumber ?? defaultPoNumber ?? '',
    specialInstructions: invoice?.specialInstructions ?? defaultSpecialInstructions ?? '',
  }));
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setFormState({
      formatType: invoice?.invoiceFormatType ?? recommendedFormat,
      shippingMethod: invoice?.shippingMethod ?? SHIPPING_METHOD_PRESETS[0].value,
      dueDate: deriveDueDateString(invoice?.dueDate, customerPaymentTerms),
      poNumber: invoice?.poNumber ?? defaultPoNumber ?? '',
      specialInstructions: invoice?.specialInstructions ?? defaultSpecialInstructions ?? '',
    });
  }, [
    invoice?.invoiceFormatType,
    invoice?.shippingMethod,
    invoice?.dueDate,
    invoice?.poNumber,
    invoice?.specialInstructions,
    recommendedFormat,
    customerPaymentTerms,
    defaultPoNumber,
    defaultSpecialInstructions,
  ]);

  const shippingOptions = useMemo(() => {
    if (!invoice?.shippingMethod) {
      return SHIPPING_METHOD_PRESETS;
    }

    const exists = SHIPPING_METHOD_PRESETS.some(
      (option) => option.value === invoice.shippingMethod,
    );
    if (exists) {
      return SHIPPING_METHOD_PRESETS;
    }

    return [
      { value: invoice.shippingMethod, label: invoice.shippingMethod },
      ...SHIPPING_METHOD_PRESETS,
    ];
  }, [invoice?.shippingMethod]);

  const handleFieldChange = <K extends keyof typeof formState>(field: K, value: (typeof formState)[K]) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openInvoicePdf = (invoiceId: string) => {
    if (typeof window === 'undefined') return;
    const pdfUrl = `/api/invoices/${invoiceId}/pdf`;
    const popup = window.open(pdfUrl, '_blank');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      showSuccess('Invoice ready', 'Download link opened in a new tab.');
    }
  };

  const createInvoice = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch(`/api/sales/orders/${orderId}/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formatType: formState.formatType,
          shippingMethod: formState.shippingMethod,
          dueDate: formState.dueDate,
          poNumber: formState.poNumber.trim() || undefined,
          specialInstructions: formState.specialInstructions.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create invoice');
      }

      const data = await response.json();
      showSuccess('Invoice created', 'PDF opened in a new tab.');
      openInvoicePdf(data.invoice.id);
      await onRefresh?.();
    } catch (error) {
      showError('Invoice creation failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const updateInvoice = async () => {
    if (!invoice || updating) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/sales/orders/${orderId}/invoice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formatType: formState.formatType,
          shippingMethod: formState.shippingMethod,
          dueDate: formState.dueDate,
          poNumber: formState.poNumber,
          specialInstructions: formState.specialInstructions,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update invoice');
      }

      const data = await response.json();
      showSuccess(
        'Invoice updated',
        data.regenerated ? 'PDF regenerated with new settings.' : 'Invoice settings saved.',
      );
      openInvoicePdf(invoice.id);
      await onRefresh?.();
    } catch (error) {
      showError('Invoice update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setUpdating(false);
    }
  };

  const formatOptions = INVOICE_FORMAT_OPTIONS;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">
          Invoice Format
        </label>
        <select
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
          value={formState.formatType}
          onChange={(event) => handleFieldChange('formatType', event.target.value as InvoiceFormatType)}
        >
          {formatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Recommended: {formatOptions.find((opt) => opt.value === recommendedFormat)?.label ?? 'Standard'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Shipping / Delivery Method
          </label>
          <select
            value={formState.shippingMethod}
            onChange={(event) => handleFieldChange('shippingMethod', event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            {shippingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
            Due Date
          </label>
          <input
            id="dueDate"
            type="date"
            value={formState.dueDate}
            onChange={(event) => handleFieldChange('dueDate', event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="poNumber" className="text-sm font-medium text-gray-700">
            Customer PO Number
          </label>
          <input
            id="poNumber"
            type="text"
            value={formState.poNumber}
            onChange={(event) => handleFieldChange('poNumber', event.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label htmlFor="specialInstructions" className="text-sm font-medium text-gray-700">
            Special Instructions
          </label>
          <textarea
            id="specialInstructions"
            value={formState.specialInstructions}
            onChange={(event) => handleFieldChange('specialInstructions', event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
            placeholder="Optional delivery notes"
          />
        </div>
      </div>

      {!invoice ? (
        <button
          type="button"
          onClick={createInvoice}
          disabled={creating}
          className="inline-flex w-full items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Invoice & Download PDF
        </button>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={updateInvoice}
            disabled={updating}
            className="inline-flex w-full items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Invoice & Regenerate PDF
          </button>
          <InvoiceDownloadButton
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber || 'DRAFT'}
            formatType={invoice.invoiceFormatType || 'STANDARD'}
            showPreview
          />
        </div>
      )}

      <p className="text-xs text-gray-500">
        {invoice
          ? `Current invoice ${invoice.invoiceNumber ?? 'draft'} for ${customerName}.`
          : 'Once created, the invoice PDF will open in a new tab for quick review.'}
      </p>
    </div>
  );
}
