"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, DollarSign, Calendar, CheckCircle2 } from "lucide-react";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";

interface PriceList {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  effectiveAt: string | null;
  expiresAt: string | null;
  itemCount: number;
  jurisdictionType: string;
  jurisdictionValue: string | null;
  allowManualOverride: boolean;
}

function renderJurisdictionLabel(type: string, value: string | null) {
  switch (type) {
    case "STATE":
      return `State: ${value ?? "(unspecified)"}`;
    case "FEDERAL_PROPERTY":
      return "Federal property pricing";
    case "CUSTOM":
      return value ? `Custom: ${value}` : "Custom rule";
    default:
      return "All jurisdictions";
  }
}

export default function PriceListsPage() {
  const router = useRouter();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchPriceLists = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchPriceLists();
  }, [fetchPriceLists]);

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
    } catch (error: unknown) {
      console.error("Error deleting price list:", error);
      alert(error instanceof Error ? error.message : "Failed to delete price list");
    }
  };

  return (
    <div className="layout-stack">
      <ResponsiveCard className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <ResponsiveCardHeader className="p-0">
          <ResponsiveCardTitle>Price lists</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Manage pricing catalogs and rules without a separate mobile UI.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <button
          onClick={() => setShowCreateModal(true)}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Price List
        </button>
      </ResponsiveCard>

      {loading ? (
        <ResponsiveCard className="flex h-48 items-center justify-center text-sm text-gray-600">
          Loading price lists...
        </ResponsiveCard>
      ) : priceLists.length === 0 ? (
        <ResponsiveCard className="flex flex-col items-center justify-center gap-3 text-center">
          <DollarSign className="h-10 w-10 text-gray-400" />
          <ResponsiveCardTitle>No price lists yet</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Create your first price list to get started.
          </ResponsiveCardDescription>
          <button
            onClick={() => setShowCreateModal(true)}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Price List
          </button>
        </ResponsiveCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {priceLists.map((priceList) => (
            <ResponsiveCard key={priceList.id} className="relative">
              {priceList.isDefault && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Default
                </span>
              )}
              <ResponsiveCardHeader className="pr-10">
                <ResponsiveCardTitle>{priceList.name}</ResponsiveCardTitle>
                <ResponsiveCardDescription>{priceList.currency}</ResponsiveCardDescription>
              </ResponsiveCardHeader>
              <div className="space-y-2 text-sm text-gray-700">
                {priceList.effectiveAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Effective: {new Date(priceList.effectiveAt).toLocaleDateString()}</span>
                  </div>
                )}
                {priceList.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Expires: {new Date(priceList.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>{priceList.itemCount} items</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gray-400" />
                  <span>
                    {renderJurisdictionLabel(priceList.jurisdictionType, priceList.jurisdictionValue)}
                  </span>
                </div>
                {priceList.allowManualOverride && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    Manual override allowed for edge cases
                  </div>
                )}
              </div>
              <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => router.push(`/admin/inventory/pricing/${priceList.id}`)}
                  className="touch-target flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4" />
                  Manage
                </button>
                <button
                  onClick={() => handleDelete(priceList.id)}
                  className="touch-target rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </ResponsiveCard>
          ))}
        </div>
      )}

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
    jurisdictionType: "GLOBAL",
    jurisdictionValue: "",
    allowManualOverride: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a price list name");
      return;
    }

    if (formData.jurisdictionType !== "GLOBAL" && !formData.jurisdictionValue.trim()) {
      alert("Please provide a jurisdiction value for this price list");
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
          jurisdictionType: formData.jurisdictionType,
          jurisdictionValue:
            formData.jurisdictionType === "GLOBAL" ? null : formData.jurisdictionValue.trim() || null,
          allowManualOverride: formData.allowManualOverride,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create price list");
      }

      onSuccess();
    } catch (error: unknown) {
      console.error("Error creating price list:", error);
      alert(error instanceof Error ? error.message : "Failed to create price list");
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Jurisdiction
                </label>
                <select
                  value={formData.jurisdictionType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      jurisdictionType: e.target.value,
                      jurisdictionValue:
                        e.target.value === "GLOBAL" ? "" : formData.jurisdictionValue,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="GLOBAL">All customers</option>
                  <option value="STATE">Specific state</option>
                  <option value="FEDERAL_PROPERTY">Federal property</option>
                  <option value="CUSTOM">Custom rule</option>
                </select>
              </div>

              {formData.jurisdictionType !== "GLOBAL" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Jurisdiction Value
                  </label>
                  <input
                    type="text"
                    value={formData.jurisdictionValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jurisdictionValue:
                          formData.jurisdictionType === "STATE"
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={
                      formData.jurisdictionType === "STATE"
                        ? "e.g., VA"
                        : "Describe how this pricing should be applied"
                    }
                  />
                </div>
              ) : null}

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

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowManualOverride}
                    onChange={(e) => setFormData({ ...formData, allowManualOverride: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Allow manual override for edge-case customers
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
