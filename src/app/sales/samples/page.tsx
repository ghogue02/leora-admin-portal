"use client";

import { useState, useEffect } from "react";
import SampleBudgetTracker from "./sections/SampleBudgetTracker";
import SampleUsageLog from "./sections/SampleUsageLog";
import LogSampleUsageModal from "./sections/LogSampleUsageModal";

export default function SalesSamplesPage() {
  const [budget, setBudget] = useState<any>(null);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = async () => {
    setLoading(true);
    try {
      const [budgetRes, historyRes] = await Promise.all([
        fetch("/api/sales/samples/budget"),
        fetch("/api/sales/samples/history?limit=50"),
      ]);

      if (budgetRes.ok) {
        const data = await budgetRes.json();
        setBudget(data);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setUsageHistory(data.samples || []);
      }
    } catch (error) {
      console.error("Error loading sample data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              Samples
            </p>
            <h1 className="text-3xl font-semibold text-gray-900">Sample Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track sample distribution, customer feedback, and conversion rates
            </p>
          </div>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Log Sample Usage
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading sample data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Budget Tracker */}
          {budget && <SampleBudgetTracker budget={budget} />}

          {/* Usage Log */}
          <SampleUsageLog samples={usageHistory} onUpdate={loadSampleData} />

          {/* Sample Management Tips */}
          <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
            <h3 className="text-sm font-semibold text-gray-900">Sample Management Best Practices</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-600">•</span>
                <span>
                  <strong>Log immediately:</strong> Record sample tastings as soon as they happen
                  to capture fresh customer feedback
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-600">•</span>
                <span>
                  <strong>Track follow-ups:</strong> Mark samples that need follow-up and revisit
                  within 1-2 weeks
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-600">•</span>
                <span>
                  <strong>Monitor conversion:</strong> Update when a sample leads to an order to
                  track ROI
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-600">•</span>
                <span>
                  <strong>Stay within budget:</strong> Your monthly allowance is designed to
                  support strategic customer development
                </span>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Log Sample Modal */}
      {isLogModalOpen && (
        <LogSampleUsageModal
          onClose={() => setIsLogModalOpen(false)}
          onSuccess={() => {
            setIsLogModalOpen(false);
            loadSampleData();
          }}
        />
      )}
    </main>
  );
}
