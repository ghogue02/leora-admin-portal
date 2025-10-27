"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  Edit2,
  Save,
  X,
  DollarSign,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface WeeklyAccountWithEnhancements {
  id: string;
  customer: {
    id: string;
    customerName: string;
    accountNumber?: string;
    lastOrderDate?: string;
    annualRevenue?: number;
    priority?: "A" | "B" | "C";
  };
  objectives?: string;
  notes?: string;
  contactOutcome?: string;
}

interface WeeklyPlanningEnhancementsProps {
  accounts: WeeklyAccountWithEnhancements[];
  onUpdateAccount: (
    accountId: string,
    updates: { objectives?: string; notes?: string }
  ) => Promise<void>;
  onMarkAllContacted: () => Promise<void>;
}

const PRIORITY_COLORS = {
  A: "bg-red-100 text-red-800 border-red-300",
  B: "bg-yellow-100 text-yellow-800 border-yellow-300",
  C: "bg-green-100 text-green-800 border-green-300",
};

export default function WeeklyPlanningEnhancements({
  accounts,
  onUpdateAccount,
  onMarkAllContacted,
}: WeeklyPlanningEnhancementsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editObjectives, setEditObjectives] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleStartEdit = (account: WeeklyAccountWithEnhancements) => {
    setEditingId(account.id);
    setEditObjectives(account.objectives || "");
    setEditNotes(account.notes || "");
  };

  const handleSaveEdit = async (accountId: string) => {
    try {
      await onUpdateAccount(accountId, {
        objectives: editObjectives,
        notes: editNotes,
      });
      setEditingId(null);
      toast.success("Account updated");
    } catch (error) {
      toast.error("Failed to update account");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditObjectives("");
    setEditNotes("");
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const contactedCount = accounts.filter((a) => a.contactOutcome === "YES").length;
  const totalCount = accounts.length;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Weekly Summary</span>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-base">
                {contactedCount} / {totalCount} Contacted
              </Badge>
              {totalCount > 0 && contactedCount < totalCount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMarkAllContacted}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark All as Contacted
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Account Cards with Enhancements */}
      <div className="grid gap-4">
        {accounts.map((account) => {
          const isEditing = editingId === account.id;
          const customer = account.customer;
          const priorityColor = customer.priority
            ? PRIORITY_COLORS[customer.priority]
            : PRIORITY_COLORS.C;
          const isContacted = account.contactOutcome === "YES";

          return (
            <Card
              key={account.id}
              className={`transition-all ${
                isContacted ? "border-green-500 bg-green-50/30" : ""
              }`}
            >
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isContacted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <h3 className="font-semibold text-lg">
                        {customer.customerName}
                      </h3>
                    </div>
                    {customer.accountNumber && (
                      <p className="text-sm text-gray-500 ml-7">
                        #{customer.accountNumber}
                      </p>
                    )}
                  </div>

                  {/* Priority Badge */}
                  {customer.priority && (
                    <Badge
                      variant="outline"
                      className={`${priorityColor} font-semibold`}
                    >
                      Tier {customer.priority}
                    </Badge>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 ml-7">
                  {customer.lastOrderDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        Last Order:{" "}
                        {format(new Date(customer.lastOrderDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  {customer.annualRevenue && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        {formatCurrency(customer.annualRevenue)}/yr
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">
                      {customer.priority || "C"} Priority
                    </span>
                  </div>
                </div>

                {/* Objectives & Notes */}
                {isEditing ? (
                  <div className="space-y-3 ml-7">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Objectives (3-5 words)
                      </label>
                      <Input
                        value={editObjectives}
                        onChange={(e) => setEditObjectives(e.target.value)}
                        placeholder="e.g., Discuss new wine selection"
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Notes
                      </label>
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(account.id)}
                        className="gap-2"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="gap-2"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-7">
                    {/* Objectives Display */}
                    {account.objectives ? (
                      <div className="mb-2 p-2 bg-blue-50 rounded-md">
                        <span className="text-xs font-medium text-blue-900">
                          Objectives:{" "}
                        </span>
                        <span className="text-sm text-blue-800">
                          {account.objectives}
                        </span>
                      </div>
                    ) : (
                      <div className="mb-2 p-2 bg-gray-50 rounded-md border border-dashed border-gray-300">
                        <span className="text-xs text-gray-500 italic">
                          No objectives set
                        </span>
                      </div>
                    )}

                    {/* Notes Display */}
                    {account.notes && (
                      <div className="mb-2 p-2 bg-gray-50 rounded-md">
                        <span className="text-xs font-medium text-gray-600">
                          Notes:{" "}
                        </span>
                        <span className="text-sm text-gray-700">
                          {account.notes}
                        </span>
                      </div>
                    )}

                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(account)}
                      className="gap-2 mt-2"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Objectives & Notes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
