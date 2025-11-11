'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export interface SageExport {
  id: string;
  status: 'completed' | 'failed' | 'pending';
  createdAt: Date;
  createdBy: string;
  startDate: Date;
  endDate: Date;
  invoiceCount: number;
  recordCount: number;
  sampleInvoiceCount: number;
  sampleRecordCount: number;
  storageInvoiceCount: number;
  hasSampleFile: boolean;
}

export interface ExportHistoryProps {
  exports: SageExport[];
  onDownload: (exportId: string, type: 'standard' | 'sample') => void;
}

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle2,
    variant: 'default' as const,
    label: 'Completed',
    color: 'text-green-600 dark:text-green-400',
  },
  failed: {
    icon: XCircle,
    variant: 'destructive' as const,
    label: 'Failed',
    color: 'text-destructive',
  },
  pending: {
    icon: Clock,
    variant: 'secondary' as const,
    label: 'Pending',
    color: 'text-muted-foreground',
  },
};

export function ExportHistory({
  exports,
  onDownload,
}: ExportHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export History</CardTitle>
        <CardDescription>
          Recent SAGE export attempts and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        {exports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No export history available</p>
            <p className="text-sm mt-2">
              Create your first export to see it here
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Line Items</TableHead>
                  <TableHead className="text-right">Storage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exportItem) => {
                  const statusConfig = STATUS_CONFIG[exportItem.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={exportItem.id}>
                      <TableCell>
                        <Badge
                          variant={statusConfig.variant}
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(exportItem.startDate, 'MMM d, yyyy')} -{' '}
                          {format(exportItem.endDate, 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(exportItem.createdAt, 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(exportItem.createdAt, 'h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {exportItem.createdBy}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="font-semibold text-foreground">
                          {exportItem.invoiceCount.toLocaleString()} standard
                        </div>
                        {exportItem.sampleInvoiceCount > 0 && (
                          <div className="text-amber-600 dark:text-amber-400">
                            {exportItem.sampleInvoiceCount.toLocaleString()} sample
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="font-mono">
                          {exportItem.recordCount.toLocaleString()} standard
                        </div>
                        {exportItem.sampleRecordCount > 0 && (
                          <div className="text-amber-600 dark:text-amber-400 font-mono">
                            {exportItem.sampleRecordCount.toLocaleString()} sample
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {exportItem.storageInvoiceCount > 0 ? (
                          <Badge variant="secondary" className="font-mono">
                            {exportItem.storageInvoiceCount.toLocaleString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDownload(exportItem.id, 'standard')}
                            aria-label="Download standard export file"
                            disabled={exportItem.status !== 'completed'}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Standard
                          </Button>
                          {exportItem.hasSampleFile && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDownload(exportItem.id, 'sample')}
                              aria-label="Download sample export file"
                              disabled={exportItem.status !== 'completed'}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Samples
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
