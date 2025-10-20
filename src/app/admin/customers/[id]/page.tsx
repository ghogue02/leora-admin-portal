'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  phone: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  paymentTerms: string | null;
  riskStatus: string;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  averageOrderIntervalDays: number | null;
  isPermanentlyClosed: boolean;
  closedReason: string | null;
  salesRep: {
    id: string;
    user: { fullName: string; email: string };
    territoryName: string;
  } | null;
  portalUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    status: string;
    lastLoginAt: string | null;
  }>;
  totalRevenue: number;
  totalOrders: number;
  openInvoicesCount: number;
  outstandingAmount: number;
  daysSinceLastOrder: number | null;
}

const RISK_STATUS_COLORS = {
  HEALTHY: 'bg-green-100 text-green-800 border-green-300',
  AT_RISK_CADENCE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  AT_RISK_REVENUE: 'bg-orange-100 text-orange-800 border-orange-300',
  DORMANT: 'bg-red-100 text-red-800 border-red-300',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Unwrap params with React.use()
  useEffect(() => {
    params.then(p => setCustomerId(p.id));
  }, [params]);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    if (!customerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer');
      }

      setCustomer(data.customer);
      setFormData({
        name: data.customer.name,
        billingEmail: data.customer.billingEmail,
        phone: data.customer.phone,
        street1: data.customer.street1,
        street2: data.customer.street2,
        city: data.customer.city,
        state: data.customer.state,
        postalCode: data.customer.postalCode,
        country: data.customer.country,
        paymentTerms: data.customer.paymentTerms,
        salesRepId: data.customer.salesRep?.id || '',
        isPermanentlyClosed: data.customer.isPermanentlyClosed,
        closedReason: data.customer.closedReason,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      alert('Customer updated successfully');
      fetchCustomer(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!customerId) return;

    if (!confirm('Are you sure you want to archive this customer?')) {
      return;
    }

    const reason = prompt('Please provide a reason for archiving:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPermanentlyClosed: true,
          closedReason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive customer');
      }

      alert('Customer archived successfully');
      router.push('/admin/customers');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-6">Loading customer...</div>;
  }

  if (error || !customer) {
    return <div className="p-6 text-red-600">{error || 'Customer not found'}</div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin/customers" className="text-blue-600 hover:underline mb-2 block">
            ← Back to Customers
          </Link>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="text-gray-500">Account #{customer.accountNumber}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleArchive}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Archive Customer
          </button>
        </div>
      </div>

      {/* Account Health Overview */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Account Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Risk Status</div>
            <span
              className={`inline-block px-3 py-1 rounded font-medium border ${
                RISK_STATUS_COLORS[customer.riskStatus as keyof typeof RISK_STATUS_COLORS]
              }`}
            >
              {customer.riskStatus}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-500">Last Order</div>
            <div className="font-semibold">
              {customer.lastOrderDate
                ? new Date(customer.lastOrderDate).toLocaleDateString()
                : 'Never'}
            </div>
            {customer.daysSinceLastOrder !== null && (
              <div className="text-sm text-gray-500">{customer.daysSinceLastOrder} days ago</div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Orders</div>
            <div className="font-semibold text-2xl">{customer.totalOrders}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Lifetime Revenue</div>
            <div className="font-semibold text-2xl">${customer.totalRevenue.toFixed(2)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <div className="text-sm text-gray-500">Next Expected Order</div>
            <div className="font-semibold">
              {customer.nextExpectedOrderDate
                ? new Date(customer.nextExpectedOrderDate).toLocaleDateString()
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Avg Order Interval</div>
            <div className="font-semibold">
              {customer.averageOrderIntervalDays
                ? `${customer.averageOrderIntervalDays} days`
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Open Invoices</div>
            <div className="font-semibold">{customer.openInvoicesCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Outstanding Amount</div>
            <div className="font-semibold text-red-600">
              ${customer.outstandingAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input
                type="text"
                disabled
                value={customer.accountNumber || ''}
                className="w-full border rounded px-3 py-2 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Billing Email *</label>
              <input
                type="email"
                required
                value={formData.billingEmail}
                onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <input
                type="text"
                value={formData.paymentTerms || ''}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Location & Territory */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Location & Territory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <input
                type="text"
                value={formData.street1 || ''}
                onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Street Address 2</label>
              <input
                type="text"
                value={formData.street2 || ''}
                onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <input
                type="text"
                value={formData.postalCode || ''}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">Current Sales Rep</div>
            {customer.salesRep ? (
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold">{customer.salesRep.user.fullName}</div>
                <div className="text-sm text-gray-500">{customer.salesRep.user.email}</div>
                <div className="text-sm text-gray-500">Territory: {customer.salesRep.territoryName}</div>
              </div>
            ) : (
              <div className="text-gray-500">No sales rep assigned</div>
            )}
            <button
              type="button"
              onClick={() => {
                // TODO: Open reassignment modal
                alert('Reassignment modal - to be implemented');
              }}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Reassign to Different Rep
            </button>
          </div>
        </div>

        {/* Contact Persons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Contact Persons</h2>
          {customer.portalUsers.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {customer.portalUsers.map(user => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-2">{user.fullName}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No portal users associated with this customer</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/admin/customers"
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded hover:bg-gray-400"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
