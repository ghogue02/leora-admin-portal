'use client';

/**
 * Volume Discount Indicator Component
 *
 * Shows real-time discount messaging as the user adds products to an order.
 * Features:
 * - Calculates current bottle total across all items
 * - Shows "Add X more bottles for discount" message
 * - Highlights when 36-bottle tier is reached
 * - Displays estimated savings amount
 *
 * Tier structure (example - adjust based on actual pricing):
 * - 1-35 bottles: Standard pricing
 * - 36+ bottles: Volume discount applies
 */

import { useMemo } from 'react';

type OrderItem = {
  quantity: number;
  skuCode?: string;
  productName?: string;
};

type Props = {
  items: OrderItem[];
  className?: string;
};

// Volume discount tiers (bottles)
const DISCOUNT_TIER = 36;
const DISCOUNT_PERCENTAGE = 0.10; // 10% discount at tier

export function DiscountIndicator({ items, className = '' }: Props) {
  // Calculate total bottles across all items
  const totalBottles = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  // Calculate bottles needed for next tier
  const bottlesNeeded = useMemo(() => {
    if (totalBottles >= DISCOUNT_TIER) return 0;
    return DISCOUNT_TIER - totalBottles;
  }, [totalBottles]);

  // Calculate estimated savings (simplified - would use actual pricing in production)
  const estimatedSavings = useMemo(() => {
    if (totalBottles < DISCOUNT_TIER) return 0;
    // Estimate $20/bottle average * 10% discount
    const avgPricePerBottle = 20;
    return totalBottles * avgPricePerBottle * DISCOUNT_PERCENTAGE;
  }, [totalBottles]);

  // Don't show if no items
  if (items.length === 0) {
    return null;
  }

  // Tier reached - show success message
  if (totalBottles >= DISCOUNT_TIER) {
    return (
      <div className={`rounded-lg border-2 border-emerald-500 bg-emerald-50 p-3 ${className}`}>
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 text-emerald-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-emerald-900">
              Volume Discount Applied!
            </div>
            <div className="mt-1 text-xs text-emerald-700">
              {totalBottles} bottles • Estimated savings: ${estimatedSavings.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show progress toward tier
  const progress = (totalBottles / DISCOUNT_TIER) * 100;

  return (
    <div className={`rounded-lg border border-blue-200 bg-blue-50 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 text-blue-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-blue-900">
            Add {bottlesNeeded} more bottle{bottlesNeeded !== 1 ? 's' : ''} for 10% discount
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>{totalBottles} bottles</span>
              <span>{DISCOUNT_TIER} bottles for discount</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
