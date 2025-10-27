'use client';

import { useState, useEffect, useRef } from "react";
import type { ActivityOutcome } from "@prisma/client";

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Voice-to-text state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

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
    outcome: "PENDING" as ActivityOutcome,
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

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setLoading(true);
        try {
          const [customersRes, typesRes] = await Promise.all([
            fetch("/api/sales/customers?pageSize=1000"),
            fetch("/api/sales/activity-types"),
          ]);

          if (customersRes.ok) {
            const data = await customersRes.json();
            setCustomers(data.customers || []);
          }

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
    if (formData.activityTypeCode && formData.customerId && !initialSubject) {
      const activityType = activityTypes.find((t) => t.code === formData.activityTypeCode);
      const customer = customers.find((c) => c.id === formData.customerId);

      if (activityType && customer) {
        setFormData((prev) => ({
          ...prev,
          subject: `${activityType.name} - ${customer.name}`,
        }));
      }
    }
  }, [formData.activityTypeCode, formData.customerId, activityTypes, customers, initialSubject]);

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

      // Submit to quick-log endpoint
      const response = await fetch("/api/sales/activities/quick-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to log activity");
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
          outcome: "PENDING",
        });
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
                  <select
                    id="customer"
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                    disabled={loading || !!presetCustomerId}
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
              <div className="grid gap-4 sm:grid-cols-3">
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

                <div>
                  <label htmlFor="outcome" className="block text-sm font-semibold text-gray-700">
                    Outcome
                  </label>
                  <select
                    id="outcome"
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value as ActivityOutcome })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                    <option value="NO_RESPONSE">No Response</option>
                  </select>
                </div>
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
