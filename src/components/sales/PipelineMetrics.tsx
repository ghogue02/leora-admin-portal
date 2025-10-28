'use client';

import { PipelineMetrics, FunnelStage } from '@/lib/models/Lead';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format';

interface PipelineMetricsProps {
  metrics: PipelineMetrics;
}

export default function PipelineMetrics({ metrics }: PipelineMetricsProps) {
  const weightedConfidence =
    metrics.totalValue > 0 ? (metrics.weightedValue / metrics.totalValue) * 100 : 0;

  const stageLabels: Record<FunnelStage, string> = {
    [FunnelStage.LEAD]: 'Lead',
    [FunnelStage.QUALIFIED]: 'Qualified',
    [FunnelStage.PROPOSAL]: 'Proposal',
    [FunnelStage.NEGOTIATION]: 'Negotiation',
    [FunnelStage.CLOSED_WON]: 'Closed Won',
    [FunnelStage.CLOSED_LOST]: 'Closed Lost',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Leads</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatNumber(metrics.totalLeads)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Pipeline Value</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(metrics.totalValue)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Weighted Forecast</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(metrics.weightedValue)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatPercentage(weightedConfidence)} confidence
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Avg. Days to Close</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatNumber(metrics.averageDaysToClose)}
          </div>
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-2">Lead → Qualified</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics.conversionRates.leadToQualified}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatPercentage(metrics.conversionRates.leadToQualified)}
              </span>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">Qualified → Proposal</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${metrics.conversionRates.qualifiedToProposal}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatPercentage(metrics.conversionRates.qualifiedToProposal)}
              </span>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">Proposal → Won</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${metrics.conversionRates.proposalToClosedWon}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatPercentage(metrics.conversionRates.proposalToClosedWon)}
              </span>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">Overall Win Rate</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{ width: `${metrics.conversionRates.overallWinRate}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatPercentage(metrics.conversionRates.overallWinRate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Average Time in Stage */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Time in Each Stage</h3>
        <div className="space-y-4">
          {Object.entries(metrics.averageTimeInStage).map(([stage, days]) => (
            <div key={stage} className="flex items-center gap-4">
              <div className="w-32 text-sm text-gray-700">{stageLabels[stage as FunnelStage]}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${Math.min((days / 30) * 100, 100)}%` }}
                />
              </div>
              <div className="w-20 text-right text-sm font-medium text-gray-900">
                {formatNumber(days)} days
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Funnel Visualization</h3>
        <div className="space-y-2">
          {[
            { stage: 'Lead', rate: 100, color: 'bg-gray-600' },
            { stage: 'Qualified', rate: metrics.conversionRates.leadToQualified, color: 'bg-blue-600' },
            { stage: 'Proposal', rate: metrics.conversionRates.qualifiedToProposal, color: 'bg-purple-600' },
            { stage: 'Won', rate: metrics.conversionRates.proposalToClosedWon, color: 'bg-green-600' },
          ].map(({ stage, rate, color }) => (
            <div key={stage} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-700">{stage}</div>
              <div className="flex-1">
                <div
                  className={`${color} h-8 rounded transition-all duration-500`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <div className="w-16 text-right text-sm font-medium text-gray-900">
                {formatPercentage(rate)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
