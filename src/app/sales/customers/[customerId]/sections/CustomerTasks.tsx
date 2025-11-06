'use client';

import { useState } from "react";
import { parseISO, format, isPast, isToday } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

type CustomerTask = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: string;
  priority: string | null;
  createdAt: string;
};

type CustomerTasksProps = {
  customerId: string;
  tasks: CustomerTask[];
};

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
};

function describeDueDate(dueAt: string | null) {
  if (!dueAt) {
    return { label: "No due date", tone: "text-gray-500" };
  }

  const date = parseISO(dueAt);

  if (isToday(date)) {
    return { label: "Due today", tone: "text-emerald-600 font-semibold" };
  }

  if (isPast(date)) {
    return {
      label: `Overdue • ${format(date, "MMM d")}`,
      tone: "text-rose-600 font-semibold",
    };
  }

  return { label: format(date, "EEE • MMM d"), tone: "text-gray-600" };
}

export default function CustomerTasks({ customerId, tasks }: CustomerTasksProps) {
  const queryClient = useQueryClient();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const pendingTasks = (tasks ?? []).filter((task) => task.status === "PENDING");

  const handleToggleTask = async (taskId: string, isChecked: boolean) => {
    setCompletingTaskId(taskId);
    try {
      const endpoint = isChecked
        ? `/api/sales/tasks/${taskId}/complete`
        : `/api/sales/tasks/${taskId}/uncomplete`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update task");
      }

      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    } catch (error) {
      console.error("Failed to update task status", error);
      alert("Unable to update the To-Do. Please try again.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customer To-Do List</h2>
          <p className="text-sm text-gray-600">
            Track follow-ups and reminders for this account.
          </p>
        </div>
        {pendingTasks.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {pendingTasks.length} open
          </span>
        )}
      </div>

      {pendingTasks.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
          No open To-Dos yet. Use <strong>Add To-Do</strong> to create one.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {pendingTasks.map((task) => {
            const due = describeDueDate(task.dueAt);
            const priorityClassName = task.priority
              ? PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.MEDIUM
              : PRIORITY_STYLES.MEDIUM;

            return (
              <li
                key={task.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white/60 px-4 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60"
              >
                <input
                  type="checkbox"
                  aria-label={`Mark "${task.title}" as complete`}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  defaultChecked={false}
                  onChange={(event) => handleToggleTask(task.id, event.target.checked)}
                  disabled={completingTaskId === task.id}
                />

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    {task.priority && (
                      <span className={`text-xs font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 ${priorityClassName}`}>
                        {task.priority.toLowerCase()}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600">{task.description}</p>
                  )}
                  <p className={`text-xs ${due.tone}`}>{due.label}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
