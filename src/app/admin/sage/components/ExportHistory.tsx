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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ErrorTable, ValidationError } from './ErrorTable';

export interface SageExport {
  id: string;
  status: 'completed' | 'failed' | 'pending';
  createdAt: Date;
  createdBy: string;
  startDate: Date;
  endDate: Date;
  invoiceCount: number;
  errorCount: number;
  fileUrl?: string;
  errors?: ValidationError[];
}

export interface ExportHistoryProps {
  exports: SageExport[];
  onDownload: (exportId: string) => void;
  onViewErrors: (exportId: string) => void;
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
  onViewErrors,
}: ExportHistoryProps) {
  const [selectedExport, setSelectedExport] = React.useState<SageExport | null>(
    null
  );
  const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false);

  const handleViewErrors = (exportItem: SageExport) => {
    setSelectedExport(exportItem);
    setIsErrorDialogOpen(true);
    onViewErrors(exportItem.id);
  };

  const handleDownload = (exportId: string) => {
    onDownload(exportId);
  };

  return (
    <>
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
                    <TableHead className="text-right">Errors</TableHead>
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
                            {format(exportItem.startDate, 'MMM d, yyyy')}
                            {' - '}
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
                        <TableCell className="text-right font-mono text-sm">
                          {exportItem.invoiceCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {exportItem.errorCount > 0 ? (
                            <Badge variant="destructive" className="font-mono">
                              {exportItem.errorCount}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {exportItem.status === 'completed' &&
                              exportItem.fileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(exportItem.id)}
                                  aria-label="Download export file"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              )}
                            {exportItem.errorCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewErrors(exportItem)}
                                aria-label="View errors"
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                View Errors
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

      {/* Error Details Dialog */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Errors</DialogTitle>
            <DialogDescription>
              {selectedExport && (
                <>
                  Export from{' '}
                  {format(selectedExport.startDate, 'MMM d, yyyy')} to{' '}
                  {format(selectedExport.endDate, 'MMM d, yyyy')}
                  {' - '}
                  {selectedExport.errorCount} errors found
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedExport?.errors && (
            <ErrorTable errors={selectedExport.errors} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
