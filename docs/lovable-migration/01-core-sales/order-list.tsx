/**
 * LOVABLE MIGRATION - Order List Component
 *
 * Simplified order management for customer portal
 * Original: /src/app/portal/orders/page.tsx
 *
 * FEATURES:
 * - Order history display
 * - Status tracking
 * - Order details view
 * - Invoice download
 */

'use client';

import { useCallback, useEffect, useState } from "react";
import { Download, Eye } from "lucide-react";

type OrderStatus = "DRAFT" | "SUBMITTED" | "FULFILLED" | "CANCELLED";

type Order = {
  id: string;
  orderedAt: string | null;
  status: OrderStatus;
  total: number;
  currency: string;
  lineCount: number;
  customer: {
    name: string;
  };
  invoice?: {
    invoiceNumber: string | null;
    status: string;
  };
};

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/portal/orders");
      if (!response.ok) throw new Error("Failed to load orders");

      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getStatusBadge = (status: OrderStatus) => {
    const styles = {
      DRAFT: "bg-gray-100 text-gray-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      FULFILLED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };

    const labels = {
      DRAFT: "Draft",
      SUBMITTED: "Submitted",
      FULFILLED: "Fulfilled",
      CANCELLED: "Cancelled",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-2">
          Track your order history and download invoices
        </p>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">No orders found</p>
            <a
              href="/portal/catalog"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Browse Catalog →
            </a>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.orderedAt
                      ? new Date(order.orderedAt).toLocaleDateString()
                      : "Draft"}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.lineCount} {order.lineCount === 1 ? "item" : "items"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.invoice?.invoiceNumber || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <a
                        href={`/portal/orders/${order.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View Order"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      {order.invoice && (
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{orders.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Fulfilled Orders</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {orders.filter((o) => o.status === "FULFILLED").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            ${orders
              .filter((o) => o.status === "FULFILLED")
              .reduce((sum, o) => sum + o.total, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
