'use client';

/**
 * Price Override Dialog Component
 *
 * Modal dialog for managers/admins to manually override product prices
 * Features:
 * - Shows current price for comparison
 * - Validates new price (must be > 0)
 * - Requires reason for audit trail
 * - Clear visual indicators
 */

import { useState, useEffect } from 'react';

type Props = {
  isOpen: boolean;
  productName: string;
  skuCode: string;
  currentPrice: number;
  currentQuantity: number;
  onConfirm: (newPrice: number, reason: string) => void;
  onCancel: () => void;
};

export function PriceOverrideDialog({
  isOpen,
  productName,
  skuCode,
  currentPrice,
  currentQuantity,
  onConfirm,
  onCancel,
}: Props) {
  const [newPrice, setNewPrice] = useState<string>(currentPrice.toFixed(2));
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setNewPrice(currentPrice.toFixed(2));
      setReason('');
      setError('');
    }
  }, [isOpen, currentPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const priceValue = parseFloat(newPrice);

    // Validation
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Price must be greater than $0.00');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the price override');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    // Confirm large price changes
    const percentChange = Math.abs((priceValue - currentPrice) / currentPrice) * 100;
    if (percentChange > 50) {
      const confirmed = window.confirm(
        `This is a ${percentChange.toFixed(0)}% price change. Are you sure you want to continue?`
      );
      if (!confirmed) return;
    }

    onConfirm(priceValue, reason.trim());
  };

  if (!isOpen) return null;

  const priceValue = parseFloat(newPrice) || 0;
  const priceDifference = priceValue - currentPrice;
  const percentChange = currentPrice > 0
    ? ((priceValue - currentPrice) / currentPrice) * 100
    : 0;
  const newLineTotal = priceValue * currentQuantity;
  const oldLineTotal = currentPrice * currentQuantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Override Price
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{productName}</p>
            <p className="text-xs text-gray-500 mt-1">SKU: {skuCode}</p>
            <p className="text-xs text-gray-500">Quantity: {currentQuantity}</p>
          </div>

          {/* Current Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Price
            </label>
            <div className="text-2xl font-bold text-gray-900">
              ${currentPrice.toFixed(2)}
              <span className="text-sm font-normal text-gray-500 ml-2">
                per unit
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current line total: ${oldLineTotal.toFixed(2)}
            </p>
          </div>

          {/* New Price Input */}
          <div>
            <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700 mb-1">
              New Price <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                id="newPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={newPrice}
                onChange={(e) => {
                  setNewPrice(e.target.value);
                  setError('');
                }}
                className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="0.00"
                autoFocus
                required
              />
            </div>

            {/* Price Change Indicator */}
            {priceValue > 0 && priceValue !== currentPrice && (
              <div className={`mt-2 text-sm font-medium ${
                priceDifference > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {priceDifference > 0 ? '↑' : '↓'} ${Math.abs(priceDifference).toFixed(2)}
                ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                <span className="block text-xs text-gray-600 mt-1">
                  New line total: ${newLineTotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Override <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder="E.g., Customer loyalty discount, bulk order pricing, promotional offer..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
              minLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters. This will be recorded in the audit trail.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-sm font-medium text-rose-900">{error}</p>
            </div>
          )}

          {/* Warning for Large Changes */}
          {percentChange > 20 && priceValue > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-900">
                ⚠ Large price change detected ({percentChange.toFixed(0)}%)
              </p>
              <p className="text-xs text-amber-700 mt-1">
                This override will require manager approval before the order can be processed.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Apply Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
