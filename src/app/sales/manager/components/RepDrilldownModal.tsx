"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

type RepDrilldownData = {
  rep: {
    id: string;
    name: string;
    email: string;
    territoryName: string;
  };
  customers: {
    id: string;
    name: string;
    riskStatus: string;
    lastOrderDate: string | null;
    totalRevenue: number;
    orderCount: number;
  }[];
  orders: {
    id: string;
    customerName: string;
    deliveredAt: string;
    total: number;
    status: string;
  }[];
  activities: {
    id: string;
    type: string;
    customerName: string;
    occurredAt: string;
    notes: string;
  }[];
  topCustomers: {
    name: string;
    revenue: number;
  }[];
  atRiskCustomers: {
    id: string;
    name: string;
    riskStatus: string;
    daysSinceOrder: number;
  }[];
  stats: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    allTime: number;
    avgOrderValue: number;
  };
};

type Props = {
  repId: string | null;
  open: boolean;
  onClose: () => void;
};

export default function RepDrilldownModal({ repId, open, onClose }: Props) {
  const [data, setData] = useState<RepDrilldownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (repId && open) {
      loadRepData();
    }
  }, [repId, open]);

  const loadRepData = async () => {
    if (!repId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/manager/rep/${repId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error loading rep data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "bg-green-100 text-green-800";
      case "AT_RISK_CADENCE":
      case "AT_RISK_REVENUE":
        return "bg-yellow-100 text-yellow-800";
      case "DORMANT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-8 sm:!max-w-4xl md:!max-w-5xl lg:!max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {data ? `${data.rep.name} - Performance Details` : "Loading..."}
          </DialogTitle>
          {data && (
            <p className="text-sm text-gray-600">
              {data.rep.email} • {data.rep.territoryName}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : data ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="at-risk">At Risk</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatCurrency(data.stats.thisWeek)}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatCurrency(data.stats.thisMonth)}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-sm text-gray-600">This Year</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatCurrency(data.stats.thisYear)}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-sm text-gray-600">All-Time</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatCurrency(data.stats.allTime)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4">
                <h3 className="font-semibold mb-3">Top Customers by Revenue</h3>
                <div className="space-y-2">
                  {data.topCustomers.map((customer, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm font-medium">{customer.name}</span>
                      <span className="text-sm text-gray-600">
                        {formatCurrency(customer.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4">
                <h3 className="font-semibold mb-2">Activity Breakdown</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(data.stats.avgOrderValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-xl font-bold">{formatNumber(data.customers.length)}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="space-y-3">
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Customer
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Revenue
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Orders
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Last Order
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <Link
                              href={`/sales/customers/${customer.id}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {customer.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2">
                            <Badge className={getRiskBadgeColor(customer.riskStatus)}>
                              {customer.riskStatus.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {formatCurrency(customer.totalRevenue)}
                          </td>
                          <td className="px-4 py-2 text-right">{formatNumber(customer.orderCount)}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {customer.lastOrderDate
                              ? new Date(customer.lastOrderDate).toLocaleDateString()
                              : "Never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-3">
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Customer
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Date
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Amount
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{order.customerName}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {new Date(order.deliveredAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              className={
                                order.status === "DELIVERED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {order.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activities" className="space-y-3">
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="divide-y">
                    {data.activities.map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                {activity.type}
                              </Badge>
                              <span className="font-medium">{activity.customerName}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{activity.notes}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.occurredAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="at-risk" className="space-y-3">
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Customer
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Risk Status
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Days Since Order
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.atRiskCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{customer.name}</td>
                          <td className="px-4 py-2">
                            <Badge className={getRiskBadgeColor(customer.riskStatus)}>
                              {customer.riskStatus.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-red-600 font-semibold">
                              {formatNumber(customer.daysSinceOrder)}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <Link
                              href={`/sales/customers/${customer.id}`}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-12 text-center text-gray-500">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
