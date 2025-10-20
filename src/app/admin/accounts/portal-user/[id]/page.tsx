'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  code: string;
  permissions: { id: string; code: string; name: string }[];
}

interface Customer {
  id: string;
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  salesRep: {
    id: string;
    name: string;
    email: string;
    territoryName: string;
  } | null;
}

interface PortalUser {
  id: string;
  email: string;
  fullName: string;
  portalUserKey: string | null;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
  permissions: string[];
  customer: Customer | null;
  recentSessions: { id: string; createdAt: string; expiresAt: string }[];
}

interface AvailableRole {
  id: string;
  name: string;
  code: string;
}

const STATUS_OPTIONS = ['ACTIVE', 'INVITED', 'DISABLED'];

export default function PortalUserDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [portalUserId, setPortalUserId] = useState<string | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INVITED' | 'DISABLED',
  });

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (params?.id) {
      setPortalUserId(params.id as string);
    }
  }, [params]);

  useEffect(() => {
    if (portalUserId) {
      fetchPortalUser();
      fetchAvailableRoles();
    }
  }, [portalUserId]);

  const fetchPortalUser = async () => {
    if (!portalUserId) return;

    try {
      const response = await fetch(`/api/admin/accounts/portal-users/${portalUserId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch portal user');
      }

      setPortalUser(data.portalUser);
      setFormData({
        fullName: data.portalUser.fullName,
        email: data.portalUser.email,
        status: data.portalUser.status,
      });
      setSelectedRoleIds(data.portalUser.roles.map((r: Role) => r.id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles?type=portal');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch roles');
      }

      setAvailableRoles(data.roles);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleSave = async () => {
    if (!portalUserId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/accounts/portal-users/${portalUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal user');
      }

      alert('Portal user updated successfully');
      fetchPortalUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!portalUserId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/accounts/portal-users/${portalUserId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: selectedRoleIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update roles');
      }

      alert('Roles updated successfully');
      fetchPortalUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!portalUserId) return;

    if (!confirm('Are you sure you want to disable this portal user?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/accounts/portal-users/${portalUserId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable portal user');
      }

      alert('Portal user disabled successfully');
      router.push('/admin/accounts');
    } catch (err: any) {
      setError(err.message);
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
          <p className="mt-2 text-gray-600">Loading portal user...</p>
        </div>
      </div>
    );
  }

  if (!portalUser) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Portal user not found
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
        <h1 className="text-3xl font-bold">Edit Portal User: {portalUser.fullName}</h1>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
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

          {/* Linked Customer */}
          {portalUser.customer && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Linked Customer</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm">{portalUser.customer.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <p className="mt-1 text-sm">{portalUser.customer.accountNumber || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm">{portalUser.customer.billingEmail || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm">{portalUser.customer.phone || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm">
                    {portalUser.customer.city && portalUser.customer.state
                      ? `${portalUser.customer.city}, ${portalUser.customer.state}`
                      : '-'}
                  </p>
                </div>
                {portalUser.customer.salesRep && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sales Rep</label>
                    <p className="mt-1 text-sm">
                      {portalUser.customer.salesRep.name}
                      <br />
                      <span className="text-gray-500 text-xs">
                        {portalUser.customer.salesRep.territoryName}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Link
                  href={`/admin/customers/${portalUser.customer.id}`}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  View Customer Details &rarr;
                </Link>
              </div>
            </div>
          )}

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
                  {portalUser.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
                {portalUser.permissions.length === 0 && (
                  <p className="text-sm text-gray-500">No permissions assigned</p>
                )}
              </div>
            </div>
          </div>

          {/* Portal Access */}
          {portalUser.recentSessions.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Portal Sessions</h2>
              <div className="space-y-2">
                {portalUser.recentSessions.map((session) => (
                  <div key={session.id} className="flex justify-between text-sm border-b pb-2">
                    <span>Created: {new Date(session.createdAt).toLocaleString()}</span>
                    <span className="text-gray-500">
                      Expires: {new Date(session.expiresAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
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
                <p className="font-mono text-xs">{portalUser.id}</p>
              </div>
              {portalUser.portalUserKey && (
                <div>
                  <label className="block text-gray-500">Portal Key</label>
                  <p className="font-mono text-xs">{portalUser.portalUserKey}</p>
                </div>
              )}
              <div>
                <label className="block text-gray-500">Status</label>
                <p>
                  <span className={`px-2 py-1 text-xs rounded ${
                    portalUser.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : portalUser.status === 'INVITED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {portalUser.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-gray-500">Created</label>
                <p>{new Date(portalUser.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-gray-500">Last Updated</label>
                <p>{new Date(portalUser.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-gray-500">Last Login</label>
                <p>{portalUser.lastLoginAt ? new Date(portalUser.lastLoginAt).toLocaleString() : 'Never'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleDisable}
                disabled={saving || portalUser.status === 'DISABLED'}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable Portal User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
