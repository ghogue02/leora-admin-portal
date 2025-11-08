"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, DollarSign } from "lucide-react";

interface PriceList {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  effectiveAt: string | null;
  expiresAt: string | null;
  jurisdictionType: string;
  jurisdictionValue: string | null;
  allowManualOverride: boolean;
  items: PriceListItem[];
}

interface PriceListItem {
  id: string;
  price: number;
  minQuantity: number;
  maxQuantity: number | null;
  sku: {
    id: string;
    code: string;
    product: {
      name: string;
      brand: string | null;
      category: string | null;
    };
  };
}

function describeJurisdiction(type: string, value: string | null) {
  switch (type) {
    case "STATE":
      return value ? `State-specific: ${value}` : "State-specific";
    case "FEDERAL_PROPERTY":
      return "Federal property pricing";
    case "CUSTOM":
      return value ? `Custom rule: ${value}` : "Custom rule";
    default:
      return "Applies to all customers";
  }
}

export default function PriceListDetailPage() {
  const router = useRouter();
  const params = useParams();

  const [priceListId, setPriceListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
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

  useEffect(() => {
    if (params?.id) {
      setPriceListId(params.id as string);
    }
  }, [params]);

  const fetchPriceList = useCallback(async () => {
    if (!priceListId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/pricing/${priceListId}`);
      if (!response.ok) throw new Error("Failed to fetch price list");

      const data = await response.json();
      setPriceList(data.priceList);

      setFormData({
        name: data.priceList.name,
        currency: data.priceList.currency,
        isDefault: data.priceList.isDefault,
        effectiveAt: data.priceList.effectiveAt
          ? new Date(data.priceList.effectiveAt).toISOString().split("T")[0]
          : "",
        expiresAt: data.priceList.expiresAt
          ? new Date(data.priceList.expiresAt).toISOString().split("T")[0]
          : "",
        jurisdictionType: data.priceList.jurisdictionType ?? "GLOBAL",
        jurisdictionValue: data.priceList.jurisdictionValue ?? "",
        allowManualOverride: data.priceList.allowManualOverride ?? false,
      });
    } catch (error) {
      console.error("Error fetching price list:", error);
      alert("Failed to load price list");
    } finally {
      setLoading(false);
    }
  }, [priceListId]);

  useEffect(() => {
    if (priceListId) {
      fetchPriceList();
    }
  }, [priceListId, fetchPriceList]);

  const handleSave = async () => {
    if (!priceListId) return;

    if (formData.jurisdictionType !== "GLOBAL" && !formData.jurisdictionValue.trim()) {
      alert("Please provide a jurisdiction value for this price list.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/pricing/${priceListId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          currency: formData.currency,
          isDefault: formData.isDefault,
          effectiveAt: formData.effectiveAt || null,
          expiresAt: formData.expiresAt || null,
          jurisdictionType: formData.jurisdictionType,
          jurisdictionValue:
            formData.jurisdictionType === "GLOBAL"
              ? null
              : (formData.jurisdictionType === "STATE"
                  ? formData.jurisdictionValue.trim().toUpperCase()
                  : formData.jurisdictionValue.trim()) || null,
          allowManualOverride: formData.allowManualOverride,
        }),
      });

      if (!response.ok) throw new Error("Failed to save changes");

      alert("Changes saved successfully");
      fetchPriceList();
    } catch (error) {
      console.error("Error saving price list:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this price list item?")) return;

    try {
      const skuId = priceList?.items.find((i) => i.id === itemId)?.sku.id;
      if (!skuId) return;

      const response = await fetch(`/api/admin/inventory/${skuId}/pricing/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete item");

      fetchPriceList();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <DollarSign className="mb-4 h-12 w-12 text-gray-400" />
        <p className="text-lg font-medium text-gray-900">Price list not found</p>
        <button
          onClick={() => router.push("/admin/inventory/pricing")}
          className="mt-4 text-blue-600 hover:text-blue-900"
        >
          Return to price lists
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/inventory/pricing")}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{formData.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {priceList.items.length} item{priceList.items.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-500">
              {describeJurisdiction(formData.jurisdictionType, formData.jurisdictionValue)}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Price List Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Price List Settings</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Jurisdiction</label>
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
                    : "Describe the matching rule"
                }
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Set as default price list</span>
            </label>
          </div>

          <div className="md:col-span-2">
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
      </div>

      {/* Price List Items */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Items</h2>
          {priceListId && (
            <button
              onClick={() => router.push(`/admin/inventory/pricing/${priceListId}/add-items`)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Items
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  SKU Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Min Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Max Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {priceList.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    No items in this price list yet. Click &ldquo;Add Items&rdquo; to get started.
                  </td>
                </tr>
              ) : (
                priceList.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {item.sku.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.sku.product.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.sku.product.brand || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.sku.product.category || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {priceList.currency} ${item.price.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.minQuantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.maxQuantity || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
