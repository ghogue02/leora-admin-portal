"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, MessageSquare, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

interface ActivityEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSave: (activityData: ActivityData) => Promise<void>;
}

export interface ActivityData {
  customerId: string;
  activityType: string;
  description: string;
  outcome?: string;
}

const QUICK_TEMPLATES = [
  {
    icon: Phone,
    label: "Left Voicemail",
    type: "PHONE",
    description: "Left voicemail - requested callback",
  },
  {
    icon: MessageSquare,
    label: "Discussed Products",
    type: "MEETING",
    description: "Discussed new product offerings and pricing",
  },
  {
    icon: CheckCircle,
    label: "Took Order",
    type: "MEETING",
    description: "Took order - customer placed new order",
  },
  {
    icon: Mail,
    label: "Sent Email",
    type: "EMAIL",
    description: "Sent follow-up email with product information",
  },
  {
    icon: Clock,
    label: "Scheduled Follow-up",
    type: "PHONE",
    description: "Scheduled follow-up call for next week",
  },
];

export default function ActivityEntryModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSave,
}: ActivityEntryModalProps) {
  const [activityType, setActivityType] = useState("MEETING");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleQuickTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setActivityType(template.type);
    setDescription(template.description);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error("Please enter activity description");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        customerId,
        activityType,
        description,
      });
      toast.success("Activity logged successfully");
      onClose();
      // Reset form
      setDescription("");
      setActivityType("MEETING");
    } catch (error) {
      console.error("Error saving activity:", error);
      toast.error("Failed to log activity");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setDescription("");
    setActivityType("MEETING");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Activity - {customerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Templates */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Templates</label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <Button
                    key={template.label}
                    variant="outline"
                    onClick={() => handleQuickTemplate(template)}
                    className="justify-start gap-2 h-auto py-3"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{template.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Activity Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Activity Type</label>
            <div className="flex gap-2">
              {[
                { value: "MEETING", label: "Meeting" },
                { value: "PHONE", label: "Phone Call" },
                { value: "EMAIL", label: "Email" },
                { value: "TASK", label: "Task" },
              ].map((type) => (
                <Badge
                  key={type.value}
                  variant={activityType === type.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActivityType(type.value)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Activity Description
            </label>
            <Textarea
              placeholder="What did you discuss or accomplish?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include key topics, outcomes, or next steps
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip}>
            Skip for Now
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !description.trim()}>
            {isSaving ? "Saving..." : "Save Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
