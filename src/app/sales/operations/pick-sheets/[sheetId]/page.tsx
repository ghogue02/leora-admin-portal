'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package } from 'lucide-react';
import { PickItemRow } from '../components/PickItemRow';
import { PickingControls } from '../components/PickingControls';
import { ExportButtons } from '../components/ExportButtons';
import { toast } from 'sonner';

// Mock data - replace with actual API calls
const mockPickSheet = {
  id: '1',
  sheetNumber: 'PS-2024-001',
  status: 'PICKING' as const,
  pickerName: 'John Smith',
  pickerEmail: 'john@example.com',
  createdAt: '2024-01-15T08:00:00Z',
  startedAt: '2024-01-15T08:30:00Z',
  items: [
    {
      id: '1',
      productName: 'Premium Wine Glass Set',
      sku: 'WG-001',
      quantity: 2,
      customerName: 'ABC Corp',
      location: { aisle: 'A', row: '1', shelf: '1' },
      picked: true,
      pickedAt: '2024-01-15T08:35:00Z',
      pickOrder: 1,
    },
    {
      id: '2',
      productName: 'Stainless Steel Corkscrew',
      sku: 'CS-102',
      quantity: 5,
      customerName: 'ABC Corp',
      location: { aisle: 'A', row: '1', shelf: '2' },
      picked: true,
      pickedAt: '2024-01-15T08:37:00Z',
      pickOrder: 2,
    },
    {
      id: '3',
      productName: 'Wine Aerator Pourer',
      sku: 'WA-205',
      quantity: 3,
      customerName: 'XYZ Inc',
      location: { aisle: 'A', row: '2', shelf: '1' },
      picked: false,
      pickOrder: 3,
    },
    {
      id: '4',
      productName: 'Decanter Crystal 1.5L',
      sku: 'DC-301',
      quantity: 1,
      customerName: 'XYZ Inc',
      location: { aisle: 'B', row: '1', shelf: '1' },
      picked: false,
      pickOrder: 4,
    },
    {
      id: '5',
      productName: 'Wine Stopper Set',
      sku: 'WS-405',
      quantity: 4,
      customerName: 'Tech Solutions',
      location: { aisle: 'B', row: '1', shelf: '3' },
      picked: false,
      pickOrder: 5,
    },
  ],
};

export default function PickSheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pickSheet, setPickSheet] = useState(mockPickSheet);

  const handleToggleItem = (itemId: string, picked: boolean) => {
    setPickSheet(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, picked, pickedAt: picked ? new Date().toISOString() : undefined }
          : item
      ),
    }));
    toast.success(picked ? 'Item marked as picked' : 'Item unmarked');
  };

  const handleStart = () => {
    setPickSheet(prev => ({
      ...prev,
      status: 'PICKING',
      startedAt: new Date().toISOString(),
    }));
    toast.success('Pick sheet started');
  };

  const handleComplete = () => {
    setPickSheet(prev => ({
      ...prev,
      status: 'PICKED',
      completedAt: new Date().toISOString(),
    }));
    toast.success('Pick sheet completed');
    router.push('/sales/operations/pick-sheets');
  };

  const handleCancel = () => {
    setPickSheet(prev => ({
      ...prev,
      status: 'CANCELLED',
    }));
    toast.success('Pick sheet cancelled');
    router.push('/sales/operations/pick-sheets');
  };

  const handleMarkAllPicked = () => {
    setPickSheet(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        picked: true,
        pickedAt: new Date().toISOString(),
      })),
    }));
    toast.success('All items marked as picked');
  };

  const totalItems = pickSheet.items.length;
  const pickedItems = pickSheet.items.filter(i => i.picked).length;
  const progress = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0;

  const statusColors = {
    READY: 'bg-blue-100 text-blue-800 border-blue-200',
    PICKING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PICKED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/sales/operations/pick-sheets')}
        className="mb-4 touch-target"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pick Sheets
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono">{pickSheet.sheetNumber}</h1>
            <Badge className={statusColors[pickSheet.status]} variant="outline">
              {pickSheet.status}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">Picker: {pickSheet.pickerName}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <ExportButtons
            sheetId={pickSheet.id}
            sheetNumber={pickSheet.sheetNumber}
            items={pickSheet.items}
            pickerEmail={pickSheet.pickerEmail}
          />
        </div>
      </div>

      {/* Progress Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Picking Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Items Picked</span>
                <span className="font-semibold text-lg">
                  {pickedItems} of {totalItems}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right text-sm text-gray-600 mt-1">
                {progress}% Complete
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <div className="text-sm text-gray-600">Created</div>
                <div className="font-semibold">
                  {new Date(pickSheet.createdAt).toLocaleString()}
                </div>
              </div>
              {pickSheet.startedAt && (
                <div>
                  <div className="text-sm text-gray-600">Started</div>
                  <div className="font-semibold">
                    {new Date(pickSheet.startedAt).toLocaleString()}
                  </div>
                </div>
              )}
              {pickSheet.completedAt && (
                <div>
                  <div className="text-sm text-gray-600">Completed</div>
                  <div className="font-semibold">
                    {new Date(pickSheet.completedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="pt-4 border-t">
              <PickingControls
                status={pickSheet.status}
                totalItems={totalItems}
                pickedItems={pickedItems}
                onStart={handleStart}
                onComplete={handleComplete}
                onCancel={handleCancel}
                onMarkAllPicked={handleMarkAllPicked}
                disabled={pickSheet.status === 'PICKED' || pickSheet.status === 'CANCELLED'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items to Pick (sorted by location)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="hidden md:flex items-center gap-4 p-4 border-b bg-gray-50 font-semibold text-sm">
            <div className="w-6"></div>
            <div className="w-24">Location</div>
            <div className="flex-1">Product</div>
            <div className="w-20 text-center">Qty</div>
            <div className="w-40">Customer</div>
            <div className="w-32">Status</div>
          </div>

          {/* Items */}
          <div>
            {pickSheet.items.map((item) => (
              <PickItemRow
                key={item.id}
                item={item}
                onToggle={handleToggleItem}
                disabled={pickSheet.status === 'PICKED' || pickSheet.status === 'CANCELLED'}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
