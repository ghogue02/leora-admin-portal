"use client";

import { useState, useEffect } from "react";
import { formatSkuLabel } from "@/lib/utils/format";

type LogSampleUsageModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function LogSampleUsageModal({ onClose, onSuccess }: LogSampleUsageModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    skuId: "",
    quantity: 1,
    tastedAt: new Date().toISOString().split("T")[0],
    feedback: "",
    needsFollowUp: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, catalogRes] = await Promise.all([
        fetch("/api/sales/customers?limit=1000"),
        fetch("/api/sales/catalog/skus?limit=500"),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }

      if (catalogRes.ok) {
        const data = await catalogRes.json();
        setProducts(data.skus || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/sales/samples/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert("Failed to log sample usage");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to log sample usage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold">Log Sample Usage</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium">Customer *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="mt-1 block w-full rounded-md border px-3 py-2"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Product *</label>
                <select
                  required
                  value={formData.skuId}
                  onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
                  className="mt-1 block w-full rounded-md border px-3 py-2"
                >
                  <option value="">Select product...</option>
                  {products.map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {formatSkuLabel(
                        {
                          code: sku.code,
                          product: {
                            brand: sku.product?.brand,
                            name: sku.product?.name,
                          },
                        },
                        { includeCode: true }
                      )}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Tasted On *</label>
                  <input
                    type="date"
                    required
                    value={formData.tastedAt}
                    onChange={(e) => setFormData({ ...formData, tastedAt: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Customer Feedback</label>
                <textarea
                  rows={3}
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  placeholder="What did the customer think?"
                  className="mt-1 block w-full rounded-md border px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="needsFollowUp"
                  checked={formData.needsFollowUp}
                  onChange={(e) =>
                    setFormData({ ...formData, needsFollowUp: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="needsFollowUp" className="text-sm">
                  Needs follow-up
                </label>
              </div>
            </div>

            <div className="flex gap-3 border-t bg-gray-50 p-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Logging..." : "Log Sample"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
