'use client';

import { useState } from "react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: string;
  customer: {
    id: string;
    name: string;
  } | null;
};

type TasksListProps = {
  tasks: Task[];
};

export default function TasksList({ tasks: initialTasks }: TasksListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);

    try {
      const response = await fetch(`/api/sales/tasks/${taskId}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to complete task");
      }

      // Remove completed task from list
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Failed to mark task as complete. Please try again.");
    } finally {
      setCompletingTaskId(null);
    }
  };
  if (tasks.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Tasks from Management</h3>
        <p className="mt-2 text-sm text-gray-600">
          No pending tasks. You're all caught up!
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tasks from Management</h3>
          <p className="text-xs text-gray-500">
            Action items and to-dos
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Clear these first so leadership blockers don’t derail your pipeline for the week.
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          {tasks.length} pending
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {tasks.map((task) => {
          const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();
          const dueDate = task.dueAt ? new Date(task.dueAt) : null;

          return (
            <li
              key={task.id}
              className={`rounded-md border px-4 py-3 ${
                isOverdue
                  ? "border-rose-200 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{task.title}</h4>
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    {task.customer && (
                      <Link
                        href={`/sales/customers/${task.customer.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {task.customer.name}
                      </Link>
                    )}
                    {dueDate && (
                      <span className={isOverdue ? "font-semibold text-rose-700" : ""}>
                        Due: {dueDate.toLocaleDateString()}
                        {isOverdue && " (Overdue)"}
                      </span>
                    )}
                    <TaskStatusBadge status={task.status} />
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleCompleteTask(task.id)}
                  disabled={completingTaskId === task.id}
                >
                  {completingTaskId === task.id ? "Completing..." : "Mark Complete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Pending",
      className: "bg-gray-100 text-gray-700",
    },
    IN_PROGRESS: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700",
    },
    COMPLETED: {
      label: "Completed",
      className: "bg-green-100 text-green-700",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-slate-100 text-slate-700",
    },
  };

  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
