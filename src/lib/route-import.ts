/**
 * Route Import Service
 * Imports optimized delivery routes from Azuga CSV format
 */

import { db } from '@/lib/db';
import { DeliveryRoute, RouteStop } from '@/types';

export interface RouteImportResult {
  route: DeliveryRoute;
  stops: number;
}

export interface AzugaRouteRow {
  stop: number;
  customer: string;
  orderNumber: string;
  eta: string;
  address: string;
  status: string;
}

/**
 * Import optimized route from Azuga CSV
 */
export async function importRouteFromAzuga(
  tenantId: string,
  csvData: string
): Promise<RouteImportResult> {
  // Validate inputs
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  if (!csvData || csvData.trim().length === 0) {
    throw new Error('CSV data is required');
  }

  // Parse CSV
  const routeData = parseAzugaRouteCSV(csvData);

  if (routeData.length === 0) {
    throw new Error('No route stops found in CSV');
  }

  // Validate route data
  validateRouteData(routeData);

  // Create delivery route
  const route = await createDeliveryRoute(tenantId, routeData);

  // Create route stops
  await createRouteStops(route.id, routeData);

  // Update orders with route information
  await updateOrdersWithRoute(route.id, routeData);

  return {
    route,
    stops: routeData.length
  };
}

/**
 * Parse Azuga route CSV
 */
function parseAzugaRouteCSV(csvData: string): AzugaRouteRow[] {
  const lines = csvData.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV must contain header and at least one data row');
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  const columnMap = mapColumns(header);

  // Parse data rows
  const rows: AzugaRouteRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length === 0 || values.every(v => !v)) {
      continue; // Skip empty rows
    }

    const row: AzugaRouteRow = {
      stop: parseInt(values[columnMap.stop] || '0'),
      customer: values[columnMap.customer] || '',
      orderNumber: values[columnMap.orderNumber] || '',
      eta: values[columnMap.eta] || '',
      address: values[columnMap.address] || '',
      status: values[columnMap.status] || 'pending'
    };

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last value
  values.push(current.trim());

  return values;
}

/**
 * Map CSV columns to expected fields
 */
function mapColumns(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  const columnNames: Record<string, string[]> = {
    stop: ['stop', 'stop number', 'sequence', '#'],
    customer: ['customer', 'customer name', 'name'],
    orderNumber: ['order number', 'order', 'order #', 'order id'],
    eta: ['eta', 'estimated arrival', 'arrival time', 'time'],
    address: ['address', 'location', 'delivery address'],
    status: ['status', 'state']
  };

  for (const [field, variations] of Object.entries(columnNames)) {
    const index = header.findIndex(h =>
      variations.some(v => h.toLowerCase() === v.toLowerCase())
    );

    if (index !== -1) {
      map[field] = index;
    }
  }

  // Validate required columns
  const required = ['stop', 'orderNumber', 'eta'];
  for (const field of required) {
    if (map[field] === undefined) {
      throw new Error(`Required column not found: ${field}`);
    }
  }

  return map;
}

/**
 * Validate route data
 */
function validateRouteData(routeData: AzugaRouteRow[]): void {
  // Check sequential stop numbers
  const stops = routeData.map(r => r.stop).sort((a, b) => a - b);

  for (let i = 0; i < stops.length; i++) {
    if (stops[i] !== i + 1) {
      throw new Error(`Stop numbers must be sequential starting from 1. Found gap at ${i + 1}`);
    }
  }

  // Check for duplicate order numbers
  const orderNumbers = routeData.map(r => r.orderNumber);
  const duplicates = orderNumbers.filter((num, idx) => orderNumbers.indexOf(num) !== idx);

  if (duplicates.length > 0) {
    throw new Error(`Duplicate order numbers found: ${duplicates.join(', ')}`);
  }

  // Validate ETAs are parseable
  for (const row of routeData) {
    if (!isValidTime(row.eta)) {
      throw new Error(`Invalid ETA format for stop ${row.stop}: ${row.eta}`);
    }
  }
}

/**
 * Check if time string is valid
 */
function isValidTime(timeStr: string): boolean {
  // Match formats like "8:30 AM", "14:30", "2:00 PM"
  const patterns = [
    /^\d{1,2}:\d{2}\s*[AP]M$/i,  // 8:30 AM
    /^\d{1,2}:\d{2}$/             // 14:30
  ];

  return patterns.some(pattern => pattern.test(timeStr.trim()));
}

/**
 * Create delivery route record
 */
async function createDeliveryRoute(
  tenantId: string,
  routeData: AzugaRouteRow[]
): Promise<DeliveryRoute> {
  // Extract date from first ETA (assuming same day route)
  const firstETA = parseETA(routeData[0].eta);
  const deliveryDate = new Date(firstETA);
  deliveryDate.setHours(0, 0, 0, 0);

  // Generate route name
  const routeName = `Route ${deliveryDate.toISOString().split('T')[0]}`;

  // Calculate estimated duration
  const lastETA = parseETA(routeData[routeData.length - 1].eta);
  const durationMinutes = Math.round((lastETA.getTime() - firstETA.getTime()) / 60000);

  const route = await db.deliveryRoutes.insert({
    tenant_id: tenantId,
    route_name: routeName,
    delivery_date: deliveryDate,
    status: 'planned',
    total_stops: routeData.length,
    estimated_duration_minutes: durationMinutes,
    created_at: new Date(),
    metadata: {
      imported_from: 'azuga',
      import_timestamp: new Date().toISOString()
    }
  }).returning('*').executeTakeFirst();

  return route;
}

/**
 * Parse ETA string to Date
 */
function parseETA(etaStr: string): Date {
  const today = new Date();
  const timeMatch = etaStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);

  if (!timeMatch) {
    throw new Error(`Unable to parse ETA: ${etaStr}`);
  }

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const period = timeMatch[3]?.toUpperCase();

  // Convert 12-hour to 24-hour if AM/PM provided
  if (period) {
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  const eta = new Date(today);
  eta.setHours(hours, minutes, 0, 0);

  // If ETA is in the past, assume next day
  if (eta < new Date()) {
    eta.setDate(eta.getDate() + 1);
  }

  return eta;
}

/**
 * Create route stops
 */
async function createRouteStops(
  routeId: string,
  routeData: AzugaRouteRow[]
): Promise<void> {
  const stops = routeData.map(row => ({
    route_id: routeId,
    stop_number: row.stop,
    order_number: row.orderNumber,
    customer_name: row.customer,
    address: row.address,
    estimated_arrival: parseETA(row.eta),
    status: 'pending',
    created_at: new Date()
  }));

  await db.routeStops.insertMany(stops).execute();
}

/**
 * Update orders with route information
 */
async function updateOrdersWithRoute(
  routeId: string,
  routeData: AzugaRouteRow[]
): Promise<void> {
  const orderNumbers = routeData.map(r => r.orderNumber);

  // Find orders by order number
  const orders = await db.orders
    .where('order_number', 'in', orderNumbers)
    .execute();

  // Update each order
  const updates = orders.map(order => {
    const routeInfo = routeData.find(r => r.orderNumber === order.order_number);

    return db.orders
      .where('id', '=', order.id)
      .update({
        route_id: routeId,
        route_stop_number: routeInfo?.stop,
        status: 'in_route',
        updated_at: new Date()
      })
      .execute();
  });

  await Promise.all(updates);
}

/**
 * Get route by ID with stops
 */
export async function getRouteWithStops(routeId: string): Promise<DeliveryRoute | null> {
  const route = await db.deliveryRoutes
    .where('id', '=', routeId)
    .executeTakeFirst();

  if (!route) {
    return null;
  }

  const stops = await db.routeStops
    .where('route_id', '=', routeId)
    .orderBy('stop_number', 'asc')
    .execute();

  return {
    ...route,
    stops
  };
}
