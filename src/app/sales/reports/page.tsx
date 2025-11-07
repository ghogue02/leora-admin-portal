'use client';

import { useState, useEffect } from 'react';
import { FilterPanel, FilterState } from './components/FilterPanel';
import { SummaryCards } from './components/SummaryCards';
import { ResultsTable } from './components/ResultsTable';
import { ExportButton } from './components/ExportButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BarChart3 } from 'lucide-react';

interface Invoice {
  id: string;
  referenceNumber: string;
  date: string;
  customerName: string;
  deliveryMethod: string;
  status: string;
  invoiceType: string;
  total?: string;
}

interface ApiResponse {
  invoices: Invoice[];
  filters: {
    deliveryMethod: string | null;
    startDate: string | null;
    endDate: string | null;
    usageFilter?: string | null;
  };
  count: number;
}

export default function SalesReportsPage() {
  const [filters, setFilters] = useState<FilterState>({
    deliveryMethod: null,
    startDate: null,
    endDate: null,
    usageFilter: null,
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (filters.deliveryMethod) {
        params.append('deliveryMethod', filters.deliveryMethod);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.usageFilter) {
        params.append('usageFilter', filters.usageFilter);
      }

      const response = await fetch(`/api/sales/reports/delivery?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setInvoices(data.invoices);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch reports'
      );
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchReports();
  };

  const handleClearFilters = () => {
    setFilters({
      deliveryMethod: null,
      startDate: null,
      endDate: null,
      usageFilter: null,
    });
    setInvoices([]);
    setHasSearched(false);
    setError(null);
  };

  // Auto-load all invoices on initial mount
  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      {/* Header */}
      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <>
          {/* Summary Cards */}
          <SummaryCards invoices={invoices} />

          {/* Export Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Results ({invoices.length} invoices)
            </h2>
            <ExportButton invoices={invoices} filters={filters} />
          </div>

          {/* Results Table */}
          <ResultsTable invoices={invoices} />
        </>
      )}

      {/* Empty State - Before Search */}
      {!isLoading && !hasSearched && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Ready to Generate Reports
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Apply filters above and click &quot;Apply Filters&quot; to view
            delivery method reports, or load all invoices.
          </p>
        </div>
      )}
    </main>
  );
}
