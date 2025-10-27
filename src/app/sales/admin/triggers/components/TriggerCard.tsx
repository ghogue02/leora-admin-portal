"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, BarChart3, Eye } from "lucide-react";
import { TriggerForm } from "./TriggerForm";
import { TriggeredTasksList } from "./TriggeredTasksList";

interface TriggerCardProps {
  trigger: any;
  onUpdate: () => void;
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  SAMPLE_NO_ORDER: "Sample No Order",
  FIRST_ORDER_FOLLOWUP: "First Order Follow-up",
  CUSTOMER_TIMING: "Customer Contact Timing",
  BURN_RATE_ALERT: "Burn Rate Alert",
};

const TRIGGER_TYPE_COLORS: Record<string, string> = {
  SAMPLE_NO_ORDER: "bg-blue-100 text-blue-800",
  FIRST_ORDER_FOLLOWUP: "bg-green-100 text-green-800",
  CUSTOMER_TIMING: "bg-purple-100 text-purple-800",
  BURN_RATE_ALERT: "bg-orange-100 text-orange-800",
};

export function TriggerCard({ trigger, onUpdate }: TriggerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleToggleActive = async () => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/triggers/${trigger.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !trigger.isActive }),
      });
      if (!response.ok) throw new Error("Failed to update trigger");
      onUpdate();
    } catch (error) {
      console.error("Error updating trigger:", error);
      alert("Failed to update trigger");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to deactivate this trigger?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/triggers/${trigger.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete trigger");
      onUpdate();
    } catch (error) {
      console.error("Error deleting trigger:", error);
      alert("Failed to delete trigger");
    }
  };

  const stats = trigger.statistics;
  const config = trigger.config;

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Trigger</CardTitle>
        </CardHeader>
        <CardContent>
          <TriggerForm
            trigger={trigger}
            onSuccess={() => {
              setIsEditing(false);
              onUpdate();
            }}
            onCancel={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  if (showTasks) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{trigger.name}</CardTitle>
              <CardDescription>Tasks created by this trigger</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTasks(false)}
            >
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TriggeredTasksList triggerId={trigger.id} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={!trigger.isActive ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle>{trigger.name}</CardTitle>
              <Badge className={TRIGGER_TYPE_COLORS[trigger.triggerType]}>
                {TRIGGER_TYPE_LABELS[trigger.triggerType]}
              </Badge>
              {!trigger.isActive && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            {trigger.description && (
              <CardDescription>{trigger.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={trigger.isActive}
              onCheckedChange={handleToggleActive}
              disabled={updating}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTasks(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold">{stats.totalTasksCreated}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.tasksCompleted}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-orange-600">
              {stats.tasksPending}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Completion Rate</p>
            <p className="text-2xl font-bold">
              {stats.completionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Configuration:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {config.daysAfter !== undefined && (
              <div>
                <span className="text-muted-foreground">Days After:</span>{" "}
                <span className="font-medium">{config.daysAfter}</span>
              </div>
            )}
            {config.priority && (
              <div>
                <span className="text-muted-foreground">Priority:</span>{" "}
                <span className="font-medium">{config.priority}</span>
              </div>
            )}
            {config.percentageThreshold !== undefined && (
              <div>
                <span className="text-muted-foreground">Threshold:</span>{" "}
                <span className="font-medium">{config.percentageThreshold}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
