"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MapPin, Calendar, TrendingUp, Search, X, Filter } from "lucide-react";
import { format } from "date-fns";
import type { Account, AccountType, Priority } from "../page";

interface AccountSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  selectedAccountIds: Set<string>;
  onSave: (selectedIds: string[]) => void;
}

type HealthFilter = "all" | "healthy" | "at-risk" | "dormant";
type LastContactFilter = "all" | "week" | "1-2weeks" | "2plus";

const accountTypeConfig: Record<AccountType, { label: string; color: string }> = {
  PROSPECT: { label: "Prospect", color: "bg-gray-100 text-gray-700 border-gray-300" },
  TARGET: { label: "Target", color: "bg-blue-100 text-blue-700 border-blue-300" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700 border-green-300" },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  HIGH: { label: "High", color: "text-red-600 bg-red-50 border-red-200" },
  MEDIUM: { label: "Medium", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  LOW: { label: "Low", color: "text-green-600 bg-green-50 border-green-200" },
};

export default function AccountSelectionModal({
  isOpen,
  onClose,
  accounts,
  selectedAccountIds,
  onSave,
}: AccountSelectionModalProps) {
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set(selectedAccountIds));
  const [searchQuery, setSearchQuery] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState<string[]>([]);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<AccountType[]>([
    "ACTIVE",
    "TARGET",
    "PROSPECT",
  ]);
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([]);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [lastContactFilter, setLastContactFilter] = useState<LastContactFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Reset local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelection(new Set(selectedAccountIds));
      setSelectedAccountTypes(["ACTIVE", "TARGET", "PROSPECT"]);
    }
  }, [isOpen, selectedAccountIds]);

  // Get unique territories
  const territories = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.territory).filter(Boolean))) as string[];
  }, [accounts]);

  const accountTypeCounts = useMemo(() => {
    return accounts.reduce<Record<AccountType, number>>(
      (acc, account) => {
        acc[account.accountType] = (acc[account.accountType] || 0) + 1;
        return acc;
      },
      {
        ACTIVE: 0,
        TARGET: 0,
        PROSPECT: 0,
      }
    );
  }, [accounts]);

  // Filter accounts based on all criteria
  const filteredAccounts = useMemo(() => {
    let filtered = [...accounts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.name.toLowerCase().includes(query) ||
          account.accountNumber?.toLowerCase().includes(query)
      );
    }

    // Territory filter
    if (territoryFilter.length > 0) {
      filtered = filtered.filter(
        (account) => account.territory && territoryFilter.includes(account.territory)
      );
    }

    // Account type filter
    if (selectedAccountTypes.length === 0) {
      return [];
    }

    if (selectedAccountTypes.length < 3) {
      filtered = filtered.filter((account) => selectedAccountTypes.includes(account.accountType));
    }

    // Priority filter
    if (priorityFilter.length > 0) {
      filtered = filtered.filter((account) => priorityFilter.includes(account.priority));
    }

    // Health filter (would need riskStatus from API)
    // if (healthFilter !== "all") {
    //   // Implement based on riskStatus field
    // }

    // Last contact filter (would need lastContactDate from API)
    // if (lastContactFilter !== "all") {
    //   // Implement based on lastContactDate field
    // }

    return filtered;
  }, [accounts, searchQuery, territoryFilter, selectedAccountTypes, priorityFilter]);

  const handleToggleAccount = (accountId: string) => {
    const newSelection = new Set(localSelection);
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
    } else {
      newSelection.add(accountId);
    }
    setLocalSelection(newSelection);
  };

  const handleSelectAll = () => {
    const currentlyDisplayed = filteredAccounts.map((a) => a.id);
    const allSelected = currentlyDisplayed.every((id) => localSelection.has(id));

    if (allSelected) {
      // Deselect all displayed
      const newSelection = new Set(localSelection);
      currentlyDisplayed.forEach((id) => newSelection.delete(id));
      setLocalSelection(newSelection);
    } else {
      // Select all displayed
      const newSelection = new Set(localSelection);
      for (const id of currentlyDisplayed) {
        if (!newSelection.has(id)) {
          newSelection.add(id);
        }
      }
      setLocalSelection(newSelection);
    }
  };

  const handleClearAll = () => {
    setLocalSelection(new Set());
  };

  const handleSave = () => {
    onSave(Array.from(localSelection));
    onClose();
  };

  const handleTerritoryToggle = (territory: string) => {
    setTerritoryFilter((prev) =>
      prev.includes(territory) ? prev.filter((t) => t !== territory) : [...prev, territory]
    );
  };

  const handlePriorityToggle = (priority: Priority) => {
    setPriorityFilter((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const selectedCount = localSelection.size;
  const countColor = selectedCount < 30 ? "text-red-600" : "text-green-600";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Select Accounts for Call Plan</DialogTitle>
            <div className={`text-lg font-semibold ${countColor}`}>
              Selected: {selectedCount}
            </div>
          </div>
        </DialogHeader>

        {/* Search and Filter Bar */}
        <div className="px-6 py-4 border-b space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or account number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {(territoryFilter.length > 0 || priorityFilter.length > 0) && (
                <Badge variant="secondary" className="ml-1">
                  {territoryFilter.length + priorityFilter.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Chips */}
          {showFilters && (
            <div className="space-y-3 pt-3 border-t">
              {/* Territory Filters */}
              {territories.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Territory
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {territories.map((territory) => (
                      <Badge
                        key={territory}
                        variant={territoryFilter.includes(territory) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTerritoryToggle(territory)}
                      >
                        {territory}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {/* Priority Filters */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Priority</label>
                <div className="flex flex-wrap gap-2">
                  {(["HIGH", "MEDIUM", "LOW"] as Priority[]).map((priority) => (
                    <Badge
                      key={priority}
                      variant={priorityFilter.includes(priority) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handlePriorityToggle(priority)}
                    >
                      {priorityConfig[priority].label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Type Filters */}
        <div className="px-6 py-4 border-b space-y-2">
          <Label className="text-sm font-medium">Account Type</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-active"
                checked={selectedAccountTypes.includes("ACTIVE")}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setSelectedAccountTypes((prev) =>
                    isChecked ? Array.from(new Set([...prev, "ACTIVE"])) : prev.filter((t) => t !== "ACTIVE")
                  );
                }}
              />
              <label htmlFor="filter-active" className="text-sm cursor-pointer">
                Active
                <Badge variant="default" className="ml-2">
                  {accountTypeCounts.ACTIVE}
                </Badge>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-target"
                checked={selectedAccountTypes.includes("TARGET")}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setSelectedAccountTypes((prev) =>
                    isChecked ? Array.from(new Set([...prev, "TARGET"])) : prev.filter((t) => t !== "TARGET")
                  );
                }}
              />
              <label htmlFor="filter-target" className="text-sm cursor-pointer">
                Target
                <Badge variant="secondary" className="ml-2">
                  {accountTypeCounts.TARGET}
                </Badge>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-prospect"
                checked={selectedAccountTypes.includes("PROSPECT")}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setSelectedAccountTypes((prev) =>
                    isChecked ? Array.from(new Set([...prev, "PROSPECT"])) : prev.filter((t) => t !== "PROSPECT")
                  );
                }}
              />
              <label htmlFor="filter-prospect" className="text-sm cursor-pointer">
                Prospect
                <Badge variant="outline" className="ml-2">
                  {accountTypeCounts.PROSPECT}
                </Badge>
              </label>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {filteredAccounts.every((a) => localSelection.has(a.id))
                ? "Deselect Visible"
                : "Select Visible"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredAccounts.length} of {accounts.length} accounts
          </div>
        </div>

        {/* Account List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">No accounts found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredAccounts.map((account) => {
                const isSelected = localSelection.has(account.id);
                const typeConfig = accountTypeConfig[account.accountType];
                const priorityConf = priorityConfig[account.priority];

                return (
                  <div
                    key={account.id}
                    onClick={() => handleToggleAccount(account.id)}
                    className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => {}} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {account.name}
                          </h3>
                          {account.accountNumber && (
                            <p className="text-sm text-gray-500">#{account.accountNumber}</p>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${priorityConf.color}`}
                          >
                            {priorityConf.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        {account.city && account.state && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {account.city}, {account.state}
                            </span>
                          </div>
                        )}

                        {account.territory && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{account.territory}</span>
                          </div>
                        )}

                        {account.lastOrderDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>
                              Last Order: {format(new Date(account.lastOrderDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className={`text-sm font-medium ${countColor}`}>
              {selectedCount} accounts selected
              {selectedCount < 30 && (
                <span className="text-red-600 ml-2">(add more — target 30+)</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={selectedCount === 0}>
                Add {selectedCount} Account{selectedCount !== 1 ? "s" : ""} to Plan
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
