'use client';

/**
 * Order Preview Modal - SPRINT 3 POLISH
 *
 * Shows complete order summary before submission
 * - Customer details
 * - Delivery information
 * - All products with pricing
 * - Total breakdown
 * - Status selection (Pending/Ready)
 * - Approval requirements
 */

import React from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { ORDER_USAGE_LABELS, type OrderUsageCode } from '@/constants/orderUsage';

type Customer = {
  id: string;
  name: string;
  territory: string | null;
  accountNumber: string | null;
  requiresPO: boolean;
};

type OrderItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inventoryStatus: {
    onHand: number;
    allocated: number;
    available: number;
    sufficient: boolean;
  } | null;
  pricing: {
    priceList: unknown;
    overrideApplied: boolean;
  };
  usageType?: OrderUsageCode | null;
};

type Props = {
  isOpen: boolean;
  customer: Customer;
  deliveryDate: string;
  warehouseLocation: string;
  deliveryTimeWindow: string;
  poNumber: string;
  specialInstructions: string;
  items: OrderItem[];
  total: number;
  requiresApproval: boolean;
  onConfirm: (selectedStatus: 'PENDING' | 'READY') => void;
  onCancel: () => void;
  submitting?: boolean;
  salesRepName?: string | null;
};

export function OrderPreviewModal({
  isOpen,
  customer,
  deliveryDate,
  warehouseLocation,
  deliveryTimeWindow,
  poNumber,
  specialInstructions,
  items,
  total,
  requiresApproval,
  onConfirm,
  onCancel,
  submitting = false,
  salesRepName,
}: Props) {
  const [selectedStatus, setSelectedStatus] = React.useState<'PENDING' | 'READY'>(
    requiresApproval ? 'PENDING' : 'READY'
  );

  if (!isOpen) return null;

  const inventoryIssues = items.filter(item => item.inventoryStatus && !item.inventoryStatus.sufficient);
  const priceOverrides = items.filter(item => item.pricing.overrideApplied);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Order Before Submitting</h2>
            <p className="text-sm text-gray-600">Please verify all details are correct</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Information */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">{customer.name}</p>
              {customer.territory && (
                <p className="text-gray-700">Territory: {customer.territory}</p>
              )}
              {salesRepName && (
                <p className="text-gray-700">Salesperson: {salesRepName}</p>
              )}
              {customer.accountNumber && (
                <p className="text-gray-700">Account: {customer.accountNumber}</p>
              )}
              {customer.requiresPO && (
                <p className="mt-2 inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                  ⚠ PO Required
                </p>
              )}
            </div>
          </section>

          {/* Delivery Information */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Delivery Information</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(deliveryDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Warehouse:</span>
                <span className="font-medium text-gray-900">{warehouseLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Window:</span>
                <span className="font-medium text-gray-900">{deliveryTimeWindow || 'Anytime'}</span>
              </div>
              {poNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">PO Number:</span>
                  <span className="font-medium text-gray-900">{poNumber}</span>
                </div>
              )}
              {specialInstructions && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <span className="text-gray-600">Special Instructions:</span>
                  <p className="mt-1 text-gray-900">{specialInstructions}</p>
                </div>
              )}
            </div>
          </section>

          {/* Order Items */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items ({items.length})</h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map(item => (
                    <tr key={item.skuId}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.skuCode} {item.size && `• ${item.size}`}
                        </div>
                        <div className="mt-1">
                          {item.usageType ? (
                            <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                              {ORDER_USAGE_LABELS[item.usageType]}
                            </span>
                          ) : (
                            <span className="text-xs italic text-gray-400">Standard sale</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">${item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Order Total */}
          <section>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-500">Calculated at invoice</span>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900">Order Total:</span>
                    <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Order Status Selection */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Status</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="orderStatus"
                  value="PENDING"
                  checked={selectedStatus === 'PENDING'}
                  onChange={() => setSelectedStatus('PENDING')}
                  className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Save as Pending</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Save order for later review. Customer will not be notified yet.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="orderStatus"
                  value="READY"
                  checked={selectedStatus === 'READY'}
                  onChange={() => setSelectedStatus('READY')}
                  className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Mark as Ready</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Order is complete and ready for processing/fulfillment.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Warnings */}
          {(requiresApproval || inventoryIssues.length > 0 || priceOverrides.length > 0) && (
            <section>
              {requiresApproval && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Manager Approval May Be Required</p>
                      <p className="mt-1 text-sm text-amber-700">
                        Note: Orders marked as Ready may still require approval based on your settings.
                      </p>
                      {inventoryIssues.length > 0 && (
                        <p className="mt-2 text-xs text-amber-800">
                          • {inventoryIssues.length} item(s) with insufficient inventory
                        </p>
                      )}
                      {priceOverrides.length > 0 && (
                        <p className="mt-1 text-xs text-amber-800">
                          • {priceOverrides.length} item(s) with manual pricing
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!requiresApproval && selectedStatus === 'READY' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Ready for Processing</p>
                      <p className="mt-1 text-sm text-emerald-700">
                        This order has sufficient inventory and will be marked as ready for fulfillment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Go Back
          </button>
          <button
            onClick={() => onConfirm(selectedStatus)}
            disabled={submitting}
            className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating Order...' : selectedStatus === 'READY' ? 'Confirm & Create Order' : 'Save as Pending'}
          </button>
        </div>
      </div>
    </div>
  );
}
