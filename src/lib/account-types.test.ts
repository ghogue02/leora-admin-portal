/**
 * Integration Tests: Account Type Classification Logic
 * Tests customer classification based on order history
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, AccountType } from '@prisma/client';
import {
  updateAccountTypes,
  updateCustomerAccountType,
  type AccountTypeUpdateResult,
} from './account-types';

const prisma = new PrismaClient();

describe('Account Type Classification Logic', () => {
  let testTenantId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-tenant-accounts',
        name: 'Test Tenant Accounts',
        industry: 'test',
      },
    });
    testTenantId = tenant.id;
  });

  afterEach(async () => {
    // Cleanup: Delete test data
    await prisma.customer.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('updateAccountTypes', () => {
    it('should classify customers as ACTIVE with recent orders', async () => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Create customer with recent order
      await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Active Customer',
          accountType: AccountType.PROSPECT, // Start as prospect
          lastOrderDate: threeMonthsAgo,
        },
      });

      const results = await updateAccountTypes(testTenantId);

      expect(results).toHaveLength(1);
      expect(results[0].active).toBe(1);
      expect(results[0].target).toBe(0);
      expect(results[0].prospect).toBe(0);

      // Verify customer was updated
      const customer = await prisma.customer.findFirst({
        where: { tenantId: testTenantId },
      });
      expect(customer?.accountType).toBe(AccountType.ACTIVE);
    });

    it('should classify customers as TARGET with 6-12 month old orders', async () => {
      const now = new Date();
      const eightMonthsAgo = new Date(now.getTime() - 240 * 24 * 60 * 60 * 1000);

      await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Target Customer',
          accountType: AccountType.ACTIVE, // Start as active
          lastOrderDate: eightMonthsAgo,
        },
      });

      const results = await updateAccountTypes(testTenantId);

      expect(results[0].active).toBe(0);
      expect(results[0].target).toBe(1);
      expect(results[0].prospect).toBe(0);

      const customer = await prisma.customer.findFirst({
        where: { tenantId: testTenantId },
      });
      expect(customer?.accountType).toBe(AccountType.TARGET);
    });

    it('should classify customers as PROSPECT with no orders', async () => {
      await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Prospect Customer',
          accountType: AccountType.ACTIVE, // Start as active (shouldn't stay)
          lastOrderDate: null, // Never ordered
        },
      });

      const results = await updateAccountTypes(testTenantId);

      expect(results[0].active).toBe(0);
      expect(results[0].target).toBe(0);
      expect(results[0].prospect).toBe(1);

      const customer = await prisma.customer.findFirst({
        where: { tenantId: testTenantId },
      });
      expect(customer?.accountType).toBe(AccountType.PROSPECT);
    });

    it('should classify customers as PROSPECT with old orders', async () => {
      const now = new Date();
      const fourteenMonthsAgo = new Date(now.getTime() - 420 * 24 * 60 * 60 * 1000);

      await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Old Customer',
          accountType: AccountType.TARGET,
          lastOrderDate: fourteenMonthsAgo,
        },
      });

      const results = await updateAccountTypes(testTenantId);

      expect(results[0].prospect).toBe(1);

      const customer = await prisma.customer.findFirst({
        where: { tenantId: testTenantId },
      });
      expect(customer?.accountType).toBe(AccountType.PROSPECT);
    });

    it('should handle mixed customer types', async () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const eightMonthsAgo = new Date(now.getTime() - 240 * 24 * 60 * 60 * 1000);
      const fourteenMonthsAgo = new Date(now.getTime() - 420 * 24 * 60 * 60 * 1000);

      // Create 3 customers with different order dates
      await prisma.customer.createMany({
        data: [
          {
            tenantId: testTenantId,
            name: 'Active Customer',
            accountType: AccountType.PROSPECT,
            lastOrderDate: twoMonthsAgo,
          },
          {
            tenantId: testTenantId,
            name: 'Target Customer',
            accountType: AccountType.PROSPECT,
            lastOrderDate: eightMonthsAgo,
          },
          {
            tenantId: testTenantId,
            name: 'Prospect Customer',
            accountType: AccountType.ACTIVE,
            lastOrderDate: fourteenMonthsAgo,
          },
          {
            tenantId: testTenantId,
            name: 'Never Ordered',
            accountType: AccountType.ACTIVE,
            lastOrderDate: null,
          },
        ],
      });

      const results = await updateAccountTypes(testTenantId);

      expect(results[0].active).toBe(1);
      expect(results[0].target).toBe(1);
      expect(results[0].prospect).toBe(2);
      expect(results[0].total).toBe(4);
    });

    it('should only update customers with changed classifications', async () => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Create customer already correctly classified
      await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Already Active',
          accountType: AccountType.ACTIVE,
          lastOrderDate: threeMonthsAgo,
        },
      });

      const results = await updateAccountTypes(testTenantId);

      // Should still have 1 active customer
      expect(results[0].active).toBe(1);
    });

    it('should handle multiple tenants', async () => {
      // Create second tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          slug: 'test-tenant-2',
          name: 'Test Tenant 2',
          industry: 'test',
        },
      });

      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Create customers in both tenants
      await prisma.customer.createMany({
        data: [
          {
            tenantId: testTenantId,
            name: 'Tenant 1 Customer',
            accountType: AccountType.PROSPECT,
            lastOrderDate: twoMonthsAgo,
          },
          {
            tenantId: tenant2.id,
            name: 'Tenant 2 Customer',
            accountType: AccountType.PROSPECT,
            lastOrderDate: twoMonthsAgo,
          },
        ],
      });

      // Update all tenants
      const results = await updateAccountTypes();

      expect(results).toHaveLength(2);
      expect(results.find(r => r.tenantId === testTenantId)?.active).toBe(1);
      expect(results.find(r => r.tenantId === tenant2.id)?.active).toBe(1);

      // Cleanup
      await prisma.customer.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });

    it('should return accurate counts after updates', async () => {
      const now = new Date();
      const dates = [
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // ACTIVE
        new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // ACTIVE
        new Date(now.getTime() - 240 * 24 * 60 * 60 * 1000), // TARGET
        new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000), // TARGET
        new Date(now.getTime() - 420 * 24 * 60 * 60 * 1000), // PROSPECT
      ];

      await Promise.all(
        dates.map((date, i) =>
          prisma.customer.create({
            data: {
              tenantId: testTenantId,
              name: `Customer ${i}`,
              accountType: AccountType.PROSPECT,
              lastOrderDate: date,
            },
          })
        )
      );

      const results = await updateAccountTypes(testTenantId);

      expect(results[0].active).toBe(2);
      expect(results[0].target).toBe(2);
      expect(results[0].prospect).toBe(1);
      expect(results[0].total).toBe(5);
    });
  });

  describe('updateCustomerAccountType', () => {
    it('should update customer to ACTIVE with recent order', async () => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Customer',
          accountType: AccountType.PROSPECT,
          lastOrderDate: threeMonthsAgo,
        },
      });

      await updateCustomerAccountType(customer.id);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updated?.accountType).toBe(AccountType.ACTIVE);
    });

    it('should not change already ACTIVE customer', async () => {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Customer',
          accountType: AccountType.ACTIVE,
          lastOrderDate: oneMonthAgo,
        },
      });

      await updateCustomerAccountType(customer.id);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updated?.accountType).toBe(AccountType.ACTIVE);
    });

    it('should handle customer without orders', async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Test Customer',
          accountType: AccountType.PROSPECT,
          lastOrderDate: null,
        },
      });

      await updateCustomerAccountType(customer.id);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      // Should remain PROSPECT (no update for null lastOrderDate)
      expect(updated?.accountType).toBe(AccountType.PROSPECT);
    });

    it('should handle non-existent customer gracefully', async () => {
      await expect(
        updateCustomerAccountType('non-existent-id')
      ).resolves.not.toThrow();
    });

    it('should update from TARGET to ACTIVE on new order', async () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Reactivated Customer',
          accountType: AccountType.TARGET,
          lastOrderDate: twoMonthsAgo,
        },
      });

      await updateCustomerAccountType(customer.id);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updated?.accountType).toBe(AccountType.ACTIVE);
    });
  });

  describe('Date Threshold Boundaries', () => {
    it('should classify customer at exact 6 month boundary as ACTIVE', async () => {
      const now = new Date();
      const exactlySixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Boundary Customer',
          accountType: AccountType.PROSPECT,
          lastOrderDate: exactlySixMonthsAgo,
        },
      });

      const results = await updateAccountTypes(testTenantId);

      expect(results[0].active).toBe(1);
    });

    it('should classify customer at exact 12 month boundary as TARGET', async () => {
      const now = new Date();
      const exactlyTwelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Boundary Customer',
          accountType: AccountType.PROSPECT,
          lastOrderDate: exactlyTwelveMonthsAgo,
        },
      });

      const results = await updateAccountTypes(testTenantId);

      expect(results[0].target).toBe(1);
    });
  });

  describe('State Transitions', () => {
    it('should transition PROSPECT → ACTIVE on first order', async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'New Customer',
          accountType: AccountType.PROSPECT,
          lastOrderDate: null,
        },
      });

      // Simulate order placed
      const now = new Date();
      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastOrderDate: now },
      });

      await updateCustomerAccountType(customer.id);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updated?.accountType).toBe(AccountType.ACTIVE);
    });

    it('should transition ACTIVE → TARGET after 6 months', async () => {
      const now = new Date();
      const eightMonthsAgo = new Date(now.getTime() - 240 * 24 * 60 * 60 * 1000);

      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Inactive Customer',
          accountType: AccountType.ACTIVE,
          lastOrderDate: eightMonthsAgo,
        },
      });

      await updateAccountTypes(testTenantId);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updated?.accountType).toBe(AccountType.TARGET);
    });

    it('should transition TARGET → PROSPECT after 12 months', async () => {
      const now = new Date();
      const fourteenMonthsAgo = new Date(now.getTime() - 420 * 24 * 60 * 60 * 1000);

      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Lost Customer',
          accountType: AccountType.TARGET,
          lastOrderDate: fourteenMonthsAgo,
        },
      });

      await updateAccountTypes(testTenantId);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updated?.accountType).toBe(AccountType.PROSPECT);
    });

    it('should transition TARGET → ACTIVE on reactivation', async () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: 'Reactivated Customer',
          accountType: AccountType.TARGET,
          lastOrderDate: twoMonthsAgo,
        },
      });

      await updateAccountTypes(testTenantId);

      const updated = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(updated?.accountType).toBe(AccountType.ACTIVE);
    });
  });
});
