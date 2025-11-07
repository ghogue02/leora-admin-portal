'use client';

import { useMemo, useState } from 'react';
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
import {
  CUSTOMER_TAG_META,
  CUSTOMER_TAG_TYPES,
  CustomerTagType,
} from '@/constants/customerTags';

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

export default function CustomerTagFilter({
  tagCounts,
  selectedTags,
  onTagsChange,
  totalCustomers,
  filteredCustomers,
}: CustomerTagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const orderedTagCounts = useMemo(() => {
    const countsMap = new Map(tagCounts.map(({ type, count }) => [type, count]));
    return CUSTOMER_TAG_TYPES.map((type) => ({
      type,
      count: countsMap.get(type) ?? 0,
    }));
  }, [tagCounts]);
  const hasAnyTagActivity = orderedTagCounts.some(({ count }) => count > 0);

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

          {!hasAnyTagActivity ? (
            <div className="px-2 py-6 text-center text-sm text-slate-500">
              No tags found
            </div>
          ) : (
            orderedTagCounts.map(({ type, count }) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={selectedTags.includes(type)}
                onCheckedChange={() => handleTagToggle(type)}
                className="cursor-pointer"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${CUSTOMER_TAG_META[type].dotClass}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm">{CUSTOMER_TAG_META[type].label}</span>
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
              className={`${CUSTOMER_TAG_META[tagType].pillClass} gap-1.5 pr-1`}
              variant="outline"
            >
              {CUSTOMER_TAG_META[tagType].label}
              <button
                type="button"
                onClick={() => handleTagToggle(tagType)}
                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1"
                aria-label={`Remove ${CUSTOMER_TAG_META[tagType].label} filter`}
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
