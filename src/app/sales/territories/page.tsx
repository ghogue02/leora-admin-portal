"use client";

import { useState, useEffect } from "react";
import TerritoryList from "./sections/TerritoryList";
import TerritoryMap from "./sections/TerritoryMap";
import TerritoryEditor from "./sections/TerritoryEditor";
import { PlusIcon, MapIcon, ListBulletIcon } from "@heroicons/react/24/outline";

export type Territory = {
  id: string;
  name: string;
  salesRepId: string | null;
  salesRepName: string | null;
  customerCount: number;
  activeCustomerCount: number;
  revenue30Days: number;
  revenue90Days: number;
  revenue365Days: number;
  lastActivityDate: string | null;
  boundary: Array<{ lat: number; lng: number }>;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTerritories();
  }, []);

  const fetchTerritories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/sales/territories");

      if (!response.ok) {
        throw new Error("Failed to fetch territories");
      }

      const data = await response.json();
      setTerritories(data.territories || []);
    } catch (err) {
      console.error("Error fetching territories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTerritory = () => {
    setSelectedTerritory(null);
    setIsEditorOpen(true);
  };

  const handleEditTerritory = (territory: Territory) => {
    setSelectedTerritory(territory);
    setIsEditorOpen(true);
  };

  const handleDeleteTerritory = async (territoryId: string) => {
    if (!confirm("Are you sure you want to delete this territory?")) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/territories/${territoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete territory");
      }

      await fetchTerritories();
    } catch (err) {
      console.error("Error deleting territory:", err);
      alert("Failed to delete territory");
    }
  };

  const handleSaveTerritory = async (territory: Partial<Territory>) => {
    try {
      const url = territory.id
        ? `/api/sales/territories/${territory.id}`
        : "/api/sales/territories";

      const method = territory.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(territory),
      });

      if (!response.ok) {
        throw new Error("Failed to save territory");
      }

      await fetchTerritories();
      setIsEditorOpen(false);
      setSelectedTerritory(null);
    } catch (err) {
      console.error("Error saving territory:", err);
      alert("Failed to save territory");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Territory Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Plan territories, assign sales reps, and track performance
              </p>
            </div>
            <button
              onClick={handleCreateTerritory}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create Territory
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm w-fit">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ListBulletIcon className="w-5 h-5" />
            List View
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === "map"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <MapIcon className="w-5 h-5" />
            Map View
          </button>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading territories...</p>
            </div>
          </div>
        ) : viewMode === "list" ? (
          <TerritoryList
            territories={territories}
            onEdit={handleEditTerritory}
            onDelete={handleDeleteTerritory}
            onRefresh={fetchTerritories}
          />
        ) : (
          <TerritoryMap
            territories={territories}
            selectedTerritory={selectedTerritory}
            onSelectTerritory={setSelectedTerritory}
            onEditTerritory={handleEditTerritory}
          />
        )}

        {/* Territory Editor Drawer */}
        {isEditorOpen && (
          <TerritoryEditor
            territory={selectedTerritory}
            onSave={handleSaveTerritory}
            onClose={() => {
              setIsEditorOpen(false);
              setSelectedTerritory(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
