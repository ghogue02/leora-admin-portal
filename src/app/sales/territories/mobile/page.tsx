"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapIcon, ListBulletIcon, PhoneIcon } from "@heroicons/react/24/outline";

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

interface Customer {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  lastOrderDate: string | null;
}

interface MyTerritory {
  id: string;
  name: string;
  boundary: Array<{ lat: number; lng: number }>;
  color: string;
  customers: Customer[];
}

export default function MobileTerritoryPage() {
  const [territory, setTerritory] = useState<MyTerritory | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState<"all" | "active" | "prospect">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchMyTerritory();
  }, []);

  const fetchMyTerritory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/sales/territories/my-territory");

      if (!response.ok) {
        throw new Error("Failed to fetch territory");
      }

      const data = await response.json();
      setTerritory(data.territory);
    } catch (err) {
      console.error("Error fetching territory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    if (!territory) return [];

    switch (filter) {
      case "active":
        return territory.customers.filter((c) => c.status === "ACTIVE");
      case "prospect":
        return territory.customers.filter((c) => c.status === "PROSPECT");
      default:
        return territory.customers;
    }
  };

  const handleCallCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleNavigateToCustomer = (customer: Customer) => {
    if (customer.latitude && customer.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`;
      window.open(url, "_blank");
    }
  };

  const filteredCustomers = getFilteredCustomers();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your territory...</p>
        </div>
      </div>
    );
  }

  if (!territory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md">
          <MapIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Territory Assigned
          </h2>
          <p className="text-gray-600 mb-6">
            You have not been assigned to a sales territory yet. Please contact your
            manager.
          </p>
          <Link
            href="/sales/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getMapCenter = () => {
    if (territory.boundary.length === 0) {
      return { lat: 37.7749, lng: -122.4194 };
    }

    const avgLat =
      territory.boundary.reduce((sum, p) => sum + p.lat, 0) /
      territory.boundary.length;
    const avgLng =
      territory.boundary.reduce((sum, p) => sum + p.lng, 0) /
      territory.boundary.length;

    return { lat: avgLat, lng: avgLng };
  };

  const center = getMapCenter();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">{territory.name}</h1>
          <p className="text-sm text-gray-600">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? "customer" : "customers"}
          </p>
        </div>

        {/* View Toggle */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setViewMode("map")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "map"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <MapIcon className="w-5 h-5" />
            Map
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <ListBulletIcon className="w-5 h-5" />
            List
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "prospect", label: "Prospects" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key as any)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === option.key
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewMode === "map" ? (
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            {isMounted && (
              <div className="h-[calc(100vh-300px)] min-h-[400px]">
                <MapContainer
                  center={[center.lat, center.lng]}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Territory Boundary */}
                  {territory.boundary.length >= 3 && (
                    <Polygon
                      positions={
                        territory.boundary.map((p) => [p.lat, p.lng]) as any
                      }
                      pathOptions={{
                        color: territory.color,
                        fillColor: territory.color,
                        fillOpacity: 0.2,
                        weight: 3,
                      }}
                    />
                  )}

                  {/* Customer Markers */}
                  {filteredCustomers.map((customer) => {
                    if (!customer.latitude || !customer.longitude) return null;

                    return (
                      <Marker
                        key={customer.id}
                        position={[customer.latitude, customer.longitude]}
                      />
                    );
                  })}
                </MapContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    <p className="text-sm text-gray-600">
                      {customer.city}, {customer.state}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      customer.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {customer.status}
                  </span>
                </div>

                {customer.lastOrderDate && (
                  <p className="text-xs text-gray-500 mb-3">
                    Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </p>
                )}

                <div className="flex gap-2">
                  {customer.phone && (
                    <button
                      onClick={() => handleCallCustomer(customer.phone!)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      Call
                    </button>
                  )}
                  {customer.latitude && customer.longitude && (
                    <button
                      onClick={() => handleNavigateToCustomer(customer)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <MapIcon className="w-4 h-4" />
                      Navigate
                    </button>
                  )}
                  <Link
                    href={`/sales/customers/${customer.id}`}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="bg-white rounded-lg p-12 text-center">
                <p className="text-gray-500">No customers found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/sales/call-plan"
            className="px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-medium"
          >
            Call Plan
          </Link>
          <Link
            href="/sales/customers"
            className="px-4 py-3 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 font-medium"
          >
            Customers
          </Link>
          <Link
            href="/sales/dashboard"
            className="px-4 py-3 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 font-medium"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
