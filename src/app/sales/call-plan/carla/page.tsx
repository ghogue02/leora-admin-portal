"use client";

import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks } from "date-fns";
import CallPlanHeader from "./components/CallPlanHeader";
import AccountList from "./components/AccountList";
import AccountSelectionModal from "./components/AccountSelectionModal";
import WeeklyAccountsView from "./components/WeeklyAccountsView";
import TerritoryFilter from "./components/TerritoryFilter";
import AccountTypeSelector from "./components/AccountTypeSelector";
import PriorityFilter from "./components/PriorityFilter";
import SearchBar from "./components/SearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export type AccountType = "PROSPECT" | "TARGET" | "ACTIVE";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface Account {
  id: string;
  name: string;
  accountNumber?: string;
  accountType: AccountType;
  priority: Priority;
  city?: string;
  state?: string;
  territory?: string;
  lastOrderDate?: string;
  selected?: boolean;
}

export default function CarlaCallPlanPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<any[]>([]);
  const [callPlanId, setCallPlanId] = useState<string | undefined>();

  // Filter states
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<AccountType[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadAccounts();
    loadSelectedAccounts();
  }, [currentWeekStart]);

  useEffect(() => {
    applyFilters();
  }, [accounts, selectedTerritories, selectedAccountTypes, selectedPriorities, searchQuery]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const response = await fetch(`/api/sales/call-plan/carla/accounts?weekStart=${weekStart}`);

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
      setAccounts([]);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedAccounts = async () => {
    try {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const response = await fetch(
        `/api/sales/call-plan/carla/accounts/manage?weekStart=${weekStart}`
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedAccountIds(new Set(data.selectedAccountIds || []));
        setSelectedAccounts(data.accounts || []);
        setCallPlanId(data.callPlan?.id);
      } else {
        setSelectedAccountIds(new Set());
        setSelectedAccounts([]);
        setCallPlanId(undefined);
      }
    } catch (error) {
      console.error("Error loading selected accounts:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...accounts];

    // Territory filter
    if (selectedTerritories.length > 0) {
      filtered = filtered.filter(
        (account) => account.territory && selectedTerritories.includes(account.territory)
      );
    }

    // Account type filter
    if (selectedAccountTypes.length > 0) {
      filtered = filtered.filter((account) =>
        selectedAccountTypes.includes(account.accountType)
      );
    }

    // Priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter((account) =>
        selectedPriorities.includes(account.priority)
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.name.toLowerCase().includes(query) ||
          account.accountNumber?.toLowerCase().includes(query)
      );
    }

    setFilteredAccounts(filtered);
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleThisWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleSaveSelection = async (accountIds: string[]) => {
    try {
      const response = await fetch("/api/sales/call-plan/carla/accounts/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: currentWeekStart.toISOString(),
          accountIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Successfully added ${data.callPlan.newAccountsAdded} account(s) to your plan`
        );
        await loadSelectedAccounts();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving selection:", error);
      toast.error("Failed to save account selection");
    }
  };

  const handleContactUpdate = async (
    customerId: string,
    outcome: string,
    notes?: string
  ) => {
    if (!callPlanId) return;

    try {
      const response = await fetch("/api/sales/call-plan/carla/accounts/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callPlanId,
          customerId,
          contactOutcome: outcome,
          notes,
        }),
      });

      if (response.ok) {
        toast.success("Contact status updated");
        await loadSelectedAccounts();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact status");
    }
  };

  const handleRemoveAccount = async (customerId: string) => {
    try {
      const response = await fetch("/api/sales/call-plan/carla/accounts/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: currentWeekStart.toISOString(),
          accountIds: [customerId],
        }),
      });

      if (response.ok) {
        toast.success("Account removed from plan");
        await loadSelectedAccounts();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error removing account:", error);
      toast.error("Failed to remove account");
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert("PDF export coming soon!");
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek =
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() === currentWeekStart.getTime();

  const selectedCount = selectedAccountIds.size;
  const availableTerritories = Array.from(
    new Set(accounts.map((acc) => acc.territory).filter(Boolean))
  ) as string[];

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      {/* Header */}
      <CallPlanHeader
        weekStart={currentWeekStart}
        weekEnd={weekEnd}
        isCurrentWeek={isCurrentWeek}
        selectedCount={selectedCount}
        maxAccounts={75}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onThisWeek={handleThisWeek}
        onCreatePlan={() => toast.success("Plan saved automatically")}
        onExportPDF={handleExportPDF}
        onSelectAccounts={handleOpenModal}
      />

      {/* Selected Accounts View */}
      <WeeklyAccountsView
        accounts={selectedAccounts}
        callPlanId={callPlanId}
        onContactUpdate={handleContactUpdate}
        onRemoveAccount={handleRemoveAccount}
      />

      {/* Account Selection Modal */}
      <AccountSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
        onSave={handleSaveSelection}
        maxAccounts={75}
      />
    </main>
  );
}
