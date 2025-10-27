'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Calendar } from 'lucide-react';
import { ExportDialog } from './components/ExportDialog';
import { RouteViewer } from './components/RouteViewer';
import { TodayRoutes } from './components/TodayRoutes';
import { toast } from 'sonner';

// Mock data - replace with actual API calls
const mockReadyOrders = [
  {
    id: '1',
    orderNumber: 'SO-2024-045',
    customerName: 'ABC Corp',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    territory: 'North',
  },
  {
    id: '2',
    orderNumber: 'SO-2024-046',
    customerName: 'XYZ Inc',
    address: '456 Market St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    territory: 'North',
  },
  {
    id: '3',
    orderNumber: 'SO-2024-047',
    customerName: 'Tech Solutions',
    address: '789 Howard St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94103',
    territory: 'South',
  },
];

const mockTodayRoutes = [
  {
    id: '1',
    name: 'Route 1',
    driver: 'John Smith',
    driverPhone: '+1-555-0101',
    truck: 'Truck A',
    status: 'in_progress' as const,
    totalStops: 8,
    completedStops: 3,
    currentStop: 'ABC Corp',
  },
  {
    id: '2',
    name: 'Route 2',
    driver: 'John Smith',
    driverPhone: '+1-555-0101',
    truck: 'Truck A',
    status: 'not_started' as const,
    totalStops: 6,
    completedStops: 0,
  },
  {
    id: '3',
    name: 'Route 3',
    driver: 'Sarah Johnson',
    driverPhone: '+1-555-0102',
    truck: 'Truck B',
    status: 'completed' as const,
    totalStops: 10,
    completedStops: 10,
  },
];

const mockRoute = {
  id: '1',
  name: 'Route 1',
  driver: 'John Smith',
  truck: 'Truck A',
  stops: [
    {
      id: '1',
      sequence: 1,
      orderNumber: 'SO-2024-045',
      customerName: 'ABC Corp',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      deliveryInstructions: 'Ring doorbell twice',
      estimatedArrival: '2024-01-15T09:00:00Z',
      status: 'completed' as const,
      itemCount: 5,
    },
    {
      id: '2',
      sequence: 2,
      orderNumber: 'SO-2024-046',
      customerName: 'XYZ Inc',
      address: '456 Market St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      deliveryInstructions: 'Use loading dock',
      estimatedArrival: '2024-01-15T10:00:00Z',
      status: 'in_progress' as const,
      itemCount: 8,
    },
    {
      id: '3',
      sequence: 3,
      orderNumber: 'SO-2024-047',
      customerName: 'Tech Solutions',
      address: '789 Howard St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94103',
      estimatedArrival: '2024-01-15T11:00:00Z',
      status: 'pending' as const,
      itemCount: 3,
    },
  ],
};

export default function RoutingPage() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('today');

  const handleContactDriver = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleViewRoute = (routeId: string) => {
    setSelectedTab('routes');
    toast.info(`Viewing route ${routeId}`);
  };

  const handleUploadRoutes = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        toast.success(`Uploading ${file.name}...`);
        // TODO: Implement route upload
      }
    };
    input.click();
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Delivery Routing</h1>
          <p className="text-gray-600 mt-1">Export to Azuga and manage delivery routes</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button
            onClick={() => setShowExportDialog(true)}
            size="lg"
            className="touch-target"
          >
            <Download className="mr-2 h-5 w-5" />
            Export to Azuga
          </Button>
          <Button
            onClick={handleUploadRoutes}
            variant="outline"
            size="lg"
            className="touch-target"
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload Routes
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-semibold">Ready for Export</div>
          <div className="text-2xl font-bold mt-1">{mockReadyOrders.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-semibold">Active Routes</div>
          <div className="text-2xl font-bold mt-1">
            {mockTodayRoutes.filter(r => r.status === 'in_progress').length}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm text-amber-600 font-semibold">Pending</div>
          <div className="text-2xl font-bold mt-1">
            {mockTodayRoutes.filter(r => r.status === 'not_started').length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-semibold">Completed</div>
          <div className="text-2xl font-bold mt-1">
            {mockTodayRoutes.filter(r => r.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 touch-target">
          <TabsTrigger value="today">
            <Calendar className="mr-2 h-4 w-4" />
            Today's Routes
          </TabsTrigger>
          <TabsTrigger value="routes">Route Details</TabsTrigger>
          <TabsTrigger value="export">Ready to Export</TabsTrigger>
        </TabsList>

        {/* Today's Routes */}
        <TabsContent value="today">
          <TodayRoutes
            routes={mockTodayRoutes}
            onContactDriver={handleContactDriver}
            onViewRoute={handleViewRoute}
          />
        </TabsContent>

        {/* Route Details */}
        <TabsContent value="routes">
          <RouteViewer route={mockRoute} />
        </TabsContent>

        {/* Ready to Export */}
        <TabsContent value="export">
          <div className="space-y-4">
            {mockReadyOrders.map((order) => (
              <div key={order.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{order.orderNumber}</div>
                    <div className="text-sm text-gray-600 mt-1">{order.customerName}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {order.address}, {order.city}, {order.state} {order.zip}
                    </div>
                  </div>
                  {order.territory && (
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {order.territory}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        orders={mockReadyOrders}
      />
    </div>
  );
}
