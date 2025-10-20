"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SalesRepDetail = {
  id: string;
  userId: string;
  territoryName: string;
  deliveryDay: string | null;
  weeklyRevenueQuota: number | null;
  monthlyRevenueQuota: number | null;
  quarterlyRevenueQuota: number | null;
  annualRevenueQuota: number | null;
  weeklyCustomerQuota: number | null;
  sampleAllowancePerMonth: number;
  isActive: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  performance: {
    ytdRevenue: number;
    ytdOrders: number;
    annualQuotaPercent: number;
    customersAssigned: number;
    activeCustomers: number;
  };
  productGoals: Array<{
    id: string;
    skuId: string | null;
    productCategory: string | null;
    targetRevenue: number | null;
    targetCases: number | null;
    periodStart: string;
    periodEnd: string;
    sku?: {
      code: string;
      product: {
        name: string;
      };
    };
  }>;
};

export default function SalesRepDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [repId, setRepId] = useState<string | null>(null);

  const [rep, setRep] = useState<SalesRepDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [territoryName, setTerritoryName] = useState("");
  const [deliveryDay, setDeliveryDay] = useState("");
  const [weeklyRevenueQuota, setWeeklyRevenueQuota] = useState("");
  const [monthlyRevenueQuota, setMonthlyRevenueQuota] = useState("");
  const [quarterlyRevenueQuota, setQuarterlyRevenueQuota] = useState("");
  const [annualRevenueQuota, setAnnualRevenueQuota] = useState("");
  const [weeklyCustomerQuota, setWeeklyCustomerQuota] = useState("");
  const [sampleAllowancePerMonth, setSampleAllowancePerMonth] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    params.then(p => setRepId(p.id));
  }, [params]);

  useEffect(() => {
    if (repId) {
      fetchRepDetail();
    }
  }, [repId]);

  const fetchRepDetail = async () => {
    if (!repId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/sales-reps/${repId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch sales rep details");
      }

      const data = await response.json();
      setRep(data.rep);

      // Populate form
      setTerritoryName(data.rep.territoryName || "");
      setDeliveryDay(data.rep.deliveryDay || "");
      setWeeklyRevenueQuota(data.rep.weeklyRevenueQuota?.toString() || "");
      setMonthlyRevenueQuota(data.rep.monthlyRevenueQuota?.toString() || "");
      setQuarterlyRevenueQuota(data.rep.quarterlyRevenueQuota?.toString() || "");
      setAnnualRevenueQuota(data.rep.annualRevenueQuota?.toString() || "");
      setWeeklyCustomerQuota(data.rep.weeklyCustomerQuota?.toString() || "");
      setSampleAllowancePerMonth(data.rep.sampleAllowancePerMonth?.toString() || "60");
      setIsActive(data.rep.isActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!repId) return;

    try {
      setIsSaving(true);

      const updateData = {
        territoryName: territoryName || null,
        deliveryDay: deliveryDay || null,
        weeklyRevenueQuota: weeklyRevenueQuota ? parseFloat(weeklyRevenueQuota) : null,
        monthlyRevenueQuota: monthlyRevenueQuota ? parseFloat(monthlyRevenueQuota) : null,
        quarterlyRevenueQuota: quarterlyRevenueQuota ? parseFloat(quarterlyRevenueQuota) : null,
        annualRevenueQuota: annualRevenueQuota ? parseFloat(annualRevenueQuota) : null,
        weeklyCustomerQuota: weeklyCustomerQuota ? parseInt(weeklyCustomerQuota) : null,
        sampleAllowancePerMonth: sampleAllowancePerMonth ? parseInt(sampleAllowancePerMonth) : 60,
        isActive,
      };

      // Validate quotas
      if (updateData.weeklyRevenueQuota !== null && updateData.weeklyRevenueQuota < 0) {
        alert("Weekly revenue quota must be >= 0");
        return;
      }
      if (updateData.monthlyRevenueQuota !== null && updateData.monthlyRevenueQuota < 0) {
        alert("Monthly revenue quota must be >= 0");
        return;
      }
      if (updateData.quarterlyRevenueQuota !== null && updateData.quarterlyRevenueQuota < 0) {
        alert("Quarterly revenue quota must be >= 0");
        return;
      }
      if (updateData.annualRevenueQuota !== null && updateData.annualRevenueQuota < 0) {
        alert("Annual revenue quota must be >= 0");
        return;
      }
      if (updateData.weeklyCustomerQuota !== null && updateData.weeklyCustomerQuota < 0) {
        alert("Weekly customer quota must be >= 0");
        return;
      }
      if (updateData.sampleAllowancePerMonth < 0) {
        alert("Sample allowance must be >= 0");
        return;
      }

      const response = await fetch(`/api/admin/sales-reps/${repId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update sales rep");
      }

      alert("Sales rep updated successfully!");
      fetchRepDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!repId) return;

    if (!confirm("Are you sure you want to deactivate this sales rep?")) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/sales-reps/${repId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      if (!response.ok) {
        throw new Error("Failed to deactivate sales rep");
      }

      alert("Sales rep deactivated successfully!");
      router.push("/admin/sales-reps");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate");
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return `${Math.round(value)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sales rep details...</p>
        </div>
      </div>
    );
  }

  if (error || !rep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error || "Sales rep not found"}</p>
          <Link
            href="/admin/sales-reps"
            className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Sales Reps
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {rep.user.fullName}
              </h1>
              <p className="mt-1 text-sm text-gray-600">{rep.user.email}</p>
            </div>
            <Link
              href="/admin/sales-reps"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Sales Reps
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Basic Info */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={rep.user.fullName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">From user account (read-only)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={rep.user.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">From user account (read-only)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Territory Name
                  </label>
                  <input
                    type="text"
                    value={territoryName}
                    onChange={e => setTerritoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., North District"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Day
                  </label>
                  <select
                    value={deliveryDay}
                    onChange={e => setDeliveryDay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select day...</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Active Status
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Inactive reps cannot access the sales portal
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Quotas */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quotas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Revenue Quota
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={weeklyRevenueQuota}
                      onChange={e => setWeeklyRevenueQuota(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Revenue Quota
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={monthlyRevenueQuota}
                      onChange={e => setMonthlyRevenueQuota(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      min="0"
                      step="500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quarterly Revenue Quota
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={quarterlyRevenueQuota}
                      onChange={e => setQuarterlyRevenueQuota(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Revenue Quota
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={annualRevenueQuota}
                      onChange={e => setAnnualRevenueQuota(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      min="0"
                      step="5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Customer Quota
                  </label>
                  <input
                    type="number"
                    value={weeklyCustomerQuota}
                    onChange={e => setWeeklyCustomerQuota(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Allowance Per Month
                  </label>
                  <input
                    type="number"
                    value={sampleAllowancePerMonth}
                    onChange={e => setSampleAllowancePerMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="60"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Goals */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Product Goals</h2>
                <Link
                  href={`/admin/sales-reps/${repId}/goals`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Manage Goals
                </Link>
              </div>
              {rep.productGoals.length === 0 ? (
                <p className="text-gray-500 text-sm">No product goals set</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Target Revenue
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Target Cases
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Period
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rep.productGoals.map(goal => (
                        <tr key={goal.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {goal.sku
                              ? `${goal.sku.product.name} (${goal.sku.code})`
                              : goal.productCategory || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatCurrency(goal.targetRevenue)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {goal.targetCases || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {new Date(goal.periodStart).toLocaleDateString()} -{" "}
                            {new Date(goal.periodEnd).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Section 3: Performance */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Performance (Read-Only)
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">YTD Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(rep.performance.ytdRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">YTD Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {rep.performance.ytdOrders}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Annual Quota Achievement</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPercentage(rep.performance.annualQuotaPercent)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        rep.performance.annualQuotaPercent >= 100
                          ? "bg-green-600"
                          : rep.performance.annualQuotaPercent >= 75
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                      style={{
                        width: `${Math.min(rep.performance.annualQuotaPercent, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Customers Assigned</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.performance.customersAssigned}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Customers</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.performance.activeCustomers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Orders in last 45 days
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5: Linked User Account */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Linked User Account
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="text-sm font-mono text-gray-900">{rep.user.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-sm text-gray-900">{rep.user.email}</p>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">
                    To manage user details, roles, or reset password, use the user management
                    system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-between bg-white shadow-sm rounded-lg p-6">
          <button
            onClick={handleDeactivate}
            disabled={isSaving || !isActive}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Deactivate
          </button>
          <div className="flex gap-3">
            <Link
              href="/admin/sales-reps"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
