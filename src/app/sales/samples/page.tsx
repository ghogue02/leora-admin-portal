"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import SampleBudgetTracker from "./sections/SampleBudgetTracker";
import SampleUsageLog from "./sections/SampleUsageLog";
import LogSampleUsageModal from "./sections/LogSampleUsageModal";
import ConversionFunnel from "./components/ConversionFunnel";
import { BarChart3, FileText, History, Package, Plus } from "lucide-react";

export default function SalesSamplesPage() {
  const [budget, setBudget] = useState<any>(null);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("quick-assign");

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

  // Calculate funnel stats from usage history
  const funnelStats = {
    samplesGiven: usageHistory.length,
    tastings: usageHistory.filter((s) => s.feedback).length,
    orders: usageHistory.filter((s) => s.resultedInOrder).length,
  };

  const recentSamples = usageHistory.filter((sample) => {
    const sampleDate = new Date(sample.tastedAt);
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    return sampleDate >= threeWeeksAgo;
  });

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              Samples
            </p>
            <h1 className="text-3xl font-semibold text-gray-900">Sample Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track sample distribution, customer feedback, and conversion rates
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/sales/sample-lists"
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" />
              Build Tech Sheets
            </Link>
            <Link
              href="/sales/analytics/samples"
              className="flex items-center gap-2 rounded-md border border-purple-600 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
            >
              <BarChart3 className="h-4 w-4" />
              View Analytics
            </Link>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Log Sample
            </button>
          </div>
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
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="quick-assign">
                <Plus className="mr-2 h-4 w-4" />
                Quick Assign
              </TabsTrigger>
              <TabsTrigger value="pulled-samples">
                <Package className="mr-2 h-4 w-4" />
                Pulled Samples
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                Sample History
              </TabsTrigger>
            </TabsList>

            {/* Quick Assign Tab */}
            <TabsContent value="quick-assign" className="space-y-6">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-center">
                <Package className="mx-auto h-12 w-12 text-blue-600" />
                <h2 className="mt-3 text-lg font-semibold text-blue-900">
                  Quick Sample Assignment
                </h2>
                <p className="mt-1 text-sm text-blue-700">
                  Fast-track sample distribution with instant activity logging
                </p>
                <Link
                  href="/sales/samples/quick-assign"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Start Quick Assignment
                </Link>
              </div>

              {/* Budget Tracker */}
              {budget && <SampleBudgetTracker budget={budget} />}

              {/* Conversion Funnel */}
              <ConversionFunnel stages={funnelStats} />
            </TabsContent>

            {/* Pulled Samples Tab */}
            <TabsContent value="pulled-samples" className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Recently Pulled Samples
                    </h2>
                    <p className="text-xs text-gray-500">Samples pulled in the last 3 weeks</p>
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {recentSamples.length} Samples
                  </div>
                </div>

                {recentSamples.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm text-gray-500">
                      No samples pulled in the last 3 weeks
                    </p>
                  </div>
                ) : (
                  <SampleUsageLog samples={recentSamples} onUpdate={loadSampleData} />
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <SampleUsageLog samples={usageHistory} onUpdate={loadSampleData} />
            </TabsContent>
          </Tabs>

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
