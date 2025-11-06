'use client';

/**
 * Order Summary Sidebar - ENHANCED
 *
 * Fixes frontend agent's Issue #6: Order summary is incomplete & confusing
 *
 * New features:
 * - Sticky sidebar (always visible while scrolling)
 * - Real-time updates as form changes
 * - Shows delivery date with day name
 * - Shows warehouse location
 * - Line items with remove buttons
 * - Estimated tax calculation
 * - Progress indicator
 * - Clear formatting
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTaxEstimation } from '@/hooks/useTaxEstimation';
import { parseUTCDate } from '@/lib/dates';

type OrderItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Props = {
  customer: { name: string; territory: string | null } | null;
  deliveryDate: string;
  warehouseLocation: string;
  deliveryTimeWindow: string;
  poNumber: string;
  items: OrderItem[];
  onRemoveItem: (skuId: string) => void;
  requiresApproval: boolean;
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
}: Props) {
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [items]);

  // Estimate liters (assuming 0.75L bottles as default)
  // TODO: Get actual bottle sizes from SKU data for more accurate tax calculation
  const estimatedLiters = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * 0.75), 0);
  }, [items]);

  // Use unified tax calculation (matches server-side logic)
  const taxEstimate = useTaxEstimation({
    subtotal,
    liters: estimatedLiters,
    isInState: true, // Assume in-state for UI estimate
  });

  // Calculate progress
  const progress = {
    customer: !!customer,
    delivery: !!deliveryDate && !!warehouseLocation,
    products: items.length > 0,
    complete: !!customer && !!deliveryDate && !!warehouseLocation && items.length > 0,
  };

  const completedSteps = [progress.customer, progress.delivery, progress.products].filter(Boolean).length;

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
              {deliveryDate ? (
                <div>
                  <div className="font-medium">
                    {format(parseUTCDate(deliveryDate), 'EEEE, MMM d, yyyy')}
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

      {/* Totals Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Est. Sales Tax (5.3%)</span>
            <span className="text-gray-600">${taxEstimate.salesTax.toFixed(2)}</span>
          </div>
          {taxEstimate.exciseTax > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Est. Excise Tax (~{estimatedLiters.toFixed(1)}L)</span>
              <span className="text-gray-600">${taxEstimate.exciseTax.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Estimated Total</span>
              <span className="text-lg font-bold text-gray-900">${taxEstimate.total.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Final tax calculated at invoicing
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
