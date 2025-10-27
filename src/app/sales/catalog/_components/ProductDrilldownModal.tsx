'use client';

import { useEffect, useState } from 'react';
import { TastingNotesCard } from './TastingNotesCard';
import { TechnicalDetailsPanel } from './TechnicalDetailsPanel';

type ProductDetails = {
  product: {
    skuId: string;
    skuCode: string;
    productName: string;
    brand: string | null;
    category: string | null;
    size: string | null;
    unitOfMeasure: string | null;
    abv: number | null;
  };
  inventory: {
    totalOnHand: number;
    totalAvailable: number;
    byLocation: Array<{
      location: string;
      onHand: number;
      allocated: number;
      available: number;
    }>;
  };
  pricing: {
    priceLists: Array<{
      priceListName: string;
      price: number;
      currency: string;
      minQuantity: number;
      maxQuantity: number | null;
      effectiveAt: string | null;
      expiresAt: string | null;
    }>;
  };
  sales: {
    totalOrders: number;
    totalUnits: number;
    totalRevenue: number;
    avgOrderSize: number;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      totalUnits: number;
      totalRevenue: number;
      orderCount: number;
    }>;
    monthlyTrend: Array<{
      month: string;
      units: number;
      revenue: number;
      orders: number;
    }>;
  };
  enrichedData?: {
    description: string;
    tastingNotes: {
      aroma: string;
      palate: string;
      finish: string;
    };
    foodPairings: string[];
    servingInfo: {
      temperature: string;
      decanting: string;
      glassware: string;
    };
    wineDetails: {
      region: string;
      grape: string;
      style: string;
      ageability: string;
    };
  };
  insights: string[];
};

type ProductDrilldownModalProps = {
  skuId: string;
  onClose: () => void;
};

export function ProductDrilldownModal({ skuId, onClose }: ProductDrilldownModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'pricing' | 'sales' | 'details' | 'technical'>('inventory');

  useEffect(() => {
    fetchProductDetails();
  }, [skuId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/sales/catalog/${skuId}/details`);

      if (!response.ok) {
        throw new Error('Failed to load product details');
      }

      const details = await response.json();
      setData(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              {loading ? (
                <div className="h-7 w-64 animate-pulse rounded bg-gray-200"></div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {data?.product.productName}
                  </h2>
                  {data?.product.brand && (
                    <p className="mt-1 text-sm text-gray-600">{data.product.brand}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">SKU: {data?.product.skuCode}</p>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-90"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          {!loading && (
            <div className="mt-4 flex gap-1 border-b border-gray-200">
              {[
                { key: 'inventory', label: '📦 Inventory', icon: '📦' },
                { key: 'pricing', label: '💰 Pricing', icon: '💰' },
                { key: 'sales', label: '📈 Sales History', icon: '📈' },
                { key: 'technical', label: '📋 Technical Details', icon: '📋' },
                ...(data?.enrichedData ? [{ key: 'details', label: '🍷 Tasting Notes', icon: '🍷' }] : []),
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Product Info Summary */}
              <div className="mb-6 grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-600">Size</p>
                  <p className="mt-1 font-semibold text-gray-900">{data.product.size ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Unit</p>
                  <p className="mt-1 font-semibold text-gray-900">{data.product.unitOfMeasure ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">ABV</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {data.product.abv ? `${data.product.abv}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Category</p>
                  <p className="mt-1 font-semibold text-gray-900">{data.product.category ?? 'Uncategorized'}</p>
                </div>
              </div>

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-sm text-green-800">Total On Hand</p>
                      <p className="mt-1 text-3xl font-bold text-green-900">{data.inventory.totalOnHand}</p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="text-sm text-blue-800">Available to Sell</p>
                      <p className="mt-1 text-3xl font-bold text-blue-900">{data.inventory.totalAvailable}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Inventory by Location</h3>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600">Location</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-600">On Hand</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-600">Allocated</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-600">Available</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {data.inventory.byLocation.map((loc, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{loc.location}</td>
                              <td className="px-6 py-4 text-right text-sm text-gray-900">{loc.onHand}</td>
                              <td className="px-6 py-4 text-right text-sm text-gray-600">{loc.allocated}</td>
                              <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                                {loc.available}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Price Lists</h3>
                  <div className="space-y-3">
                    {data.pricing.priceLists.map((price, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{price.priceListName}</h4>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                              <span>Min Qty: {price.minQuantity}</span>
                              {price.maxQuantity && <span>Max Qty: {price.maxQuantity}</span>}
                              {price.effectiveAt && (
                                <span>Effective: {new Date(price.effectiveAt).toLocaleDateString()}</span>
                              )}
                              {price.expiresAt && (
                                <span>Expires: {new Date(price.expiresAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: price.currency,
                              }).format(price.price)}
                            </p>
                            <p className="text-xs text-gray-600">per unit</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Details Tab */}
              {activeTab === 'technical' && (
                <div>
                  <TechnicalDetailsPanel
                    details={{
                      abv: data.product.abv ?? undefined,
                      vintage: data.enrichedData?.wineDetails.ageability,
                      region: data.enrichedData?.wineDetails.region,
                      producer: data.enrichedData?.wineDetails.region,
                      grapeVariety: data.enrichedData?.wineDetails.grape,
                      style: data.enrichedData?.wineDetails.style,
                    }}
                  />
                </div>
              )}

              {/* Tasting Notes Tab */}
              {activeTab === 'details' && data.enrichedData && (
                <div className="space-y-6">
                  {/* Description */}
                  {data.enrichedData.description && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Description</h3>
                      <p className="text-sm leading-relaxed text-gray-700">{data.enrichedData.description}</p>
                    </div>
                  )}

                  {/* Tasting Notes */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Tasting Notes</h3>
                    <TastingNotesCard
                      tastingNotes={{
                        aroma: data.enrichedData.tastingNotes.aroma,
                        palate: data.enrichedData.tastingNotes.palate,
                        finish: data.enrichedData.tastingNotes.finish,
                        foodPairings: data.enrichedData.foodPairings,
                      }}
                    />
                  </div>

                  {/* Serving Info */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Serving Information</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-lg">🌡️</span>
                          <h4 className="text-xs font-semibold uppercase text-gray-600">Temperature</h4>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{data.enrichedData.servingInfo.temperature}</p>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-lg">⏱️</span>
                          <h4 className="text-xs font-semibold uppercase text-gray-600">Decanting</h4>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{data.enrichedData.servingInfo.decanting}</p>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-lg">🍷</span>
                          <h4 className="text-xs font-semibold uppercase text-gray-600">Glassware</h4>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{data.enrichedData.servingInfo.glassware}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Tab */}
              {activeTab === 'sales' && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-600">Total Orders</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{data.sales.totalOrders}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-600">Units Sold</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{data.sales.totalUnits}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-600">Total Revenue</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        ${data.sales.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <p className="text-xs text-gray-600">Avg Order Size</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {data.sales.avgOrderSize.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Top Customers */}
                  {data.sales.topCustomers.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Top Customers for This Product</h3>
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600">Customer</th>
                              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-600">Units</th>
                              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-600">Revenue</th>
                              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-600">Orders</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {data.sales.topCustomers.map((customer) => (
                              <tr key={customer.customerId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  {customer.customerName}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-900">
                                  {customer.totalUnits}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-900">
                                  ${customer.totalRevenue.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-900">
                                  {customer.orderCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Monthly Trend */}
                  {data.sales.monthlyTrend.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Sales Trend (Last 6 Months)</h3>
                      <div className="space-y-2">
                        {data.sales.monthlyTrend.map((month) => (
                          <div
                            key={month.month}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                          >
                            <span className="text-sm font-medium text-gray-900">{month.month}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600">{month.units} units</span>
                              <span className="text-gray-600">{month.orders} orders</span>
                              <span className="font-semibold text-gray-900">
                                ${month.revenue.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Insights */}
              {data.insights.length > 0 && (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <span>💡</span>
                    <span>Insights</span>
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    {data.insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-0.5 text-blue-600">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
