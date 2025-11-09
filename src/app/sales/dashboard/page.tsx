'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { SampleActivityRecord, SampleInsightsSummary } from "@/types/activities";
import DashboardCustomizer, {
  DEFAULT_SECTIONS,
  type DashboardPreferences,
} from "./sections/DashboardCustomizer";
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
import { formatDistanceToNow } from "date-fns";

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
  const [dashboardPrefs, setDashboardPrefs] = useState<DashboardPreferences>({
    sections: DEFAULT_SECTIONS,
  });
  const [activeTab, setActiveTab] = useState<"insights" | "classic">("insights");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const localPrefsKey = "sales.dashboard.preferences";

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
      setLastUpdated(new Date());
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load dashboard.",
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPrefs = window.localStorage.getItem(localPrefsKey);
    if (storedPrefs) {
      try {
        const parsed = JSON.parse(storedPrefs) as DashboardPreferences;
        if (parsed.sections?.length) {
          setDashboardPrefs(parsed);
        }
      } catch {
        // ignore malformed storage
      }
    }

    void (async () => {
      try {
        const response = await fetch("/api/sales/dashboard/preferences", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const prefs = (await response.json()) as DashboardPreferences;
        if (prefs.sections && prefs.sections.length > 0) {
          setDashboardPrefs(prefs);
          window.localStorage.setItem(localPrefsKey, JSON.stringify(prefs));
        }
      } catch {
        // ignore network errors
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreferencesChange = useCallback(
    (prefs: DashboardPreferences) => {
      setDashboardPrefs(prefs);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(localPrefsKey, JSON.stringify(prefs));
      }
    },
    [localPrefsKey]
  );

  const insightDrilldowns = useMemo(
    () =>
      new Set<DashboardDrilldownType>([
        "customer-health",
        "at-risk-cadence",
        "at-risk-revenue",
        "dormant-customers",
        "healthy-customers",
        "prospect-customers",
        "prospect-cold",
      ]),
    []
  );

  const handleDrilldownRequest = useCallback(
    (type: DashboardDrilldownType) => {
      if (insightDrilldowns.has(type)) {
        setActiveTab("insights");
      } else {
        setActiveTab("classic");
      }
      setActiveDrilldown(type);
    },
    [insightDrilldowns]
  );

  const lastUpdatedLabel = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : "waiting for data";

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
    customerReportRows,
    upcomingEvents,
    customersDue,
    tasks,
    sampleInsights,
    managerView,
  } = state.data;

  const isSectionEnabled = (sectionId: string) => {
    const section = dashboardPrefs.sections.find((s) => s.id === sectionId);
    return section?.enabled !== false;
  };

  const handleRepChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void load(event.target.value);
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Sales Dashboard</p>
          <p className="text-sm text-slate-600">Live view of quota, customers, and sales motions.</p>
        </div>
        <DashboardCustomizer sections={dashboardPrefs.sections} onPreferencesChange={handlePreferencesChange} />
      </div>

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
          <span className="text-xs font-medium text-gray-500">Last refreshed {lastUpdatedLabel}</span>
        </div>
      </div>

{managerView.enabled && (
        <ManagerToolbar
          managerView={managerView}
          metrics={metrics}
          onRepChange={handleRepChange}
          lastUpdatedLabel={lastUpdatedLabel}
        />
      )}

      {activeTab === "insights" ? (
        <InsightsView
          salesRep={salesRep}
          accountPulse={accountPulse}
          customerSignals={customerSignals}
          customerReportRows={customerReportRows}
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
          onDrilldown={handleDrilldownRequest}
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

type ManagerToolbarProps = {
  managerView: DashboardData["managerView"];
  metrics: DashboardData["metrics"];
  onRepChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  lastUpdatedLabel: string;
};

function ManagerToolbar({ managerView, metrics, onRepChange, lastUpdatedLabel }: ManagerToolbarProps) {
  const selectedRep = managerView.reps.find((rep) => rep.id === managerView.selectedSalesRepId);
  const weeklyProgress = Math.round(metrics.currentWeek.quotaProgress);
  const monthRevenue = metrics.currentMonth.revenue ?? 0;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Manager mode:</span>
        <select
          value={managerView.selectedSalesRepId}
          onChange={onRepChange}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-slate-400 focus:outline-none"
        >
          {managerView.reps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
              {rep.territory ? ` • ${rep.territory}` : ""}
            </option>
          ))}
        </select>
        {selectedRep?.territory && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
            {selectedRep.territory}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <div className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
          Weekly quota: {weeklyProgress}% of goal
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
          MTD revenue: ${monthRevenue.toLocaleString()}
        </div>
        <span className="text-slate-400">Updated {lastUpdatedLabel}</span>
      </div>
    </section>
  );
}
