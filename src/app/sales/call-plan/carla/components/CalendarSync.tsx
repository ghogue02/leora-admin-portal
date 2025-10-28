"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

type CalendarProvider = "google" | null;

interface CalendarSyncProps {
  callPlanId?: string;
  weekStart: Date;
}

interface SyncStatus {
  isConnected: boolean;
  provider: CalendarProvider;
  lastSync?: string;
  syncedEvents: number;
}

export default function CalendarSync({ callPlanId, weekStart }: CalendarSyncProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    provider: null,
    syncedEvents: 0,
  });
  const [scheduleCount, setScheduleCount] = useState<number | null>(null);

  const loadSyncStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/sales/call-plan/carla/calendar/status", {
        credentials: "include",
        headers: tenantHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  }, []);

  const loadScheduleCount = useCallback(async () => {
    if (!callPlanId) {
      setScheduleCount(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/sales/call-plan/carla/schedule?callPlanId=${callPlanId}&weekStart=${format(weekStart, "yyyy-MM-dd")}`,
        {
          credentials: "include",
          headers: tenantHeaders,
        },
      );
      if (response.ok) {
        const data = await response.json();
        setScheduleCount(Array.isArray(data.schedules) ? data.schedules.length : 0);
      } else {
        setScheduleCount(null);
      }
    } catch (error) {
      console.error("Error loading schedule count:", error);
      setScheduleCount(null);
    }
  }, [callPlanId, weekStart]);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus, callPlanId]);

  useEffect(() => {
    loadScheduleCount();
  }, [loadScheduleCount]);

  useEffect(() => {
    if (showDialog) {
      loadScheduleCount();
    }
  }, [showDialog, loadScheduleCount]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Initiate OAuth flow
      const response = await fetch("/api/sales/call-plan/carla/calendar/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ provider: "google" }),
        credentials: "include",
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        // Open OAuth window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const authWindow = window.open(
          authUrl,
          "Calendar Authorization",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for OAuth callback
        window.addEventListener("message", async (event) => {
          if (event.data.type === "calendar-auth-success") {
            authWindow?.close();
            toast.success("Connected to Google Calendar");
            await loadSyncStatus();
            setIsConnecting(false);
          } else if (event.data.type === "calendar-auth-error") {
            authWindow?.close();
            toast.error("Failed to connect calendar");
            setIsConnecting(false);
          }
        });
      } else {
        toast.error("Failed to initiate calendar connection");
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("Error connecting calendar:", error);
      toast.error("Failed to connect calendar");
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!callPlanId) {
      toast.error("No call plan to sync");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/sales/call-plan/carla/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ callPlanId, weekStart: weekStart.toISOString() }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.eventCount} events to calendar`);
        await loadSyncStatus();
        setShowDialog(false);
        await loadScheduleCount();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to sync calendar");
      }
    } catch (error) {
      console.error("Error syncing calendar:", error);
      toast.error("Failed to sync calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/sales/call-plan/carla/calendar/disconnect", {
        method: "POST",
        headers: tenantHeaders,
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Calendar disconnected");
        setSyncStatus({
          isConnected: false,
          provider: null,
          syncedEvents: 0,
        });
      }
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      toast.error("Failed to disconnect calendar");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="gap-2"
        disabled={!callPlanId}
      >
        <Calendar className="h-4 w-4" />
        Calendar Sync
        {syncStatus.isConnected && (
          <Badge variant="secondary" className="ml-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calendar Integration</DialogTitle>
            <DialogDescription>
              Sync your call plan to your calendar for easy scheduling
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {syncStatus.isConnected ? (
              <>
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        Google Calendar
                      </p>
                      {syncStatus.lastSync && (
                        <p className="text-sm text-green-700">
                          Last synced: {format(new Date(syncStatus.lastSync), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Sync Options</h4>
                  <p className="text-sm text-gray-600">
                    Events will be created for each account in your call plan with:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                    <li>Customer name as event title</li>
                    <li>Address as location</li>
                    <li>30-minute duration (adjustable)</li>
                    <li>Objectives in description</li>
                    <li>Two-way sync for completion status</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Connect your calendar</p>
                    <p>
                      Drag-and-drop accounts to specific times, get reminders, and automatically
                      mark accounts as contacted when events complete.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    Connect Google Calendar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {syncStatus.isConnected && (
            <>
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">What will be synced:</p>
                <p>
                  Only accounts with specific time slots on your call plan calendar are included.
                  Drag accounts from the sidebar onto the calendar before syncing.
                </p>
                {scheduleCount !== null && (
                  <p className="mt-2 text-gray-700">
                    <span className="font-semibold">{scheduleCount}</span>{" "}
                    scheduled visit{scheduleCount === 1 ? "" : "s"} ready to sync.
                  </p>
                )}
                {scheduleCount !== null && scheduleCount === 0 && (
                  <p className="mt-2 text-red-600">
                    No scheduled accounts yet — add time slots before syncing.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Close
                </Button>
                <Button
                  onClick={handleSync}
                  disabled={
                    isSyncing ||
                    !callPlanId ||
                    (scheduleCount !== null && scheduleCount === 0)
                  }
                  className="gap-2"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {scheduleCount !== null
                        ? `Sync ${scheduleCount} scheduled visit${scheduleCount === 1 ? "" : "s"}`
                        : "Sync to Calendar"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
