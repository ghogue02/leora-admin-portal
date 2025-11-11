'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  X,
  Layers,
  Filter,
  MapPin,
  Square,
  Ruler,
  Users,
  DollarSign,
  TrendingUp,
  Navigation,
  Route as RouteIcon,
} from 'lucide-react';
import MapFilters from '../components/MapFilters';
import WhosClosest from '../components/WhosClosest';
import RoutePlanner from '../components/RoutePlanner';
import { MapFilters as MapFiltersType, MapLayers } from '../page';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface MapSidebarProps {
  filters: MapFiltersType;
  layers: MapLayers;
  selectedTool: 'none' | 'draw' | 'select' | 'measure';
  selectedCustomers: string[];
  onFilterChange: (filters: Partial<MapFiltersType>) => void;
  onLayerToggle: (layer: keyof MapLayers) => void;
  onToolChange: (tool: 'none' | 'draw' | 'select' | 'measure') => void;
  onClose: () => void;
}

export default function MapSidebar({
  filters,
  layers,
  selectedTool,
  selectedCustomers,
  onFilterChange,
  onLayerToggle,
  onToolChange,
  onClose,
}: MapSidebarProps) {
  const [activeTab, setActiveTab] = useState('layers');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-bold">Map Controls</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 mx-4 mt-4">
          <TabsTrigger value="layers" className="text-xs">
            <Layers className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="filters" className="text-xs">
            <Filter className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="tools" className="text-xs">
            <Square className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="closest" className="text-xs">
            <Navigation className="h-3 w-3" />
          </TabsTrigger>
          <TabsTrigger value="route" className="text-xs">
            <RouteIcon className="h-3 w-3" />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Layers Tab */}
          <TabsContent value="layers" className="p-4 space-y-4 mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Map Layers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="layer-customers" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Customer Markers
                  </Label>
                  <Switch
                    id="layer-customers"
                    checked={layers.customers}
                    onCheckedChange={() => onLayerToggle('customers')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="layer-heatmap" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Heat Map
                  </Label>
                  <Switch
                    id="layer-heatmap"
                    checked={layers.heatMap}
                    onCheckedChange={() => onLayerToggle('heatMap')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="layer-territories" className="flex items-center gap-2">
                    <Square className="h-4 w-4" />
                    Territories
                  </Label>
                  <Switch
                    id="layer-territories"
                    checked={layers.territories}
                    onCheckedChange={() => onLayerToggle('territories')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Customers</span>
                  <Badge variant="secondary">4,838</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <Badge className="bg-green-500">2,891</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <Badge className="bg-yellow-500">1,247</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Prospect</span>
                  <Badge className="bg-gray-400">700</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Total Revenue
                  </span>
                  <span className="text-sm font-bold">$24.5M</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Filters Tab */}
          <TabsContent value="filters" className="p-4 mt-0">
            <MapFilters filters={filters} onFilterChange={onFilterChange} />
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="p-4 space-y-4 mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Drawing & Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={selectedTool === 'draw' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => onToolChange(selectedTool === 'draw' ? 'none' : 'draw')}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Draw Territory
                </Button>

                <Button
                  variant={selectedTool === 'select' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => onToolChange(selectedTool === 'select' ? 'none' : 'select')}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Box Selection
                </Button>

                <Button
                  variant={selectedTool === 'measure' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => onToolChange(selectedTool === 'measure' ? 'none' : 'measure')}
                >
                  <Ruler className="h-4 w-4 mr-2" />
                  Measure Distance
                </Button>
              </CardContent>
            </Card>

            {selectedCustomers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Selected Customers ({selectedCustomers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Assign Territory
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    Create Call Plan
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    Export to CSV
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Who's Closest Tab */}
          <TabsContent value="closest" className="p-4 mt-0">
            <WhosClosest
              onCustomerSelect={(ids) => console.log('Add to call plan:', ids)}
              onShowOnMap={(customers) => console.log('Show on map:', customers)}
            />
          </TabsContent>

          {/* Route Planner Tab */}
          <TabsContent value="route" className="p-4 mt-0">
            <RoutePlanner
              selectedCustomers={selectedCustomers}
              onRouteGenerated={(route) => console.log('Route generated:', route)}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
