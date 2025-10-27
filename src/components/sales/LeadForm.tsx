'use client';

import { useState } from 'react';
import { LeadSource, InterestLevel, FunnelStage } from '@/lib/models/Lead';

interface LeadFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  salesReps?: Array<{ id: string; name: string }>;
  products?: string[];
}

export default function LeadForm({ initialData, onSubmit, onCancel, salesReps = [], products = [] }: LeadFormProps) {
  const [formData, setFormData] = useState({
    companyName: initialData?.companyName || '',
    contactName: initialData?.contactName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    leadSource: initialData?.leadSource || LeadSource.WEBSITE,
    interestLevel: initialData?.interestLevel || InterestLevel.WARM,
    estimatedValue: initialData?.estimatedValue || '',
    productsInterested: initialData?.productsInterested || [],
    assignedRepId: initialData?.assignedRepId || '',
    notes: initialData?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSubmit({
        ...formData,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (product: string) => {
    setFormData(prev => ({
      ...prev,
      productsInterested: prev.productsInterested.includes(product)
        ? prev.productsInterested.filter((p: string) => p !== product)
        : [...prev.productsInterested, product],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Contact Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Name *
          </label>
          <input
            type="text"
            required
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Lead Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lead Source *
          </label>
          <select
            required
            value={formData.leadSource}
            onChange={(e) => setFormData({ ...formData, leadSource: e.target.value as LeadSource })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={LeadSource.WEBSITE}>Website</option>
            <option value={LeadSource.REFERRAL}>Referral</option>
            <option value={LeadSource.COLD_CALL}>Cold Call</option>
            <option value={LeadSource.EVENT}>Event</option>
            <option value={LeadSource.SOCIAL_MEDIA}>Social Media</option>
            <option value={LeadSource.PARTNER}>Partner</option>
            <option value={LeadSource.OTHER}>Other</option>
          </select>
        </div>

        {/* Interest Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interest Level *
          </label>
          <select
            required
            value={formData.interestLevel}
            onChange={(e) => setFormData({ ...formData, interestLevel: e.target.value as InterestLevel })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={InterestLevel.HOT}>Hot</option>
            <option value={InterestLevel.WARM}>Warm</option>
            <option value={InterestLevel.COLD}>Cold</option>
          </select>
        </div>

        {/* Estimated Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Value ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.estimatedValue}
            onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Assigned Rep */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assigned Sales Rep
          </label>
          <select
            value={formData.assignedRepId}
            onChange={(e) => setFormData({ ...formData, assignedRepId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Unassigned</option>
            {salesReps.map(rep => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Interested */}
      {products.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Products Interested In
          </label>
          <div className="flex flex-wrap gap-2">
            {products.map(product => (
              <button
                key={product}
                type="button"
                onClick={() => handleProductToggle(product)}
                className={`px-4 py-2 rounded-lg border ${
                  formData.productsInterested.includes(product)
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {product}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : initialData ? 'Update Lead' : 'Create Lead'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
