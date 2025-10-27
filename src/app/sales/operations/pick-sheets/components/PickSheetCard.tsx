'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download, XCircle } from 'lucide-react';
import Link from 'next/link';

interface PickSheetCardProps {
  sheet: {
    id: string;
    sheetNumber: string;
    status: 'READY' | 'PICKING' | 'PICKED' | 'CANCELLED';
    pickerName?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    totalItems: number;
    pickedItems: number;
  };
  onExport?: (sheetId: string) => void;
  onCancel?: (sheetId: string) => void;
}

const statusColors = {
  READY: 'bg-blue-100 text-blue-800 border-blue-200',
  PICKING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PICKED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function PickSheetCard({ sheet, onExport, onCancel }: PickSheetCardProps) {
  const progress = sheet.totalItems > 0
    ? Math.round((sheet.pickedItems / sheet.totalItems) * 100)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold font-mono">{sheet.sheetNumber}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {sheet.pickerName || 'Unassigned'}
            </p>
          </div>
          <Badge className={statusColors[sheet.status]} variant="outline">
            {sheet.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold">
              {sheet.pickedItems} of {sheet.totalItems} picked
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-sm text-gray-600 mt-1">
            {progress}%
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span>{new Date(sheet.createdAt).toLocaleString()}</span>
          </div>
          {sheet.startedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Started:</span>
              <span>{new Date(sheet.startedAt).toLocaleString()}</span>
            </div>
          )}
          {sheet.completedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span>{new Date(sheet.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/sales/operations/pick-sheets/${sheet.id}`} className="flex-1">
            <Button variant="default" className="w-full touch-target">
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
          </Link>

          {onExport && sheet.status !== 'CANCELLED' && (
            <Button
              variant="outline"
              onClick={() => onExport(sheet.id)}
              className="touch-target"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {onCancel && sheet.status === 'READY' && (
            <Button
              variant="outline"
              onClick={() => onCancel(sheet.id)}
              className="text-red-600 hover:text-red-700 touch-target"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
