"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectiveInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  customerType?: "ACTIVE" | "TARGET" | "PROSPECT";
  placeholder?: string;
  className?: string;
}

// Pre-populated suggestions based on customer type
const OBJECTIVE_SUGGESTIONS = {
  ACTIVE: [
    "Upsell new products",
    "Increase order frequency",
    "Expand product mix",
    "Review pricing tier",
    "Discuss promotions",
  ],
  TARGET: [
    "Reactivate account",
    "Win back business",
    "Address concerns",
    "Present new offerings",
    "Schedule tasting",
  ],
  PROSPECT: [
    "Initial introduction",
    "Needs assessment",
    "Product presentation",
    "Schedule tasting",
    "Build relationship",
  ],
};

const MAX_CHARS = 25; // For 3-5 words

export default function ObjectiveInput({
  value,
  onChange,
  onSave,
  customerType = "ACTIVE",
  placeholder = "Enter objective (3-5 words)",
  className,
}: ObjectiveInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    // Enforce character limit
    if (newValue.length <= MAX_CHARS) {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    if (onSave && localValue !== value) {
      onSave(localValue);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setLocalValue(suggestion);
    onChange(suggestion);
    if (onSave) {
      onSave(suggestion);
    }
    setShowSuggestions(false);
  };

  const suggestions = OBJECTIVE_SUGGESTIONS[customerType] || OBJECTIVE_SUGGESTIONS.ACTIVE;
  const charCount = localValue.length;
  const isNearLimit = charCount >= MAX_CHARS - 5;

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              "pr-16",
              isNearLimit && "border-yellow-300 focus:border-yellow-400"
            )}
            maxLength={MAX_CHARS}
          />

          {/* Character count */}
          <div
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 text-xs",
              isNearLimit ? "text-yellow-600 font-medium" : "text-gray-400"
            )}
          >
            {charCount}/{MAX_CHARS}
          </div>
        </div>

        {/* Suggestions popover */}
        <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Show suggestions"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <Label className="text-xs text-gray-500 mb-2 block">
              Suggested Objectives
            </Label>
            <div className="space-y-1">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                    "hover:bg-blue-50 hover:text-blue-900",
                    localValue === suggestion && "bg-blue-100 text-blue-900 font-medium"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{suggestion}</span>
                    {localValue === suggestion && (
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
