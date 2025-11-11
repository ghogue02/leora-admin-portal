'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package } from 'lucide-react';
import { PickItemRow } from '../components/PickItemRow';
import { PickingControls } from '../components/PickingControls';
import { ExportButtons } from '../components/ExportButtons';
import { toast } from 'sonner';
import type { PickSheetStatus } from '@prisma/client';
import { usePickSheetRealtime } from '@/hooks/usePickSheetRealtime';

interface PickSheetItem {
  id: string;
  pickOrder: number | null;
  quantity: number;
  isPicked: boolean;
  pickedAt: string | null;
  sku?: {
    code: string;
    product: { name: string | null } | null;
  } | null;
  customer?: {
    name: string | null;
  } | null;
  location?: string | null;
}

interface PickSheetResponse {
  pickSheet: {
    id: string;
    sheetNumber: string;
    status: PickSheetStatus;
    pickerName: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    items: PickSheetItem[];
  };
  realtimeChannels?: {
    warehouse?: string | null;
  };
}

function formatLocation(location?: string | null) {
  if (!location) return undefined;
  const [aisle = 'NA', row = 'NA', shelf = 'NA'] = location.split('-');
  return { aisle, row, shelf };
}

export default function PickSheetDetailPage() {
  const params = useParams<{ sheetId: string }>();
  const sheetId = Array.isArray(params?.sheetId) ? params?.sheetId[0] : params?.sheetId ?? '';
  const router = useRouter();
  const [pickSheet, setPickSheet] = useState<PickSheetResponse['pickSheet'] | null>(null);
  const [warehouseChannel, setWarehouseChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPickSheet = useCallback(async () => {
    if (!sheetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/pick-sheets/${sheetId}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to load pick sheet');
      }
      const data = (await response.json()) as PickSheetResponse;
      setPickSheet(data.pickSheet);
      setWarehouseChannel(data.realtimeChannels?.warehouse ?? null);
      setError(null);
    } catch (err) {
      console.error('Failed to load pick sheet', err);
      setError(err instanceof Error ? err.message : 'Unable to load pick sheet');
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    void fetchPickSheet();
  }, [fetchPickSheet]);

  usePickSheetRealtime({
    channel: warehouseChannel,
    pickSheetId: pickSheet?.id,
    onItemUpdate: (event) => {
      setPickSheet((prev) => {
        if (!prev || prev.id !== event.pickSheetId) return prev;
        return {
          ...prev,
          status: event.pickSheetStatus ?? prev.status,
          items: prev.items.map((item) =>
            item.id === event.itemId
              ? {
                  ...item,
                  isPicked: event.isPicked,
                  pickedAt: event.pickedAt,
                }
              : item,
          ),
        };
      });
    },
    onStatusUpdate: (event) => {
      setPickSheet((prev) =>
        !prev || prev.id !== event.pickSheetId
          ? prev
          : {
              ...prev,
              status: event.status,
              completedAt: event.completedAt ?? prev.completedAt,
            },
      );
    },
  });

  const totalItems = pickSheet?.items.length ?? 0;
  const pickedItems = pickSheet?.items.filter((item) => item.isPicked).length ?? 0;

  const handleToggleItem = useCallback(
    async (itemId: string, picked: boolean) => {
      try {
        const response = await fetch(`/api/pick-sheets/${sheetId}/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPicked: picked }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? 'Failed to update item');
        }

        const updatedItem = await response.json();
        setPickSheet((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
              }
            : prev,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update item');
      }
    },
    [sheetId],
  );

  const updatePickSheetStatus = useCallback(
    async (action: 'start' | 'complete' | 'cancel') => {
      try {
        const response = await fetch(`/api/pick-sheets/${sheetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? `Failed to ${action} pick sheet`);
        }

        const updated = (await response.json()) as PickSheetResponse['pickSheet'];
        setPickSheet(updated);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to ${action} pick sheet`);
      }
    },
    [sheetId],
  );

  const handleMarkAllPicked = useCallback(async () => {
    if (!pickSheet) return;
    const pending = pickSheet.items.filter((item) => !item.isPicked);
    try {
      await Promise.all(pending.map((item) => handleToggleItem(item.id, true)));
      toast.success('All items marked as picked');
    } catch {
      // errors handled in toggle
    }
  }, [pickSheet, handleToggleItem]);

  const handleExport = useCallback(async () => {
    if (!pickSheet) return;
    try {
      const response = await fetch(`/api/pick-sheets/${pickSheet.id}/export?format=csv`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to export pick sheet');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pickSheet.sheetNumber}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export pick sheet');
    }
  }, [pickSheet]);

  const statusColors = useMemo(
    () => ({
      READY: 'bg-blue-100 text-blue-800 border-blue-200',
      PICKING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PICKED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    }),
    [],
  );

  const exportItems = useMemo(
    () =>
      pickSheet
        ? pickSheet.items.map((item) => ({
            location: formatLocation(item.location),
            pickOrder: item.pickOrder ?? undefined,
            sku: item.sku?.code ?? 'N/A',
            productName: item.sku?.product?.name ?? 'Unknown Product',
            quantity: item.quantity,
            customerName: item.customer?.name ?? 'Unknown Customer',
            picked: item.isPicked,
          }))
        : [],
    [pickSheet],
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500">
          Loading pick sheet…
        </div>
      </div>
    );
  }

  if (error || !pickSheet) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Button variant="ghost" onClick={() => router.push('/sales/operations/pick-sheets')} className="mb-4 touch-target">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pick Sheets
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          {error ?? 'Pick sheet not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/sales/operations/pick-sheets')}
        className="mb-4 touch-target"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pick Sheets
      </Button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono">{pickSheet.sheetNumber}</h1>
            <Badge className={statusColors[pickSheet.status] ?? 'bg-gray-100 text-gray-700'} variant="outline">
              {pickSheet.status}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">Picker: {pickSheet.pickerName || 'Unassigned'}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <ExportButtons
            sheetId={pickSheet.id}
            sheetNumber={pickSheet.sheetNumber}
            items={exportItems}
            pickerEmail={undefined}
          />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Picking Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Items Picked</span>
                <span className="font-semibold">
                  {pickedItems} of {totalItems}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PickingControls
        status={pickSheet.status as 'READY' | 'PICKING' | 'PICKED' | 'CANCELLED'}
        totalItems={totalItems}
        pickedItems={pickedItems}
        onStart={() => updatePickSheetStatus('start')}
        onComplete={() => updatePickSheetStatus('complete')}
        onCancel={() => updatePickSheetStatus('cancel')}
        onMarkAllPicked={handleMarkAllPicked}
        onExportCSV={handleExport}
        disabled={pickSheet.status === 'CANCELLED'}
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white">
        {pickSheet.items.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No items assigned to this pick sheet.</div>
        ) : (
          pickSheet.items.map((item) => (
            <PickItemRow
              key={item.id}
              item={{
                id: item.id,
                productName: item.sku?.product?.name ?? 'Unknown Product',
                sku: item.sku?.code ?? 'N/A',
                quantity: item.quantity,
                customerName: item.customer?.name ?? 'Unknown Customer',
                location: formatLocation(item.location),
                picked: item.isPicked,
                pickedAt: item.pickedAt ?? undefined,
                pickOrder: item.pickOrder ?? undefined,
              }}
              onToggle={handleToggleItem}
              disabled={pickSheet.status !== 'PICKING'}
            />
          ))
        )}
      </div>
    </div>
  );
}
