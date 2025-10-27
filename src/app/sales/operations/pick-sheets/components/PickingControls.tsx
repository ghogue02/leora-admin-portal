'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Play, Square, CheckCircle2, Download, Printer, FileText, XCircle } from 'lucide-react';
import { useState } from 'react';

interface PickingControlsProps {
  status: 'READY' | 'PICKING' | 'PICKED' | 'CANCELLED';
  totalItems: number;
  pickedItems: number;
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
  onMarkAllPicked?: () => void;
  disabled?: boolean;
}

export function PickingControls({
  status,
  totalItems,
  pickedItems,
  onStart,
  onComplete,
  onCancel,
  onExportCSV,
  onExportPDF,
  onPrint,
  onMarkAllPicked,
  disabled,
}: PickingControlsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const allPicked = pickedItems === totalItems && totalItems > 0;
  const canComplete = allPicked && status === 'PICKING';

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Primary Actions */}
        {status === 'READY' && onStart && (
          <Button
            onClick={onStart}
            disabled={disabled}
            size="lg"
            className="touch-target"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Picking
          </Button>
        )}

        {status === 'PICKING' && onComplete && (
          <Button
            onClick={() => setShowCompleteDialog(true)}
            disabled={disabled || !canComplete}
            size="lg"
            className="touch-target bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Complete
          </Button>
        )}

        {/* Bulk Actions */}
        {status === 'PICKING' && onMarkAllPicked && (
          <Button
            onClick={onMarkAllPicked}
            disabled={disabled || allPicked}
            variant="outline"
            size="lg"
            className="touch-target"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Mark All Picked
          </Button>
        )}

        {/* Export Actions */}
        {status !== 'CANCELLED' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="touch-target">
                <Download className="mr-2 h-5 w-5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onExportCSV && (
                <DropdownMenuItem onClick={onExportCSV}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
              )}
              {onExportPDF && (
                <DropdownMenuItem onClick={onExportPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
              )}
              {onPrint && (
                <DropdownMenuItem onClick={onPrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Cancel */}
        {status !== 'PICKED' && status !== 'CANCELLED' && onCancel && (
          <Button
            onClick={() => setShowCancelDialog(true)}
            disabled={disabled}
            variant="outline"
            size="lg"
            className="touch-target text-red-600 hover:text-red-700"
          >
            <XCircle className="mr-2 h-5 w-5" />
            Cancel Sheet
          </Button>
        )}
      </div>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Pick Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              All {totalItems} items have been picked. This will mark the pick sheet as completed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onComplete?.();
                setShowCompleteDialog(false);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Pick Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the pick sheet and release all orders back to the pool.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Sheet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onCancel?.();
                setShowCancelDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Sheet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
