'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { List, Package } from 'lucide-react';
import { ResponsiveCard } from '@/components/ui/responsive-card';

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
  const [viewMode, setViewMode] = useState<'list' | 'picklist'>('list');
  const [filters, setFilters] = useState<FilterState>({
    deliveryDate: '',
    status: 'READY_TO_DELIVER',
    warehouse: 'all',
  });

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
      const data = (await response.json()) as { orders?: QueueOrder[] };
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const toggleSelection = useCallback((orderId: string) => {
    setSelectedOrders((prev) => {
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
    setSelectedOrders(new Set(orders.map((o) => o.id)));
  }, [orders]);

  const clearSelection = useCallback(() => {
    setSelectedOrders(new Set());
  }, []);

  const handleBulkPrint = useCallback(async () => {
    if (selectedOrders.size === 0) return alert('Please select orders to print');
    setBulkProcessing(true);
    try {
      const response = await fetch('/api/sales/orders/bulk-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      });
      if (!response.ok) throw new Error('Failed to generate invoices');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices-${filters.deliveryDate || 'batch'}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Generated ${selectedOrders.size} invoices`);
      clearSelection();
    } catch (err) {
      toast.error('Failed to print invoices', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, filters.deliveryDate, clearSelection]);

  const pickList = useMemo(() => {
    const grouped: Record<
      string,
      { warehouse: string; orders: QueueOrder[]; totalItems: number }
    > = {};
    orders.forEach((order) => {
      const warehouse = order.warehouseLocation || 'Unknown';
      if (!grouped[warehouse]) {
        grouped[warehouse] = { warehouse, orders: [], totalItems: 0 };
      }
      grouped[warehouse].orders.push(order);
      grouped[warehouse].totalItems += order.lineCount;
    });
    return Object.values(grouped).sort((a, b) => b.totalItems - a.totalItems);
  }, [orders]);

  const handleBulkStatusUpdate = useCallback(
    async (newStatus: string) => {
      if (selectedOrders.size === 0) return alert('Please select orders to update');
      const statusLabel =
        OPERATIONAL_STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
      if (!confirm(`Mark ${selectedOrders.size} orders as ${statusLabel}?`)) return;
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
        await loadOrders();
        toast.success(`Updated orders to ${statusLabel}`);
        clearSelection();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update orders');
      } finally {
        setBulkProcessing(false);
      }
    },
    [selectedOrders, loadOrders, clearSelection],
  );

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Operations
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Delivery queue</h1>
          <p className="text-sm text-gray-600">
            Filter, bulk update, and print orders ready for fulfillment.
          </p>
        </div>
        {!loading && orders.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`touch-target flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('picklist')}
              className={`touch-target flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                viewMode === 'picklist'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="h-4 w-4" />
              Pick list
            </button>
          </div>
        )}
      </header>

      <ResponsiveCard className="p-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Delivery Date
            </label>
            <input
              type="date"
              value={filters.deliveryDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, deliveryDate: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="all">All statuses</option>
              {OPERATIONAL_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Warehouse</label>
            <select
              value={filters.warehouse}
              onChange={(e) => setFilters((prev) => ({ ...prev, warehouse: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="all">All warehouses</option>
              <option value="Baltimore">Baltimore</option>
              <option value="Warrenton">Warrenton</option>
              <option value="main">Main Warehouse</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                setFilters({ deliveryDate: '', status: 'READY_TO_DELIVER', warehouse: 'all' })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Clear filters
            </button>
          </div>
        </div>
      </ResponsiveCard>

      {selectedOrders.size > 0 && (
        <ResponsiveCard className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold text-blue-900">
                {selectedOrders.size} orders selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-3 text-blue-700 underline hover:text-blue-900"
              >
                Clear selection
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBulkPrint}
                disabled={bulkProcessing}
                className="touch-target rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Print invoices
              </button>
              {['PICKED', 'DELIVERED'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => void handleBulkStatusUpdate(status)}
                  disabled={bulkProcessing}
                  className="touch-target rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </ResponsiveCard>
      )}

      {loading ? (
        <section className="surface-card p-10 text-center text-gray-500 shadow-sm">
          Loading orders...
        </section>
      ) : error ? (
        <section className="surface-card border border-rose-200 bg-rose-50 p-10 text-center text-rose-700 shadow-sm">
          {error}
        </section>
      ) : orders.length === 0 ? (
        <section className="surface-card border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500 shadow-sm">
          No orders match the selected filters.
        </section>
      ) : viewMode === 'list' ? (
        <section className="space-y-4">
          <ResponsiveCard className="flex items-center justify-between border border-slate-200 bg-white p-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedOrders.size === orders.length && orders.length > 0}
                onChange={() =>
                  selectedOrders.size === orders.length ? clearSelection() : selectAll()
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="font-medium text-gray-900">
                Select all ({orders.length} orders)
              </span>
            </label>
            {filters.deliveryDate && (
              <span className="text-xs text-gray-500">
                Delivery: {new Date(filters.deliveryDate).toLocaleDateString()}
              </span>
            )}
          </ResponsiveCard>
          {orders.map((order) => (
            <article
              key={order.id}
              className={`surface-card border p-4 shadow-sm transition hover:shadow-md ${
                selectedOrders.has(order.id) ? 'ring-2 ring-gray-900/10' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedOrders.has(order.id)}
                  onChange={() => toggleSelection(order.id)}
                  className="mt-1 h-5 w-5 rounded border-gray-300"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Order #{order.id.slice(0, 8)}
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
                      <p className="text-lg font-bold text-gray-900">
                        ${order.total.toFixed(2)}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          order.status === 'READY_TO_DELIVER'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'PICKED'
                              ? 'bg-amber-100 text-amber-700'
                              : order.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <span className="font-medium text-gray-600">Delivery:</span>{' '}
                      <span className="text-gray-900">
                        {order.deliveryDate
                          ? new Date(order.deliveryDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Warehouse:</span>{' '}
                      <span className="text-gray-900">
                        {order.warehouseLocation || 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Time window:</span>{' '}
                      <span className="text-gray-900">
                        {order.deliveryTimeWindow || 'Anytime'}
                      </span>
                    </div>
                  </div>
                  {order.specialInstructions && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      <span className="font-semibold text-amber-900">⚠ Instructions:</span>{' '}
                      {order.specialInstructions}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    {order.lineCount} line item{order.lineCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="space-y-6">
          {pickList.map((warehouseGroup) => (
            <div key={warehouseGroup.warehouse} className="surface-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {warehouseGroup.warehouse}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {warehouseGroup.orders.length} orders • {warehouseGroup.totalItems} items
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    warehouseGroup.orders.forEach((order) => toggleSelection(order.id))
                  }
                  className="touch-target rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Toggle selection
                </button>
              </div>
              <div className="space-y-3">
                {warehouseGroup.orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{order.customer.name}</p>
                        <p className="text-xs text-gray-600">
                          {order.deliveryDate
                            ? new Date(order.deliveryDate).toLocaleDateString()
                            : 'No date'}
                          {order.deliveryTimeWindow && ` • ${order.deliveryTimeWindow}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Lines</p>
                        <p className="text-lg font-bold text-gray-900">{order.lineCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {orders.length > 0 && (
        <section className="surface-card border border-slate-200 p-4 text-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-gray-600">
              Showing <strong className="text-gray-900">{orders.length}</strong> orders
            </span>
            <span className="text-gray-600">
              Total value:{' '}
              <strong className="text-gray-900">
                ${orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </strong>
            </span>
          </div>
        </section>
      )}
    </main>
  );
}
