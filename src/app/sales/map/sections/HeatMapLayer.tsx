'use client';

import { useMemo, useState, useEffect } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { HeatmapLayer } from 'react-map-gl/maplibre';
import { MapFilters } from '../page';

interface HeatMapLayerProps {
  filters: MapFilters;
  metric?: 'revenue' | 'frequency' | 'growth' | 'conversion';
  intensity?: number;
}

interface CustomerHeatPoint {
  type: 'Feature';
  properties: {
    revenue: number;
    orderCount: number;
    growth: number;
    conversionRate: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface HeatMapData {
  type: 'FeatureCollection';
  features: CustomerHeatPoint[];
}

// Mock data generator - Replace with actual API call
const generateHeatMapData = (): HeatMapData => {
  const features: CustomerHeatPoint[] = [];

  // Generate 500 heat points for demo
  for (let i = 0; i < 500; i++) {
    features.push({
      type: 'Feature',
      properties: {
        revenue: Math.random() * 100000,
        orderCount: Math.floor(Math.random() * 50),
        growth: Math.random() * 2 - 0.5, // -50% to +150%
        conversionRate: Math.random(),
      },
      geometry: {
        type: 'Point',
        coordinates: [
          -95.7129 + (Math.random() - 0.5) * 20,
          37.0902 + (Math.random() - 0.5) * 10,
        ],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
};

export default function HeatMapLayer({
  filters,
  metric = 'revenue',
  intensity = 0.5
}: HeatMapLayerProps) {
  const [heatMapData, setHeatMapData] = useState<HeatMapData | null>(null);

  useEffect(() => {
    const fetchHeatMapData = async () => {
      try {
        // Get tenantId
        const tenantId = localStorage.getItem('tenantId') || process.env.NEXT_PUBLIC_TENANT_ID;

        if (!tenantId) {
          console.error('Tenant ID not found');
          const data = generateHeatMapData();
          setHeatMapData(data);
          return;
        }

        const response = await fetch('/api/maps/heatmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, filters, metric }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch heat map data');
        }

        const data = await response.json();
        setHeatMapData(data);
      } catch (error) {
        console.error('Error fetching heat map data:', error);
        // Fallback to mock data
        const data = generateHeatMapData();
        setHeatMapData(data);
      }
    };

    fetchHeatMapData();
  }, [filters, metric]);

  // Get metric property for weight
  const metricProperty = useMemo(() => {
    switch (metric) {
      case 'revenue':
        return 'revenue';
      case 'frequency':
        return 'orderCount';
      case 'growth':
        return 'growth';
      case 'conversion':
        return 'conversionRate';
      default:
        return 'revenue';
    }
  }, [metric]);

  // Heatmap layer configuration
  const heatmapLayer: HeatmapLayer = useMemo(() => ({
    id: 'heatmap',
    type: 'heatmap',
    paint: {
      // Increase weight as value increases
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', metricProperty],
        0,
        0,
        100000,
        1,
      ],
      // Increase intensity as zoom level increases
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        intensity,
        9,
        intensity * 2,
      ],
      // Color ramp for heatmap (cold to hot)
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgb(103,169,207)',
        0.4,
        'rgb(209,229,240)',
        0.6,
        'rgb(253,219,199)',
        0.8,
        'rgb(239,138,98)',
        1,
        'rgb(178,24,43)',
      ],
      // Adjust the heatmap radius by zoom level
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        2,
        9,
        20,
        14,
        40,
      ],
      // Transition from heatmap to circle layer by zoom level
      'heatmap-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        7,
        0.8,
        14,
        0.4,
      ],
    },
  }), [metricProperty, intensity]);

  if (!heatMapData) {
    return null;
  }

  return (
    <Source
      id="heatmap-source"
      type="geojson"
      data={heatMapData}
    >
      <Layer {...heatmapLayer} />
    </Source>
  );
}
