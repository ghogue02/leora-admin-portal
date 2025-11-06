/**
 * Sales Rep Order Detail Page
 *
 * Allows sales reps to:
 * - View order details for their customers
 * - Create invoices with VA ABC format support
 * - Download invoice PDFs
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog';
import { InvoiceDownloadButton } from '@/components/invoices/InvoiceDownloadButton';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { ArrowLeft, Pencil } from 'lucide-react';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [params.orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/orders/${params.orderId}`);
      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change the order status to ${newStatus}?`)) {
      return;
    }

    setUpdatingStatus(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/sales/orders/${params.orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setStatusMessage({
        type: 'success',
        text: data.message || `Status updated to ${newStatus}`,
      });

      // Refresh order data
      await fetchOrder();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update order status',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get available status transitions based on current status
  const getAvailableTransitions = (currentStatus: string): Array<{ value: string; label: string }> => {
    const transitions: Record<string, Array<{ value: string; label: string }>> = {
      DRAFT: [{ value: 'PENDING', label: 'Submit Order' }],
      PENDING: [{ value: 'READY_TO_DELIVER', label: 'Mark Ready to Deliver' }],
      READY_TO_DELIVER: [{ value: 'PICKED', label: 'Mark as Picked' }],
      PICKED: [{ value: 'DELIVERED', label: 'Mark as Delivered' }],
    };
    return transitions[currentStatus] || [];
  };


  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <p>Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <p className="text-red-600">Order not found or you don't have access to this order.</p>
        <Link href="/sales/orders" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs
          homeHref="/sales/dashboard"
          homeLabel="Sales"
          items={[
            { label: 'Orders', href: '/sales/orders' },
            { label: `Order #${order.id.substring(0, 8)}`, href: null },
          ]}
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Order #{order.id.substring(0, 8)}</h1>
        <p className="text-gray-600 mt-2">
          {order.customer.name} · {formatShortDate(order.orderedAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.lines.map((line: any) => (
                <div key={line.id} className="flex justify-between items-start border-b pb-4 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{line.sku.product.name}</p>
                    <p className="text-sm text-gray-600">
                      SKU: {line.sku.code} · Size: {line.sku.size || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Quantity: {line.quantity} {line.isSample && '(Sample)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(line.total, order.currency)}</p>
                    <p className="text-sm text-gray-600">
                      @ {formatCurrency(line.unitPrice, order.currency)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(order.total, order.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>

            {/* Status Messages */}
            {statusMessage && (
              <div className={`mb-4 p-3 rounded-md ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <p className="text-sm font-medium">{statusMessage.text}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'PICKED' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'READY_TO_DELIVER' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Status Change Actions */}
              {getAvailableTransitions(order.status).length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-2">Change Status</p>
                  <div className="space-y-2">
                    {getAvailableTransitions(order.status).map(transition => (
                      <button
                        key={transition.value}
                        onClick={() => handleStatusChange(transition.value)}
                        disabled={updatingStatus}
                        className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition"
                      >
                        {updatingStatus ? 'Updating...' : transition.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Ordered</p>
                <p>{formatShortDate(order.orderedAt)}</p>
              </div>
              {order.fulfilledAt && (
                <div>
                  <p className="text-sm text-gray-600">Fulfilled</p>
                  <p>{formatShortDate(order.fulfilledAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Invoice</h2>

            {order.invoices?.[0] ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-medium">{order.invoices[0].invoiceNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">{order.invoices[0].status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(order.invoices[0].total, order.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p>{formatShortDate(order.invoices[0].dueDate)}</p>
                </div>

                {/* PDF Download */}
                <div className="mt-6 pt-6 border-t">
                  <InvoiceDownloadButton
                    invoiceId={order.invoices[0].id}
                    invoiceNumber={order.invoices[0].invoiceNumber || 'DRAFT'}
                    formatType={order.invoices[0].invoiceFormatType || 'STANDARD'}
                    showPreview={true}
                  />
                </div>

                {/* Edit Order After Invoice - Sprint 2 Feature #4 */}
                {/* Allow editing delivered orders with invoice regeneration */}
                <div className="mt-4">
                  <Link
                    href={`/sales/orders/${order.id}/edit`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border-2 border-amber-500 text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 font-semibold transition"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Order & Regenerate Invoice
                  </Link>
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    ⚠ Editing will create a new invoice version
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-4">No invoice created yet</p>
                <button
                  onClick={() => setShowInvoiceDialog(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Invoice
                </button>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Customer</h2>
            <Link
              href={`/sales/customers/${order.customer.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {order.customer.name}
            </Link>
            {order.salesRep && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Sales Representative</p>
                <p className="font-medium">{order.salesRep.name}</p>
                <p className="text-sm text-gray-500">{order.salesRep.territory}</p>
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Link
                href={`/sales/customers/${order.customer.id}/edit`}
                className="inline-flex items-center gap-2 w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                Edit Customer
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CreateInvoiceDialog */}
      {order && !order.invoices?.[0] && (
        <CreateInvoiceDialog
          orderId={order.id}
          customerId={order.customerId}
          customerName={order.customer.name}
          customerState={order.customer.state}
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          onSuccess={fetchOrder}
          apiRoute="sales"
        />
      )}
    </div>
  );
}
