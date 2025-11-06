'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  Phone,
  Bell,
  Navigation,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { getTodayLocal } from '@/lib/dates';

interface RouteStop {
  id: string;
  stopNumber: number;
  estimatedArrival: string;
  actualArrival?: string;
  status: string;
  notes?: string;
  route: {
    id: string;
    routeName: string;
    driverName: string;
    truckNumber?: string;
  };
  order: {
    id: string;
    customer: {
      name: string; // Customer name
      phone?: string;
      email?: string;
      street1?: string; // Shipping address
      city?: string;
      state?: string;
      postalCode?: string;
    };
    lines: Array<{
      quantity: number;
      sku: {
        product: {
          name: string;
        };
      };
    }>;
  };
}

export default function DeliveryTrackingPage() {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());

  useEffect(() => {
    fetchStops();
  }, [selectedDate]);

  const fetchStops = async () => {
    try {
      const response = await fetch(`/api/operations/delivery-tracking?date=${selectedDate}`);
      const data = await response.json();
      setStops(data.stops || []);
    } catch (error) {
      toast.error('Failed to load delivery tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStopStatus = async (stopId: string, status: string) => {
    try {
      const routeId = stops.find(s => s.id === stopId)?.route.id;
      const response = await fetch(`/api/operations/routes/${routeId}/stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Status updated');
      fetchStops();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleNotifyCustomer = async (stopId: string, type: string) => {
    try {
      const response = await fetch('/api/operations/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId, type }),
      });

      if (!response.ok) throw new Error('Failed to send notification');

      toast.success('Customer notified');
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const groupedByRoute = stops.reduce((acc, stop) => {
    const routeId = stop.route.id;
    if (!acc[routeId]) {
      acc[routeId] = {
        route: stop.route,
        stops: [],
      };
    }
    acc[routeId].stops.push(stop);
    return acc;
  }, {} as Record<string, { route: any; stops: RouteStop[] }>);

  const pendingStops = stops.filter(s => s.status === 'pending');
  const inProgressStops = stops.filter(s => s.status === 'in_progress');
  const completedStops = stops.filter(s => s.status === 'completed' || s.status === 'delivered');

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Delivery Tracking</h1>
          <p className="text-gray-600 mt-1">Real-time delivery status and notifications</p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gray-50">
          <div className="text-sm text-gray-600 font-semibold">Pending</div>
          <div className="text-2xl font-bold">{pendingStops.length}</div>
        </Card>
        <Card className="p-4 bg-blue-50">
          <div className="text-sm text-blue-600 font-semibold">In Progress</div>
          <div className="text-2xl font-bold">{inProgressStops.length}</div>
        </Card>
        <Card className="p-4 bg-green-50">
          <div className="text-sm text-green-600 font-semibold">Completed</div>
          <div className="text-2xl font-bold">{completedStops.length}</div>
        </Card>
        <Card className="p-4 bg-purple-50">
          <div className="text-sm text-purple-600 font-semibold">Total Routes</div>
          <div className="text-2xl font-bold">{Object.keys(groupedByRoute).length}</div>
        </Card>
      </div>

      {/* Routes */}
      <div className="space-y-6">
        {Object.values(groupedByRoute).map(({ route, stops: routeStops }) => {
          const sortedStops = [...routeStops].sort((a, b) => a.stopNumber - b.stopNumber);
          const currentStop = sortedStops.find(s => s.status === 'in_progress');
          const completedCount = sortedStops.filter(s =>
            s.status === 'completed' || s.status === 'delivered'
          ).length;

          return (
            <Card key={route.id} className="p-6">
              {/* Route Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{route.routeName}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>Driver: {route.driverName}</span>
                      {route.truckNumber && <span>Truck: {route.truckNumber}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Progress</div>
                  <div className="text-lg font-bold">
                    {completedCount} / {sortedStops.length}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(completedCount / sortedStops.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stops */}
              <div className="space-y-4">
                {sortedStops.map((stop, idx) => {
                  const isCompleted = stop.status === 'completed' || stop.status === 'delivered';
                  const isInProgress = stop.status === 'in_progress';
                  const isPending = stop.status === 'pending';

                  return (
                    <div
                      key={stop.id}
                      className={`relative pl-8 pb-4 ${
                        idx !== sortedStops.length - 1 ? 'border-l-2 border-gray-300' : ''
                      }`}
                    >
                      {/* Timeline Dot */}
                      <div
                        className={`absolute left-0 top-0 -ml-1 h-4 w-4 rounded-full border-2 border-white ${getStatusColor(
                          stop.status
                        )}`}
                      />

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-semibold text-gray-500">
                              Stop #{stop.stopNumber}
                            </span>
                            <Badge
                              variant={
                                isCompleted
                                  ? 'default'
                                  : isInProgress
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {stop.status}
                            </Badge>
                          </div>

                          <div className="font-semibold text-lg mb-1">
                            {stop.order.customer.name}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            {stop.order.customer.street1 && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>
                                  {stop.order.customer.street1},{' '}
                                  {stop.order.customer.city},{' '}
                                  {stop.order.customer.state}{' '}
                                  {stop.order.customer.postalCode}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                ETA:{' '}
                                {new Date(stop.estimatedArrival).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {stop.actualArrival && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>
                                  Delivered:{' '}
                                  {new Date(stop.actualArrival).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>
                                {stop.order.lines.reduce((sum, line) => sum + line.quantity, 0)}{' '}
                                items
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {stop.order.customer.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `tel:${stop.order.customer.phone}`}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}

                          {!isCompleted && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNotifyCustomer(stop.id, 'on_the_way')}
                              >
                                <Bell className="h-4 w-4" />
                              </Button>

                              {isPending && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStopStatus(stop.id, 'in_progress')}
                                >
                                  Start
                                </Button>
                              )}

                              {isInProgress && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStopStatus(stop.id, 'completed')}
                                >
                                  Complete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {Object.keys(groupedByRoute).length === 0 && (
          <Card className="p-12 text-center text-gray-500">
            No deliveries scheduled for this date
          </Card>
        )}
      </div>
    </div>
  );
}
