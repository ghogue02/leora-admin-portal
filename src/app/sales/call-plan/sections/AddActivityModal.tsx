"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

type AddActivityModalProps = {
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
};

type Customer = {
  id: string;
  name: string;
  city?: string;
  state?: string;
};

type ActivityType = {
  id: string;
  name: string;
  code: string;
};

export default function AddActivityModal({
  selectedDate,
  onClose,
  onSuccess,
}: AddActivityModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    activityTypeId: "",
    notes: "",
    estimatedDuration: 30,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, activityTypesRes] = await Promise.all([
        fetch("/api/sales/customers?limit=1000"),
        fetch("/api/sales/activity-types"),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }

      if (activityTypesRes.ok) {
        const data = await activityTypesRes.json();
        setActivityTypes(data.activityTypes || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/sales/call-plan/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          activityTypeId: formData.activityTypeId,
          dueAt: selectedDate.toISOString(),
          description: formData.notes,
          title: `${
            customers.find((c) => c.id === formData.customerId)?.name || "Customer"
          } - ${
            activityTypes.find((at) => at.id === formData.activityTypeId)?.name || "Activity"
          }`,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert("Failed to add activity. Please try again.");
      }
    } catch (error) {
      console.error("Error adding activity:", error);
      alert("Failed to add activity. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Add Activity</h2>
          <p className="mt-1 text-sm text-gray-600">
            Schedule an activity for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Body */}
            <div className="space-y-4 p-6">
              {/* Customer Selection */}
              <div>
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                  Customer *
                </label>
                <select
                  id="customer"
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.city && customer.state && ` - ${customer.city}, ${customer.state}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Type Selection */}
              <div>
                <label htmlFor="activityType" className="block text-sm font-medium text-gray-700">
                  Activity Type *
                </label>
                <select
                  id="activityType"
                  required
                  value={formData.activityTypeId}
                  onChange={(e) =>
                    setFormData({ ...formData, activityTypeId: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select activity type...</option>
                  {activityTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Estimated Duration (minutes)
                </label>
                <input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.estimatedDuration}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any prep notes or objectives for this activity..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Activity"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
