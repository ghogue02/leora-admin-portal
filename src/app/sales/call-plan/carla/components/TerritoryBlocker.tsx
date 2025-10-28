"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Map as MapIcon, Sparkles, Trash2 } from "lucide-react";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

type TerritoryBlock = {
  id: string;
  territory: string;
  dayOfWeek: number;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

type TerritorySuggestion = {
  territory: string;
  suggestedDayOfWeek: number;
  existingBlockId?: string;
  estimatedMinutesSaved: number;
  accountCount: number;
  message: string;
  rationale: string[];
};

type TerritoryBlockerProps = {
  callPlanId?: string;
  availableTerritories: string[];
  onBlocksChange: () => void;
};

const DAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
];

const TIME_OPTIONS = Array.from({ length: 21 }, (_, idx) => {
  const hour = 8 + Math.floor(idx / 2);
  const minutes = idx % 2 === 0 ? "00" : "30";
  const value = `${String(hour).padStart(2, "0")}:${minutes}`;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return {
    value,
    label: `${hour12}:${minutes} ${suffix}`,
  };
});

function formatTimeLabel(time?: string | null) {
  if (!time) return "Start";
  const option = TIME_OPTIONS.find((item) => item.value === time);
  return option?.label ?? time;
}

function dayName(day: number) {
  return DAYS.find((item) => item.value === day)?.label ?? `Day ${day}`;
}

function generateColor(territory: string) {
  let hash = 0;
  for (let i = 0; i < territory.length; i += 1) {
    hash = territory.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 70% 80%)`;
}

export default function TerritoryBlocker({
  callPlanId,
  availableTerritories,
  onBlocksChange,
}: TerritoryBlockerProps) {
  const [blocks, setBlocks] = useState<TerritoryBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draggingTerritory, setDraggingTerritory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("planner");
  const [suggestions, setSuggestions] = useState<TerritorySuggestion[]>([]);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  const loadBlocks = useCallback(async () => {
    if (!callPlanId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/sales/call-plan/carla/territory-blocks?callPlanId=${callPlanId}`,
        {
          credentials: "include",
          headers: tenantHeaders,
        },
      );
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks ?? []);
      } else {
        setBlocks([]);
      }
    } catch (error) {
      console.error("[TerritoryBlocker] loadBlocks", error);
      toast.error("Unable to load territory blocks");
      setBlocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [callPlanId]);

  const loadSuggestions = useCallback(async () => {
    if (!callPlanId) return;
    setIsSuggestionLoading(true);
    try {
      const response = await fetch(
        `/api/sales/call-plan/carla/territory/suggestions?callPlanId=${callPlanId}`,
        {
          credentials: "include",
          headers: tenantHeaders,
        },
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("[TerritoryBlocker] loadSuggestions", error);
      setSuggestions([]);
    } finally {
      setIsSuggestionLoading(false);
    }
  }, [callPlanId]);

  useEffect(() => {
    loadBlocks();
    loadSuggestions();
  }, [loadBlocks, loadSuggestions]);

  useEffect(() => {
    if (!callPlanId) return;
    onBlocksChange();
  }, [blocks, callPlanId, onBlocksChange]);

  const territories = useMemo(() => {
    const set = new Set<string>();
    availableTerritories.forEach((territory) => {
      if (territory) {
        set.add(territory);
      }
    });

    // Include territories that already have blocks even if not in selection anymore
    blocks.forEach((block) => set.add(block.territory));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableTerritories, blocks]);

  const blocksByDay = useMemo(() => {
    const map = new Map<number, TerritoryBlock[]>();
    DAYS.forEach((day) => map.set(day.value, []));
    blocks.forEach((block) => {
      if (!map.has(block.dayOfWeek)) {
        map.set(block.dayOfWeek, []);
      }
      map.get(block.dayOfWeek)?.push(block);
    });
    return map;
  }, [blocks]);

  const handleAssignBlock = async (territory: string, dayOfWeek: number) => {
    if (!callPlanId) return;
    try {
      const response = await fetch("/api/sales/call-plan/carla/territory-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({
          callPlanId,
          territory,
          dayOfWeek,
          allDay: true,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error ?? "Unable to assign territory");
        return;
      }

      const { block } = await response.json();
      setBlocks((prev) => {
        const next = prev.filter(
          (existing) =>
            !(
              existing.dayOfWeek === block.dayOfWeek &&
              existing.territory === block.territory
            ),
        );
        next.push(block);
        return next;
      });
      toast.success(`Assigned ${territory} to ${dayName(dayOfWeek)}`);
      loadSuggestions();
    } catch (error) {
      console.error("[TerritoryBlocker] assign", error);
      toast.error("Unable to assign territory");
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    try {
      const response = await fetch(
        `/api/sales/call-plan/carla/territory-blocks/${blockId}`,
        { method: "DELETE", credentials: "include", headers: tenantHeaders },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error ?? "Failed to remove territory block");
        return;
      }

      setBlocks((prev) => prev.filter((block) => block.id !== blockId));
      toast.success("Removed territory assignment");
      loadSuggestions();
    } catch (error) {
      console.error("[TerritoryBlocker] remove", error);
      toast.error("Unable to remove territory block");
    }
  };

  const handleTimeChange = async (
    block: TerritoryBlock,
    part: "startTime" | "endTime" | "allDay",
    value: string | boolean,
  ) => {
    if (part === "allDay") {
      value = Boolean(value);
    }

    try {
      const response = await fetch(
        `/api/sales/call-plan/carla/territory-blocks/${block.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...tenantHeaders },
          credentials: "include",
          body:
            part === "allDay"
              ? JSON.stringify({ allDay: value })
              : JSON.stringify({
                  allDay: block.allDay,
                  startTime: part === "startTime" ? value : block.startTime,
                  endTime: part === "endTime" ? value : block.endTime,
                }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error ?? "Failed to update block");
        return;
      }

      const { block: updated } = await response.json();
      setBlocks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Territory window updated");
    } catch (error) {
      console.error("[TerritoryBlocker] update", error);
      toast.error("Unable to update block");
    }
  };

  const handleDragStart = (territory: string) => () => {
    setDraggingTerritory(territory);
  };

  const handleDragEnd = () => {
    setDraggingTerritory(null);
  };

  const handleDrop = (dayOfWeek: number) => {
    if (!draggingTerritory) return;
    handleAssignBlock(draggingTerritory, dayOfWeek);
    setDraggingTerritory(null);
  };

  const plannerContent = (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
          Available Territories
        </p>
        <div className="space-y-2">
          {territories.length === 0 ? (
            <p className="text-sm text-gray-500">
              Assign territories to customers to enable blocking.
            </p>
          ) : (
            territories.map((territory) => (
              <div
                key={territory}
                draggable
                onDragStart={handleDragStart(territory)}
                onDragEnd={handleDragEnd}
                className="flex cursor-grab items-center justify-between rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-slate-50"
                style={{ borderLeftColor: generateColor(territory) }}
              >
                <span className="font-medium text-gray-700">{territory}</span>
                <Badge variant="outline">Drag to a day</Badge>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {DAYS.map((day) => (
          <div
            key={day.value}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(day.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{day.label}</p>
              <Badge variant="secondary" className="bg-white text-slate-500">
                {blocksByDay.get(day.value)?.length ?? 0}
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              {(blocksByDay.get(day.value) ?? []).map((block) => (
                <div
                  key={block.id}
                  className="rounded-md border border-slate-200 bg-white p-2 text-xs shadow-sm"
                  style={{ borderLeft: `4px solid ${generateColor(block.territory)}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{block.territory}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={() => handleRemoveBlock(block.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-gray-500">
                    <Clock className="h-3 w-3" />
                    {block.allDay ? (
                      <span>All Day</span>
                    ) : (
                      <span>
                        {formatTimeLabel(block.startTime)} – {formatTimeLabel(block.endTime)}
                      </span>
                    )}
                  </div>
                  {!block.allDay && (
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        className="flex-1 rounded border border-slate-200 p-1 text-xs"
                        value={block.startTime ?? ""}
                        onChange={(event) =>
                          handleTimeChange(block, "startTime", event.target.value)
                        }
                      >
                        <option value="">Start time</option>
                        {TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="flex-1 rounded border border-slate-200 p-1 text-xs"
                        value={block.endTime ?? ""}
                        onChange={(event) =>
                          handleTimeChange(block, "endTime", event.target.value)
                        }
                      >
                        <option value="">End time</option>
                        {TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={block.allDay}
                        onChange={(event) =>
                          handleTimeChange(block, "allDay", event.target.checked)
                        }
                      />
                      All day
                    </label>
                  </div>
                </div>
              ))}
              {(blocksByDay.get(day.value) ?? []).length === 0 && (
                <div className="rounded border border-dashed border-slate-300 bg-white/70 p-3 text-center text-xs text-slate-500">
                  Drop a territory here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const suggestionContent = (
    <div>
      {isSuggestionLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, idx) => (
            <Skeleton key={idx} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-slate-500">
          No suggestions available yet. Add accounts to your call plan or assign territories to
          unlock smart recommendations.
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <Card key={`${suggestion.territory}-${suggestion.suggestedDayOfWeek}`}>
              <CardContent className="space-y-2 py-4 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700"
                      style={{ borderColor: generateColor(suggestion.territory) }}
                    >
                      {suggestion.territory}
                    </Badge>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                      {Math.round(suggestion.estimatedMinutesSaved)} min saved
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleAssignBlock(
                        suggestion.territory,
                        suggestion.suggestedDayOfWeek,
                      )
                    }
                    disabled={!callPlanId}
                  >
                    Apply to {dayName(suggestion.suggestedDayOfWeek)}
                  </Button>
                </div>
                <p className="text-gray-700">{suggestion.message}</p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
                  {suggestion.rationale.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4 text-right">
        <Button
          size="sm"
          variant="ghost"
          onClick={loadSuggestions}
          className="gap-2 text-slate-500"
        >
          <Sparkles className="h-4 w-4" />
          Refresh suggestions
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="border-blue-100">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <MapIcon className="h-5 w-5" />
          Territory Blocking
        </CardTitle>
        <p className="text-xs text-gray-500">
          Drag territories onto days to focus visits and reduce drive time.
        </p>
      </CardHeader>
      <CardContent>
        {!callPlanId ? (
          <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Select accounts to create a call plan before configuring territory blocks.
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-32 w-full rounded" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="planner">Planner</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>
            <TabsContent value="planner">{plannerContent}</TabsContent>
            <TabsContent value="suggestions">{suggestionContent}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
