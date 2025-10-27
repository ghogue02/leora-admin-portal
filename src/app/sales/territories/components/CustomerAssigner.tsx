"use client";

import { useState, useEffect } from "react";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface Customer {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  currentTerritory: string | null;
  status: string;
}

interface CustomerAssignerProps {
  territoryId?: string;
  boundary: Array<{ lat: number; lng: number }>;
  onAssignmentComplete: (count: number) => void;
}

export default function CustomerAssigner({
  territoryId,
  boundary,
  onAssignmentComplete,
}: CustomerAssignerProps) {
  const [customersInBoundary, setCustomersInBoundary] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [conflictingCustomers, setConflictingCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (boundary.length >= 3) {
      findCustomersInBoundary();
    }
  }, [boundary]);

  const findCustomersInBoundary = async () => {
    try {
      setIsLoading(true);

      // Create polygon from boundary
      const polygonCoords = boundary.map((p) => [p.lng, p.lat]);
      polygonCoords.push(polygonCoords[0]); // Close the polygon
      const turfPolygon = polygon([polygonCoords]);

      // Fetch all customers with coordinates
      const response = await fetch("/api/sales/customers?hasCoordinates=true");
      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();
      const allCustomers = data.customers || [];

      // Filter customers inside boundary
      const customersInside = allCustomers.filter((customer: Customer) => {
        if (!customer.latitude || !customer.longitude) return false;

        const customerPoint = point([customer.longitude, customer.latitude]);
        return booleanPointInPolygon(customerPoint, turfPolygon);
      });

      // Separate conflicting customers (already assigned to another territory)
      const conflicts = customersInside.filter(
        (c: Customer) => c.currentTerritory && c.currentTerritory !== territoryId
      );

      setCustomersInBoundary(customersInside);
      setConflictingCustomers(conflicts);
      onAssignmentComplete(customersInside.length);
    } catch (err) {
      console.error("Error finding customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!territoryId) {
      alert("Please save the territory before assigning customers");
      return;
    }

    try {
      setIsAssigning(true);
      setAssignmentStatus("idle");

      const customerIds = customersInBoundary.map((c) => c.id);

      const response = await fetch(`/api/sales/territories/${territoryId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerIds,
          overwriteExisting: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign customers");
      }

      setAssignmentStatus("success");
      setTimeout(() => setAssignmentStatus("idle"), 3000);
    } catch (err) {
      console.error("Error assigning customers:", err);
      setAssignmentStatus("error");
      setTimeout(() => setAssignmentStatus("idle"), 3000);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReassignConflicts = async () => {
    if (!territoryId) return;

    if (
      !confirm(
        `This will reassign ${conflictingCustomers.length} customers from their current territories. Continue?`
      )
    ) {
      return;
    }

    try {
      setIsAssigning(true);
      setAssignmentStatus("idle");

      const customerIds = conflictingCustomers.map((c) => c.id);

      const response = await fetch(`/api/sales/territories/${territoryId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerIds,
          overwriteExisting: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reassign customers");
      }

      setAssignmentStatus("success");
      setConflictingCustomers([]);
      await findCustomersInBoundary();
    } catch (err) {
      console.error("Error reassigning customers:", err);
      setAssignmentStatus("error");
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Finding customers in boundary...</p>
        </div>
      </div>
    );
  }

  const newCustomers = customersInBoundary.filter(
    (c) => !c.currentTerritory || c.currentTerritory === territoryId
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">
            {customersInBoundary.length}
          </div>
          <div className="text-sm text-blue-700">Total Customers in Area</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-900">{newCustomers.length}</div>
          <div className="text-sm text-green-700">Ready to Assign</div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-900">
            {conflictingCustomers.length}
          </div>
          <div className="text-sm text-yellow-700">Already in Other Territories</div>
        </div>
      </div>

      {/* Assignment Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assignment Actions
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">
                Auto-assign {newCustomers.length} customers
              </div>
              <div className="text-sm text-gray-600">
                Assign customers that are not in other territories
              </div>
            </div>
            <button
              onClick={handleAutoAssign}
              disabled={isAssigning || newCustomers.length === 0 || !territoryId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isAssigning ? "Assigning..." : "Auto-assign"}
            </button>
          </div>

          {conflictingCustomers.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div>
                <div className="font-medium text-yellow-900">
                  Reassign {conflictingCustomers.length} conflicting customers
                </div>
                <div className="text-sm text-yellow-700">
                  Move customers from their current territories to this one
                </div>
              </div>
              <button
                onClick={handleReassignConflicts}
                disabled={isAssigning || !territoryId}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isAssigning ? "Reassigning..." : "Reassign"}
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {assignmentStatus === "success" && (
          <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">Customers assigned successfully!</span>
          </div>
        )}

        {assignmentStatus === "error" && (
          <div className="mt-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <XCircleIcon className="w-5 h-5" />
            <span className="font-medium">Failed to assign customers. Please try again.</span>
          </div>
        )}
      </div>

      {/* Customer List */}
      {customersInBoundary.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Customers in Boundary ({customersInBoundary.length})
            </h3>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Current Territory
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customersInBoundary.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {customer.city}, {customer.state}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          customer.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : customer.status === "PROSPECT"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {customer.currentTerritory ? (
                        <span
                          className={
                            customer.currentTerritory !== territoryId
                              ? "text-yellow-700 font-medium"
                              : "text-gray-600"
                          }
                        >
                          {customer.currentTerritory}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
