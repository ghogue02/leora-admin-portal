"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { format } from "date-fns";
import { Mail, MessageCircle, Phone, Users, XCircle, StickyNote } from "lucide-react";
import type { ContactOutcome, ContactOutcomeData } from "../types";

interface ContactOutcomeButtonsProps {
  accountId: string;
  accountName: string;
  currentOutcome: ContactOutcome;
  markedAt?: Date;
  notes?: string;
  onOutcomeChange: (accountId: string, data: ContactOutcomeData) => Promise<void>;
}

export default function ContactOutcomeButtons({
  accountId,
  accountName,
  currentOutcome,
  markedAt,
  notes: initialNotes,
  onOutcomeChange,
}: ContactOutcomeButtonsProps) {
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes]);

  const OUTCOME_OPTIONS: Array<{
    value: ContactOutcome;
    label: string;
  icon: ComponentType<{ className?: string }>;
    activeClass: string;
    inactiveClass: string;
    hint: string;
  }> = [
    {
      value: "in_person",
      label: "In-Person",
      icon: Users,
      activeClass: "bg-green-100 text-green-700 ring-2 ring-green-500",
      inactiveClass: "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700",
      hint: "Mark as in-person visit or meeting",
    },
    {
      value: "phone",
      label: "Phone",
      icon: Phone,
      activeClass: "bg-blue-100 text-blue-700 ring-2 ring-blue-500",
      inactiveClass: "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700",
      hint: "Mark as phone call or voicemail",
    },
    {
      value: "email",
      label: "Email",
      icon: Mail,
      activeClass: "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500",
      inactiveClass: "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700",
      hint: "Mark as email follow-up",
    },
    {
      value: "text",
      label: "Text",
      icon: MessageCircle,
      activeClass: "bg-purple-100 text-purple-700 ring-2 ring-purple-500",
      inactiveClass: "bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700",
      hint: "Mark as text message",
    },
  ];

  const handleOutcomeClick = async (outcome: ContactOutcome) => {
    if (outcome === currentOutcome) {
      await handleClearOutcome();
      return;
    }

    setIsUpdating(true);
    await onOutcomeChange(accountId, {
      outcome,
      notes,
      markedAt: new Date(),
    });
    setIsUpdating(false);
  };

  const handleClearOutcome = async () => {
    setIsUpdating(true);
    await onOutcomeChange(accountId, { outcome: null, notes });
    setIsUpdating(false);
    setNotes(initialNotes || "");
  };

  const handleSaveNotes = async () => {
    setIsUpdating(true);
    await onOutcomeChange(accountId, {
      outcome: currentOutcome ?? null,
      notes,
      markedAt: currentOutcome ? new Date() : undefined,
    });
    setIsUpdating(false);
    setShowNotesPopup(false);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {OUTCOME_OPTIONS.map((option) => {
          const isActive = currentOutcome === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              onClick={() => handleOutcomeClick(option.value)}
              disabled={isUpdating}
              title={option.hint}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                isActive ? option.activeClass : option.inactiveClass
              }`}
            >
              <Icon className="h-4 w-4" />
              {option.label}
              {isActive && markedAt && (
                <span className="text-xs opacity-75">{format(markedAt, "M/d")}</span>
              )}
            </button>
          );
        })}

        {(currentOutcome || notes) && (
          <button
            onClick={handleClearOutcome}
            disabled={isUpdating}
            className="inline-flex items-center gap-1 rounded-md bg-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-300"
            title="Clear outcome"
          >
            <XCircle className="h-4 w-4" />
            Clear
          </button>
        )}

        <button
          onClick={() => setShowNotesPopup((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          title="Add or edit notes"
        >
          <StickyNote className="h-4 w-4" />
          {notes ? "Edit Notes" : "Add Notes"}
        </button>
      </div>

      {/* Notes Popup */}
      {showNotesPopup && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900">{accountName}</h4>
            <p className="text-xs text-gray-500">
              Add notes about this touchpoint
            </p>
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
              onClick={() => {
                setShowNotesPopup(false);
                setNotes(initialNotes || "");
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNotes}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={isUpdating}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notes Indicator */}
      {notes && !showNotesPopup && (
        <div className="mt-1 max-w-xs truncate text-xs italic text-gray-500">
          “{notes}”
        </div>
      )}
    </div>
  );
}
