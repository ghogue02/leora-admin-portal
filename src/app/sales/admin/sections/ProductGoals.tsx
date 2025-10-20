"use client";

import { useState, useEffect } from "react";

type SalesRep = {
  id: string;
  territoryName: string;
  user: {
    fullName: string;
  };
};

type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
};

type ProductGoal = {
  id: string;
  salesRepId: string;
  skuId: string | null;
  productCategory: string | null;
  targetRevenue: number | null;
  targetCases: number | null;
  periodStart: string;
  periodEnd: string;
  salesRep: {
    user: {
      fullName: string;
    };
    territoryName: string;
  };
  sku: {
    product: {
      name: string;
      brand: string | null;
    };
  } | null;
};

export default function ProductGoals() {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [goals, setGoals] = useState<ProductGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    salesRepId: "",
    goalType: "product" as "product" | "category",
    skuId: "",
    productCategory: "",
    targetRevenue: "",
    targetCases: "",
    periodStart: "",
    periodEnd: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [repsResponse, goalsResponse] = await Promise.all([
        fetch("/api/sales/admin/reps"),
        fetch("/api/sales/admin/goals"),
      ]);

      if (!repsResponse.ok || !goalsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const repsData = await repsResponse.json();
      const goalsData = await goalsResponse.json();

      setReps(repsData.reps || []);
      setGoals(goalsData.goals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        salesRepId: formData.salesRepId,
        skuId: formData.goalType === "product" ? formData.skuId : null,
        productCategory: formData.goalType === "category" ? formData.productCategory : null,
        targetRevenue: formData.targetRevenue ? parseFloat(formData.targetRevenue) : null,
        targetCases: formData.targetCases ? parseInt(formData.targetCases, 10) : null,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
      };

      const response = await fetch("/api/sales/admin/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create goal");
      }

      setSuccessMessage("Product goal created successfully");
      setFormData({
        salesRepId: "",
        goalType: "product",
        skuId: "",
        productCategory: "",
        targetRevenue: "",
        targetCases: "",
        periodStart: "",
        periodEnd: "",
      });

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Product Goals</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create and manage product sales goals for representatives
        </p>
      </div>

      {/* Goal Creation Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Goal</h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sales Representative *
              </label>
              <select
                value={formData.salesRepId}
                onChange={(e) => setFormData({ ...formData, salesRepId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a rep...</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.user.fullName} - {rep.territoryName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goal Type *
              </label>
              <select
                value={formData.goalType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goalType: e.target.value as "product" | "category",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="product">Specific Product</option>
                <option value="category">Product Category</option>
              </select>
            </div>

            {formData.goalType === "product" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product SKU
                </label>
                <input
                  type="text"
                  value={formData.skuId}
                  onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
                  placeholder="Enter SKU ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Category
                </label>
                <input
                  type="text"
                  value={formData.productCategory}
                  onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                  placeholder="e.g., Wine, Beer, Spirits"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Revenue
              </label>
              <input
                type="number"
                value={formData.targetRevenue}
                onChange={(e) => setFormData({ ...formData, targetRevenue: e.target.value })}
                placeholder="10000.00"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Cases
              </label>
              <input
                type="number"
                value={formData.targetCases}
                onChange={(e) => setFormData({ ...formData, targetCases: e.target.value })}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Start *
              </label>
              <input
                type="date"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period End *
              </label>
              <input
                type="date"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      </div>

      {/* Goals List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Active Goals</h3>

        {goals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No product goals created yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Representative
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product/Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Cases
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {goal.salesRep.user.fullName}
                        </div>
                        <div className="text-sm text-gray-500">{goal.salesRep.territoryName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {goal.sku ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {goal.sku.product.name}
                          </div>
                          {goal.sku.product.brand && (
                            <div className="text-sm text-gray-500">{goal.sku.product.brand}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">{goal.productCategory}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(goal.targetRevenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {goal.targetCases ? goal.targetCases : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(goal.periodStart)} - {formatDate(goal.periodEnd)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
