import { z } from 'zod';

// Warehouse Configuration Schemas
export const warehouseConfigSchema = z.object({
  aisleCount: z.number().int().min(1).max(100),
  rowsPerAisle: z.number().int().min(1).max(100),
  shelfLevels: z.number().int().min(1).max(20),
  pickStrategy: z.enum(['SEQUENTIAL', 'ZONE', 'WAVE']),
});

export const updateWarehouseConfigSchema = warehouseConfigSchema.partial();

// Inventory Location Schemas
export const locationComponentSchema = z.object({
  aisle: z.string().optional(),
  row: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
});

export const inventoryLocationUpdateSchema = z.object({
  id: z.string().uuid(),
  aisle: z.string(),
  row: z.string(),
  shelf: z.string(),
  bin: z.string().optional(),
});

export const bulkLocationUpdateSchema = z.object({
  updates: z.array(inventoryLocationUpdateSchema).min(1).max(1000),
});

// Pick Sheet Schemas
export const createPickSheetSchema = z.object({
  orderIds: z.array(z.string().uuid()).optional(),
  pickerName: z.string().optional(),
});

export const updatePickSheetSchema = z.object({
  action: z.enum(['start', 'complete', 'cancel']),
  pickerName: z.string().optional(),
});

export const updatePickItemSchema = z.object({
  isPicked: z.boolean(),
});

// Routing Schemas
export const routeExportSchema = z.object({
  deliveryDate: z.string().datetime(),
  territoryFilter: z.string().optional(),
});

export const routeImportSchema = z.object({
  routeName: z.string().min(1),
  deliveryDate: z.string().datetime(),
  driverName: z.string().optional(),
});

export const routeStopSchema = z.object({
  orderId: z.string().uuid(),
  stopNumber: z.number().int().min(1),
  estimatedTime: z.string().datetime().optional(),
});

// Query Schemas
export const inventoryLocationQuerySchema = z.object({
  search: z.string().optional(),
  aisle: z.string().optional(),
  unassigned: z.string().transform(val => val === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const pickSheetQuerySchema = z.object({
  status: z.enum(['DRAFT', 'READY', 'PICKING', 'PICKED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const exportFormatSchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
});
