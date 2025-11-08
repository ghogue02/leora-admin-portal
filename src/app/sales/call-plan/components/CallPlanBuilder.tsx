"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Save, MapPin, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ObjectiveInput from "./ObjectiveInput";
import CallPlanSummary from "./CallPlanSummary";
import type { CallPlanAccount } from "@/types/call-plan";

interface CallPlanBuilderProps {
  selectedAccounts: CallPlanAccount[];
  targetCount?: number;
  weekNumber: number;
  year: number;
  callPlanId?: string;
  onSave?: (callPlan: SavedCallPlan) => void;
}

interface SavedCallPlan {
  id?: string;
  week: number;
  year: number;
  accounts: {
    customerId: string;
    objective: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
  }[];
}

interface AccountWithObjective extends CallPlanAccount {
  objective: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

type ViewMode = "all" | "territory" | "priority" | "type";

const priorityConfig = {
  HIGH: { label: "High", color: "text-red-600 bg-red-50 border-red-200" },
  MEDIUM: { label: "Medium", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  LOW: { label: "Low", color: "text-green-600 bg-green-50 border-green-200" },
};

export default function CallPlanBuilder({
  selectedAccounts,
  targetCount = 30,
  weekNumber,
  year,
  callPlanId,
  onSave,
}: CallPlanBuilderProps) {
  const [accounts, setAccounts] = useState<AccountWithObjective[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize accounts with objectives and priorities
  useEffect(() => {
    const initializedAccounts: AccountWithObjective[] = selectedAccounts.map((acc) => ({
      ...acc,
      objective: acc.objective || "",
      priority: (acc.priority || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
    }));
    setAccounts(initializedAccounts);
  }, [selectedAccounts]);

  const handleObjectiveChange = (accountId: string, objective: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, objective } : acc))
    );
  };

  const handlePriorityChange = (accountId: string, priority: "LOW" | "MEDIUM" | "HIGH") => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, priority } : acc))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const callPlan: SavedCallPlan = {
        id: callPlanId,
        week: weekNumber,
        year,
        accounts: accounts.map((acc) => ({
          customerId: acc.customerId,
          objective: acc.objective,
          priority: acc.priority,
        })),
      };

      const response = await fetch("/api/call-plans", {
        method: callPlanId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callPlan),
      });

      if (!response.ok) {
        throw new Error("Failed to save call plan");
      }

      const savedPlan = await response.json();
      toast.success("Call plan saved successfully!");

      if (onSave) {
        onSave(savedPlan);
      }
    } catch (error) {
      console.error("Error saving call plan:", error);
      toast.error("Failed to save call plan");
    } finally {
      setIsSaving(false);
    }
  };

  // Group accounts by territory
  const accountsByTerritory = accounts.reduce((acc, account) => {
    const territory = account.location || "Unassigned";
    if (!acc[territory]) {
      acc[territory] = [];
    }
    acc[territory].push(account);
    return acc;
  }, {} as Record<string, AccountWithObjective[]>);

  // Group accounts by priority
  const accountsByPriority = accounts.reduce((acc, account) => {
    if (!acc[account.priority]) {
      acc[account.priority] = [];
    }
    acc[account.priority].push(account);
    return acc;
  }, {} as Record<string, AccountWithObjective[]>);

  // Group accounts by type
  const accountsByType = accounts.reduce((acc, account) => {
    const type = account.accountType || "Unknown";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {} as Record<string, AccountWithObjective[]>);

  const currentCount = accounts.length;
  const progressPercentage = (currentCount / targetCount) * 100;
  const isOverTarget = currentCount > targetCount;

  const renderAccountCard = (account: AccountWithObjective) => (
    <div
      key={account.id}
      className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
    >
      {/* Account Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{account.customerName}</h4>
          {account.accountNumber && (
            <p className="text-sm text-gray-500">#{account.accountNumber}</p>
          )}
        </div>

        {account.accountType && (
          <Badge variant={account.accountType === "ACTIVE" ? "default" : "outline"}>
            {account.accountType}
          </Badge>
        )}
      </div>

      {/* Account Details */}
      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
        {account.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{account.location}</span>
          </div>
        )}
        {account.lastOrderDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last: {format(new Date(account.lastOrderDate), "MMM d")}</span>
          </div>
        )}
        {account.establishedRevenue && (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>${(account.establishedRevenue / 1000).toFixed(1)}k</span>
          </div>
        )}
      </div>

      {/* Priority Selector */}
      <div className="mb-3">
        <Select
          value={account.priority}
          onValueChange={(value) => handlePriorityChange(account.id, value as "LOW" | "MEDIUM" | "HIGH")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(priorityConfig) as Array<"LOW" | "MEDIUM" | "HIGH">).map((priority) => (
              <SelectItem key={priority} value={priority}>
                <span className={priorityConfig[priority].color}>
                  {priorityConfig[priority].label} Priority
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Objective Input */}
      <ObjectiveInput
        value={account.objective}
        onChange={(value) => handleObjectiveChange(account.id, value)}
        customerType={account.accountType || "ACTIVE"}
        placeholder="Enter call objective..."
      />
    </div>
  );

  if (showSummary) {
    return (
      <CallPlanSummary
        accounts={accounts}
        weekNumber={weekNumber}
        year={year}
        onBack={() => setShowSummary(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Build Call Plan - Week {weekNumber}, {year}
              </CardTitle>
              <CardDescription className="mt-1">
                Add objectives and set priorities for selected accounts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSummary(true)}
                disabled={accounts.length === 0}
              >
                View Summary
              </Button>
              <Button onClick={handleSave} disabled={isSaving || accounts.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Call Plan"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Account Count: {currentCount}/{targetCount}
              </span>
              {isOverTarget && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">Over target</span>
                </div>
              )}
            </div>
            <Progress
              value={Math.min(progressPercentage, 100)}
              className={isOverTarget ? "bg-yellow-100" : ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({accounts.length})</TabsTrigger>
          <TabsTrigger value="territory">By Territory</TabsTrigger>
          <TabsTrigger value="priority">By Priority</TabsTrigger>
          <TabsTrigger value="type">By Type</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {accounts.map(renderAccountCard)}
        </TabsContent>

        <TabsContent value="territory" className="space-y-4 mt-4">
          {Object.entries(accountsByTerritory).map(([territory, territoryAccounts]) => (
            <Card key={territory}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {territory} ({territoryAccounts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {territoryAccounts.map(renderAccountCard)}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="priority" className="space-y-4 mt-4">
          {(["HIGH", "MEDIUM", "LOW"] as const).map((priority) => {
            const priorityAccounts = accountsByPriority[priority] || [];
            if (priorityAccounts.length === 0) return null;

            return (
              <Card key={priority}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <span className={priorityConfig[priority].color}>
                      {priorityConfig[priority].label} Priority ({priorityAccounts.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {priorityAccounts.map(renderAccountCard)}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="type" className="space-y-4 mt-4">
          {Object.entries(accountsByType).map(([type, typeAccounts]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {type} ({typeAccounts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {typeAccounts.map(renderAccountCard)}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
