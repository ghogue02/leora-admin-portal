'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Clock, Package } from 'lucide-react';

interface RouteStop {
  id: string;
  sequence: number;
  orderNumber: string;
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  deliveryInstructions?: string;
  estimatedArrival?: string;
  status: 'pending' | 'completed' | 'in_progress';
  itemCount: number;
}

interface RouteViewerProps {
  route: {
    id: string;
    name: string;
    driver?: string;
    truck?: string;
    stops: RouteStop[];
  };
}

export function RouteViewer({ route }: RouteViewerProps) {
  const completedStops = route.stops.filter(s => s.status === 'completed').length;
  const totalStops = route.stops.length;

  const openInMaps = (address: string, city: string, state: string, zip: string) => {
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const openRouteInMaps = () => {
    if (route.stops.length === 0) return;

    // Create waypoints for Google Maps
    const origin = route.stops[0];
    const destination = route.stops[route.stops.length - 1];
    const waypoints = route.stops.slice(1, -1);

    const originStr = encodeURIComponent(`${origin.address}, ${origin.city}, ${origin.state} ${origin.zip}`);
    const destStr = encodeURIComponent(`${destination.address}, ${destination.city}, ${destination.state} ${destination.zip}`);
    const waypointsStr = waypoints
      .map(w => encodeURIComponent(`${w.address}, ${w.city}, ${w.state} ${w.zip}`))
      .join('|');

    const url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}${waypointsStr ? `&waypoints=${waypointsStr}` : ''}`;
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Navigation className="mr-2 h-5 w-5" />
            {route.name}
          </CardTitle>
          <Button onClick={openRouteInMaps} variant="outline" className="touch-target">
            <MapPin className="mr-2 h-4 w-4" />
            Open Route
          </Button>
        </div>
        {(route.driver || route.truck) && (
          <div className="flex gap-3 text-sm mt-2">
            {route.driver && (
              <div>
                <span className="text-gray-600">Driver:</span>{' '}
                <span className="font-semibold">{route.driver}</span>
              </div>
            )}
            {route.truck && (
              <div>
                <span className="text-gray-600">Truck:</span>{' '}
                <span className="font-semibold">{route.truck}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold">
              {completedStops} of {totalStops} stops
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(completedStops / totalStops) * 100}%` }}
            />
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-3">
          {route.stops.map((stop) => (
            <div
              key={stop.id}
              className={`p-4 border rounded-lg ${
                stop.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : stop.status === 'in_progress'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Sequence Number */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      stop.status === 'completed'
                        ? 'bg-green-600 text-white'
                        : stop.status === 'in_progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {stop.sequence}
                  </div>
                </div>

                {/* Stop Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stop.orderNumber}</span>
                        <Badge
                          variant={
                            stop.status === 'completed'
                              ? 'default'
                              : stop.status === 'in_progress'
                              ? 'default'
                              : 'outline'
                          }
                          className={
                            stop.status === 'completed'
                              ? 'bg-green-600'
                              : stop.status === 'in_progress'
                              ? 'bg-blue-600'
                              : ''
                          }
                        >
                          {stop.status === 'completed'
                            ? 'Completed'
                            : stop.status === 'in_progress'
                            ? 'In Progress'
                            : 'Pending'}
                        </Badge>
                      </div>
                      <div className="font-semibold mt-1">{stop.customerName}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {stop.address}
                        <br />
                        {stop.city}, {stop.state} {stop.zip}
                      </div>
                      {stop.deliveryInstructions && (
                        <div className="text-sm text-gray-600 mt-2 italic">
                          📝 {stop.deliveryInstructions}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => openInMaps(stop.address, stop.city, stop.state, stop.zip)}
                      variant="outline"
                      size="sm"
                      className="touch-target"
                    >
                      <MapPin className="mr-1 h-4 w-4" />
                      Map
                    </Button>
                  </div>

                  {/* Additional Info */}
                  <div className="flex gap-4 mt-3 text-sm">
                    {stop.estimatedArrival && (
                      <div className="flex items-center text-gray-600">
                        <Clock className="mr-1 h-4 w-4" />
                        {new Date(stop.estimatedArrival).toLocaleTimeString()}
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <Package className="mr-1 h-4 w-4" />
                      {stop.itemCount} items
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
