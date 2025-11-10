'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { endOfDay, startOfDay, startOfYear, subDays } from 'date-fns';

export type RangePreset = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export type ReportFilters = {
  startDate: Date | null;
  endDate: Date | null;
  deliveryMethod: 'Delivery' | 'Pick up' | 'Will Call' | null;
  usageFilter: 'standard' | 'promotion' | 'sample' | null;
};

type ReportFiltersContextValue = {
  filters: ReportFilters;
  updateFilters: (patch: Partial<ReportFilters>) => void;
  resetFilters: () => void;
  setPresetRange: (preset: RangePreset) => void;
  queryParams: Record<string, string>;
};

const makeDefaultFilters = (): ReportFilters => {
  const today = endOfDay(new Date());
  return {
    startDate: startOfDay(subDays(today, 29)),
    endDate: today,
    deliveryMethod: null,
    usageFilter: null,
  };
};

const ReportFiltersContext = createContext<ReportFiltersContextValue | null>(null);

const formatDateParam = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ReportFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<ReportFilters>(() => makeDefaultFilters());

  const updateFilters = useCallback((patch: Partial<ReportFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(makeDefaultFilters());
  }, []);

  const setPresetRange = useCallback((preset: RangePreset) => {
    const today = endOfDay(new Date());

    if (preset === 'ytd') {
      setFilters((prev) => ({
        ...prev,
        startDate: startOfYear(today),
        endDate: today,
      }));
      return;
    }

    if (preset === 'custom') {
      return;
    }

    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    setFilters((prev) => ({
      ...prev,
      startDate: startOfDay(subDays(today, days - 1)),
      endDate: today,
    }));
  }, []);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.deliveryMethod) {
      params.deliveryMethod = filters.deliveryMethod;
    }
    if (filters.usageFilter) {
      params.usageFilter = filters.usageFilter;
    }
    if (filters.startDate) {
      params.startDate = formatDateParam(filters.startDate);
    }
    if (filters.endDate) {
      params.endDate = formatDateParam(filters.endDate);
    }
    return params;
  }, [filters.deliveryMethod, filters.endDate, filters.startDate, filters.usageFilter]);

  const value = useMemo<ReportFiltersContextValue>(
    () => ({
      filters,
      updateFilters,
      resetFilters,
      setPresetRange,
      queryParams,
    }),
    [filters, queryParams, resetFilters, setPresetRange, updateFilters],
  );

  return (
    <ReportFiltersContext.Provider value={value}>
      {children}
    </ReportFiltersContext.Provider>
  );
}

export const useReportFilters = () => {
  const context = useContext(ReportFiltersContext);
  if (!context) {
    throw new Error('useReportFilters must be used within ReportFiltersProvider');
  }
  return context;
};
