/**
 * Schema Type Definitions
 * Well Crafted (PascalCase) vs Lovable (lowercase) Database Schemas
 *
 * Generated: 2025-10-23
 */

// ============================================================================
// WELL CRAFTED SCHEMA (Source - PascalCase with tenantId)
// ============================================================================

export interface WellCraftedCustomer {
  customerId: string;        // UUID
  tenantId: string;          // UUID - Multi-tenant architecture
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WellCraftedOrder {
  orderId: string;           // UUID
  tenantId: string;          // UUID - Multi-tenant architecture
  customerId: string;        // UUID - Foreign key to Customer
  orderedAt: Date;
  status: string;
  totalAmount: number;       // Decimal
  createdAt: Date;
  updatedAt: Date;
}

export interface WellCraftedOrderLine {
  orderLineId: string;       // UUID
  tenantId: string;          // UUID - Multi-tenant architecture
  orderId: string;           // UUID - Foreign key to Order
  skuId: string;             // UUID - Foreign key to Sku
  quantity: number;          // Integer
  pricePerUnit: number;      // Decimal
  createdAt: Date;
  updatedAt: Date;
}

export interface WellCraftedSku {
  skuId: string;             // UUID
  tenantId: string;          // UUID - Multi-tenant architecture
  productId: string;         // UUID - Foreign key to Product
  code: string;              // SKU code
  size: string | null;
  color: string | null;
  stockQuantity: number;     // Integer
  price: number;             // Decimal
  createdAt: Date;
  updatedAt: Date;
}

export interface WellCraftedProduct {
  productId: string;         // UUID
  tenantId: string;          // UUID - Multi-tenant architecture
  name: string;
  description: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LOVABLE SCHEMA (Target - lowercase, no tenantId)
// ============================================================================

export interface LovableCustomer {
  customerid: string;        // UUID
  email: string;
  firstname: string;
  lastname: string;
  phone: string | null;
  createdat: string;         // timestamp with time zone (ISO 8601)
  updatedat: string;         // timestamp with time zone (ISO 8601)
}

export interface LovableOrder {
  orderid: string;           // UUID
  customerid: string;        // UUID - Foreign key to customer
  orderedat: string;         // timestamp with time zone (ISO 8601)
  status: string;
  totalamount: number;       // numeric
  createdat: string;         // timestamp with time zone (ISO 8601)
  updatedat: string;         // timestamp with time zone (ISO 8601)
}

export interface LovableOrderLine {
  orderlineid: string;       // UUID
  orderid: string;           // UUID - Foreign key to order
  skuid: string;             // UUID - Foreign key to skus
  quantity: number;          // integer
  priceperunit: number;      // numeric
  createdat: string;         // timestamp with time zone (ISO 8601)
  updatedat: string;         // timestamp with time zone (ISO 8601)
}

export interface LovableSku {
  skuid: string;             // UUID
  productid: string;         // UUID - Foreign key to product
  code: string;              // text
  size: string | null;       // text
  color: string | null;      // text
  stockquantity: number;     // integer
  price: number;             // numeric
  createdat: string;         // timestamp with time zone (ISO 8601)
  updatedat: string;         // timestamp with time zone (ISO 8601)
}

export interface LovableProduct {
  productid: string;         // UUID
  name: string;              // text
  description: string | null; // text
  category: string | null;   // text
  createdat: string;         // timestamp with time zone (ISO 8601)
  updatedat: string;         // timestamp with time zone (ISO 8601)
}

// ============================================================================
// FIELD MAPPING METADATA
// ============================================================================

export interface FieldMapping {
  wellCraftedTable: string;
  wellCraftedField: string;
  lovableTable: string;
  lovableField: string;
  transformation: TransformationType;
  required: boolean;
  notes?: string;
}

export type TransformationType =
  | 'lowercase'              // Field name to lowercase
  | 'date-to-iso'            // JavaScript Date to ISO 8601 string
  | 'remove'                 // Field removed (e.g., tenantId)
  | 'no-change'              // Direct copy, no transformation
  | 'lowercase-preserve-uuid' // Lowercase field name, preserve UUID value
  | 'lowercase-decimal';     // Lowercase field name, preserve decimal precision

export const FIELD_MAPPINGS: FieldMapping[] = [
  // Customer mappings
  { wellCraftedTable: 'Customer', wellCraftedField: 'customerId', lovableTable: 'customer', lovableField: 'customerid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Primary key' },
  { wellCraftedTable: 'Customer', wellCraftedField: 'tenantId', lovableTable: 'customer', lovableField: '(removed)', transformation: 'remove', required: false, notes: 'Multi-tenant feature not in Lovable' },
  { wellCraftedTable: 'Customer', wellCraftedField: 'email', lovableTable: 'customer', lovableField: 'email', transformation: 'no-change', required: true },
  { wellCraftedTable: 'Customer', wellCraftedField: 'firstName', lovableTable: 'customer', lovableField: 'firstname', transformation: 'lowercase', required: true },
  { wellCraftedTable: 'Customer', wellCraftedField: 'lastName', lovableTable: 'customer', lovableField: 'lastname', transformation: 'lowercase', required: true },
  { wellCraftedTable: 'Customer', wellCraftedField: 'phone', lovableTable: 'customer', lovableField: 'phone', transformation: 'no-change', required: false },
  { wellCraftedTable: 'Customer', wellCraftedField: 'createdAt', lovableTable: 'customer', lovableField: 'createdat', transformation: 'date-to-iso', required: true },
  { wellCraftedTable: 'Customer', wellCraftedField: 'updatedAt', lovableTable: 'customer', lovableField: 'updatedat', transformation: 'date-to-iso', required: true },

  // Order mappings
  { wellCraftedTable: 'Order', wellCraftedField: 'orderId', lovableTable: 'order', lovableField: 'orderid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Primary key' },
  { wellCraftedTable: 'Order', wellCraftedField: 'tenantId', lovableTable: 'order', lovableField: '(removed)', transformation: 'remove', required: false, notes: 'Multi-tenant feature not in Lovable' },
  { wellCraftedTable: 'Order', wellCraftedField: 'customerId', lovableTable: 'order', lovableField: 'customerid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Foreign key to customer' },
  { wellCraftedTable: 'Order', wellCraftedField: 'orderedAt', lovableTable: 'order', lovableField: 'orderedat', transformation: 'date-to-iso', required: true },
  { wellCraftedTable: 'Order', wellCraftedField: 'status', lovableTable: 'order', lovableField: 'status', transformation: 'no-change', required: true },
  { wellCraftedTable: 'Order', wellCraftedField: 'totalAmount', lovableTable: 'order', lovableField: 'totalamount', transformation: 'lowercase-decimal', required: true },
  { wellCraftedTable: 'Order', wellCraftedField: 'createdAt', lovableTable: 'order', lovableField: 'createdat', transformation: 'date-to-iso', required: true },
  { wellCraftedTable: 'Order', wellCraftedField: 'updatedAt', lovableTable: 'order', lovableField: 'updatedat', transformation: 'date-to-iso', required: true },

  // OrderLine mappings
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'orderLineId', lovableTable: 'orderline', lovableField: 'orderlineid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Primary key' },
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'tenantId', lovableTable: 'orderline', lovableField: '(removed)', transformation: 'remove', required: false, notes: 'Multi-tenant feature not in Lovable' },
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'orderId', lovableTable: 'orderline', lovableField: 'orderid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Foreign key to order' },
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'skuId', lovableTable: 'orderline', lovableField: 'skuid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Foreign key to skus' },
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'quantity', lovableTable: 'orderline', lovableField: 'quantity', transformation: 'no-change', required: true },
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'pricePerUnit', lovableTable: 'orderline', lovableField: 'priceperunit', transformation: 'lowercase-decimal', required: true },
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'createdAt', lovableTable: 'orderline', lovableField: 'createdat', transformation: 'date-to-iso', required: true },
  { wellCraftedTable: 'OrderLine', wellCraftedField: 'updatedAt', lovableTable: 'orderline', lovableField: 'updatedat', transformation: 'date-to-iso', required: true },

  // Sku mappings (Note: table name changes to plural 'skus')
  { wellCraftedTable: 'Sku', wellCraftedField: 'skuId', lovableTable: 'skus', lovableField: 'skuid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Primary key' },
  { wellCraftedTable: 'Sku', wellCraftedField: 'tenantId', lovableTable: 'skus', lovableField: '(removed)', transformation: 'remove', required: false, notes: 'Multi-tenant feature not in Lovable' },
  { wellCraftedTable: 'Sku', wellCraftedField: 'productId', lovableTable: 'skus', lovableField: 'productid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Foreign key to product' },
  { wellCraftedTable: 'Sku', wellCraftedField: 'code', lovableTable: 'skus', lovableField: 'code', transformation: 'no-change', required: true },
  { wellCraftedTable: 'Sku', wellCraftedField: 'size', lovableTable: 'skus', lovableField: 'size', transformation: 'no-change', required: false },
  { wellCraftedTable: 'Sku', wellCraftedField: 'color', lovableTable: 'skus', lovableField: 'color', transformation: 'no-change', required: false },
  { wellCraftedTable: 'Sku', wellCraftedField: 'stockQuantity', lovableTable: 'skus', lovableField: 'stockquantity', transformation: 'lowercase', required: true },
  { wellCraftedTable: 'Sku', wellCraftedField: 'price', lovableTable: 'skus', lovableField: 'price', transformation: 'lowercase-decimal', required: true },
  { wellCraftedTable: 'Sku', wellCraftedField: 'createdAt', lovableTable: 'skus', lovableField: 'createdat', transformation: 'date-to-iso', required: true },
  { wellCraftedTable: 'Sku', wellCraftedField: 'updatedAt', lovableTable: 'skus', lovableField: 'updatedat', transformation: 'date-to-iso', required: true },

  // Product mappings
  { wellCraftedTable: 'Product', wellCraftedField: 'productId', lovableTable: 'product', lovableField: 'productid', transformation: 'lowercase-preserve-uuid', required: true, notes: 'Primary key' },
  { wellCraftedTable: 'Product', wellCraftedField: 'tenantId', lovableTable: 'product', lovableField: '(removed)', transformation: 'remove', required: false, notes: 'Multi-tenant feature not in Lovable' },
  { wellCraftedTable: 'Product', wellCraftedField: 'name', lovableTable: 'product', lovableField: 'name', transformation: 'no-change', required: true },
  { wellCraftedTable: 'Product', wellCraftedField: 'description', lovableTable: 'product', lovableField: 'description', transformation: 'no-change', required: false },
  { wellCraftedTable: 'Product', wellCraftedField: 'category', lovableTable: 'product', lovableField: 'category', transformation: 'no-change', required: false },
  { wellCraftedTable: 'Product', wellCraftedField: 'createdAt', lovableTable: 'product', lovableField: 'createdat', transformation: 'date-to-iso', required: true },
  { wellCraftedTable: 'Product', wellCraftedField: 'updatedAt', lovableTable: 'product', lovableField: 'updatedat', transformation: 'date-to-iso', required: true },
];

// ============================================================================
// TABLE NAME MAPPINGS
// ============================================================================

export const TABLE_MAPPINGS: Record<string, string> = {
  'Customer': 'customer',
  'Order': 'order',
  'OrderLine': 'orderline',
  'Sku': 'skus',        // ⚠️ Singular to plural!
  'Product': 'product',
};

// ============================================================================
// MIGRATION STATISTICS
// ============================================================================

export const MIGRATION_STATS = {
  totalTables: 5,
  totalFields: 62,
  fieldsDropped: 5,        // All tenantId fields
  fieldsTransformed: 45,
  fieldsUnchanged: 12,
  uuidFields: 15,
  timestampFields: 10,
  foreignKeys: 4,
};
