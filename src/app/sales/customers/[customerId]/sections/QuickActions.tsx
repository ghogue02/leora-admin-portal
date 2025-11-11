'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import LogActivityButton from "@/components/shared/LogActivityButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { showError, showSuccess } from "@/lib/toast-helpers";

type QuickActionsProps = {
  customerId: string;
  isPermanentlyClosed: boolean;
  customerName?: string;
};

type TaskPriorityOption = "LOW" | "MEDIUM" | "HIGH";

const PRIORITY_OPTIONS: Array<{ value: TaskPriorityOption; label: string }> = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export default function QuickActions({
  customerId,
  isPermanentlyClosed,
  customerName,
}: QuickActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isClosing, setIsClosing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSavingToDo, setIsSavingToDo] = useState(false);

  const [todoTitle, setTodoTitle] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [todoNotes, setTodoNotes] = useState("");
  const [todoPriority, setTodoPriority] = useState<TaskPriorityOption>("MEDIUM");

  const resetToDoForm = () => {
    setTodoTitle("");
    setTodoDueDate("");
    setTodoNotes("");
    setTodoPriority("MEDIUM");
    setIsSavingToDo(false);
  };

  const handleCreateToDo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!todoTitle.trim()) {
      return;
    }

    setIsSavingToDo(true);
    try {
      const dueAtIso = todoDueDate
        ? new Date(`${todoDueDate}T12:00:00Z`).toISOString()
        : null;
      const payload: Record<string, unknown> = {
        title: todoTitle.trim(),
        priority: todoPriority,
      };
      if (dueAtIso) {
        payload.dueAt = dueAtIso;
      }
      if (todoNotes.trim()) {
        payload.description = todoNotes.trim();
      }

      const response = await fetch(`/api/sales/customers/${customerId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create To-Do");
      }

      showSuccess("To-Do added", `Reminder saved for ${customerName ?? "customer"}.`);
      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      setIsDialogOpen(false);
      resetToDoForm();
    } catch (error) {
      console.error("Failed to create To-Do task", error);
      showError(error instanceof Error ? error : "Failed to create To-Do");
    } finally {
      setIsSavingToDo(false);
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

    setIsClosing(true);
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

      showSuccess("Customer marked closed", "Account has been closed successfully.");
      router.refresh();
    } catch (error) {
      console.error("Error closing customer:", error);
      showError(
        error instanceof Error ? error.message : "Failed to close customer account"
      );
    } finally {
      setIsClosing(false);
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

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetToDoForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <button
              className="flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
            >
              <span className="text-lg">✓</span>
              Add To-Do
            </button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a To-Do</DialogTitle>
              <DialogDescription>
                Create a follow-up reminder for {customerName ?? "this customer"}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateToDo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="todo-title">
                  Title <span className="text-rose-600">*</span>
                </label>
                <input
                  id="todo-title"
                  type="text"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  value={todoTitle}
                  onChange={(event) => setTodoTitle(event.target.value)}
                  placeholder="Follow up about order, schedule tasting, etc."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="todo-due">
                    Due Date
                  </label>
                  <input
                    id="todo-due"
                    type="date"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    value={todoDueDate}
                    onChange={(event) => setTodoDueDate(event.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="todo-priority">
                    Priority
                  </label>
                  <select
                    id="todo-priority"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    value={todoPriority}
                    onChange={(event) => setTodoPriority(event.target.value as TaskPriorityOption)}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="todo-notes">
                  Notes <span className="text-xs font-normal text-gray-500">(Optional)</span>
                </label>
                <textarea
                  id="todo-notes"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  rows={3}
                  value={todoNotes}
                  onChange={(event) => setTodoNotes(event.target.value)}
                  placeholder="Add context or next steps to remember later."
                />
              </div>

              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={isSavingToDo || !todoTitle.trim()}
                  className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingToDo ? "Saving..." : "Save To-Do"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {!isPermanentlyClosed && (
          <button
            onClick={handleMarkClosed}
            disabled={isClosing}
            className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            <span className="text-lg">🔒</span>
            {isClosing ? "Processing..." : "Mark Closed"}
          </button>
        )}
      </div>
    </section>
  );
}
