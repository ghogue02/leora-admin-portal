'use client';

import { useCallback, useEffect, useState } from "react";
import PerformanceMetrics from "./sections/PerformanceMetrics";
import CustomerHealthSummary from "./sections/CustomerHealthSummary";
import CustomersDueList from "./sections/CustomersDueList";
import WeeklyRevenueChart from "./sections/WeeklyRevenueChart";
import UpcomingEvents from "./sections/UpcomingEvents";
import TasksList from "./sections/TasksList";
import ProductGoals from "./sections/ProductGoals";
import UpcomingCalendar from "./sections/UpcomingCalendar";
import AssignedTasks from "./sections/AssignedTasks";
import Incentives from "./sections/Incentives";
import TopProducts from "./sections/TopProducts";
import CustomerBalances from "./sections/CustomerBalances";
import SampleActivitySummary from "./sections/SampleActivitySummary";
import type { SampleActivityRecord, SampleInsightsSummary } from "@/types/activities";
// import NewCustomersMetric from "./sections/NewCustomersMetric";
import ProductGoalsEnhanced from "./sections/ProductGoalsEnhanced";
import DashboardCustomizer from "./sections/DashboardCustomizer";
import { MetricGlossaryModal } from "./sections/MetricDefinitions";
import { SkeletonDashboard } from "../_components/SkeletonLoader";
import { Button } from "../_components/Button";
import { DashboardTile } from "@/components/dashboard/DashboardTile";
import { DrilldownModal } from "@/components/dashboard/DrilldownModal";
import type { DashboardDrilldownType } from "@/types/drilldown";
import { HelpCircle } from "lucide-react";

type DashboardData = {
  salesRep: {
    id: string;
    name: string;
    email: string;
    territory: string;
    deliveryDay: string | null;
    weeklyQuota: number;
    monthlyQuota: number;
    quarterlyQuota: number;
    annualQuota: number;
  };
  metrics: {
    currentWeek: {
      revenue: number;
      uniqueCustomers: number;
      quotaProgress: number;
    };
    lastWeek: {
      revenue: number;
    };
    currentMonth: {
      revenue: number;
      uniqueCustomers: number;
      quotaProgress: number;
    };
    lastMonth: {
      revenue: number;
    };
    mtd?: {
      revenue: number;
      uniqueCustomers: number;
    };
    ytd: {
      revenue: number;
      uniqueCustomers: number;
    };
    allTime: {
      revenue: number;
      uniqueCustomers: number;
    };
    comparison: {
      revenueChange: number;
      revenueChangePercent: string;
    };
    weeklyMetrics?: {
      inPersonVisits: number;
      tastingAppointments: number;
      emailContacts: number;
      phoneContacts: number;
      textContacts: number;
      newCustomersAdded: number;
      reactivatedCustomers: number;
    } | null;
  };
  customerHealth: {
    healthy: number;
    atRiskCadence: number;
    atRiskRevenue: number;
    dormant: number;
    closed: number;
    prospect: number;
    prospectCold: number;
    total: number;
    totalProspects: number;
  };
  activities: {
    recent: Array<{
      id: string;
      type: string;
      typeCode: string;
      subject: string;
      notes: string | null;
      occurredAt: string;
      customer: {
        id: string;
        name: string;
      } | null;
      outcome: string | null;
      outcomes: string[];
      samples: SampleActivityRecord[];
    }>;
    summary: Record<string, number>;
  };
  upcomingEvents: Array<{
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    eventType: string | null;
    location: string | null;
    customer: {
      id: string;
      name: string;
    } | null;
  }>;
  customersDue: Array<{
    id: string;
    name: string;
    lastOrderDate: string | null;
    nextExpectedOrderDate: string | null;
    averageOrderIntervalDays: number | null;
    riskStatus: string;
    daysOverdue: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    status: string;
    customer: {
      id: string;
      name: string;
    } | null;
  }>;
  sampleInsights: SampleInsightsSummary;
};

type DashboardState = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
};

export default function SalesDashboardPage() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
  });
  const [activeDrilldown, setActiveDrilldown] = useState<DashboardDrilldownType | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const [dashboardPrefs, setDashboardPrefs] = useState<any>(null);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/sales/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        // Redirect to login if session expired
        if (response.status === 401) {
          window.location.href = "/sales/login";
          return;
        }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load dashboard.");
      }

      const payload = (await response.json()) as DashboardData;
      setState({ data: payload, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load dashboard.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.loading) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
        <SkeletonDashboard />
      </main>
    );
  }

  if (state.error || !state.data) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
        <section className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-medium">We couldn't load your dashboard just now.</p>
          <p className="mt-1">{state.error ?? "Try again shortly or contact support."}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void load();
            }}
            className="mt-4 border-red-200 text-red-700 hover:border-red-300 hover:text-red-800"
          >
            Retry
          </Button>
        </section>
      </main>
    );
  }

  const {
    salesRep,
    metrics,
    customerHealth,
    upcomingEvents,
    customersDue,
    tasks,
    sampleInsights,
  } = state.data;

  const isSectionEnabled = (sectionId: string) => {
    if (!dashboardPrefs?.sections) return true; // Show all by default
    const section = dashboardPrefs.sections.find((s: any) => s.id === sectionId);
    return section?.enabled !== false;
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-3">
          <button
            onClick={() => setShowGlossary(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <HelpCircle className="h-4 w-4" />
            Metric Glossary
          </button>
          {/* <DashboardCustomizer onPreferencesChange={setDashboardPrefs} /> */}
        </div>
      </div>

      {isSectionEnabled('performance-metrics') && (
        <PerformanceMetrics
          salesRep={salesRep}
          metrics={metrics}
          onDrilldown={setActiveDrilldown}
        />
      )}

      {isSectionEnabled('customer-health') && (
        <CustomerHealthSummary
          customerHealth={customerHealth}
          onDrilldown={setActiveDrilldown}
        />
      )}

      {isSectionEnabled('tasks') && (
        <TasksList tasks={tasks} />
      )}

      {isSectionEnabled('customers-due') && (
        <CustomersDueList
          customers={customersDue}
          onDrilldown={setActiveDrilldown}
        />
      )}

      {isSectionEnabled('sample-activities') && (
        <SampleActivitySummary insights={sampleInsights} />
      )}

      {/* Top Products Section */}
      {isSectionEnabled('top-products') && <TopProducts />}

      {/* Product Performance Goals - Enhanced */}
      {isSectionEnabled('product-goals') && <ProductGoalsEnhanced />}

      {/* 7-10 Day Upcoming Calendar - TEMPORARILY DISABLED */}
      {/* <UpcomingCalendar /> */}

      {isSectionEnabled('upcoming-events') && <UpcomingEvents events={upcomingEvents} />}

      {/* Customer Balances Widget - surfaced near the end */}
      {isSectionEnabled('customer-balances') && (
        <CustomerBalances onDrilldown={setActiveDrilldown} />
      )}

      {/* Drilldown Modal */}
      {activeDrilldown && (
        <DrilldownModal
          type={activeDrilldown}
          onClose={() => setActiveDrilldown(null)}
          apiEndpoint="/api/sales/insights/drilldown"
        />
      )}

      {/* Metric Glossary Modal */}
      {showGlossary && <MetricGlossaryModal onClose={() => setShowGlossary(false)} />}
    </main>
  );
}
