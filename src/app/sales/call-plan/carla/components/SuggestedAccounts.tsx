"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  Calendar,
  Lightbulb,
  Loader2,
  MapPin,
  Plus,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

interface SuggestedAccount {
  customerId: string;
  customerName: string;
  accountNumber: string | null;
  territory: string | null;
  city: string | null;
  state: string | null;
  establishedRevenue: number | null;
  daysSinceLastOrder: number | null;
  lastOrderDate: string | null;
  totalOrders: number;
  score: number;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  recommendedDay: string | null;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

interface SuggestedAccountsProps {
  callPlanId: string | null | undefined;
  onAddAccount: (customerId: string) => Promise<void>;
  refreshKey?: number;
}

const urgencyConfig = {
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-800 border-red-300" },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-800 border-orange-300" },
  MEDIUM: { label: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  LOW: { label: "Low", color: "bg-blue-100 text-blue-800 border-blue-300" },
};

const priorityConfig = {
  HIGH: { color: "text-red-600" },
  MEDIUM: { color: "text-yellow-600" },
  LOW: { color: "text-green-600" },
};

export default function SuggestedAccounts({
  callPlanId,
  onAddAccount,
  refreshKey = 0,
}: SuggestedAccountsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callPlanId, refreshKey]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (callPlanId) params.set("callPlanId", callPlanId);
      params.set("limit", "20");
      params.set("minScore", "40");

      const response = await fetch(`/api/sales/call-plan/carla/suggestions?${params.toString()}`, {
        credentials: "include",
        headers: tenantHeaders,
      });

      if (!response.ok) {
        throw new Error("Failed to load suggestions");
      }

      const data = await response.json();
      setSuggestions(data.suggestions ?? []);
      setDismissedIds(new Set());
      setShowAll(false);
    } catch (error) {
      console.error("[SuggestedAccounts] loadSuggestions", error);
      toast.error("Unable to load suggestions");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async (suggestion: SuggestedAccount) => {
    setAddingIds((prev) => new Set(prev).add(suggestion.customerId));
    try {
      await onAddAccount(suggestion.customerId);
      toast.success(`${suggestion.customerName} added to call plan`);
      setSuggestions((prev) => prev.filter((item) => item.customerId !== suggestion.customerId));
    } catch (error) {
      console.error("[SuggestedAccounts] addAccount", error);
      toast.error("Failed to add account to call plan");
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.customerId);
        return next;
      });
    }
  };

  const handleDismiss = (customerId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(customerId);
      return next;
    });
    toast.success("Suggestion dismissed");
  };

  const visibleSuggestions = useMemo(() => {
    const filtered = suggestions.filter((suggestion) => !dismissedIds.has(suggestion.customerId));
    if (showAll) return filtered;
    return filtered.slice(0, 5);
  }, [dismissedIds, showAll, suggestions]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertTitle>All caught up!</AlertTitle>
        <AlertDescription>
          No dormant accounts need attention right now. Great job staying on top of your call
          plan.
        </AlertDescription>
      </Alert>
    );
  }

  const remainingCount = suggestions.filter(
    (suggestion) => !dismissedIds.has(suggestion.customerId),
  ).length;
  const hiddenCount = Math.max(0, remainingCount - visibleSuggestions.length);

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Suggested for This Week</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {remainingCount} ready
          </Badge>
        </div>
        <CardDescription>
          Surface high-impact dormant accounts before they churn. Suggestions update as your plan
          changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleSuggestions.map((suggestion) => {
          const urgencyStyle = urgencyConfig[suggestion.urgency];
          const priorityStyle = priorityConfig[suggestion.priority];
          const isAdding = addingIds.has(suggestion.customerId);

          return (
            <div
              key={suggestion.customerId}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex-shrink-0">
                <div className={`rounded-full border-2 px-2 py-1 text-xs font-semibold ${urgencyStyle.color}`}>
                  {urgencyStyle.label}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{suggestion.customerName}</h4>
                    {suggestion.accountNumber && (
                      <p className="text-sm text-gray-500">#{suggestion.accountNumber}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <TrendingUp className={`h-4 w-4 ${priorityStyle.color}`} />
                    <span className={priorityStyle.color}>Score: {suggestion.score}</span>
                  </div>
                </div>

                <p className="mt-2 text-sm font-medium text-gray-700">{suggestion.reason}</p>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                  {suggestion.city && suggestion.state && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {suggestion.city}, {suggestion.state}
                    </span>
                  )}

                  {suggestion.lastOrderDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Last: {format(new Date(suggestion.lastOrderDate), "MMM d, yyyy")}
                    </span>
                  )}

                  {suggestion.recommendedDay && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Suggested: {suggestion.recommendedDay}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={isAdding}
                  onClick={() => handleAddAccount(suggestion)}
                >
                  {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-gray-500"
                  onClick={() => handleDismiss(suggestion.customerId)}
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss
                </Button>
              </div>
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAll(true)}
          >
            Show {hiddenCount} more suggestion{hiddenCount === 1 ? "" : "s"}
          </Button>
        )}

        {showAll && hiddenCount === 0 && remainingCount > 5 && (
          <Button variant="outline" className="w-full" onClick={() => setShowAll(false)}>
            Show fewer suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
