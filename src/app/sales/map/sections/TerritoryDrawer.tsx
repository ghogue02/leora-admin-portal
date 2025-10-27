'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Territory {
  id: string;
  name: string;
  color: string;
  salesRepId: string | null;
  geometry: any;
  customerCount?: number;
}

const TERRITORY_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#f97316', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#ec4899', label: 'Pink' },
];

export default function TerritoryDrawer() {
  const { current: map } = useMap();
  const drawRef = useRef<MapboxDraw | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<any>(null);
  const [territoryName, setTerritoryName] = useState('');
  const [territoryColor, setTerritoryColor] = useState(TERRITORY_COLORS[0].value);
  const [assignedRep, setAssignedRep] = useState<string>('');
  const [customerCount, setCustomerCount] = useState(0);

  // Initialize MapboxDraw
  useEffect(() => {
    if (!map || drawRef.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'draw_polygon',
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': territoryColor,
            'fill-opacity': 0.3,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': territoryColor,
            'line-width': 3,
          },
        },
        // Vertex points
        {
          id: 'gl-draw-polygon-vertex',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#fff',
            'circle-stroke-color': territoryColor,
            'circle-stroke-width': 2,
          },
        },
      ],
    });

    map.addControl(draw, 'top-left');
    drawRef.current = draw;

    // Event handlers
    const handleCreate = (e: any) => {
      const polygon = e.features[0];
      setCurrentPolygon(polygon);

      // Calculate customer count inside polygon
      // TODO: Implement actual customer count calculation
      setCustomerCount(Math.floor(Math.random() * 100));

      setShowSaveDialog(true);
    };

    const handleUpdate = (e: any) => {
      const polygon = e.features[0];
      setCurrentPolygon(polygon);

      // Recalculate customer count
      setCustomerCount(Math.floor(Math.random() * 100));
    };

    map.on('draw.create', handleCreate);
    map.on('draw.update', handleUpdate);

    return () => {
      if (map && drawRef.current) {
        map.off('draw.create', handleCreate);
        map.off('draw.update', handleUpdate);
        map.removeControl(drawRef.current);
        drawRef.current = null;
      }
    };
  }, [map, territoryColor]);

  const handleSaveTerritory = useCallback(async () => {
    if (!currentPolygon || !territoryName) return;

    try {
      const territory: Territory = {
        id: `territory-${Date.now()}`,
        name: territoryName,
        color: territoryColor,
        salesRepId: assignedRep || null,
        geometry: currentPolygon.geometry,
        customerCount,
      };

      // TODO: Save to API
      // await fetch('/api/territories', {
      //   method: 'POST',
      //   body: JSON.stringify(territory),
      // });

      console.log('Territory saved:', territory);

      // Reset form
      setTerritoryName('');
      setAssignedRep('');
      setShowSaveDialog(false);
      setCurrentPolygon(null);

      // Clear drawing
      if (drawRef.current) {
        drawRef.current.deleteAll();
      }
    } catch (error) {
      console.error('Error saving territory:', error);
    }
  }, [currentPolygon, territoryName, territoryColor, assignedRep, customerCount]);

  const handleCancel = useCallback(() => {
    setShowSaveDialog(false);
    setTerritoryName('');
    setAssignedRep('');
    setCurrentPolygon(null);

    // Clear drawing
    if (drawRef.current) {
      drawRef.current.deleteAll();
    }
  }, []);

  return (
    <>
      {/* Save Territory Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Territory</DialogTitle>
            <DialogDescription>
              Define territory details and assign to a sales representative.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="territory-name">Territory Name</Label>
              <Input
                id="territory-name"
                placeholder="e.g., North Region, Downtown District"
                value={territoryName}
                onChange={(e) => setTerritoryName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="territory-color">Color</Label>
              <Select value={territoryColor} onValueChange={setTerritoryColor}>
                <SelectTrigger id="territory-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERRITORY_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned-rep">Assign to Sales Rep</Label>
              <Select value={assignedRep} onValueChange={setAssignedRep}>
                <SelectTrigger id="assigned-rep">
                  <SelectValue placeholder="Select sales rep..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rep-1">John Smith</SelectItem>
                  <SelectItem value="rep-2">Jane Doe</SelectItem>
                  <SelectItem value="rep-3">Bob Johnson</SelectItem>
                  <SelectItem value="rep-4">Alice Williams</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Customers in Territory: {customerCount}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This count will be updated when you save the territory.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveTerritory} disabled={!territoryName}>
              Save Territory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
