"use client";

import { useCallback, useEffect, useState } from "react";

type Incentive = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetMetric: string;
  currentProgress: number;
  daysRemaining: number;
  status: "active" | "ending_soon" | "almost_there";
  rank?: number;
  totalParticipants?: number;
};

type IncentivesState = {
  incentives: Incentive[];
  loading: boolean;
  error: string | null;
};

export default function Incentives() {
  const [state, setState] = useState<IncentivesState>({
    incentives: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/sales/incentives/active", {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sales/login";
          return;
        }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load incentives.");
      }

      const payload = (await response.json()) as { incentives: Incentive[] };
      setState({ incentives: payload.incentives, loading: false, error: null });
    } catch (error) {
      setState({
        incentives: [],
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load incentives.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.loading) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="mt-4 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-slate-200" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="rounded-lg border border-red-100 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-700">{state.error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300"
        >
          Retry
        </button>
      </section>
    );
  }

  if (state.incentives.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Active Incentives</h2>
        <p className="mt-2 text-sm text-gray-600">
          No active sales incentives or competitions at this time.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Active Incentives</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {state.incentives.map((incentive) => (
          <IncentiveCard key={incentive.id} incentive={incentive} />
        ))}
      </div>
    </section>
  );
}

function IncentiveCard({ incentive }: { incentive: Incentive }) {
  const formatMetric = (value: number, metric: string) => {
    switch (metric) {
      case "revenue":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value);
      case "cases":
        return `${value} cases`;
      case "new_customers":
        return `${value} customers`;
      default:
        return value.toString();
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "revenue":
        return "Revenue";
      case "cases":
        return "Cases Sold";
      case "new_customers":
        return "New Customers";
      default:
        return "Progress";
    }
  };

  const formatRankLabel = (rank: number) => `Rank ${rank}`;

  // Determine border color based on status
  const getBorderStyle = () => {
    if (incentive.status === "ending_soon") {
      return "border-l-4 border-l-yellow-500";
    }
    return "border-l-4 border-l-blue-500";
  };

  const getStatusBadge = () => {
    if (incentive.status === "ending_soon") {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 animate-pulse">
          Ending Soon!
        </span>
      );
    }
    return null;
  };

  const formatTimeRemaining = (days: number) => {
    if (days === 0) {
      return "Ends today";
    } else if (days === 1) {
      return "1 day remaining";
    } else {
      return `${days} days remaining`;
    }
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 ${getBorderStyle()}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{incentive.name}</h3>
            {getStatusBadge()}
          </div>
          <p className="mt-1 text-sm text-gray-600">{incentive.description}</p>
        </div>

        {incentive.rank !== undefined && incentive.totalParticipants !== undefined && (
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {formatRankLabel(incentive.rank)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              of {incentive.totalParticipants} reps
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-700">
            {getMetricLabel(incentive.targetMetric)}
          </span>
          <span className="text-lg font-bold text-gray-900">
            {formatMetric(incentive.currentProgress, incentive.targetMetric)}
          </span>
        </div>

        {/* Progress bar - showing current progress without goal value since it's not in the schema */}
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
            style={{ width: "100%" }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span
            className={`font-medium ${
              incentive.status === "ending_soon" ? "text-yellow-700" : "text-gray-600"
            }`}
          >
            {formatTimeRemaining(incentive.daysRemaining)}
          </span>
          <span className="text-gray-500">
            Ends {new Date(incentive.endDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      {incentive.rank !== undefined && incentive.rank <= 3 && (
        <div className="mt-3 rounded-md bg-green-50 px-3 py-2">
          <p className="text-xs font-medium text-green-800">
            Great work! You're in the top 3!
          </p>
        </div>
      )}
    </div>
  );
}
