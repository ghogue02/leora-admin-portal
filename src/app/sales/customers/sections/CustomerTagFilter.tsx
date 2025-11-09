"use client";

import { useMemo, useState } from "react";
import { XIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CUSTOMER_TAG_META,
  CUSTOMER_TAG_TYPES,
  CustomerTagType,
} from "@/constants/customerTags";

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
    <section className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-900"
        aria-expanded={isOpen}
      >
        <span>Tag filters</span>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">
              {selectedTags.length} active
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
          )}
        </div>
      </button>
      <p className="mt-1 text-xs text-slate-500">
        Use account tags to zero in on specific playbooks or strategic groups.
      </p>

      {isOpen && (
        <div className="mt-4 space-y-3">
          {!hasAnyTagActivity ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              No tags available in this view.
            </p>
          ) : (
            <div className="grid gap-2">
              {orderedTagCounts.map(({ type, count }) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-400"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(type)}
                      onChange={() => handleTagToggle(type)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{CUSTOMER_TAG_META[type].label}</span>
                  </div>
                  <span className="text-xs text-slate-500">{count.toLocaleString()}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Showing {filteredCustomers.toLocaleString()} of {totalCustomers.toLocaleString()} customers
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-indigo-600 transition hover:text-indigo-800"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
    </section>
  );
}
