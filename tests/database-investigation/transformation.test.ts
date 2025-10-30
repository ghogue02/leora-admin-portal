/**
 * Schema Transformation Tests
 * Validates Well Crafted → Lovable transformations
 *
 * Generated: 2025-10-23
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  transformCustomer,
  transformOrder,
  transformOrderLine,
  transformSku,
  transformProduct,
  isValidUUID,
  dateToISO,
  batchTransformCustomers,
  batchTransformProducts,
} from '../../src/database-investigation/transformers';
import {
  wcTestCustomer,
  wcTestOrder,
  wcTestOrderLine,
  wcTestSku,
  wcTestProduct,
  expectedLovableCustomer,
  expectedLovableOrder,
  expectedLovableOrderLine,
  expectedLovableSku,
  expectedLovableProduct,
  wcTestCustomerNoPhone,
  expectedLovableCustomerNoPhone,
  wcTestProductMinimal,
  expectedLovableProductMinimal,
  wcTestSkuNoSizeColor,
  expectedLovableSkuNoSizeColor,
  wcTestCustomerInvalidUUID,
  wcTestCustomerInvalidEmail,
  wcTestProductEmptyName,
  wcTestSkuNegativeStock,
  wcTestOrderLineZeroQuantity,
  generateTestCustomers,
  generateTestProducts,
} from '../../src/database-investigation/test-data';

describe('Schema Transformation Tests', () => {
  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  describe('Utility Functions', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('11111111-1111-1111-1111-111111111111')).toBe(true);
      expect(isValidUUID('a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('11111111-1111-1111-1111-11111111111')).toBe(false); // Too short
      expect(isValidUUID('11111111-1111-1111-1111-1111111111111')).toBe(false); // Too long
      expect(isValidUUID('')).toBe(false);
    });

    it('should convert Date to ISO 8601 string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      expect(dateToISO(date)).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should throw error for invalid dates', () => {
      expect(() => dateToISO(new Date('invalid'))).toThrow('Invalid date');
    });
  });

  // ============================================================================
  // CUSTOMER TRANSFORMATION TESTS
  // ============================================================================

  describe('Customer Transformation', () => {
    it('should transform customer with all fields', () => {
      const result = transformCustomer(wcTestCustomer);
      expect(result).toEqual(expectedLovableCustomer);
    });

    it('should transform customer with null phone', () => {
      const result = transformCustomer(wcTestCustomerNoPhone);
      expect(result).toEqual(expectedLovableCustomerNoPhone);
    });

    it('should drop tenantId field', () => {
      const result = transformCustomer(wcTestCustomer);
      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should lowercase email', () => {
      const customer = { ...wcTestCustomer, email: 'JOHN.DOE@EXAMPLE.COM' };
      const result = transformCustomer(customer);
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should trim string fields', () => {
      const customer = {
        ...wcTestCustomer,
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  john.doe@example.com  ',
      };
      const result = transformCustomer(customer);
      expect(result.firstname).toBe('John');
      expect(result.lastname).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should throw error for invalid UUID', () => {
      expect(() => transformCustomer(wcTestCustomerInvalidUUID)).toThrow('Invalid customer UUID');
    });

    it('should throw error for invalid email', () => {
      expect(() => transformCustomer(wcTestCustomerInvalidEmail)).toThrow('Invalid email');
    });

    it('should throw error for empty firstName', () => {
      const customer = { ...wcTestCustomer, firstName: '' };
      expect(() => transformCustomer(customer)).toThrow('firstName is required');
    });

    it('should throw error for empty lastName', () => {
      const customer = { ...wcTestCustomer, lastName: '' };
      expect(() => transformCustomer(customer)).toThrow('lastName is required');
    });
  });

  // ============================================================================
  // PRODUCT TRANSFORMATION TESTS
  // ============================================================================

  describe('Product Transformation', () => {
    it('should transform product with all fields', () => {
      const result = transformProduct(wcTestProduct);
      expect(result).toEqual(expectedLovableProduct);
    });

    it('should transform product with null description and category', () => {
      const result = transformProduct(wcTestProductMinimal);
      expect(result).toEqual(expectedLovableProductMinimal);
    });

    it('should drop tenantId field', () => {
      const result = transformProduct(wcTestProduct);
      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should preserve productId UUID', () => {
      const result = transformProduct(wcTestProduct);
      expect(result.productid).toBe(wcTestProduct.productId);
    });

    it('should trim string fields', () => {
      const product = {
        ...wcTestProduct,
        name: '  Premium T-Shirt  ',
        description: '  High quality  ',
        category: '  Apparel  ',
      };
      const result = transformProduct(product);
      expect(result.name).toBe('Premium T-Shirt');
      expect(result.description).toBe('High quality');
      expect(result.category).toBe('Apparel');
    });

    it('should throw error for invalid UUID', () => {
      const product = { ...wcTestProduct, productId: 'invalid-uuid' };
      expect(() => transformProduct(product)).toThrow('Invalid product UUID');
    });

    it('should throw error for empty name', () => {
      expect(() => transformProduct(wcTestProductEmptyName)).toThrow('Product name is required');
    });
  });

  // ============================================================================
  // SKU TRANSFORMATION TESTS
  // ============================================================================

  describe('SKU Transformation', () => {
    it('should transform SKU with all fields', async () => {
      const result = await transformSku(wcTestSku);
      expect(result).toEqual(expectedLovableSku);
    });

    it('should transform SKU with null size and color', async () => {
      const result = await transformSku(wcTestSkuNoSizeColor);
      expect(result).toEqual(expectedLovableSkuNoSizeColor);
    });

    it('should drop tenantId field', async () => {
      const result = await transformSku(wcTestSku);
      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should normalize SKU code to uppercase', async () => {
      const sku = { ...wcTestSku, code: 'tshirt-blk-m' };
      const result = await transformSku(sku);
      expect(result.code).toBe('TSHIRT-BLK-M');
    });

    it('should preserve price decimal precision', async () => {
      const sku = { ...wcTestSku, price: 29.99 };
      const result = await transformSku(sku);
      expect(result.price).toBe(29.99);
    });

    it('should throw error for invalid skuId UUID', async () => {
      const sku = { ...wcTestSku, skuId: 'invalid-uuid' };
      await expect(transformSku(sku)).rejects.toThrow('Invalid sku UUID');
    });

    it('should throw error for invalid productId UUID', async () => {
      const sku = { ...wcTestSku, productId: 'invalid-uuid' };
      await expect(transformSku(sku)).rejects.toThrow('Invalid product UUID');
    });

    it('should throw error for negative stock quantity', async () => {
      await expect(transformSku(wcTestSkuNegativeStock)).rejects.toThrow('Invalid stock quantity');
    });

    it('should throw error for negative price', async () => {
      const sku = { ...wcTestSku, price: -10.00 };
      await expect(transformSku(sku)).rejects.toThrow('Invalid price');
    });

    it('should throw error for empty SKU code', async () => {
      const sku = { ...wcTestSku, code: '' };
      await expect(transformSku(sku)).rejects.toThrow('SKU code is required');
    });
  });

  // ============================================================================
  // ORDER TRANSFORMATION TESTS
  // ============================================================================

  describe('Order Transformation', () => {
    it('should transform order with all fields', async () => {
      const result = await transformOrder(wcTestOrder);
      expect(result).toEqual(expectedLovableOrder);
    });

    it('should drop tenantId field', async () => {
      const result = await transformOrder(wcTestOrder);
      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should lowercase status', async () => {
      const order = { ...wcTestOrder, status: 'PENDING' };
      const result = await transformOrder(order);
      expect(result.status).toBe('pending');
    });

    it('should preserve totalAmount decimal precision', async () => {
      const order = { ...wcTestOrder, totalAmount: 59.98 };
      const result = await transformOrder(order);
      expect(result.totalamount).toBe(59.98);
    });

    it('should throw error for invalid orderId UUID', async () => {
      const order = { ...wcTestOrder, orderId: 'invalid-uuid' };
      await expect(transformOrder(order)).rejects.toThrow('Invalid order UUID');
    });

    it('should throw error for invalid customerId UUID', async () => {
      const order = { ...wcTestOrder, customerId: 'invalid-uuid' };
      await expect(transformOrder(order)).rejects.toThrow('Invalid customer UUID');
    });

    it('should throw error for invalid status', async () => {
      const order = { ...wcTestOrder, status: 'invalid-status' };
      await expect(transformOrder(order)).rejects.toThrow('Invalid order status');
    });

    it('should throw error for negative totalAmount', async () => {
      const order = { ...wcTestOrder, totalAmount: -10.00 };
      await expect(transformOrder(order)).rejects.toThrow('Invalid totalAmount');
    });
  });

  // ============================================================================
  // ORDERLINE TRANSFORMATION TESTS
  // ============================================================================

  describe('OrderLine Transformation', () => {
    it('should transform orderline with all fields', async () => {
      const result = await transformOrderLine(wcTestOrderLine);
      expect(result).toEqual(expectedLovableOrderLine);
    });

    it('should drop tenantId field', async () => {
      const result = await transformOrderLine(wcTestOrderLine);
      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should preserve pricePerUnit decimal precision', async () => {
      const orderLine = { ...wcTestOrderLine, pricePerUnit: 29.99 };
      const result = await transformOrderLine(orderLine);
      expect(result.priceperunit).toBe(29.99);
    });

    it('should throw error for invalid orderLineId UUID', async () => {
      const orderLine = { ...wcTestOrderLine, orderLineId: 'invalid-uuid' };
      await expect(transformOrderLine(orderLine)).rejects.toThrow('Invalid orderLine UUID');
    });

    it('should throw error for invalid orderId UUID', async () => {
      const orderLine = { ...wcTestOrderLine, orderId: 'invalid-uuid' };
      await expect(transformOrderLine(orderLine)).rejects.toThrow('Invalid order UUID');
    });

    it('should throw error for invalid skuId UUID', async () => {
      const orderLine = { ...wcTestOrderLine, skuId: 'invalid-uuid' };
      await expect(transformOrderLine(orderLine)).rejects.toThrow('Invalid sku UUID');
    });

    it('should throw error for zero quantity', async () => {
      await expect(transformOrderLine(wcTestOrderLineZeroQuantity)).rejects.toThrow('Invalid quantity');
    });

    it('should throw error for negative quantity', async () => {
      const orderLine = { ...wcTestOrderLine, quantity: -1 };
      await expect(transformOrderLine(orderLine)).rejects.toThrow('Invalid quantity');
    });

    it('should throw error for negative pricePerUnit', async () => {
      const orderLine = { ...wcTestOrderLine, pricePerUnit: -10.00 };
      await expect(transformOrderLine(orderLine)).rejects.toThrow('Invalid pricePerUnit');
    });
  });

  // ============================================================================
  // BATCH TRANSFORMATION TESTS
  // ============================================================================

  describe('Batch Transformation', () => {
    it('should batch transform 100 customers', async () => {
      const customers = generateTestCustomers(100);
      const result = await batchTransformCustomers(customers);

      expect(result.successCount).toBe(100);
      expect(result.failureCount).toBe(0);
      expect(result.successful.length).toBe(100);
      expect(result.failed.length).toBe(0);
    });

    it('should batch transform 100 products', async () => {
      const products = generateTestProducts(100);
      const result = await batchTransformProducts(products);

      expect(result.successCount).toBe(100);
      expect(result.failureCount).toBe(0);
      expect(result.successful.length).toBe(100);
      expect(result.failed.length).toBe(0);
    });

    it('should handle errors in batch transformation', async () => {
      const customers = [
        wcTestCustomer,
        wcTestCustomerInvalidUUID, // This should fail
        wcTestCustomerNoPhone,
      ];

      const result = await batchTransformCustomers(customers, { stopOnError: false });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failed[0].record).toEqual(wcTestCustomerInvalidUUID);
    });

    it('should stop on error when stopOnError is true', async () => {
      const customers = [
        wcTestCustomerInvalidUUID, // This should fail immediately
        wcTestCustomer,
      ];

      await expect(
        batchTransformCustomers(customers, { stopOnError: true })
      ).rejects.toThrow('Invalid customer UUID');
    });

    it('should call onProgress callback', async () => {
      const customers = generateTestCustomers(10);
      let progressCallCount = 0;

      await batchTransformCustomers(customers, {
        batchSize: 5,
        onProgress: (processed, total, entity) => {
          progressCallCount++;
          expect(entity).toBe('Customer');
          expect(total).toBe(10);
        },
      });

      expect(progressCallCount).toBeGreaterThan(0);
    });

    it('should call onError callback for failures', async () => {
      const customers = [wcTestCustomer, wcTestCustomerInvalidUUID];
      let errorCallCount = 0;

      await batchTransformCustomers(customers, {
        stopOnError: false,
        onError: (error, record, entity) => {
          errorCallCount++;
          expect(entity).toBe('Customer');
          expect(error.message).toContain('Invalid customer UUID');
        },
      });

      expect(errorCallCount).toBe(1);
    });
  });

  // ============================================================================
  // FIELD MAPPING VALIDATION
  // ============================================================================

  describe('Field Mapping Validation', () => {
    it('should map all customer fields correctly', () => {
      const result = transformCustomer(wcTestCustomer);

      // Check all expected fields exist
      expect(result).toHaveProperty('customerid');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstname');
      expect(result).toHaveProperty('lastname');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('createdat');
      expect(result).toHaveProperty('updatedat');

      // Check tenantId is dropped
      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should map all product fields correctly', () => {
      const result = transformProduct(wcTestProduct);

      expect(result).toHaveProperty('productid');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('createdat');
      expect(result).toHaveProperty('updatedat');

      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should map all SKU fields correctly', async () => {
      const result = await transformSku(wcTestSku);

      expect(result).toHaveProperty('skuid');
      expect(result).toHaveProperty('productid');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('stockquantity');
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('createdat');
      expect(result).toHaveProperty('updatedat');

      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should map all order fields correctly', async () => {
      const result = await transformOrder(wcTestOrder);

      expect(result).toHaveProperty('orderid');
      expect(result).toHaveProperty('customerid');
      expect(result).toHaveProperty('orderedat');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('totalamount');
      expect(result).toHaveProperty('createdat');
      expect(result).toHaveProperty('updatedat');

      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should map all orderline fields correctly', async () => {
      const result = await transformOrderLine(wcTestOrderLine);

      expect(result).toHaveProperty('orderlineid');
      expect(result).toHaveProperty('orderid');
      expect(result).toHaveProperty('skuid');
      expect(result).toHaveProperty('quantity');
      expect(result).toHaveProperty('priceperunit');
      expect(result).toHaveProperty('createdat');
      expect(result).toHaveProperty('updatedat');

      expect(result).not.toHaveProperty('tenantid');
      expect(result).not.toHaveProperty('tenantId');
    });
  });
});
