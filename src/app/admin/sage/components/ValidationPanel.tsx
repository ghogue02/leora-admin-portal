'use client';

import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ErrorTable } from './ErrorTable';

export interface ValidationError {
  type: 'MISSING_CUSTOMER_CODE' | 'MISSING_SKU_CODE' | 'INVALID_AMOUNT' | 'DUPLICATE_INVOICE';
  message: string;
  invoiceNumber: string | null;
  customerName: string | null;
  skuCode: string | null;
  amount?: number;
  lineNumber?: number;
}

export interface ValidationResult {
  isValid: boolean;
  totalInvoices: number;
  validInvoices: number;
  errorCount: number;
  errors: ValidationError[];
  timestamp: Date;
}

export interface ValidationPanelProps {
  validation: ValidationResult | null;
  loading: boolean;
  onRefresh: () => void;
}

export function ValidationPanel({
  validation,
  loading,
  onRefresh,
}: ValidationPanelProps) {
  const [isErrorsExpanded, setIsErrorsExpanded] = React.useState(false);

  const hasErrors = validation && !validation.isValid && validation.errorCount > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Validation Status</CardTitle>
            <CardDescription>
              {validation
                ? `Last checked: ${validation.timestamp.toLocaleString()}`
                : 'Click refresh to validate export data'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh validation"
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', loading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <Alert>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>Validating export data...</AlertDescription>
            </div>
          </Alert>
        )}

        {!loading && !validation && (
          <Alert>
            <AlertDescription>
              No validation data available. Click refresh to validate.
            </AlertDescription>
          </Alert>
        )}

        {!loading && validation && (
          <>
            {/* Success State */}
            {validation.isValid && (
              <Alert
                variant="default"
                className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-200">
                  Ready to Export
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  All {validation.totalInvoices} invoices passed validation. You can
                  proceed with the export.
                </AlertDescription>
              </Alert>
            )}

            {/* Error State */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Found {validation.errorCount} Errors</AlertTitle>
                <AlertDescription>
                  {validation.validInvoices} of {validation.totalInvoices} invoices
                  are valid. Please fix errors before exporting.
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Invoices</div>
                <div className="text-2xl font-bold">
                  {validation.totalInvoices}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Valid</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {validation.validInvoices}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Errors</div>
                <div className="text-2xl font-bold text-destructive">
                  {validation.errorCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="text-2xl font-bold">
                  {validation.totalInvoices > 0
                    ? Math.round(
                        (validation.validInvoices / validation.totalInvoices) * 100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>

            {/* Expandable Error Table */}
            {hasErrors && (
              <div className="border rounded-lg">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4"
                  onClick={() => setIsErrorsExpanded(!isErrorsExpanded)}
                  aria-expanded={isErrorsExpanded}
                  aria-controls="error-details"
                >
                  <span className="font-medium">
                    View Error Details ({validation.errorCount})
                  </span>
                  {isErrorsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {isErrorsExpanded && (
                  <div id="error-details" className="border-t p-4">
                    <ErrorTable errors={validation.errors} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
