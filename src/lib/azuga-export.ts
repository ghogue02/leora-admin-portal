/**
 * Azuga Export Service
 * Exports picked orders to Azuga routing software in CSV format
 */

import { db } from '@/lib/db';
import { Order, OrderItem, Customer, Product } from '@/types';

export interface AzugaExportFilters {
  territory?: string;
  driver?: string;
}

export interface AzugaExportResult {
  csv: string;
  filename: string;
  orders: Order[];
}

export interface AzugaExportRow {
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  orderNumber: string;
  items: string;
  deliveryWindow: string;
  specialInstructions: string;
}

/**
 * Export picked orders to Azuga CSV format
 */
export async function exportToAzuga(
  tenantId: string,
  userId: string,
  deliveryDate: Date,
  filters?: AzugaExportFilters
): Promise<AzugaExportResult> {
  // Validate inputs
  if (!tenantId || !userId) {
    throw new Error('Tenant ID and User ID are required');
  }

  if (!deliveryDate || isNaN(deliveryDate.getTime())) {
    throw new Error('Valid delivery date is required');
  }

  // Get picked orders for the delivery date
  const orders = await getPickedOrders(tenantId, deliveryDate, filters);

  if (orders.length === 0) {
    throw new Error('No picked orders found for the specified date');
  }

  // Generate CSV content
  const csv = generateAzugaCSV(orders);

  // Create filename with timestamp
  const dateStr = deliveryDate.toISOString().split('T')[0];
  const timestamp = new Date().getTime();
  const filename = `azuga_export_${dateStr}_${timestamp}.csv`;

  // Create audit record
  await createExportAudit(tenantId, userId, deliveryDate, orders, filename);

  return {
    csv,
    filename,
    orders
  };
}

/**
 * Get picked orders for delivery date with optional filters
 */
async function getPickedOrders(
  tenantId: string,
  deliveryDate: Date,
  filters?: AzugaExportFilters
): Promise<Order[]> {
  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  let query = db.orders
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'picked')
    .where('delivery_date', '>=', startOfDay)
    .where('delivery_date', '<=', endOfDay);

  // Apply filters
  if (filters?.territory) {
    query = query.where('territory', '=', filters.territory);
  }

  if (filters?.driver) {
    query = query.where('assigned_driver', '=', filters.driver);
  }

  const orders = await query
    .orderBy('delivery_date', 'asc')
    .execute();

  // Fetch related data for each order
  const enrichedOrders = await Promise.all(
    orders.map(async (order) => {
      const [customer, items] = await Promise.all([
        db.customers.where('id', '=', order.customer_id).executeTakeFirst(),
        db.orderItems
          .where('order_id', '=', order.id)
          .leftJoin('products', 'products.id', 'order_items.product_id')
          .select([
            'order_items.*',
            'products.name as product_name',
            'products.category'
          ])
          .execute()
      ]);

      return {
        ...order,
        customer,
        items
      };
    })
  );

  return enrichedOrders;
}

/**
 * Generate Azuga-formatted CSV from orders
 */
function generateAzugaCSV(orders: Order[]): string {
  const headers = [
    'Customer Name',
    'Address',
    'City',
    'State',
    'Zip',
    'Phone',
    'Order Number',
    'Items',
    'Delivery Window',
    'Special Instructions'
  ];

  const rows: string[] = [headers.join(',')];

  for (const order of orders) {
    const row = formatAzugaRow(order);
    rows.push(escapeCSVRow(row));
  }

  return rows.join('\n');
}

/**
 * Format a single order as an Azuga CSV row
 */
function formatAzugaRow(order: Order): AzugaExportRow {
  const customer = order.customer;
  const items = order.items || [];

  // Format items summary
  const itemsSummary = formatItemsSummary(items);

  // Format delivery window
  const deliveryWindow = formatDeliveryWindow(order.delivery_date, order.delivery_window_start, order.delivery_window_end);

  // Combine special instructions
  const specialInstructions = [
    order.delivery_instructions,
    customer?.delivery_notes
  ].filter(Boolean).join('; ');

  return {
    customerName: customer?.business_name || customer?.name || 'Unknown',
    address: customer?.address || '',
    city: customer?.city || '',
    state: customer?.state || '',
    zip: customer?.zip_code || '',
    phone: customer?.phone || '',
    orderNumber: order.order_number || order.id,
    items: itemsSummary,
    deliveryWindow,
    specialInstructions: specialInstructions || ''
  };
}

/**
 * Format items as a summary string
 */
function formatItemsSummary(items: OrderItem[]): string {
  const summary = items.reduce((acc, item) => {
    const category = item.category || 'Other';
    const quantity = item.quantity || 0;

    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += quantity;

    return acc;
  }, {} as Record<string, number>);

  return Object.entries(summary)
    .map(([category, count]) => `${category}: ${count} ${count === 1 ? 'item' : 'items'}`)
    .join(', ');
}

/**
 * Format delivery window
 */
function formatDeliveryWindow(
  deliveryDate: Date,
  windowStart?: string,
  windowEnd?: string
): string {
  if (windowStart && windowEnd) {
    return `${formatTime(windowStart)} - ${formatTime(windowEnd)}`;
  }

  // Default window 8 AM - 5 PM
  return '8:00 AM - 5:00 PM';
}

/**
 * Format time string (HH:MM to h:MM AM/PM)
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Escape CSV row values
 */
function escapeCSVRow(row: AzugaExportRow): string {
  const values = [
    row.customerName,
    row.address,
    row.city,
    row.state,
    row.zip,
    row.phone,
    row.orderNumber,
    row.items,
    row.deliveryWindow,
    row.specialInstructions
  ];

  return values.map(escapeCSVValue).join(',');
}

/**
 * Escape a single CSV value
 */
function escapeCSVValue(value: string | number): string {
  const str = String(value || '');

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Create export audit record
 */
async function createExportAudit(
  tenantId: string,
  userId: string,
  deliveryDate: Date,
  orders: Order[],
  filename: string
): Promise<void> {
  await db.routeExports.insert({
    tenant_id: tenantId,
    user_id: userId,
    delivery_date: deliveryDate,
    order_count: orders.length,
    filename,
    exported_at: new Date(),
    metadata: {
      order_ids: orders.map(o => o.id),
      territories: [...new Set(orders.map(o => o.territory).filter(Boolean))],
      drivers: [...new Set(orders.map(o => o.assigned_driver).filter(Boolean))]
    }
  }).execute();
}

/**
 * Get export history
 */
export async function getExportHistory(
  tenantId: string,
  limit: number = 50
): Promise<any[]> {
  return db.routeExports
    .where('tenant_id', '=', tenantId)
    .orderBy('exported_at', 'desc')
    .limit(limit)
    .execute();
}
