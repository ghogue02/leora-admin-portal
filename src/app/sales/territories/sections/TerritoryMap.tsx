"use client";

import { useEffect, useRef, useState } from "react";
import { type Territory } from "../page";
import TerritoryStats from "../components/TerritoryStats";
import dynamic from "next/dynamic";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface TerritoryMapProps {
  territories: Territory[];
  selectedTerritory: Territory | null;
  onSelectTerritory: (territory: Territory | null) => void;
  onEditTerritory: (territory: Territory) => void;
}

export default function TerritoryMap({
  territories,
  selectedTerritory,
  onSelectTerritory,
  onEditTerritory,
}: TerritoryMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getOpacityByRevenue = (territory: Territory) => {
    if (territories.length === 0) return 0.6;

    const maxRevenue = Math.max(...territories.map((t) => t.revenue30Days));
    if (maxRevenue === 0) return 0.3;

    const revenueRatio = territory.revenue30Days / maxRevenue;
    return 0.3 + revenueRatio * 0.5; // Range: 0.3 to 0.8
  };

  // Calculate center point from all territories
  const getMapCenter = () => {
    if (territories.length === 0) {
      return { lat: 37.7749, lng: -122.4194 }; // Default to SF
    }

    const allPoints = territories.flatMap((t) => t.boundary);
    if (allPoints.length === 0) {
      return { lat: 37.7749, lng: -122.4194 };
    }

    const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;

    return { lat: avgLat, lng: avgLng };
  };

  const center = getMapCenter();

  if (!isMounted) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading map...</p>
      </div>
    );
  }

  if (territories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No territories to display</h3>
        <p className="text-gray-600">Create territories to see them on the map</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="h-[600px] relative">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {territories.map((territory) => {
              if (territory.boundary.length < 3) return null;

              const positions = territory.boundary.map((point) => [
                point.lat,
                point.lng,
              ]);

              const opacity = getOpacityByRevenue(territory);
              const isSelected = selectedTerritory?.id === territory.id;

              return (
                <Polygon
                  key={territory.id}
                  positions={positions as any}
                  pathOptions={{
                    color: territory.color,
                    fillColor: territory.color,
                    fillOpacity: isSelected ? 0.8 : opacity,
                    weight: isSelected ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => onSelectTerritory(territory),
                    mouseover: (e) => {
                      e.target.setStyle({ weight: 3 });
                    },
                    mouseout: (e) => {
                      if (!isSelected) {
                        e.target.setStyle({ weight: 2 });
                      }
                    },
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {territory.name}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customers:</span>
                          <span className="font-medium">{territory.customerCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sales Rep:</span>
                          <span className="font-medium">
                            {territory.salesRepName || "Unassigned"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">30-Day Revenue:</span>
                          <span className="font-medium">
                            ${territory.revenue30Days.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onEditTerritory(territory)}
                        className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Edit Territory
                      </button>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Legend */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Map Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-blue-600 rounded opacity-80"></div>
              <span className="text-gray-700">High Revenue</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-blue-600 rounded opacity-40"></div>
              <span className="text-gray-700">Low Revenue</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Opacity indicates 30-day revenue performance
            </div>
          </div>
        </div>

        {/* Selected Territory Stats */}
        {selectedTerritory ? (
          <TerritoryStats
            territory={selectedTerritory}
            onEdit={() => onEditTerritory(selectedTerritory)}
            onClose={() => onSelectTerritory(null)}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500">
              Click on a territory to view details
            </p>
          </div>
        )}

        {/* All Territories List */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            All Territories ({territories.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {territories.map((territory) => (
              <button
                key={territory.id}
                onClick={() => onSelectTerritory(territory)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedTerritory?.id === territory.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: territory.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {territory.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {territory.customerCount} customers
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
