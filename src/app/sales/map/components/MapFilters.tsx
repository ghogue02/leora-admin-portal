'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { MapFilters as MapFiltersType } from '../page';

interface MapFiltersProps {
  filters: MapFiltersType;
  onFilterChange: (filters: Partial<MapFiltersType>) => void;
}

// Mock data - replace with actual API calls
const TERRITORIES = [
  { id: 'territory-1', name: 'North Region' },
  { id: 'territory-2', name: 'South Region' },
  { id: 'territory-3', name: 'East Region' },
  { id: 'territory-4', name: 'West Region' },
  { id: 'territory-5', name: 'Central Region' },
];

const SALES_REPS = [
  { id: 'rep-1', name: 'John Smith' },
  { id: 'rep-2', name: 'Jane Doe' },
  { id: 'rep-3', name: 'Bob Johnson' },
  { id: 'rep-4', name: 'Alice Williams' },
  { id: 'rep-5', name: 'Charlie Brown' },
];

export default function MapFilters({ filters, onFilterChange }: MapFiltersProps) {
  const handleAccountTypeToggle = (accountType: string) => {
    const newTypes = filters.accountTypes.includes(accountType)
      ? filters.accountTypes.filter((t) => t !== accountType)
      : [...filters.accountTypes, accountType];
    onFilterChange({ accountTypes: newTypes });
  };

  const handleTerritoryToggle = (territoryId: string) => {
    const newTerritories = filters.territories.includes(territoryId)
      ? filters.territories.filter((t) => t !== territoryId)
      : [...filters.territories, territoryId];
    onFilterChange({ territories: newTerritories });
  };

  const handleSalesRepToggle = (repId: string) => {
    const newReps = filters.salesReps.includes(repId)
      ? filters.salesReps.filter((r) => r !== repId)
      : [...filters.salesReps, repId];
    onFilterChange({ salesReps: newReps });
  };

  const handleClearAll = () => {
    onFilterChange({
      accountTypes: ['ACTIVE', 'TARGET', 'PROSPECT'],
      territories: [],
      salesReps: [],
      searchQuery: '',
      dateRange: { start: null, end: null },
    });
  };

  const hasActiveFilters =
    filters.accountTypes.length !== 3 ||
    filters.territories.length > 0 ||
    filters.salesReps.length > 0 ||
    filters.searchQuery !== '' ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null;

  return (
    <div className="space-y-4">
      {/* Clear All Button */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={handleClearAll} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, address, city..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Account Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Account Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-active"
              checked={filters.accountTypes.includes('ACTIVE')}
              onCheckedChange={() => handleAccountTypeToggle('ACTIVE')}
            />
            <Label
              htmlFor="filter-active"
              className="text-sm font-normal cursor-pointer flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Active Customers
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-target"
              checked={filters.accountTypes.includes('TARGET')}
              onCheckedChange={() => handleAccountTypeToggle('TARGET')}
            />
            <Label
              htmlFor="filter-target"
              className="text-sm font-normal cursor-pointer flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Target Accounts
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-prospect"
              checked={filters.accountTypes.includes('PROSPECT')}
              onCheckedChange={() => handleAccountTypeToggle('PROSPECT')}
            />
            <Label
              htmlFor="filter-prospect"
              className="text-sm font-normal cursor-pointer flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              Prospects
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Territories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Territories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TERRITORIES.map((territory) => (
            <div key={territory.id} className="flex items-center space-x-2">
              <Checkbox
                id={`territory-${territory.id}`}
                checked={filters.territories.includes(territory.id)}
                onCheckedChange={() => handleTerritoryToggle(territory.id)}
              />
              <Label
                htmlFor={`territory-${territory.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {territory.name}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sales Reps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sales Representatives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SALES_REPS.map((rep) => (
            <div key={rep.id} className="flex items-center space-x-2">
              <Checkbox
                id={`rep-${rep.id}`}
                checked={filters.salesReps.includes(rep.id)}
                onCheckedChange={() => handleSalesRepToggle(rep.id)}
              />
              <Label
                htmlFor={`rep-${rep.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {rep.name}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Heat Map Date Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="date-start">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-start"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.start ? (
                    format(filters.dateRange.start, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.start || undefined}
                  onSelect={(date) =>
                    onFilterChange({
                      dateRange: { ...filters.dateRange, start: date || null },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-end">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-end"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.end ? (
                    format(filters.dateRange.end, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.end || undefined}
                  onSelect={(date) =>
                    onFilterChange({
                      dateRange: { ...filters.dateRange, end: date || null },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
