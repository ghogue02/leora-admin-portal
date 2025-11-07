'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface Role {
  id: string;
  name: string;
  code: string;
  permissions: { id: string; code: string; name: string }[];
}

interface SalesRep {
  id: string;
  territoryName: string;
  deliveryDay: string | null;
  weeklyRevenueQuota: number | null;
  monthlyRevenueQuota: number | null;
  quarterlyRevenueQuota: number | null;
  annualRevenueQuota: number | null;
  weeklyCustomerQuota: number | null;
  sampleAllowancePerMonth: number;
  isActive: boolean;
  customers: { id: string; name: string; accountNumber: string | null }[];
}

interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
  permissions: string[];
  salesRep: SalesRep | null;
}

interface AvailableRole {
  id: string;
  name: string;
  code: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    isActive: true,
  });

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (params?.id) {
      setUserId(params.id as string);
    }
  }, [params]);

  const fetchUser = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/admin/accounts/users/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user');
      }

      setUser(data.user);
      setFormData({
        fullName: data.user.fullName,
        email: data.user.email,
        isActive: data.user.isActive,
      });
      setSelectedRoleIds(data.user.roles.map((r: Role) => r.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchAvailableRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/roles?type=internal');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch roles');
      }

      setAvailableRoles(data.roles);
    } catch (err: unknown) {
      console.error('Error fetching roles:', err);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchAvailableRoles();
    }
  }, [userId, fetchUser, fetchAvailableRoles]);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      // Update basic user info
      const response = await fetch(`/api/admin/accounts/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      alert('User updated successfully');
      fetchUser(); // Refresh user data
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/accounts/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: selectedRoleIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update roles');
      }

      alert('Roles updated successfully');
      fetchUser(); // Refresh user data
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!userId) return;

    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/accounts/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate user');
      }

      alert('User deactivated successfully');
      router.push('/admin/accounts');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading user...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          User not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/accounts" className="text-blue-600 hover:text-blue-900 mb-4 inline-block">
          &larr; Back to Accounts
        </Link>
        <h1 className="text-3xl font-bold">Edit User: {user.fullName}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  href="/admin/accounts"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Roles & Permissions</h2>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Assign Roles</h3>
              <div className="space-y-2 mb-4">
                {availableRoles.map((role) => (
                  <div key={role.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="rounded mr-2"
                    />
                    <label htmlFor={`role-${role.id}`} className="text-sm">
                      <span className="font-medium">{role.name}</span>
                      <span className="text-gray-500 ml-2">({role.code})</span>
                    </label>
                  </div>
                ))}
              </div>

              <button
                onClick={handleUpdateRoles}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Roles'}
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Permissions</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {user.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
                {user.permissions.length === 0 && (
                  <p className="text-sm text-gray-500">No permissions assigned</p>
                )}
              </div>
            </div>
          </div>

          {/* Sales Rep Info */}
          {user.salesRep && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Sales Rep Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Territory</label>
                  <p className="mt-1 text-sm">{user.salesRep.territoryName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Day</label>
                  <p className="mt-1 text-sm">{user.salesRep.deliveryDay || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Weekly Quota</label>
                  <p className="mt-1 text-sm">
                    {user.salesRep.weeklyRevenueQuota
                      ? formatCurrency(Number(user.salesRep.weeklyRevenueQuota))
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Quota</label>
                  <p className="mt-1 text-sm">
                    {user.salesRep.monthlyRevenueQuota
                      ? formatCurrency(Number(user.salesRep.monthlyRevenueQuota))
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sample Allowance</label>
                  <p className="mt-1 text-sm">
                    {formatNumber(user.salesRep.sampleAllowancePerMonth)}/month
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.salesRep.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.salesRep.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>

              {user.salesRep.customers.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Customers ({user.salesRep.customers.length})
                  </label>
                  <div className="space-y-1">
                    {user.salesRep.customers.map((customer) => (
                      <div key={customer.id} className="text-sm text-gray-600">
                        {customer.name} ({customer.accountNumber})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Account Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-500">User ID</label>
                <p className="font-mono text-xs">{user.id}</p>
              </div>
              <div>
                <label className="block text-gray-500">Created</label>
                <p>{new Date(user.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-gray-500">Last Updated</label>
                <p>{new Date(user.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-gray-500">Last Login</label>
                <p>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleDeactivate}
                disabled={saving || !user.isActive}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deactivate User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
