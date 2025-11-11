'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { CustomerClassificationFields } from '@/components/customers/CustomerClassificationFields';
import { CustomerBasicInfoFields } from '@/components/customers/forms/CustomerBasicInfoFields';
import { CustomerAddressFields } from '@/components/customers/forms/CustomerAddressFields';
import { CustomerDeliveryFields } from '@/components/customers/forms/CustomerDeliveryFields';
import { CustomerContactsManager } from '@/components/customers/CustomerContactsManager';
import { GoogleMapsAutoFill } from '@/components/customers/GoogleMapsAutoFill';
import { CustomerGoogleFields } from '@/components/customers/forms/CustomerGoogleFields';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { formatDistanceToNow } from 'date-fns';
import ReassignModal from '@/app/admin/customers/components/ReassignModal';
import type {
  CustomerType,
  FeatureProgram,
  VolumeCapacity,
  DeliveryWindow,
} from '@/types/customer';
import type { GooglePlaceSuggestion } from "@/lib/maps/googlePlaces";

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
  website: string | null;
  internationalPhone: string | null;
  googlePlaceId: string | null;
  googlePlaceName: string | null;
  googleFormattedAddress: string | null;
  googleMapsUrl: string | null;
  googleBusinessStatus: string | null;
  googlePlaceTypes: string[];
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
  firstOrderDate: string | null;
  orders: Array<{
    id: string;
    total: number;
    orderedAt: string | null;
    deliveredAt: string | null;
    status: string;
    createdAt: string;
  }>;
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
  internationalPhone: string;
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
  website: string;
  googlePlaceId: string;
  googlePlaceName: string;
  googleFormattedAddress: string;
  googleMapsUrl: string;
  googleBusinessStatus: string;
  googlePlaceTypes: string[];
};

const INITIAL_FORM_STATE: CustomerFormState = {
  name: '',
  billingEmail: '',
  phone: '',
  internationalPhone: '',
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
  website: '',
  googlePlaceId: '',
  googlePlaceName: '',
  googleFormattedAddress: '',
  googleMapsUrl: '',
  googleBusinessStatus: '',
  googlePlaceTypes: [],
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormState>(INITIAL_FORM_STATE);
  const [resolvingFlagId, setResolvingFlagId] = useState<string | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>(
    initialTabParam === 'details' ? 'details' : 'overview'
  );
  const updateForm = useCallback((updates: Partial<CustomerFormState>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    params.then((resolved) => setCustomerId(resolved.id));
  }, [params]);

  const handleTabChange = useCallback(
    (tab: 'overview' | 'details') => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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
        internationalPhone: data.customer.internationalPhone ?? '',
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
        website: data.customer.website ?? '',
        googlePlaceId: data.customer.googlePlaceId ?? '',
        googlePlaceName: data.customer.googlePlaceName ?? '',
        googleFormattedAddress: data.customer.googleFormattedAddress ?? '',
        googleMapsUrl: data.customer.googleMapsUrl ?? '',
        googleBusinessStatus: data.customer.googleBusinessStatus ?? '',
        googlePlaceTypes: data.customer.googlePlaceTypes ?? [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const applyGoogleSuggestion = (
    suggestion: GooglePlaceSuggestion,
    { overwriteExisting }: { overwriteExisting: boolean }
  ) => {
    setFormData((prev) => {
      const applyField = (currentValue: string, nextValue?: string | null) => {
        if (!nextValue) {
          return currentValue;
        }
        if (overwriteExisting || !currentValue.trim()) {
          return nextValue;
        }
        return currentValue;
      };
      const applyArray = (currentValues: string[], nextValues?: string[] | null) => {
        if (!nextValues || nextValues.length === 0) {
          return currentValues;
        }
        if (overwriteExisting || currentValues.length === 0) {
          return nextValues;
        }
        return currentValues;
      };
      const phone = suggestion.phoneNumber ?? suggestion.internationalPhoneNumber ?? "";
      const address = suggestion.address ?? null;

      return {
        ...prev,
        name: applyField(prev.name, suggestion.name ?? null),
        phone: phone ? applyField(prev.phone, phone) : prev.phone,
        internationalPhone: suggestion.internationalPhoneNumber
          ? applyField(prev.internationalPhone, suggestion.internationalPhoneNumber)
          : prev.internationalPhone,
        street1: applyField(prev.street1, address?.street1 ?? null),
        city: applyField(prev.city, address?.city ?? null),
        state: applyField(prev.state, address?.state ?? null),
        postalCode: applyField(prev.postalCode, address?.postalCode ?? null),
        country: applyField(prev.country, address?.country ?? null),
        website: applyField(prev.website, suggestion.website ?? null),
        googlePlaceId: applyField(prev.googlePlaceId, suggestion.placeId ?? null),
        googlePlaceName: applyField(prev.googlePlaceName, suggestion.name ?? null),
        googleFormattedAddress: applyField(prev.googleFormattedAddress, suggestion.formattedAddress ?? null),
        googleMapsUrl: applyField(prev.googleMapsUrl, suggestion.googleMapsUrl ?? null),
        googleBusinessStatus: applyField(prev.googleBusinessStatus, suggestion.businessStatus ?? null),
        googlePlaceTypes: applyArray(prev.googlePlaceTypes, suggestion.types ?? null),
      };
    });
  };

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
    <>
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
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/sales/customers/${customerId}`}
            target="_blank"
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            View Sales Dashboard
          </Link>
          <Link
            href={`/sales/orders/new?customerId=${customerId}`}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
          >
            Add Order
          </Link>
          <button
            onClick={handleArchive}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
          >
            Archive Customer
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'details', label: 'Details & Editing' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key as 'overview' | 'details')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <>
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
                <div className="font-semibold text-2xl">
                  {formatCurrency(customer.totalRevenue, 'USD', { decimals: 2 })}
                </div>
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
                  {formatCurrency(customer.outstandingAmount, 'USD', { decimals: 2 })}
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-900">Customer Since</div>
              <div className="text-2xl font-bold text-blue-900">
                {customer.firstOrderDate
                  ? formatShortDate(customer.firstOrderDate)
                  : 'No orders yet'}
              </div>
              {customer.firstOrderDate && (
                <div className="text-xs text-blue-700 mt-1">
                  First recorded order{' '}
                  {formatDistanceToNow(new Date(customer.firstOrderDate), { addSuffix: true })}
                </div>
              )}
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

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Orders</h2>
              <Link
                href={`/admin/orders?customerId=${customer.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {customer.orders.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No orders recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Order #</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Ordered</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Delivered</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {customer.orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-900">{order.id.slice(0, 8)}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {order.orderedAt ? formatShortDate(order.orderedAt) : '-'}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {order.deliveredAt ? formatShortDate(order.deliveredAt) : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                          {formatCurrency(order.total, 'USD', { decimals: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
        {customerId ? (
          <div className="mb-6 space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Auto-fill with Google Maps</h2>
            <GoogleMapsAutoFill
              variant="admin"
              customerId={customerId}
              defaultQuery={formData.name}
              onApply={applyGoogleSuggestion}
            />
          </div>
        ) : null}

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

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">Google Maps Metadata</h2>
          <p className="text-sm text-gray-500 mb-4">
            Store canonical Google data for deduping and quick lookups.
          </p>
          <CustomerGoogleFields
            values={{
              website: formData.website || null,
              googlePlaceId: formData.googlePlaceId || null,
              googlePlaceName: formData.googlePlaceName || null,
              googleFormattedAddress: formData.googleFormattedAddress || null,
              internationalPhone: formData.internationalPhone || null,
              googleMapsUrl: formData.googleMapsUrl || null,
              googleBusinessStatus: formData.googleBusinessStatus || null,
              googlePlaceTypes: formData.googlePlaceTypes,
            }}
            disabled={saving}
            onChange={(field, value) => updateForm({ [field]: value ?? "" } as Partial<CustomerFormState>)}
            onTypesChange={(types) => updateForm({ googlePlaceTypes: types })}
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
              onClick={() => setIsReassignModalOpen(true)}
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
        </>
      )}
      </div>
      {customer && customerId ? (
        <ReassignModal
          customerId={customerId}
          customerName={customer.name}
          currentSalesRep={
            customer.salesRep
              ? {
                  id: customer.salesRep.id,
                  name: customer.salesRep.user.fullName,
                  email: customer.salesRep.user.email,
                  territoryName: customer.salesRep.territoryName,
                }
              : null
          }
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          onSuccess={fetchCustomer}
        />
      ) : null}
    </>
  );
}
