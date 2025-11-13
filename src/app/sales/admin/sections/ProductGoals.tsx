"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type SalesRep = {
  id: string;
  territoryName: string;
  user: {
    fullName: string;
  };
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

const defaultFormState = {
  salesRepId: "",
  goalType: "product" as "product" | "category",
  skuId: "",
  productCategory: "",
  targetRevenue: "",
  targetCases: "",
  periodStart: "",
  periodEnd: "",
};

export default function ProductGoals() {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [goals, setGoals] = useState<ProductGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormState);

  useEffect(() => {
    void fetchData();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create goal");
      }

      setSuccessMessage("Product goal created successfully");
      setFormData(defaultFormState);
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (isLoading) {
    return (
      <ResponsiveCard className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="h-24 rounded bg-slate-100" />
        <div className="h-40 rounded bg-slate-100" />
      </ResponsiveCard>
    );
  }

  return (
    <section className="layout-stack">
      <ResponsiveCard>
        <ResponsiveCardHeader>
          <ResponsiveCardTitle>Product goals</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Create SKU or category targets with dates and revenue/case expectations.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <p className="text-sm text-gray-600">
          These responsive forms keep field leaders aligned regardless of device width.
        </p>
      </ResponsiveCard>

      <ResponsiveCard>
        <ResponsiveCardHeader>
          <ResponsiveCardTitle>Create new goal</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Assign a rep, select goal type, and capture the period + metrics.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sales representative *</label>
              <select
                required
                value={formData.salesRepId}
                onChange={(e) => setFormData({ ...formData, salesRepId: e.target.value })}
                className="touch-target w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a rep...</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                  {rep.user.fullName} - {rep.territoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Goal type *</label>
              <select
                value={formData.goalType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goalType: e.target.value as "product" | "category",
                  })
                }
                className="touch-target w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="product">Specific product</option>
                <option value="category">Product category</option>
              </select>
            </div>

            {formData.goalType === "product" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Product SKU</label>
                <Input
                  className="touch-target"
                  placeholder="Enter SKU ID"
                  value={formData.skuId}
                  onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Product category</label>
                <Input
                  className="touch-target"
                  placeholder="e.g., Wine, Beer, Spirits"
                  value={formData.productCategory}
                  onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Target revenue</label>
              <Input
                type="number"
                step="0.01"
                className="touch-target"
                placeholder="10000.00"
                value={formData.targetRevenue}
                onChange={(e) => setFormData({ ...formData, targetRevenue: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Target cases</label>
              <Input
                type="number"
                className="touch-target"
                placeholder="100"
                value={formData.targetCases}
                onChange={(e) => setFormData({ ...formData, targetCases: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Period start *</label>
              <Input
                type="date"
                required
                className="touch-target"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Period end *</label>
              <Input
                type="date"
                required
                className="touch-target"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="touch-target" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create goal"}
            </Button>
          </div>
        </form>
      </ResponsiveCard>

      {goals.length === 0 ? (
        <ResponsiveCard variant="muted">
          <p className="text-sm text-gray-600">No product goals created yet.</p>
        </ResponsiveCard>
      ) : (
        <ResponsiveTable stickyHeader>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                {["Representative", "Product/Category", "Target Revenue", "Target Cases", "Period"].map(
                  (heading) => (
                    <th key={heading} className="px-6 py-3">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {goals.map((goal) => (
                <tr key={goal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{goal.salesRep.user.fullName}</div>
                    <div className="text-xs text-gray-500">{goal.salesRep.territoryName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {goal.sku ? (
                      <>
                        <span className="font-semibold">{goal.sku.product.name}</span>
                        {goal.sku.product.brand && (
                          <span className="block text-xs text-gray-500">{goal.sku.product.brand}</span>
                        )}
                      </>
                    ) : (
                      goal.productCategory || "--"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(goal.targetRevenue)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {goal.targetCases !== null ? goal.targetCases : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatDate(goal.periodStart)} - {formatDate(goal.periodEnd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}
    </section>
  );
}
