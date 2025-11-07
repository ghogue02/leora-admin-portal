"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  id: string;
  email: string;
  fullName: string;
  linkedSalesRepId: string | null;
};

export default function NewSalesRepPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [userId, setUserId] = useState("");
  const [territoryName, setTerritoryName] = useState("");
  const [deliveryDay, setDeliveryDay] = useState("");
  const [weeklyRevenueQuota, setWeeklyRevenueQuota] = useState("");
  const [monthlyRevenueQuota, setMonthlyRevenueQuota] = useState("");
  const [quarterlyRevenueQuota, setQuarterlyRevenueQuota] = useState("");
  const [annualRevenueQuota, setAnnualRevenueQuota] = useState("");
  const [weeklyCustomerQuota, setWeeklyCustomerQuota] = useState("");
  const [sampleAllowancePerMonth, setSampleAllowancePerMonth] = useState("60");
  const [isActive, setIsActive] = useState(true);
  const [orderEntryEnabled, setOrderEntryEnabled] = useState(true);

  // Create new user inline
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch("/api/admin/accounts/users?limit=1000");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserFullName || !newUserPassword) {
      alert("Email, full name, and password are required");
      return;
    }

    try {
      setCreatingUser(true);

      const response = await fetch("/api/admin/accounts/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          fullName: newUserFullName,
          phone: newUserPhone || null,
          password: newUserPassword,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('User creation failed:', data);
        throw new Error(data.error || "Failed to create user");
      }

      const data = await response.json();
      console.log('User created successfully:', data);

      // Add new user to the list and select it
      setUsers([...users, data.user]);
      setUserId(data.user.id);

      // Clear form and hide
      setShowCreateUser(false);
      setNewUserEmail("");
      setNewUserFullName("");
      setNewUserPhone("");
      setNewUserPassword("");

      alert("User created successfully! Now fill in the sales rep details below.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      alert("Please select a user");
      return;
    }

    if (!territoryName.trim()) {
      alert("Territory name is required");
      return;
    }

    try {
      setIsSaving(true);

      const createData = {
        userId,
        territoryName: territoryName.trim(),
        deliveryDay: deliveryDay || null,
        weeklyRevenueQuota: weeklyRevenueQuota ? parseFloat(weeklyRevenueQuota) : null,
        monthlyRevenueQuota: monthlyRevenueQuota ? parseFloat(monthlyRevenueQuota) : null,
        quarterlyRevenueQuota: quarterlyRevenueQuota ? parseFloat(quarterlyRevenueQuota) : null,
        annualRevenueQuota: annualRevenueQuota ? parseFloat(annualRevenueQuota) : null,
        weeklyCustomerQuota: weeklyCustomerQuota ? parseInt(weeklyCustomerQuota) : null,
        sampleAllowancePerMonth: sampleAllowancePerMonth ? parseInt(sampleAllowancePerMonth) : 60,
        isActive,
        orderEntryEnabled,
      };

      // Validate quotas
      if (createData.weeklyRevenueQuota !== null && createData.weeklyRevenueQuota < 0) {
        alert("Weekly revenue quota must be >= 0");
        return;
      }
      if (createData.monthlyRevenueQuota !== null && createData.monthlyRevenueQuota < 0) {
        alert("Monthly revenue quota must be >= 0");
        return;
      }
      if (createData.quarterlyRevenueQuota !== null && createData.quarterlyRevenueQuota < 0) {
        alert("Quarterly revenue quota must be >= 0");
        return;
      }
      if (createData.annualRevenueQuota !== null && createData.annualRevenueQuota < 0) {
        alert("Annual revenue quota must be >= 0");
        return;
      }
      if (createData.weeklyCustomerQuota !== null && createData.weeklyCustomerQuota < 0) {
        alert("Weekly customer quota must be >= 0");
        return;
      }
      if (createData.sampleAllowancePerMonth < 0) {
        alert("Sample allowance must be >= 0");
        return;
      }

      const response = await fetch("/api/admin/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create sales rep");
      }

      const data = await response.json();
      alert("Sales rep created successfully!");
      router.push(`/admin/sales-reps/${data.rep.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create sales rep");
      setIsSaving(false);
    }
  };

  // Filter out users who already have a sales rep profile
  const availableUsers = users.filter(user => !user.linkedSalesRepId);

  if (isLoadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Sales Rep</h1>
              <p className="mt-1 text-sm text-gray-600">
                Link a user account to a sales rep profile
              </p>
            </div>
            <Link
              href="/admin/sales-reps"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Sales Reps
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Selection */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select User</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Account <span className="text-red-500">*</span>
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only users without an existing sales rep profile are shown
              </p>
              {availableUsers.length === 0 && !showCreateUser && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    No available users. All users already have sales rep profiles.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Create New User Account
                  </button>
                </div>
              )}
            </div>

            {/* Inline Create User Form */}
            {showCreateUser && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Create New User</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="john@wellcraftedbeverage.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      User will use this password to log in (visible for admin)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="555-1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateUser}
                    disabled={creatingUser || !newUserEmail || !newUserFullName || !newUserPassword}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingUser ? "Creating..." : "Create User & Continue"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Territory Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={territoryName}
                  onChange={(e) => setTerritoryName(e.target.value)}
                  required
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
                  onChange={(e) => setDeliveryDay(e.target.value)}
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
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Active Status
                  </span>
                </label>
                <p className="mt-1 ml-6 text-xs text-gray-500">
                  Inactive reps cannot access the sales portal
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={orderEntryEnabled}
                    onChange={(e) => setOrderEntryEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Enable for direct order entry
                  </span>
                </label>
                <p className="mt-1 ml-6 text-xs text-gray-500">
                  When enabled, this rep appears in the Sales &gt; New Order salesperson dropdown (including new hires like Mike Allen).
                </p>
              </div>
            </div>
          </div>

          {/* Quotas */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quotas (Optional)</h2>
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
                    onChange={(e) => setWeeklyRevenueQuota(e.target.value)}
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
                    onChange={(e) => setMonthlyRevenueQuota(e.target.value)}
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
                    onChange={(e) => setQuarterlyRevenueQuota(e.target.value)}
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
                    onChange={(e) => setAnnualRevenueQuota(e.target.value)}
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
                  onChange={(e) => setWeeklyCustomerQuota(e.target.value)}
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
                  onChange={(e) => setSampleAllowancePerMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="60"
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 bg-white shadow-sm rounded-lg p-6">
            <Link
              href="/admin/sales-reps"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving || availableUsers.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Creating..." : "Create Sales Rep"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
