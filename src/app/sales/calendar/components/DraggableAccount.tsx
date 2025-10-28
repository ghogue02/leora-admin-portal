"use client";

import type { DraggableAccountData } from "@/types/calendar";
import { Calendar, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableAccountProps {
  account: DraggableAccountData & { territory?: string | null };
  onDragStart: (account: DraggableAccountData & { territory?: string | null }) => void;
}

export function DraggableAccount({ account, onDragStart }: DraggableAccountProps) {
  const dragPayload = {
    id: account.id,
    customerId: account.customerId,
    customerName: account.customerName,
    priority: account.priority || "MEDIUM",
    accountType: account.accountType ?? "ACTIVE",
    accountNumber: account.accountNumber ?? null,
    location: account.location ?? null,
    objective: account.objective ?? "",
    territory: account.territory ?? null,
    lastOrderDate: account.lastOrderDate ?? null,
    isScheduled: account.isScheduled ?? false,
  };

  const serializedPayload = JSON.stringify(dragPayload);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", serializedPayload);
    onDragStart({ ...account, ...dragPayload });
  };

  const priorityColors = {
    HIGH: "border-red-500 bg-red-50",
    MEDIUM: "border-yellow-500 bg-yellow-50",
    LOW: "border-green-500 bg-green-50",
  };

  const priorityBadgeColors = {
    HIGH: "bg-red-100 text-red-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    LOW: "bg-green-100 text-green-800",
  };

  return (
    <div
      id={`draggable-account-${account.id}`}
      data-account={serializedPayload}
      draggable={!account.isScheduled}
      onDragStart={handleDragStart}
      className={cn(
        "p-3 rounded-lg border-l-4 bg-white shadow-sm transition-all",
        account.isScheduled
          ? "opacity-50 cursor-not-allowed border-gray-300"
          : "cursor-grab hover:shadow-md active:cursor-grabbing",
        priorityColors[account.priority as keyof typeof priorityColors] || "border-gray-300"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{account.customerName}</h4>
          {account.accountNumber && (
            <p className="text-xs text-gray-500">{account.accountNumber}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
              priorityBadgeColors[account.priority as keyof typeof priorityBadgeColors] || "bg-gray-100 text-gray-800"
            )}
          >
            {account.priority}
          </span>
          {account.isScheduled && (
            <CheckCircle2 className="h-4 w-4 text-green-600" title="Already scheduled" />
          )}
        </div>
      </div>

      {account.objective && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{account.objective}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        {account.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{account.location}</span>
          </div>
        )}
        {account.lastOrderDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(account.lastOrderDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {account.isScheduled && (
        <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
          <AlertCircle className="h-3 w-3" />
          <span>Already scheduled</span>
        </div>
      )}
    </div>
  );
}
