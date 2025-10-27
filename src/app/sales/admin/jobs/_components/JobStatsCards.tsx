"use client";

import { useEffect, useState } from "react";

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

export default function JobStatsCards() {
  const [stats, setStats] = useState<JobStats['overview'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/jobs/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data.overview);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: "Total Jobs Today",
      value: stats.completedToday,
      icon: "📊",
      color: "blue"
    },
    {
      title: "Pending Queue",
      value: stats.pending,
      icon: "⏳",
      color: stats.pending > 10 ? "yellow" : "green"
    },
    {
      title: "Failed (24h)",
      value: stats.failedLast24h,
      icon: "❌",
      color: stats.failedLast24h > 0 ? "red" : "green"
    },
    {
      title: "Avg Processing Time",
      value: `${stats.avgProcessingTime}s`,
      icon: "⚡",
      color: "purple"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow p-6 border-l-4 transition-all hover:shadow-md"
          style={{
            borderLeftColor:
              card.color === "blue" ? "#3B82F6" :
              card.color === "green" ? "#10B981" :
              card.color === "yellow" ? "#F59E0B" :
              card.color === "red" ? "#EF4444" :
              "#8B5CF6"
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
            </div>
            <div className="text-4xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
