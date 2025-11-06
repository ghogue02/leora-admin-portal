'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Route,
  Navigation,
  Download,
  MapPin,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { formatDistance, formatDrivingTime } from '@/lib/distance';
import { formatUTCDate } from '@/lib/dates';

interface RouteStop {
  order: number;
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  phone: string;
}

interface RouteSegment {
  from: { name: string; address: string };
  to: { name: string; address: string };
  distance: number;
  drivingTime: number;
}

interface OptimizedRoute {
  stops: RouteStop[];
  totalDistance: number;
  totalDuration: number;
  segments: RouteSegment[];
  directions: Array<{
    step: number;
    instruction: string;
    address: string;
    distance: number;
    duration: number;
  }>;
}

interface RoutePlannerProps {
  tenantId: string;
  selectedCustomers: string[];
  onRouteGenerated?: (route: OptimizedRoute) => void;
}

export default function RoutePlanner({
  tenantId,
  selectedCustomers,
  onRouteGenerated,
}: RoutePlannerProps) {
  const [startLocation, setStartLocation] = useState({ latitude: '', longitude: '' });
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [showDirections, setShowDirections] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartLocation({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location');
        setLoading(false);
      }
    );
  };

  const handleOptimizeRoute = async () => {
    if (!startLocation.latitude || !startLocation.longitude) {
      alert('Please set your starting location');
      return;
    }

    if (selectedCustomers.length === 0) {
      alert('Please select customers to visit');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/maps/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          startLatitude: parseFloat(startLocation.latitude),
          startLongitude: parseFloat(startLocation.longitude),
          customerIds: selectedCustomers,
          algorithm: '2-opt',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to optimize route');
      }

      const data = await response.json();
      setRoute(data.optimizedRoute);

      if (onRouteGenerated) {
        onRouteGenerated(data.optimizedRoute);
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
      alert('Failed to optimize route');
    } finally {
      setLoading(false);
    }
  };

  const handleExportRoute = () => {
    if (!route) return;

    const exportData = {
      waypoints: route.stops.map(stop => ({
        name: stop.name,
        address: `${stop.address}, ${stop.city}, ${stop.state} ${stop.postalCode}`,
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      directions: route.directions,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-${formatUTCDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportToGoogleMaps = () => {
    if (!route || route.stops.length === 0) return;

    // Build Google Maps URL with waypoints
    const origin = `${startLocation.latitude},${startLocation.longitude}`;
    const destination = `${route.stops[route.stops.length - 1].latitude},${
      route.stops[route.stops.length - 1].longitude
    }`;

    const waypoints = route.stops
      .slice(0, -1)
      .map(stop => `${stop.latitude},${stop.longitude}`)
      .join('|');

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;

    window.open(url, '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Route Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Start Location */}
        <div className="space-y-2">
          <Label>Starting Location</Label>
          <Button
            variant="outline"
            onClick={handleGetCurrentLocation}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            Use My Location
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="start-lat" className="text-xs">
                Latitude
              </Label>
              <Input
                id="start-lat"
                type="number"
                step="0.000001"
                placeholder="37.7749"
                value={startLocation.latitude}
                onChange={(e) =>
                  setStartLocation({ ...startLocation, latitude: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="start-lng" className="text-xs">
                Longitude
              </Label>
              <Input
                id="start-lng"
                type="number"
                step="0.000001"
                placeholder="-122.4194"
                value={startLocation.longitude}
                onChange={(e) =>
                  setStartLocation({ ...startLocation, longitude: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Selected Customers */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium">
            {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''}{' '}
            selected
          </p>
        </div>

        {/* Optimize Button */}
        <Button
          onClick={handleOptimizeRoute}
          disabled={loading || selectedCustomers.length === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Optimizing Route...
            </>
          ) : (
            <>
              <Route className="h-4 w-4 mr-2" />
              Optimize Route
            </>
          )}
        </Button>

        {/* Route Summary */}
        {route && (
          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">Total Distance</p>
                <p className="text-lg font-semibold">
                  {formatDistance(route.totalDistance)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600">Total Time</p>
                <p className="text-lg font-semibold">
                  {formatDrivingTime(route.totalDuration)}
                </p>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportRoute}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportToGoogleMaps}
                className="flex-1"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Open in Google Maps
              </Button>
            </div>

            {/* Route Stops */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDirections(!showDirections)}
                className="w-full justify-between"
              >
                <span>Turn-by-Turn Directions</span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    showDirections ? 'rotate-90' : ''
                  }`}
                />
              </Button>

              {showDirections && (
                <div className="mt-2 max-h-[400px] overflow-y-auto space-y-2">
                  {route.directions.map((direction) => (
                    <div
                      key={direction.step}
                      className="p-3 border rounded-lg space-y-1"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                          {direction.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {direction.instruction}
                          </p>
                          <p className="text-xs text-gray-600">
                            {direction.address}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {formatDistance(direction.distance)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDrivingTime(direction.duration)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
