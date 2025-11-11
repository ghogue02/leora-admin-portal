'use client';

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ACTIVITY_OUTCOME_OPTIONS, type ActivityOutcomeValue } from "@/constants/activityOutcomes";
import SampleItemsSelector from "@/components/activities/SampleItemsSelector";
import type { ActivitySampleSelection } from "@/types/activities";
import { CustomerSearchCombobox } from "@/components/orders/CustomerSearchCombobox";

type ActivityType = {
  id: string;
  code: string;
  name: string;
};

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
};

type LogActivityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-populate fields
  customerId?: string;
  orderId?: string;
  sampleId?: string;
  activityTypeCode?: string;
  initialSubject?: string;
  // Context info
  contextType?: 'customer' | 'order' | 'sample' | 'carla';
  contextLabel?: string;
};

export default function LogActivityModal({
  isOpen,
  onClose,
  onSuccess,
  customerId: presetCustomerId,
  orderId: presetOrderId,
  sampleId: presetSampleId,
  activityTypeCode: presetActivityType,
  initialSubject,
  contextType,
  contextLabel,
}: LogActivityModalProps) {
  const queryClient = useQueryClient();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Voice-to-text state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [sampleSelections, setSampleSelections] = useState<ActivitySampleSelection[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    activityTypeCode: presetActivityType || "",
    customerId: presetCustomerId || "",
    orderId: presetOrderId || "",
    sampleId: presetSampleId || "",
    subject: initialSubject || "",
    notes: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    followUpAt: "",
    outcomes: [] as ActivityOutcomeValue[],
  });

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setFormData(prev => ({
            ...prev,
            notes: prev.notes + finalTranscript
          }));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Load activity types
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setLoading(true);
        try {
          const typesRes = await fetch("/api/sales/activity-types");
          if (typesRes.ok) {
            const data = await typesRes.json();
            setActivityTypes(data.activityTypes || []);
          }
        } catch (err) {
          console.error("Failed to load data:", err);
          setError("Failed to load form data");
        } finally {
          setLoading(false);
        }
      };

      void loadData();
    }
  }, [isOpen]);

  // Auto-generate subject when fields change
  useEffect(() => {
    if (
      formData.activityTypeCode &&
      formData.customerId &&
      selectedCustomer &&
      !initialSubject
    ) {
      const activityType = activityTypes.find((t) => t.code === formData.activityTypeCode);

      if (activityType) {
        setFormData((prev) => ({
          ...prev,
          subject: `${activityType.name} - ${selectedCustomer.name}`,
        }));
      }
    }
  }, [formData.activityTypeCode, formData.customerId, activityTypes, selectedCustomer, initialSubject]);

  useEffect(() => {
    if (!formData.customerId) {
      setSelectedCustomer(null);
      return;
    }

    if (selectedCustomer?.id === formData.customerId) {
      return;
    }

    let cancelled = false;

    const loadCustomer = async () => {
      try {
        const response = await fetch(`/api/sales/customers/${formData.customerId}`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (cancelled || !data?.customer) {
          return;
        }
        const fetchedCustomer = data.customer as Customer;
        setSelectedCustomer({
          id: fetchedCustomer.id,
          name: fetchedCustomer.name,
          accountNumber: fetchedCustomer.accountNumber ?? null,
        });
      } catch (err) {
        console.error("Failed to load customer details:", err);
      }
    };

    void loadCustomer();

    return () => {
      cancelled = true;
    };
  }, [formData.customerId, selectedCustomer?.id]);

  const handleCustomerChange = (customer: { id: string; name: string; accountNumber?: string | null }) => {
    setSelectedCustomer({
      id: customer.id,
      name: customer.name,
      accountNumber: customer.accountNumber ?? null,
    });
    setFormData((prev) => ({ ...prev, customerId: customer.id }));
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setError(null);
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError('Failed to start voice input');
      }
    }
  };

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

      const payload = {
        ...formData,
        sampleItems: selectedSampleItems,
      };

      // Submit to quick-log endpoint
      const response = await fetch("/api/sales/activities/quick-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to log activity");
      }

      const targetCustomerId = formData.customerId || presetCustomerId;
      if (targetCustomerId) {
        await queryClient.invalidateQueries({ queryKey: ["customer", targetCustomerId] });
      }

      // Show success toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Reset form and close
      setTimeout(() => {
        setFormData({
          activityTypeCode: presetActivityType || "",
          customerId: presetCustomerId || "",
          orderId: presetOrderId || "",
          sampleId: presetSampleId || "",
          subject: initialSubject || "",
          notes: "",
          occurredAt: new Date().toISOString().slice(0, 16),
          followUpAt: "",
          outcomes: [] as ActivityOutcomeValue[],
        });
        setSampleSelections([]);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log activity");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Log Activity</h2>
              {contextLabel && (
                <p className="mt-1 text-sm text-gray-600">
                  {contextType === 'customer' && 'For customer: '}
                  {contextType === 'order' && 'For order: '}
                  {contextType === 'sample' && 'For sample: '}
                  {contextType === 'carla' && 'Quick log from CARLA: '}
                  <span className="font-medium">{contextLabel}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Activity Type & Customer */}
              <div className="grid gap-4 sm:grid-cols-2">
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
                    disabled={loading || !!presetActivityType}
                  >
                    <option value="">Select type...</option>
                    {activityTypes.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="customer" className="block text-sm font-semibold text-gray-700">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-1">
                    <CustomerSearchCombobox
                      value={formData.customerId}
                      onChange={handleCustomerChange}
                      disabled={loading || !!presetCustomerId}
                    />
                  </div>
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

              {/* Notes with Voice Input */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="notes" className="block text-sm font-semibold text-gray-700">
                    Notes
                  </label>
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold transition ${
                        isRecording
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      {isRecording ? 'Recording...' : 'Voice Input'}
                </button>
              )}
            </div>

            {/* Samples */}
            <div>
              <span className="block text-sm font-semibold text-gray-700">
                Samples Shared
              </span>
              <SampleItemsSelector value={sampleSelections} onChange={setSampleSelections} />
            </div>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details, outcomes, next steps..."
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Date, Follow-up, Outcome */}
              <div className="grid gap-4 sm:grid-cols-2">
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
                <span className="block text-sm font-semibold text-gray-700">
                  Outcomes (Select all that apply)
                </span>
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
                          onChange={() =>
                            setFormData((prev) => ({
                              ...prev,
                              outcomes: prev.outcomes.includes(option.value)
                                ? prev.outcomes.filter((value) => value !== option.value)
                                : [...prev.outcomes, option.value],
                            }))
                          }
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
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        outcomes: [],
                      }))
                    }
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Clear selections
                  </button>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-semibold">Error</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex gap-3 border-t border-gray-200 pt-4">
              <button
                type="submit"
                disabled={submitting || loading}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Logging..." : "Log Activity"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-green-200 bg-green-50 px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-900">Activity Logged</p>
              <p className="text-sm text-green-700">Successfully recorded activity</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
