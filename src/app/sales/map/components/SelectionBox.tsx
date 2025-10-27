'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMap } from 'react-map-gl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapFilters } from '../page';
import { Download, Users, MapPin } from 'lucide-react';

interface SelectionBoxProps {
  filters: MapFilters;
  onSelectionComplete: (customerIds: string[]) => void;
}

interface BoxCoordinates {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export default function SelectionBox({ filters, onSelectionComplete }: SelectionBoxProps) {
  const { current: map } = useMap();
  const [isDrawing, setIsDrawing] = useState(false);
  const [box, setBox] = useState<BoxCoordinates | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    if (!map) return;

    const canvas = map.getCanvasContainer();
    let startX = 0;
    let startY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      startX = e.clientX;
      startY = e.clientY;
      setIsDrawing(true);
      setBox({ startX, startY, endX: startX, endY: startY });

      // Prevent map interaction while drawing
      map.dragPan.disable();
      canvas.style.cursor = 'crosshair';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;

      setBox({
        startX,
        startY,
        endX: e.clientX,
        endY: e.clientY,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDrawing) return;

      const endX = e.clientX;
      const endY = e.clientY;

      // Calculate bounds
      const bounds = {
        minX: Math.min(startX, endX),
        minY: Math.min(startY, endY),
        maxX: Math.max(startX, endX),
        maxY: Math.max(startY, endY),
      };

      // Convert screen coordinates to map coordinates
      const sw = map.unproject([bounds.minX, bounds.maxY]);
      const ne = map.unproject([bounds.maxX, bounds.minY]);

      // TODO: Query customers within bounds
      // For now, simulate selection
      const count = Math.floor(Math.random() * 50) + 10;
      setSelectedCount(count);

      // Simulate customer IDs
      const customerIds = Array.from({ length: count }, (_, i) => `customer-${i}`);
      onSelectionComplete(customerIds);

      // Reset
      setIsDrawing(false);
      setBox(null);
      map.dragPan.enable();
      canvas.style.cursor = '';
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      map.dragPan.enable();
      canvas.style.cursor = '';
    };
  }, [map, isDrawing, onSelectionComplete]);

  const handleExportCsv = () => {
    // TODO: Export selected customers to CSV
    console.log('Exporting selected customers to CSV');
  };

  const handleAssignTerritory = () => {
    // TODO: Open dialog to assign territory
    console.log('Assigning territory to selected customers');
  };

  const handleCreateCallPlan = () => {
    // TODO: Create call plan for selected customers
    console.log('Creating call plan for selected customers');
  };

  return (
    <>
      {/* Selection Box Overlay */}
      {box && isDrawing && (
        <div
          className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-50"
          style={{
            left: Math.min(box.startX, box.endX),
            top: Math.min(box.startY, box.endY),
            width: Math.abs(box.endX - box.startX),
            height: Math.abs(box.endY - box.startY),
          }}
        />
      )}

      {/* Instructions Card */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-center">
              {isDrawing
                ? 'Release to select customers in the box'
                : 'Click and drag to draw a selection box'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Selected Customers Panel */}
      {selectedCount > 0 && !isDrawing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-96 max-w-full">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Selected Customers
                </span>
                <Badge variant="secondary">{selectedCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={handleAssignTerritory}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Assign to Territory
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={handleCreateCallPlan}
              >
                <Users className="h-4 w-4 mr-2" />
                Create Call Plan
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={handleExportCsv}
              >
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
