"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Repeat, Plus, X, Calendar } from "lucide-react";
import { toast } from "sonner";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

interface RecurringScheduleItem {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    accountNumber: string | null;
  };
  frequency: "weekly" | "biweekly" | "monthly";
  dayOfWeek: number | null;
  preferredTime: string | null;
  active: boolean;
}

interface RecurringScheduleProps {
  availableAccounts: Array<{ id: string; name: string; accountNumber: string | null }>;
  onScheduleCreated?: () => void;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const frequencyLabels: Record<"weekly" | "biweekly" | "monthly", string> = {
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
};

export default function RecurringSchedule({
  availableAccounts,
  onScheduleCreated,
}: RecurringScheduleProps) {
  const [schedules, setSchedules] = useState<RecurringScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [preferredTime, setPreferredTime] = useState<string>("09:00");

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sales/call-plan/carla/recurring", {
        credentials: "include",
        headers: tenantHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setSchedules(Array.isArray(data.recurringSchedules) ? data.recurringSchedules : []);
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error("Error loading recurring schedules:", error);
      toast.error("Failed to load recurring schedules");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select an account");
      return;
    }

    try {
      const response = await fetch("/api/sales/call-plan/carla/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          frequency,
          dayOfWeek,
          preferredTime,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create recurring schedule");
      }

      toast.success("Recurring schedule created");
      setShowDialog(false);
      setSelectedCustomerId("");
      setFrequency("weekly");
      setDayOfWeek(1);
      setPreferredTime("09:00");
      await loadSchedules();
      onScheduleCreated?.();
    } catch (error) {
      console.error("Error creating recurring schedule:", error);
      toast.error("Failed to create recurring schedule");
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm("Remove this recurring schedule?")) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/call-plan/carla/recurring/${scheduleId}`, {
        method: "DELETE",
        headers: tenantHeaders,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recurring schedule");
      }

      toast.success("Recurring schedule removed");
      await loadSchedules();
    } catch (error) {
      console.error("Error deleting recurring schedule:", error);
      toast.error("Failed to remove schedule");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-blue-600" />
              <CardTitle>Recurring Schedules</CardTitle>
            </div>
            <Button onClick={() => setShowDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Recurring
            </Button>
          </div>
          <CardDescription>
            Automatically add accounts to future call plans
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-gray-500">
              No recurring schedules. Click "Add Recurring" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between rounded-lg border bg-white p-3"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">{schedule.customer.name}</h4>
                    {schedule.customer.accountNumber && (
                      <p className="text-xs text-gray-500">#{schedule.customer.accountNumber}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Badge variant="secondary">{frequencyLabels[schedule.frequency]}</Badge>
                      {schedule.dayOfWeek !== null && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dayNames[schedule.dayOfWeek]}
                        </Badge>
                      )}
                      {schedule.preferredTime && (
                        <Badge variant="outline">{schedule.preferredTime}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(schedule.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Recurring Schedule</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                      {account.accountNumber && ` (#${account.accountNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(value: "weekly" | "biweekly" | "monthly") => setFrequency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Day</Label>
              <Select value={dayOfWeek.toString()} onValueChange={(value) => setDayOfWeek(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((day, index) => (
                    <SelectItem key={day} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Time</Label>
              <Input
                type="time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Recurring</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
