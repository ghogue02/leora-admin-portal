"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import type { CarlaSelectedAccount } from "../types";

interface WeeklyAccountsViewProps {
  accounts: CarlaSelectedAccount[];
}

const OUTCOME_DISPLAY: Record<
  string,
  { label: string; badge: string; text: string; bg: string }
> = {
  NOT_ATTEMPTED: {
    label: "Not attempted",
    badge: "bg-slate-100 text-slate-600",
    text: "text-slate-500",
    bg: "bg-white",
  },
  LEFT_MESSAGE: {
    label: "Left message",
    badge: "bg-blue-50 text-blue-700",
    text: "text-blue-700",
    bg: "bg-blue-50/60",
  },
  SPOKE_WITH_CONTACT: {
    label: "Spoke",
    badge: "bg-green-100 text-green-800",
    text: "text-green-700",
    bg: "bg-green-50/60",
  },
  IN_PERSON_VISIT: {
    label: "Visited",
    badge: "bg-purple-100 text-purple-800",
    text: "text-purple-700",
    bg: "bg-purple-50/60",
  },
  EMAIL_SENT: {
    label: "Email sent",
    badge: "bg-amber-50 text-amber-700",
    text: "text-amber-700",
    bg: "bg-amber-50/60",
  },
};

export default function WeeklyAccountsView({ accounts }: WeeklyAccountsViewProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleNotes = (accountId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNotes(newExpanded);
  };

  const buildDragPayload = (account: CarlaSelectedAccount, accountName: string) => {
    const lastOrderDate = account.lastOrderDate ?? account.customer?.lastOrderDate ?? undefined;
    const city = account.city ?? account.customer?.city ?? null;
    const state = account.state ?? account.customer?.state ?? null;
    const territory = account.territory ?? account.customer?.territory ?? null;

    return {
      id: account.id,
      customerId: account.id,
      customerName: accountName,
      priority: "MEDIUM",
      accountType: "ACTIVE",
      accountNumber: account.accountNumber ?? account.customer?.accountNumber ?? null,
      location: city && state ? `${city}, ${state}` : city ?? state ?? null,
      objective: account.objective ?? "",
      territory,
      lastOrderDate,
      isScheduled: false,
    };
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    payload: ReturnType<typeof buildDragPayload>,
    id: string
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    setDraggedAccountId(id);
  };

  const handleDragEnd = () => {
    setDraggedAccountId(null);
  };

  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (account.name ?? account.customer?.customerName ?? "")
        .toLowerCase()
        .includes(query) ||
      (account.accountNumber ?? account.customer?.accountNumber ?? "")
        ?.toLowerCase()
        ?.includes(query) ||
      (account.city ?? account.customer?.city ?? "")
        .toLowerCase()
        .includes(query)
    );
  });

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium text-gray-900">No accounts selected</p>
          <p className="mt-1 text-sm text-gray-500 text-center">
            Your weekly call plan will load automatically once customer assignments sync.
            Refresh the page if this message persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Weekly Call Plan ({accounts.length} accounts)</CardTitle>
            {searchQuery && (
              <p className="text-sm text-gray-500">
                Showing {filteredAccounts.length} match
                {filteredAccounts.length === 1 ? "" : "es"} for “{searchQuery}”
              </p>
            )}
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search customers..."
            className="w-full sm:w-72"
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="max-h-[520px] overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredAccounts.map((account) => {
            const outcomeValue = account.contactOutcome ?? "NOT_ATTEMPTED";
            const statusMeta =
              OUTCOME_DISPLAY[outcomeValue] ?? OUTCOME_DISPLAY.NOT_ATTEMPTED;
            const notesExpanded = expandedNotes.has(account.id);
            const accountName = account.name ?? account.customer?.customerName ?? "Customer";
            const accountNumber = account.accountNumber ?? account.customer?.accountNumber ?? undefined;
            const lastOrderDate = account.lastOrderDate ?? account.customer?.lastOrderDate ?? undefined;
            const city = account.city ?? account.customer?.city ?? undefined;
            const state = account.state ?? account.customer?.state ?? undefined;
            const objective = account.objective ?? account.objectives ?? undefined;
            const dragPayload = buildDragPayload(account, accountName);

            return (
              <div
                key={account.id}
                id={`weekly-draggable-account-${account.id}`}
                className={`rounded-2xl border p-4 transition-shadow ${
                  outcomeValue !== "NOT_ATTEMPTED"
                    ? "border-blue-200 bg-white shadow shadow-blue-50"
                    : "border-gray-200 bg-white"
                } ${draggedAccountId === account.id ? "ring-2 ring-blue-300" : ""}`}
                draggable
                onDragStart={(event) => handleDragStart(event, dragPayload, account.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-gray-900">{accountName}</h3>
                      {accountNumber && (
                        <p className="text-xs text-gray-500">#{accountNumber}</p>
                      )}
                      {city && state && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {city}, {state}
                          </span>
                        </div>
                      )}
                    </div>
                    {outcomeValue !== "NOT_ATTEMPTED" && (
                      <Badge className={`${statusMeta.badge} whitespace-nowrap`}>
                        {statusMeta.label}
                      </Badge>
                    )}
                  </div>

                  {lastOrderDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(lastOrderDate), "MMM d, yyyy")}</span>
                    </div>
                  )}

                  {objective && (
                    <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                      <span className="font-semibold">Plan:</span> {objective}
                    </div>
                  )}

                  {account.notes && (
                    <div className="mt-1">
                      <button
                        onClick={() => toggleNotes(account.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {notesExpanded ? "Hide Notes" : "Show Notes"}
                      </button>
                      {notesExpanded && (
                        <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                          {account.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
