'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { VoiceActivityForm, ActivityFormData } from '@/components/voice/VoiceActivityForm';
import { Mic, Plus, X } from 'lucide-react';

const ACTIVITY_TYPE_CODE_MAP: Record<ActivityFormData['type'], string> = {
  call: 'PHONE_CALL',
  email: 'EMAIL_FOLLOW_UP',
  meeting: 'IN_PERSON_VISIT',
  note: 'NOTE',
  task: 'TASK',
};

interface QuickActivityLoggerProps {
  customerId: string;
  customerName: string;
  onActivityLogged?: () => void;
  className?: string;
}

export const QuickActivityLogger: React.FC<QuickActivityLoggerProps> = ({
  customerId,
  customerName,
  onActivityLogged,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (data: ActivityFormData) => {
    try {
      // Submit to Activity API
      const response = await fetch('/api/sales/activities/quick-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          activityTypeCode: ACTIVITY_TYPE_CODE_MAP[data.type] ?? 'NOTE',
          subject: data.subject,
          notes: data.notes,
          duration: data.duration,
          outcomes: data.outcomes,
          sampleItems: data.sampleItems,
          occurredAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log activity');
      }

      const result = await response.json();
      console.log('Activity logged:', result);

      await queryClient.invalidateQueries({ queryKey: ['customer', customerId] });

      // Close form and notify parent
      setIsOpen(false);
      setIsExpanded(false);
      onActivityLogged?.();

      // Show success message
      // You could use a toast notification library here
      alert(`Activity logged successfully for ${customerName}!`);
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error; // Re-throw to let VoiceActivityForm handle it
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setIsExpanded(false);
  };

  return (
    <div className={className}>
      {/* Quick Action Buttons */}
      {!isOpen && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsOpen(true);
              setIsExpanded(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Mic className="w-4 h-4" />
            Quick Voice Log
          </button>
          <button
            onClick={() => {
              setIsOpen(true);
              setIsExpanded(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Log Activity
          </button>
        </div>
      )}

      {/* Activity Form */}
      {isOpen && (
        <div className={`
          transition-all duration-200
          ${isExpanded ? 'w-full' : 'max-w-2xl'}
        `}>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">
                  Logging activity for: {customerName}
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Customer ID: {customerId}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <VoiceActivityForm
            customerId={customerId}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      {!isOpen && (
        <div className="mt-2 text-xs text-gray-500">
          <p>
            💡 <strong>Tip:</strong> Use voice to quickly log calls and meetings.
            Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">V</kbd> for voice log.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuickActivityLogger;
