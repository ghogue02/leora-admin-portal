'use client';

import { useEffect, useState } from 'react';
import { DrilldownModal } from '@/components/dashboard/DrilldownModal';
import type { LegacyDrilldownType } from '@/types/drilldown';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format';

type Insights = {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    topCustomerRevenue: number;
    topCustomerName: string;
  };
  topCustomers: Array<{
    customerId: string;
    name: string;
    state: string | null;
    revenue: number;
    orderCount: number;
  }>;
  orderStatuses: Array<{
    status: string;
    count: number;
  }>;
  customerRisk: Array<{
    status: string;
    count: number;
  }>;
  topProducts: Array<{
    skuId: string;
    name: string;
    brand: string | null;
    units: number;
    orderCount: number;
  }>;
  recentActivity: Array<{
    type: string;
    count: number;
  }>;
  samples: {
    totalGiven: number;
    events: number;
    converted: number;
    conversionRate: number;
  };
  invoices: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  carts: Array<{
    status: string;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    orders: number;
    revenue: number;
  }>;
};

type AutoInsightsProps = {
  onInsightClick?: (question: string) => void;
};

export function AutoInsights({ onInsightClick }: AutoInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [drilldownType, setDrilldownType] = useState<LegacyDrilldownType | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sales/insights');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.details || `HTTP ${response.status}`;
        throw new Error(`Failed to load insights: ${errorMsg}`);
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load insights';
      console.error('AutoInsights error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-gray-600">Loading insights from your database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-600">⚠️ {error}</p>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const handleQuestionClick = (question: string) => {
    if (onInsightClick) {
      onInsightClick(question);
      // Scroll to chat input after a brief delay to show the action
      setTimeout(() => {
        const chatInput = document.getElementById('copilot-input');
        if (chatInput) {
          chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  };

  // Find highest risk issues
  const atRiskCustomers = insights.customerRisk.find((r) => r.status === 'AT_RISK_CADENCE')?.count ?? 0;
  const dormantCustomers = insights.customerRisk.find((r) => r.status === 'DORMANT')?.count ?? 0;
  const healthyCustomers = insights.customerRisk.find((r) => r.status === 'HEALTHY')?.count ?? 0;

  // Get latest month trend
  const latestMonth = insights.monthlyTrend[0];
  const previousMonth = insights.monthlyTrend[1];
  const latestRevenue = latestMonth?.revenue ?? 0;
  const previousRevenue = previousMonth?.revenue ?? 0;
  const monthlyChange = previousRevenue !== 0
    ? ((latestRevenue - previousRevenue) / previousRevenue) * 100
    : 0;
  const monthlyChangeLabel = formatPercentage(monthlyChange);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📊 Auto-Insights</h2>
            <p className="mt-1 text-xs text-gray-600">
              Fresh data insights loaded automatically
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-md bg-white/60 p-3 backdrop-blur-sm">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatCurrency(insights.summary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-md bg-white/60 p-3 backdrop-blur-sm">
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatNumber(insights.summary.totalOrders)}
            </p>
          </div>
          <div className="rounded-md bg-white/60 p-3 backdrop-blur-sm">
            <p className="text-xs text-gray-500">Top Customer</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {insights.summary.topCustomerName}
            </p>
            <p className="text-xs text-gray-500">
              {formatCurrency(insights.summary.topCustomerRevenue)}
            </p>
          </div>
          <div className="rounded-md bg-white/60 p-3 backdrop-blur-sm">
            <p className="text-xs text-gray-500">Healthy Customers</p>
            <p className="mt-1 text-lg font-bold text-green-600">
              {formatNumber(healthyCustomers)}
            </p>
          </div>
        </div>

        {/* Quick Action Prompts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {atRiskCustomers > 0 && (
            <button
              onClick={() =>
                handleQuestionClick(
                  `Tell me about the ${formatNumber(atRiskCustomers)} at-risk customers`
                )
              }
              className="group rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100 hover:shadow-md"
              title="Click to ask LeorAI about at-risk customers"
            >
              <span className="flex items-center gap-1.5">
                ⚠️ {formatNumber(atRiskCustomers)} at risk
                <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">→ Ask AI</span>
              </span>
            </button>
          )}
          {dormantCustomers > 0 && (
            <button
              onClick={() =>
                handleQuestionClick(
                  `Show me the ${formatNumber(
                    dormantCustomers
                  )} dormant customers and how to reactivate them`
                )
              }
              className="group rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 hover:shadow-md"
              title="Click to ask LeorAI about dormant customers"
            >
              <span className="flex items-center gap-1.5">
                💤 {formatNumber(dormantCustomers)} dormant
                <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">→ Ask AI</span>
              </span>
            </button>
          )}
          {monthlyChange > 0 && (
            <button
              onClick={() =>
                handleQuestionClick(
                  `Revenue is up ${monthlyChangeLabel} this month - what's driving the growth?`
                )
              }
              className="group rounded-full border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 hover:shadow-md"
              title="Click to ask LeorAI about revenue growth"
            >
              <span className="flex items-center gap-1.5">
                📈 Up {monthlyChangeLabel}
                <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">→ Ask AI</span>
              </span>
            </button>
          )}
          <button
            onClick={() =>
              handleQuestionClick('Which customers should I prioritize calling this week?')
            }
            className="group rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 hover:shadow-md"
            title="Click to ask LeorAI who to call"
          >
            <span className="flex items-center gap-1.5">
              📞 Who to call?
              <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">→ Ask AI</span>
            </span>
          </button>
        </div>
      </div>

      {/* Detailed Insights - Collapsible */}
      {expanded && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Customers */}
          <div
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
            onClick={() => setDrilldownType('top-customers')}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Top 5 Customers by Revenue
              </h3>
              <span className="text-xs text-indigo-600">Click for details →</span>
            </div>
            <div className="space-y-2">
              {insights.topCustomers.slice(0, 5).map((customer, idx) => (
                <div
                  key={customer.customerId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-900">{customer.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(customer.revenue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(customer.orderCount)} orders
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleQuestionClick('Tell me more about my top customers')}
              className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800"
            >
              Ask LeorAI about these customers →
            </button>
          </div>

          {/* Top Products */}
          <div
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
            onClick={() => setDrilldownType('top-products')}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Top 5 Products</h3>
              <span className="text-xs text-indigo-600">Click for details →</span>
            </div>
            <div className="space-y-2">
              {insights.topProducts.slice(0, 5).map((product, idx) => (
                <div key={product.skuId} className="flex items-start justify-between text-sm">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.brand && (
                        <div className="text-xs text-gray-500">{product.brand}</div>
                      )}
                    </div>
                  </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatNumber(product.units)} units
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatNumber(product.orderCount)} orders
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <button
              onClick={() => handleQuestionClick('What products should I focus on selling?')}
              className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800"
            >
              Ask LeorAI about product strategy →
            </button>
          </div>

          {/* Monthly Trend */}
          <div
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
            onClick={() => setDrilldownType('monthly-trend')}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Monthly Trend (Last 6 Months)
              </h3>
              <span className="text-xs text-indigo-600">Click for details →</span>
            </div>
            <div className="space-y-2">
              {insights.monthlyTrend.slice(0, 6).map((month) => (
                <div key={month.month} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{month.month}</span>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(month.revenue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(month.orders)} orders
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                handleQuestionClick('Analyze my monthly sales trends and forecast next month')
              }
              className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800"
            >
              Ask LeorAI to forecast trends →
            </button>
          </div>

          {/* Sample Performance */}
          <div
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
            onClick={() => setDrilldownType('samples')}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Sample Performance</h3>
              <span className="text-xs text-indigo-600">Click for details →</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Samples Given</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(insights.samples.totalGiven)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sample Events</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(insights.samples.events)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Converted to Orders</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(insights.samples.converted)}
                </span>
              </div>
              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Conversion Rate</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {formatPercentage(insights.samples.conversionRate)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                handleQuestionClick('How can I improve my sample conversion rate?')
              }
              className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800"
            >
              Ask LeorAI for sample strategy →
            </button>
          </div>
        </div>
      )}

      {/* Drilldown Modal */}
      {drilldownType && (
        <DrilldownModal
          type={drilldownType}
          onClose={() => setDrilldownType(null)}
        />
      )}
    </div>
  );
}
