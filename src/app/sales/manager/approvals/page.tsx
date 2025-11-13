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

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

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

      // Show success toast
      toast.success('Order approved successfully', {
        description: 'Order has been moved to pending status',
      });

      // Reload approvals list
      await loadApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve order');
      toast.error('Failed to approve order', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
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

      // Show success toast
      toast.success('Order rejected', {
        description: `Reason: ${reason}`,
      });

      // Reload approvals list
      await loadApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject order');
      toast.error('Failed to reject order', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setProcessingId(null);
    }
  }, [loadApprovals]);

  // PHASE 2: Calculate dashboard statistics
  const stats = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0);
    const urgentOrders = orders.filter(order => {
      if (!order.deliveryDate) return false;
      const daysUntilDelivery = Math.floor(
        (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDelivery <= 2; // Delivery in 2 days or less
    }).length;

    const avgWaitTime = orders.length > 0
      ? Math.floor(
          orders.reduce((sum, order) => {
            const wait = new Date().getTime() - new Date(order.createdAt).getTime();
            return sum + wait / (1000 * 60 * 60); // Convert to hours
          }, 0) / orders.length
        )
      : 0;

    return {
      totalPending: orders.length,
      totalValue,
      urgentCount: urgentOrders,
      avgWaitHours: avgWaitTime,
    };
  }, [orders]);

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Approvals</p>
        <h1 className="text-2xl font-bold text-gray-900">Inventory-sensitive orders</h1>
        <p className="text-sm text-gray-600">
          Review orders that require manager attention before inventory can be released.
        </p>
      </header>

      {!loading && orders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Pending */}
          <div className="surface-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Clock className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPending}</p>
                <p className="text-xs text-gray-600">Pending Approvals</p>
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="surface-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <DollarSign className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-600">Total Value</p>
              </div>
            </div>
          </div>

          {/* Urgent Orders */}
          <div className="surface-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stats.urgentCount > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.urgentCount > 0 ? 'text-amber-700' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.urgentCount}</p>
                <p className="text-xs text-gray-600">Urgent (≤2 days)</p>
              </div>
            </div>
          </div>

          {/* Average Wait Time */}
          <div className="surface-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <CheckCircle className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.avgWaitHours}h</p>
                <p className="text-xs text-gray-600">Avg Wait Time</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="surface-card border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">Error</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="surface-card flex items-center justify-center p-12 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
        </div>
      ) : orders.length === 0 ? (
        <div className="surface-card border border-dashed border-gray-300 bg-gray-50 p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">No orders pending approval</p>
          <p className="mt-1 text-sm text-gray-600">
            All orders have sufficient inventory or have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <article key={order.id} className="surface-card p-6 shadow-sm">
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
                  className="touch-target rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === order.id ? 'Processing...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(order.id)}
                  disabled={processingId === order.id}
                  className="touch-target rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === order.id ? 'Approving...' : 'Approve Order'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
