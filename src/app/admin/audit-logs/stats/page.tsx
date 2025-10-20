'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, Activity, AlertTriangle } from 'lucide-react';

interface Stats {
  totalLogsCount: number;
  todayActivityCount: number;
  mostActiveUser: {
    userId: string;
    name: string;
    email: string;
    count: number;
  } | null;
  mostModifiedEntityType: {
    entityType: string;
    count: number;
  } | null;
  activityByDay: Array<{
    date: string;
    count: number;
  }>;
  actionsBreakdown: Array<{
    action: string;
    count: number;
  }>;
  entityTypesBreakdown: Array<{
    entityType: string;
    count: number;
  }>;
  topActiveUsers: Array<{
    userId: string;
    name: string;
    email: string;
    count: number;
  }>;
  recentCriticalChanges: Array<{
    id: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    } | null;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
  }>;
}

const ACTION_COLORS = {
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  STATUS_CHANGE: 'bg-orange-500',
  REASSIGN: 'bg-purple-500',
};

export default function AuditLogsStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/audit-logs/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Failed to load statistics'}
        </div>
      </div>
    );
  }

  // Calculate max for chart scaling
  const maxActivityCount = Math.max(...stats.activityByDay.map((d) => d.count), 1);
  const maxEntityTypeCount = Math.max(
    ...stats.entityTypesBreakdown.map((e) => e.count),
    1
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/audit-logs"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Audit Logs
        </Link>
        <h1 className="text-3xl font-bold">Audit Log Statistics</h1>
        <p className="text-gray-600 mt-1">Analytics and insights from audit trail</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Total Logs</div>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold">{stats.totalLogsCount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Today&apos;s Activity</div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">
            {stats.todayActivityCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Events today</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">Most Active User</div>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          {stats.mostActiveUser ? (
            <>
              <div className="text-lg font-bold truncate">
                {stats.mostActiveUser.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.mostActiveUser.count} actions
              </div>
            </>
          ) : (
            <div className="text-gray-400 italic">No data</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm font-medium">
              Most Modified Entity
            </div>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          {stats.mostModifiedEntityType ? (
            <>
              <div className="text-lg font-bold">
                {stats.mostModifiedEntityType.entityType}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.mostModifiedEntityType.count} changes
              </div>
            </>
          ) : (
            <div className="text-gray-400 italic">No data</div>
          )}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Activity by Day */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Activity by Day (Last 30 Days)</h2>
          {stats.activityByDay.length > 0 ? (
            <div className="h-64">
              <div className="flex items-end justify-between h-full gap-1">
                {stats.activityByDay.map((item, index) => (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center justify-end group"
                  >
                    <div
                      className="w-full bg-blue-500 hover:bg-blue-600 transition-colors rounded-t relative"
                      style={{
                        height: `${(item.count / maxActivityCount) * 100}%`,
                        minHeight: item.count > 0 ? '4px' : '0',
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.count} events
                      </div>
                    </div>
                    {index % 5 === 0 && (
                      <div className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No activity data
            </div>
          )}
        </div>

        {/* Actions Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Actions Breakdown</h2>
          {stats.actionsBreakdown.length > 0 ? (
            <div className="space-y-3">
              {stats.actionsBreakdown.map((item) => {
                const total = stats.actionsBreakdown.reduce(
                  (sum, a) => sum + a.count,
                  0
                );
                const percentage = ((item.count / total) * 100).toFixed(1);

                return (
                  <div key={item.action}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">{item.action}</span>
                      <span className="text-sm text-gray-600">
                        {item.count.toLocaleString()} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          ACTION_COLORS[item.action as keyof typeof ACTION_COLORS] ||
                          'bg-gray-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">No actions data</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Entity Types Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Entity Types Breakdown</h2>
          {stats.entityTypesBreakdown.length > 0 ? (
            <div className="space-y-2">
              {stats.entityTypesBreakdown
                .sort((a, b) => b.count - a.count)
                .map((item) => (
                  <div key={item.entityType} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-medium truncate">
                      {item.entityType}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-indigo-500 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{
                            width: `${(item.count / maxEntityTypeCount) * 100}%`,
                            minWidth: '40px',
                          }}
                        >
                          <span className="text-white text-xs font-medium">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              No entity types data
            </div>
          )}
        </div>

        {/* Top 10 Active Users */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Top 10 Most Active Users</h2>
          {stats.topActiveUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.topActiveUsers.map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {user.count} actions
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">No user data</div>
          )}
        </div>
      </div>

      {/* Recent Critical Changes */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Recent Critical Changes (DELETE Actions)
        </h2>
        {stats.recentCriticalChanges.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Date/Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Entity Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Entity ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCriticalChanges.map((change) => (
                  <tr key={change.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(change.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {change.user ? (
                        <div>
                          <div className="text-sm font-medium">{change.user.name}</div>
                          <div className="text-xs text-gray-500">
                            {change.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{change.entityType}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {change.entityId.substring(0, 8)}...
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            No recent critical changes
          </div>
        )}
      </div>
    </div>
  );
}
