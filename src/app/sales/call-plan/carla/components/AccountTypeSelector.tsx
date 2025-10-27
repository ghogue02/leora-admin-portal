"use client";

import { Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { AccountType } from "../page";

interface AccountTypeSelectorProps {
  selectedTypes: AccountType[];
  onChange: (types: AccountType[]) => void;
}

const accountTypes: { value: AccountType; label: string; color: string }[] = [
  { value: "PROSPECT", label: "Prospect", color: "border-purple-200 bg-purple-50 text-purple-700" },
  { value: "TARGET", label: "Target", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "ACTIVE", label: "Active", color: "border-green-200 bg-green-50 text-green-700" },
];

export default function AccountTypeSelector({
  selectedTypes,
  onChange,
}: AccountTypeSelectorProps) {
  const handleToggle = (type: AccountType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === accountTypes.length) {
      onChange([]);
    } else {
      onChange(accountTypes.map((t) => t.value));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">Account Type</Label>
        <button
          onClick={handleSelectAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {selectedTypes.length === accountTypes.length ? "Clear" : "Select All"}
        </button>
      </div>

      <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
        {accountTypes.map((type) => (
          <div key={type.value} className="flex items-center gap-2">
            <Checkbox
              id={`type-${type.value}`}
              checked={selectedTypes.includes(type.value)}
              onCheckedChange={() => handleToggle(type.value)}
            />
            <label
              htmlFor={`type-${type.value}`}
              className="flex flex-1 cursor-pointer items-center gap-2"
            >
              <Building2 className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{type.label}</span>
              <Badge className={`ml-auto ${type.color}`}>
                {type.label}
              </Badge>
            </label>
          </div>
        ))}
      </div>

      {selectedTypes.length > 0 && (
        <p className="text-xs text-gray-500">
          {selectedTypes.length} of {accountTypes.length} types selected
        </p>
      )}
    </div>
  );
}
