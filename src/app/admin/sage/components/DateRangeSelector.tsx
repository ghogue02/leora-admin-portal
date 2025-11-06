'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

export interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
  invoiceCount?: number;
  loading?: boolean;
}

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month', type: 'month' as const },
  { label: 'Year to date', type: 'year' as const },
] as const;

export function DateRangeSelector({
  startDate,
  endDate,
  onDateChange,
  invoiceCount,
  loading,
}: DateRangeSelectorProps) {
  const [isStartOpen, setIsStartOpen] = React.useState(false);
  const [isEndOpen, setIsEndOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;

    if (date > endDate) {
      setError('Start date cannot be after end date');
      return;
    }

    setError(null);
    onDateChange(date, endDate);
    setIsStartOpen(false);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) return;

    if (date < startDate) {
      setError('End date cannot be before start date');
      return;
    }

    setError(null);
    onDateChange(startDate, date);
    setIsEndOpen(false);
  };

  const handlePresetClick = (preset: typeof DATE_PRESETS[number]) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    if ('days' in preset) {
      start = subDays(today, preset.days - 1);
    } else if (preset.type === 'month') {
      start = startOfMonth(today);
      end = endOfMonth(today);
    } else {
      start = startOfYear(today);
      end = today;
    }

    setError(null);
    onDateChange(start, end);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Start Date Picker */}
        <div className="flex-1">
          <label
            htmlFor="start-date"
            className="block text-sm font-medium mb-2"
          >
            Start Date
          </label>
          <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
            <PopoverTrigger asChild>
              <Button
                id="start-date"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
                disabled={loading}
                aria-label="Select start date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                disabled={(date) => date > new Date() || date > endDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Picker */}
        <div className="flex-1">
          <label
            htmlFor="end-date"
            className="block text-sm font-medium mb-2"
          >
            End Date
          </label>
          <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
            <PopoverTrigger asChild>
              <Button
                id="end-date"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
                disabled={loading}
                aria-label="Select end date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                disabled={(date) => date > new Date() || date < startDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <label className="block text-sm font-medium mb-2">Quick Select</label>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset)}
              disabled={loading}
              aria-label={`Select ${preset.label}`}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoice Count Badge */}
      {invoiceCount !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Invoices in range:</span>
          <Badge variant="secondary" className="font-mono">
            {loading ? '...' : invoiceCount.toLocaleString()}
          </Badge>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive font-medium"
        >
          {error}
        </div>
      )}
    </div>
  );
}
