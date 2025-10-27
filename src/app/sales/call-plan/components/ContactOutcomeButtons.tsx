"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Phone, Users, X } from "lucide-react";
import type { ContactOutcome, ContactOutcomeData } from "../types";

interface ContactOutcomeButtonsProps {
  accountId: string;
  accountName: string;
  taskId?: string;
  currentOutcome: ContactOutcome;
  markedAt?: Date;
  notes?: string;
  onOutcomeChange: (accountId: string, data: ContactOutcomeData) => Promise<void>;
}

export default function ContactOutcomeButtons({
  accountId,
  accountName,
  taskId,
  currentOutcome,
  markedAt,
  notes: initialNotes,
  onOutcomeChange,
}: ContactOutcomeButtonsProps) {
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOutcomeClick = async (outcome: ContactOutcome) => {
    if (outcome === currentOutcome) {
      // Click same button = clear
      setIsUpdating(true);
      await onOutcomeChange(accountId, { outcome: null });
      setNotes("");
      setIsUpdating(false);
    } else {
      // New outcome - show notes popup
      setShowNotesPopup(true);
      // Pre-select the outcome
      handleSaveWithNotes(outcome, notes);
    }
  };

  const handleSaveWithNotes = async (outcome: ContactOutcome, noteText: string) => {
    setIsUpdating(true);
    await onOutcomeChange(accountId, {
      outcome,
      notes: noteText,
      markedAt: new Date(),
    });
    setIsUpdating(false);
    setShowNotesPopup(false);
  };

  const getButtonClass = (outcome: ContactOutcome, baseColor: string) => {
    const isActive = currentOutcome === outcome;
    const baseClass = "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all";

    if (isActive) {
      return `${baseClass} ${baseColor} ring-2 ring-offset-1`;
    }
    return `${baseClass} bg-gray-100 text-gray-600 hover:${baseColor.replace("ring-", "hover:ring-")}`;
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* X Button - Contacted (Phone/Email/Text) */}
        <button
          onClick={() => handleOutcomeClick("contacted")}
          disabled={isUpdating}
          className={getButtonClass(
            "contacted",
            "bg-blue-100 text-blue-700 ring-blue-500"
          )}
          title="Mark as Contacted (Phone/Email/Text)"
        >
          <Phone className="h-4 w-4" />
          <span>X</span>
          {currentOutcome === "contacted" && markedAt && (
            <span className="text-xs opacity-75">
              {format(markedAt, "M/d")}
            </span>
          )}
        </button>

        {/* Y Button - Visited (In Person) */}
        <button
          onClick={() => handleOutcomeClick("visited")}
          disabled={isUpdating}
          className={getButtonClass(
            "visited",
            "bg-green-100 text-green-700 ring-green-500"
          )}
          title="Mark as Visited (In Person)"
        >
          <Users className="h-4 w-4" />
          <span>Y</span>
          {currentOutcome === "visited" && markedAt && (
            <span className="text-xs opacity-75">
              {format(markedAt, "M/d")}
            </span>
          )}
        </button>

        {/* Clear Button */}
        {currentOutcome && (
          <button
            onClick={() => handleOutcomeClick(null)}
            disabled={isUpdating}
            className="rounded-md bg-gray-200 p-2 text-gray-600 hover:bg-gray-300"
            title="Clear marking"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Notes Popup */}
      {showNotesPopup && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900">{accountName}</h4>
            <p className="text-xs text-gray-500">Add notes about this contact</p>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened during this contact?"
            className="mb-3 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNotesPopup(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveWithNotes(currentOutcome, notes)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notes Indicator */}
      {initialNotes && !showNotesPopup && (
        <div className="mt-1 text-xs text-gray-500 italic truncate">
          "{initialNotes}"
        </div>
      )}
    </div>
  );
}
