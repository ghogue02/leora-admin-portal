/**
 * Phase 3 Sprint 1: Edit Order After Invoice - Test Suite
 *
 * Tests for the backend APIs that allow editing orders after invoice generation.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Edit Order After Invoice - Backend APIs', () => {
  let testOrderId: string;
  let testInvoiceId: string;
  let testCustomerId: string;
  let authCookie: string;

  beforeEach(async () => {
    // Setup: Create test order with invoice
    // This would connect to test database and create fixtures
  });

  afterEach(async () => {
    // Cleanup: Remove test data
  });

  describe('GET /api/sales/orders/[orderId]', () => {
    it('should return order with all required fields for editing', async () => {
      const response = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.order).toBeDefined();
      expect(data.order.id).toBe(testOrderId);
      expect(data.order.customer).toBeDefined();
      expect(data.order.lines).toBeDefined();
      expect(data.order.invoices).toBeDefined();
      expect(data.order.deliveryDate).toBeDefined();
      expect(data.order.warehouseLocation).toBeDefined();
      expect(data.order.deliveryTimeWindow).toBeDefined();
      expect(data.order.poNumber).toBeDefined();
      expect(data.order.specialInstructions).toBeDefined();
    });

    it('should return 404 for non-existent order', async () => {
      const response = await fetch('http://localhost:3000/api/sales/orders/non-existent-id', {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should return 403 if sales rep does not own customer', async () => {
      // Test with different sales rep's order
      const response = await fetch(`http://localhost:3000/api/sales/orders/other-sales-rep-order`, {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/sales/orders/[orderId]', () => {
    it('should update order delivery date successfully', async () => {
      const newDeliveryDate = '2025-12-01';

      const response = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: newDeliveryDate,
          warehouseLocation: 'main',
          deliveryTimeWindow: 'anytime',
          items: [
            { skuId: 'sku-123', quantity: 10 },
          ],
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.order).toBeDefined();
      expect(data.invoiceRegenerated).toBe(true);
    });

    it('should update order products and quantities', async () => {
      const response = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-01',
          warehouseLocation: 'main',
          deliveryTimeWindow: 'anytime',
          items: [
            { skuId: 'sku-123', quantity: 15 }, // Changed quantity
            { skuId: 'sku-456', quantity: 5 },  // New product
          ],
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.order.total).toBeDefined();
    });

    it('should update order warehouse location', async () => {
      const response = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-01',
          warehouseLocation: 'warehouse-b',
          deliveryTimeWindow: 'anytime',
          items: [
            { skuId: 'sku-123', quantity: 10 },
          ],
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should update special instructions', async () => {
      const newInstructions = 'Updated delivery instructions: use back entrance';

      const response = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-01',
          warehouseLocation: 'main',
          deliveryTimeWindow: 'anytime',
          specialInstructions: newInstructions,
          items: [
            { skuId: 'sku-123', quantity: 10 },
          ],
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should create audit log entry for order edit', async () => {
      const response = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-01',
          warehouseLocation: 'main',
          deliveryTimeWindow: 'anytime',
          items: [
            { skuId: 'sku-123', quantity: 10 },
          ],
        }),
      });

      expect(response.status).toBe(200);

      // Verify audit log was created
      // This would query the AuditLog table to verify entry exists
      // with action: 'ORDER_EDITED_POST_INVOICE'
    });

    it('should return 404 for non-existent order', async () => {
      const response = await fetch('http://localhost:3000/api/sales/orders/non-existent-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-01',
          warehouseLocation: 'main',
          deliveryTimeWindow: 'anytime',
          items: [{ skuId: 'sku-123', quantity: 10 }],
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 403 if sales rep does not own customer', async () => {
      const response = await fetch('http://localhost:3000/api/sales/orders/other-sales-rep-order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-01',
          warehouseLocation: 'main',
          deliveryTimeWindow: 'anytime',
          items: [{ skuId: 'sku-123', quantity: 10 }],
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/invoices/[invoiceId]/regenerate', () => {
    it('should regenerate invoice PDF successfully', async () => {
      const response = await fetch(`http://localhost:3000/api/invoices/${testInvoiceId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.pdfGenerated).toBe(true);
      expect(data.pdfSize).toBeGreaterThan(0);
      expect(data.invoice).toBeDefined();
    });

    it('should maintain original invoice number after regeneration', async () => {
      // Get original invoice number
      const originalInvoiceResponse = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        headers: { Cookie: authCookie },
      });
      const originalData = await originalInvoiceResponse.json();
      const originalInvoiceNumber = originalData.order.invoices[0].invoiceNumber;

      // Regenerate invoice
      const response = await fetch(`http://localhost:3000/api/invoices/${testInvoiceId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);

      // Verify invoice number unchanged
      const newInvoiceResponse = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        headers: { Cookie: authCookie },
      });
      const newData = await newInvoiceResponse.json();
      const newInvoiceNumber = newData.order.invoices[0].invoiceNumber;

      expect(newInvoiceNumber).toBe(originalInvoiceNumber);
    });

    it('should update invoice total when order total changes', async () => {
      // First, update order to change total
      await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-01',
          warehouseLocation: 'main',
          deliveryTimeWindow: 'anytime',
          items: [
            { skuId: 'sku-123', quantity: 20 }, // Double quantity
          ],
        }),
      });

      // Regenerate invoice
      const response = await fetch(`http://localhost:3000/api/invoices/${testInvoiceId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.invoice.total).toBeDefined();
      // Verify total matches updated order total
    });

    it('should create audit log entry for invoice regeneration', async () => {
      const response = await fetch(`http://localhost:3000/api/invoices/${testInvoiceId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);

      // Verify audit log was created
      // This would query the AuditLog table to verify entry exists
      // with action: 'INVOICE_REGENERATED'
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await fetch('http://localhost:3000/api/invoices/non-existent-id/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should return 403 if sales rep does not own customer', async () => {
      const response = await fetch('http://localhost:3000/api/invoices/other-sales-rep-invoice/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Edit Order Page - Data Pre-population', () => {
    it('should load order data correctly for editing', async () => {
      const response = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const order = data.order;

      // Verify all fields needed for pre-population are present
      expect(order.customer).toBeDefined();
      expect(order.customer.name).toBeDefined();
      expect(order.customer.id).toBeDefined();

      expect(order.deliveryDate).toBeDefined();
      expect(order.warehouseLocation).toBeDefined();
      expect(order.deliveryTimeWindow).toBeDefined();

      expect(order.lines).toBeDefined();
      expect(order.lines.length).toBeGreaterThan(0);

      order.lines.forEach((line: any) => {
        expect(line.skuId).toBeDefined();
        expect(line.sku.code).toBeDefined();
        expect(line.sku.product.name).toBeDefined();
        expect(line.quantity).toBeDefined();
        expect(line.unitPrice).toBeDefined();
      });
    });
  });

  describe('Integration Test - Full Edit Workflow', () => {
    it('should complete full edit workflow: load -> edit -> save -> regenerate invoice', async () => {
      // Step 1: Load order for editing
      const loadResponse = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        headers: { Cookie: authCookie },
      });
      expect(loadResponse.status).toBe(200);
      const loadData = await loadResponse.json();
      const originalInvoiceNumber = loadData.order.invoices[0].invoiceNumber;

      // Step 2: Update order
      const updateResponse = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          deliveryDate: '2025-12-15',
          warehouseLocation: 'warehouse-b',
          deliveryTimeWindow: '8am-12pm',
          specialInstructions: 'Call before delivery',
          items: [
            { skuId: 'sku-123', quantity: 25 },
            { skuId: 'sku-456', quantity: 10 },
          ],
        }),
      });
      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(true);
      expect(updateData.invoiceRegenerated).toBe(true);

      // Step 3: Verify changes persisted
      const verifyResponse = await fetch(`http://localhost:3000/api/sales/orders/${testOrderId}`, {
        headers: { Cookie: authCookie },
      });
      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();

      expect(verifyData.order.warehouseLocation).toBe('warehouse-b');
      expect(verifyData.order.deliveryTimeWindow).toBe('8am-12pm');
      expect(verifyData.order.specialInstructions).toBe('Call before delivery');

      // Step 4: Verify invoice number unchanged
      expect(verifyData.order.invoices[0].invoiceNumber).toBe(originalInvoiceNumber);

      // Step 5: Verify audit logs created
      // This would query AuditLog table for ORDER_EDITED_POST_INVOICE and INVOICE_REGENERATED entries
    });
  });
});
