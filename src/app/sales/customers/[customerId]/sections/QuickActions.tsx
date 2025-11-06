'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import LogActivityButton from "@/components/shared/LogActivityButton";

type QuickActionsProps = {
  customerId: string;
  isPermanentlyClosed: boolean;
  customerName?: string;
};

export default function QuickActions({
  customerId,
  isPermanentlyClosed,
  customerName,
}: QuickActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddOrder = () => {
    // Send reps to the new order workflow with the customer pre-selected
    const targetUrl = customerId
      ? `/sales/orders/new?customerId=${encodeURIComponent(customerId)}`
      : "/sales/orders/new";
    router.push(targetUrl);
  };

  const handleAddToDo = () => {
    // Create a task/to-do using prompt for now
    // TODO: Replace with proper task modal when task management is built
    const taskTitle = prompt(`Add a to-do for ${customerName || 'this customer'}:`);
    if (taskTitle?.trim()) {
      // For now, just show confirmation
      // In future: POST to /api/sales/tasks with customerId and taskTitle
      alert(`To-do created: "${taskTitle}"\n\nNote: Task management system pending - this is a placeholder.`);
    }
  };

  const handleMarkClosed = async () => {
    if (!confirm("Are you sure you want to mark this customer as permanently closed?")) {
      return;
    }

    const reason = prompt("Please provide a reason for closing this account:");
    if (!reason?.trim()) {
      alert("A reason is required to close the account.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPermanentlyClosed: true,
          closedReason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close customer account");
      }

      alert("Customer account has been marked as permanently closed.");
      router.refresh();
    } catch (error) {
      console.error("Error closing customer:", error);
      alert(error instanceof Error ? error.message : "Failed to close customer account");
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
        <div className="flex items-center justify-center">
          <LogActivityButton
            customerId={customerId}
            contextType="customer"
            contextLabel={customerName}
            variant="icon"
            size="md"
            label="Log Activity"
          />
        </div>

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
