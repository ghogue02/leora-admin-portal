"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Package,
  DollarSign,
  MapPin,
  Clock,
  Trash2,
  Plus,
} from "lucide-react";
import AdjustInventoryModal from "../components/AdjustInventoryModal";

interface SkuDetail {
  id: string;
  code: string;
  size: string | null;
  unitOfMeasure: string | null;
  abv: number | null;
  casesPerPallet: number | null;
  pricePerUnit: number | null;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    brand: string | null;
    description: string | null;
    category: string | null;
    isSampleOnly: boolean;
    supplierId: string | null;
  };
  inventories: Array<{
    id: string;
    location: string;
    onHand: number;
    allocated: number;
  }>;
  priceListItems: Array<{
    id: string;
    price: number;
    minQuantity: number;
    maxQuantity: number | null;
    priceList: {
      id: string;
      name: string;
      currency: string;
      effectiveAt: string | null;
      expiresAt: string | null;
    };
  }>;
  supplier: {
    id: string;
    name: string;
  } | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  } | null;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ skuId: string }>;
}) {
  const router = useRouter();

  const [skuId, setSkuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sku, setSku] = useState<SkuDetail | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    productName: "",
    brand: "",
    category: "",
    description: "",
    supplierId: "",
    isSampleOnly: false,
    isActive: true,
    size: "",
    unitOfMeasure: "",
    abv: "",
    casesPerPallet: "",
    pricePerUnit: "",
  });

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      if (resolvedParams?.skuId) {
        setSkuId(resolvedParams.skuId);
      }
    }
    loadParams();
  }, [params]);

  useEffect(() => {
    if (skuId) {
      fetchSkuDetail();
      fetchSuppliers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuId]);

  const fetchSkuDetail = async () => {
    if (!skuId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/inventory/${skuId}`);
      if (!response.ok) throw new Error("Failed to fetch SKU");

      const data = await response.json();
      setSku(data.sku);
      setAuditLogs(data.auditLogs || []);

      // Populate form
      setFormData({
        productName: data.sku.product.name,
        brand: data.sku.product.brand || "",
        category: data.sku.product.category || "",
        description: data.sku.product.description || "",
        supplierId: data.sku.product.supplierId || "",
        isSampleOnly: data.sku.product.isSampleOnly,
        isActive: data.sku.isActive,
        size: data.sku.size || "",
        unitOfMeasure: data.sku.unitOfMeasure || "",
        abv: data.sku.abv?.toString() || "",
        casesPerPallet: data.sku.casesPerPallet?.toString() || "",
        pricePerUnit: data.sku.pricePerUnit?.toString() || "",
      });
    } catch (error) {
      console.error("Error fetching SKU:", error);
      alert("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/admin/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const handleSave = async () => {
    if (!skuId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inventory/${skuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formData.productName,
          brand: formData.brand || null,
          category: formData.category || null,
          description: formData.description || null,
          supplierId: formData.supplierId || null,
          isSampleOnly: formData.isSampleOnly,
          isActive: formData.isActive,
          size: formData.size || null,
          unitOfMeasure: formData.unitOfMeasure || null,
          abv: formData.abv ? parseFloat(formData.abv) : null,
          casesPerPallet: formData.casesPerPallet ? parseInt(formData.casesPerPallet) : null,
          pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save changes");

      alert("Changes saved successfully");
      fetchSkuDetail();
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newStatus = !formData.isActive;
    const confirmed = confirm(
      `Are you sure you want to ${newStatus ? "activate" : "deactivate"} this product?`
    );
    if (!confirmed) return;

    setFormData({ ...formData, isActive: newStatus });
  };

  const handleDeletePriceListItem = async (itemId: string) => {
    if (!skuId) return;
    if (!confirm("Delete this price list item?")) return;

    try {
      const response = await fetch(`/api/admin/inventory/${skuId}/pricing/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete price item");

      fetchSkuDetail();
    } catch (error) {
      console.error("Error deleting price item:", error);
      alert("Failed to delete price item");
    }
  };

  const getTotalInventory = () => {
    if (!sku) return { onHand: 0, allocated: 0, available: 0 };
    return sku.inventories.reduce(
      (acc, inv) => ({
        onHand: acc.onHand + inv.onHand,
        allocated: acc.allocated + inv.allocated,
        available: acc.available + (inv.onHand - inv.allocated),
      }),
      { onHand: 0, allocated: 0, available: 0 }
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!sku) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Package className="mb-4 h-12 w-12 text-gray-400" />
        <p className="text-lg font-medium text-gray-900">Product not found</p>
        <button
          onClick={() => router.push("/admin/inventory")}
          className="mt-4 text-blue-600 hover:text-blue-900"
        >
          Return to inventory
        </button>
      </div>
    );
  }

  const totals = getTotalInventory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/inventory")}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{formData.productName}</h1>
            <p className="mt-1 text-sm text-gray-500">SKU: {sku.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              formData.isActive
                ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {formData.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Package className="h-5 w-5" />
          Product Information
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SKU Code</label>
            <input
              type="text"
              value={sku.code}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Supplier</label>
            <select
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isSampleOnly}
                onChange={(e) => setFormData({ ...formData, isSampleOnly: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Sample Only</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SKU Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">SKU Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Size</label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              placeholder="e.g., 750ml"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Unit of Measure
            </label>
            <input
              type="text"
              value={formData.unitOfMeasure}
              onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
              placeholder="e.g., bottle, case"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ABV (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.abv}
              onChange={(e) => setFormData({ ...formData, abv: e.target.value })}
              placeholder="e.g., 13.5"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cases Per Pallet
            </label>
            <input
              type="number"
              value={formData.casesPerPallet}
              onChange={(e) => setFormData({ ...formData, casesPerPallet: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Base Price Per Unit
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.pricePerUnit}
              onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MapPin className="h-5 w-5" />
            Inventory by Location
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  On Hand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Allocated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Available
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sku.inventories.map((inv) => (
                <tr key={inv.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {inv.location}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {inv.onHand}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {inv.allocated}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {inv.onHand - inv.allocated}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => {
                        setSelectedLocation(inv.location);
                        setShowAdjustModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {totals.onHand}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {totals.allocated}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {totals.available}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <DollarSign className="h-5 w-5" />
            Price Lists
          </h2>
          <button
            onClick={() => router.push(`/admin/inventory/${skuId}/add-price`)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add to Price List
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price List
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Min Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Max Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Effective Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Expires Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sku.priceListItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No price list items configured
                  </td>
                </tr>
              ) : (
                sku.priceListItems.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {item.priceList.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.priceList.currency} ${item.price.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.minQuantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.maxQuantity || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.priceList.effectiveAt
                        ? new Date(item.priceList.effectiveAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.priceList.expiresAt
                        ? new Date(item.priceList.expiresAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleDeletePriceListItem(item.id)}
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

      {/* Activity History */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Clock className="h-5 w-5" />
          Recent Activity
        </h2>

        <div className="space-y-4">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity</p>
          ) : (
            auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="border-l-2 border-gray-200 pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    {log.user && (
                      <p className="text-xs text-gray-500">
                        by {log.user.fullName} ({log.user.email})
                      </p>
                    )}
                    {log.metadata && typeof (log.metadata as any).reason === 'string' && (
                      <p className="mt-1 text-xs text-gray-600">Reason: {(log.metadata as any).reason}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Adjust Inventory Modal */}
      {showAdjustModal && selectedLocation && skuId && (
        <AdjustInventoryModal
          skuId={skuId}
          skuCode={sku.code}
          location={selectedLocation}
          currentQuantity={
            sku.inventories.find((i) => i.location === selectedLocation)?.onHand || 0
          }
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedLocation(null);
          }}
          onSuccess={() => {
            setShowAdjustModal(false);
            setSelectedLocation(null);
            fetchSkuDetail();
          }}
        />
      )}
    </div>
  );
}
