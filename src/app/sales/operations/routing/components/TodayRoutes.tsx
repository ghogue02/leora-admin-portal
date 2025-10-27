'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Phone, MapPin } from 'lucide-react';

interface Route {
  id: string;
  name: string;
  driver: string;
  driverPhone?: string;
  truck: string;
  status: 'not_started' | 'in_progress' | 'completed';
  totalStops: number;
  completedStops: number;
  currentStop?: string;
}

interface TodayRoutesProps {
  routes: Route[];
  onContactDriver?: (driverPhone: string) => void;
  onViewRoute?: (routeId: string) => void;
}

export function TodayRoutes({ routes, onContactDriver, onViewRoute }: TodayRoutesProps) {
  const groupedRoutes = routes.reduce((acc, route) => {
    const key = `${route.driver} - ${route.truck}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(route);
    return acc;
  }, {} as Record<string, Route[]>);

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedRoutes).map(([driverTruck, driverRoutes]) => {
        const firstRoute = driverRoutes[0];

        return (
          <Card key={driverTruck}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" />
                  {firstRoute.driver}
                  <span className="text-gray-500 font-normal ml-2">
                    - {firstRoute.truck}
                  </span>
                </CardTitle>
                {firstRoute.driverPhone && onContactDriver && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onContactDriver(firstRoute.driverPhone!)}
                    className="touch-target"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Contact
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {driverRoutes.map((route) => {
                  const progress = route.totalStops > 0
                    ? Math.round((route.completedStops / route.totalStops) * 100)
                    : 0;

                  return (
                    <div key={route.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{route.name}</span>
                            <Badge className={statusColors[route.status]} variant="outline">
                              {statusLabels[route.status]}
                            </Badge>
                          </div>
                          {route.currentStop && (
                            <div className="text-sm text-gray-600 mt-1">
                              Current: {route.currentStop}
                            </div>
                          )}
                        </div>
                        {onViewRoute && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewRoute(route.id)}
                            className="touch-target"
                          >
                            <MapPin className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold">
                            {route.completedStops} of {route.totalStops} stops
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              route.status === 'completed'
                                ? 'bg-green-500'
                                : route.status === 'in_progress'
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-right text-sm text-gray-600 mt-1">
                          {progress}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {routes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No routes scheduled for today
          </CardContent>
        </Card>
      )}
    </div>
  );
}
