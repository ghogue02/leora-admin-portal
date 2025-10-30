/**
 * Schema Transformation Functions
 * Well Crafted (PascalCase) → Lovable (lowercase)
 *
 * Generated: 2025-10-23
 */

import {
  WellCraftedCustomer,
  WellCraftedOrder,
  WellCraftedOrderLine,
  WellCraftedSku,
  WellCraftedProduct,
  LovableCustomer,
  LovableOrder,
  LovableOrderLine,
  LovableSku,
  LovableProduct,
} from './schema-types';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate UUID format (RFC 4122)
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Convert JavaScript Date to ISO 8601 string for PostgreSQL
 */
export function dateToISO(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  return date.toISOString();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// TRANSFORMATION OPTIONS
// ============================================================================

export interface TransformCustomerOptions {
  validateUUIDs?: boolean;
  validateEmail?: boolean;
  preserveTimestamps?: boolean;
  trimStrings?: boolean;
}

export interface TransformOrderOptions {
  validateUUIDs?: boolean;
  validateCustomerExists?: (customerId: string) => Promise<boolean>;
  validateStatus?: boolean;
}

export interface TransformOrderLineOptions {
  validateUUIDs?: boolean;
  validateOrderExists?: (orderId: string) => Promise<boolean>;
  validateSkuExists?: (skuId: string) => Promise<boolean>;
  validateQuantity?: boolean;
}

export interface TransformSkuOptions {
  validateUUIDs?: boolean;
  validateProductExists?: (productId: string) => Promise<boolean>;
  validateStockQuantity?: boolean;
  validatePrice?: boolean;
}

export interface TransformProductOptions {
  validateUUIDs?: boolean;
  trimStrings?: boolean;
  validateName?: boolean;
}

// ============================================================================
// CUSTOMER TRANSFORMATION
// ============================================================================

/**
 * Transform Well Crafted Customer to Lovable Customer
 *
 * Transformations:
 * - customerId → customerid (lowercase, UUID preserved)
 * - tenantId → DROPPED
 * - firstName → firstname (lowercase)
 * - lastName → lastname (lowercase)
 * - createdAt → createdat (Date → ISO string)
 * - updatedAt → updatedat (Date → ISO string)
 */
export function transformCustomer(
  wcCustomer: WellCraftedCustomer,
  options: TransformCustomerOptions = {}
): LovableCustomer {
  const {
    validateUUIDs = true,
    validateEmail = true,
    preserveTimestamps = true,
    trimStrings = true,
  } = options;

  // Validate UUID
  if (validateUUIDs && !isValidUUID(wcCustomer.customerId)) {
    throw new Error(`Invalid customer UUID: ${wcCustomer.customerId}`);
  }

  // Validate email
  if (validateEmail && !isValidEmail(wcCustomer.email)) {
    throw new Error(`Invalid email: ${wcCustomer.email}`);
  }

  // Validate required fields
  if (!wcCustomer.firstName?.trim()) {
    throw new Error('firstName is required and cannot be empty');
  }
  if (!wcCustomer.lastName?.trim()) {
    throw new Error('lastName is required and cannot be empty');
  }

  return {
    customerid: wcCustomer.customerId,
    email: trimStrings ? wcCustomer.email.trim().toLowerCase() : wcCustomer.email,
    firstname: trimStrings ? wcCustomer.firstName.trim() : wcCustomer.firstName,
    lastname: trimStrings ? wcCustomer.lastName.trim() : wcCustomer.lastName,
    phone: wcCustomer.phone ? (trimStrings ? wcCustomer.phone.trim() : wcCustomer.phone) : null,
    createdat: preserveTimestamps
      ? dateToISO(wcCustomer.createdAt)
      : new Date().toISOString(),
    updatedat: preserveTimestamps
      ? dateToISO(wcCustomer.updatedAt)
      : new Date().toISOString(),
  };
}

// ============================================================================
// ORDER TRANSFORMATION
// ============================================================================

/**
 * Transform Well Crafted Order to Lovable Order
 *
 * Transformations:
 * - orderId → orderid (lowercase, UUID preserved)
 * - tenantId → DROPPED
 * - customerId → customerid (lowercase, UUID preserved)
 * - orderedAt → orderedat (Date → ISO string)
 * - totalAmount → totalamount (lowercase, decimal preserved)
 * - createdAt → createdat (Date → ISO string)
 * - updatedAt → updatedat (Date → ISO string)
 */
export async function transformOrder(
  wcOrder: WellCraftedOrder,
  options: TransformOrderOptions = {}
): Promise<LovableOrder> {
  const {
    validateUUIDs = true,
    validateCustomerExists,
    validateStatus = true,
  } = options;

  // Validate UUIDs
  if (validateUUIDs) {
    if (!isValidUUID(wcOrder.orderId)) {
      throw new Error(`Invalid order UUID: ${wcOrder.orderId}`);
    }
    if (!isValidUUID(wcOrder.customerId)) {
      throw new Error(`Invalid customer UUID: ${wcOrder.customerId}`);
    }
  }

  // Validate customer reference
  if (validateCustomerExists) {
    const exists = await validateCustomerExists(wcOrder.customerId);
    if (!exists) {
      throw new Error(`Customer ${wcOrder.customerId} does not exist in Lovable DB`);
    }
  }

  // Validate status
  if (validateStatus) {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(wcOrder.status.toLowerCase())) {
      throw new Error(`Invalid order status: ${wcOrder.status}`);
    }
  }

  // Validate totalAmount
  if (wcOrder.totalAmount < 0) {
    throw new Error(`Invalid totalAmount: ${wcOrder.totalAmount} (must be >= 0)`);
  }

  return {
    orderid: wcOrder.orderId,
    customerid: wcOrder.customerId,
    orderedat: dateToISO(wcOrder.orderedAt),
    status: wcOrder.status.toLowerCase(),
    totalamount: wcOrder.totalAmount,
    createdat: dateToISO(wcOrder.createdAt),
    updatedat: dateToISO(wcOrder.updatedAt),
  };
}

// ============================================================================
// ORDERLINE TRANSFORMATION
// ============================================================================

/**
 * Transform Well Crafted OrderLine to Lovable OrderLine
 *
 * Transformations:
 * - orderLineId → orderlineid (lowercase, UUID preserved)
 * - tenantId → DROPPED
 * - orderId → orderid (lowercase, UUID preserved)
 * - skuId → skuid (lowercase, UUID preserved)
 * - pricePerUnit → priceperunit (lowercase, decimal preserved)
 * - createdAt → createdat (Date → ISO string)
 * - updatedAt → updatedat (Date → ISO string)
 */
export async function transformOrderLine(
  wcOrderLine: WellCraftedOrderLine,
  options: TransformOrderLineOptions = {}
): Promise<LovableOrderLine> {
  const {
    validateUUIDs = true,
    validateOrderExists,
    validateSkuExists,
    validateQuantity = true,
  } = options;

  // Validate UUIDs
  if (validateUUIDs) {
    if (!isValidUUID(wcOrderLine.orderLineId)) {
      throw new Error(`Invalid orderLine UUID: ${wcOrderLine.orderLineId}`);
    }
    if (!isValidUUID(wcOrderLine.orderId)) {
      throw new Error(`Invalid order UUID: ${wcOrderLine.orderId}`);
    }
    if (!isValidUUID(wcOrderLine.skuId)) {
      throw new Error(`Invalid sku UUID: ${wcOrderLine.skuId}`);
    }
  }

  // Validate foreign key references
  if (validateOrderExists) {
    const orderExists = await validateOrderExists(wcOrderLine.orderId);
    if (!orderExists) {
      throw new Error(`Order ${wcOrderLine.orderId} does not exist in Lovable DB`);
    }
  }

  if (validateSkuExists) {
    const skuExists = await validateSkuExists(wcOrderLine.skuId);
    if (!skuExists) {
      throw new Error(`SKU ${wcOrderLine.skuId} does not exist in Lovable DB`);
    }
  }

  // Validate quantity
  if (validateQuantity && wcOrderLine.quantity <= 0) {
    throw new Error(`Invalid quantity: ${wcOrderLine.quantity} (must be > 0)`);
  }

  // Validate pricePerUnit
  if (wcOrderLine.pricePerUnit < 0) {
    throw new Error(`Invalid pricePerUnit: ${wcOrderLine.pricePerUnit} (must be >= 0)`);
  }

  return {
    orderlineid: wcOrderLine.orderLineId,
    orderid: wcOrderLine.orderId,
    skuid: wcOrderLine.skuId,
    quantity: wcOrderLine.quantity,
    priceperunit: wcOrderLine.pricePerUnit,
    createdat: dateToISO(wcOrderLine.createdAt),
    updatedat: dateToISO(wcOrderLine.updatedAt),
  };
}

// ============================================================================
// SKU TRANSFORMATION
// ============================================================================

/**
 * Transform Well Crafted Sku to Lovable Sku
 *
 * Transformations:
 * - skuId → skuid (lowercase, UUID preserved)
 * - tenantId → DROPPED
 * - productId → productid (lowercase, UUID preserved)
 * - stockQuantity → stockquantity (lowercase)
 * - createdAt → createdat (Date → ISO string)
 * - updatedAt → updatedat (Date → ISO string)
 *
 * ⚠️ Note: Table name changes from 'Sku' to 'skus' (plural)
 */
export async function transformSku(
  wcSku: WellCraftedSku,
  options: TransformSkuOptions = {}
): Promise<LovableSku> {
  const {
    validateUUIDs = true,
    validateProductExists,
    validateStockQuantity = true,
    validatePrice = true,
  } = options;

  // Validate UUIDs
  if (validateUUIDs) {
    if (!isValidUUID(wcSku.skuId)) {
      throw new Error(`Invalid sku UUID: ${wcSku.skuId}`);
    }
    if (!isValidUUID(wcSku.productId)) {
      throw new Error(`Invalid product UUID: ${wcSku.productId}`);
    }
  }

  // Validate product reference
  if (validateProductExists) {
    const productExists = await validateProductExists(wcSku.productId);
    if (!productExists) {
      throw new Error(`Product ${wcSku.productId} does not exist in Lovable DB`);
    }
  }

  // Validate SKU code
  if (!wcSku.code?.trim()) {
    throw new Error('SKU code is required and cannot be empty');
  }

  // Validate stock quantity
  if (validateStockQuantity && wcSku.stockQuantity < 0) {
    throw new Error(`Invalid stock quantity: ${wcSku.stockQuantity} (must be >= 0)`);
  }

  // Validate price
  if (validatePrice && wcSku.price < 0) {
    throw new Error(`Invalid price: ${wcSku.price} (must be >= 0)`);
  }

  return {
    skuid: wcSku.skuId,
    productid: wcSku.productId,
    code: wcSku.code.trim().toUpperCase(), // Normalize SKU codes to uppercase
    size: wcSku.size ? wcSku.size.trim() : null,
    color: wcSku.color ? wcSku.color.trim() : null,
    stockquantity: wcSku.stockQuantity,
    price: wcSku.price,
    createdat: dateToISO(wcSku.createdAt),
    updatedat: dateToISO(wcSku.updatedAt),
  };
}

// ============================================================================
// PRODUCT TRANSFORMATION
// ============================================================================

/**
 * Transform Well Crafted Product to Lovable Product
 *
 * Transformations:
 * - productId → productid (lowercase, UUID preserved)
 * - tenantId → DROPPED
 * - createdAt → createdat (Date → ISO string)
 * - updatedAt → updatedat (Date → ISO string)
 */
export function transformProduct(
  wcProduct: WellCraftedProduct,
  options: TransformProductOptions = {}
): LovableProduct {
  const {
    validateUUIDs = true,
    trimStrings = true,
    validateName = true,
  } = options;

  // Validate UUID
  if (validateUUIDs && !isValidUUID(wcProduct.productId)) {
    throw new Error(`Invalid product UUID: ${wcProduct.productId}`);
  }

  // Validate name
  if (validateName && !wcProduct.name?.trim()) {
    throw new Error('Product name is required and cannot be empty');
  }

  return {
    productid: wcProduct.productId,
    name: trimStrings ? wcProduct.name.trim() : wcProduct.name,
    description: wcProduct.description
      ? (trimStrings ? wcProduct.description.trim() : wcProduct.description)
      : null,
    category: wcProduct.category
      ? (trimStrings ? wcProduct.category.trim() : wcProduct.category)
      : null,
    createdat: dateToISO(wcProduct.createdAt),
    updatedat: dateToISO(wcProduct.updatedAt),
  };
}

// ============================================================================
// BATCH TRANSFORMATION
// ============================================================================

export interface BatchTransformOptions {
  batchSize?: number;
  onProgress?: (processed: number, total: number, entity: string) => void;
  onError?: (error: Error, record: any, entity: string) => void;
  stopOnError?: boolean;
}

export interface BatchTransformResult<T> {
  successful: T[];
  failed: Array<{ record: any; error: Error }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

/**
 * Batch transform customers with progress tracking and error handling
 */
export async function batchTransformCustomers(
  wcCustomers: WellCraftedCustomer[],
  options: BatchTransformOptions = {}
): Promise<BatchTransformResult<LovableCustomer>> {
  const { batchSize = 100, onProgress, onError, stopOnError = false } = options;
  const results: LovableCustomer[] = [];
  const failures: Array<{ record: any; error: Error }> = [];

  for (let i = 0; i < wcCustomers.length; i += batchSize) {
    const batch = wcCustomers.slice(i, i + batchSize);

    for (const customer of batch) {
      try {
        const transformed = transformCustomer(customer);
        results.push(transformed);
      } catch (error) {
        failures.push({ record: customer, error: error as Error });
        if (onError) {
          onError(error as Error, customer, 'Customer');
        }
        if (stopOnError) {
          throw error;
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, wcCustomers.length), wcCustomers.length, 'Customer');
    }
  }

  return {
    successful: results,
    failed: failures,
    totalProcessed: wcCustomers.length,
    successCount: results.length,
    failureCount: failures.length,
  };
}

/**
 * Batch transform products with progress tracking and error handling
 */
export async function batchTransformProducts(
  wcProducts: WellCraftedProduct[],
  options: BatchTransformOptions = {}
): Promise<BatchTransformResult<LovableProduct>> {
  const { batchSize = 100, onProgress, onError, stopOnError = false } = options;
  const results: LovableProduct[] = [];
  const failures: Array<{ record: any; error: Error }> = [];

  for (let i = 0; i < wcProducts.length; i += batchSize) {
    const batch = wcProducts.slice(i, i + batchSize);

    for (const product of batch) {
      try {
        const transformed = transformProduct(product);
        results.push(transformed);
      } catch (error) {
        failures.push({ record: product, error: error as Error });
        if (onError) {
          onError(error as Error, product, 'Product');
        }
        if (stopOnError) {
          throw error;
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, wcProducts.length), wcProducts.length, 'Product');
    }
  }

  return {
    successful: results,
    failed: failures,
    totalProcessed: wcProducts.length,
    successCount: results.length,
    failureCount: failures.length,
  };
}

/**
 * Batch transform SKUs with progress tracking and error handling
 */
export async function batchTransformSkus(
  wcSkus: WellCraftedSku[],
  options: BatchTransformOptions & TransformSkuOptions = {}
): Promise<BatchTransformResult<LovableSku>> {
  const { batchSize = 100, onProgress, onError, stopOnError = false, ...transformOptions } = options;
  const results: LovableSku[] = [];
  const failures: Array<{ record: any; error: Error }> = [];

  for (let i = 0; i < wcSkus.length; i += batchSize) {
    const batch = wcSkus.slice(i, i + batchSize);

    for (const sku of batch) {
      try {
        const transformed = await transformSku(sku, transformOptions);
        results.push(transformed);
      } catch (error) {
        failures.push({ record: sku, error: error as Error });
        if (onError) {
          onError(error as Error, sku, 'Sku');
        }
        if (stopOnError) {
          throw error;
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, wcSkus.length), wcSkus.length, 'Sku');
    }
  }

  return {
    successful: results,
    failed: failures,
    totalProcessed: wcSkus.length,
    successCount: results.length,
    failureCount: failures.length,
  };
}

/**
 * Batch transform orders with progress tracking and error handling
 */
export async function batchTransformOrders(
  wcOrders: WellCraftedOrder[],
  options: BatchTransformOptions & TransformOrderOptions = {}
): Promise<BatchTransformResult<LovableOrder>> {
  const { batchSize = 100, onProgress, onError, stopOnError = false, ...transformOptions } = options;
  const results: LovableOrder[] = [];
  const failures: Array<{ record: any; error: Error }> = [];

  for (let i = 0; i < wcOrders.length; i += batchSize) {
    const batch = wcOrders.slice(i, i + batchSize);

    for (const order of batch) {
      try {
        const transformed = await transformOrder(order, transformOptions);
        results.push(transformed);
      } catch (error) {
        failures.push({ record: order, error: error as Error });
        if (onError) {
          onError(error as Error, order, 'Order');
        }
        if (stopOnError) {
          throw error;
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, wcOrders.length), wcOrders.length, 'Order');
    }
  }

  return {
    successful: results,
    failed: failures,
    totalProcessed: wcOrders.length,
    successCount: results.length,
    failureCount: failures.length,
  };
}

/**
 * Batch transform order lines with progress tracking and error handling
 */
export async function batchTransformOrderLines(
  wcOrderLines: WellCraftedOrderLine[],
  options: BatchTransformOptions & TransformOrderLineOptions = {}
): Promise<BatchTransformResult<LovableOrderLine>> {
  const { batchSize = 100, onProgress, onError, stopOnError = false, ...transformOptions } = options;
  const results: LovableOrderLine[] = [];
  const failures: Array<{ record: any; error: Error }> = [];

  for (let i = 0; i < wcOrderLines.length; i += batchSize) {
    const batch = wcOrderLines.slice(i, i + batchSize);

    for (const orderLine of batch) {
      try {
        const transformed = await transformOrderLine(orderLine, transformOptions);
        results.push(transformed);
      } catch (error) {
        failures.push({ record: orderLine, error: error as Error });
        if (onError) {
          onError(error as Error, orderLine, 'OrderLine');
        }
        if (stopOnError) {
          throw error;
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, wcOrderLines.length), wcOrderLines.length, 'OrderLine');
    }
  }

  return {
    successful: results,
    failed: failures,
    totalProcessed: wcOrderLines.length,
    successCount: results.length,
    failureCount: failures.length,
  };
}
