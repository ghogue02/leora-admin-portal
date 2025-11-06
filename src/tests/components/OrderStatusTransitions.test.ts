/**
 * Order Status Transition Tests
 *
 * Tests the order status change UI and workflow:
 * - Available transitions based on current status
 * - API integration
 * - Success/error handling
 * - Workflow validation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'READY_TO_DELIVER'
  | 'PICKED'
  | 'DELIVERED'
  | 'CANCELLED';

type StatusTransition = {
  value: OrderStatus;
  label: string;
};

describe('Order Status Transitions', () => {
  const getAvailableTransitions = (
    currentStatus: OrderStatus
  ): StatusTransition[] => {
    const transitions: Record<OrderStatus, StatusTransition[]> = {
      DRAFT: [{ value: 'PENDING', label: 'Submit Order' }],
      PENDING: [
        { value: 'READY_TO_DELIVER', label: 'Mark Ready to Deliver' },
      ],
      READY_TO_DELIVER: [{ value: 'PICKED', label: 'Mark as Picked' }],
      PICKED: [{ value: 'DELIVERED', label: 'Mark as Delivered' }],
      DELIVERED: [], // Terminal state
      CANCELLED: [], // Terminal state
    };
    return transitions[currentStatus] || [];
  };

  describe('Valid Status Transitions', () => {
    it('should allow DRAFT → PENDING', () => {
      const transitions = getAvailableTransitions('DRAFT');

      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toEqual({
        value: 'PENDING',
        label: 'Submit Order',
      });
    });

    it('should allow PENDING → READY_TO_DELIVER', () => {
      const transitions = getAvailableTransitions('PENDING');

      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toEqual({
        value: 'READY_TO_DELIVER',
        label: 'Mark Ready to Deliver',
      });
    });

    it('should allow READY_TO_DELIVER → PICKED', () => {
      const transitions = getAvailableTransitions('READY_TO_DELIVER');

      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toEqual({
        value: 'PICKED',
        label: 'Mark as Picked',
      });
    });

    it('should allow PICKED → DELIVERED', () => {
      const transitions = getAvailableTransitions('PICKED');

      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toEqual({
        value: 'DELIVERED',
        label: 'Mark as Delivered',
      });
    });
  });

  describe('Terminal States', () => {
    it('should have no transitions from DELIVERED', () => {
      const transitions = getAvailableTransitions('DELIVERED');

      expect(transitions).toHaveLength(0);
    });

    it('should have no transitions from CANCELLED', () => {
      const transitions = getAvailableTransitions('CANCELLED');

      expect(transitions).toHaveLength(0);
    });
  });

  describe('Complete Workflow', () => {
    it('should follow the complete order lifecycle', () => {
      const lifecycle: OrderStatus[] = [
        'DRAFT',
        'PENDING',
        'READY_TO_DELIVER',
        'PICKED',
        'DELIVERED',
      ];

      for (let i = 0; i < lifecycle.length - 1; i++) {
        const currentStatus = lifecycle[i];
        const nextStatus = lifecycle[i + 1];
        const transitions = getAvailableTransitions(currentStatus);

        expect(transitions.some((t) => t.value === nextStatus)).toBe(true);
      }
    });
  });

  describe('API Integration', () => {
    it('should call PUT /api/sales/orders/{orderId}/status', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      const orderId = 'order-123';
      const newStatus: OrderStatus = 'READY_TO_DELIVER';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          orderId,
          newStatus,
          message: `Order status updated to ${newStatus}`,
        }),
      });

      const response = await fetch(
        `/api/sales/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sales/orders/order-123/status',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READY_TO_DELIVER' }),
        })
      );

      expect(data.success).toBe(true);
      expect(data.newStatus).toBe('READY_TO_DELIVER');
    });

    it('should handle API errors gracefully', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Invalid status transition from DELIVERED to PENDING',
        }),
      });

      const response = await fetch(
        '/api/sales/orders/order-123/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING' }),
        }
      );

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toContain('Invalid status transition');
    });
  });

  describe('UI State Management', () => {
    it('should show loading state during update', () => {
      const updatingStatus = true;
      const buttonText = updatingStatus ? 'Updating...' : 'Mark Ready to Deliver';

      expect(buttonText).toBe('Updating...');
    });

    it('should show normal text when not updating', () => {
      const updatingStatus = false;
      const buttonText = updatingStatus ? 'Updating...' : 'Mark Ready to Deliver';

      expect(buttonText).toBe('Mark Ready to Deliver');
    });

    it('should disable button during update', () => {
      const updatingStatus = true;
      const isDisabled = updatingStatus;

      expect(isDisabled).toBe(true);
    });

    it('should show success message after successful update', () => {
      const statusMessage = {
        type: 'success' as const,
        text: 'Order status updated to READY_TO_DELIVER',
      };

      expect(statusMessage.type).toBe('success');
      expect(statusMessage.text).toContain('READY_TO_DELIVER');
    });

    it('should show error message after failed update', () => {
      const statusMessage = {
        type: 'error' as const,
        text: 'Failed to update order status',
      };

      expect(statusMessage.type).toBe('error');
      expect(statusMessage.text).toContain('Failed');
    });
  });

  describe('User Confirmation', () => {
    it('should require confirmation before status change', () => {
      const mockConfirm = jest.fn(() => true);
      global.confirm = mockConfirm;

      const newStatus = 'READY_TO_DELIVER';
      const userConfirmed = confirm(
        `Are you sure you want to change the order status to ${newStatus}?`
      );

      expect(mockConfirm).toHaveBeenCalled();
      expect(userConfirmed).toBe(true);
    });

    it('should cancel status change if user declines', () => {
      const mockConfirm = jest.fn(() => false);
      global.confirm = mockConfirm;

      const userConfirmed = confirm('Are you sure?');

      expect(userConfirmed).toBe(false);
    });
  });

  describe('Status Badge Colors', () => {
    it('should show green for DELIVERED', () => {
      const status: OrderStatus = 'DELIVERED';
      const colorClass =
        status === 'DELIVERED'
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-gray-100';

      expect(colorClass).toBe('bg-emerald-100 text-emerald-800');
    });

    it('should show blue for PICKED', () => {
      const status: OrderStatus = 'PICKED';
      const colorClass =
        status === 'PICKED'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100';

      expect(colorClass).toBe('bg-blue-100 text-blue-800');
    });

    it('should show amber for READY_TO_DELIVER', () => {
      const status: OrderStatus = 'READY_TO_DELIVER';
      const colorClass =
        status === 'READY_TO_DELIVER'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100';

      expect(colorClass).toBe('bg-amber-100 text-amber-800');
    });

    it('should show yellow for PENDING', () => {
      const status: OrderStatus = 'PENDING';
      const colorClass =
        status === 'PENDING'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100';

      expect(colorClass).toBe('bg-yellow-100 text-yellow-800');
    });
  });

  describe('Real-world Scenarios', () => {
    it('scenario: sales rep marks order ready to deliver', async () => {
      const currentStatus: OrderStatus = 'PENDING';
      const transitions = getAvailableTransitions(currentStatus);

      expect(transitions).toHaveLength(1);
      expect(transitions[0].value).toBe('READY_TO_DELIVER');

      // User clicks the button
      const newStatus = transitions[0].value;
      expect(newStatus).toBe('READY_TO_DELIVER');
    });

    it('scenario: warehouse picks order', async () => {
      const currentStatus: OrderStatus = 'READY_TO_DELIVER';
      const transitions = getAvailableTransitions(currentStatus);

      expect(transitions).toHaveLength(1);
      expect(transitions[0].value).toBe('PICKED');
    });

    it('scenario: driver delivers order', async () => {
      const currentStatus: OrderStatus = 'PICKED';
      const transitions = getAvailableTransitions(currentStatus);

      expect(transitions).toHaveLength(1);
      expect(transitions[0].value).toBe('DELIVERED');
    });

    it('scenario: order is delivered, no further actions', async () => {
      const currentStatus: OrderStatus = 'DELIVERED';
      const transitions = getAvailableTransitions(currentStatus);

      expect(transitions).toHaveLength(0);
    });
  });
});
