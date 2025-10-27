"use client";

import { useState, useEffect, useRef } from "react";
import { CustomerRiskStatus } from "@prisma/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Initialize Mapbox
if (typeof window !== "undefined") {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
}

type CustomerLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  riskStatus: CustomerRiskStatus;
  ytdRevenue: number;
  city: string;
  state: string;
};

export default function CustomerMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [customers, setCustomers] = useState<CustomerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<CustomerRiskStatus | "ALL">("ALL");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await fetch("/api/sales/customers/map");
        if (!response.ok) throw new Error("Failed to load customer locations");
        const data = await response.json();
        setCustomers(data.customers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    void loadCustomers();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || loading || customers.length === 0) return;

    // Initialize map
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-98.5795, 39.8283], // Center of USA
        zoom: 4,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    }

    // Filter customers by status
    const filteredCustomers = customers.filter((c) =>
      filterStatus === "ALL" ? true : c.riskStatus === filterStatus
    );

    // Clear existing markers
    const existingMarkers = document.querySelectorAll(".mapboxgl-marker");
    existingMarkers.forEach((marker) => marker.remove());

    // Add markers for each customer
    filteredCustomers.forEach((customer) => {
      const color =
        customer.riskStatus === "HEALTHY" ? "#10b981" :
        customer.riskStatus === "AT_RISK_CADENCE" ? "#f59e0b" :
        customer.riskStatus === "AT_RISK_REVENUE" ? "#f97316" :
        customer.riskStatus === "DORMANT" ? "#6b7280" :
        "#ef4444";

      // Create marker element
      const el = document.createElement("div");
      el.className = "customer-marker";
      el.style.backgroundColor = color;
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.border = selectedCustomers.has(customer.id) ? "3px solid #1e40af" : "2px solid white";
      el.style.cursor = "pointer";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2">
          <h3 class="font-semibold text-gray-900">${customer.name}</h3>
          <p class="text-sm text-gray-600">${customer.city}, ${customer.state}</p>
          <p class="text-sm font-semibold text-gray-900 mt-1">
            YTD Revenue: $${customer.ytdRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p class="text-xs text-gray-500 mt-1">Status: ${customer.riskStatus.replace(/_/g, " ")}</p>
          <a href="/sales/customers/${customer.id}" class="text-sm text-blue-600 hover:underline mt-2 inline-block">
            View Details →
          </a>
        </div>
      `);

      // Add click handler to toggle selection
      el.addEventListener("click", () => {
        setSelectedCustomers((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(customer.id)) {
            newSet.delete(customer.id);
          } else {
            newSet.add(customer.id);
          }
          return newSet;
        });
      });

      // Add marker to map
      new mapboxgl.Marker(el)
        .setLngLat([customer.longitude, customer.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });

    return () => {
      // Cleanup markers on unmount
      const markers = document.querySelectorAll(".mapboxgl-marker");
      markers.forEach((marker) => marker.remove());
    };
  }, [customers, loading, filterStatus, selectedCustomers]);

  const calculateRoute = async () => {
    if (selectedCustomers.size < 2) {
      alert("Please select at least 2 customers to calculate a route");
      return;
    }

    // Get selected customer locations
    const selected = customers.filter((c) => selectedCustomers.has(c.id));
    const coordinates = selected.map((c) => `${c.longitude},${c.latitude}`).join(";");

    // Use Mapbox Directions API to get route
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const duration = Math.round(route.duration / 60); // minutes

        // Add route to map
        if (map.current?.getSource("route")) {
          (map.current.getSource("route") as mapboxgl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
        } else {
          map.current?.addLayer({
            id: "route",
            type: "line",
            source: {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: route.geometry,
              },
            },
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#1e40af",
              "line-width": 4,
            },
          });
        }

        alert(`Route calculated: ${duration} minutes drive time`);
      }
    } catch (err) {
      console.error("Failed to calculate route:", err);
      alert("Failed to calculate route. Please try again.");
    }
  };

  if (error) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-screen max-w-7xl flex-col gap-4 p-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Customer Map</h1>
        <p className="mt-1 text-sm text-gray-600">
          Geographic view of all customers with health status and revenue
        </p>
      </header>

      {/* Filters and Actions */}
      <div className="flex items-center gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CustomerRiskStatus | "ALL")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="HEALTHY">Healthy</option>
          <option value="AT_RISK_CADENCE">At Risk - Cadence</option>
          <option value="AT_RISK_REVENUE">At Risk - Revenue</option>
          <option value="DORMANT">Dormant</option>
          <option value="CLOSED">Closed</option>
        </select>

        <button
          type="button"
          onClick={calculateRoute}
          disabled={selectedCustomers.size < 2}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Show Route ({selectedCustomers.size} selected)
        </button>

        {selectedCustomers.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedCustomers(new Set())}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Selection
          </button>
        )}

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">At Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-600">Dormant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Closed</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="flex-1 rounded-lg border border-slate-200 shadow-sm"
        style={{ minHeight: "600px" }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading customers...</p>
          </div>
        </div>
      )}
    </main>
  );
}
