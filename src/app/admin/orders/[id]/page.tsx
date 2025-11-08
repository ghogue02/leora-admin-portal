"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Order } from "@/types/orders";

type OrderDetail = Order & {
  lines: LineItem[];
  invoice: InvoiceInfo | null;
  portalUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  auditLogs: AuditLog[];
};

type LineItem = {
  id: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  total: number;
  sku: {
    id: string;
    code: string;
    size: string | null;
    unitOfMeasure: string | null;
    product: {
      id: string;
      name: string;
      brand: string | null;
    };
  };
};

type InvoiceInfo = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  subtotal: number;
  total: number;
  dueDate: string | null;
  issuedAt: string | null;
  payments: Payment[];
  paidAmount: number;
  outstandingAmount: number;
};

type Payment = {
  id: string;
  amount: number;
  receivedAt: string;
  method: string;
  reference: string | null;
};

type AuditLogChange = Record<string, { from: unknown; to: unknown }>;
type AuditLogMetadata = Record<string, unknown>;
type AuditLog = {
  id: string;
  action: string;
  changes: AuditLogChange | null;
  metadata: AuditLogMetadata | null;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  } | null;
};

const ORDER_STATUSES = ["DRAFT", "SUBMITTED", "FULFILLED", "CANCELLED", "PARTIALLY_FULFILLED"];
type OrderUpdatePayload = Partial<{
  customerId: string;
  status: string;
  orderedAt: string | null;
  deliveredAt: string | null;
  fulfilledAt: string | null;
  deliveryWeek: number | null;
  currency: string;
  isFirstOrder: boolean;
}>;

type LineItemUpdatePayload = Partial<Pick<LineItem, "quantity" | "unitPrice" | "isSample">>;

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [skus, setSkus] = useState<
    Array<{
      id: string;
      code: string;
      product: { name: string; brand: string | null };
      defaultPrice: number;
    }>
  >([]);
  const [editingLineItem, setEditingLineItem] = useState<string | null>(null);
  const [showAddLineItem, setShowAddLineItem] = useState(false);
  const [newLineItem, setNewLineItem] = useState<{
    skuId: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
  }>({
    skuId: "",
    quantity: 1,
    unitPrice: 0,
    isSample: false,
  });

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      console.error("Failed to fetch order:", error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch("/api/sales/customers");
      const data = await response.json();
      setCustomers(
        (data.customers || []).map((customer: { id: string; name: string }) => ({
          id: customer.id,
          name: customer.name,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  }, []);

  const fetchSkus = useCallback(async () => {
    try {
      const response = await fetch("/api/sales/catalog/skus");
      const data = await response.json();
      setSkus(
        (data.skus || []).map(
          (sku: {
            id: string;
            code: string;
            product: { name: string; brand: string | null };
            pricePerUnit: number | null;
          }) => ({
            id: sku.id,
            code: sku.code,
            product: sku.product,
            defaultPrice: sku.pricePerUnit ?? 0,
          })
        )
      );
    } catch (error) {
      console.error("Failed to fetch SKUs:", error);
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;
    fetchOrder();
    fetchCustomers();
    fetchSkus();
  }, [orderId, fetchOrder, fetchCustomers, fetchSkus]);

  const handleUpdateOrder = async (updates: OrderUpdatePayload) => {
    if (!orderId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchOrder();
      } else {
        alert("Failed to update order");
      }
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!orderId) return;
    if (!newLineItem.skuId || newLineItem.quantity <= 0) {
      alert("Please select a SKU and enter a valid quantity");
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLineItem),
      });

      if (response.ok) {
        setShowAddLineItem(false);
        setNewLineItem({ skuId: "", quantity: 1, unitPrice: 0, isSample: false });
        fetchOrder();
      } else {
        alert("Failed to add line item");
      }
    } catch (error) {
      console.error("Failed to add line item:", error);
      alert("Failed to add line item");
    }
  };

  const handleUpdateLineItem = async (
    lineItemId: string,
    updates: LineItemUpdatePayload
  ) => {
    if (!orderId) return;
    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/line-items/${lineItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        setEditingLineItem(null);
        fetchOrder();
      } else {
        alert("Failed to update line item");
      }
    } catch (error) {
      console.error("Failed to update line item:", error);
      alert("Failed to update line item");
    }
  };

  const handleDeleteLineItem = async (lineItemId: string) => {
    if (!orderId) return;
    if (!confirm("Are you sure you want to delete this line item?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/line-items/${lineItemId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        fetchOrder();
      } else {
        alert("Failed to delete line item");
      }
    } catch (error) {
      console.error("Failed to delete line item:", error);
      alert("Failed to delete line item");
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    const reason = prompt("Please provide a reason for cancellation:");
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        fetchOrder();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Failed to cancel order:", error);
      alert("Failed to cancel order");
    }
  };

  const handleCreateInvoice = async () => {
    if (!orderId) return;
    if (!confirm("Create an invoice for this order?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        fetchOrder();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create invoice");
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
      alert("Failed to create invoice");
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-600">Invalid order identifier.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Link href="/admin/orders" className="text-blue-600 hover:text-blue-800 mt-4">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/orders"
                className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
              >
                ← Back to Orders
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.id.substring(0, 8)}
              </h1>
              <p className="mt-2 text-gray-600">Created {formatDateTime(order.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              {order.status !== "CANCELLED" && (
                <button
                  onClick={handleCancelOrder}
                  className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50"
                >
                  Cancel Order
                </button>
              )}
              <button
                onClick={() => fetchOrder()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Order Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <select
                    value={order.customerId}
                    onChange={(e) => handleUpdateOrder({ customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  >
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Status
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => handleUpdateOrder({ status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      order.orderedAt
                        ? new Date(order.orderedAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      handleUpdateOrder({ orderedAt: new Date(e.target.value).toISOString() })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Representative
                  </label>
                  <input
                    type="text"
                    value={order.salesRep?.name || "Not assigned"}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Week
                  </label>
                  <input
                    type="number"
                    value={order.deliveryWeek || ""}
                    onChange={(e) =>
                      handleUpdateOrder({
                        deliveryWeek: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={order.currency}
                    onChange={(e) => handleUpdateOrder({ currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Line Items</h2>
                <button
                  onClick={() => setShowAddLineItem(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Line Item
                </button>
              </div>

              {showAddLineItem && (
                <div className="mb-4 p-4 bg-blue-50 rounded-md">
                  <h3 className="font-medium mb-2">Add New Line Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <select
                      value={newLineItem.skuId}
                      onChange={(e) => {
                        const sku = skus.find((s) => s.id === e.target.value);
                        setNewLineItem({
                          ...newLineItem,
                          skuId: e.target.value,
                          unitPrice: sku ? sku.defaultPrice : 0,
                        });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select SKU</option>
                      {skus.map((sku) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.code} - {sku.product.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={newLineItem.quantity}
                      onChange={(e) =>
                        setNewLineItem({ ...newLineItem, quantity: parseInt(e.target.value) })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Price"
                      value={newLineItem.unitPrice}
                      onChange={(e) =>
                        setNewLineItem({
                          ...newLineItem,
                          unitPrice: parseFloat(e.target.value),
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <div className="flex gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newLineItem.isSample}
                          onChange={(e) =>
                            setNewLineItem({ ...newLineItem, isSample: e.target.checked })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">Sample</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAddLineItem}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddLineItem(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        SKU Code
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Sample
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2 whitespace-nowrap font-mono text-sm">
                          {line.sku.code}
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm text-gray-900">{line.sku.product.name}</div>
                          {line.sku.product.brand && (
                            <div className="text-xs text-gray-500">{line.sku.product.brand}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {editingLineItem === line.id ? (
                            <input
                              type="number"
                              defaultValue={line.quantity}
                              onBlur={(e) =>
                                handleUpdateLineItem(line.id, {
                                  quantity: parseInt(e.target.value),
                                })
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded"
                              autoFocus
                            />
                          ) : (
                            <span onClick={() => setEditingLineItem(line.id)}>
                              {line.quantity}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatCurrency(line.unitPrice, order.currency)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {line.isSample ? (
                            <span className="text-green-600 text-sm">Yes</span>
                          ) : (
                            <span className="text-gray-400 text-sm">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap font-medium">
                          {formatCurrency(line.total, order.currency)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleDeleteLineItem(line.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-2 text-right font-semibold text-gray-900"
                      >
                        Order Total:
                      </td>
                      <td className="px-4 py-2 font-bold text-lg text-gray-900">
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Fulfillment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Fulfillment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fulfilled At
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      order.fulfilledAt
                        ? new Date(order.fulfilledAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      handleUpdateOrder({
                        fulfilledAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivered At
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      order.deliveredAt
                        ? new Date(order.deliveredAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      handleUpdateOrder({
                        deliveredAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={order.isFirstOrder}
                      onChange={(e) => handleUpdateOrder({ isFirstOrder: e.target.checked })}
                      className="mr-2"
                      disabled={saving}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      First Order (Read-only once set)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
              <div className="space-y-4">
                {order.auditLogs.length === 0 ? (
                  <p className="text-gray-500">No activity logged yet</p>
                ) : (
                  order.auditLogs.map((log) => (
                    <div key={log.id} className="border-l-4 border-blue-400 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {log.action.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-gray-600">
                            By {log.user?.fullName || "System"} • {formatDateTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                      {log.changes && (
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invoice Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Invoice Information</h2>
              {order.invoice ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Invoice Number</p>
                    <p className="font-medium">{order.invoice.invoiceNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.invoice.status === "PAID"
                          ? "bg-green-100 text-green-800"
                          : order.invoice.status === "OVERDUE"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.invoice.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(order.invoice.total, order.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(order.invoice.paidAmount, order.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(order.invoice.outstandingAmount, order.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium">{formatDate(order.invoice.dueDate)}</p>
                  </div>
                  {order.invoice.payments.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Payments</p>
                      <div className="space-y-2">
                        {order.invoice.payments.map((payment) => (
                          <div key={payment.id} className="text-sm bg-gray-50 p-2 rounded">
                            <p>
                              {formatCurrency(payment.amount, order.currency)} via{" "}
                              {payment.method}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatDate(payment.receivedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 mb-4">No invoice created yet</p>
                  <button
                    onClick={handleCreateInvoice}
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
            </div>

            {/* Order Meta */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Order Meta</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Order ID</p>
                  <p className="font-mono">{order.id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Created</p>
                  <p>{formatDateTime(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p>{formatDateTime(order.updatedAt)}</p>
                </div>
                {order.portalUser && (
                  <div>
                    <p className="text-gray-600">Created By</p>
                    <p>{order.portalUser.fullName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
