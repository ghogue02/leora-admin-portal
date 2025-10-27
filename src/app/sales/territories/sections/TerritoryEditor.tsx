"use client";

import { useState, useEffect } from "react";
import { type Territory } from "../page";
import BoundaryDrawer from "../components/BoundaryDrawer";
import CustomerAssigner from "../components/CustomerAssigner";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TerritoryEditorProps {
  territory: Territory | null;
  onSave: (territory: Partial<Territory>) => void;
  onClose: () => void;
}

export default function TerritoryEditor({
  territory,
  onSave,
  onClose,
}: TerritoryEditorProps) {
  const [name, setName] = useState(territory?.name || "");
  const [color, setColor] = useState(territory?.color || "#3B82F6");
  const [salesRepId, setSalesRepId] = useState<string | null>(
    territory?.salesRepId || null
  );
  const [boundary, setBoundary] = useState<Array<{ lat: number; lng: number }>>(
    territory?.boundary || []
  );
  const [currentTab, setCurrentTab] = useState<"boundary" | "assignment">("boundary");
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewCustomerCount, setPreviewCustomerCount] = useState(0);

  useEffect(() => {
    fetchSalesReps();
  }, []);

  const fetchSalesReps = async () => {
    try {
      const response = await fetch("/api/admin/users?role=sales");
      if (response.ok) {
        const data = await response.json();
        setSalesReps(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching sales reps:", err);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a territory name");
      return;
    }

    if (boundary.length < 3) {
      alert("Please draw a territory boundary with at least 3 points");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: territory?.id,
        name: name.trim(),
        color,
        salesRepId,
        boundary,
        isActive: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const predefinedColors = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {territory ? "Edit Territory" : "Create New Territory"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {currentTab === "boundary"
                ? "Draw the territory boundary on the map"
                : "Assign customers to this territory"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setCurrentTab("boundary")}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                currentTab === "boundary"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              1. Draw Boundary
            </button>
            <button
              onClick={() => setCurrentTab("assignment")}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                currentTab === "assignment"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              disabled={boundary.length < 3}
            >
              2. Assign Customers
              {previewCustomerCount > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {previewCustomerCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentTab === "boundary" && (
            <div className="space-y-6">
              {/* Territory Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Territory Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., North Bay Area"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign Sales Rep
                  </label>
                  <select
                    value={salesRepId || ""}
                    onChange={(e) => setSalesRepId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Territory Color
                </label>
                <div className="flex items-center gap-2">
                  {predefinedColors.map((presetColor) => (
                    <button
                      key={presetColor}
                      onClick={() => setColor(presetColor)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        color === presetColor
                          ? "border-gray-900 scale-110"
                          : "border-gray-300 hover:scale-105"
                      }`}
                      style={{ backgroundColor: presetColor }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Boundary Drawer */}
              <BoundaryDrawer
                boundary={boundary}
                onChange={setBoundary}
                color={color}
                onCustomerCountChange={setPreviewCustomerCount}
              />
            </div>
          )}

          {currentTab === "assignment" && (
            <CustomerAssigner
              territoryId={territory?.id}
              boundary={boundary}
              onAssignmentComplete={(count) => setPreviewCustomerCount(count)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {boundary.length > 0 && (
              <span>
                {boundary.length} boundary points
                {previewCustomerCount > 0 && ` • ${previewCustomerCount} customers`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || boundary.length < 3}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isSaving ? "Saving..." : territory ? "Update Territory" : "Create Territory"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
