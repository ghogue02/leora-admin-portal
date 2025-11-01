/**
 * Order Submit Hook
 *
 * Handles order submission with loading states, success toasts, and error handling
 * Improves UX for order creation
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type OrderData = {
  customerId: string;
  deliveryDate: string;
  warehouseLocation: string;
  deliveryTimeWindow?: string;
  poNumber?: string;
  specialInstructions?: string;
  items: Array<{
    skuId: string;
    quantity: number;
  }>;
};

type SubmitResult = {
  success: boolean;
  orderId?: string;
  error?: string;
  requiresApproval?: boolean;
};

export function useOrderSubmit() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOrder = useCallback(
    async (orderData: OrderData, onSuccess?: (orderId: string, requiresApproval: boolean) => void): Promise<SubmitResult> => {
      setSubmitting(true);
      setError(null);

      try {
        const response = await fetch('/api/sales/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create order');
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result.orderId, result.requiresApproval);
        }

        return {
          success: true,
          orderId: result.orderId,
          requiresApproval: result.requiresApproval,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
        setError(errorMessage);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return {
    submitOrder,
    submitting,
    error,
    setError,
  };
}
