'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FilterIcon, XIcon } from 'lucide-react';

export type CustomerTagType =
  | 'WINE_CLUB'
  | 'EVENTS'
  | 'FEMALE_WINEMAKERS'
  | 'ORGANIC'
  | 'NATURAL_WINE'
  | 'BIODYNAMIC';

type TagCount = {
  type: CustomerTagType;
  count: number;
};

type CustomerTagFilterProps = {
  tagCounts: TagCount[];
  selectedTags: CustomerTagType[];
  onTagsChange: (tags: CustomerTagType[]) => void;
  totalCustomers: number;
  filteredCustomers: number;
};

const TAG_LABELS: Record<CustomerTagType, string> = {
  WINE_CLUB: 'Wine Club',
  EVENTS: 'Events',
  FEMALE_WINEMAKERS: 'Female Winemakers',
  ORGANIC: 'Organic',
  NATURAL_WINE: 'Natural Wine',
  BIODYNAMIC: 'Biodynamic',
};

const TAG_COLORS: Record<CustomerTagType, string> = {
  WINE_CLUB: 'bg-purple-100 text-purple-800 border-purple-200',
  EVENTS: 'bg-blue-100 text-blue-800 border-blue-200',
  FEMALE_WINEMAKERS: 'bg-pink-100 text-pink-800 border-pink-200',
  ORGANIC: 'bg-green-100 text-green-800 border-green-200',
  NATURAL_WINE: 'bg-amber-100 text-amber-800 border-amber-200',
  BIODYNAMIC: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function CustomerTagFilter({
  tagCounts,
  selectedTags,
  onTagsChange,
  totalCustomers,
  filteredCustomers,
}: CustomerTagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTagToggle = (tagType: CustomerTagType) => {
    if (selectedTags.includes(tagType)) {
      onTagsChange(selectedTags.filter((t) => t !== tagType));
    } else {
      onTagsChange([...selectedTags, tagType]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const hasActiveFilters = selectedTags.length > 0;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={hasActiveFilters ? 'border-blue-500 bg-blue-50' : ''}
            aria-label="Filter by tags"
          >
            <FilterIcon className="h-4 w-4" />
            Tags
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 min-w-[1.25rem] rounded-full px-1.5"
              >
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Filter by Tags</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
              >
                Clear all
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {tagCounts.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-slate-500">
              No tags found
            </div>
          ) : (
            tagCounts.map(({ type, count }) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={selectedTags.includes(type)}
                onCheckedChange={() => handleTagToggle(type)}
                className="cursor-pointer"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${TAG_COLORS[type].split(' ')[0].replace('bg-', 'bg-')}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm">{TAG_LABELS[type]}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {count.toLocaleString()}
                  </span>
                </div>
              </DropdownMenuCheckboxItem>
            ))
          )}

          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-2 text-xs text-slate-600">
                Showing {filteredCustomers.toLocaleString()} of{' '}
                {totalCustomers.toLocaleString()} customers
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedTags.map((tagType) => (
            <Badge
              key={tagType}
              className={`${TAG_COLORS[tagType]} gap-1.5 pr-1`}
              variant="outline"
            >
              {TAG_LABELS[tagType]}
              <button
                type="button"
                onClick={() => handleTagToggle(tagType)}
                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1"
                aria-label={`Remove ${TAG_LABELS[tagType]} filter`}
              >
                <XIcon className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
