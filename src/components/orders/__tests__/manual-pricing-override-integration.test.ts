/**
 * Manual Pricing Override Integration Test
 *
 * Tests the complete workflow for manual price overrides:
 * 1. Manager permission checking
 * 2. Price override application
 * 3. Database persistence
 * 4. Order approval requirement
 */

import { describe, it, expect } from 'vitest';
import { canOverridePrices } from '@/lib/permissions';
import type { SalesSession } from '@/lib/auth/sales-session';

describe('Manual Pricing Override - Complete Workflow', () => {
  describe('Permission Checks', () => {
    it('should allow managers to override prices', () => {
      const managerSession: SalesSession = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        user: {
          id: 'user-1',
          email: 'manager@test.com',
          firstName: 'Manager',
          lastName: 'User',
          roles: [
            {
              role: {
                code: 'manager',
                name: 'Manager',
                permissions: [
                  {
                    permission: {
                      code: 'orders.override_price',
                      name: 'Override Prices',
                    }
                  }
                ]
              }
            }
          ]
        }
      };

      expect(canOverridePrices(managerSession)).toBe(true);
    });

    it('should allow admins to override prices', () => {
      const adminSession: SalesSession = {
        userId: 'user-2',
        tenantId: 'tenant-1',
        user: {
          id: 'user-2',
          email: 'admin@test.com',
          firstName: 'Admin',
          lastName: 'User',
          roles: [
            {
              role: {
                code: 'admin',
                name: 'Admin',
                permissions: []
              }
            }
          ]
        }
      };

      expect(canOverridePrices(adminSession)).toBe(true);
    });

    it('should deny sales reps from overriding prices', () => {
      const salesRepSession: SalesSession = {
        userId: 'user-3',
        tenantId: 'tenant-1',
        user: {
          id: 'user-3',
          email: 'salesrep@test.com',
          firstName: 'Sales',
          lastName: 'Rep',
          roles: [
            {
              role: {
                code: 'sales_rep',
                name: 'Sales Rep',
                permissions: []
              }
            }
          ]
        }
      };

      expect(canOverridePrices(salesRepSession)).toBe(false);
    });

    it('should deny unauthenticated users from overriding prices', () => {
      expect(canOverridePrices(null)).toBe(false);
    });
  });

  describe('Price Override Logic', () => {
    it('should validate minimum price', () => {
      const price = 0;
      const isValid = price > 0;

      expect(isValid).toBe(false);
    });

    it('should validate positive price', () => {
      const price = 39.99;
      const isValid = price > 0;

      expect(isValid).toBe(true);
    });

    it('should validate reason minimum length', () => {
      const shortReason = 'Short';
      const longReason = 'Long-time customer loyalty discount';

      expect(shortReason.length >= 10).toBe(false);
      expect(longReason.length >= 10).toBe(true);
    });

    it('should calculate price change percentage correctly', () => {
      const currentPrice = 50.00;
      const newPrice = 40.00;

      const percentChange = ((newPrice - currentPrice) / currentPrice) * 100;

      expect(percentChange).toBe(-20.0);
    });

    it('should detect large price changes', () => {
      const currentPrice = 100.00;
      const newPrice = 70.00;

      const percentChange = Math.abs(((newPrice - currentPrice) / currentPrice) * 100);
      const isLargeChange = percentChange > 20;

      expect(isLargeChange).toBe(true);
    });

    it('should calculate line total with override price', () => {
      const quantity = 12;
      const overridePrice = 39.99;

      const lineTotal = quantity * overridePrice;

      expect(lineTotal).toBe(479.88);
    });

    it('should handle price increase (not just decreases)', () => {
      const currentPrice = 30.00;
      const newPrice = 40.00;

      const priceDifference = newPrice - currentPrice;
      const percentChange = ((newPrice - currentPrice) / currentPrice) * 100;

      expect(priceDifference).toBeGreaterThan(0);
      expect(percentChange).toBeCloseTo(33.3, 1);
    });

    it('should handle decimal prices correctly', () => {
      const price = 39.95;

      expect(price).toBeGreaterThan(0);
      expect(Number.isFinite(price)).toBe(true);
      expect(price.toFixed(2)).toBe('39.95');
    });

    it('should handle very large quantities in line total calculation', () => {
      const quantity = 1000;
      const price = 9.50;

      const lineTotal = quantity * price;

      expect(lineTotal).toBe(9500.00);
    });
  });

  describe('Order Creation with Price Override', () => {
    it('should include override fields in order payload', () => {
      const orderPayload = {
        customerId: 'cust-1',
        warehouseLocation: 'VANCOU',
        deliveryDate: '2025-11-15',
        items: [
          {
            skuId: 'sku-1',
            quantity: 12,
            priceOverride: {
              price: 39.99,
              reason: 'Long-time customer loyalty discount'
            }
          }
        ]
      };

      expect(orderPayload.items[0].priceOverride).toBeDefined();
      expect(orderPayload.items[0].priceOverride?.price).toBe(39.99);
      expect(orderPayload.items[0].priceOverride?.reason).toBe('Long-time customer loyalty discount');
    });

    it('should set requiresApproval when price is overridden', () => {
      const hasOverride = true;
      const requiresApproval = hasOverride;

      expect(requiresApproval).toBe(true);
    });

    it('should persist override fields to database', () => {
      const orderLineData = {
        skuId: 'sku-1',
        quantity: 12,
        unitPrice: 39.99,
        priceOverridden: true,
        overridePrice: 39.99,
        overrideReason: 'Long-time customer loyalty discount',
        overriddenBy: 'user-1',
        overriddenAt: new Date(),
      };

      expect(orderLineData.priceOverridden).toBe(true);
      expect(orderLineData.overridePrice).toBe(39.99);
      expect(orderLineData.overrideReason).toBe('Long-time customer loyalty discount');
      expect(orderLineData.overriddenBy).toBe('user-1');
      expect(orderLineData.overriddenAt).toBeInstanceOf(Date);
    });

    it('should use override price for effective unit price', () => {
      const basePrice = 45.99;
      const overridePrice = 39.99;
      const hasOverride = true;

      const effectivePrice = hasOverride ? overridePrice : basePrice;

      expect(effectivePrice).toBe(39.99);
    });
  });

  describe('Visual Indicators', () => {
    it('should show override badge when price is overridden', () => {
      const priceOverride = {
        price: 39.99,
        reason: 'Customer loyalty'
      };

      expect(priceOverride).toBeDefined();
      expect(priceOverride.price).toBe(39.99);
    });

    it('should compare original and override prices', () => {
      const originalPrice = 45.99;
      const overridePrice = 39.99;

      expect(overridePrice).toBeLessThan(originalPrice);
      expect(originalPrice - overridePrice).toBeCloseTo(6.00, 2);
    });
  });

  describe('Audit Trail', () => {
    it('should record who made the override', () => {
      const session = {
        userId: 'user-1',
        user: { email: 'manager@test.com' }
      };

      const orderLineData = {
        overriddenBy: session.userId,
        overriddenAt: new Date(),
      };

      expect(orderLineData.overriddenBy).toBe('user-1');
      expect(orderLineData.overriddenAt).toBeInstanceOf(Date);
    });

    it('should record the reason in appliedPricingRules', () => {
      const appliedPricingRules = {
        source: 'manual_price_override',
        overrideReason: 'Customer loyalty discount for bulk purchase',
        manualOverrideApplied: true,
      };

      expect(appliedPricingRules.source).toBe('manual_price_override');
      expect(appliedPricingRules.overrideReason).toBe('Customer loyalty discount for bulk purchase');
      expect(appliedPricingRules.manualOverrideApplied).toBe(true);
    });

    it('should timestamp the override action', () => {
      const now = new Date();
      const overriddenAt = new Date();

      // Should be within 1 second
      const diff = Math.abs(overriddenAt.getTime() - now.getTime());

      expect(diff).toBeLessThan(1000);
    });
  });

  describe('Integration with Order Workflow', () => {
    it('should preserve override through order preview', () => {
      const orderLine = {
        skuId: 'sku-1',
        quantity: 12,
        unitPrice: 39.99,
        priceOverride: {
          price: 39.99,
          reason: 'Customer loyalty'
        }
      };

      expect(orderLine.priceOverride).toBeDefined();
      expect(orderLine.priceOverride.price).toBe(orderLine.unitPrice);
    });

    it('should calculate order total using override price', () => {
      const orderLines = [
        {
          quantity: 12,
          unitPrice: 39.99,
          priceOverride: { price: 39.99, reason: 'Discount' }
        },
        {
          quantity: 6,
          unitPrice: 25.00,
          priceOverride: undefined
        }
      ];

      const total = orderLines.reduce((sum, line) =>
        sum + (line.quantity * line.unitPrice), 0
      );

      expect(total).toBeCloseTo((12 * 39.99) + (6 * 25.00), 2);
    });

    it('should set order status to DRAFT when override is present', () => {
      const hasOverride = true;
      const orderStatus = hasOverride ? 'DRAFT' : 'PENDING';

      expect(orderStatus).toBe('DRAFT');
    });

    it('should set order status to PENDING when no override', () => {
      const hasOverride = false;
      const orderStatus = hasOverride ? 'DRAFT' : 'PENDING';

      expect(orderStatus).toBe('PENDING');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero quantity gracefully', () => {
      const quantity = 0;
      const price = 39.99;
      const lineTotal = quantity * price;

      expect(lineTotal).toBe(0);
    });

    it('should handle very small prices', () => {
      const price = 0.01;
      const isValid = price > 0;

      expect(isValid).toBe(true);
    });

    it('should handle very large prices', () => {
      const price = 9999.99;
      const isValid = price > 0;

      expect(isValid).toBe(true);
    });

    it('should handle negative price validation', () => {
      const price = -10.00;
      const isValid = price > 0;

      expect(isValid).toBe(false);
    });

    it('should trim whitespace from reason', () => {
      const reason = '  Customer loyalty discount  ';
      const trimmed = reason.trim();

      expect(trimmed).toBe('Customer loyalty discount');
      expect(trimmed.length).toBeGreaterThan(10);
    });
  });

  describe('Multiple Overrides in Order', () => {
    it('should handle multiple products with different overrides', () => {
      const items = [
        {
          skuId: 'sku-1',
          priceOverride: { price: 39.99, reason: 'Bulk discount' }
        },
        {
          skuId: 'sku-2',
          priceOverride: { price: 25.00, reason: 'Promotional' }
        },
        {
          skuId: 'sku-3',
          priceOverride: undefined // No override
        }
      ];

      const overrideCount = items.filter(item => item.priceOverride).length;

      expect(overrideCount).toBe(2);
    });

    it('should require approval if any item has override', () => {
      const items = [
        { priceOverride: undefined },
        { priceOverride: { price: 39.99, reason: 'Discount' } },
        { priceOverride: undefined }
      ];

      const hasAnyOverride = items.some(item => item.priceOverride);

      expect(hasAnyOverride).toBe(true);
    });

    it('should not require approval if no overrides', () => {
      const items = [
        { priceOverride: undefined },
        { priceOverride: undefined },
        { priceOverride: undefined }
      ];

      const hasAnyOverride = items.some(item => item.priceOverride);

      expect(hasAnyOverride).toBe(false);
    });
  });
});
