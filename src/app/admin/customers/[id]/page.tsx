'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CustomerClassificationFields } from '@/components/customers/CustomerClassificationFields';
import { CustomerBasicInfoFields } from '@/components/customers/forms/CustomerBasicInfoFields';
import { CustomerAddressFields } from '@/components/customers/forms/CustomerAddressFields';
import { CustomerDeliveryFields } from '@/components/customers/forms/CustomerDeliveryFields';
import { CustomerContactsManager } from '@/components/customers/CustomerContactsManager';
import type {
  CustomerType,
  FeatureProgram,
  VolumeCapacity,
  DeliveryWindow,
} from '@/types/customer';

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
  licenseNumber: string | null;
  deliveryInstructions: string | null;
  deliveryMethod: string | null;
  paymentMethod: string | null;
  defaultWarehouseLocation: string | null;
  deliveryWindows: DeliveryWindow[] | null;
  riskStatus: string;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  averageOrderIntervalDays: number | null;
  isPermanentlyClosed: boolean;
  closedReason: string | null;
  type: string | null;
  volumeCapacity: string | null;
  featurePrograms: FeatureProgram[];
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
  contacts: Array<{
    id: string;
    fullName: string;
    role: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    notes: string | null;
    businessCardUrl: string | null;
    createdAt: string;
  }>;
  totalRevenue: number;
  totalOrders: number;
  openInvoicesCount: number;
  outstandingAmount: number;
  daysSinceLastOrder: number | null;
  duplicateFlags: Array<{
    id: string;
    notes: string | null;
    createdAt: string;
    duplicateOfCustomerId: string | null;
    duplicateOf: {
      id: string;
      name: string;
      accountNumber: string | null;
    } | null;
    flaggedByPortalUser: {
      id: string;
      fullName: string;
      email: string;
    } | null;
  }>;
}

const RISK_STATUS_COLORS = {
  HEALTHY: 'bg-green-100 text-green-800 border-green-300',
  AT_RISK_CADENCE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  AT_RISK_REVENUE: 'bg-orange-100 text-orange-800 border-orange-300',
  DORMANT: 'bg-red-100 text-red-800 border-red-300',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-300',
};

type CustomerFormState = {
  name: string;
  billingEmail: string;
  phone: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  paymentTerms: string;
  salesRepId: string;
  isPermanentlyClosed: boolean;
  closedReason: string;
  type: CustomerType | '';
  volumeCapacity: VolumeCapacity | '';
  featurePrograms: FeatureProgram[];
  licenseNumber: string;
  deliveryInstructions: string;
  deliveryMethod: string;
  paymentMethod: string;
  defaultWarehouseLocation: string;
  deliveryWindows: DeliveryWindow[];
};

const INITIAL_FORM_STATE: CustomerFormState = {
  name: '',
  billingEmail: '',
  phone: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  paymentTerms: '',
  salesRepId: '',
  isPermanentlyClosed: false,
  closedReason: '',
  type: '',
  volumeCapacity: '',
  featurePrograms: [],
  licenseNumber: '',
  deliveryInstructions: '',
  deliveryMethod: '',
  paymentMethod: '',
  defaultWarehouseLocation: '',
  deliveryWindows: [],
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormState>(INITIAL_FORM_STATE);
  const [resolvingFlagId, setResolvingFlagId] = useState<string | null>(null);
  const updateForm = useCallback((updates: Partial<CustomerFormState>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Unwrap params with React.use()
  useEffect(() => {
    params.then(p => setCustomerId(p.id));
  }, [params]);

  const fetchCustomer = useCallback(async () => {
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
        name: data.customer.name ?? '',
        billingEmail: data.customer.billingEmail ?? '',
        phone: data.customer.phone ?? '',
        street1: data.customer.street1 ?? '',
        street2: data.customer.street2 ?? '',
        city: data.customer.city ?? '',
        state: data.customer.state ?? '',
        postalCode: data.customer.postalCode ?? '',
        country: data.customer.country ?? 'US',
        paymentTerms: data.customer.paymentTerms ?? '',
        salesRepId: data.customer.salesRep?.id ?? '',
        isPermanentlyClosed: Boolean(data.customer.isPermanentlyClosed),
        closedReason: data.customer.closedReason ?? '',
        type: (data.customer.type as CustomerType) || '',
        volumeCapacity: (data.customer.volumeCapacity as VolumeCapacity) || '',
        featurePrograms: data.customer.featurePrograms ?? [],
        licenseNumber: data.customer.licenseNumber ?? '',
        deliveryInstructions: data.customer.deliveryInstructions ?? '',
        deliveryMethod: data.customer.deliveryMethod ?? '',
        paymentMethod: data.customer.paymentMethod ?? '',
        defaultWarehouseLocation: data.customer.defaultWarehouseLocation ?? '',
        deliveryWindows: Array.isArray(data.customer.deliveryWindows)
          ? (data.customer.deliveryWindows as DeliveryWindow[])
          : [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId, fetchCustomer]);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
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
          updateReason: `Archived by admin: ${reason}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive customer');
      }

      alert('Customer archived successfully');
      router.push('/admin/customers');
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to archive customer'));
    }
  };

  const handleResolveDuplicate = async (flagId: string) => {
    if (!customerId) return;
    if (!confirm('Resolve this duplicate flag?')) {
      return;
    }

    setResolvingFlagId(flagId);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/duplicate-flags/${flagId}/resolve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resolve flag');
      }

      fetchCustomer();
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to resolve duplicate flag'));
    } finally {
      setResolvingFlagId(null);
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

      {customer.duplicateFlags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Duplicate Flags</h2>
          <div className="space-y-4">
            {customer.duplicateFlags.map((flag) => (
              <div
                key={flag.id}
                className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">Flagged for review</p>
                    <p className="text-amber-800">
                      {flag.notes ?? 'No notes provided.'}
                    </p>
                    <p className="text-xs text-amber-700">
                      Raised {new Date(flag.createdAt).toLocaleString()} by {flag.flaggedByPortalUser?.fullName ?? 'unknown user'}
                      {flag.flaggedByPortalUser?.email ? ` (${flag.flaggedByPortalUser.email})` : ''}
                    </p>
                    {flag.duplicateOf ? (
                      <p className="text-xs text-amber-700">
                        Suggested merge with {flag.duplicateOf.name}
                        {flag.duplicateOf.accountNumber ? ` (Account #${flag.duplicateOf.accountNumber})` : ''}
                        {flag.duplicateOf.id ? (
                          <span>
                            {' '}
                            <Link
                              href={`/admin/customers/${flag.duplicateOf.id}`}
                              className="text-amber-800 underline transition hover:text-amber-900"
                            >
                              Review customer
                            </Link>
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResolveDuplicate(flag.id)}
                    disabled={resolvingFlagId === flag.id}
                    className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resolvingFlagId === flag.id ? 'Resolving…' : 'Mark resolved'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          <CustomerBasicInfoFields
            values={{
              name: formData.name,
              accountNumber: customer?.accountNumber ?? null,
              billingEmail: formData.billingEmail,
              phone: formData.phone,
              paymentTerms: formData.paymentTerms,
              licenseNumber: formData.licenseNumber || null,
            }}
            onChange={(field, value) =>
              updateForm({ [field]: value } as Partial<CustomerFormState>)
            }
            disabled={saving}
            readOnlyFields={{ accountNumber: true }}
          />
        </div>

        {/* Location & Territory */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Location & Territory</h2>
          <CustomerAddressFields
            values={{
              street1: formData.street1,
              street2: formData.street2,
              city: formData.city,
              state: formData.state,
              postalCode: formData.postalCode,
              country: formData.country || 'US',
            }}
            onChange={(field, value) =>
              updateForm({ [field]: value } as Partial<CustomerFormState>)
            }
            disabled={saving}
          />
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

        {/* Delivery Preferences */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Delivery Preferences</h2>
          <CustomerDeliveryFields
            values={{
              deliveryInstructions: formData.deliveryInstructions || null,
              deliveryWindows: formData.deliveryWindows,
              paymentMethod: formData.paymentMethod || null,
              deliveryMethod: formData.deliveryMethod || null,
              defaultWarehouseLocation: formData.defaultWarehouseLocation || null,
            }}
            disabled={saving}
            onChange={(updates) =>
              updateForm(updates as Partial<CustomerFormState>)
            }
          />
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

        {customer && customerId && (
          <div className="mb-6">
            <CustomerContactsManager
              customerId={customerId}
              initialContacts={customer.contacts ?? []}
              variant="admin"
            />
          </div>
        )}

        {/* Analytics & Reporting */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-1">Analytics & Reporting</h3>
          <p className="text-sm text-gray-500 mb-4">
            Used for customer segmentation and sales analysis
          </p>

          <CustomerClassificationFields
            typeValue={formData.type || ''}
            volumeCapacityValue={formData.volumeCapacity || ''}
            featureProgramsValue={formData.featurePrograms}
            onTypeChange={(value) =>
              updateForm({ type: (value as CustomerType) || '' })
            }
            onVolumeCapacityChange={(value) =>
              updateForm({ volumeCapacity: (value as VolumeCapacity) || '' })
            }
            onFeatureProgramsChange={(programs) =>
              updateForm({ featurePrograms: programs })
            }
            disabled={saving}
          />
        </div>
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
