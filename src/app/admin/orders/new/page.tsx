"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LineItem = {
  skuId: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  sku?: {
    code: string;
    product: {
      name: string;
      brand: string | null;
    };
    pricePerUnit: number | null;
  };
};

export default function NewOrderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    orderedAt: new Date().toISOString().slice(0, 16),
    status: "DRAFT",
    currency: "USD",
    deliveryWeek: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [newLineItem, setNewLineItem] = useState({
    skuId: "",
    quantity: 1,
    unitPrice: 0,
    isSample: false,
  });

  useEffect(() => {
    fetchCustomers();
    fetchSkus();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/sales/customers");
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchSkus = async () => {
    try {
      const response = await fetch("/api/sales/catalog/skus");
      const data = await response.json();
      setSkus(data.skus || []);
    } catch (error) {
      console.error("Failed to fetch SKUs:", error);
    }
  };

  const handleAddLineItem = () => {
    if (!newLineItem.skuId || newLineItem.quantity <= 0) {
      alert("Please select a SKU and enter a valid quantity");
      return;
    }

    const sku = skus.find((s) => s.id === newLineItem.skuId);
    const lineItem: LineItem = {
      ...newLineItem,
      sku,
    };

    setLineItems([...lineItems, lineItem]);
    setNewLineItem({
      skuId: "",
      quantity: 1,
      unitPrice: 0,
      isSample: false,
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      alert("Please select a customer");
      return;
    }

    if (lineItems.length === 0) {
      alert("Please add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          deliveryWeek: formData.deliveryWeek ? parseInt(formData.deliveryWeek) : null,
          lineItems: lineItems.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            isSample: item.isSample,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/admin/orders/${data.order.id}`);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create order");
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      alert("Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/orders"
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
          <p className="mt-2 text-gray-600">Enter order details and add line items</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
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
                  value={formData.orderedAt}
                  onChange={(e) => setFormData({ ...formData, orderedAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="FULFILLED">Fulfilled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Week (Optional)
                </label>
                <input
                  type="number"
                  value={formData.deliveryWeek}
                  onChange={(e) => setFormData({ ...formData, deliveryWeek: e.target.value })}
                  placeholder="e.g., 1, 2, 3..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Line Items <span className="text-red-500">*</span>
            </h2>

            {/* Add Line Item Form */}
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <h3 className="font-medium mb-3">Add Line Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <select
                    value={newLineItem.skuId}
                    onChange={(e) => {
                      const sku = skus.find((s) => s.id === e.target.value);
                      setNewLineItem({
                        ...newLineItem,
                        skuId: e.target.value,
                        unitPrice: sku?.pricePerUnit ? Number(sku.pricePerUnit) : 0,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select SKU</option>
                    {skus.map((sku) => (
                      <option key={sku.id} value={sku.id}>
                        {sku.code} - {sku.product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newLineItem.quantity}
                    onChange={(e) =>
                      setNewLineItem({ ...newLineItem, quantity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Price"
                    value={newLineItem.unitPrice}
                    onChange={(e) =>
                      setNewLineItem({
                        ...newLineItem,
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-3">
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
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            {lineItems.length > 0 ? (
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
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lineItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap font-mono text-sm">
                          {item.sku?.code}
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm text-gray-900">
                            {item.sku?.product.name}
                          </div>
                          {item.sku?.product.brand && (
                            <div className="text-xs text-gray-500">
                              {item.sku.product.brand}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatCurrency(item.unitPrice, formData.currency)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {item.isSample ? (
                            <span className="text-green-600 text-sm">Yes</span>
                          ) : (
                            <span className="text-gray-400 text-sm">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap font-medium">
                          {formatCurrency(item.quantity * item.unitPrice, formData.currency)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-right font-semibold text-gray-900"
                      >
                        Order Total:
                      </td>
                      <td className="px-4 py-3 font-bold text-lg text-gray-900">
                        {formatCurrency(calculateTotal(), formData.currency)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No line items added yet. Add items using the form above.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/orders"
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !formData.customerId || lineItems.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? "Creating..." : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
