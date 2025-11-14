/**
 * ProductsSection - Order line items table with quantity/usage editing
 */

'use client';

import { ButtonWithLoading } from '@/components/ui/button-variants';
import { ORDER_USAGE_OPTIONS, ORDER_USAGE_LABELS, type OrderUsageCode } from '@/constants/orderUsage';
import { describePriceListForDisplay, type PriceListSummary, type PricingSelection } from '@/components/orders/pricing-utils';
import type { PriceOverride } from '@/components/orders/ProductGrid';

// Local OrderItem type (matches parent page.tsx)
type InventoryStatus = {
  onHand: number;
  allocated: number;
  available: number;
  sufficient: boolean;
  warningLevel: 'none' | 'low' | 'critical';
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
  inventoryStatus: InventoryStatus | null;
  pricing: PricingSelection;
  priceLists: PriceListSummary[];
  priceOverride?: PriceOverride;
  usageType: OrderUsageCode | null;
};

type ProductsSectionProps = {
  orderItems: OrderItem[];
  canOpenProductSelector: boolean;
  fieldErrors: Record<string, string>;
  onAddProductsClick: () => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onUsageSelect: (index: number, usageType: OrderUsageCode) => void;
  onRemoveItem: (index: number) => void;
};

export function ProductsSection({
  orderItems,
  canOpenProductSelector,
  fieldErrors,
  onAddProductsClick,
  onQuantityChange,
  onUsageSelect,
  onRemoveItem,
}: ProductsSectionProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Products</h2>
        <ButtonWithLoading
          type="button"
          onClick={onAddProductsClick}
          disabled={!canOpenProductSelector}
          variant="primary"
        >
          Add Products{orderItems.length > 0 && ` (${orderItems.length})`}
        </ButtonWithLoading>
      </div>

      {/* Empty State */}
      {orderItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600">
            No products added yet. Use the Add Products button to start building the order.
          </p>
        </div>
      ) : (
        /* Order Items Table */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Usage <span className="font-normal lowercase text-gray-400">(optional)</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Total
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orderItems.map((item, index) => (
                <tr key={item.skuId} className="hover:bg-gray-50">
                  {/* Product Info */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    <div className="text-xs text-gray-500">
                      {item.skuCode} {item.size && `• ${item.size}`}
                    </div>
                    {item.brand && <div className="text-xs text-gray-500">{item.brand}</div>}
                    <div
                      className={`text-xs ${
                        item.priceOverride
                          ? 'text-blue-700'
                          : item.pricing.priceList
                          ? item.pricing.overrideApplied
                            ? 'text-amber-700'
                            : 'text-gray-500'
                          : 'text-rose-700'
                      }`}
                    >
                      {item.priceOverride ? (
                        <>
                          Manual Price Override
                          <div className="text-xs text-gray-600 mt-0.5">{item.priceOverride.reason}</div>
                        </>
                      ) : item.pricing.priceList ? (
                        <>
                          {describePriceListForDisplay(item.pricing.priceList)}
                          {item.pricing.overrideApplied && item.pricing.priceList ? ' • manual review' : ''}
                        </>
                      ) : (
                        'No price list match'
                      )}
                    </div>
                    {item.inventoryStatus ? (
                      <div className="mt-2 text-xs text-gray-500">
                        <div
                          className={`font-medium ${
                            item.inventoryStatus.sufficient ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {item.inventoryStatus.available} available
                        </div>
                        <div>
                          {item.inventoryStatus.onHand} on hand • {item.inventoryStatus.allocated} allocated
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-400">Inventory info unavailable</div>
                    )}
                  </td>

                  {/* Usage Type */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        {ORDER_USAGE_OPTIONS.map((option) => {
                          const isActive = item.usageType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => onUsageSelect(index, option.value)}
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                isActive
                                  ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                                  : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400 hover:bg-gray-200'
                              }`}
                              title={option.helper}
                              aria-pressed={isActive}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.usageType ? ORDER_USAGE_LABELS[item.usageType] : 'Leave blank for standard sales'}
                      </span>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => {
                        const parsedQty = parseInt(e.target.value, 10);
                        const safeQty = Number.isNaN(parsedQty) ? 0 : Math.max(parsedQty, 0);
                        onQuantityChange(index, safeQty);
                      }}
                      min="0"
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-gray-500 focus:outline-none"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="px-4 py-3 text-right">
                    {item.priceOverride ? (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-700">
                          ${item.unitPrice.toFixed(2)}
                        </div>
                        <div className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 mt-1">
                          Override Applied
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-900">${item.unitPrice.toFixed(2)}</div>
                    )}
                  </td>

                  {/* Line Total */}
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    ${item.lineTotal.toFixed(2)}
                  </td>

                  {/* Remove Button */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="text-xs font-semibold text-rose-600 transition hover:text-rose-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
