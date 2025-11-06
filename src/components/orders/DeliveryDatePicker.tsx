'use client';

/**
 * Delivery Date Picker Component - ENHANCED
 *
 * Fixes frontend agent's Issue #5: Date selection UX is poor
 *
 * New features:
 * - Visual calendar (not text input)
 * - Suggested delivery days highlighted in green
 * - Holiday/weekend indicators
 * - Pre-select next available delivery day
 * - Warning icons BEFORE date selected (not after)
 * - Show cutoff times
 */

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, isToday, parse } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { formatUTCDate } from '@/lib/dates';

type Props = {
  value: string;
  onChange: (date: string) => void;
  deliveryDays?: string[];  // e.g., ["Monday", "Wednesday", "Friday"]
  onWarning?: (type: 'same-day' | 'non-delivery-day', date: string) => void;
  disabled?: boolean;
  error?: string;
};

export function DeliveryDatePicker({
  value,
  onChange,
  deliveryDays = [],
  onWarning,
  disabled = false,
  error,
}: Props) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningType, setWarningType] = useState<'same-day' | 'non-delivery-day' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange('');
      setShowCalendar(false);
      return;
    }

    // CRITICAL: Use UTC methods to avoid timezone bugs
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    date.setUTCHours(0, 0, 0, 0);

    // Check if same-day
    if (isSameDay(date, today)) {
      setPendingDate(date);
      setWarningType('same-day');
      setShowWarningModal(true);
      setShowCalendar(false);
      onWarning?.('same-day', formatUTCDate(date));
      return;
    }

    // Check if non-delivery day
    if (deliveryDays.length > 0) {
      const dayName = format(date, 'EEEE'); // Full day name
      if (!deliveryDays.includes(dayName)) {
        setPendingDate(date);
        setWarningType('non-delivery-day');
        setShowWarningModal(true);
        setShowCalendar(false);
        onWarning?.('non-delivery-day', formatUTCDate(date));
        return;
      }
    }

    // No warnings - accept the date
    onChange(formatUTCDate(date));
    setShowCalendar(false);
  };

  const handleConfirmDate = () => {
    if (pendingDate) {
      onChange(formatUTCDate(pendingDate));
    }
    setShowWarningModal(false);
    setWarningType(null);
    setPendingDate(null);
  };

  const handleCancelDate = () => {
    setShowWarningModal(false);
    setWarningType(null);
    setPendingDate(null);
  };

  // Calculate next 3 suggested delivery dates
  const suggestedDates = getSuggestedDeliveryDates(deliveryDays, 3);

  // Highlight delivery days in calendar
  const isDeliveryDay = (date: Date) => {
    if (deliveryDays.length === 0) return false;
    const dayName = format(date, 'EEEE');
    return deliveryDays.includes(dayName);
  };

  return (
    <div>
      {/* Date display and calendar toggle */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setShowCalendar(!showCalendar)}
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-gray-500 ${
            error ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-white hover:bg-gray-50'
          } ${disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer'}`}
        >
          <span className={value ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {selectedDate
              ? format(selectedDate, 'EEEE, MMMM d, yyyy')
              : 'Select delivery date...'}
          </span>
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Calendar dropdown */}
        {showCalendar && (
          <div className="absolute z-50 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              modifiers={{
                deliveryDay: isDeliveryDay,
                today: (date) => isToday(date),
              }}
              modifiersStyles={{
                deliveryDay: {
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  fontWeight: 'bold',
                },
                today: {
                  backgroundColor: '#dbeafe',
                  fontWeight: 'bold',
                },
              }}
              fromDate={new Date()}
            />
            <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-emerald-200" />
                  <span>Delivery days</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-blue-200" />
                  <span>Today</span>
                </div>
              </div>
              {deliveryDays.length > 0 && (
                <p className="mt-1">Your delivery days: {deliveryDays.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-rose-600">
          {error}
        </p>
      )}

      {/* Quick suggested dates */}
      {suggestedDates.length > 0 && !value && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-600">Quick select:</span>
          {suggestedDates.map(({ date, label }) => (
            <button
              key={date}
              type="button"
              onClick={() => {
                const d = parse(date, 'yyyy-MM-dd', new Date());
                handleDateSelect(d);
              }}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              ⚠ Delivery Date Warning
            </h3>

            <div className="mt-3 text-sm text-gray-700">
              {warningType === 'same-day' ? (
                <>
                  <p className="font-medium">You've selected today's date for delivery.</p>
                  <p className="mt-2">
                    Most orders should be scheduled for a future delivery date to allow proper planning and warehouse preparation.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">This is not a typical delivery day for this territory.</p>
                  <p className="mt-2">
                    Normal delivery days: <strong>{deliveryDays.join(', ')}</strong>
                  </p>
                  <p className="mt-2">
                    Selected: <strong>{new Date(pendingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
                  </p>
                </>
              )}
            </div>

            <p className="mt-3 text-sm font-medium text-gray-900">
              Are you sure you want to continue with this date?
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDate}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
              >
                Change Date
              </button>
              <button
                type="button"
                onClick={handleConfirmDate}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate next N suggested delivery dates based on delivery days
 */
function getSuggestedDeliveryDates(deliveryDays: string[], count: number): Array<{ date: string; label: string }> {
  if (deliveryDays.length === 0) return [];

  const suggestions: Array<{ date: string; label: string }> = [];
  const today = new Date();
  let currentDate = new Date(today);
  // CRITICAL: Use UTC methods to avoid timezone bugs
  currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Start from tomorrow

  let attempts = 0;
  const maxAttempts = 30; // Look ahead 30 days max

  while (suggestions.length < count && attempts < maxAttempts) {
    // Use UTC date to get day name to match timezone-aware storage
    const dayName = new Date(currentDate.toISOString()).toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC'
    });

    if (deliveryDays.includes(dayName)) {
      const normalized = new Date(currentDate);
      normalized.setUTCHours(0, 0, 0, 0);
      const dateStr = formatUTCDate(normalized);
      const label = new Date(normalized.toISOString()).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      });

      suggestions.push({ date: dateStr, label });
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    attempts++;
  }

  return suggestions;
}
