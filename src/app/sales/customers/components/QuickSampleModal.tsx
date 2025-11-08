"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatSkuLabel } from "@/lib/utils/format";

type QuickSampleModalProps = {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function QuickSampleModal({
  customerId,
  customerName,
  onClose,
  onSuccess,
}: QuickSampleModalProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    skuId: "",
    quantity: 1,
    feedback: "",
    customerResponse: "",
    needsFollowUp: false,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/sales/catalog/skus?limit=500");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.skus || []);
      }
    } catch (error) {
      console.error("Error loading products:", error);
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
        body: JSON.stringify({
          customerId,
          items: [
            {
              skuId: formData.skuId,
              quantity: formData.quantity,
              feedback: formData.feedback || undefined,
              customerResponse: formData.customerResponse || undefined,
              followUp: formData.needsFollowUp,
            },
          ],
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign sample");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to assign sample");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quick Sample Assignment</h2>
            <p className="mt-1 text-sm text-gray-600">
              Assign sample to <span className="font-medium">{customerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-600">Loading products...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 p-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.skuId}
                  onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a product...</option>
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

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Immediate Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Response
                </label>
                <select
                  value={formData.customerResponse}
                  onChange={(e) =>
                    setFormData({ ...formData, customerResponse: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select response...</option>
                  <option value="very_interested">Very Interested</option>
                  <option value="interested">Interested</option>
                  <option value="neutral">Neutral</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="will_order">Will Order Soon</option>
                </select>
              </div>

              {/* Quick Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Quick Notes</label>
                <textarea
                  rows={2}
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  placeholder="Any immediate feedback or notes..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Needs Follow-up */}
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <input
                  type="checkbox"
                  id="needsFollowUp"
                  checked={formData.needsFollowUp}
                  onChange={(e) =>
                    setFormData({ ...formData, needsFollowUp: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="needsFollowUp" className="flex-1 text-sm">
                  <span className="font-medium text-gray-900">Requires follow-up</span>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Automatically create a follow-up task in 1 week
                  </p>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t bg-gray-50 p-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Assigning..." : "Assign Sample"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
