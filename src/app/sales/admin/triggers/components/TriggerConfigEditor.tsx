"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TriggerConfigEditorProps {
  triggerType: string;
  config: any;
  onChange: (config: any) => void;
}

export function TriggerConfigEditor({
  triggerType,
  config,
  onChange,
}: TriggerConfigEditorProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <h3 className="font-medium">Trigger Configuration</h3>

      {(triggerType === "SAMPLE_NO_ORDER" || triggerType === "FIRST_ORDER_FOLLOWUP") && (
        <div>
          <Label htmlFor="daysAfter">Days After Event</Label>
          <Input
            id="daysAfter"
            type="number"
            min="1"
            max="90"
            value={config.daysAfter || ""}
            onChange={(e) =>
              updateConfig("daysAfter", parseInt(e.target.value))
            }
            placeholder={triggerType === "SAMPLE_NO_ORDER" ? "7" : "1"}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {triggerType === "SAMPLE_NO_ORDER"
              ? "Days after sample tasting to trigger follow-up"
              : "Days after first order delivery to send thank you task"}
          </p>
        </div>
      )}

      {triggerType === "BURN_RATE_ALERT" && (
        <div>
          <Label htmlFor="percentageThreshold">Threshold Percentage</Label>
          <Input
            id="percentageThreshold"
            type="number"
            min="0"
            max="100"
            value={config.percentageThreshold || ""}
            onChange={(e) =>
              updateConfig("percentageThreshold", parseInt(e.target.value))
            }
            placeholder="20"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Percentage past expected order date to trigger alert (e.g., 20% = alert 20% past average interval)
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="priority">Task Priority</Label>
        <Select
          value={config.priority || "MEDIUM"}
          onValueChange={(value) => updateConfig("priority", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="taskTitle">Task Title Template</Label>
        <Input
          id="taskTitle"
          value={config.taskTitle || ""}
          onChange={(e) => updateConfig("taskTitle", e.target.value)}
          placeholder="Follow up on sample tasting"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Title for automatically created tasks
        </p>
      </div>

      <div>
        <Label htmlFor="taskDescription">Task Description Template</Label>
        <Textarea
          id="taskDescription"
          value={config.taskDescription || ""}
          onChange={(e) => updateConfig("taskDescription", e.target.value)}
          placeholder="Customer tasted a sample but hasn't ordered yet"
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Description for automatically created tasks
        </p>
      </div>
    </div>
  );
}
