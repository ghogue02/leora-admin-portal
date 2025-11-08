"use client";

import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks } from "date-fns";
import { useMediaQuery } from "@/hooks/use-media-query";
import CallPlanHeader from "./components/CallPlanHeader";
import AccountSelectionModal from "./components/AccountSelectionModal";
import WeeklyAccountsView from "./components/WeeklyAccountsView";
import MobileOptimizedView from "./components/MobileOptimizedView";
import WeeklyPlanningEnhancements from "./components/WeeklyPlanningEnhancements";
import AdvancedFilters, {
  AdvancedFilterState,
  SavedFilter,
} from "./components/AdvancedFilters";
import PDFExportButton from "./components/PDFExportButton";
import CalendarSync from "./components/CalendarSync";
import TerritoryBlockingModal from "./components/TerritoryBlockingModal";
import ActivityEntryModal, { ActivityData } from "./components/ActivityEntryModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, List, Grid } from "lucide-react";
import { toast } from "sonner";
import type { CarlaSelectedAccount } from "./types";

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
  lastContactDate?: string;
  annualRevenue?: number;
  productCategory?: string;
  priorityTier?: "A" | "B" | "C";
  selected?: boolean;
}

export default function CarlaCallPlanPageEnhanced() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState<CarlaSelectedAccount[]>([]);
  const [callPlanId, setCallPlanId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Activity modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityCustomer, setActivityCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Territory blocking
  const [territoryModalOpen, setTerritoryModalOpen] = useState(false);

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>({
    lastContactDate: "all",
    revenue: "all",
    productCategory: "all",
    priorityTier: "all",
  });

  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  useEffect(() => {
    loadAccounts();
    loadSelectedAccounts();
    loadSavedFilters();
  }, [currentWeekStart]);

  useEffect(() => {
    applyFilters();
  }, [accounts, advancedFilters]);

  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

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
        const accounts: CarlaSelectedAccount[] = Array.isArray(data.accounts) ? data.accounts : [];
        setSelectedAccounts(accounts);
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

  const loadSavedFilters = async () => {
    try {
      const response = await fetch("/api/sales/call-plan/carla/filters");
      if (response.ok) {
        const data = await response.json();
        setSavedFilters(data.filters || []);
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...accounts];

    // Last contact date filter
    if (advancedFilters.lastContactDate !== "all") {
      const now = new Date();
      filtered = filtered.filter((account) => {
        if (!account.lastContactDate) return false;
        const lastContact = new Date(account.lastContactDate);
        const daysDiff = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

        switch (advancedFilters.lastContactDate) {
          case "week":
            return daysDiff < 7;
          case "1-2weeks":
            return daysDiff >= 7 && daysDiff < 14;
          case "2-4weeks":
            return daysDiff >= 14 && daysDiff < 30;
          case "30plus":
            return daysDiff >= 30;
          default:
            return true;
        }
      });
    }

    // Revenue filter
    if (advancedFilters.revenue !== "all") {
      filtered = filtered.filter((account) => {
        const revenue = account.annualRevenue || 0;
        switch (advancedFilters.revenue) {
          case "high":
            return revenue > 50000;
          case "medium":
            return revenue >= 20000 && revenue <= 50000;
          case "low":
            return revenue < 20000;
          default:
            return true;
        }
      });
    }

    // Product category filter
    if (advancedFilters.productCategory !== "all") {
      filtered = filtered.filter((account) => {
        switch (advancedFilters.productCategory) {
          case "wine":
            return account.productCategory === "wine";
          case "spirits":
            return account.productCategory === "spirits";
          case "both":
            return account.productCategory === "both";
          default:
            return true;
        }
      });
    }

    // Priority tier filter
    if (advancedFilters.priorityTier !== "all") {
      filtered = filtered.filter(
        (account) => account.priorityTier === advancedFilters.priorityTier
      );
    }

    setFilteredAccounts(filtered);
  };

  const handleSaveFilter = async (name: string, filters: AdvancedFilterState) => {
    try {
      const response = await fetch("/api/sales/call-plan/carla/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filterConfig: filters }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedFilters([...savedFilters, data.filter]);
        toast.success("Filter saved");
      }
    } catch (error) {
      toast.error("Failed to save filter");
    }
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setAdvancedFilters(filter.filters);
    toast.success(`Loaded filter: ${filter.name}`);
  };

  const handleDeleteFilter = async (filterId: string) => {
    try {
      const response = await fetch(`/api/sales/call-plan/carla/filters/${filterId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedFilters(savedFilters.filter((f) => f.id !== filterId));
        toast.success("Filter deleted");
      }
    } catch (error) {
      toast.error("Failed to delete filter");
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

        // Open activity modal if contacted
        if (outcome === "YES") {
          const account = selectedAccounts.find((a) => a.customer.id === customerId);
          if (account) {
            setActivityCustomer({
              id: customerId,
              name: account.customer.customerName,
            });
            setActivityModalOpen(true);
          }
        }

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

  const handleSaveActivity = async (activityData: ActivityData) => {
    try {
      const response = await fetch("/api/sales/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });

      if (response.ok) {
        toast.success("Activity logged");
      } else {
        throw new Error("Failed to save activity");
      }
    } catch (error) {
      console.error("Error saving activity:", error);
      throw error;
    }
  };

  const handleUpdateAccount = async (
    accountId: string,
    updates: { objectives?: string; notes?: string }
  ) => {
    try {
      const response = await fetch(`/api/sales/call-plan/carla/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadSelectedAccounts();
      } else {
        throw new Error("Failed to update account");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleMarkAllContacted = async () => {
    if (!callPlanId) return;

    try {
      const response = await fetch("/api/sales/call-plan/carla/accounts/mark-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callPlanId }),
      });

      if (response.ok) {
        toast.success("All accounts marked as contacted");
        await loadSelectedAccounts();
      }
    } catch (error) {
      toast.error("Failed to mark all as contacted");
    }
  };

  const handleTerritoryFilter = (location: string, radius: number, timeBlock?: string) => {
    toast.info("Territory filtering applied");
    // TODO: Implement territory filtering logic
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      {/* Header with PDF and Calendar */}
      <div className="flex flex-col gap-4">
        <CallPlanHeader
          weekStart={currentWeekStart}
          weekEnd={weekEnd}
          isCurrentWeek={
            startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() ===
            currentWeekStart.getTime()
          }
          selectedCount={selectedAccountIds.size}
          onPreviousWeek={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          onNextWeek={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          onThisWeek={() =>
            setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
          }
          onCreatePlan={() => toast.success("Plan saved automatically")}
          onExportPDF={() => {}}
          onSelectAccounts={() => setIsModalOpen(true)}
        />

        {/* Action Bar */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <PDFExportButton
              callPlanId={callPlanId}
              weekStart={currentWeekStart}
              accountCount={selectedAccounts.length}
            />
            <CalendarSync callPlanId={callPlanId} weekStart={currentWeekStart} />
            <Button
              variant="outline"
              onClick={() => setTerritoryModalOpen(true)}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              Territory Blocking
            </Button>
          </div>

          {!isMobile && (
            <div className="flex gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="gap-2"
              >
                <Grid className="h-4 w-4" />
                Grid
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={advancedFilters}
        onFilterChange={setAdvancedFilters}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onLoadFilter={handleLoadFilter}
        onDeleteFilter={handleDeleteFilter}
      />

      {/* Main Content */}
      {isMobile || isTablet ? (
        <MobileOptimizedView accounts={selectedAccounts} onContactUpdate={handleContactUpdate} />
      ) : (
        <Tabs defaultValue="planning" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planning">Weekly Planning</TabsTrigger>
            <TabsTrigger value="tracking">Contact Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="mt-6">
            <WeeklyPlanningEnhancements
              accounts={selectedAccounts}
              onUpdateAccount={handleUpdateAccount}
              onMarkAllContacted={handleMarkAllContacted}
            />
          </TabsContent>

          <TabsContent value="tracking" className="mt-6">
            <WeeklyAccountsView accounts={selectedAccounts} />
          </TabsContent>
        </Tabs>
      )}

      {/* Modals */}
      <AccountSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accounts={filteredAccounts}
        selectedAccountIds={selectedAccountIds}
        onSave={async (accountIds) => {
          // Handle save
          setIsModalOpen(false);
        }}
      />

      <TerritoryBlockingModal
        isOpen={territoryModalOpen}
        onClose={() => setTerritoryModalOpen(false)}
        onApplyFilter={handleTerritoryFilter}
      />

      {activityCustomer && (
        <ActivityEntryModal
          isOpen={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setActivityCustomer(null);
          }}
          customerId={activityCustomer.id}
          customerName={activityCustomer.name}
          onSave={handleSaveActivity}
        />
      )}
    </main>
  );
}
