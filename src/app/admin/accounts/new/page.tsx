'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  code: string;
}

interface Customer {
  id: string;
  name: string;
  accountNumber: string | null;
}

type UserType = 'internal' | 'portal';

export default function NewAccountPage() {
  const router = useRouter();

  const [userType, setUserType] = useState<UserType>('internal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available options
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Internal User Form
  const [internalUserForm, setInternalUserForm] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    roleIds: [] as string[],
    createSalesRep: false,
    territoryName: '',
  });

  // Portal User Form
  const [portalUserForm, setPortalUserForm] = useState({
    email: '',
    fullName: '',
    customerId: '',
    roleIds: [] as string[],
    sendInvitation: false,
  });

  useEffect(() => {
    fetchRoles();
  }, [userType]);

  useEffect(() => {
    if (userType === 'portal') {
      fetchCustomers();
    }
  }, [userType]);

  const fetchRoles = async () => {
    try {
      const type = userType === 'internal' ? 'internal' : 'portal';
      const response = await fetch(`/api/admin/roles?type=${type}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch roles');
      }

      setAvailableRoles(data.roles);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch('/api/admin/customers?limit=1000');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      setAvailableCustomers(data.customers || []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const toggleRole = (roleId: string, type: UserType) => {
    if (type === 'internal') {
      setInternalUserForm(prev => ({
        ...prev,
        roleIds: prev.roleIds.includes(roleId)
          ? prev.roleIds.filter(id => id !== roleId)
          : [...prev.roleIds, roleId]
      }));
    } else {
      setPortalUserForm(prev => ({
        ...prev,
        roleIds: prev.roleIds.includes(roleId)
          ? prev.roleIds.filter(id => id !== roleId)
          : [...prev.roleIds, roleId]
      }));
    }
  };

  const validateInternalUser = () => {
    if (!internalUserForm.email || !internalUserForm.fullName || !internalUserForm.password) {
      setError('Email, full name, and password are required');
      return false;
    }

    if (internalUserForm.password !== internalUserForm.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (internalUserForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (internalUserForm.createSalesRep && !internalUserForm.territoryName) {
      setError('Territory name is required when creating a sales rep profile');
      return false;
    }

    return true;
  };

  const validatePortalUser = () => {
    if (!portalUserForm.email || !portalUserForm.fullName || !portalUserForm.customerId) {
      setError('Email, full name, and customer are required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (userType === 'internal') {
      if (!validateInternalUser()) return;

      setLoading(true);

      try {
        const response = await fetch('/api/admin/accounts/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(internalUserForm),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create user');
        }

        alert('Internal user created successfully');
        router.push(`/admin/accounts/user/${data.user.id}`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!validatePortalUser()) return;

      setLoading(true);

      try {
        const response = await fetch('/api/admin/accounts/portal-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(portalUserForm),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create portal user');
        }

        alert('Portal user created successfully');
        router.push(`/admin/accounts/portal-user/${data.portalUser.id}`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/accounts" className="text-blue-600 hover:text-blue-900 mb-4 inline-block">
          &larr; Back to Accounts
        </Link>
        <h1 className="text-3xl font-bold">Create New Account</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        {/* User Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Type
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setUserType('internal')}
              className={`px-6 py-3 rounded-lg font-medium ${
                userType === 'internal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Internal User
            </button>
            <button
              type="button"
              onClick={() => setUserType('portal')}
              className={`px-6 py-3 rounded-lg font-medium ${
                userType === 'portal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Portal User
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {userType === 'internal'
              ? 'Create an account for internal staff (sales reps, managers, admins)'
              : 'Create a portal account for customers to access their orders and invoices'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {userType === 'internal' ? (
            <>
              {/* Internal User Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={internalUserForm.email}
                  onChange={(e) => setInternalUserForm({ ...internalUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={internalUserForm.fullName}
                  onChange={(e) => setInternalUserForm({ ...internalUserForm, fullName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={internalUserForm.password}
                  onChange={(e) => setInternalUserForm({ ...internalUserForm, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={internalUserForm.confirmPassword}
                  onChange={(e) => setInternalUserForm({ ...internalUserForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles
                </label>
                <div className="space-y-2">
                  {availableRoles.map((role) => (
                    <div key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`role-${role.id}`}
                        checked={internalUserForm.roleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id, 'internal')}
                        className="rounded mr-2"
                      />
                      <label htmlFor={`role-${role.id}`} className="text-sm">
                        <span className="font-medium">{role.name}</span>
                        <span className="text-gray-500 ml-2">({role.code})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="createSalesRep"
                    checked={internalUserForm.createSalesRep}
                    onChange={(e) => setInternalUserForm({ ...internalUserForm, createSalesRep: e.target.checked })}
                    className="rounded mr-2 mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="createSalesRep" className="text-sm font-medium text-gray-700">
                      Create Sales Rep Profile
                    </label>
                    <p className="text-xs text-gray-500">
                      Create a linked sales representative profile with territory assignment
                    </p>
                  </div>
                </div>

                {internalUserForm.createSalesRep && (
                  <div className="mt-4 ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Territory Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={internalUserForm.territoryName}
                      onChange={(e) => setInternalUserForm({ ...internalUserForm, territoryName: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="e.g., Northeast, California, etc."
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Portal User Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={portalUserForm.email}
                  onChange={(e) => setPortalUserForm({ ...portalUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={portalUserForm.fullName}
                  onChange={(e) => setPortalUserForm({ ...portalUserForm, fullName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Linked Customer <span className="text-red-500">*</span>
                </label>
                {loadingCustomers ? (
                  <div className="text-sm text-gray-500">Loading customers...</div>
                ) : (
                  <select
                    value={portalUserForm.customerId}
                    onChange={(e) => setPortalUserForm({ ...portalUserForm, customerId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select a customer...</option>
                    {availableCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.accountNumber && `(${customer.accountNumber})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles
                </label>
                <div className="space-y-2">
                  {availableRoles.map((role) => (
                    <div key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`role-${role.id}`}
                        checked={portalUserForm.roleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id, 'portal')}
                        className="rounded mr-2"
                      />
                      <label htmlFor={`role-${role.id}`} className="text-sm">
                        <span className="font-medium">{role.name}</span>
                        <span className="text-gray-500 ml-2">({role.code})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="sendInvitation"
                    checked={portalUserForm.sendInvitation}
                    onChange={(e) => setPortalUserForm({ ...portalUserForm, sendInvitation: e.target.checked })}
                    className="rounded mr-2 mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="sendInvitation" className="text-sm font-medium text-gray-700">
                      Send Invitation Email
                    </label>
                    <p className="text-xs text-gray-500">
                      Send an email invitation to the portal user (email functionality not yet implemented)
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
            <Link
              href="/admin/accounts"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
