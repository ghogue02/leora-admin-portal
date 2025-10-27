"use client";

import { useEffect, useState } from "react";
import {
  Users,
  ShoppingCart,
  DollarSign,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Package,
} from "lucide-react";
import Link from "next/link";

interface DashboardMetrics {
  totalCustomers: number;
  totalOrders: number;
  weeklyRevenue: number;
  mtdRevenue: number;
  activeUsers: number;
  pendingOrders: number;
}

interface DataIntegrityAlert {
  type: string;
  count: number;
  message: string;
  href: string;
}

interface RecentActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  description: string;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<DataIntegrityAlert[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/admin/dashboard", {
          headers: {
            "X-Tenant-Slug": process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted",
          },
        });

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          // Redirect to sales login for admin access
          window.location.href = "/sales/auth/login?redirect=/admin";
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setMetrics(data.metrics);
        setAlerts(data.alerts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    fetchRecentActivities();
  }, []);

  async function fetchRecentActivities() {
    try {
      const response = await fetch("/api/admin/audit-logs/recent", {
        headers: {
          "X-Tenant-Slug": process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recent activities");
      }

      const data = await response.json();
      setRecentActivities(data.activities || []);
    } catch (err) {
      console.error("Error fetching recent activities:", err);
      // Don't set error state, just log it - activities are non-critical
    } finally {
      setActivitiesLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
          <p className="mt-4 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of key metrics and system health
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Total Customers"
          value={metrics?.totalCustomers || 0}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Total Orders"
          value={metrics?.totalOrders || 0}
          icon={ShoppingCart}
          color="green"
        />
        <MetricCard
          title="MTD Revenue"
          value={`$${(metrics?.mtdRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers || 0}
          icon={UserCheck}
          color="purple"
        />
        <MetricCard
          title="Pending Orders"
          value={metrics?.pendingOrders || 0}
          icon={Package}
          color="orange"
        />
      </div>

      {/* Data Integrity Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900">Data Integrity Alerts</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <Link
                key={index}
                href={alert.href}
                className="flex items-center justify-between rounded-md border border-amber-300 bg-white p-3 transition hover:border-amber-400 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                    {alert.count}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{alert.message}</span>
                </div>
                <span className="text-sm text-amber-600">View →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Manage Customers"
            description="View, edit, and manage customer accounts"
            href="/admin/customers"
          />
          <QuickActionCard
            title="Sales Territories"
            description="Manage sales reps and territory assignments"
            href="/admin/sales-reps"
          />
          <QuickActionCard
            title="View Orders"
            description="Review and manage all orders and invoices"
            href="/admin/orders"
          />
          <QuickActionCard
            title="User Accounts"
            description="Manage user accounts and permissions"
            href="/admin/accounts"
          />
          <QuickActionCard
            title="Inventory"
            description="Track products and inventory levels"
            href="/admin/inventory"
          />
          <QuickActionCard
            title="Audit Logs"
            description="Review system activity and changes"
            href="/admin/audit-logs"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link
            href="/admin/audit-logs"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all →
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white">
          {activitiesLoading ? (
            <div className="p-6 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
              <p className="mt-2 text-sm text-gray-500">Loading activities...</p>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {activity.action === 'CREATE' ? '➕' :
                     activity.action === 'UPDATE' ? '✏️' :
                     activity.action === 'DELETE' ? '🗑️' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span>{activity.user.name}</span>
                      <span>•</span>
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                      {activity.entityType && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{activity.entityType.toLowerCase()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "emerald" | "purple" | "orange";
}

function MetricCard({ title, value, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
}

function QuickActionCard({ title, description, href }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </Link>
  );
}
