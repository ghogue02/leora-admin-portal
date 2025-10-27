'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon } from 'lucide-react';

export type EventType =
  | 'SUPPLIER_TASTING'
  | 'PUBLIC_EVENT'
  | 'WINE_DINNER'
  | 'PRIVATE_TASTING'
  | 'FESTIVAL'
  | 'OTHER';

type EventSaleData = {
  isEventSale: boolean;
  eventType?: EventType;
  eventNotes?: string;
};

type EventSaleCheckboxProps = {
  value?: EventSaleData;
  onChange?: (data: EventSaleData) => void;
  disabled?: boolean;
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  SUPPLIER_TASTING: 'Supplier Tasting',
  PUBLIC_EVENT: 'Public Event',
  WINE_DINNER: 'Wine Dinner',
  PRIVATE_TASTING: 'Private Tasting',
  FESTIVAL: 'Festival',
  OTHER: 'Other',
};

export default function EventSaleCheckbox({
  value = { isEventSale: false },
  onChange,
  disabled = false,
}: EventSaleCheckboxProps) {
  const [localValue, setLocalValue] = useState<EventSaleData>(value);

  const handleCheckboxChange = (checked: boolean) => {
    const newValue: EventSaleData = {
      isEventSale: checked,
      eventType: checked ? localValue.eventType || 'SUPPLIER_TASTING' : undefined,
      eventNotes: checked ? localValue.eventNotes : undefined,
    };
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleEventTypeChange = (eventType: EventType) => {
    const newValue: EventSaleData = {
      ...localValue,
      eventType,
    };
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue: EventSaleData = {
      ...localValue,
      eventNotes: e.target.value,
    };
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="event-sale-checkbox"
          checked={localValue.isEventSale}
          onCheckedChange={handleCheckboxChange}
          disabled={disabled}
          className="mt-0.5"
          aria-describedby="event-sale-description"
        />
        <div className="flex-1">
          <Label
            htmlFor="event-sale-checkbox"
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-900"
          >
            <CalendarIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />
            This is an event sale
          </Label>
          <p
            id="event-sale-description"
            className="mt-1 text-xs text-slate-600"
          >
            Mark this order as part of a special event for tracking and reporting
          </p>
        </div>
      </div>

      {localValue.isEventSale && (
        <div
          className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
          role="region"
          aria-label="Event details"
        >
          <div className="space-y-2">
            <Label htmlFor="event-type" className="text-sm font-medium">
              Event Type
              <span className="ml-1 text-rose-500" aria-label="required">
                *
              </span>
            </Label>
            <Select
              value={localValue.eventType}
              onValueChange={(value) => handleEventTypeChange(value as EventType)}
              disabled={disabled}
            >
              <SelectTrigger
                id="event-type"
                className="w-full bg-white"
                aria-label="Select event type"
              >
                <SelectValue placeholder="Select event type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-notes" className="text-sm font-medium">
              Event Notes
              <span className="ml-1 text-slate-500">(optional)</span>
            </Label>
            <Textarea
              id="event-notes"
              placeholder="Add details about the event, location, attendees, etc."
              value={localValue.eventNotes || ''}
              onChange={handleNotesChange}
              disabled={disabled}
              className="min-h-[100px] resize-y bg-white"
              aria-describedby="event-notes-hint"
            />
            <p id="event-notes-hint" className="text-xs text-slate-500">
              These notes will be included in event reports and can help track performance
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
