"use client";

import { type Territory } from "../page";
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  PencilIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface TerritoryStatsProps {
  territory: Territory;
  onEdit: () => void;
  onClose: () => void;
}

export default function TerritoryStats({
  territory,
  onEdit,
  onClose,
}: TerritoryStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getActiveRate = () => {
    if (territory.customerCount === 0) return 0;
    return Math.round(
      (territory.activeCustomerCount / territory.customerCount) * 100
    );
  };

  const getAverageOrderValue = () => {
    if (territory.activeCustomerCount === 0) return 0;
    return territory.revenue365Days / territory.activeCustomerCount;
  };

  const getCoveragePercentage = () => {
    // This would be calculated based on actual visit data
    // For now, return a sample calculation
    return Math.min(
      Math.round((territory.activeCustomerCount / territory.customerCount) * 100),
      100
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
        style={{ backgroundColor: `${territory.color}15` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: territory.color }}
          />
          <h3 className="font-semibold text-gray-900">{territory.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-600 hover:text-gray-900 rounded hover:bg-white transition-colors"
            title="Edit territory"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-white transition-colors"
            title="Close"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Sales Rep */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserGroupIcon className="w-4 h-4" />
            <span>Sales Rep</span>
          </div>
          <div className="text-sm font-medium text-gray-900">
            {territory.salesRepName || "Unassigned"}
          </div>
        </div>

        {/* Customer Counts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Customers</span>
            <span className="font-semibold text-gray-900">
              {territory.customerCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Active Customers</span>
            <span className="font-semibold text-green-700">
              {territory.activeCustomerCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Active Rate</span>
            <span className="font-semibold text-blue-700">{getActiveRate()}%</span>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <CurrencyDollarIcon className="w-4 h-4" />
            <span>Revenue</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last 30 Days</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(territory.revenue30Days)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last 90 Days</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(territory.revenue90Days)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last 365 Days</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(territory.revenue365Days)}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <ChartBarIcon className="w-4 h-4" />
            <span>Performance</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Avg Order Value</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(getAverageOrderValue())}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Coverage</span>
              <span className="font-semibold text-gray-900">
                {getCoveragePercentage()}%
              </span>
            </div>
          </div>
        </div>

        {/* Last Activity */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-4 h-4" />
              <span>Last Activity</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatDate(territory.lastActivityDate)}
            </span>
          </div>
        </div>

        {/* View Details Button */}
        <div className="pt-3 border-t border-gray-100">
          <button
            onClick={onEdit}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
}
