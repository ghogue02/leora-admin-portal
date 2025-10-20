"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AdjustInventoryModalProps {
  skuId: string;
  skuCode: string;
  location: string;
  currentQuantity: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustInventoryModal({
  skuId,
  skuCode,
  location,
  currentQuantity,
  onClose,
  onSuccess,
}: AdjustInventoryModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract" | "set">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const calculateNewTotal = () => {
    const qty = parseInt(quantity) || 0;
    switch (adjustmentType) {
      case "add":
        return currentQuantity + qty;
      case "subtract":
        return currentQuantity - qty;
      case "set":
        return qty;
      default:
        return currentQuantity;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quantity || parseInt(quantity) <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (!reason.trim()) {
      alert("Please provide a reason for this adjustment");
      return;
    }

    const newTotal = calculateNewTotal();
    if (newTotal < 0) {
      alert("Adjustment would result in negative inventory. Please check the quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/inventory/${skuId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          adjustmentType,
          quantity: parseInt(quantity),
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to adjust inventory");
      }

      onSuccess();
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to adjust inventory";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const newTotal = calculateNewTotal();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal panel */}
        <div className="relative z-50 inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Adjust Inventory</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-4">
              <div className="space-y-4">
                {/* SKU Info */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">SKU:</span>{" "}
                      <span className="text-gray-900">{skuCode}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Location:</span>{" "}
                      <span className="text-gray-900">{location}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Current Quantity:</span>{" "}
                      <span className="text-lg font-semibold text-gray-900">
                        {currentQuantity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Adjustment Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Adjustment Type *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="add"
                        checked={adjustmentType === "add"}
                        onChange={(e) => setAdjustmentType(e.target.value as "add")}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">Add (+)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="subtract"
                        checked={adjustmentType === "subtract"}
                        onChange={(e) => setAdjustmentType(e.target.value as "subtract")}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">Subtract (-)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="set"
                        checked={adjustmentType === "set"}
                        onChange={(e) => setAdjustmentType(e.target.value as "set")}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">Set to specific value</span>
                    </label>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {adjustmentType === "set" ? "New Quantity *" : "Quantity *"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Reason *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Explain the reason for this adjustment..."
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This will be recorded in the audit log
                  </p>
                </div>

                {/* Preview */}
                {quantity && (
                  <div
                    className={`rounded-lg border-2 p-4 ${
                      newTotal < 0
                        ? "border-red-300 bg-red-50"
                        : "border-blue-300 bg-blue-50"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-700">Preview:</p>
                    <div className="mt-2 flex items-center justify-center gap-4 text-lg">
                      <span className="font-semibold text-gray-900">{currentQuantity}</span>
                      <span className="text-gray-500">→</span>
                      <span
                        className={`text-2xl font-bold ${
                          newTotal < 0 ? "text-red-600" : "text-blue-600"
                        }`}
                      >
                        {newTotal}
                      </span>
                    </div>
                    {newTotal < 0 && (
                      <p className="mt-2 text-center text-sm font-medium text-red-600">
                        Warning: This would result in negative inventory
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || newTotal < 0 || !quantity || !reason.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Adjusting..." : "Adjust Inventory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
