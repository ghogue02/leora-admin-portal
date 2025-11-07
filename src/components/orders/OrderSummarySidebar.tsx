'use client';

/**
 * Order Summary Sidebar - ENHANCED with Sprint 1 Features
 *
 * Features:
 * - Sticky sidebar (always visible while scrolling)
 * - Real-time updates as form changes
 * - Shows delivery date with day name
 * - Shows warehouse location
 * - Line items with remove buttons
 * - Progress indicator
 * - Clear formatting
 * - Volume discount messaging (Sprint 2)
 * - Optional delivery & split-case fees (Sprint 1)
 */

import { useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { DiscountIndicator } from './DiscountIndicator';
import { ORDER_USAGE_LABELS, type OrderUsageCode } from '@/constants/orderUsage';

type OrderItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  usageType?: OrderUsageCode | null;
};

type Props = {
  customer: { name: string; territory: string | null; accountType?: string | null } | null;
  deliveryDate: string;
  warehouseLocation: string;
  deliveryTimeWindow: string;
  poNumber: string;
  items: OrderItem[];
  onRemoveItem: (skuId: string) => void;
  requiresApproval: boolean;
  deliveryFee?: number;
  splitCaseFee?: number;
  onDeliveryFeeChange?: (fee: number) => void;
  onSplitCaseFeeChange?: (fee: number) => void;
};

export function OrderSummarySidebar({
  customer,
  deliveryDate,
  warehouseLocation,
  deliveryTimeWindow,
  poNumber,
  items,
  onRemoveItem,
  requiresApproval,
  deliveryFee = 0,
  splitCaseFee = 0,
  onDeliveryFeeChange,
  onSplitCaseFeeChange,
}: Props) {
  const [showDeliveryFee, setShowDeliveryFee] = useState(deliveryFee > 0);
  const [showSplitCaseFee, setShowSplitCaseFee] = useState(splitCaseFee > 0);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [items]);

  const appliedDeliveryFee = showDeliveryFee ? deliveryFee : 0;
  const appliedSplitCaseFee = showSplitCaseFee ? splitCaseFee : 0;
  const estimatedTotal = useMemo(() => {
    return subtotal + appliedDeliveryFee + appliedSplitCaseFee;
  }, [subtotal, appliedDeliveryFee, appliedSplitCaseFee]);

  const isB2B = useMemo(() => {
    if (!customer?.accountType) return false;
    return customer.accountType === 'ACTIVE' || customer.accountType === 'TARGET';
  }, [customer?.accountType]);

  // Calculate progress
  const progress = {
    customer: !!customer,
    delivery: !!deliveryDate && !!warehouseLocation,
    products: items.length > 0,
    complete: !!customer && !!deliveryDate && !!warehouseLocation && items.length > 0,
  };

  const completedSteps = [progress.customer, progress.delivery, progress.products].filter(Boolean).length;

  const parsedDeliveryDate = useMemo(() => {
    if (!deliveryDate) {
      return null;
    }
    const parsed = parse(deliveryDate, 'yyyy-MM-dd', new Date());
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [deliveryDate]);

  const handleDeliveryFeeToggle = () => {
    const newState = !showDeliveryFee;
    setShowDeliveryFee(newState);
    if (!newState && onDeliveryFeeChange) {
      onDeliveryFeeChange(0);
    } else if (newState && deliveryFee === 0 && onDeliveryFeeChange) {
      onDeliveryFeeChange(10); // Default $10 delivery fee
    }
  };

  const handleSplitCaseFeeToggle = () => {
    const newState = !showSplitCaseFee;
    setShowSplitCaseFee(newState);
    if (!newState && onSplitCaseFeeChange) {
      onSplitCaseFeeChange(0);
    } else if (newState && splitCaseFee === 0 && onSplitCaseFeeChange) {
      onSplitCaseFeeChange(5); // Default $5 split-case fee
    }
  };

  return (
    <aside className="sticky top-24 h-fit space-y-4">
      {/* Progress Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Progress</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Steps Completed</span>
            <span className="font-semibold text-gray-900">{completedSteps} of 3</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${(completedSteps / 3) * 100}%` }}
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <StepIndicator label="Customer" complete={progress.customer} />
            <StepIndicator label="Delivery Details" complete={progress.delivery} />
            <StepIndicator label="Products" complete={progress.products} />
          </div>
        </div>
      </div>

      {/* Order Details Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h3>

        <div className="space-y-3 text-sm">
          {/* Customer */}
          <div>
            <div className="text-xs font-medium text-gray-600">Customer</div>
            <div className="mt-0.5 text-gray-900">
              {customer ? (
                <>
                  <div className="font-medium">{customer.name}</div>
                  {customer.territory && (
                    <div className="text-xs text-gray-500">{customer.territory}</div>
                  )}
                  {isB2B && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      B2B Account (Tax-Exempt)
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-400">Not selected</span>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div>
            <div className="text-xs font-medium text-gray-600">Delivery</div>
            <div className="mt-0.5 text-gray-900">
              {parsedDeliveryDate ? (
                <div>
                  <div className="font-medium">
                    {format(parsedDeliveryDate, 'EEEE, MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {deliveryTimeWindow || 'Anytime'}
                  </div>
                </div>
              ) : (
                <span className="text-gray-400">Date not set</span>
              )}
            </div>
          </div>

          {/* Warehouse */}
          <div>
            <div className="text-xs font-medium text-gray-600">Warehouse</div>
            <div className="mt-0.5 text-gray-900">
              {warehouseLocation ? (
                <span className="font-medium">{warehouseLocation}</span>
              ) : (
                <span className="text-gray-400">Not selected</span>
              )}
            </div>
          </div>

          {/* PO Number */}
          {poNumber && (
            <div>
              <div className="text-xs font-medium text-gray-600">PO Number</div>
              <div className="mt-0.5 font-mono text-xs text-gray-900">{poNumber}</div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Items ({items.length})
        </h3>

        {items.length === 0 ? (
          <p className="text-xs text-gray-500">No products added yet</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.skuId}
                className="flex items-start justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 p-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {item.productName}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {item.skuCode} • Qty: {item.quantity}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {item.usageType
                      ? (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                          {ORDER_USAGE_LABELS[item.usageType]}
                        </span>
                      )
                      : <span className="italic text-gray-400">Standard sale</span>
                    }
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-gray-900">
                    ${item.lineTotal.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.skuId)}
                  className="text-xs font-semibold text-rose-600 transition hover:text-rose-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volume Discount Indicator */}
      <DiscountIndicator items={items} />

      {/* Optional Fees Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Optional Fees</h3>

        <div className="space-y-3">
          {/* Delivery Fee */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeliveryFee}
                  onChange={handleDeliveryFeeToggle}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <span className="text-xs font-medium text-gray-700">Delivery Fee</span>
              </label>
            </div>
            {showDeliveryFee && onDeliveryFeeChange && (
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => onDeliveryFeeChange(Number(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder="Enter amount"
              />
            )}
          </div>

          {/* Split-Case Fee */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSplitCaseFee}
                  onChange={handleSplitCaseFeeToggle}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <span className="text-xs font-medium text-gray-700">Split-Case Fee</span>
              </label>
            </div>
            {showSplitCaseFee && onSplitCaseFeeChange && (
              <input
                type="number"
                value={splitCaseFee}
                onChange={(e) => onSplitCaseFeeChange(Number(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder="Enter amount"
              />
            )}
          </div>
        </div>
      </div>

      {/* Totals Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
          </div>

          {/* Show fees if enabled */}
          {showDeliveryFee && deliveryFee > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Delivery Fee</span>
              <span className="text-gray-600">${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {showSplitCaseFee && splitCaseFee > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Split-Case Fee</span>
              <span className="text-gray-600">${splitCaseFee.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Estimated Total</span>
              <span className="text-lg font-bold text-gray-900">${estimatedTotal.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Delivery and split-case fees are included in this estimate.
            </p>
          </div>
        </div>

        {requiresApproval && (
          <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-2">
            <div className="text-xs font-semibold text-amber-900">⚠ Approval Required</div>
            <div className="mt-1 text-xs text-amber-700">
              Low inventory - needs manager review
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function StepIndicator({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
          complete ? 'bg-emerald-600 text-white' : 'border-2 border-gray-300 text-gray-400'
        }`}
      >
        {complete ? '✓' : ''}
      </div>
      <span className={`text-xs ${complete ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
