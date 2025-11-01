'use client';

/**
 * Manager Approvals Page
 *
 * Travis's HAL requirement: Manager approval for low-inventory orders
 *
 * Shows orders with requiresApproval=true (status=DRAFT)
 * Manager can:
 * - Review inventory situation
 * - Approve → status changes to PENDING, inventory allocated
 * - Reject → status changes to CANCELLED, inventory released (if any)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ApprovalOrder = {
  id: string;
  customer: {
    id: string;
    name: string;
    territory: string | null;
  };
  deliveryDate: string | null;
  warehouseLocation: string | null;
  total: number;
  createdAt: string;
  orderedAt: string | null;
  lines: Array<{
    id: string;
    quantity: number;
    sku: {
      code: string;
      product: {
        name: string;
      };
    };
    inventoryStatus?: {
      onHand: number;
      allocated: number;
      available: number;
      shortfall: number;
    };
  }>;
};

export default function ManagerApprovalsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ApprovalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sales/manager/approvals');
      if (!response.ok) throw new Error('Failed to load approvals');

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  const handleApprove = useCallback(async (orderId: string) => {
    if (!confirm('Approve this order? Inventory will be allocated and the order will proceed to pending.')) {
      return;
    }

    setProcessingId(orderId);
    setError(null);

    try {
      const response = await fetch(`/api/sales/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve order');
      }

      // Reload approvals list
      await loadApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve order');
    } finally {
      setProcessingId(null);
    }
  }, [loadApprovals]);

  const handleReject = useCallback(async (orderId: string) => {
    const reason = prompt('Reason for rejecting this order:');
    if (!reason) return;

    setProcessingId(orderId);
    setError(null);

    try {
      const response = await fetch(`/api/sales/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject order');
      }

      // Reload approvals list
      await loadApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject order');
    } finally {
      setProcessingId(null);
    }
  }, [loadApprovals]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Approvals</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and approve orders with insufficient inventory
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Error</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No orders pending approval</p>
          <p className="mt-1 text-sm text-gray-600">
            All orders have sufficient inventory or have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              {/* Order Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    <Link
                      href={`/sales/orders/${order.id}`}
                      className="hover:underline"
                    >
                      Order #{order.id.slice(0, 8)}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Customer: <strong>{order.customer.name}</strong>
                    {order.customer.territory && ` • Territory: ${order.customer.territory}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    Delivery: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not set'}
                    {order.warehouseLocation && ` • Warehouse: ${order.warehouseLocation}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    ${order.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Order Lines with Inventory Status */}
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Line Items:</p>
                {order.lines.map(line => {
                  const hasIssue = line.inventoryStatus && line.inventoryStatus.shortfall > 0;

                  return (
                    <div
                      key={line.id}
                      className={`flex items-center justify-between rounded-md border p-3 text-sm ${
                        hasIssue ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-gray-900">{line.sku.product.name}</span>
                        <span className="ml-2 text-gray-600">({line.sku.code})</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-gray-700">Qty: {line.quantity}</span>

                        {line.inventoryStatus && (
                          <div className={`text-xs ${hasIssue ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {hasIssue ? (
                              <>
                                <span className="font-semibold">⚠ Shortfall: {line.inventoryStatus.shortfall}</span>
                                <span className="ml-2">
                                  ({line.inventoryStatus.available} available / {line.quantity} requested)
                                </span>
                              </>
                            ) : (
                              <span className="font-semibold">✓ Sufficient ({line.inventoryStatus.available} available)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleReject(order.id)}
                  disabled={processingId === order.id}
                  className="rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === order.id ? 'Processing...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(order.id)}
                  disabled={processingId === order.id}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === order.id ? 'Approving...' : 'Approve Order'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
