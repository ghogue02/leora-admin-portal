"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

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
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const useMapEvents = dynamic(
  () => import("react-leaflet").then((mod) => mod.useMapEvents),
  { ssr: false }
);

interface BoundaryDrawerProps {
  boundary: Array<{ lat: number; lng: number }>;
  onChange: (boundary: Array<{ lat: number; lng: number }>) => void;
  color: string;
  onCustomerCountChange?: (count: number) => void;
}

export default function BoundaryDrawer({
  boundary,
  onChange,
  color,
  onCustomerCountChange,
}: BoundaryDrawerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [customersInBoundary, setCustomersInBoundary] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate customers in boundary whenever boundary changes
  useEffect(() => {
    if (boundary.length >= 3) {
      calculateCustomersInBoundary();
    } else {
      setCustomersInBoundary(0);
      onCustomerCountChange?.(0);
    }
  }, [boundary]);

  const calculateCustomersInBoundary = useCallback(async () => {
    try {
      // Create a polygon from boundary
      const polygonCoords = boundary.map((p) => [p.lng, p.lat]);
      polygonCoords.push(polygonCoords[0]); // Close the polygon

      const turfPolygon = polygon([polygonCoords]);

      // Fetch customers with coordinates
      const response = await fetch("/api/sales/customers?hasCoordinates=true");
      if (!response.ok) return;

      const data = await response.json();
      const customers = data.customers || [];

      // Count customers inside polygon
      const count = customers.filter((customer: any) => {
        if (!customer.latitude || !customer.longitude) return false;

        const customerPoint = point([customer.longitude, customer.latitude]);
        return booleanPointInPolygon(customerPoint, turfPolygon);
      }).length;

      setCustomersInBoundary(count);
      onCustomerCountChange?.(count);
    } catch (err) {
      console.error("Error calculating customers in boundary:", err);
    }
  }, [boundary, onCustomerCountChange]);

  const handleClearBoundary = () => {
    onChange([]);
    setIsDrawing(false);
  };

  const handleUndoLastPoint = () => {
    if (boundary.length > 0) {
      onChange(boundary.slice(0, -1));
    }
  };

  const handleDeleteVertex = (index: number) => {
    const newBoundary = boundary.filter((_, i) => i !== index);
    onChange(newBoundary);
  };

  if (!isMounted) {
    return (
      <div className="bg-gray-100 rounded-lg h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDrawing
                ? "bg-blue-600 text-white"
                : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
            }`}
          >
            {isDrawing ? "Drawing..." : "Start Drawing"}
          </button>
          <button
            onClick={handleUndoLastPoint}
            disabled={boundary.length === 0}
            className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Undo Last
          </button>
          <button
            onClick={handleClearBoundary}
            disabled={boundary.length === 0}
            className="px-4 py-2 bg-white text-red-600 rounded-lg border border-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>

        <div className="text-sm">
          <span className="text-gray-700 font-medium">
            {boundary.length} {boundary.length === 1 ? "point" : "points"}
          </span>
          {boundary.length >= 3 && (
            <span className="ml-4 text-blue-700 font-semibold">
              {customersInBoundary} customers in area
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {isDrawing && boundary.length < 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          Click on the map to add boundary points. You need at least 3 points to create a territory.
        </div>
      )}

      {/* Map */}
      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-300">
        <MapContainer
          center={[37.7749, -122.4194]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler
            isDrawing={isDrawing}
            boundary={boundary}
            onChange={onChange}
          />

          {/* Draw current boundary */}
          {boundary.length >= 3 && (
            <Polygon
              positions={boundary.map((p) => [p.lat, p.lng]) as any}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.4,
                weight: 2,
              }}
            />
          )}

          {/* Draw vertices as markers */}
          {boundary.map((point, index) => (
            <VertexMarker
              key={index}
              position={point}
              index={index}
              onDelete={handleDeleteVertex}
              color={color}
            />
          ))}
        </MapContainer>
      </div>

      {/* Vertex List */}
      {boundary.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Boundary Points</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto">
            {boundary.map((point, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200 text-xs"
              >
                <span className="text-gray-700">
                  {index + 1}. {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </span>
                <button
                  onClick={() => handleDeleteVertex(index)}
                  className="text-red-600 hover:text-red-800 ml-2"
                  title="Delete point"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Map click handler component
function MapClickHandler({
  isDrawing,
  boundary,
  onChange,
}: {
  isDrawing: boolean;
  boundary: Array<{ lat: number; lng: number }>;
  onChange: (boundary: Array<{ lat: number; lng: number }>) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        const newPoint = {
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        };
        onChange([...boundary, newPoint]);
      }
    },
  });

  return null;
}

// Vertex marker component
function VertexMarker({
  position,
  index,
  onDelete,
  color,
}: {
  position: { lat: number; lng: number };
  index: number;
  onDelete: (index: number) => void;
  color: string;
}) {
  // Create a custom icon
  const createIcon = () => {
    if (typeof window === "undefined") return undefined;

    const L = require("leaflet");
    return L.divIcon({
      className: "custom-vertex-marker",
      html: `
        <div style="
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        "></div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={createIcon()}
      eventHandlers={{
        click: () => onDelete(index),
      }}
    />
  );
}
