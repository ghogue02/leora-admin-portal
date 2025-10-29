"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import ContactOutcomeButtons from "./ContactOutcomeButtons";
import WeeklyProgress from "./WeeklyProgress";
import type {
  AccountWithOutcome,
  ContactOutcome,
  ContactOutcomeData,
  WeeklyProgressData,
} from "../types";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

interface WeeklyTrackerProps {
  weekStart: Date;
  callPlanId?: string;
  onUpdate?: () => void;
}

export default function WeeklyTracker({
  weekStart,
  callPlanId,
  onUpdate,
}: WeeklyTrackerProps) {
  const [accounts, setAccounts] = useState<AccountWithOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<WeeklyProgressData>({
    totalAccounts: 0,
    inPersonCount: 0,
    phoneCount: 0,
    emailCount: 0,
    textCount: 0,
    contactedCount: 0,
    visitedCount: 0,
    notReachedCount: 0,
    percentComplete: 0,
  });

  useEffect(() => {
    loadWeeklyAccounts();
  }, [weekStart, callPlanId]);

  const loadWeeklyAccounts = async () => {
    setLoading(true);
    try {
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const response = await fetch(
        `/api/sales/call-plan/tracker?weekStart=${weekStartStr}`,
        { credentials: "include", headers: tenantHeaders },
      );

      if (response.ok) {
        const data = await response.json();
        const normalizedAccounts: AccountWithOutcome[] = (data.accounts || []).map(
          (account: AccountWithOutcome & { markedAt?: string | Date | null }) => ({
            ...account,
            outcome: normalizeOutcome(account.outcome),
            markedAt: account.markedAt ? new Date(account.markedAt) : undefined,
          })
        );
        setAccounts(normalizedAccounts);
        calculateProgress(normalizedAccounts);
      }
    } catch (error) {
      console.error("Error loading weekly accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeOutcome = (
    outcome: AccountWithOutcome["outcome"] | string | null | undefined
  ): ContactOutcome => {
    if (!outcome) return null;
    const value = outcome.toLowerCase();
    if (value === "visited" || value === "in_person" || value === "in-person" || value === "inperson") {
      return "in_person";
    }
    if (value === "contacted" || value === "phone" || value === "call" || value === "called") {
      return "phone";
    }
    if (value === "email" || value === "email_sent" || value === "emailed") {
      return "email";
    }
    if (value === "text" || value === "sms" || value === "message") {
      return "text";
    }
    return null;
  };

  const calculateProgress = (accountsList: AccountWithOutcome[]) => {
    const total = accountsList.length;
    let inPerson = 0;
    let phone = 0;
    let email = 0;
    let text = 0;

    accountsList.forEach((account) => {
      const normalized = normalizeOutcome(account.outcome);
      if (normalized === "in_person") inPerson += 1;
      else if (normalized === "phone") phone += 1;
      else if (normalized === "email") email += 1;
      else if (normalized === "text") text += 1;
    });

    const reached = inPerson + phone + email + text;
    const contacted = phone + email + text;

    setProgress({
      totalAccounts: total,
      inPersonCount: inPerson,
      phoneCount: phone,
      emailCount: email,
      textCount: text,
      contactedCount: contacted,
      visitedCount: inPerson,
      notReachedCount: total - reached,
      percentComplete: total > 0 ? (reached / total) * 100 : 0,
    });
  };

  const handleOutcomeChange = async (
    accountId: string,
    data: ContactOutcomeData
  ) => {
    try {
      const response = await fetch("/api/sales/call-plan/tracker/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({
          accountId,
          weekStart: format(weekStart, "yyyy-MM-dd"),
          ...data,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setAccounts((prev) => {
          const next = prev.map((acc) =>
            acc.id === accountId
              ? {
                  ...acc,
                  outcome: normalizeOutcome(data.outcome),
                  markedAt: data.markedAt ? new Date(data.markedAt) : data.markedAt,
                  notes: data.notes ?? acc.notes,
                }
              : acc
          );
          calculateProgress(next);
          return next;
        });

        // Trigger parent update if provided
        onUpdate?.();
      }
    } catch (error) {
      console.error("Error updating outcome:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading weekly tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <WeeklyProgress progress={progress} />

      {/* Account Grid */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Weekly Execution Tracker
          </h3>
          <p className="text-sm text-gray-600">
            Track how each customer was contacted this week
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {accounts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">
                No accounts scheduled for this week.
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Add activities to your call plan to see them here.
              </p>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{account.name}</h4>
                  {(account.city || account.state) && (
                    <p className="text-sm text-gray-500">
                      {account.city}
                      {account.city && account.state && ", "}
                      {account.state}
                    </p>
                  )}
                </div>

                <ContactOutcomeButtons
                  accountId={account.id}
                  accountName={account.name}
                  currentOutcome={account.outcome}
                  markedAt={account.markedAt}
                  notes={account.notes}
                  onOutcomeChange={handleOutcomeChange}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-green-50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Marking Guide</h4>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg font-bold text-green-700">In-Person</span>
            </div>
            <p className="text-xs text-gray-600">Face-to-face visit or meeting</p>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg font-bold text-blue-600">Phone</span>
            </div>
            <p className="text-xs text-gray-600">Phone call or voicemail</p>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg font-bold text-indigo-600">Email</span>
            </div>
            <p className="text-xs text-gray-600">Follow-up email sent</p>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg font-bold text-purple-600">Text</span>
            </div>
            <p className="text-xs text-gray-600">SMS or messaging app touch</p>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg font-bold text-gray-600">—</span>
              <span className="font-medium text-gray-900">Not Reached</span>
            </div>
            <p className="text-xs text-gray-600">No contact made yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
