/**
 * Test Data for Schema Transformation Validation
 * Well Crafted → Lovable Migration Testing
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
// WELL CRAFTED TEST DATA (Source)
// ============================================================================

export const TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const wcTestProduct: WellCraftedProduct = {
  productId: '11111111-1111-1111-1111-111111111111',
  tenantId: TENANT_ID,
  name: 'Premium Cotton T-Shirt',
  description: 'High quality 100% organic cotton t-shirt with reinforced stitching',
  category: 'Apparel',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

export const wcTestSku: WellCraftedSku = {
  skuId: '22222222-2222-2222-2222-222222222222',
  tenantId: TENANT_ID,
  productId: '11111111-1111-1111-1111-111111111111',
  code: 'TSHIRT-BLK-M',
  size: 'M',
  color: 'Black',
  stockQuantity: 100,
  price: 29.99,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

export const wcTestCustomer: WellCraftedCustomer = {
  customerId: '33333333-3333-3333-3333-333333333333',
  tenantId: TENANT_ID,
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-1234',
  createdAt: new Date('2024-01-15T10:30:00.000Z'),
  updatedAt: new Date('2024-01-15T10:30:00.000Z'),
};

export const wcTestOrder: WellCraftedOrder = {
  orderId: '44444444-4444-4444-4444-444444444444',
  tenantId: TENANT_ID,
  customerId: '33333333-3333-3333-3333-333333333333',
  orderedAt: new Date('2024-01-20T14:00:00.000Z'),
  status: 'pending',
  totalAmount: 59.98,
  createdAt: new Date('2024-01-20T14:00:00.000Z'),
  updatedAt: new Date('2024-01-20T14:00:00.000Z'),
};

export const wcTestOrderLine: WellCraftedOrderLine = {
  orderLineId: '55555555-5555-5555-5555-555555555555',
  tenantId: TENANT_ID,
  orderId: '44444444-4444-4444-4444-444444444444',
  skuId: '22222222-2222-2222-2222-222222222222',
  quantity: 2,
  pricePerUnit: 29.99,
  createdAt: new Date('2024-01-20T14:00:00.000Z'),
  updatedAt: new Date('2024-01-20T14:00:00.000Z'),
};

// ============================================================================
// EXPECTED LOVABLE OUTPUT (Target)
// ============================================================================

export const expectedLovableProduct: LovableProduct = {
  productid: '11111111-1111-1111-1111-111111111111',
  name: 'Premium Cotton T-Shirt',
  description: 'High quality 100% organic cotton t-shirt with reinforced stitching',
  category: 'Apparel',
  createdat: '2024-01-01T00:00:00.000Z',
  updatedat: '2024-01-01T00:00:00.000Z',
};

export const expectedLovableSku: LovableSku = {
  skuid: '22222222-2222-2222-2222-222222222222',
  productid: '11111111-1111-1111-1111-111111111111',
  code: 'TSHIRT-BLK-M',
  size: 'M',
  color: 'Black',
  stockquantity: 100,
  price: 29.99,
  createdat: '2024-01-01T00:00:00.000Z',
  updatedat: '2024-01-01T00:00:00.000Z',
};

export const expectedLovableCustomer: LovableCustomer = {
  customerid: '33333333-3333-3333-3333-333333333333',
  email: 'john.doe@example.com',
  firstname: 'John',
  lastname: 'Doe',
  phone: '+1-555-1234',
  createdat: '2024-01-15T10:30:00.000Z',
  updatedat: '2024-01-15T10:30:00.000Z',
};

export const expectedLovableOrder: LovableOrder = {
  orderid: '44444444-4444-4444-4444-444444444444',
  customerid: '33333333-3333-3333-3333-333333333333',
  orderedat: '2024-01-20T14:00:00.000Z',
  status: 'pending',
  totalamount: 59.98,
  createdat: '2024-01-20T14:00:00.000Z',
  updatedat: '2024-01-20T14:00:00.000Z',
};

export const expectedLovableOrderLine: LovableOrderLine = {
  orderlineid: '55555555-5555-5555-5555-555555555555',
  orderid: '44444444-4444-4444-4444-444444444444',
  skuid: '22222222-2222-2222-2222-222222222222',
  quantity: 2,
  priceperunit: 29.99,
  createdat: '2024-01-20T14:00:00.000Z',
  updatedat: '2024-01-20T14:00:00.000Z',
};

// ============================================================================
// ADDITIONAL TEST CASES
// ============================================================================

// Test Case 2: Customer with null phone
export const wcTestCustomerNoPhone: WellCraftedCustomer = {
  customerId: '66666666-6666-6666-6666-666666666666',
  tenantId: TENANT_ID,
  email: 'jane.smith@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  phone: null,
  createdAt: new Date('2024-02-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

export const expectedLovableCustomerNoPhone: LovableCustomer = {
  customerid: '66666666-6666-6666-6666-666666666666',
  email: 'jane.smith@example.com',
  firstname: 'Jane',
  lastname: 'Smith',
  phone: null,
  createdat: '2024-02-01T00:00:00.000Z',
  updatedat: '2024-02-01T00:00:00.000Z',
};

// Test Case 3: Product with null description and category
export const wcTestProductMinimal: WellCraftedProduct = {
  productId: '77777777-7777-7777-7777-777777777777',
  tenantId: TENANT_ID,
  name: 'Basic Widget',
  description: null,
  category: null,
  createdAt: new Date('2024-03-01T00:00:00.000Z'),
  updatedAt: new Date('2024-03-01T00:00:00.000Z'),
};

export const expectedLovableProductMinimal: LovableProduct = {
  productid: '77777777-7777-7777-7777-777777777777',
  name: 'Basic Widget',
  description: null,
  category: null,
  createdat: '2024-03-01T00:00:00.000Z',
  updatedat: '2024-03-01T00:00:00.000Z',
};

// Test Case 4: SKU with null size and color
export const wcTestSkuNoSizeColor: WellCraftedSku = {
  skuId: '88888888-8888-8888-8888-888888888888',
  tenantId: TENANT_ID,
  productId: '77777777-7777-7777-7777-777777777777',
  code: 'WIDGET-001',
  size: null,
  color: null,
  stockQuantity: 50,
  price: 9.99,
  createdAt: new Date('2024-03-01T00:00:00.000Z'),
  updatedAt: new Date('2024-03-01T00:00:00.000Z'),
};

export const expectedLovableSkuNoSizeColor: LovableSku = {
  skuid: '88888888-8888-8888-8888-888888888888',
  productid: '77777777-7777-7777-7777-777777777777',
  code: 'WIDGET-001',
  size: null,
  color: null,
  stockquantity: 50,
  price: 9.99,
  createdat: '2024-03-01T00:00:00.000Z',
  updatedat: '2024-03-01T00:00:00.000Z',
};

// Test Case 5: Order with different status
export const wcTestOrderShipped: WellCraftedOrder = {
  orderId: '99999999-9999-9999-9999-999999999999',
  tenantId: TENANT_ID,
  customerId: '33333333-3333-3333-3333-333333333333',
  orderedAt: new Date('2024-01-25T09:15:00.000Z'),
  status: 'shipped',
  totalAmount: 149.99,
  createdAt: new Date('2024-01-25T09:15:00.000Z'),
  updatedAt: new Date('2024-01-26T14:30:00.000Z'),
};

export const expectedLovableOrderShipped: LovableOrder = {
  orderid: '99999999-9999-9999-9999-999999999999',
  customerid: '33333333-3333-3333-3333-333333333333',
  orderedat: '2024-01-25T09:15:00.000Z',
  status: 'shipped',
  totalamount: 149.99,
  createdat: '2024-01-25T09:15:00.000Z',
  updatedat: '2024-01-26T14:30:00.000Z',
};

// ============================================================================
// BATCH TEST DATA (For performance testing)
// ============================================================================

/**
 * Generate batch of test customers
 */
export function generateTestCustomers(count: number): WellCraftedCustomer[] {
  const customers: WellCraftedCustomer[] = [];

  for (let i = 0; i < count; i++) {
    const id = String(i).padStart(32, '0');
    const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;

    customers.push({
      customerId: uuid,
      tenantId: TENANT_ID,
      email: `customer${i}@example.com`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      phone: i % 2 === 0 ? `+1-555-${String(i).padStart(4, '0')}` : null,
      createdAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
      updatedAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
    });
  }

  return customers;
}

/**
 * Generate batch of test products
 */
export function generateTestProducts(count: number): WellCraftedProduct[] {
  const products: WellCraftedProduct[] = [];
  const categories = ['Apparel', 'Electronics', 'Home', 'Sports', 'Books'];

  for (let i = 0; i < count; i++) {
    const id = String(1000000 + i).padStart(32, '0');
    const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;

    products.push({
      productId: uuid,
      tenantId: TENANT_ID,
      name: `Product ${i}`,
      description: i % 3 === 0 ? null : `Description for product ${i}`,
      category: categories[i % categories.length],
      createdAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
      updatedAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
    });
  }

  return products;
}

/**
 * Generate batch of test SKUs
 */
export function generateTestSkus(count: number, productIds: string[]): WellCraftedSku[] {
  const skus: WellCraftedSku[] = [];
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const colors = ['Red', 'Blue', 'Green', 'Black', 'White'];

  for (let i = 0; i < count; i++) {
    const id = String(2000000 + i).padStart(32, '0');
    const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;

    skus.push({
      skuId: uuid,
      tenantId: TENANT_ID,
      productId: productIds[i % productIds.length],
      code: `SKU-${i}`,
      size: i % 2 === 0 ? sizes[i % sizes.length] : null,
      color: i % 3 === 0 ? null : colors[i % colors.length],
      stockQuantity: Math.floor(Math.random() * 500),
      price: Math.round((Math.random() * 100 + 10) * 100) / 100,
      createdAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
      updatedAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
    });
  }

  return skus;
}

/**
 * Generate batch of test orders
 */
export function generateTestOrders(count: number, customerIds: string[]): WellCraftedOrder[] {
  const orders: WellCraftedOrder[] = [];
  const statuses = ['pending', 'processing', 'shipped', 'delivered'];

  for (let i = 0; i < count; i++) {
    const id = String(3000000 + i).padStart(32, '0');
    const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;

    orders.push({
      orderId: uuid,
      tenantId: TENANT_ID,
      customerId: customerIds[i % customerIds.length],
      orderedAt: new Date(`2024-01-${(i % 28) + 1}T${(i % 24).toString().padStart(2, '0')}:00:00.000Z`),
      status: statuses[i % statuses.length],
      totalAmount: Math.round((Math.random() * 500 + 50) * 100) / 100,
      createdAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
      updatedAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
    });
  }

  return orders;
}

/**
 * Generate batch of test order lines
 */
export function generateTestOrderLines(count: number, orderIds: string[], skuIds: string[]): WellCraftedOrderLine[] {
  const orderLines: WellCraftedOrderLine[] = [];

  for (let i = 0; i < count; i++) {
    const id = String(4000000 + i).padStart(32, '0');
    const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;

    orderLines.push({
      orderLineId: uuid,
      tenantId: TENANT_ID,
      orderId: orderIds[i % orderIds.length],
      skuId: skuIds[i % skuIds.length],
      quantity: Math.floor(Math.random() * 10) + 1,
      pricePerUnit: Math.round((Math.random() * 100 + 10) * 100) / 100,
      createdAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
      updatedAt: new Date(`2024-01-${(i % 28) + 1}T00:00:00.000Z`),
    });
  }

  return orderLines;
}

// ============================================================================
// EDGE CASES & ERROR TEST DATA
// ============================================================================

// Invalid UUID (should fail validation)
export const wcTestCustomerInvalidUUID: WellCraftedCustomer = {
  customerId: 'not-a-valid-uuid',
  tenantId: TENANT_ID,
  email: 'invalid@example.com',
  firstName: 'Invalid',
  lastName: 'UUID',
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Invalid email (should fail validation)
export const wcTestCustomerInvalidEmail: WellCraftedCustomer = {
  customerId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  tenantId: TENANT_ID,
  email: 'not-an-email',
  firstName: 'Invalid',
  lastName: 'Email',
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Empty required fields (should fail validation)
export const wcTestProductEmptyName: WellCraftedProduct = {
  productId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  tenantId: TENANT_ID,
  name: '',
  description: null,
  category: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Negative stock quantity (should fail validation)
export const wcTestSkuNegativeStock: WellCraftedSku = {
  skuId: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
  tenantId: TENANT_ID,
  productId: '11111111-1111-1111-1111-111111111111',
  code: 'INVALID-SKU',
  size: null,
  color: null,
  stockQuantity: -10,
  price: 9.99,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Zero quantity order line (should fail validation)
export const wcTestOrderLineZeroQuantity: WellCraftedOrderLine = {
  orderLineId: 'dddddddd-dddd-4ddd-dddd-dddddddddddd',
  tenantId: TENANT_ID,
  orderId: '44444444-4444-4444-4444-444444444444',
  skuId: '22222222-2222-2222-2222-222222222222',
  quantity: 0,
  pricePerUnit: 29.99,
  createdAt: new Date(),
  updatedAt: new Date(),
};
