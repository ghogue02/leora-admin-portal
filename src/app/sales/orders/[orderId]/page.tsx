/**
 * Sales Rep Order Detail Page
 *
 * Allows sales reps to:
 * - View order details for their customers
 * - Create invoices with VA ABC format support
 * - Download invoice PDFs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { ArrowLeft, Pencil } from 'lucide-react';
import { ORDER_USAGE_LABELS, type OrderUsageCode } from '@/constants/orderUsage';
import { OrderInvoicePanel } from '@/components/orders/OrderInvoicePanel';

const ORDER_STATUS_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'PENDING', label: 'Pending', description: 'Rep is still building the order.' },
  { value: 'READY_TO_DELIVER', label: 'Ready to Deliver', description: 'Hand off to operations for picking.' },
  { value: 'PICKED', label: 'Picked', description: 'Order has been staged and is ready to leave.' },
  { value: 'DELIVERED', label: 'Delivered', description: 'Order delivered and inventory captured.' },
];

export default function SalesOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statusSelection, setStatusSelection] = useState<string>('PENDING');

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/orders/${params.orderId}`);
      const data = await response.json();
      setOrder(data.order);
      setStatusSelection(data.order?.status ?? 'PENDING');
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  }, [params.orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = async (newStatus: string) => {
    if (order?.status === newStatus) {
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
            { label: order.orderNumber || `Order #${order.id.substring(0, 8)}`, href: null },
          ]}
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">{order.orderNumber || `Order #${order.id.substring(0, 8)}`}</h1>
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
                    <p className="mt-1 text-xs text-gray-500">
                      {line.usageType ? (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                          {ORDER_USAGE_LABELS[(line.usageType as OrderUsageCode)] ?? line.usageType}
                        </span>
                      ) : (
                        <span className="italic text-gray-400">Standard sale</span>
                      )}
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

              <div className="pt-3 border-t space-y-3">
                <p className="text-sm text-gray-600">Update Status</p>
                <div className="space-y-2">
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition ${
                        statusSelection === option.value
                          ? 'border-gray-900 bg-gray-900/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={statusSelection === option.value}
                        onChange={(event) => setStatusSelection(event.target.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium text-gray-900">{option.label}</span>
                        <span className="block text-xs text-gray-600">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleStatusChange(statusSelection)}
                  disabled={updatingStatus || statusSelection === order.status}
                  className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>

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
            <OrderInvoicePanel
              orderId={order.id}
              customerName={order.customer.name}
              customerState={order.customer.state}
              customerPaymentTerms={order.customer.paymentTerms}
              defaultPoNumber={order.poNumber}
              defaultSpecialInstructions={order.specialInstructions}
              invoice={order.invoices?.[0]}
              onRefresh={fetchOrder}
            />
            <div className="mt-4">
              <Link
                href={`/sales/orders/${order.id}/edit`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 border-2 border-amber-500 text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 font-semibold transition mt-4"
              >
                <Pencil className="h-4 w-4" />
                Edit Order & Regenerate Invoice
              </Link>
              <p className="text-xs text-amber-600 mt-2 text-center">
                ⚠ Editing will create a new invoice version
              </p>
            </div>
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

    </div>
  );
}
