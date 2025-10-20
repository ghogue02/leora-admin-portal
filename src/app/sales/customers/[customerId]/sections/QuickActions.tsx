'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

type QuickActionsProps = {
  customerId: string;
  isPermanentlyClosed: boolean;
};

export default function QuickActions({
  customerId,
  isPermanentlyClosed,
}: QuickActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddActivity = () => {
    // TODO: Implement activity creation modal/page
    alert("Add Activity feature coming soon!");
  };

  const handleAddOrder = () => {
    // TODO: Implement order creation modal/page
    alert("Add Order feature coming soon!");
  };

  const handleAddToDo = () => {
    // TODO: Implement task creation modal/page
    alert("Add To-Do feature coming soon!");
  };

  const handleMarkClosed = async () => {
    if (!confirm("Are you sure you want to mark this customer as permanently closed?")) {
      return;
    }

    const reason = prompt("Please provide a reason for closing this account:");
    if (!reason) return;

    setIsLoading(true);
    try {
      // TODO: Implement close customer API endpoint
      alert("Mark Closed feature coming soon!");
    } catch (error) {
      console.error("Error closing customer:", error);
      alert("Failed to close customer account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
        Quick Actions
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={handleAddActivity}
          className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          <span className="text-lg">📝</span>
          Add Activity
        </button>

        <button
          onClick={handleAddOrder}
          className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-100"
        >
          <span className="text-lg">🛒</span>
          Add Order
        </button>

        <button
          onClick={handleAddToDo}
          className="flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
        >
          <span className="text-lg">✓</span>
          Add To-Do
        </button>

        {!isPermanentlyClosed && (
          <button
            onClick={handleMarkClosed}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            <span className="text-lg">🔒</span>
            {isLoading ? "Processing..." : "Mark Closed"}
          </button>
        )}
      </div>
    </section>
  );
}
