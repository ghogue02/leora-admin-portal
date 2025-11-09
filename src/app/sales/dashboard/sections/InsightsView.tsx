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
} from "@/types/sales-dashboard";

type InsightsViewProps = {
  salesRep: {
    name: string;
    territory: string | null;
  };
  accountPulse: AccountPulse;
  customerSignals: CustomerSignals;
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
        />
      )}

      {isSectionEnabled("customer-signals") && (
        <CustomerSignalsPanel signals={customerSignals} />
      )}

      {isSectionEnabled("portfolio-health") && (
        <PortfolioHealthScore portfolio={portfolioHealth} />
      )}

      {isSectionEnabled("target-pipeline") && (
        <TargetPipelinePanel metrics={targetPipeline} />
      )}

      {isSectionEnabled("cold-leads") && <ColdLeadsPanel coldLeads={coldLeads} />}
    </>
  );
}
