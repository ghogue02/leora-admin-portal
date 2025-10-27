'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Minus, Check } from 'lucide-react';

type FeedbackOption = {
  id: string;
  label: string;
  category: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
};

const DEFAULT_FEEDBACK_OPTIONS: FeedbackOption[] = [
  { id: 'loved-it', label: 'Loved it!', category: 'positive', icon: <ThumbsUp className="h-4 w-4" /> },
  { id: 'interested', label: 'Interested', category: 'positive', icon: <ThumbsUp className="h-4 w-4" /> },
  { id: 'will-order', label: 'Will order', category: 'positive', icon: <ThumbsUp className="h-4 w-4" /> },
  { id: 'liked-price', label: 'Good price point', category: 'positive', icon: <ThumbsUp className="h-4 w-4" /> },
  { id: 'not-interested', label: 'Not interested', category: 'negative', icon: <ThumbsDown className="h-4 w-4" /> },
  { id: 'too-expensive', label: 'Too expensive', category: 'negative', icon: <ThumbsDown className="h-4 w-4" /> },
  { id: 'wrong-style', label: 'Wrong style', category: 'negative', icon: <ThumbsDown className="h-4 w-4" /> },
  { id: 'quality-concerns', label: 'Quality concerns', category: 'negative', icon: <ThumbsDown className="h-4 w-4" /> },
  { id: 'needs-time', label: 'Needs time to decide', category: 'neutral', icon: <Minus className="h-4 w-4" /> },
  { id: 'follow-up-later', label: 'Follow up later', category: 'neutral', icon: <Minus className="h-4 w-4" /> },
  { id: 'customer-absent', label: 'Customer not available', category: 'neutral', icon: <Minus className="h-4 w-4" /> },
  { id: 'left-sample', label: 'Left sample', category: 'neutral', icon: <Minus className="h-4 w-4" /> },
];

type FeedbackButtonsProps = {
  multiSelect?: boolean;
  selectedFeedback: string[];
  onFeedbackChange: (feedback: string[]) => void;
  allowCustom?: boolean;
  customFeedback?: string;
  onCustomFeedbackChange?: (feedback: string) => void;
};

export default function FeedbackButtons({
  multiSelect = false,
  selectedFeedback,
  onFeedbackChange,
  allowCustom = true,
  customFeedback = '',
  onCustomFeedbackChange,
}: FeedbackButtonsProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleToggle = (feedbackId: string) => {
    if (multiSelect) {
      if (selectedFeedback.includes(feedbackId)) {
        onFeedbackChange(selectedFeedback.filter((id) => id !== feedbackId));
      } else {
        onFeedbackChange([...selectedFeedback, feedbackId]);
      }
    } else {
      onFeedbackChange([feedbackId]);
    }
  };

  const getCategoryColor = (category: string, isSelected: boolean) => {
    if (!isSelected) {
      return 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50';
    }

    switch (category) {
      case 'positive':
        return 'border-green-600 bg-green-50 text-green-700 ring-2 ring-green-200';
      case 'negative':
        return 'border-red-600 bg-red-50 text-red-700 ring-2 ring-red-200';
      case 'neutral':
        return 'border-gray-600 bg-gray-50 text-gray-700 ring-2 ring-gray-200';
      default:
        return 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200';
    }
  };

  const groupedOptions = {
    positive: DEFAULT_FEEDBACK_OPTIONS.filter((opt) => opt.category === 'positive'),
    negative: DEFAULT_FEEDBACK_OPTIONS.filter((opt) => opt.category === 'negative'),
    neutral: DEFAULT_FEEDBACK_OPTIONS.filter((opt) => opt.category === 'neutral'),
  };

  return (
    <div className="space-y-4">
      {/* Positive Feedback */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-700">
          Positive
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {groupedOptions.positive.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${getCategoryColor(option.category, selectedFeedback.includes(option.id))}`}
            >
              {selectedFeedback.includes(option.id) && <Check className="h-4 w-4" />}
              {!selectedFeedback.includes(option.id) && option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Negative Feedback */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700">
          Negative
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {groupedOptions.negative.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${getCategoryColor(option.category, selectedFeedback.includes(option.id))}`}
            >
              {selectedFeedback.includes(option.id) && <Check className="h-4 w-4" />}
              {!selectedFeedback.includes(option.id) && option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Neutral Feedback */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-700">
          Neutral / Follow-up
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {groupedOptions.neutral.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${getCategoryColor(option.category, selectedFeedback.includes(option.id))}`}
            >
              {selectedFeedback.includes(option.id) && <Check className="h-4 w-4" />}
              {!selectedFeedback.includes(option.id) && option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Feedback */}
      {allowCustom && (
        <div>
          <button
            type="button"
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showCustomInput ? '− Hide custom feedback' : '+ Add custom feedback'}
          </button>

          {showCustomInput && (
            <textarea
              value={customFeedback}
              onChange={(e) => onCustomFeedbackChange?.(e.target.value)}
              placeholder="Enter additional notes or feedback..."
              rows={3}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      {/* Selection Summary */}
      {selectedFeedback.length > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-700">
            {multiSelect
              ? `${selectedFeedback.length} feedback item${selectedFeedback.length !== 1 ? 's' : ''} selected`
              : 'Selected feedback:'}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {selectedFeedback.map((id) => {
              const option = DEFAULT_FEEDBACK_OPTIONS.find((opt) => opt.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-blue-700"
                >
                  {option?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
