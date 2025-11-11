'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Calendar } from 'lucide-react';
import { PickSheetCard } from './components/PickSheetCard';
import { PickSheetGenerator } from './sections/PickSheetGenerator';
import { toast } from 'sonner';
import type { PickSheetStatus } from '@prisma/client';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { tryGetTenantChannelName } from '@/lib/realtime/channels';
import {
  PICK_SHEET_ITEM_UPDATED_EVENT,
  PICK_SHEET_STATUS_UPDATED_EVENT,
  type PickSheetItemUpdatedEvent,
  type PickSheetStatusUpdatedEvent,
} from '@/lib/realtime/events/warehouse';

type PickSheetItem = {
  id: string;
  isPicked: boolean;
  quantity: number;
  pickOrder: number | null;
  pickedAt: string | null;
};

type PickSheetRecord = {
  id: string;
  sheetNumber: string;
  status: PickSheetStatus;
  pickerName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  items: PickSheetItem[];
};

type ReadyOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  totalQuantity: number;
  hasLocations: boolean;
  submittedAt: string;
};

type PickSheetCardData = {
  id: string;
  sheetNumber: string;
  status: PickSheetStatus;
  pickerName?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  totalItems: number;
  pickedItems: number;
};

export default function PickSheetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');
  const [showGenerator, setShowGenerator] = useState(false);
  const [pickSheets, setPickSheets] = useState<PickSheetRecord[]>([]);
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [warehouseChannel, setWarehouseChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyOrdersLoading, setReadyOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPickSheets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pick-sheets');
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to load pick sheets');
      }
      const data = (await response.json()) as {
        pickSheets: PickSheetRecord[];
        realtimeChannels?: { warehouse?: string | null };
      };
      setPickSheets(data.pickSheets ?? []);
      setWarehouseChannel(data.realtimeChannels?.warehouse ?? null);
      setError(null);
    } catch (err) {
      console.error('Failed to load pick sheets', err);
      setError(err instanceof Error ? err.message : 'Unable to load pick sheets');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReadyOrders = useCallback(async () => {
    setReadyOrdersLoading(true);
    try {
      const response = await fetch('/api/operations/pick-sheets/ready-orders');
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to load ready orders');
      }
      const data = (await response.json()) as { readyOrders: ReadyOrder[] };
      setReadyOrders(data.readyOrders ?? []);
    } catch (err) {
      console.error('Failed to load ready orders', err);
      toast.error(err instanceof Error ? err.message : 'Unable to load ready orders');
    } finally {
      setReadyOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetchPickSheets(), fetchReadyOrders()]);
  }, [fetchPickSheets, fetchReadyOrders]);

  const handleGeneratePickSheet = useCallback(
    async (orderIds: string[], pickerName: string) => {
      try {
        const response = await fetch('/api/pick-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds, pickerName }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? 'Failed to generate pick sheet');
        }

        toast.success('Pick sheet generated');
        setShowGenerator(false);
        await Promise.all([fetchPickSheets(), fetchReadyOrders()]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to generate pick sheet');
        throw err;
      }
    },
    [fetchPickSheets, fetchReadyOrders],
  );

  const handleExport = useCallback(async (sheetId: string, sheetNumber: string) => {
    try {
      const response = await fetch(`/api/pick-sheets/${sheetId}/export?format=csv`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to export pick sheet');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sheetNumber}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export pick sheet');
    }
  }, []);

  const handleCancel = useCallback(
    async (sheetId: string) => {
      if (!confirm('Cancel this pick sheet? Orders will return to the ready pool.')) {
        return;
      }

      try {
        const response = await fetch(`/api/pick-sheets/${sheetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? 'Failed to cancel pick sheet');
        }

        toast.success('Pick sheet cancelled');
        await Promise.all([fetchPickSheets(), fetchReadyOrders()]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel pick sheet');
      }
    },
    [fetchPickSheets, fetchReadyOrders],
  );

  const tenantChannel = useMemo(
    () => tryGetTenantChannelName(warehouseChannel),
    [warehouseChannel],
  );

  const handleItemRealtime = useCallback((event: PickSheetItemUpdatedEvent) => {
    setPickSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== event.pickSheetId) {
          return sheet;
        }
        return {
          ...sheet,
          status: event.pickSheetStatus ?? sheet.status,
          items: sheet.items.map((item) =>
            item.id === event.itemId
              ? {
                  ...item,
                  isPicked: event.isPicked,
                  pickedAt: event.pickedAt,
                }
              : item,
          ),
        };
      }),
    );
  }, []);

  const handleStatusRealtime = useCallback((event: PickSheetStatusUpdatedEvent) => {
    setPickSheets((prev) =>
      prev.map((sheet) =>
        sheet.id === event.pickSheetId
          ? {
              ...sheet,
              status: event.status,
              completedAt: event.completedAt,
            }
          : sheet,
      ),
    );
  }, []);

  useRealtimeChannel<PickSheetItemUpdatedEvent>({
    channel: tenantChannel,
    event: PICK_SHEET_ITEM_UPDATED_EVENT,
    enabled: Boolean(tenantChannel),
    handler: handleItemRealtime,
  });

  useRealtimeChannel<PickSheetStatusUpdatedEvent>({
    channel: tenantChannel,
    event: PICK_SHEET_STATUS_UPDATED_EVENT,
    enabled: Boolean(tenantChannel),
    handler: handleStatusRealtime,
  });

  const computedSheets: PickSheetCardData[] = useMemo(
    () =>
      pickSheets.map((sheet) => {
        const totalItems = sheet.items.length;
        const pickedItems = sheet.items.filter((item) => item.isPicked).length;
        return {
          id: sheet.id,
          sheetNumber: sheet.sheetNumber,
          status: sheet.status,
          pickerName: sheet.pickerName,
          createdAt: sheet.createdAt,
          startedAt: sheet.startedAt,
          completedAt: sheet.completedAt,
          totalItems,
          pickedItems,
        };
      }),
    [pickSheets],
  );

  const filteredSheets = useMemo(
    () =>
      computedSheets.filter((sheet) => {
        const matchesSearch =
          sheet.sheetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sheet.pickerName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [computedSheets, searchTerm, statusFilter],
  );

  const stats = useMemo(() => {
    const total = filteredSheets.length;
    const totalItems = filteredSheets.reduce((sum, sheet) => sum + sheet.totalItems, 0);
    const pickedItems = filteredSheets.reduce((sum, sheet) => sum + sheet.pickedItems, 0);

    return {
      total,
      totalItems,
      pickedItems,
    };
  }, [filteredSheets]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pick Sheets</h1>
          <p className="text-gray-600 mt-1">Warehouse picking management</p>
        </div>
        <Button
          onClick={() => setShowGenerator(!showGenerator)}
          size="lg"
          className="mt-4 md:mt-0 touch-target"
        >
          <Plus className="mr-2 h-5 w-5" />
          New Pick Sheet
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-semibold">Total Sheets</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-semibold">Picked Items</div>
          <div className="text-2xl font-bold mt-1">{stats.pickedItems}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm text-amber-600 font-semibold">Remaining Items</div>
          <div className="text-2xl font-bold mt-1">{stats.totalItems - stats.pickedItems}</div>
        </div>
      </div>

      {showGenerator && (
        <div className="mb-6">
          <PickSheetGenerator
            readyOrders={readyOrders}
            onGenerate={handleGeneratePickSheet}
          />
          {readyOrdersLoading && (
            <p className="mt-2 text-sm text-gray-500">Loading eligible orders…</p>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by sheet number or picker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 touch-target"
          />
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full md:w-48 touch-target">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 touch-target">
          <TabsTrigger value="all" onClick={() => setStatusFilter('all')}>
            All ({computedSheets.length})
          </TabsTrigger>
          <TabsTrigger value="READY" onClick={() => setStatusFilter('READY')}>
            Ready ({computedSheets.filter((s) => s.status === 'READY').length})
          </TabsTrigger>
          <TabsTrigger value="PICKING" onClick={() => setStatusFilter('PICKING')}>
            Picking ({computedSheets.filter((s) => s.status === 'PICKING').length})
          </TabsTrigger>
          <TabsTrigger value="PICKED" onClick={() => setStatusFilter('PICKED')}>
            Completed ({computedSheets.filter((s) => s.status === 'PICKED').length})
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" onClick={() => setStatusFilter('CANCELLED')}>
            Cancelled ({computedSheets.filter((s) => s.status === 'CANCELLED').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500">
              Loading pick sheets…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSheets.map((sheet) => (
                <PickSheetCard
                  key={sheet.id}
                  sheet={sheet}
                  onExport={(id) => handleExport(id, sheet.sheetNumber)}
                  onCancel={handleCancel}
                />
              ))}
              {filteredSheets.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-gray-500">
                  No pick sheets match the current filters.
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
