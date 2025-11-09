'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import type { SampleActivityRecord, SampleInsightsSummary } from "@/types/activities";
import DashboardCustomizer from "./sections/DashboardCustomizer";
import { MetricGlossaryModal } from "./sections/MetricDefinitions";
import { SkeletonDashboard } from "../_components/SkeletonLoader";
import { Button } from "../_components/Button";
import { DrilldownModal } from "@/components/dashboard/DrilldownModal";
import type { DashboardDrilldownType } from "@/types/drilldown";
import InsightsView from "./sections/InsightsView";
import ExecutionView from "./sections/ExecutionView";
import type {
  AccountPulse,
  CustomerSignals,
  CustomerCoverage,
  PortfolioHealth,
  TargetPipelineMetrics,
  ColdLeadsOverview,
  CustomerReportRow,
} from "@/types/sales-dashboard";

type DashboardData = {
  salesRep: {
    id: string;
    name: string;
    email: string;
    territory: string | null;
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
  accountPulse: AccountPulse;
  customerSignals: CustomerSignals;
  customerCoverage: CustomerCoverage;
  portfolioHealth: PortfolioHealth;
  targetPipeline: TargetPipelineMetrics;
  coldLeads: ColdLeadsOverview;
  customerReportRows: CustomerReportRow[];
  managerView: {
    enabled: boolean;
    selectedSalesRepId: string;
    reps: Array<{
      id: string;
      name: string;
      territory: string | null;
      email: string | null;
    }>;
  };
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
  const [activeTab, setActiveTab] = useState<"insights" | "classic">("insights");

  const tabs = [
    { id: "insights", label: "Customer Insights" },
    { id: "classic", label: "Sales Execution" },
  ] as const;

  const load = useCallback(async (salesRepId?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const search = salesRepId ? `?salesRepId=${encodeURIComponent(salesRepId)}` : "";
      const response = await fetch(`/api/sales/dashboard${search}`, {
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
    accountPulse,
    customerSignals,
    customerCoverage,
    portfolioHealth,
    targetPipeline,
    coldLeads,
    upcomingEvents,
    customersDue,
    tasks,
    sampleInsights,
    managerView,
  } = state.data;

  const isSectionEnabled = (sectionId: string) => {
    if (!dashboardPrefs?.sections) return true; // Show all by default
    const section = dashboardPrefs.sections.find((s: any) => s.id === sectionId);
    return section?.enabled !== false;
  };

  const handleRepChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void load(event.target.value);
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      {/* Dashboard Header */}
      {/* <DashboardCustomizer onPreferencesChange={setDashboardPrefs} /> */}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-gray-600 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {managerView.enabled && (
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Viewing as</span>
            <select
              value={managerView.selectedSalesRepId}
              onChange={handleRepChange}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-slate-400 focus:outline-none"
            >
              {managerView.reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                  {rep.territory ? ` • ${rep.territory}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === "insights" ? (
        <InsightsView
          salesRep={salesRep}
          accountPulse={accountPulse}
          customerSignals={customerSignals}
          customerCoverage={customerCoverage}
          portfolioHealth={portfolioHealth}
          targetPipeline={targetPipeline}
          coldLeads={coldLeads}
          isSectionEnabled={isSectionEnabled}
        />
      ) : (
        <ExecutionView
          salesRep={salesRep}
          metrics={metrics}
          tasks={tasks}
          customersDue={customersDue}
          sampleInsights={sampleInsights}
          upcomingEvents={upcomingEvents}
          isSectionEnabled={isSectionEnabled}
          onDrilldown={setActiveDrilldown}
        />
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
