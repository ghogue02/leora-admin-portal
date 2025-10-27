"use client";

import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Priority } from "../page";

interface PriorityFilterProps {
  selectedPriorities: Priority[];
  onChange: (priorities: Priority[]) => void;
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: "HIGH", label: "High Priority", color: "text-red-600" },
  { value: "MEDIUM", label: "Medium Priority", color: "text-yellow-600" },
  { value: "LOW", label: "Low Priority", color: "text-green-600" },
];

export default function PriorityFilter({
  selectedPriorities,
  onChange,
}: PriorityFilterProps) {
  const handleToggle = (priority: Priority) => {
    if (selectedPriorities.includes(priority)) {
      onChange(selectedPriorities.filter((p) => p !== priority));
    } else {
      onChange([...selectedPriorities, priority]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPriorities.length === priorities.length) {
      onChange([]);
    } else {
      onChange(priorities.map((p) => p.value));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">Priority</Label>
        <button
          onClick={handleSelectAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {selectedPriorities.length === priorities.length ? "Clear" : "Select All"}
        </button>
      </div>

      <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
        {priorities.map((priority) => (
          <div key={priority.value} className="flex items-center gap-2">
            <Checkbox
              id={`priority-${priority.value}`}
              checked={selectedPriorities.includes(priority.value)}
              onCheckedChange={() => handleToggle(priority.value)}
            />
            <label
              htmlFor={`priority-${priority.value}`}
              className="flex flex-1 cursor-pointer items-center gap-2"
            >
              <AlertCircle className={`h-3.5 w-3.5 ${priority.color}`} />
              <span className="text-sm font-medium text-gray-700">{priority.label}</span>
            </label>
          </div>
        ))}
      </div>

      {selectedPriorities.length > 0 && (
        <p className="text-xs text-gray-500">
          {selectedPriorities.length} of {priorities.length} priorities selected
        </p>
      )}
    </div>
  );
}
