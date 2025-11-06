'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Filter, X } from 'lucide-react';

export interface FilterState {
  deliveryMethod: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApply: () => void;
  onClear: () => void;
}

const DELIVERY_METHODS = [
  { value: 'all', label: 'All Methods' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Pick up', label: 'Pick up' },
  { value: 'Will Call', label: 'Will Call' },
];

export function FilterPanel({
  filters,
  onFiltersChange,
  onApply,
  onClear,
}: FilterPanelProps) {
  const hasActiveFilters =
    filters.deliveryMethod !== null ||
    filters.startDate !== null ||
    filters.endDate !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Delivery Method Filter */}
          <div className="space-y-2">
            <Label htmlFor="delivery-method">Delivery Method</Label>
            <Select
              value={filters.deliveryMethod || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  deliveryMethod: value === 'all' ? null : value,
                })
              }
            >
              <SelectTrigger id="delivery-method" className="w-full">
                <SelectValue placeholder="Select method" />
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

          {/* Start Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <div className="relative">
              <Input
                id="start-date"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    startDate: e.target.value || null,
                  })
                }
                className="w-full"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* End Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <div className="relative">
              <Input
                id="end-date"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    endDate: e.target.value || null,
                  })
                }
                className="w-full"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button onClick={onApply} className="flex-1 md:flex-none">
            <Filter className="h-4 w-4" />
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button
              onClick={onClear}
              variant="outline"
              className="flex-1 md:flex-none"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
