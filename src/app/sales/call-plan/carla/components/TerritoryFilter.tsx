"use client";

import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TerritoryFilterProps {
  territories: string[];
  selectedTerritories: string[];
  onChange: (territories: string[]) => void;
}

export default function TerritoryFilter({
  territories,
  selectedTerritories,
  onChange,
}: TerritoryFilterProps) {
  const handleSelect = (value: string) => {
    if (value === "all") {
      onChange([]);
    } else {
      if (selectedTerritories.includes(value)) {
        onChange(selectedTerritories.filter((t) => t !== value));
      } else {
        onChange([...selectedTerritories, value]);
      }
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">Territory</Label>
      <Select onValueChange={handleSelect}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <SelectValue
              placeholder={
                selectedTerritories.length > 0
                  ? `${selectedTerritories.length} selected`
                  : "All territories"
              }
            />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Territories</SelectItem>
          {territories.map((territory) => (
            <SelectItem key={territory} value={territory}>
              <div className="flex items-center justify-between gap-2">
                <span>{territory}</span>
                {selectedTerritories.includes(territory) && (
                  <Badge variant="secondary">✓</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTerritories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTerritories.map((territory) => (
            <Badge
              key={territory}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleSelect(territory)}
            >
              {territory} ×
            </Badge>
          ))}
          <button
            onClick={handleClear}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
