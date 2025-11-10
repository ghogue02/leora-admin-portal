'use client';

import { format } from 'date-fns';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useReportFilters,
  type RangePreset,
  type ReportFilters,
} from '../_context/ReportFiltersContext';

const RANGE_PRESETS: Array<{ label: string; value: RangePreset }> = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'YTD', value: 'ytd' },
];

const DELIVERY_METHODS = [
  { value: 'all', label: 'All methods' },
  { value: 'Delivery', label: 'Delivery routes' },
  { value: 'Pick up', label: 'Pick up' },
  { value: 'Will Call', label: 'Will call' },
];

const USAGE_OPTIONS = [
  { value: 'all', label: 'All usage' },
  { value: 'standard', label: 'Standard sales only' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'sample', label: 'Sample' },
];

const toInputDate = (date: Date | null) => {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

export function ReportFiltersBar() {
  const { filters, updateFilters, resetFilters, setPresetRange } = useReportFilters();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter className="h-4 w-4" />
            Global filters
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500"
            onClick={resetFilters}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="reports-start-date">Start date</Label>
            <Input
              id="reports-start-date"
              type="date"
              value={toInputDate(filters.startDate)}
              onChange={(event) => {
                const value = event.target.value ? new Date(event.target.value) : null;
                updateFilters({ startDate: value });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reports-end-date">End date</Label>
            <Input
              id="reports-end-date"
              type="date"
              value={toInputDate(filters.endDate)}
              max={toInputDate(new Date())}
              onChange={(event) => {
                const value = event.target.value ? new Date(event.target.value) : null;
                updateFilters({ endDate: value });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reports-delivery-method">Delivery channel</Label>
            <Select
              value={filters.deliveryMethod ?? 'all'}
              onValueChange={(value) =>
                updateFilters({ deliveryMethod: value === 'all' ? null : (value as ReportFilters['deliveryMethod']) })
              }
            >
              <SelectTrigger id="reports-delivery-method">
                <SelectValue placeholder="Choose delivery channel" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reports-usage-filter">Usage classification</Label>
            <Select
              value={filters.usageFilter ?? 'all'}
              onValueChange={(value) =>
                updateFilters({ usageFilter: value === 'all' ? null : (value as ReportFilters['usageFilter']) })
              }
            >
              <SelectTrigger id="reports-usage-filter">
                <SelectValue placeholder="All usage" />
              </SelectTrigger>
              <SelectContent>
                {USAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}
