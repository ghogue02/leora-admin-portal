'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { CUSTOMER_TAG_META } from '@/constants/customerTags';

type TimeFrame = '30d' | '90d' | 'ytd' | 'all' | 'custom';

type BreakdownEntry = {
  id: string;
  name: string;
  revenue: number;
  orderCount: number;
};

type TagRevenueData = {
  tagType: string;
  totalRevenue: number;
  customerCount: number;
  orderCount: number;
  averageOrderValue: number;
  breakdowns?: BreakdownEntry[];
};

type TagRevenueReportProps = {
  data: TagRevenueData[];
  timeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  isLoading?: boolean;
  onExportCSV?: () => void;
};

const TIMEFRAME_LABELS: Record<TimeFrame, string> = {
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  ytd: 'Year to Date',
  all: 'All Time',
  custom: 'Custom Range',
};

export default function TagRevenueReport({
  data,
  timeframe = '90d',
  onTimeframeChange,
  isLoading = false,
  onExportCSV,
}: TagRevenueReportProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (tagType: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(tagType)) {
      newExpanded.delete(tagType);
    } else {
      newExpanded.add(tagType);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="ml-3 text-slate-600">Loading report data...</span>
        </div>
      </div>
    );
  }

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
      aria-label="Revenue by Customer Tag"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Revenue by Customer Tag
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Track sales performance across different customer segments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger className="w-[180px]" aria-label="Select timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIMEFRAME_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onExportCSV && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              aria-label="Export to CSV"
            >
              <DownloadIcon className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="h-5 w-5 text-green-600" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-700">
            Total Revenue:
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(totalRevenue)}
          </span>
          <span className="text-sm text-slate-500">
            ({TIMEFRAME_LABELS[timeframe]})
          </span>
        </div>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-slate-600">
            No revenue data available for the selected timeframe
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try selecting a different time period or adding customer tags
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Tag</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Avg Order Value</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const tagKey = item.tagType || 'Untagged';
                const isExpanded = expandedRows.has(tagKey);
                const revenuePercent =
                  totalRevenue > 0
                    ? ((item.totalRevenue / totalRevenue) * 100).toFixed(1)
                    : '0';
                const tagMeta = CUSTOMER_TAG_META[tagKey as keyof typeof CUSTOMER_TAG_META];

                return (
                  <>
                    <TableRow
                      key={tagKey}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => toggleRow(tagKey)}
                    >
                      <TableCell>
                        <button
                          type="button"
                          className="rounded p-1 transition-colors hover:bg-slate-200"
                          aria-label={
                            isExpanded
                              ? 'Collapse top customers'
                              : 'Expand top customers'
                          }
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={tagMeta?.pillClass || 'bg-slate-100 text-slate-800'}
                          variant="outline"
                        >
                          {tagMeta?.label || tagKey}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.customerCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.orderCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.averageOrderValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                          {revenuePercent}%
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row: Tag breakdown */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-slate-50 p-0">
                          <div className="px-12 py-4">
                            <h4 className="mb-3 text-sm font-semibold text-slate-700">
                              Top contributors
                            </h4>
                            <div className="space-y-2">
                              {!item.breakdowns || item.breakdowns.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                  No segment breakdown data available
                                </p>
                              ) : (
                                item.breakdowns.map((entry, index) => (
                                  <div
                                    key={entry.id}
                                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2 text-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                        {index + 1}
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {entry.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-6 text-slate-600">
                                      <span>
                                        {entry.orderCount} record
                                        {entry.orderCount !== 1 ? 's' : ''}
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {formatCurrency(entry.revenue)}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
