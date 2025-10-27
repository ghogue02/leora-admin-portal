'use client';

import { useState } from 'react';
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

// Mock data - replace with actual API calls
const mockPickSheets = [
  {
    id: '1',
    sheetNumber: 'PS-2024-001',
    status: 'PICKING' as const,
    pickerName: 'John Smith',
    createdAt: '2024-01-15T08:00:00Z',
    startedAt: '2024-01-15T08:30:00Z',
    totalItems: 24,
    pickedItems: 18,
  },
  {
    id: '2',
    sheetNumber: 'PS-2024-002',
    status: 'READY' as const,
    pickerName: 'Sarah Johnson',
    createdAt: '2024-01-15T09:00:00Z',
    totalItems: 15,
    pickedItems: 0,
  },
  {
    id: '3',
    sheetNumber: 'PS-2024-003',
    status: 'PICKED' as const,
    pickerName: 'Mike Davis',
    createdAt: '2024-01-14T14:00:00Z',
    startedAt: '2024-01-14T14:30:00Z',
    completedAt: '2024-01-14T16:45:00Z',
    totalItems: 32,
    pickedItems: 32,
  },
];

const mockReadyOrders = [
  {
    id: '1',
    orderNumber: 'SO-2024-045',
    customerName: 'ABC Corp',
    itemCount: 8,
    totalQuantity: 24,
    hasLocations: true,
    submittedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    orderNumber: 'SO-2024-046',
    customerName: 'XYZ Inc',
    itemCount: 5,
    totalQuantity: 12,
    hasLocations: true,
    submittedAt: '2024-01-15T10:15:00Z',
  },
  {
    id: '3',
    orderNumber: 'SO-2024-047',
    customerName: 'Tech Solutions',
    itemCount: 12,
    totalQuantity: 36,
    hasLocations: false,
    submittedAt: '2024-01-15T10:30:00Z',
  },
];

export default function PickSheetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');
  const [showGenerator, setShowGenerator] = useState(false);

  const handleGeneratePickSheet = async (orderIds: string[], pickerName: string) => {
    // TODO: Implement actual API call
    console.log('Generating pick sheet:', { orderIds, pickerName });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setShowGenerator(false);
  };

  const handleExport = (sheetId: string) => {
    toast.success(`Exporting pick sheet ${sheetId}`);
    // TODO: Implement export
  };

  const handleCancel = (sheetId: string) => {
    toast.success(`Cancelled pick sheet ${sheetId}`);
    // TODO: Implement cancel
  };

  // Filter pick sheets
  const filteredSheets = mockPickSheets.filter(sheet => {
    const matchesSearch = sheet.sheetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sheet.pickerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const stats = {
    total: filteredSheets.length,
    totalItems: filteredSheets.reduce((sum, s) => sum + s.totalItems, 0),
    pickedItems: filteredSheets.reduce((sum, s) => sum + s.pickedItems, 0),
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
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

      {/* Summary Stats */}
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

      {/* Pick Sheet Generator */}
      {showGenerator && (
        <div className="mb-6">
          <PickSheetGenerator
            readyOrders={mockReadyOrders}
            onGenerate={handleGeneratePickSheet}
          />
        </div>
      )}

      {/* Filters */}
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

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 touch-target">
          <TabsTrigger value="all" onClick={() => setStatusFilter('all')}>
            All ({mockPickSheets.length})
          </TabsTrigger>
          <TabsTrigger value="READY" onClick={() => setStatusFilter('READY')}>
            Ready ({mockPickSheets.filter(s => s.status === 'READY').length})
          </TabsTrigger>
          <TabsTrigger value="PICKING" onClick={() => setStatusFilter('PICKING')}>
            Picking ({mockPickSheets.filter(s => s.status === 'PICKING').length})
          </TabsTrigger>
          <TabsTrigger value="PICKED" onClick={() => setStatusFilter('PICKED')}>
            Completed ({mockPickSheets.filter(s => s.status === 'PICKED').length})
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" onClick={() => setStatusFilter('CANCELLED')}>
            Cancelled ({mockPickSheets.filter(s => s.status === 'CANCELLED').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter === 'all' ? 'all' : statusFilter} className="space-y-4">
          {filteredSheets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No pick sheets found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSheets.map((sheet) => (
                <PickSheetCard
                  key={sheet.id}
                  sheet={sheet}
                  onExport={handleExport}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
