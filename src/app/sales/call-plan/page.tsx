"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Calendar as CalendarIcon, Map, Repeat } from "lucide-react";
import { toast } from "sonner";

import CallPlanHeader from "./carla/components/CallPlanHeader";
import AccountSelectionModal from "./carla/components/AccountSelectionModal";
import WeeklyAccountsView from "./carla/components/WeeklyAccountsView";
import DragDropCalendar from "./carla/components/DragDropCalendar";
import TerritoryBlocker from "./carla/components/TerritoryBlocker";
import SuggestedAccounts from "./carla/components/SuggestedAccounts";
import CalendarSync from "./carla/components/CalendarSync";
import RecurringSchedule from "./carla/components/RecurringSchedule";

import WeeklyCallPlanGrid from "./sections/WeeklyCallPlanGrid";
import CallPlanStats from "./sections/CallPlanStats";
import WeeklyTracker from "./components/WeeklyTracker";

import { Button } from "@/components/ui/button";

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

export default function CallPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>("list");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<any[]>([]);
  const [callPlanId, setCallPlanId] = useState<string | undefined>();
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState<number>(0);
  const [suggestionsRefreshKey, setSuggestionsRefreshKey] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [callPlanOverview, setCallPlanOverview] = useState<any>(null);
  const [callPlanLoading, setCallPlanLoading] = useState(true);

  const weekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart],
  );
  const isCurrentWeek = useMemo(
    () =>
      startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() ===
      currentWeekStart.getTime(),
    [currentWeekStart],
  );

  const selectedCount = selectedAccountIds.size;
  const availableTerritories = useMemo(() => {
    return Array.from(new Set(accounts.map((acc) => acc.territory).filter(Boolean))) as string[];
  }, [accounts]);

  const availableAccountsForRecurring = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        name: account.name,
        accountNumber: account.accountNumber ?? null,
      })),
    [accounts],
  );

  const tenantHeaders = useMemo(
    () => ({
      "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
    }),
    [],
  );

  const apiFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}) => {
      const mergedHeaders: HeadersInit = {
        ...tenantHeaders,
        ...(init.headers || {}),
      };

      return fetch(input, {
        ...init,
        headers: mergedHeaders,
        credentials: "include",
      });
    },
    [tenantHeaders],
  );

  const loadAccounts = useCallback(async () => {
    try {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const response = await apiFetch(`/api/sales/call-plan/carla/accounts?weekStart=${weekStart}`);

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
    }
  }, [currentWeekStart]);

  const loadSelectedAccounts = useCallback(async () => {
    try {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const response = await apiFetch(
        `/api/sales/call-plan/carla/accounts/manage?weekStart=${weekStart}`,
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
    setScheduleRefreshKey(Date.now());
    setSuggestionsRefreshKey((prev) => prev + 1);
  }, [currentWeekStart]);

  const loadCallPlanOverview = useCallback(async () => {
    setCallPlanLoading(true);
    try {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const response = await apiFetch(`/api/sales/call-plan?weekStart=${weekStart}`);

      if (response.ok) {
        const data = await response.json();
        setCallPlanOverview(data);
      } else {
        setCallPlanOverview(null);
      }
    } catch (error) {
      console.error("Error loading call plan overview:", error);
      setCallPlanOverview(null);
    } finally {
      setCallPlanLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadAccounts();
    loadSelectedAccounts();
    loadCallPlanOverview();
  }, [loadAccounts, loadSelectedAccounts, loadCallPlanOverview]);

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    const storedTab = typeof window !== "undefined" ? localStorage.getItem("callPlanPreferredTab") : null;
    const nextTab = tabParam ?? storedTab ?? "list";
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [tabParam]);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/sales/auth/me", {
          credentials: "include",
        });

        if (response.status === 401) {
          toast.error("Your session has expired. Please log in again.");
          router.push(`/sales/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
      } catch (error) {
        console.error("Unable to verify sales session:", error);
      }
    };

    void verifySession();
  }, [router]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("callPlanPreferredTab", value);
    }

    const params = new URLSearchParams();
    searchParams.forEach((paramValue, key) => {
      if (key !== "tab") {
        params.append(key, paramValue);
      }
    });
    params.set("tab", value);

    const query = params.toString();
    router.replace(`/sales/call-plan${query ? `?${query}` : ""}`, { scroll: false });
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
      const response = await apiFetch("/api/sales/call-plan/carla/accounts/manage", {
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
          `Successfully added ${data.callPlan.newAccountsAdded} account(s) to your plan`,
        );
        await Promise.all([loadSelectedAccounts(), loadCallPlanOverview()]);
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
    notes?: string,
  ) => {
    if (!callPlanId) return;

    try {
      const response = await apiFetch("/api/sales/call-plan/carla/accounts/contact", {
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
        await Promise.all([loadSelectedAccounts(), loadCallPlanOverview()]);
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
      const response = await apiFetch("/api/sales/call-plan/carla/accounts/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: currentWeekStart.toISOString(),
          accountIds: [customerId],
        }),
      });

      if (response.ok) {
        toast.success("Account removed from plan");
        await Promise.all([loadSelectedAccounts(), loadCallPlanOverview()]);
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
    toast.info("PDF export coming soon!");
  };

  const handleBlocksChange = useCallback(() => {
    setScheduleRefreshKey(Date.now());
  }, []);

  const handleAddSuggestedAccount = useCallback(
    async (customerId: string) => {
      if (!callPlanId) {
        toast.error("Create a call plan for this week first");
        throw new Error("Call plan not created");
      }

      if (selectedAccountIds.has(customerId)) {
        toast.info("Account already on call plan");
        return;
      }

      try {
        const response = await apiFetch(
          `/api/sales/call-plan/carla/call-plan/${callPlanId}/accounts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId }),
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error ?? "Failed to add account");
        }

        await Promise.all([loadSelectedAccounts(), loadCallPlanOverview()]);
      } catch (error) {
        console.error("Error adding suggested account:", error);
        throw error;
      }
    },
    [callPlanId, loadSelectedAccounts, loadCallPlanOverview, selectedAccountIds],
  );

  const handleGenerateRecurring = useCallback(async () => {
    if (!callPlanId) {
      toast.error("Create a call plan first");
      return;
    }

    try {
      const response = await apiFetch("/api/sales/call-plan/carla/recurring/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callPlanId,
          weekStart: currentWeekStart.toISOString(),
          weeksAhead: 2,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to generate recurring schedules");
      }

      const data = await response.json();
      toast.success(data.message);
      setScheduleRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error generating recurring schedules:", error);
      toast.error("Failed to generate recurring schedules");
    }
  }, [callPlanId, currentWeekStart]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
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
        calendarSyncButton={<CalendarSync callPlanId={callPlanId} weekStart={currentWeekStart} />}
      />

      <SuggestedAccounts
        callPlanId={callPlanId ?? null}
        onAddAccount={handleAddSuggestedAccount}
        refreshKey={suggestionsRefreshKey}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-0 h-auto p-2">
          <TabsTrigger value="list" className="flex-col gap-1 h-auto py-3">
            <List className="h-5 w-5" />
            <span className="text-xs">List</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-col gap-1 h-auto py-3">
            <CalendarIcon className="h-5 w-5" />
            <span className="text-xs">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="territory" className="flex-col gap-1 h-auto py-3">
            <Map className="h-5 w-5" />
            <span className="text-xs">Territory</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex-col gap-1 h-auto py-3">
            <Repeat className="h-5 w-5" />
            <span className="text-xs">Recurring</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 pt-6">
          {callPlanOverview && <CallPlanStats callPlan={callPlanOverview} />}

          <WeeklyTracker
            weekStart={currentWeekStart}
            callPlanId={callPlanOverview?.id}
            onUpdate={loadCallPlanOverview}
          />

          <WeeklyAccountsView
            accounts={selectedAccounts}
            callPlanId={callPlanId}
            onContactUpdate={handleContactUpdate}
            onRemoveAccount={handleRemoveAccount}
          />

          {callPlanLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                <p className="mt-4 text-gray-600">Loading call plan…</p>
              </div>
            </div>
          ) : (
            <WeeklyCallPlanGrid
              weekStart={currentWeekStart}
              callPlan={callPlanOverview}
              onUpdate={loadCallPlanOverview}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="pt-6">
          <DragDropCalendar
            callPlanId={callPlanId}
            weekStart={currentWeekStart}
            refreshKey={scheduleRefreshKey}
          />
        </TabsContent>

        <TabsContent value="territory" className="pt-6">
          <TerritoryBlocker
            callPlanId={callPlanId}
            availableTerritories={availableTerritories}
            onBlocksChange={handleBlocksChange}
          />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4 pt-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleGenerateRecurring}
              disabled={!callPlanId}
            >
              Generate Upcoming Weeks
            </Button>
          </div>
          <RecurringSchedule
            availableAccounts={availableAccountsForRecurring}
            onScheduleCreated={handleGenerateRecurring}
          />
        </TabsContent>
      </Tabs>

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
