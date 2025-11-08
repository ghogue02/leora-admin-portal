"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Calendar as CalendarIcon, Map as MapIcon, Repeat } from "lucide-react";
import { toast } from "sonner";

import CallPlanHeader from "./carla/components/CallPlanHeader";
import WeeklyAccountsView from "./carla/components/WeeklyAccountsView";
import DragDropCalendar from "./carla/components/DragDropCalendar";
import TerritoryBlocker from "./carla/components/TerritoryBlocker";
import SuggestedAccounts from "./carla/components/SuggestedAccounts";
import CalendarSync from "./carla/components/CalendarSync";
import RecurringSchedule from "./carla/components/RecurringSchedule";

import WeeklyCallPlanGrid from "./sections/WeeklyCallPlanGrid";
import CallPlanStats from "./sections/CallPlanStats";
import WeeklyTracker from "./components/WeeklyTracker";
import SampleFollowUpPanel from "./sections/SampleFollowUpPanel";

import { Button } from "@/components/ui/button";
import type { CarlaSelectedAccount } from "./carla/types";
import type { EnrichedCallPlanTask } from "@/lib/call-plan/enrich-tasks.server";
import type { SampleFollowUpItem } from "@/app/sales/customers/[customerId]/sections/SampleFollowUpList";

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

type CallPlanOverview = {
  id?: string;
  name?: string;
  weekStart: string;
  weekEnd: string;
  tasks: EnrichedCallPlanTask[];
  sampleFollowUps: SampleFollowUpItem[];
};

function CallPlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>("list");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<CarlaSelectedAccount[]>([]);
  const [callPlanId, setCallPlanId] = useState<string | undefined>();
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState<number>(0);
  const [suggestionsRefreshKey, setSuggestionsRefreshKey] = useState<number>(0);

  const [callPlanOverview, setCallPlanOverview] = useState<CallPlanOverview | null>(null);
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

  const plannedAccounts = useMemo(() => {
    if (!callPlanOverview?.tasks) {
      return [];
    }

    const map = new Map<string, CarlaSelectedAccount>();
    callPlanOverview.tasks.forEach((task) => {
      if (!task.customerId || !task.customer) {
        return;
      }
      if (map.has(task.customerId)) {
        return;
      }

      map.set(task.customerId, {
        id: task.customerId,
        name: task.customer.name ?? "Customer",
        city: task.customer.city ?? undefined,
        state: task.customer.state ?? undefined,
        objective: task.planObjective ?? task.planNotes ?? undefined,
        customer: {
          id: task.customerId,
          customerName: task.customer.name ?? "Customer",
          accountNumber: null,
        },
      });
    });

    return Array.from(map.values());
  }, [callPlanOverview?.tasks]);

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
        let accountsWithStatus: CarlaSelectedAccount[] = Array.isArray(data.accounts)
          ? data.accounts
          : [];
        if (!accountsWithStatus.length) {
          try {
            const fallback = await apiFetch(`/api/sales/call-plan/carla/accounts?weekStart=${weekStart}`);
            if (fallback.ok) {
              const fallbackData = await fallback.json();
              accountsWithStatus = Array.isArray(fallbackData.accounts)
                ? fallbackData.accounts
                : [];
            }
          } catch (fallbackError) {
            console.error("Error loading fallback account list:", fallbackError);
          }
        }
        setSelectedAccounts(accountsWithStatus);
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
        const overview: CallPlanOverview = {
          id: data.id ?? undefined,
          name: data.name ?? undefined,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          sampleFollowUps: Array.isArray(data.sampleFollowUps) ? data.sampleFollowUps : [],
        };
        setCallPlanOverview(overview);
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
  }, [loadAccounts, loadSelectedAccounts]);

  useEffect(() => {
    loadCallPlanOverview();
  }, [loadCallPlanOverview]);

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

  const handleSampleFollowUpLogged = useCallback(() => {
    void loadCallPlanOverview();
  }, [loadCallPlanOverview]);

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
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onThisWeek={handleThisWeek}
        onCreatePlan={() => toast.success("Plan saved automatically")}
        onExportPDF={handleExportPDF}
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
            <MapIcon className="h-5 w-5" />
            <span className="text-xs">Territory</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex-col gap-1 h-auto py-3">
            <Repeat className="h-5 w-5" />
            <span className="text-xs">Recurring</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 pt-6">
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
              onRefresh={loadCallPlanOverview}
            />
          )}

          <WeeklyAccountsView accounts={selectedAccounts} callPlanId={callPlanId} />

          {callPlanOverview && <CallPlanStats callPlan={callPlanOverview} />}

          <WeeklyTracker
            weekStart={currentWeekStart}
            callPlanId={callPlanOverview?.id}
            onUpdate={loadCallPlanOverview}
          />

          {callPlanOverview && (
            <SampleFollowUpPanel
              followUps={callPlanOverview.sampleFollowUps ?? []}
              onLogged={handleSampleFollowUpLogged}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="pt-6">
          <DragDropCalendar
            callPlanId={callPlanId}
            weekStart={currentWeekStart}
            refreshKey={scheduleRefreshKey}
            weeklyAccounts={plannedAccounts}
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

    </main>
  );
}

export default function CallPlanPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading call plan...</div>}>
      <CallPlanPageContent />
    </Suspense>
  );
}
