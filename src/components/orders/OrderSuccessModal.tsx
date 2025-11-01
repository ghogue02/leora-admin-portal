'use client';

/**
 * Order Success Modal
 *
 * Fixes frontend agent's Issue #15: No progress indication after submit
 *
 * Shows clear confirmation with order number and next steps
 */

import Link from 'next/link';

type Props = {
  isOpen: boolean;
  orderId: string;
  orderNumber: string;
  total: number;
  requiresApproval: boolean;
  customerName: string;
  deliveryDate: string | null;
  onClose: () => void;
  onCreateAnother: () => void;
};

export function OrderSuccessModal({
  isOpen,
  orderId,
  orderNumber,
  total,
  requiresApproval,
  customerName,
  deliveryDate,
  onClose,
  onCreateAnother,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="mt-4 text-xl font-bold text-gray-900">
            Order Created Successfully!
          </h3>

          {/* Order Details */}
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <div className="text-sm text-gray-600">Order Number</div>
            <div className="mt-1 font-mono text-2xl font-bold text-gray-900">
              #{orderNumber}
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900">{customerName}</span>
              </div>
              {deliveryDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(deliveryDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold text-gray-900">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Approval Notice */}
          {requiresApproval ? (
            <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-left">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-amber-900">Manager Approval Required</div>
                  <div className="mt-1 text-xs text-amber-700">
                    This order has insufficient inventory or pricing overrides. It's been submitted to your manager for review.
                    <strong className="block mt-1">Expected approval time: 2-4 hours</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-left">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-emerald-900">Order is Pending</div>
                  <div className="mt-1 text-xs text-emerald-700">
                    Inventory has been allocated. You can mark this order as "Ready to Deliver" when ready for operations.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/sales/orders/${orderId}`}
              className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 text-center"
              onClick={onClose}
            >
              View Order Details
            </Link>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateAnother();
              }}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Create Another Order
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 transition hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
