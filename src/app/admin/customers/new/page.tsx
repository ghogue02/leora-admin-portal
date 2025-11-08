'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    billingEmail: '',
    phone: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    paymentTerms: 'Net 30',
    salesRepId: '',
    accountNumber: '', // Optional - will be auto-generated if empty
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      alert('Customer created successfully');
      router.push(`/admin/customers/${data.customer.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/customers" className="text-blue-600 hover:underline mb-2 block">
          ← Back to Customers
        </Link>
        <h1 className="text-3xl font-bold">Add New Customer</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Account Number <span className="text-gray-500">(optional - auto-generated)</span>
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Leave empty for auto-generation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Billing Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.billingEmail}
                onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="billing@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="COD">COD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.street1}
                onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="123 Main St"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Street Address 2</label>
              <input
                type="text"
                value={formData.street2}
                onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Suite 100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="NY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="10001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Assignment */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Sales Assignment</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Sales Representative</label>
            <input
              type="text"
              value={formData.salesRepId}
              onChange={(e) => setFormData({ ...formData, salesRepId: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Sales Rep ID (optional - can be assigned later)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty to assign later, or enter a sales rep ID
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Customer'}
          </button>
          <Link
            href="/admin/customers"
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded hover:bg-gray-400 inline-block"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
