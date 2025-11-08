"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar as CalendarIcon, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ValidationError = {
  type: string;
  message: string;
  orderId?: string;
  invoiceId?: string;
  customerId?: string;
  skuId?: string;
};

type ValidationResult = {
  valid: boolean;
  invoiceCount: number;
  recordCount: number;
  errors: ValidationError[];
};

type ExportHistoryRecord = {
  id: string;
  startDate: string;
  endDate: string;
  recordCount: number;
  invoiceCount: number;
  status: string;
  fileName: string;
  createdAt: string;
  exportedBy: {
    firstName: string;
    lastName: string;
  } | null;
};

type DateRange = {
  from: Date;
  to: Date;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SageExportPage() {
  // State management
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const validateDateRange = useCallback(async () => {
    setIsValidating(true);

    try {
      const params = new URLSearchParams({
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
      });

      const response = await fetch(`/api/sage/validate?${params}`);

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const data = await response.json();
      setValidation(data);
    } catch (error) {
      console.error("Validation error:", error);
      setValidation({
        valid: false,
        invoiceCount: 0,
        recordCount: 0,
        errors: [{
          type: "SYSTEM_ERROR",
          message: error instanceof Error ? error.message : "Failed to validate",
        }],
      });
    } finally {
      setIsValidating(false);
    }
  }, [dateRange]);

  // Fetch validation on date change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      validateDateRange();
    }, 500);

    return () => clearTimeout(timer);
  }, [validateDateRange]);

  // Load export history on mount
  useEffect(() => {
    loadExportHistory();
  }, []);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const handleExport = async () => {
    if (!validation?.valid) return;

    setIsExporting(true);

    try {
      const response = await fetch("/api/sage/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: format(dateRange.from, "yyyy-MM-dd"),
          endDate: format(dateRange.to, "yyyy-MM-dd"),
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SAGE_Export_${format(dateRange.from, "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reload history
      await loadExportHistory();
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const loadExportHistory = async () => {
    setIsLoadingHistory(true);

    try {
      const response = await fetch("/api/sage/history");

      if (!response.ok) {
        throw new Error("Failed to load history");
      }

      const data = await response.json();
      setExportHistory(data.exports || []);
    } catch (error) {
      console.error("History load error:", error);
      setExportHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const downloadPreviousExport = async (exportId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/sage/download/${exportId}`);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert(error instanceof Error ? error.message : "Download failed");
    }
  };

  // ============================================================================
  // QUICK DATE PRESETS
  // ============================================================================

  const setQuickDate = (preset: "today" | "yesterday" | "last7" | "last30") => {
    const today = new Date();

    switch (preset) {
      case "today":
        setDateRange({
          from: startOfDay(today),
          to: endOfDay(today),
        });
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        setDateRange({
          from: startOfDay(yesterday),
          to: endOfDay(yesterday),
        });
        break;
      case "last7":
        setDateRange({
          from: startOfDay(subDays(today, 7)),
          to: endOfDay(today),
        });
        break;
      case "last30":
        setDateRange({
          from: startOfDay(subDays(today, 30)),
          to: endOfDay(today),
        });
        break;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      {/* Page Header */}
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          SAGE Export
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">
          Export Invoices to SAGE
        </h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Export HAL invoices to SAGE accounting software format. Select a date range,
          validate data, and download CSV files for import.
        </p>
      </header>

      {/* Date Range Selector */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select Date Range
        </h2>

        <div className="flex flex-col gap-4">
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDate("today")}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDate("yesterday")}
            >
              Yesterday
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDate("last7")}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDate("last30")}
            >
              Last 30 Days
            </Button>
          </div>

          {/* Date Pickers */}
          <div className="flex flex-wrap gap-4">
            {/* Start Date */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) =>
                      date && setDateRange({ ...dateRange, from: startOfDay(date) })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) =>
                      date && setDateRange({ ...dateRange, to: endOfDay(date) })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Invoice Count */}
          {validation && !isValidating && (
            <p className="text-sm text-gray-600">
              {validation.invoiceCount > 0 ? (
                <>
                  Found <strong>{validation.invoiceCount}</strong> invoice
                  {validation.invoiceCount !== 1 ? "s" : ""} with{" "}
                  <strong>{validation.recordCount}</strong> line item
                  {validation.recordCount !== 1 ? "s" : ""}
                </>
              ) : (
                "No invoices found in this date range"
              )}
            </p>
          )}
          {isValidating && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating...
            </p>
          )}
        </div>
      </Card>

      {/* Validation Panel */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Validation Status
        </h2>

        {isValidating && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Validating data...</span>
          </div>
        )}

        {!isValidating && validation && (
          <div className="flex flex-col gap-4">
            {validation.valid ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{validation.invoiceCount}</strong> invoice
                  {validation.invoiceCount !== 1 ? "s" : ""} ready to export
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>{validation.errors.length}</strong> validation error
                    {validation.errors.length !== 1 ? "s" : ""} found
                  </AlertDescription>
                </Alert>

                {/* Error Table */}
                {validation.errors.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Message
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Order ID
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {validation.errors.map((error, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <Badge variant="destructive" className="text-xs">
                                {error.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {error.message}
                            </td>
                            <td className="px-4 py-3">
                              {error.orderId && (
                                <code className="text-xs text-gray-600">
                                  {error.orderId.slice(0, 8)}
                                </code>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!isValidating && !validation && (
          <p className="text-sm text-gray-500">
            Select a date range to validate invoices
          </p>
        )}
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={!validation?.valid || isExporting || isValidating}
          size="lg"
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export to CSV
            </>
          )}
        </Button>
      </div>

      {/* Export History */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Export History
        </h2>

        {isLoadingHistory && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading history...</span>
          </div>
        )}

        {!isLoadingHistory && exportHistory.length === 0 && (
          <p className="text-sm text-gray-500">
            No previous exports found
          </p>
        )}

        {!isLoadingHistory && exportHistory.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Range
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {exportHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(record.startDate).toLocaleDateString()} -{" "}
                      {new Date(record.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-900">
                        {record.invoiceCount} invoices
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.recordCount} items
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          record.status === "COMPLETED"
                            ? "default"
                            : record.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {record.exportedBy
                        ? `${record.exportedBy.firstName} ${record.exportedBy.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {record.status === "COMPLETED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            downloadPreviousExport(record.id, record.fileName)
                          }
                          className="text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
