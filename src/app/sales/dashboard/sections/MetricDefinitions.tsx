'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

type MetricDefinition = {
  title: string;
  description: string;
  details: string[];
  example?: string;
};

const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  'weekly-quota': {
    title: 'Weekly Quota Progress',
    description: 'Your progress toward the weekly revenue target set by management',
    details: [
      'Calculated as: (Current Week Revenue / Weekly Quota) × 100',
      'Updates in real-time as orders are delivered',
      'Green: 100%+ (goal met), Amber: 75-99% (close), Red: <75% (needs attention)',
    ],
    example: 'If your quota is $10,000 and you\'ve sold $8,500, you\'re at 85% progress',
  },
  'this-week-revenue': {
    title: 'This Month Revenue',
    description: 'Total revenue from orders delivered this week',
    details: [
      'Only includes delivered orders (not pending or draft)',
      'Calculated from Monday through Sunday of current week',
      'Shows percentage change vs last week',
    ],
    example: 'Orders delivered Monday-Sunday count toward this metric',
  },
  'mtd-revenue': {
    title: 'Month-to-Date Revenue',
    description: 'Total revenue from the 1st of the current month to today',
    details: [
      'Resets every month on the 1st',
      'Includes all delivered orders in current calendar month',
      'Shows unique customer count for the month',
      'Helps verify monthly revenue calculations',
    ],
    example: 'In October 2025, shows all revenue from Oct 1 - Oct 27',
  },
  'ytd-revenue': {
    title: 'Year-to-Date Revenue',
    description: 'Total revenue from January 1st to today',
    details: [
      'Resets every January 1st',
      'Includes all delivered orders in current calendar year',
      'Shows unique customer count for the year',
    ],
  },
  'unique-customers': {
    title: 'Unique Customers',
    description: 'Number of different customers who placed orders this week',
    details: [
      'Each customer counts only once, regardless of order count',
      'Helps track customer engagement and retention',
      'Higher numbers indicate good territory coverage',
    ],
  },
  'healthy-customers': {
    title: 'Healthy Customers',
    description: 'Customers ordering on their regular schedule',
    details: [
      'Based on historical ordering cadence',
      'Last order was within expected timeframe',
      'No significant revenue decline',
    ],
    example: 'Customer typically orders every 14 days, last order was 10 days ago',
  },
  'at-risk-cadence': {
    title: 'At Risk (Cadence)',
    description: 'Customers overdue based on their ordering pattern',
    details: [
      'Haven\'t ordered within their typical interval',
      'System calculates average days between orders',
      'Overdue by 20%+ of their normal cadence',
    ],
    example: 'Customer orders every 30 days, hasn\'t ordered in 40+ days',
  },
  'at-risk-revenue': {
    title: 'At Risk (Revenue)',
    description: 'Customers with declining order values',
    details: [
      'Recent order total is 15%+ lower than historical average',
      'May indicate switching to competitor or reducing consumption',
      'Requires intervention to prevent further decline',
    ],
  },
  'dormant-customers': {
    title: 'Dormant Customers',
    description: 'Customers with no orders in 45+ days',
    details: [
      'No activity for extended period (45-65 days)',
      'High risk of permanent loss',
      'Priority for reactivation outreach',
    ],
  },
  'contacted-recently': {
    title: 'Contacted Recently',
    description: 'Customers with any activity in the last 7 days',
    details: [
      'Includes visits, calls, emails, texts, or tastings',
      'Shows your engagement level',
      'Regular contact improves retention',
    ],
  },
  'new-customers': {
    title: 'New Customers',
    description: 'First-time buyers in your territory',
    details: [
      'Based on firstOrderDate field',
      'Shows "New This Month" and "New This Month"',
      'Celebrate wins and ensure good onboarding',
    ],
  },
  'past-due': {
    title: 'Past Due Balances',
    description: 'Outstanding invoice amounts by aging period',
    details: [
      'Buckets: 0-30, 31-60, 61-90, 90+ days overdue',
      'Calculated from invoice due dates',
      'Red alert badge if any 90+ days outstanding',
    ],
  },
};

export function MetricTooltip({ metricKey }: { metricKey: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const definition = METRIC_DEFINITIONS[metricKey];

  if (!definition) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:bg-gray-100"
        aria-label="Help"
      >
        <HelpCircle className="h-3 w-3" />
      </button>

      {showTooltip && (
        <div className="absolute left-0 top-6 z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <h4 className="font-semibold text-gray-900">{definition.title}</h4>
          <p className="mt-1 text-sm text-gray-600">{definition.description}</p>

          {definition.details.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-gray-500">
              {definition.details.map((detail, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}

          {definition.example && (
            <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
              <strong>Example:</strong> {definition.example}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MetricGlossaryModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-gray-900">Metric Glossary</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {Object.entries(METRIC_DEFINITIONS).map(([key, definition]) => (
            <div key={key} className="border-b border-gray-100 pb-6 last:border-0">
              <h3 className="text-lg font-semibold text-gray-900">{definition.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{definition.description}</p>

              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                {definition.details.map((detail, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>

              {definition.example && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  <strong>Example:</strong> {definition.example}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
