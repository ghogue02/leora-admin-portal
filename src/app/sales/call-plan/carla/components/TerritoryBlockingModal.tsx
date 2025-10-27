"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TerritoryBlockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (location: string, radius: number, timeBlock?: string) => void;
}

interface LocationSuggestion {
  name: string;
  city: string;
  state: string;
  accountCount: number;
}

export default function TerritoryBlockingModal({
  isOpen,
  onClose,
  onApplyFilter,
}: TerritoryBlockingModalProps) {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("10");
  const [timeBlock, setTimeBlock] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [nearbyCount, setNearbyCount] = useState(0);

  useEffect(() => {
    if (isOpen && location) {
      fetchNearbyCounts();
    }
  }, [location, radius]);

  const fetchNearbyCounts = async () => {
    try {
      const response = await fetch(
        `/api/sales/call-plan/carla/territory/nearby?location=${encodeURIComponent(
          location
        )}&radius=${radius}`
      );
      if (response.ok) {
        const data = await response.json();
        setNearbyCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching nearby counts:", error);
    }
  };

  const handleUseCurrentLocation = () => {
    setIsGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Reverse geocode to get address
            const response = await fetch(
              `/api/sales/call-plan/carla/territory/geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
            );
            if (response.ok) {
              const data = await response.json();
              setLocation(data.address);
              toast.success("Location detected");
            }
          } catch (error) {
            toast.error("Failed to get address");
          } finally {
            setIsGettingLocation(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Failed to get your location");
          setIsGettingLocation(false);
        }
      );
    } else {
      toast.error("Geolocation not supported");
      setIsGettingLocation(false);
    }
  };

  const handleApply = () => {
    if (!location.trim()) {
      toast.error("Please enter a location");
      return;
    }
    onApplyFilter(location, parseInt(radius), timeBlock || undefined);
    toast.success(`Filtering to accounts within ${radius} miles of ${location}`);
    onClose();
  };

  const handleClear = () => {
    setLocation("");
    setRadius("10");
    setTimeBlock("");
    setNearbyCount(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Territory Blocking
          </DialogTitle>
          <DialogDescription>
            Focus on accounts in a specific area for efficient routing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location Input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Location</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter city, zip code, or address..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={isGettingLocation}
                className="gap-2"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Current
              </Button>
            </div>
          </div>

          {/* Radius Selection */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Search Radius</label>
            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Within 5 miles</SelectItem>
                <SelectItem value="10">Within 10 miles</SelectItem>
                <SelectItem value="15">Within 15 miles</SelectItem>
                <SelectItem value="20">Within 20 miles</SelectItem>
                <SelectItem value="25">Within 25 miles</SelectItem>
                <SelectItem value="50">Within 50 miles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Block */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Time Block (Optional)</label>
            <Select value={timeBlock} onValueChange={setTimeBlock}>
              <SelectTrigger>
                <SelectValue placeholder="Select time block..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Day</SelectItem>
                <SelectItem value="morning">Morning (8am - 12pm)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                <SelectItem value="evening">Evening (5pm - 8pm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Preview */}
          {location && nearbyCount > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {nearbyCount} accounts found
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Within {radius} miles of {location}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-2 block">Quick Options</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="gap-2"
              >
                Clear Filter
              </Button>
              {nearbyCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Add all nearby to plan
                    toast.info("Adding all nearby accounts to plan...");
                  }}
                  className="gap-2"
                >
                  Add All to Plan
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!location.trim()} className="gap-2">
            <MapPin className="h-4 w-4" />
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
