"use client";

import { useState, useEffect } from "react";
import { Brain, TrendingUp, AlertCircle, ShoppingBag } from "lucide-react";

type Insight = {
  type: "pattern" | "recommendation" | "prediction" | "risk";
  title: string;
  description: string;
  confidence: number;
};

type CustomerInsightsProps = {
  customerId: string;
};

export default function CustomerInsights({ customerId }: CustomerInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInsights() {
      try {
        const response = await fetch(`/api/sales/customers/${customerId}/insights`);
        if (!response.ok) throw new Error("Failed to load insights");
        const data = await response.json();
        setInsights(data.insights || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    void loadInsights();
  }, [customerId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-blue-600" />
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200"></div>
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <p className="text-sm text-yellow-700">
          Insights temporarily unavailable. Please try again later.
        </p>
      </div>
    );
  }

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "pattern":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "recommendation":
        return <ShoppingBag className="h-4 w-4 text-green-600" />;
      case "prediction":
        return <Brain className="h-4 w-4 text-purple-600" />;
      case "risk":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
  };

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "pattern":
        return "border-blue-200 bg-blue-50";
      case "recommendation":
        return "border-green-200 bg-green-50";
      case "prediction":
        return "border-purple-200 bg-purple-50";
      case "risk":
        return "border-orange-200 bg-orange-50";
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h2>
            <p className="text-sm text-gray-600">
              Intelligent analysis of ordering patterns and recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Insights List */}
      <div className="divide-y divide-slate-200">
        {insights.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Brain className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              No insights available yet. More data needed for analysis.
            </p>
          </div>
        ) : (
          insights.map((insight, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{insight.title}</h3>
                  <p className="mt-1 text-sm text-gray-700">{insight.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-blue-600"
                        style={{ width: `${insight.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
