"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, CheckCircle2, Circle, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface SelectedAccount {
  id: string;
  name: string;
  accountNumber?: string;
  city?: string;
  state?: string;
  lastOrderDate?: string;
  contactOutcome: string;
  contactedAt?: string;
  objective?: string;
  notes?: string;
}

interface WeeklyAccountsViewProps {
  accounts: SelectedAccount[];
  callPlanId?: string;
  onContactUpdate: (customerId: string, outcome: string, notes?: string) => void;
  onRemoveAccount?: (customerId: string) => void;
}

const CONTACT_OUTCOMES = [
  { value: "NOT_ATTEMPTED", label: "Not Attempted", icon: Circle, color: "text-gray-400" },
  { value: "LEFT_MESSAGE", label: "Left Message", icon: MessageSquare, color: "text-blue-500" },
  { value: "SPOKE_WITH_CONTACT", label: "Spoke", icon: CheckCircle2, color: "text-green-500" },
  { value: "IN_PERSON_VISIT", label: "In-Person", icon: CheckCircle2, color: "text-purple-500" },
  { value: "EMAIL_SENT", label: "Email Sent", icon: MessageSquare, color: "text-yellow-500" },
];

export default function WeeklyAccountsView({
  accounts,
  callPlanId,
  onContactUpdate,
  onRemoveAccount,
}: WeeklyAccountsViewProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleNotes = (accountId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNotes(newExpanded);
  };

  const handleOutcomeClick = async (customerId: string, outcome: string) => {
    if (!callPlanId) return;
    onContactUpdate(customerId, outcome);
  };

  const contactedCount = accounts.filter(
    (a) => a.contactOutcome !== "NOT_ATTEMPTED"
  ).length;

  const visitedCount = accounts.filter(
    (a) => a.contactOutcome === "IN_PERSON_VISIT"
  ).length;

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium text-gray-900">No accounts selected</p>
          <p className="mt-1 text-sm text-gray-500">
            Click "Select Accounts" to add customers to your weekly plan
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Call Plan ({accounts.length} accounts)</CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                {contactedCount} Contacted
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50">
                {visitedCount} Visited
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {accounts.map((account) => {
            const currentOutcome =
              CONTACT_OUTCOMES.find((o) => o.value === account.contactOutcome) ||
              CONTACT_OUTCOMES[0];
            const Icon = currentOutcome.icon;
            const isContacted = account.contactOutcome !== "NOT_ATTEMPTED";
            const notesExpanded = expandedNotes.has(account.id);

            return (
              <div
                key={account.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isContacted
                    ? "border-green-200 bg-green-50/50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Contact Status Icon */}
                  <div className="flex-shrink-0 pt-1">
                    <Icon className={`h-5 w-5 ${currentOutcome.color}`} />
                  </div>

                  {/* Account Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.name}</h3>
                        {account.accountNumber && (
                          <p className="text-sm text-gray-500">#{account.accountNumber}</p>
                        )}
                      </div>

                      {account.contactedAt && (
                        <div className="text-xs text-gray-500 text-right">
                          <div>Contacted</div>
                          <div>{format(new Date(account.contactedAt), "MMM d, h:mm a")}</div>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    {account.city && account.state && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {account.city}, {account.state}
                        </span>
                      </div>
                    )}

                    {/* Last Order */}
                    {account.lastOrderDate && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          Last Order: {format(new Date(account.lastOrderDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}

                    {/* Objective */}
                    {account.objective && (
                      <div className="mt-2 text-sm text-gray-700">
                        <span className="font-medium">Objective:</span> {account.objective}
                      </div>
                    )}

                    {/* Contact Outcome Buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {CONTACT_OUTCOMES.map((outcome) => {
                        const isSelected = account.contactOutcome === outcome.value;
                        const OutcomeIcon = outcome.icon;

                        return (
                          <button
                            key={outcome.value}
                            onClick={() => handleOutcomeClick(account.id, outcome.value)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <OutcomeIcon className="h-3.5 w-3.5" />
                            {outcome.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Notes Section */}
                    {account.notes && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleNotes(account.id)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          {notesExpanded ? "Hide Notes" : "Show Notes"}
                        </button>
                        {notesExpanded && (
                          <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                            {account.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  {onRemoveAccount && (
                    <button
                      onClick={() => onRemoveAccount(account.id)}
                      className="text-xs text-gray-400 hover:text-red-600 flex-shrink-0"
                      title="Remove from plan"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
