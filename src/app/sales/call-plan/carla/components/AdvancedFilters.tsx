"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, DollarSign, Package, Star, Filter, Save, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export type LastContactDateFilter = "all" | "week" | "1-2weeks" | "2-4weeks" | "30plus";
export type RevenueFilter = "all" | "high" | "medium" | "low";
export type ProductCategoryFilter = "all" | "wine" | "spirits" | "both";
export type PriorityTier = "all" | "A" | "B" | "C";

export interface AdvancedFilterState {
  lastContactDate: LastContactDateFilter;
  revenue: RevenueFilter;
  productCategory: ProductCategoryFilter;
  priorityTier: PriorityTier;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: AdvancedFilterState;
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterState;
  onFilterChange: (filters: AdvancedFilterState) => void;
  savedFilters: SavedFilter[];
  onSaveFilter: (name: string, filters: AdvancedFilterState) => void;
  onLoadFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (filterId: string) => void;
}

const QUICK_FILTERS: { name: string; filters: AdvancedFilterState }[] = [
  {
    name: "Due Soon",
    filters: {
      lastContactDate: "2-4weeks",
      revenue: "all",
      productCategory: "all",
      priorityTier: "all",
    },
  },
  {
    name: "High Value",
    filters: {
      lastContactDate: "all",
      revenue: "high",
      productCategory: "all",
      priorityTier: "A",
    },
  },
  {
    name: "Haven't Contacted",
    filters: {
      lastContactDate: "30plus",
      revenue: "all",
      productCategory: "all",
      priorityTier: "all",
    },
  },
  {
    name: "High Priority Wine",
    filters: {
      lastContactDate: "all",
      revenue: "high",
      productCategory: "wine",
      priorityTier: "A",
    },
  },
];

export default function AdvancedFilters({
  filters,
  onFilterChange,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
}: AdvancedFiltersProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");

  const updateFilter = <K extends keyof AdvancedFilterState>(
    key: K,
    value: AdvancedFilterState[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter(filterName.trim(), filters);
      setFilterName("");
      setShowSaveDialog(false);
    }
  };

  const handleClearAll = () => {
    onFilterChange({
      lastContactDate: "all",
      revenue: "all",
      productCategory: "all",
      priorityTier: "all",
    });
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== "all").length;

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">Quick Filters</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((quickFilter) => (
            <Button
              key={quickFilter.name}
              variant="outline"
              size="sm"
              onClick={() => onFilterChange(quickFilter.filters)}
              className="gap-2"
            >
              <Star className="h-3.5 w-3.5" />
              {quickFilter.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Last Contact Date */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Last Contact
          </label>
          <Select
            value={filters.lastContactDate}
            onValueChange={(value: LastContactDateFilter) =>
              updateFilter("lastContactDate", value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="week">&lt; 7 days</SelectItem>
              <SelectItem value="1-2weeks">7-14 days</SelectItem>
              <SelectItem value="2-4weeks">14-30 days</SelectItem>
              <SelectItem value="30plus">30+ days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Revenue Filter */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            Revenue Tier
          </label>
          <Select
            value={filters.revenue}
            onValueChange={(value: RevenueFilter) => updateFilter("revenue", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Revenue</SelectItem>
              <SelectItem value="high">High (&gt;$50k/yr)</SelectItem>
              <SelectItem value="medium">Medium ($20-50k/yr)</SelectItem>
              <SelectItem value="low">Low (&lt;$20k/yr)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Category */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            Product Category
          </label>
          <Select
            value={filters.productCategory}
            onValueChange={(value: ProductCategoryFilter) =>
              updateFilter("productCategory", value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="wine">Wine Only</SelectItem>
              <SelectItem value="spirits">Spirits Only</SelectItem>
              <SelectItem value="both">Wine &amp; Spirits</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Tier */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            Priority Tier
          </label>
          <Select
            value={filters.priorityTier}
            onValueChange={(value: PriorityTier) => updateFilter("priorityTier", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="A">A - Top Priority</SelectItem>
              <SelectItem value="B">B - Medium Priority</SelectItem>
              <SelectItem value="C">C - Lower Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="gap-2">
              <X className="h-3.5 w-3.5" />
              Clear All Filters
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  Saved Filters ({savedFilters.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Saved Filters</h4>
                  {savedFilters.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                    >
                      <button
                        onClick={() => onLoadFilter(saved)}
                        className="flex-1 text-left text-sm"
                      >
                        {saved.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteFilter(saved.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Save Current Filter */}
          {activeFilterCount > 0 && (
            <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Save className="h-3.5 w-3.5" />
                  Save Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Save Current Filter</h4>
                  <Input
                    placeholder="Filter name..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveFilter}
                      disabled={!filterName.trim()}
                      className="flex-1"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
