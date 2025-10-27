'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapLayers } from '../page';
import { MapPin, TrendingUp } from 'lucide-react';

interface MapLegendProps {
  layers: MapLayers;
}

export default function MapLegend({ layers }: MapLegendProps) {
  const hasVisibleLayers = layers.customers || layers.heatMap;

  if (!hasVisibleLayers) {
    return null;
  }

  return (
    <Card className="shadow-lg max-w-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Markers Legend */}
        {layers.customers && (
          <div className="space-y-2">
            <div className="font-medium text-xs text-muted-foreground flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Customer Markers
            </div>
            <div className="space-y-1.5 pl-5">
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-4 w-4" style={{ color: '#22c55e' }} fill="#22c55e" />
                <span>Active Customer</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-4 w-4" style={{ color: '#eab308' }} fill="#eab308" />
                <span>Target Account</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-4 w-4" style={{ color: '#94a3b8' }} fill="#94a3b8" />
                <span>Prospect</span>
              </div>
            </div>
            <div className="space-y-1.5 pl-5">
              <div className="text-xs text-muted-foreground">Marker Size:</div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-6 w-6 text-gray-400" />
                <span>High Revenue (&gt;$50k)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span>Medium Revenue ($20k-$50k)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>Low Revenue (&lt;$20k)</span>
              </div>
            </div>
          </div>
        )}

        {/* Heat Map Legend */}
        {layers.heatMap && (
          <div className="space-y-2">
            <div className="font-medium text-xs text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Heat Map Intensity
            </div>
            <div className="pl-5">
              <div className="h-4 rounded overflow-hidden flex">
                <div className="flex-1 bg-[rgb(33,102,172)]" />
                <div className="flex-1 bg-[rgb(103,169,207)]" />
                <div className="flex-1 bg-[rgb(209,229,240)]" />
                <div className="flex-1 bg-[rgb(253,219,199)]" />
                <div className="flex-1 bg-[rgb(239,138,98)]" />
                <div className="flex-1 bg-[rgb(178,24,43)]" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        )}

        {/* Territory Legend */}
        {layers.territories && (
          <div className="space-y-2">
            <div className="font-medium text-xs text-muted-foreground">Territories</div>
            <div className="space-y-1.5 pl-5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-3 border-2 border-blue-500 bg-blue-500/30 rounded-sm" />
                <span>Defined Territory</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                <span>Boundary Vertex</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
