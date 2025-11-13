'use client';

import * as React from 'react';
import { subDays, startOfDay, endOfDay, format as formatDate } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  DateRangeSelector,
  ValidationPanel,
  ExportHistory,
  type ValidationResult as PanelValidationResult,
  type ValidationError as PanelValidationError,
  type SageExport as HistoryExport,
} from './components';

type DateRange = {
  start: Date;
  end: Date;
};

type ValidationIssueDto = {
  type?: string;
  message?: string;
  invoiceNumber?: string | null;
  customerName?: string | null;
  skuCode?: string | null;
};

type ValidationResponseDto = {
  valid?: boolean;
  errors?: ValidationIssueDto[];
  warnings?: ValidationIssueDto[];
  invoiceCount?: number;
  warningCount?: number;
  classification?: {
    sample?: number;
    storage?: number;
  };
};

type HistoryExportDto = {
  id: string;
  status?: string;
  createdAt: string;
  exportedBy?: {
    firstName?: string;
    lastName?: string;
  } | null;
  startDate: string;
  endDate: string;
  invoiceCount?: number;
  recordCount?: number;
  sampleInvoiceCount?: number;
  sampleRecordCount?: number;
  storageInvoiceCount?: number;
  hasSampleFile?: boolean;
};

const INITIAL_RANGE: DateRange = {
  start: startOfDay(subDays(new Date(), 7)),
  end: endOfDay(new Date()),
};

function formatForApi(date: Date) {
  return formatDate(date, 'yyyy-MM-dd');
}

function mapIssue(issue: ValidationIssueDto = {}): PanelValidationError {
  return {
    type: issue.type ?? 'UNKNOWN',
    message: issue.message ?? 'Unknown validation issue',
    invoiceNumber: issue.invoiceNumber ?? null,
    customerName: issue.customerName ?? null,
    skuCode: issue.skuCode ?? null,
  };
}

function mapValidationResponse(data: ValidationResponseDto): PanelValidationResult {
  const errors = Array.isArray(data.errors) ? data.errors.map(mapIssue) : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings.map(mapIssue) : [];
  const totalInvoices = data.invoiceCount ?? 0;
  const errorCount = errors.length;
  const validInvoices = Math.max(totalInvoices - errorCount, 0);

  return {
    isValid: data.valid && errorCount === 0,
    totalInvoices,
    validInvoices,
    errorCount,
    errors,
    warnings,
    warningCount: data.warningCount ?? warnings.length ?? 0,
    metadata: {
      sampleInvoices: data.classification?.sample ?? 0,
      storageInvoices: data.classification?.storage ?? 0,
    },
    timestamp: new Date(),
  };
}

function mapHistoryResponse(items: HistoryExportDto[]): HistoryExport[] {
  return items.map((item) => ({
    id: item.id,
    status: (item.status?.toLowerCase?.() ?? 'completed') as HistoryExport['status'],
    createdAt: new Date(item.createdAt),
    createdBy: item.exportedBy
      ? `${item.exportedBy.firstName} ${item.exportedBy.lastName}`.trim()
      : '—',
    startDate: new Date(item.startDate),
    endDate: new Date(item.endDate),
    invoiceCount: item.invoiceCount ?? 0,
    recordCount: item.recordCount ?? 0,
    sampleInvoiceCount: item.sampleInvoiceCount ?? 0,
    sampleRecordCount: item.sampleRecordCount ?? 0,
    storageInvoiceCount: item.storageInvoiceCount ?? 0,
    hasSampleFile: Boolean(item.hasSampleFile),
  }));
}

export default function SageExportClient() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange>(INITIAL_RANGE);
  const [validation, setValidation] = React.useState<PanelValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryExport[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  const fetchValidation = React.useCallback(async () => {
    setValidationLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: formatForApi(dateRange.start),
        endDate: formatForApi(dateRange.end),
      });
      const response = await fetch(`/api/sage/validate?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to validate invoices');
      }
      const data = await response.json();
      setValidation(mapValidationResponse(data));
    } catch (error) {
      console.error('[SAGE] Validation failed', error);
      toast({
        title: 'Validation failed',
        description: error instanceof Error ? error.message : 'Unable to validate invoices',
        variant: 'destructive',
      });
      setValidation(null);
    } finally {
      setValidationLoading(false);
    }
  }, [dateRange, toast]);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/sage/history');
      if (!response.ok) {
        throw new Error('Failed to load export history');
      }
      const data = await response.json();
      setHistory(mapHistoryResponse(data.exports ?? []));
    } catch (error) {
      console.error('[SAGE] History load error', error);
      toast({
        title: 'Failed to load history',
        description: error instanceof Error ? error.message : 'Unable to load export history',
        variant: 'destructive',
      });
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      fetchValidation();
    }, 400);
    return () => clearTimeout(timeout);
  }, [fetchValidation]);

  const handleDownload = React.useCallback(
    async (exportId: string, type: 'standard' | 'sample') => {
      try {
        const response = await fetch(`/api/sage/download/${exportId}?type=${type}`);
        if (!response.ok) {
          throw new Error('Download failed');
        }

        const disposition = response.headers.get('Content-Disposition');
        const match = disposition?.match(/filename="?([^"]+)"?/i);
        const fallbackName =
          type === 'sample'
            ? `SAGE_Samples_${formatForApi(dateRange.start)}.csv`
            : `SAGE_Export_${formatForApi(dateRange.start)}.csv`;
        const fileName = match?.[1] ?? fallbackName;

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('[SAGE] Download failed', error);
        toast({
          title: 'Download failed',
          description: error instanceof Error ? error.message : 'Unable to download export file',
          variant: 'destructive',
        });
      }
    },
    [dateRange.start, toast]
  );

  const handleExport = React.useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = await fetch('/api/sage/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formatForApi(dateRange.start),
          endDate: formatForApi(dateRange.end),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Export failed');
      }

      const data = await response.json();
      toast({
        title: 'Export ready',
        description: 'Downloading SAGE export files.',
      });

      await handleDownload(data.exportId, 'standard');
      if (data.hasSampleFile) {
        await handleDownload(data.exportId, 'sample');
      }

      await Promise.all([loadHistory(), fetchValidation()]);
    } catch (error) {
      console.error('[SAGE] Export error', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unable to export SAGE data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [dateRange, fetchValidation, handleDownload, isExporting, loadHistory, toast]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">SAGE Export</p>
        <h1 className="text-3xl font-semibold text-gray-900">Export Invoices to SAGE</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Validate invoices, download accounting-ready CSVs, and review export history.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Choose the invoice period to validate and export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateRangeSelector
            startDate={dateRange.start}
            endDate={dateRange.end}
            onDateChange={(start, end) => {
              if (!start || !end) return;
              setDateRange({ start: startOfDay(start), end: endOfDay(end) });
            }}
            invoiceCount={validation?.totalInvoices}
            loading={validationLoading}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              disabled={!validation?.isValid || isExporting}
              className="min-w-[160px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting…
                </>
              ) : (
                'Export to CSV'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ValidationPanel validation={validation} loading={validationLoading} onRefresh={fetchValidation} />

      {historyLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Export History</CardTitle>
            <CardDescription>Loading recent exports…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching export history…
            </div>
          </CardContent>
        </Card>
      ) : (
        <ExportHistory exports={history} onDownload={handleDownload} />
      )}
    </main>
  );
}
