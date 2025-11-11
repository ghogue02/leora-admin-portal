import AccountPulseSection from "./AccountPulse";
import CustomerSignalsPanel from "./CustomerSignalsPanel";
import PortfolioHealthScore from "./PortfolioHealthScore";
import TargetPipelinePanel from "./TargetPipelinePanel";
import ColdLeadsPanel from "./ColdLeadsPanel";
import type {
  AccountPulse,
  CustomerSignals,
  CustomerCoverage,
  PortfolioHealth,
  TargetPipelineMetrics,
  ColdLeadsOverview,
  CustomerReportRow,
} from "@/types/sales-dashboard";

type InsightsViewProps = {
  salesRep: {
    name: string;
    territory: string | null;
  };
  accountPulse: AccountPulse;
  customerSignals: CustomerSignals;
  customerReportRows: CustomerReportRow[];
  customerCoverage: CustomerCoverage;
  portfolioHealth: PortfolioHealth;
  targetPipeline: TargetPipelineMetrics;
  coldLeads: ColdLeadsOverview;
  isSectionEnabled: (sectionId: string) => boolean;
};

export default function InsightsView({
  salesRep,
  accountPulse,
  customerSignals,
  customerReportRows,
  customerCoverage,
  portfolioHealth,
  targetPipeline,
  coldLeads,
  isSectionEnabled,
}: InsightsViewProps) {
  return (
    <>
      {isSectionEnabled("account-pulse") && (
        <AccountPulseSection
          salesRep={salesRep}
          accountPulse={accountPulse}
          coverage={customerCoverage}
          portfolio={portfolioHealth}
          customers={customerReportRows}
        />
      )}

      {isSectionEnabled("customer-signals") && (
        <CustomerSignalsPanel signals={customerSignals} reportRows={customerReportRows} />
      )}

      {isSectionEnabled("portfolio-health") && (
        <PortfolioHealthScore portfolio={portfolioHealth} />
      )}

      {isSectionEnabled("target-pipeline") && (
        <TargetPipelinePanel metrics={targetPipeline} />
      )}

      {isSectionEnabled("cold-leads") && (
        <ColdLeadsPanel coldLeads={coldLeads} customers={customerReportRows} />
      )}
    </>
  );
}
