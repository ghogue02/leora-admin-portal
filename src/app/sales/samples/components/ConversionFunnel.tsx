'use client';

import { ChevronRight } from 'lucide-react';

type FunnelStage = {
  label: string;
  count: number;
  percentage: number;
};

type ConversionFunnelProps = {
  stages: {
    samplesGiven: number;
    tastings: number;
    orders: number;
  };
  showDetails?: boolean;
};

export default function ConversionFunnel({ stages, showDetails = true }: ConversionFunnelProps) {
  const total = stages.samplesGiven;

  const funnelStages: FunnelStage[] = [
    {
      label: 'Samples Given',
      count: stages.samplesGiven,
      percentage: 100,
    },
    {
      label: 'Customer Tastings',
      count: stages.tastings,
      percentage: total > 0 ? (stages.tastings / total) * 100 : 0,
    },
    {
      label: 'Resulting Orders',
      count: stages.orders,
      percentage: total > 0 ? (stages.orders / total) * 100 : 0,
    },
  ];

  const conversionRate = total > 0 ? ((stages.orders / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conversion Funnel</h3>
          <p className="text-xs text-gray-500">Sample journey from distribution to order</p>
        </div>
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5">
          <p className="text-xs font-semibold text-green-700">
            {conversionRate}% Overall Conversion
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {funnelStages.map((stage, index) => {
          const isFirst = index === 0;
          const isLast = index === funnelStages.length - 1;
          const width = `${Math.max(stage.percentage, 15)}%`; // Minimum 15% width for visibility

          return (
            <div key={stage.label} className="relative">
              {/* Stage Bar */}
              <div
                className={`relative overflow-hidden rounded-lg transition-all ${
                  isFirst
                    ? 'bg-blue-100 border-blue-300'
                    : isLast
                      ? 'bg-green-100 border-green-300'
                      : 'bg-purple-100 border-purple-300'
                } border-2`}
                style={{ width }}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        isFirst
                          ? 'text-blue-900'
                          : isLast
                            ? 'text-green-900'
                            : 'text-purple-900'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${
                        isFirst
                          ? 'text-blue-900'
                          : isLast
                            ? 'text-green-900'
                            : 'text-purple-900'
                      }`}
                    >
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Percentage overlay */}
                {!isFirst && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span
                      className={`text-xs font-semibold ${
                        isLast ? 'text-green-700' : 'text-purple-700'
                      }`}
                    >
                      {stage.percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex items-center justify-center py-1">
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-xs text-gray-500">Tasting Rate</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {total > 0 ? ((stages.tastings / total) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {stages.tastings} of {total} samples tasted
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Close Rate (from Tastings)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stages.tastings > 0
                ? ((stages.orders / stages.tastings) * 100).toFixed(1)
                : '0.0'}
              %
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {stages.orders} of {stages.tastings} tastings converted
            </p>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-3">
        <p className="text-xs text-gray-700">
          <strong>💡 Insight:</strong>{' '}
          {stages.tastings / total < 0.7
            ? 'Focus on getting more samples tasted - many are not reaching customers.'
            : stages.orders / stages.tastings < 0.25
              ? 'Tastings are good, but conversion is low. Follow up more aggressively after tastings.'
              : 'Strong performance! Your samples are getting tasted and converting well.'}
        </p>
      </div>
    </div>
  );
}
