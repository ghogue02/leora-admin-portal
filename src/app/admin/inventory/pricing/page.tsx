"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, DollarSign, Calendar, CheckCircle2 } from "lucide-react";

interface PriceList {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  effectiveAt: string | null;
  expiresAt: string | null;
  itemCount: number;
}

export default function PriceListsPage() {
  const router = useRouter();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const fetchPriceLists = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/pricing");
      if (!response.ok) throw new Error("Failed to fetch price lists");

      const data = await response.json();
      setPriceLists(data.priceLists);
    } catch (error) {
      console.error("Error fetching price lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this price list? All associated items will be removed.")) return;

    try {
      const response = await fetch(`/api/admin/pricing/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      fetchPriceLists();
    } catch (error: any) {
      console.error("Error deleting price list:", error);
      alert(error.message || "Failed to delete price list");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Lists</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage pricing catalogs and pricing rules
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Price List
        </button>
      </div>

      {/* Price Lists Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : priceLists.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white">
          <DollarSign className="mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-900">No price lists yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first price list to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Price List
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {priceLists.map((priceList) => (
            <div
              key={priceList.id}
              className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md"
            >
              {priceList.isDefault && (
                <div className="absolute right-4 top-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Default
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900">{priceList.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{priceList.currency}</p>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {priceList.effectiveAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Effective: {new Date(priceList.effectiveAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {priceList.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Expires: {new Date(priceList.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>{priceList.itemCount} items</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-4">
                <button
                  onClick={() => router.push(`/admin/inventory/pricing/${priceList.id}`)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4" />
                  Manage
                </button>
                <button
                  onClick={() => handleDelete(priceList.id)}
                  className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePriceListModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPriceLists();
          }}
        />
      )}
    </div>
  );
}

interface CreatePriceListModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreatePriceListModal({ onClose, onSuccess }: CreatePriceListModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    currency: "USD",
    isDefault: false,
    effectiveAt: "",
    expiresAt: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a price list name");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          currency: formData.currency,
          isDefault: formData.isDefault,
          effectiveAt: formData.effectiveAt || null,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create price list");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error creating price list:", error);
      alert(error.message || "Failed to create price list");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Price List</h3>
            </div>

            <div className="space-y-4 bg-white px-6 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Standard Pricing, Wholesale Pricing"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={formData.effectiveAt}
                  onChange={(e) => setFormData({ ...formData, effectiveAt: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Set as default price list
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Price List"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
