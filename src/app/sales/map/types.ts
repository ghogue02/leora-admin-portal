/**
 * Type definitions for the Sales Map feature
 */

export interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  accountType: 'ACTIVE' | 'TARGET' | 'PROSPECT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  revenue: number;
  lastOrderDate: string | null;
  phone: string;
  email?: string;
  territoryId: string | null;
  salesRepId: string | null;
}

export interface Territory {
  id: string;
  name: string;
  color: string;
  salesRepId: string | null;
  salesRepName: string | null;
  customerCount: number;
  revenue: number;
  area: number; // square miles
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  createdAt: string;
  updatedAt: string;
}

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  phone: string;
  territoryIds: string[];
  customerCount: number;
  activeCustomerCount: number;
  revenue30Days: number;
  revenue90Days: number;
}

export interface MapFilters {
  accountTypes: ('ACTIVE' | 'TARGET' | 'PROSPECT')[];
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

export type HeatMapMetric = 'revenue' | 'frequency' | 'growth' | 'conversion';

export type MapTool = 'none' | 'draw' | 'select' | 'measure';

export type MapStyle =
  | 'streets-v12'
  | 'satellite-streets-v12'
  | 'dark-v11'
  | 'light-v11';

export interface HeatMapPoint {
  type: 'Feature';
  properties: {
    revenue: number;
    orderCount: number;
    growth: number;
    conversionRate: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface HeatMapData {
  type: 'FeatureCollection';
  features: HeatMapPoint[];
}

export interface GeocodeResult {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  place_type: string[];
  text: string;
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

export interface BulkAction {
  type: 'assign-territory' | 'create-call-plan' | 'export-csv';
  customerIds: string[];
  parameters?: Record<string, any>;
}

export interface CustomerCluster {
  id: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string;
  };
}
