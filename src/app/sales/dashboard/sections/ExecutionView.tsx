import PerformanceMetrics from "./PerformanceMetrics";
import TasksList from "./TasksList";
import CustomersDueList from "./CustomersDueList";
import SampleActivitySummary from "./SampleActivitySummary";
import TopProducts from "./TopProducts";
import ProductGoalsEnhanced from "./ProductGoalsEnhanced";
import UpcomingEvents from "./UpcomingEvents";
import CustomerBalances from "./CustomerBalances";
import type { SampleInsightsSummary } from "@/types/activities";
import type { DashboardDrilldownType } from "@/types/drilldown";
import type { UnlovedAccountsSummary } from "@/types/sales-dashboard";
import UnlovedAccounts from "./UnlovedAccounts";

type SalesRep = {
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

type Metrics = {
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

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: string;
  customer: {
    id: string;
    name: string;
  } | null;
};

type CustomerDue = {
  id: string;
  name: string;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  averageOrderIntervalDays: number | null;
  riskStatus: string;
  daysOverdue: number;
};

type UpcomingEvent = {
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
};

type ExecutionViewProps = {
  salesRep: SalesRep;
  metrics: Metrics;
  tasks: Task[];
  customersDue: CustomerDue[];
  sampleInsights: SampleInsightsSummary;
  upcomingEvents: UpcomingEvent[];
  unloved: UnlovedAccountsSummary;
  isSectionEnabled: (sectionId: string) => boolean;
  onDrilldown: (type: DashboardDrilldownType) => void;
};

export default function ExecutionView({
  salesRep,
  metrics,
  tasks,
  customersDue,
  sampleInsights,
  upcomingEvents,
  unloved,
  isSectionEnabled,
  onDrilldown,
}: ExecutionViewProps) {
  return (
    <>
      {isSectionEnabled("performance-metrics") && (
        <PerformanceMetrics salesRep={salesRep} metrics={metrics} onDrilldown={onDrilldown} />
      )}

      {isSectionEnabled("tasks") && <TasksList tasks={tasks} />}

      {isSectionEnabled("customers-due") && (
        <CustomersDueList customers={customersDue} onDrilldown={onDrilldown} />
      )}

      {isSectionEnabled("unloved-accounts") && <UnlovedAccounts data={unloved} />}

      {isSectionEnabled("sample-activities") && <SampleActivitySummary insights={sampleInsights} />}

      {isSectionEnabled("top-products") && <TopProducts />}

      {isSectionEnabled("product-goals") && <ProductGoalsEnhanced />}

      {isSectionEnabled("upcoming-events") && <UpcomingEvents events={upcomingEvents} />}

      {isSectionEnabled("customer-balances") && (
        <CustomerBalances onDrilldown={onDrilldown} />
      )}
    </>
  );
}
