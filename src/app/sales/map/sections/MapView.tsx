'use client';

import { useState, useCallback, useRef } from 'react';
import Map, { NavigationControl, FullscreenControl, ScaleControl, GeolocateControl } from 'react-map-gl';
import type { MapRef, ViewState } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import CustomerMarkers from './CustomerMarkers';
import HeatMapLayer from './HeatMapLayer';
import TerritoryDrawer from './TerritoryDrawer';
import SelectionBox from '../components/SelectionBox';
import MapLegend from '../components/MapLegend';
import { MapFilters, MapLayers } from '../page';
import { Button } from '@/components/ui/button';
import { Layers, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Default viewport centered on US (customize based on your customer data)
const INITIAL_VIEW_STATE: Partial<ViewState> = {
  longitude: -95.7129,
  latitude: 37.0902,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLES = [
  { id: 'streets-v12', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite-streets-v12', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'dark-v11', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light-v11', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
];

interface MapViewProps {
  filters: MapFilters;
  layers: MapLayers;
  selectedTool: 'none' | 'draw' | 'select' | 'measure';
  onCustomerSelect: (customerIds: string[]) => void;
}

export default function MapView({ filters, layers, selectedTool, onCustomerSelect }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [mapStyle, setMapStyle] = useState(MAP_STYLES[0].url);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const handleMarkerClick = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
  }, []);

  const handleMapClick = useCallback(() => {
    if (selectedTool === 'none') {
      setSelectedCustomerId(null);
    }
  }, [selectedTool]);

  const handleSelectionComplete = useCallback((customerIds: string[]) => {
    onCustomerSelect(customerIds);
  }, [onCustomerSelect]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Mapbox Token Missing</p>
          <p className="text-sm text-gray-500 mt-2">
            Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={layers.customers ? ['customer-markers'] : []}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Customer Markers Layer */}
        {layers.customers && (
          <CustomerMarkers
            filters={filters}
            onMarkerClick={handleMarkerClick}
            selectedCustomerId={selectedCustomerId}
          />
        )}

        {/* Heat Map Layer */}
        {layers.heatMap && (
          <HeatMapLayer filters={filters} />
        )}

        {/* Territory Drawing Tool */}
        {selectedTool === 'draw' && layers.territories && (
          <TerritoryDrawer />
        )}

        {/* Selection Box Tool */}
        {selectedTool === 'select' && (
          <SelectionBox
            filters={filters}
            onSelectionComplete={handleSelectionComplete}
          />
        )}

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 z-10">
          <MapLegend layers={layers} />
        </div>

        {/* Style Selector */}
        <div className="absolute top-4 right-14 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="shadow-lg">
                <Layers className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {MAP_STYLES.map((style) => (
                <DropdownMenuItem
                  key={style.id}
                  onClick={() => setMapStyle(style.url)}
                  className={mapStyle === style.url ? 'bg-accent' : ''}
                >
                  {style.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Map>
    </div>
  );
}
