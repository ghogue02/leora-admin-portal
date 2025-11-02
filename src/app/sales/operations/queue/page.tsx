'use client';

/**
 * Operations Queue Page
 *
 * Travis's HAL requirement: Operations team needs to see orders ready to process
 *
 * Features:
 * - Filter by delivery date, status, warehouse
 * - Bulk select orders
 * - Bulk print invoices (ZIP of PDFs)
 * - Bulk update status (mark as PICKED or DELIVERED)
 * - Shows only operational statuses (READY_TO_DELIVER, PICKED)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { List, Package } from 'lucide-react';

type QueueOrder = {
  id: string;
  customer: {
    id: string;
    name: string;
    territory: string | null;
    street1: string | null;
    city: string | null;
  };
  deliveryDate: string | null;
  warehouseLocation: string | null;
  deliveryTimeWindow: string | null;
  status: string;
  total: number;
  lineCount: number;
  specialInstructions: string | null;
};

type FilterState = {
  deliveryDate: string;
  status: string;
  warehouse: string;
};

const OPERATIONAL_STATUSES = [
  { value: 'READY_TO_DELIVER', label: 'Ready to Deliver' },
  { value: 'PICKED', label: 'Picked' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PENDING', label: 'Pending' },
];

export default function OperationsQueuePage() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // PHASE 2: View mode toggle
  const [viewMode, setViewMode] = useState<'list' | 'picklist'>('list');

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    deliveryDate: '',
    status: 'READY_TO_DELIVER',
    warehouse: 'all',
  });

  // Load orders
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ...(filters.deliveryDate && { deliveryDate: filters.deliveryDate }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.warehouse !== 'all' && { warehouse: filters.warehouse }),
      });

      const response = await fetch(`/api/sales/operations/queue?${params}`);
      if (!response.ok) throw new Error('Failed to load operations queue');

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Bulk selection handlers
  const toggleSelection = useCallback((orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedOrders(new Set(orders.map(o => o.id)));
  }, [orders]);

  const clearSelection = useCallback(() => {
    setSelectedOrders(new Set());
  }, []);

  // Bulk operations
  const handleBulkPrint = useCallback(async () => {
    if (selectedOrders.size === 0) {
      alert('Please select orders to print');
      return;
    }

    setBulkProcessing(true);
    try {
      const response = await fetch('/api/sales/orders/bulk-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate invoices');

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${filters.deliveryDate || 'batch'}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Successfully generated ${selectedOrders.size} invoices`, {
        description: 'ZIP file downloaded to your computer',
      });
      clearSelection();
    } catch (err) {
      toast.error('Failed to print invoices', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, filters.deliveryDate, clearSelection]);

  // PHASE 2: Group orders by warehouse for pick list view
  const pickList = useMemo(() => {
    const grouped: Record<string, {
      warehouse: string;
      orders: QueueOrder[];
      totalItems: number;
    }> = {};

    orders.forEach(order => {
      const warehouse = order.warehouseLocation || 'Unknown';
      if (!grouped[warehouse]) {
        grouped[warehouse] = {
          warehouse,
          orders: [],
          totalItems: 0,
        };
      }
      grouped[warehouse].orders.push(order);
      grouped[warehouse].totalItems += order.lineCount;
    });

    return Object.values(grouped).sort((a, b) => b.totalItems - a.totalItems);
  }, [orders]);

  const handleBulkStatusUpdate = useCallback(async (newStatus: string) => {
    if (selectedOrders.size === 0) {
      alert('Please select orders to update');
      return;
    }

    const statusLabel = OPERATIONAL_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
    if (!confirm(`Mark ${selectedOrders.size} orders as ${statusLabel}?`)) {
      return;
    }

    setBulkProcessing(true);
    try {
      const response = await fetch('/api/sales/orders/bulk-update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error('Failed to update orders');

      const result = await response.json();
      alert(`Updated ${result.updated} orders to ${statusLabel}`);

      clearSelection();
      await loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update orders');
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, loadOrders, clearSelection]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Queue</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage orders ready for picking and delivery
          </p>
        </div>

        {/* PHASE 2: View Mode Toggle */}
        {!loading && orders.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <List className="h-4 w-4" />
              List View
            </button>
            <button
              onClick={() => setViewMode('picklist')}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                viewMode === 'picklist'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="h-4 w-4" />
              Pick List
            </button>
          </div>
        )}
      </header>

      {/* Filters */}
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="deliveryDate" className="block text-xs font-medium text-gray-700 mb-1">
              Delivery Date
            </label>
            <input
              id="deliveryDate"
              type="date"
              value={filters.deliveryDate}
              onChange={(e) => setFilters(prev => ({ ...prev, deliveryDate: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {OPERATIONAL_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="warehouse" className="block text-xs font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <select
              id="warehouse"
              value={filters.warehouse}
              onChange={(e) => setFilters(prev => ({ ...prev, warehouse: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="all">All Warehouses</option>
              <option value="Baltimore">Baltimore</option>
              <option value="Warrenton">Warrenton</option>
              <option value="main">Main Warehouse</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilters({ deliveryDate: '', status: 'READY_TO_DELIVER', warehouse: 'all' })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold text-blue-900">{selectedOrders.size} orders selected</span>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-3 text-blue-700 underline hover:text-blue-900"
              >
                Clear selection
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBulkPrint}
                disabled={bulkProcessing}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkProcessing ? 'Generating...' : 'Print Invoices (ZIP)'}
              </button>

              <button
                type="button"
                onClick={() => handleBulkStatusUpdate('PICKED')}
                disabled={bulkProcessing}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark as Picked
              </button>

              <button
                type="button"
                onClick={() => handleBulkStatusUpdate('DELIVERED')}
                disabled={bulkProcessing}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark as Delivered
              </button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Error</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No orders in queue</p>
          <p className="mt-1 text-sm text-gray-600">
            {filters.deliveryDate || filters.status !== 'READY_TO_DELIVER' || filters.warehouse !== 'all'
              ? 'Try adjusting your filters'
              : 'Orders will appear here when sales reps mark them as Ready to Deliver'}
          </p>
        </div>
      ) : viewMode === 'picklist' ? (
        /* PHASE 2: Pick List View - Grouped by Warehouse */
        <div className="space-y-6">
          {pickList.map(group => (
            <section key={group.warehouse} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              {/* Warehouse Header */}
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      📦 {group.warehouse} Warehouse
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {group.orders.length} orders • {group.totalItems} total items to pick
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const warehouseOrderIds = group.orders.map(o => o.id);
                      setSelectedOrders(new Set(warehouseOrderIds));
                      toast.info(`Selected ${warehouseOrderIds.length} orders from ${group.warehouse}`);
                    }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Select All from This Warehouse
                  </button>
                </div>
              </div>

              {/* Orders in this warehouse */}
              <div className="divide-y divide-gray-200">
                {group.orders.map(order => (
                  <div key={order.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleSelection(order.id)}
                      className="mt-1 h-5 w-5 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/sales/orders/${order.id}`}
                            className="text-sm font-semibold text-gray-900 hover:underline"
                          >
                            Order #{order.id.slice(0, 8)}
                          </Link>
                          <p className="mt-1 text-sm text-gray-700">
                            {order.customer.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customer.street1 && `${order.customer.street1}, `}
                            {order.customer.city}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">${order.total.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{order.lineCount} items</p>
                          {order.deliveryDate && (
                            <p className="text-xs text-gray-600">
                              {new Date(order.deliveryDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          )}
                          {order.deliveryTimeWindow && order.deliveryTimeWindow !== 'anytime' && (
                            <p className="text-xs font-medium text-blue-700">
                              {order.deliveryTimeWindow}
                            </p>
                          )}
                        </div>
                      </div>
                      {order.specialInstructions && (
                        <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs">
                          <span className="font-semibold text-amber-900">⚠ Special:</span>{' '}
                          <span className="text-amber-800">{order.specialInstructions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* List View - Original */
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedOrders.size === orders.length && orders.length > 0}
                onChange={() => {
                  if (selectedOrders.size === orders.length) {
                    clearSelection();
                  } else {
                    selectAll();
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-900">
                Select All ({orders.length} orders)
              </span>
            </label>

            <span className="text-xs text-gray-500">
              {filters.deliveryDate && `Delivery: ${new Date(filters.deliveryDate).toLocaleDateString()}`}
            </span>
          </div>

          {/* Order Cards */}
          {orders.map(order => (
            <article
              key={order.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedOrders.has(order.id)}
                  onChange={() => toggleSelection(order.id)}
                  className="mt-1 h-5 w-5 rounded border-gray-300"
                />

                {/* Order Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        <Link
                          href={`/sales/orders/${order.id}`}
                          className="hover:underline"
                        >
                          Order #{order.id.slice(0, 8)}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-gray-700">
                        <strong>{order.customer.name}</strong>
                        {order.customer.territory && ` • ${order.customer.territory}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.customer.street1 && `${order.customer.street1}, `}
                        {order.customer.city}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${order.total.toFixed(2)}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        order.status === 'READY_TO_DELIVER' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'PICKED' ? 'bg-amber-100 text-amber-700' :
                        order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <span className="font-medium text-gray-600">Delivery:</span>{' '}
                      <span className="text-gray-900">
                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Warehouse:</span>{' '}
                      <span className="text-gray-900">{order.warehouseLocation || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Time Window:</span>{' '}
                      <span className="text-gray-900">{order.deliveryTimeWindow || 'Anytime'}</span>
                    </div>
                  </div>

                  {order.specialInstructions && (
                    <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs">
                      <span className="font-semibold text-amber-900">⚠ Special Instructions:</span>{' '}
                      <span className="text-amber-800">{order.specialInstructions}</span>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    {order.lineCount} line item{order.lineCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Summary */}
      {orders.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              Showing <strong className="text-gray-900">{orders.length}</strong> orders
            </span>
            <span className="text-gray-600">
              Total Value: <strong className="text-gray-900">
                ${orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
