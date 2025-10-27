"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TriggerConfigEditor } from "./TriggerConfigEditor";

interface TriggerFormProps {
  trigger?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const TRIGGER_TYPES = [
  {
    value: "SAMPLE_NO_ORDER",
    label: "Sample No Order",
    description: "Create tasks when samples don't result in orders",
  },
  {
    value: "FIRST_ORDER_FOLLOWUP",
    label: "First Order Follow-up",
    description: "Thank you tasks after customer's first order",
  },
  {
    value: "CUSTOMER_TIMING",
    label: "Customer Contact Timing",
    description: "Tasks when 'do not contact until' date passes",
  },
  {
    value: "BURN_RATE_ALERT",
    label: "Burn Rate Alert",
    description: "Reorder reminders based on ordering patterns",
  },
];

const DEFAULT_CONFIGS: Record<string, any> = {
  SAMPLE_NO_ORDER: {
    daysAfter: 7,
    priority: "MEDIUM",
    taskTitle: "Follow up on sample tasting",
    taskDescription: "Customer tasted a sample but hasn't ordered yet",
  },
  FIRST_ORDER_FOLLOWUP: {
    daysAfter: 1,
    priority: "HIGH",
    taskTitle: "Thank you call for first order",
    taskDescription: "First order delivered - call to ensure satisfaction",
  },
  CUSTOMER_TIMING: {
    priority: "MEDIUM",
    taskTitle: "Contact customer",
    taskDescription: "Customer's 'do not contact until' date has passed",
  },
  BURN_RATE_ALERT: {
    percentageThreshold: 20,
    priority: "MEDIUM",
    taskTitle: "Reorder check-in",
    taskDescription: "Customer may be due for reorder based on historical pace",
  },
};

export function TriggerForm({ trigger, onSuccess, onCancel }: TriggerFormProps) {
  const [formData, setFormData] = useState({
    triggerType: trigger?.triggerType || "",
    name: trigger?.name || "",
    description: trigger?.description || "",
    config: trigger?.config || {},
  });
  const [submitting, setSubmitting] = useState(false);

  const handleTriggerTypeChange = (value: string) => {
    setFormData({
      ...formData,
      triggerType: value,
      config: trigger ? formData.config : DEFAULT_CONFIGS[value],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.triggerType || !formData.name) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const url = trigger
        ? `/api/admin/triggers/${trigger.id}`
        : "/api/admin/triggers";
      const method = trigger ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save trigger");
      onSuccess();
    } catch (error) {
      console.error("Error saving trigger:", error);
      alert("Failed to save trigger");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = TRIGGER_TYPES.find((t) => t.value === formData.triggerType);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="triggerType">Trigger Type *</Label>
          <Select
            value={formData.triggerType}
            onValueChange={handleTriggerTypeChange}
            disabled={!!trigger}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select trigger type" />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedType && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedType.description}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="e.g., Sample Follow-up (7 days)"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Optional description of what this trigger does"
            rows={2}
          />
        </div>

        {formData.triggerType && (
          <TriggerConfigEditor
            triggerType={formData.triggerType}
            config={formData.config}
            onChange={(config) => setFormData({ ...formData, config })}
          />
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : trigger ? "Update" : "Create"} Trigger
        </Button>
      </div>
    </form>
  );
}
