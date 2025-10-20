'use client';

import { useState, useEffect } from "react";
import { format, isPast, parseISO } from "date-fns";

type Priority = "low" | "medium" | "high";
type Status = "pending" | "completed" | "cancelled";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueAt: string | null;
  status: Status;
  assignedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  customer: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
};

type Summary = {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
};

type FilterOption = "all" | "pending" | "completed" | "overdue";

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  high: {
    label: "High",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  low: {
    label: "Low",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
};

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-700",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-700",
  },
};

export default function AssignedTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
  });
  const [filter, setFilter] = useState<FilterOption>("pending");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks based on filter
  const fetchTasks = async (filterValue: FilterOption) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterValue !== "all") {
        params.set("status", filterValue);
      }

      const response = await fetch(`/api/sales/tasks/assigned?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sales/login";
          return;
        }
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(data.tasks || []);
      setSummary(data.summary || { total: 0, pending: 0, completed: 0, overdue: 0 });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError(error instanceof Error ? error.message : "Unable to load tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks on component mount
  useEffect(() => {
    fetchTasks(filter);
  }, []); // Only run once on mount

  // Handle filter change
  const handleFilterChange = (newFilter: FilterOption) => {
    setFilter(newFilter);
    fetchTasks(newFilter);
  };

  // Mark task as complete
  const handleMarkComplete = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const response = await fetch(`/api/sales/tasks/${taskId}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to complete task");

      // Refresh tasks after completion
      await fetchTasks(filter);
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Failed to mark task as complete. Please try again.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Check if task is overdue
  const isOverdue = (task: Task): boolean => {
    if (!task.dueAt || task.status !== "pending") return false;
    return isPast(parseISO(task.dueAt));
  };

  // Filter tasks for display (client-side filtering for immediate feedback)
  const displayedTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "pending") return task.status === "pending";
    if (filter === "completed") return task.status === "completed";
    if (filter === "overdue") return isOverdue(task);
    return true;
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Assigned Tasks</h3>
          <p className="text-xs text-gray-500">
            Tasks assigned by your manager
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2">
          {summary.overdue > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              {summary.overdue} overdue
            </span>
          )}
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {summary.pending} pending
          </span>
        </div>
      </div>

      {/* Filter dropdown */}
      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="task-filter" className="text-sm font-medium text-gray-700">
          Filter:
        </label>
        <select
          id="task-filter"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value as FilterOption)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Tasks list */}
      {error ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">Unable to load tasks</p>
          <p className="mt-1 text-xs text-red-600">{error}</p>
          <button
            onClick={() => fetchTasks(filter)}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="mt-6 text-center text-sm text-gray-500">Loading tasks...</div>
      ) : displayedTasks.length === 0 ? (
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-gray-600">
            {filter === "all"
              ? "No tasks assigned yet."
              : `No ${filter} tasks.`}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {displayedTasks.map((task) => {
            const taskIsOverdue = isOverdue(task);
            const priorityConfig = PRIORITY_CONFIG[task.priority];
            const statusConfig = STATUS_CONFIG[task.status];

            return (
              <div
                key={task.id}
                className={`rounded-lg border p-4 transition ${
                  taskIsOverdue
                    ? "border-red-300 bg-red-50"
                    : task.status === "completed"
                    ? "border-slate-200 bg-slate-50 opacity-60"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title with priority badge */}
                    <div className="flex items-center gap-2">
                      <h4
                        className={`font-semibold text-gray-900 ${
                          task.status === "completed" ? "line-through" : ""
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.priority === "high" && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityConfig.className}`}
                        >
                          {priorityConfig.label} Priority
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                      {/* Assigned by */}
                      {task.assignedBy && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">Assigned by:</span>
                          <span>{task.assignedBy.name}</span>
                        </div>
                      )}

                      {/* Due date */}
                      {task.dueAt && (
                        <div
                          className={`flex items-center gap-1 ${
                            taskIsOverdue
                              ? "font-semibold text-red-700"
                              : "text-gray-600"
                          }`}
                        >
                          <span className="font-medium">Due:</span>
                          <span>
                            {format(parseISO(task.dueAt), "MMM d, yyyy")}
                            {taskIsOverdue && " (Overdue)"}
                          </span>
                        </div>
                      )}

                      {/* Status badge */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>

                      {/* Customer link */}
                      {task.customer && (
                        <a
                          href={`/sales/customers/${task.customer.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {task.customer.name}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  {task.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleMarkComplete(task.id)}
                      disabled={completingTaskId === task.id}
                      className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {completingTaskId === task.id ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin text-gray-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Completing...
                        </span>
                      ) : (
                        "Mark Complete"
                      )}
                    </button>
                  )}

                  {/* Completed checkmark */}
                  {task.status === "completed" && (
                    <div className="flex items-center gap-2 text-green-600">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer summary */}
      {displayedTasks.length > 0 && (
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <div>
                <span className="text-gray-600">Total:</span>{" "}
                <span className="font-semibold text-gray-900">{summary.total}</span>
              </div>
              <div>
                <span className="text-gray-600">Pending:</span>{" "}
                <span className="font-semibold text-orange-600">{summary.pending}</span>
              </div>
              <div>
                <span className="text-gray-600">Completed:</span>{" "}
                <span className="font-semibold text-green-600">{summary.completed}</span>
              </div>
              {summary.overdue > 0 && (
                <div>
                  <span className="text-gray-600">Overdue:</span>{" "}
                  <span className="font-semibold text-red-600">{summary.overdue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
