"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface TriggeredTasksListProps {
  triggerId: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export function TriggeredTasksList({ triggerId }: TriggeredTasksListProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadTasks();
  }, [triggerId, filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const queryParams = filter !== "all" ? `?status=${filter}` : "";
      const response = await fetch(
        `/api/admin/triggers/${triggerId}/tasks${queryParams}`,
      );
      if (!response.ok) throw new Error("Failed to load tasks");
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading tasks...</p>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No tasks created by this trigger yet</p>
        <p className="text-sm mt-2">
          Tasks will appear here after the trigger runs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({tasks.length})
        </Button>
        <Button
          variant={filter === "PENDING" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("PENDING")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "IN_PROGRESS" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("IN_PROGRESS")}
        >
          In Progress
        </Button>
        <Button
          variant={filter === "COMPLETED" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("COMPLETED")}
        >
          Completed
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Triggered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((triggeredTask) => (
              <TableRow key={triggeredTask.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {triggeredTask.customer.name}
                    </div>
                    {triggeredTask.customer.accountNumber && (
                      <div className="text-sm text-muted-foreground">
                        {triggeredTask.customer.accountNumber}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{triggeredTask.task.title}</div>
                    {triggeredTask.task.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {triggeredTask.task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {triggeredTask.task.user ? (
                    <div>
                      <div>{triggeredTask.task.user.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {triggeredTask.task.user.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[triggeredTask.task.status]}>
                    {triggeredTask.task.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(triggeredTask.triggeredAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/sales/tasks?taskId=${triggeredTask.task.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
