'use client';

import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, isSameDay, startOfYear } from 'date-fns';
import TagRevenueReport from '../TagRevenueReport';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportFilters } from '../_context/ReportFiltersContext';

type TagPerformanceResponse = {
  performanceByType: Array<{
    tagType: string | null;
    tags: Array<{
      tagValue: string | null;
      customerCount: number;
      totalRevenue: number;
      avgRevenuePerCustomer: number;
    }>;
    totalCustomers: number;
    totalRevenue: number;
    avgRevenuePerCustomer?: number;
  }>;
};

export function SegmentPerformancePanel() {
  const { queryParams, setPresetRange, updateFilters, filters } = useReportFilters();
  const [data, setData] = useState<TagPerformanceResponse['performanceByType']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramKey = useMemo(() => {
    const base = new URLSearchParams();
    if (queryParams.startDate) base.set('startDate', queryParams.startDate);
    if (queryParams.endDate) base.set('endDate', queryParams.endDate);
    return base.toString();
  }, [queryParams]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (queryParams.startDate) params.set('startDate', queryParams.startDate);
        if (queryParams.endDate) params.set('endDate', queryParams.endDate);
        const qs = params.toString();
        const response = await fetch(
          qs ? `/api/sales/reports/tag-performance?${qs}` : '/api/sales/reports/tag-performance',
          { cache: 'no-store' },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Unable to load tag performance');
        }
        const payload = (await response.json()) as TagPerformanceResponse;
        setData(payload.performanceByType ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load tag performance');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [paramKey, queryParams]);

  const timeframe = useMemo(() => deriveTimeframe(filters.startDate, filters.endDate), [filters]);

  const rows = data.map((type) => ({
    tagType: type.tagType ?? 'Untagged',
    totalRevenue: type.totalRevenue,
    customerCount: type.totalCustomers,
    orderCount: type.tags.reduce((sum, tag) => sum + Number(tag.customerCount), 0),
    averageOrderValue: type.avgRevenuePerCustomer ?? 0,
    breakdowns: type.tags.map((tag) => ({
      id: `${type.tagType ?? 'untagged'}-${tag.tagValue ?? 'na'}`,
      name: tag.tagValue ?? 'Untagged',
      revenue: tag.totalRevenue,
      orderCount: tag.customerCount,
    })),
  }));

  const handleTimeframeChange = (value: string) => {
    if (value === 'all') {
      updateFilters({ startDate: null, endDate: null });
      return;
    }
    if (value === 'ytd') {
      setPresetRange('ytd');
      return;
    }
    if (value === '30d' || value === '90d') {
      setPresetRange(value);
      return;
    }
  };

  if (loading) {
    return <Skeleton className="h-[420px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <TagRevenueReport
      data={rows}
      timeframe={timeframe}
      onTimeframeChange={handleTimeframeChange}
    />
  );
}

function deriveTimeframe(start: Date | null, end: Date | null): string {
  if (!start || !end) {
    return 'all';
  }

  const today = new Date();
  if (isSameDay(start, startOfYear(today)) && isSameDay(end, today)) {
    return 'ytd';
  }

  const diff = differenceInCalendarDays(end, start) + 1;
  if (diff <= 31) {
    return '30d';
  }
  if (diff <= 92) {
    return '90d';
  }
  return 'custom';
}
