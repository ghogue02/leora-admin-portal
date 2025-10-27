/**
 * Route Visibility Service
 * Provides real-time route tracking and customer ETA visibility
 */

import { db } from '@/lib/db';
import { DeliveryRoute, RouteStop } from '@/types';

export interface RouteProgress {
  routeId: string;
  totalStops: number;
  completedStops: number;
  currentStop: RouteStop | null;
  nextStop: RouteStop | null;
  percentComplete: number;
  estimatedCompletion: Date | null;
  onTimeStatus: 'on_time' | 'delayed' | 'ahead';
}

export interface CustomerDeliveryInfo {
  route: DeliveryRoute | null;
  stop: RouteStop | null;
  eta: Date | null;
  driver: string | null;
  status: string;
  stopNumber: number | null;
  totalStops: number | null;
}

/**
 * Get all routes for today
 */
export async function getTodayRoutes(tenantId: string): Promise<DeliveryRoute[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const routes = await db.deliveryRoutes
    .where('tenant_id', '=', tenantId)
    .where('delivery_date', '>=', today)
    .where('delivery_date', '<', tomorrow)
    .orderBy('created_at', 'desc')
    .execute();

  // Enrich with stops and progress
  const enrichedRoutes = await Promise.all(
    routes.map(async (route) => {
      const stops = await db.routeStops
        .where('route_id', '=', route.id)
        .orderBy('stop_number', 'asc')
        .execute();

      const progress = calculateProgress(stops);

      return {
        ...route,
        stops,
        progress
      };
    })
  );

  return enrichedRoutes;
}

/**
 * Get customer's delivery ETA and route information
 */
export async function getCustomerDeliveryETA(
  customerId: string
): Promise<CustomerDeliveryInfo> {
  // Find today's order for customer
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const order = await db.orders
    .where('customer_id', '=', customerId)
    .where('delivery_date', '>=', today)
    .where('delivery_date', '<', tomorrow)
    .where('status', 'in', ['picked', 'in_route', 'out_for_delivery'])
    .orderBy('delivery_date', 'desc')
    .executeTakeFirst();

  if (!order || !order.route_id) {
    return {
      route: null,
      stop: null,
      eta: null,
      driver: null,
      status: 'not_scheduled',
      stopNumber: null,
      totalStops: null
    };
  }

  // Get route and stop information
  const [route, stop] = await Promise.all([
    db.deliveryRoutes.where('id', '=', order.route_id).executeTakeFirst(),
    db.routeStops
      .where('route_id', '=', order.route_id)
      .where('order_number', '=', order.order_number)
      .executeTakeFirst()
  ]);

  // Calculate real-time ETA based on current progress
  const realTimeETA = await calculateRealTimeETA(order.route_id, stop);

  return {
    route: route || null,
    stop: stop || null,
    eta: realTimeETA,
    driver: route?.assigned_driver || null,
    status: stop?.status || 'scheduled',
    stopNumber: stop?.stop_number || null,
    totalStops: route?.total_stops || null
  };
}

/**
 * Update stop status and actual arrival time
 */
export async function updateStopStatus(
  stopId: string,
  status: 'pending' | 'in_transit' | 'arrived' | 'delivered' | 'failed',
  actualArrival?: Date,
  notes?: string
): Promise<RouteStop> {
  const updateData: any = {
    status,
    updated_at: new Date()
  };

  if (actualArrival) {
    updateData.actual_arrival = actualArrival;
  }

  if (notes) {
    updateData.delivery_notes = notes;
  }

  // If delivered, update order status
  if (status === 'delivered') {
    const stop = await db.routeStops
      .where('id', '=', stopId)
      .executeTakeFirst();

    if (stop) {
      await db.orders
        .where('order_number', '=', stop.order_number)
        .update({
          status: 'delivered',
          delivered_at: actualArrival || new Date(),
          updated_at: new Date()
        })
        .execute();
    }
  }

  const updatedStop = await db.routeStops
    .where('id', '=', stopId)
    .update(updateData)
    .returning('*')
    .executeTakeFirst();

  // Update route progress
  await updateRouteProgress(updatedStop.route_id);

  return updatedStop;
}

/**
 * Get route progress and status
 */
export async function getRouteProgress(routeId: string): Promise<RouteProgress> {
  const route = await db.deliveryRoutes
    .where('id', '=', routeId)
    .executeTakeFirst();

  if (!route) {
    throw new Error('Route not found');
  }

  const stops = await db.routeStops
    .where('route_id', '=', routeId)
    .orderBy('stop_number', 'asc')
    .execute();

  const completedStops = stops.filter(s => s.status === 'delivered').length;
  const currentStop = stops.find(s => s.status === 'in_transit' || s.status === 'arrived');
  const nextStopIndex = stops.findIndex(s => s.status === 'pending');
  const nextStop = nextStopIndex >= 0 ? stops[nextStopIndex] : null;

  const percentComplete = stops.length > 0
    ? Math.round((completedStops / stops.length) * 100)
    : 0;

  // Estimate completion time
  const estimatedCompletion = estimateRouteCompletion(stops, currentStop);

  // Check on-time status
  const onTimeStatus = calculateOnTimeStatus(stops);

  return {
    routeId,
    totalStops: stops.length,
    completedStops,
    currentStop: currentStop || null,
    nextStop,
    percentComplete,
    estimatedCompletion,
    onTimeStatus
  };
}

/**
 * Calculate progress from stops
 */
function calculateProgress(stops: RouteStop[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const completed = stops.filter(s => s.status === 'delivered').length;
  const total = stops.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percent };
}

/**
 * Calculate real-time ETA based on current route progress
 */
async function calculateRealTimeETA(
  routeId: string,
  targetStop: RouteStop | null
): Promise<Date | null> {
  if (!targetStop) {
    return null;
  }

  // Get all stops for the route
  const stops = await db.routeStops
    .where('route_id', '=', routeId)
    .where('stop_number', '<=', targetStop.stop_number)
    .orderBy('stop_number', 'asc')
    .execute();

  // Find last completed stop
  const lastCompleted = stops
    .filter(s => s.status === 'delivered' && s.actual_arrival)
    .sort((a, b) => b.stop_number - a.stop_number)[0];

  if (!lastCompleted) {
    // No stops completed yet, use original estimate
    return targetStop.estimated_arrival;
  }

  // Calculate average delay/ahead time
  const completedStops = stops.filter(s => s.status === 'delivered' && s.actual_arrival);
  let totalDelay = 0;

  for (const stop of completedStops) {
    const estimated = new Date(stop.estimated_arrival).getTime();
    const actual = new Date(stop.actual_arrival).getTime();
    totalDelay += (actual - estimated);
  }

  const avgDelay = completedStops.length > 0 ? totalDelay / completedStops.length : 0;

  // Apply average delay to remaining stops
  const stopsRemaining = targetStop.stop_number - lastCompleted.stop_number;
  const adjustedETA = new Date(targetStop.estimated_arrival);
  adjustedETA.setTime(adjustedETA.getTime() + (avgDelay * stopsRemaining));

  return adjustedETA;
}

/**
 * Update route overall progress
 */
async function updateRouteProgress(routeId: string): Promise<void> {
  const stops = await db.routeStops
    .where('route_id', '=', routeId)
    .execute();

  const completed = stops.filter(s => s.status === 'delivered').length;
  const failed = stops.filter(s => s.status === 'failed').length;
  const total = stops.length;

  let status = 'in_progress';

  if (completed === total) {
    status = 'completed';
  } else if (completed + failed === total) {
    status = 'completed_with_failures';
  } else if (completed === 0) {
    status = 'planned';
  }

  await db.deliveryRoutes
    .where('id', '=', routeId)
    .update({
      status,
      completed_stops: completed,
      failed_stops: failed,
      updated_at: new Date()
    })
    .execute();
}

/**
 * Estimate route completion time
 */
function estimateRouteCompletion(
  stops: RouteStop[],
  currentStop: RouteStop | null
): Date | null {
  if (stops.length === 0) {
    return null;
  }

  const lastStop = stops[stops.length - 1];

  if (!currentStop) {
    // Not started yet
    return lastStop.estimated_arrival;
  }

  // Calculate average time per stop from completed stops
  const completedStops = stops.filter(s => s.status === 'delivered' && s.actual_arrival);

  if (completedStops.length < 2) {
    // Not enough data, use original estimate
    return lastStop.estimated_arrival;
  }

  const firstCompleted = completedStops[0];
  const lastCompleted = completedStops[completedStops.length - 1];

  const timeSpan = new Date(lastCompleted.actual_arrival).getTime() -
                   new Date(firstCompleted.actual_arrival).getTime();
  const avgTimePerStop = timeSpan / (completedStops.length - 1);

  // Estimate remaining time
  const remainingStops = stops.length - lastCompleted.stop_number;
  const estimatedRemainingTime = avgTimePerStop * remainingStops;

  const completion = new Date(lastCompleted.actual_arrival);
  completion.setTime(completion.getTime() + estimatedRemainingTime);

  return completion;
}

/**
 * Calculate on-time status
 */
function calculateOnTimeStatus(
  stops: RouteStop[]
): 'on_time' | 'delayed' | 'ahead' {
  const completedStops = stops.filter(s => s.status === 'delivered' && s.actual_arrival);

  if (completedStops.length === 0) {
    return 'on_time';
  }

  let totalDelay = 0;

  for (const stop of completedStops) {
    const estimated = new Date(stop.estimated_arrival).getTime();
    const actual = new Date(stop.actual_arrival).getTime();
    totalDelay += (actual - estimated);
  }

  const avgDelay = totalDelay / completedStops.length;
  const avgDelayMinutes = avgDelay / 60000;

  if (avgDelayMinutes > 15) {
    return 'delayed';
  } else if (avgDelayMinutes < -15) {
    return 'ahead';
  } else {
    return 'on_time';
  }
}

/**
 * Get routes by driver
 */
export async function getDriverRoutes(
  tenantId: string,
  driverId: string,
  date?: Date
): Promise<DeliveryRoute[]> {
  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  return db.deliveryRoutes
    .where('tenant_id', '=', tenantId)
    .where('assigned_driver', '=', driverId)
    .where('delivery_date', '>=', targetDate)
    .where('delivery_date', '<', nextDay)
    .orderBy('created_at', 'desc')
    .execute();
}
