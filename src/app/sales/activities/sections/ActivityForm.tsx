'use client';

import { useState, useEffect } from "react";
import { ACTIVITY_OUTCOME_OPTIONS, type ActivityOutcomeValue } from "@/constants/activityOutcomes";
import SampleItemsSelector from "@/components/activities/SampleItemsSelector";
import type { ActivitySampleSelection } from "@/types/activities";

type ActivityType = {
  code: string;
  name: string;
};

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
};

type ActivityFormProps = {
  customers: Customer[];
  activityTypes: ActivityType[];
  onSubmit: (data: ActivityFormData) => Promise<void>;
  onCancel?: () => void;
};

export type ActivityFormData = {
  activityTypeCode: string;
  customerId: string;
  subject: string;
  notes: string;
  occurredAt: string;
  followUpAt: string;
  outcomes: ActivityOutcomeValue[];
  sampleItems: Array<{
    skuId: string;
    sampleListItemId?: string;
    feedback?: string;
    followUpNeeded?: boolean;
  }>;
};

export default function ActivityForm({
  customers,
  activityTypes,
  onSubmit,
  onCancel,
}: ActivityFormProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    activityTypeCode: "",
    customerId: "",
    subject: "",
    notes: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    followUpAt: "",
    outcomes: [],
    sampleItems: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleSelections, setSampleSelections] = useState<ActivitySampleSelection[]>([]);

  // Auto-generate subject when activity type or customer changes
  useEffect(() => {
    if (formData.activityTypeCode && formData.customerId) {
      const activityType = activityTypes.find((t) => t.code === formData.activityTypeCode);
      const customer = customers.find((c) => c.id === formData.customerId);

      if (activityType && customer) {
        setFormData((prev) => ({
          ...prev,
          subject: `${activityType.name} - ${customer.name}`,
        }));
      }
    }
  }, [formData.activityTypeCode, formData.customerId, activityTypes, customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.activityTypeCode) {
        throw new Error("Please select an activity type");
      }
      if (!formData.customerId) {
        throw new Error("Please select a customer");
      }
      if (!formData.subject) {
        throw new Error("Please enter a subject");
      }
      if (!formData.occurredAt) {
        throw new Error("Please select a date and time");
      }

      const selectedSampleItems = sampleSelections
        .filter((item) => item.selected)
        .map((item) => ({
          skuId: item.skuId,
          sampleListItemId: item.sampleListItemId,
          feedback: item.feedback?.trim() ? item.feedback.trim() : undefined,
          followUpNeeded: item.followUp,
        }));

      await onSubmit({
        ...formData,
        sampleItems: selectedSampleItems,
      });

      // Reset form
      setFormData({
        activityTypeCode: "",
        customerId: "",
        subject: "",
        notes: "",
        occurredAt: new Date().toISOString().slice(0, 16),
        followUpAt: "",
        outcomes: [],
        sampleItems: [],
      });
      setSampleSelections([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log activity");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Activity Type */}
        <div>
          <label htmlFor="activityType" className="block text-sm font-semibold text-gray-700">
            Activity Type <span className="text-rose-500">*</span>
          </label>
          <select
            id="activityType"
            value={formData.activityTypeCode}
            onChange={(e) => setFormData({ ...formData, activityTypeCode: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Select activity type...</option>
            {activityTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer */}
        <div>
          <label htmlFor="customer" className="block text-sm font-semibold text-gray-700">
            Customer <span className="text-rose-500">*</span>
          </label>
          <select
            id="customer"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Select customer...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.accountNumber ? `(#${customer.accountNumber})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-gray-700">
          Subject <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Brief description of activity"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-semibold text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional details, outcomes, next steps..."
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Occurred At */}
        <div>
          <label htmlFor="occurredAt" className="block text-sm font-semibold text-gray-700">
            Date & Time <span className="text-rose-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="occurredAt"
            value={formData.occurredAt}
            onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Follow Up At */}
        <div>
          <label htmlFor="followUpAt" className="block text-sm font-semibold text-gray-700">
            Follow-up Date
          </label>
          <input
            type="datetime-local"
            id="followUpAt"
            value={formData.followUpAt}
            onChange={(e) => setFormData({ ...formData, followUpAt: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Outcomes (Select all that apply)
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ACTIVITY_OUTCOME_OPTIONS.map((option) => {
            const checked = formData.outcomes.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                  checked ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setFormData((prev) => ({
                      ...prev,
                      outcomes: prev.outcomes.includes(option.value)
                        ? prev.outcomes.filter((value) => value !== option.value)
                        : [...prev.outcomes, option.value],
                    }));
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="break-words leading-tight">{option.label}</span>
              </label>
            );
          })}
        </div>
        {formData.outcomes.length > 0 && (
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, outcomes: [] }))}
            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Clear selections
          </button>
        )}
      </div>

      <SampleItemsSelector value={sampleSelections} onChange={setSampleSelections} />

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Logging Activity..." : "Log Activity"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
