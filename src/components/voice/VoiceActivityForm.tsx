'use client';

import React, { useState, useCallback } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { Phone, Mail, MessageSquare, Calendar, User, FileText, Save, X } from 'lucide-react';
import SampleItemsSelector from '@/components/activities/SampleItemsSelector';
import type { ActivitySampleSelection } from '@/types/activities';
import { ACTIVITY_OUTCOME_OPTIONS, type ActivityOutcomeValue } from '@/constants/activityOutcomes';

export interface ActivityFormData {
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  notes: string;
  subject?: string;
  duration?: number;
  outcomes: ActivityOutcomeValue[];
  sampleItems: Array<{
    skuId: string;
    sampleListItemId?: string;
    feedback?: string;
    followUpNeeded?: boolean;
  }>;
}

interface VoiceActivityFormProps {
  customerId?: string;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  preselectedType?: ActivityFormData['type'];
}

const activityTypes = [
  { value: 'call', label: 'Phone Call', icon: Phone, color: 'blue' },
  { value: 'email', label: 'Email', icon: Mail, color: 'green' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'purple' },
  { value: 'note', label: 'Note', icon: FileText, color: 'yellow' },
  { value: 'task', label: 'Task', icon: MessageSquare, color: 'red' },
] as const;

export const VoiceActivityForm: React.FC<VoiceActivityFormProps> = ({
  customerId,
  onSubmit,
  onCancel,
  className = '',
  preselectedType = 'call',
}) => {
  const [activityType, setActivityType] = useState<ActivityFormData['type']>(preselectedType);
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState<number | undefined>();
  const [selectedOutcomes, setSelectedOutcomes] = useState<ActivityOutcomeValue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useVoice, setUseVoice] = useState(true);
  const [sampleSelections, setSampleSelections] = useState<ActivitySampleSelection[]>([]);

  const handleTranscript = useCallback((transcript: string) => {
    setNotes((prev) => {
      const newText = prev ? `${prev} ${transcript}` : transcript;
      return newText.trim();
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      alert('Please add some notes before saving.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedSampleItems = sampleSelections
        .filter((item) => item.selected)
        .map((item) => ({
          skuId: item.skuId,
          sampleListItemId: item.sampleListItemId,
          feedback: item.feedback?.trim() ? item.feedback.trim() : undefined,
          followUpNeeded: item.followUp,
        }));

      const formData: ActivityFormData = {
        type: activityType,
        notes: notes.trim(),
        subject: subject.trim() || undefined,
        duration: duration || undefined,
        outcomes: selectedOutcomes,
        sampleItems: selectedSampleItems,
      };

      await onSubmit(formData);

      // Reset form
      setNotes('');
      setSubject('');
      setDuration(undefined);
      setSelectedOutcomes([]);
      setSampleSelections([]);
    } catch (error) {
      console.error('Error submitting activity:', error);
      alert('Failed to save activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedActivityType = activityTypes.find(t => t.value === activityType);

  return (
    <form onSubmit={handleSubmit} className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Log Activity
          </h3>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Activity Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Activity Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {activityTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = activityType === type.value;

              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setActivityType(type.value)}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                    ${isSelected
                      ? `border-${type.color}-500 bg-${type.color}-50`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? `text-${type.color}-600` : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${isSelected ? `text-${type.color}-900` : 'text-gray-600'}`}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject (optional) */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            Subject (Optional)
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`e.g., Follow-up ${selectedActivityType?.label.toLowerCase()}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Duration (for calls and meetings) */}
        {(activityType === 'call' || activityType === 'meeting') && (
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min="1"
              value={duration || ''}
              onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="e.g., 30"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Voice Input Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Use Voice Input</span>
          <button
            type="button"
            onClick={() => setUseVoice(!useVoice)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${useVoice ? 'bg-blue-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${useVoice ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Voice Recorder */}
        {useVoice && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <VoiceRecorder
              onTranscript={handleTranscript}
              continuous={true}
              language="en-US"
            />
          </div>
        )}

        {/* Notes Field */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes {!useVoice && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={useVoice
              ? "Start recording to add notes, or type here..."
              : "Enter your notes here..."
            }
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            {notes.length} characters
          </p>
        </div>

        {/* Outcomes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Outcomes (Select all that apply)
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ACTIVITY_OUTCOME_OPTIONS.map((option) => {
              const checked = selectedOutcomes.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                    checked ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedOutcomes((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((value) => value !== option.value)
                          : [...prev, option.value]
                      );
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="break-words leading-tight">{option.label}</span>
                </label>
              );
            })}
          </div>
          {selectedOutcomes.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedOutcomes([])}
              className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Clear selections
            </button>
          )}
        </div>

        {/* Sample Items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Samples Shared
          </label>
          <SampleItemsSelector value={sampleSelections} onChange={setSampleSelections} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !notes.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default VoiceActivityForm;
