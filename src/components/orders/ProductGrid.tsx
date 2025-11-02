'use client';

/**
 * Product Grid Component for Order Creation
 *
 * Features matching Travis's HAL requirements:
 * - Product search and filtering
 * - Real-time inventory status (uses InventoryStatusBadge)
 * - Volume discount messaging
 * - Quantity input with validation
 * - Add to order functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { resolvePriceForQuantity, CustomerPricingContext, PricingSelection, describePriceListForDisplay } from './pricing-utils';

type Product = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  unitOfMeasure: string | null;
  pricePerUnit: number;
  priceLists: Array<{
    priceListId: string;
    priceListName: string;
    price: number;
    currency: string;
    minQuantity: number;
    maxQuantity: number | null;
    jurisdictionType: string;
    jurisdictionValue: string | null;
    allowManualOverride: boolean;
  }>;
};


type InventoryStatus = {
  skuId: string;
  onHand: number;
  allocated: number;
  available: number;
  requested: number;
  sufficient: boolean;
  warningLevel: 'none' | 'low' | 'critical';
  shortfall: number;
};

type Props = {
  warehouseLocation: string;
  onAddProduct: (
    product: Product,
    quantity: number,
    inventoryStatus: InventoryStatus | undefined,
    pricing: PricingSelection,
  ) => void;
  existingSkuIds?: string[];
  customer?: CustomerPricingContext | null;
};

export function ProductGrid({ warehouseLocation, onAddProduct, existingSkuIds = [], customer }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quantityBySku, setQuantityBySku] = useState<Record<string, number>>({});
  const [inventoryStatuses, setInventoryStatuses] = useState<Map<string, InventoryStatus>>(new Map());
  const [checkingInventory, setCheckingInventory] = useState(false);

  // Load products
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/sales/catalog');
        if (!response.ok) throw new Error('Failed to load products');
        const data = await response.json();
        setProducts(data.items || []);

        // Initialize quantities with minimum from price lists
        const initialQty: Record<string, number> = {};
        (data.items || []).forEach((product: Product) => {
          const minQty = product.priceLists[0]?.minQuantity || 1;
          initialQty[product.skuId] = minQty;
        });
        setQuantityBySku(initialQty);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    void loadProducts();
  }, []);

  // Check inventory for visible products
  const checkInventoryForProducts = useCallback(async (productSkus: string[]) => {
    if (!warehouseLocation || productSkus.length === 0) return;

    setCheckingInventory(true);
    try {
      const items = productSkus.map(skuId => ({
        skuId,
        quantity: quantityBySku[skuId] || 1,
      }));

      const response = await fetch('/api/inventory/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          warehouseLocation,
        }),
      });

      if (!response.ok) throw new Error('Failed to check inventory');

      const data = await response.json();
      const statusMap = new Map<string, InventoryStatus>();
      data.results.forEach((result: InventoryStatus) => {
        statusMap.set(result.skuId, result);
      });
      setInventoryStatuses(statusMap);
    } catch (err) {
      console.error('Inventory check failed:', err);
    } finally {
      setCheckingInventory(false);
    }
  }, [warehouseLocation, quantityBySku]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    return products.filter(product => {
      // Exclude already added products
      if (existingSkuIds.includes(product.skuId)) return false;

      // Search filter
      if (searchLower) {
        const searchableText = [
          product.productName,
          product.skuCode,
          product.brand,
          product.category,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && product.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [products, search, categoryFilter, existingSkuIds]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Check inventory when warehouse or filtered products change
  useEffect(() => {
    const visibleSkus = filteredProducts.slice(0, 20).map(p => p.skuId);
    if (visibleSkus.length > 0) {
      void checkInventoryForProducts(visibleSkus);
    }
  }, [warehouseLocation, filteredProducts, checkInventoryForProducts]);

  const handleAddProduct = useCallback((product: Product) => {
    const quantity = quantityBySku[product.skuId] || 1;
    const inventoryStatus = inventoryStatuses.get(product.skuId);
    const pricing = resolvePriceForQuantity(product.priceLists, quantity, customer);

    if (!inventoryStatus) {
      // Re-check inventory for this specific product
      void checkInventoryForProducts([product.skuId]).then(() => {
        const freshStatus = inventoryStatuses.get(product.skuId);
        if (freshStatus) {
          onAddProduct(product, quantity, freshStatus, pricing);
        }
      });
      return;
    }

    onAddProduct(product, quantity, inventoryStatus, pricing);
  }, [quantityBySku, inventoryStatuses, onAddProduct, checkInventoryForProducts, customer]);

  // Calculate best price for quantity
  const resolvePricingSelection = useCallback(
    (product: Product, quantity: number) =>
      resolvePriceForQuantity(product.priceLists, quantity, customer),
    [customer],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <p className="font-semibold text-rose-900">Error loading products</p>
        <p className="mt-1 text-sm text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, SKU, brand, or category..."
            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <span className="text-xs text-gray-500">
            {filteredProducts.length} products
          </span>
        </div>
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600">
            {search || categoryFilter !== 'all'
              ? 'No products match your filters'
              : 'No products available'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Inventory
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Total
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.slice(0, 50).map(product => {
                const quantity = quantityBySku[product.skuId] || 1;
                const pricing = resolvePricingSelection(product, quantity);
                const inventoryStatus = inventoryStatuses.get(product.skuId);
                const unitPrice = pricing.unitPrice || product.pricePerUnit || 0;
                const lineTotal = quantity * unitPrice;
                const priceListLabel = pricing.priceList
                  ? describePriceListForDisplay(pricing.priceList)
                  : "No matching price list";
                const priceMessageClass = pricing.priceList
                  ? pricing.overrideApplied
                    ? "text-amber-700"
                    : "text-gray-500"
                  : "text-rose-700";
                const canAdd = Boolean(pricing.priceList);

                return (
                  <tr key={product.skuId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                      <div className="text-xs text-gray-500">
                        {product.skuCode}
                        {product.size && ` • ${product.size}`}
                        {product.brand && ` • ${product.brand}`}
                      </div>
                      <div className={`mt-1 text-xs ${priceMessageClass}`}>
                        {priceListLabel}
                        {pricing.overrideApplied && pricing.priceList ? " • manual review" : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <InventoryStatusBadge
                        status={inventoryStatus ? {
                          ...inventoryStatus,
                          requested: quantity,
                        } : null}
                        loading={checkingInventory}
                        compact={true}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setQuantityBySku(prev => ({
                            ...prev,
                            [product.skuId]: Math.max(1, newQty),
                          }));
                        }}
                        min="1"
                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-gray-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {pricing.priceList ? `$${unitPrice.toFixed(2)}` : <span className="text-xs text-rose-700">No price</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {pricing.priceList ? `$${lineTotal.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        disabled={!warehouseLocation || !canAdd}
                        className="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredProducts.length > 50 && (
        <p className="text-xs text-gray-500 text-center">
          Showing first 50 products. Use search to narrow results.
        </p>
      )}
    </div>
  );
}
