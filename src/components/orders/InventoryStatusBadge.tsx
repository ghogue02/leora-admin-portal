'use client';

/**
 * Inventory Status Badge Component - ENHANCED
 *
 * Fixes frontend agent's Issue #3: Inventory display is cryptic
 *
 * Changes from "0/36" to clear format:
 * - "Available: 0 of 36 on hand"
 * - Detailed tooltip with breakdown
 * - Shortfall calculation when insufficient
 * - Color-coded: Green (>20), Yellow (5-20), Red (1-4), Black (0)
 * - Clear labels and explanations
 */

import { useState } from 'react';

type InventoryStatus = {
  onHand: number;
  allocated: number;
  available: number;
  requested: number;
  sufficient: boolean;
  warningLevel: 'none' | 'low' | 'critical';
  shortfall?: number;
};

type Props = {
  status: InventoryStatus | null;
  loading?: boolean;
  compact?: boolean;
};

export function InventoryStatusBadge({ status, loading = false, compact = false }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
        <div className="h-2 w-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <span className="text-gray-500">Checking...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500">
        <span>—</span>
      </div>
    );
  }

  // Determine badge color - More granular than before
  let badgeClasses = '';
  let iconColor = '';

  if (status.available === 0) {
    badgeClasses = 'bg-gray-900 border-gray-900 text-white';
    iconColor = 'bg-white';
  } else if (status.available < 5) {
    badgeClasses = 'bg-rose-50 border-rose-200 text-rose-700';
    iconColor = 'bg-rose-500';
  } else if (status.available < 20) {
    badgeClasses = 'bg-amber-50 border-amber-200 text-amber-700';
    iconColor = 'bg-amber-500';
  } else {
    badgeClasses = 'bg-emerald-50 border-emerald-200 text-emerald-700';
    iconColor = 'bg-emerald-500';
  }

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${badgeClasses} ${
          compact ? '' : 'hover:shadow-sm cursor-help'
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Status indicator dot */}
        <div className={`h-2 w-2 rounded-full ${iconColor}`} />

        {/* Compact view: Clear format */}
        {compact && (
          <span>
            {status.available > 0 ? `${status.available} available` : 'Out of stock'}
          </span>
        )}

        {/* Full view: Detailed format */}
        {!compact && (
          <div className="flex items-center gap-2">
            <span>
              Available: <strong>{status.available}</strong> of <strong>{status.onHand}</strong> on hand
            </span>
            {!status.sufficient && status.shortfall && (
              <>
                <span className="text-gray-400">|</span>
                <span className="font-semibold">
                  ⚠ Short by {status.shortfall}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-xs font-semibold text-gray-900 mb-2">Inventory Details</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Total On-Hand:</span>
              <span className="font-medium text-gray-900">{status.onHand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Allocated (Pending):</span>
              <span className="font-medium text-amber-700">{status.allocated}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5">
              <span className="font-medium text-gray-700">Available:</span>
              <span className="font-semibold text-emerald-700">{status.available}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Requested:</span>
              <span className="font-medium text-gray-900">{status.requested}</span>
            </div>

            {!status.sufficient && (
              <div className="mt-2 rounded-md bg-rose-50 border border-rose-200 p-2">
                <div className="text-rose-700 font-medium">
                  ⚠ Shortfall: {status.shortfall} units
                </div>
                <div className="text-rose-600 mt-0.5">
                  Requires manager approval
                </div>
              </div>
            )}

            {status.sufficient && status.warningLevel === 'low' && (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2">
                <div className="text-amber-700 font-medium">⚠ Low Stock Warning</div>
                <div className="text-amber-600 mt-0.5">
                  Less than 10 units above requested
                </div>
              </div>
            )}

            {status.sufficient && status.warningLevel === 'none' && (
              <div className="mt-2 rounded-md bg-emerald-50 border border-emerald-200 p-2">
                <div className="text-emerald-700 font-medium">✓ Stock Available</div>
              </div>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2">
            <div className="border-4 border-transparent border-t-white" />
            <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-200" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple text-only inventory display for tables/lists
 */
export function InventoryStatusText({ status }: { status: InventoryStatus | null }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>;

  const colorClass = {
    none: 'text-emerald-700',
    low: 'text-amber-700',
    critical: 'text-rose-700',
  }[status.warningLevel];

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {status.available} / {status.onHand}
    </span>
  );
}
