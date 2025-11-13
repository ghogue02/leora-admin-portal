"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";

interface JobStats {
  overview: {
    total: number;
    pending: number;
    processing: number;
    completedToday: number;
    failedLast24h: number;
    avgProcessingTime: number;
    avgAttempts: number;
  };
}

const colorClasses: Record<string, string> = {
  blue: "border-blue-500",
  green: "border-green-500",
  yellow: "border-amber-500",
  red: "border-red-500",
  purple: "border-purple-500",
};

export default function JobStatsCards() {
  const [stats, setStats] = useState<JobStats["overview"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/jobs/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data.overview);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <ResponsiveCard key={i} className="animate-pulse space-y-3">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-8 w-1/3 rounded bg-slate-100" />
          </ResponsiveCard>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: "Total Jobs Today",
      description: "Completed in the last 24h",
      value: stats.completedToday,
      icon: "📊",
      color: "blue",
    },
    {
      title: "Pending Queue",
      description: "Waiting for workers",
      value: stats.pending,
      icon: "⏳",
      color: stats.pending > 10 ? "yellow" : "green",
    },
    {
      title: "Failed (24h)",
      description: "Needs attention",
      value: stats.failedLast24h,
      icon: "❌",
      color: stats.failedLast24h > 0 ? "red" : "green",
    },
    {
      title: "Avg Processing Time",
      description: "Seconds per job",
      value: `${stats.avgProcessingTime}s`,
      icon: "⚡",
      color: "purple",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <ResponsiveCard key={card.title} className={`border-l-4 ${colorClasses[card.color] ?? ""}`}>
          <ResponsiveCardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <ResponsiveCardTitle className="text-base">{card.title}</ResponsiveCardTitle>
              <ResponsiveCardDescription>{card.description}</ResponsiveCardDescription>
            </div>
            <div className="text-3xl" aria-hidden>
              {card.icon}
            </div>
          </ResponsiveCardHeader>
          <p className="text-3xl font-bold text-gray-900">{card.value}</p>
        </ResponsiveCard>
      ))}
    </div>
  );
}
