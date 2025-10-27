"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, AlertCircle } from "lucide-react";
import { TriggerCard } from "./components/TriggerCard";
import { TriggerForm } from "./components/TriggerForm";

interface TriggerStatistics {
  totalTasksCreated: number;
  tasksCompleted: number;
  tasksPending: number;
  completionRate: number;
}

interface AutomatedTrigger {
  id: string;
  triggerType: string;
  name: string;
  description: string | null;
  isActive: boolean;
  config: any;
  createdAt: string;
  updatedAt: string;
  statistics: TriggerStatistics;
}

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<AutomatedTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [processingJob, setProcessingJob] = useState(false);

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/triggers");
      if (!response.ok) throw new Error("Failed to load triggers");
      const data = await response.json();
      setTriggers(data.triggers);
    } catch (error) {
      console.error("Error loading triggers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessTriggers = async () => {
    try {
      setProcessingJob(true);
      const response = await fetch("/api/jobs/process-triggers", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to process triggers");
      const data = await response.json();
      alert(`Successfully created ${data.totalTasksCreated} tasks`);
      loadTriggers(); // Reload to get updated statistics
    } catch (error) {
      console.error("Error processing triggers:", error);
      alert("Failed to process triggers");
    } finally {
      setProcessingJob(false);
    }
  };

  const handleTriggerCreated = () => {
    setShowCreateForm(false);
    loadTriggers();
  };

  const activeTriggers = triggers.filter((t) => t.isActive);
  const inactiveTriggers = triggers.filter((t) => !t.isActive);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>Loading triggers...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automated Triggers</h1>
          <p className="text-muted-foreground mt-2">
            Configure automatic task creation based on customer behavior and sample tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleProcessTriggers}
            disabled={processingJob}
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            {processingJob ? "Processing..." : "Run Now"}
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Trigger
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Trigger</CardTitle>
            <CardDescription>
              Configure a new automated trigger to create tasks based on specific conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TriggerForm
              onSuccess={handleTriggerCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-semibold">Active Triggers</h2>
            <Badge>{activeTriggers.length}</Badge>
          </div>
          {activeTriggers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active triggers configured</p>
                <p className="text-sm mt-2">Create a trigger to automate task creation</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeTriggers.map((trigger) => (
                <TriggerCard
                  key={trigger.id}
                  trigger={trigger}
                  onUpdate={loadTriggers}
                />
              ))}
            </div>
          )}
        </div>

        {inactiveTriggers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-semibold">Inactive Triggers</h2>
              <Badge variant="secondary">{inactiveTriggers.length}</Badge>
            </div>
            <div className="grid gap-4">
              {inactiveTriggers.map((trigger) => (
                <TriggerCard
                  key={trigger.id}
                  trigger={trigger}
                  onUpdate={loadTriggers}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
