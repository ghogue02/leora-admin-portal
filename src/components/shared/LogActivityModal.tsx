'use client';

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ACTIVITY_OUTCOME_OPTIONS, type ActivityOutcomeValue } from "@/constants/activityOutcomes";
import SampleItemsSelector from "@/components/activities/SampleItemsSelector";
import type { ActivitySampleSelection } from "@/types/activities";
import { CustomerSearchCombobox } from "@/components/orders/CustomerSearchCombobox";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import {
  getActivityTypeConfig,
  getOutcomesForActivityType,
  CALL_DURATION_OPTIONS,
  VISIT_DURATION_OPTIONS,
  CHANGE_TYPE_OPTIONS,
  IMPACT_ASSESSMENT_OPTIONS,
  PORTAL_INTERACTION_OPTIONS,
} from "@/constants/activityTypeFields";

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

  // UI state for collapsible sections
  const [showDateEditor, setShowDateEditor] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    activityTypeCode: presetActivityType || "",
    customerId: presetCustomerId || "",
    orderId: presetOrderId || "",
    sampleId: presetSampleId || "",
    subject: initialSubject || "",
    notes: "",
    // Fix: Use local timezone format for datetime-local input
    occurredAt: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    followUpAt: "",
    outcomes: [] as ActivityOutcomeValue[],
    // Activity type-specific fields
    callDuration: "",
    visitDuration: "",
    attendees: "",
    location: "",
    changeType: "",
    effectiveDate: "",
    impactAssessment: "",
    portalInteraction: "",
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

  // Auto-generate subject and apply follow-up suggestions when activity type changes
  useEffect(() => {
    if (
      formData.activityTypeCode &&
      formData.customerId &&
      selectedCustomer &&
      !initialSubject
    ) {
      const activityType = activityTypes.find((t) => t.code === formData.activityTypeCode);
      const config = getActivityTypeConfig(formData.activityTypeCode);

      if (activityType) {
        // Auto-generate subject
        const subjectTemplate = config.autoSubject || `${activityType.name} - \${customerName}`;
        const generatedSubject = subjectTemplate.replace('${customerName}', selectedCustomer.name);

        // Auto-suggest follow-up date
        let suggestedFollowUpAt = "";
        if (config.suggestedFollowUpDays) {
          const followUpDate = new Date();
          followUpDate.setDate(followUpDate.getDate() + config.suggestedFollowUpDays);
          suggestedFollowUpAt = new Date(followUpDate.getTime() - followUpDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        }

        setFormData((prev) => ({
          ...prev,
          subject: generatedSubject,
          followUpAt: suggestedFollowUpAt || prev.followUpAt,
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

      // Activity type-specific validation
      const config = getActivityTypeConfig(formData.activityTypeCode);

      if (config.requireNotes && !formData.notes.trim()) {
        throw new Error("Notes are required for this activity type");
      }

      if (config.notesMinLength && formData.notes.trim().length < config.notesMinLength) {
        throw new Error(`Notes must be at least ${config.notesMinLength} characters for this activity type`);
      }

      if (config.showCallDuration && !formData.callDuration) {
        throw new Error("Call duration is required");
      }

      if (config.showChangeType && !formData.changeType) {
        throw new Error("Change type is required");
      }

      if (config.showImpactAssessment && !formData.impactAssessment) {
        throw new Error("Impact assessment is required");
      }

      const selectedSampleItems = sampleSelections
        .filter((item) => item.selected)
        .map((item) => ({
          skuId: item.skuId,
          sampleListItemId: item.sampleListItemId,
          feedback: item.feedback?.trim() ? item.feedback.trim() : undefined,
          followUpNeeded: item.followUp,
        }));

      // Fix: Only include optional fields if they have values
      const payload = {
        activityTypeCode: formData.activityTypeCode,
        customerId: formData.customerId,
        subject: formData.subject,
        notes: formData.notes,
        occurredAt: formData.occurredAt,
        ...(formData.orderId ? { orderId: formData.orderId } : {}),
        ...(formData.sampleId ? { sampleId: formData.sampleId } : {}),
        ...(formData.followUpAt ? { followUpAt: formData.followUpAt } : {}),
        ...(formData.outcomes.length > 0 ? { outcomes: formData.outcomes } : {}),
        ...(selectedSampleItems.length > 0 ? { sampleItems: selectedSampleItems } : {}),
        // Activity type-specific fields
        ...(formData.callDuration ? { callDuration: formData.callDuration } : {}),
        ...(formData.visitDuration ? { visitDuration: formData.visitDuration } : {}),
        ...(formData.attendees ? { attendees: formData.attendees } : {}),
        ...(formData.location ? { location: formData.location } : {}),
        ...(formData.changeType ? { changeType: formData.changeType } : {}),
        ...(formData.effectiveDate ? { effectiveDate: formData.effectiveDate } : {}),
        ...(formData.impactAssessment ? { impactAssessment: formData.impactAssessment } : {}),
        ...(formData.portalInteraction ? { portalInteraction: formData.portalInteraction } : {}),
      };

      // Debug logging
      console.log('[LogActivityModal] Submitting payload:', payload);

      // Submit to quick-log endpoint
      const response = await fetch("/api/sales/activities/quick-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log('[LogActivityModal] Response status:', response.status);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('[LogActivityModal] Error response:', body);
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
          // Fix: Use local timezone format for datetime-local input
          occurredAt: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
          followUpAt: "",
          outcomes: [] as ActivityOutcomeValue[],
          // Reset activity type-specific fields
          callDuration: "",
          visitDuration: "",
          attendees: "",
          location: "",
          changeType: "",
          effectiveDate: "",
          impactAssessment: "",
          portalInteraction: "",
        });
        setSampleSelections([]);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[LogActivityModal] Submit error:', err);
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
              {/* Activity Type & Subject - 2-column row */}
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
              </div>

              {/* Activity Type-Specific Fields */}
              {formData.activityTypeCode && (() => {
                const config = getActivityTypeConfig(formData.activityTypeCode);

                return (
                  <>
                    {/* Call Duration */}
                    {config.showCallDuration && (
                      <div>
                        <label htmlFor="callDuration" className="block text-sm font-semibold text-gray-700">
                          Call Duration <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="callDuration"
                          value={formData.callDuration}
                          onChange={(e) => setFormData({ ...formData, callDuration: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select duration...</option>
                          {CALL_DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Visit Duration */}
                    {config.showVisitDuration && (
                      <div>
                        <label htmlFor="visitDuration" className="block text-sm font-semibold text-gray-700">
                          Visit Duration
                        </label>
                        <select
                          id="visitDuration"
                          value={formData.visitDuration}
                          onChange={(e) => setFormData({ ...formData, visitDuration: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select duration...</option>
                          {VISIT_DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Location */}
                    {config.showLocation && (
                      <div>
                        <label htmlFor="location" className="block text-sm font-semibold text-gray-700">
                          Location
                        </label>
                        <input
                          type="text"
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Enter location or venue"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Attendees */}
                    {config.showAttendees && (
                      <div>
                        <label htmlFor="attendees" className="block text-sm font-semibold text-gray-700">
                          Attendees
                        </label>
                        <input
                          type="text"
                          id="attendees"
                          value={formData.attendees}
                          onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                          placeholder="Names or number of attendees"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Change Type */}
                    {config.showChangeType && (
                      <div>
                        <label htmlFor="changeType" className="block text-sm font-semibold text-gray-700">
                          Change Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="changeType"
                          value={formData.changeType}
                          onChange={(e) => setFormData({ ...formData, changeType: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select change type...</option>
                          {CHANGE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Effective Date */}
                    {config.showEffectiveDate && (
                      <div>
                        <label htmlFor="effectiveDate" className="block text-sm font-semibold text-gray-700">
                          Effective Date
                        </label>
                        <input
                          type="date"
                          id="effectiveDate"
                          value={formData.effectiveDate}
                          onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Impact Assessment */}
                    {config.showImpactAssessment && (
                      <div>
                        <label htmlFor="impactAssessment" className="block text-sm font-semibold text-gray-700">
                          Impact Assessment <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="impactAssessment"
                          value={formData.impactAssessment}
                          onChange={(e) => setFormData({ ...formData, impactAssessment: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select impact level...</option>
                          {IMPACT_ASSESSMENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Portal Interaction */}
                    {config.showPortalInteraction && (
                      <div>
                        <label htmlFor="portalInteraction" className="block text-sm font-semibold text-gray-700">
                          Portal Interaction
                        </label>
                        <select
                          id="portalInteraction"
                          value={formData.portalInteraction}
                          onChange={(e) => setFormData({ ...formData, portalInteraction: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select interaction type...</option>
                          {PORTAL_INTERACTION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Notes with Voice Input Icon */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="notes" className="block text-sm font-semibold text-gray-700">
                    Notes
                    {formData.activityTypeCode &&
                      getActivityTypeConfig(formData.activityTypeCode).requireNotes &&
                      <span className="text-rose-500"> *</span>
                    }
                  </label>
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      title={isRecording ? 'Stop recording' : 'Start voice input'}
                      className={`rounded-full p-2 transition ${
                        isRecording
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details, outcomes, next steps..."
                  rows={3}
                  maxLength={formData.activityTypeCode ?
                    getActivityTypeConfig(formData.activityTypeCode).charLimit :
                    undefined}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required={formData.activityTypeCode &&
                    getActivityTypeConfig(formData.activityTypeCode).requireNotes}
                />
                {formData.activityTypeCode && (() => {
                  const config = getActivityTypeConfig(formData.activityTypeCode);
                  if (config.charLimit) {
                    return (
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.notes.length}/{config.charLimit} characters
                      </p>
                    );
                  }
                  if (config.notesMinLength) {
                    return (
                      <p className="mt-1 text-xs text-gray-500">
                        Minimum {config.notesMinLength} characters required
                        {formData.notes.trim().length > 0 &&
                          ` (${formData.notes.trim().length}/${config.notesMinLength})`}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Date Display with Edit Button */}
              {!showDateEditor ? (
                <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Just now</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDateEditor(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Edit dates
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Date & Time Settings</span>
                    <button
                      type="button"
                      onClick={() => setShowDateEditor(false)}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                    >
                      Collapse
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="occurredAt" className="block text-xs font-semibold text-gray-700">
                        Occurred At <span className="text-rose-500">*</span>
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
                      <label htmlFor="followUpAt" className="block text-xs font-semibold text-gray-700">
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
                </div>
              )}

              {/* Collapsible Samples Section */}
              {(!formData.activityTypeCode ||
                getActivityTypeConfig(formData.activityTypeCode).showSamples !== false) && (
                <CollapsibleSection
                  title="Samples Shared"
                  badge={sampleSelections.filter(s => s.selected).length > 0
                    ? `${sampleSelections.filter(s => s.selected).length} items`
                    : "0 items"}
                  defaultOpen={formData.activityTypeCode ?
                    getActivityTypeConfig(formData.activityTypeCode).samplesExpandedByDefault :
                    false}
                >
                  <SampleItemsSelector value={sampleSelections} onChange={setSampleSelections} />
                </CollapsibleSection>
              )}

              {/* Collapsible Outcomes Section */}
              {(!formData.activityTypeCode ||
                getActivityTypeConfig(formData.activityTypeCode).showOutcomes !== false) && (
                <CollapsibleSection
                  title="Outcomes"
                  badge={formData.outcomes.length > 0
                    ? `${formData.outcomes.length} selected`
                    : "None selected"}
                  defaultOpen={false}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {getOutcomesForActivityType(
                      formData.activityTypeCode,
                      ACTIVITY_OUTCOME_OPTIONS
                    ).map((option) => {
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
                      className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Clear all selections
                    </button>
                  )}
                </CollapsibleSection>
              )}

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
