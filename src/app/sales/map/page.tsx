'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Menu, X } from 'lucide-react';
import MapSidebar from './sections/MapSidebar';

// Dynamic import to avoid SSR issues with Mapbox
const MapView = dynamic(() => import('./sections/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

export interface MapFilters {
  accountTypes: string[];
  territories: string[];
  salesReps: string[];
  searchQuery: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

export interface MapLayers {
  customers: boolean;
  heatMap: boolean;
  territories: boolean;
}

export default function MapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<MapFilters>({
    accountTypes: ['ACTIVE', 'TARGET', 'PROSPECT'],
    territories: [],
    salesReps: [],
    searchQuery: '',
    dateRange: {
      start: null,
      end: null,
    },
  });
  const [layers, setLayers] = useState<MapLayers>({
    customers: true,
    heatMap: false,
    territories: true,
  });
  const [selectedTool, setSelectedTool] = useState<'none' | 'draw' | 'select' | 'measure'>('none');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const handleFilterChange = useCallback((newFilters: Partial<MapFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleLayerToggle = useCallback((layer: keyof MapLayers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleToolChange = useCallback((tool: typeof selectedTool) => {
    setSelectedTool(tool);
  }, []);

  const handleCustomerSelect = useCallback((customerIds: string[]) => {
    setSelectedCustomers(customerIds);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Sales Map</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:relative
            z-20 lg:z-auto
            w-80 lg:w-96
            h-full
            transition-transform duration-300
            bg-white border-r
            overflow-y-auto
          `}
        >
          <MapSidebar
            filters={filters}
            layers={layers}
            selectedTool={selectedTool}
            selectedCustomers={selectedCustomers}
            onFilterChange={handleFilterChange}
            onLayerToggle={handleLayerToggle}
            onToolChange={handleToolChange}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapView
            filters={filters}
            layers={layers}
            selectedTool={selectedTool}
            onCustomerSelect={handleCustomerSelect}
          />

          {/* Desktop Toggle Button */}
          {!sidebarOpen && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 left-4 z-10 shadow-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
