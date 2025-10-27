"use client";

import { useState, useMemo } from "react";
import { DraggableAccount } from "./DraggableAccount";
import { DraggableAccountData } from "@/types/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Users, CheckCircle2, AlertTriangle } from "lucide-react";

interface CallPlanSidebarProps {
  accounts: DraggableAccountData[];
  onDragStart: (account: DraggableAccountData) => void;
}

export function CallPlanSidebar({ accounts, onDragStart }: CallPlanSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showScheduled, setShowScheduled] = useState(true);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([
    "HIGH",
    "MEDIUM",
    "LOW",
  ]);

  const stats = useMemo(() => {
    const total = accounts.length;
    const scheduled = accounts.filter((a) => a.isScheduled).length;
    const unscheduled = total - scheduled;
    const highPriority = accounts.filter((a) => a.priority === "HIGH").length;

    return { total, scheduled, unscheduled, highPriority };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Search filter
      if (
        searchQuery &&
        !account.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !account.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Scheduled/unscheduled filter
      if (account.isScheduled && !showScheduled) return false;
      if (!account.isScheduled && !showUnscheduled) return false;

      // Priority filter
      if (!selectedPriorities.includes(account.priority)) return false;

      return true;
    });
  }, [accounts, searchQuery, showScheduled, showUnscheduled, selectedPriorities]);

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold mb-3">Call Plan Accounts</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-blue-700 mb-1">
              <Users className="h-3 w-3" />
              <span>Total</span>
            </div>
            <div className="text-xl font-bold text-blue-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Scheduled</span>
            </div>
            <div className="text-xl font-bold text-green-900">{stats.scheduled}</div>
          </div>
          <div className="bg-orange-50 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-orange-700 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Unscheduled</span>
            </div>
            <div className="text-xl font-bold text-orange-900">{stats.unscheduled}</div>
          </div>
          <div className="bg-red-50 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-red-700 mb-1">
              <Filter className="h-3 w-3" />
              <span>High Priority</span>
            </div>
            <div className="text-xl font-bold text-red-900">{stats.highPriority}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-white space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Label>

        {/* Status Filters */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-unscheduled"
              checked={showUnscheduled}
              onCheckedChange={(checked) => setShowUnscheduled(checked === true)}
            />
            <label
              htmlFor="show-unscheduled"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show Unscheduled
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-scheduled"
              checked={showScheduled}
              onCheckedChange={(checked) => setShowScheduled(checked === true)}
            />
            <label
              htmlFor="show-scheduled"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show Scheduled
            </label>
          </div>
        </div>

        {/* Priority Filters */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Priority</Label>
          {["HIGH", "MEDIUM", "LOW"].map((priority) => (
            <div key={priority} className="flex items-center space-x-2">
              <Checkbox
                id={`priority-${priority}`}
                checked={selectedPriorities.includes(priority)}
                onCheckedChange={() => togglePriority(priority)}
              />
              <label
                htmlFor={`priority-${priority}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {priority}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Account List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No accounts found</p>
          </div>
        ) : (
          filteredAccounts.map((account) => (
            <DraggableAccount key={account.id} account={account} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}
