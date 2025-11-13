'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Calendar } from 'lucide-react';
import { ResponsiveCard } from '@/components/ui/responsive-card';
import { ExportDialog } from './components/ExportDialog';
import { RouteViewer } from './components/RouteViewer';
import { TodayRoutes } from './components/TodayRoutes';
import { toast } from 'sonner';

// TODO: replace mocks with API data
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
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (file) {
        toast.success(`Uploading ${file.name}...`);
      }
    };
    input.click();
  };

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Operations
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Delivery routing</h1>
          <p className="text-sm text-gray-600">
            Export routes to Azuga, manage daily assignments, and monitor progress.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowExportDialog(true)} size="lg" className="touch-target">
            <Download className="mr-2 h-5 w-5" />
            Export to Azuga
          </Button>
          <Button onClick={handleUploadRoutes} variant="outline" size="lg" className="touch-target">
            <Upload className="mr-2 h-5 w-5" />
            Upload Routes
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ResponsiveCard className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Ready for Export</p>
          <p className="text-2xl font-bold text-gray-900">{mockReadyOrders.length}</p>
        </ResponsiveCard>
        <ResponsiveCard className="border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-green-600">Active Routes</p>
          <p className="text-2xl font-bold text-gray-900">
            {mockTodayRoutes.filter((r) => r.status === 'in_progress').length}
          </p>
        </ResponsiveCard>
        <ResponsiveCard className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-amber-600">Pending</p>
          <p className="text-2xl font-bold text-gray-900">
            {mockTodayRoutes.filter((r) => r.status === 'not_started').length}
          </p>
        </ResponsiveCard>
        <ResponsiveCard className="border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-purple-600">Completed</p>
          <p className="text-2xl font-bold text-gray-900">
            {mockTodayRoutes.filter((r) => r.status === 'completed').length}
          </p>
        </ResponsiveCard>
      </section>

      <ResponsiveCard className="p-4 shadow-sm">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 touch-target">
            <TabsTrigger value="today">
              <Calendar className="mr-2 h-4 w-4" />
              Today&apos;s Routes
            </TabsTrigger>
            <TabsTrigger value="routes">Route Details</TabsTrigger>
            <TabsTrigger value="export">Ready to Export</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <TodayRoutes
              routes={mockTodayRoutes}
              onContactDriver={handleContactDriver}
              onViewRoute={handleViewRoute}
            />
          </TabsContent>

          <TabsContent value="routes">
            <RouteViewer route={mockRoute} />
          </TabsContent>

          <TabsContent value="export">
            <div className="space-y-4">
              {mockReadyOrders.map((order) => (
                <ResponsiveCard key={order.id} className="border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-sm text-gray-500">
                        {order.address}, {order.city}, {order.state} {order.zip}
                      </p>
                    </div>
                    {order.territory && (
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {order.territory}
                      </span>
                    )}
                  </div>
                </ResponsiveCard>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </ResponsiveCard>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        orders={mockReadyOrders}
      />
    </main>
  );
}
