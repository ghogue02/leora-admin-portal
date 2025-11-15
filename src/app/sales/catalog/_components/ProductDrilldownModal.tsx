"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Wine } from "lucide-react";

import { ProductEditForm } from "./ProductEditForm";

type ProductDetails = {
  product: {
    skuId: string;
    skuCode: string;
    productName: string;
    brand: string | null;
    category: string | null;
    description?: string | null;
    size: string | null;
    unitOfMeasure: string | null;
    abv: number | null;
    vintage: number | null;
    colour: string | null;
    varieties: string | null;
    style: string | null;
    manufacturer: string | null;
    itemsPerCase: number | null;
    bottleBarcode: string | null;
    caseBarcode: string | null;
    abcCode?: string | null;
    mocoNumber?: string | null;
    liters?: number | null;
    batchNumber?: string | null;
    barrelOrTank?: string | null;
    isArchived?: boolean;
  };
  images?: {
    packshot?: string;
    frontLabel?: string;
    backLabel?: string;
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

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

  const handleArchive = async () => {
    if (!data) return;

    const confirmMessage = data.product.isArchived
      ? 'Are you sure you want to unarchive this product? It will become visible in the catalog again.'
      : 'Are you sure you want to archive this product? It will be hidden from the catalog.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsArchiving(true);
      const response = await fetch(`/api/sales/catalog/${skuId}?action=archive`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to archive product');
      }

      const result = await response.json();

      // Success - close modal and let parent refresh
      alert(result.message || 'Product archive status updated');
      onClose();

      // Parent component should refresh catalog
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive product');
    } finally {
      setIsArchiving(false);
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
            <div className="flex gap-2">
              {!loading && !isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  ✏️ Edit Product
                </button>
              )}
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
          </div>
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

          {!loading && !error && data && isEditMode && (
            <ProductEditForm
              skuId={skuId}
              productData={{
                name: data.product.productName,
                brand: data.product.brand,
                category: data.product.category,
                description: data.product.description || null,
                vintage: data.product.vintage,
                colour: data.product.colour,
                varieties: data.product.varieties,
                style: data.product.style,
                manufacturer: data.product.manufacturer,
              }}
              skuData={{
                size: data.product.size,
                unitOfMeasure: data.product.unitOfMeasure,
                abv: data.product.abv,
                itemsPerCase: data.product.itemsPerCase,
                bottleBarcode: data.product.bottleBarcode,
                caseBarcode: data.product.caseBarcode,
              }}
              onSave={() => {
                setIsEditMode(false);
                fetchProductDetails(); // Reload data
              }}
              onCancel={() => setIsEditMode(false)}
            />
          )}

          {!loading && !error && data && !isEditMode && (
            <div className="space-y-6">
              {/* Product Images */}
              {data.images && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Product Images</h3>
                  <div className="flex gap-3">
                    {data.images.packshot && (
                      <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-gray-200">
                        <Image
                          src={data.images.packshot}
                          alt="Product packshot"
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-center text-xs text-white">
                          Packshot
                        </div>
                      </div>
                    )}
                    {data.images.frontLabel && (
                      <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-gray-200">
                        <Image
                          src={data.images.frontLabel}
                          alt="Front label"
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-center text-xs text-white">
                          Front Label
                        </div>
                      </div>
                    )}
                    {data.images.backLabel && (
                      <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-gray-200">
                        <Image
                          src={data.images.backLabel}
                          alt="Back label"
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-center text-xs text-white">
                          Back Label
                        </div>
                      </div>
                    )}
                    {!data.images.packshot && !data.images.frontLabel && !data.images.backLabel && (
                      <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                        <Wine className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Product Description */}
              {data.product.description && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Description</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{data.product.description}</p>
                </div>
              )}

              {/* Technical Details from HAL */}
              {(data.product.manufacturer || data.product.abcCode || data.product.bottleBarcode || data.product.itemsPerCase || data.product.vintage || data.product.colour) && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Product Specifications</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {data.product.manufacturer && (
                      <>
                        <dt className="font-medium text-gray-600">Supplier/Manufacturer:</dt>
                        <dd className="text-gray-900">{data.product.manufacturer}</dd>
                      </>
                    )}
                    {data.product.vintage && (
                      <>
                        <dt className="font-medium text-gray-600">Vintage:</dt>
                        <dd className="text-gray-900">{data.product.vintage}</dd>
                      </>
                    )}
                    {data.product.colour && (
                      <>
                        <dt className="font-medium text-gray-600">Color:</dt>
                        <dd className="text-gray-900">{data.product.colour}</dd>
                      </>
                    )}
                    {data.product.itemsPerCase && (
                      <>
                        <dt className="font-medium text-gray-600">Items per Case:</dt>
                        <dd className="text-gray-900">{data.product.itemsPerCase}</dd>
                      </>
                    )}
                    {data.product.abcCode && (
                      <>
                        <dt className="font-medium text-gray-600">ABC Code:</dt>
                        <dd className="font-mono text-xs text-gray-900">{data.product.abcCode}</dd>
                      </>
                    )}
                    {data.product.bottleBarcode && (
                      <>
                        <dt className="font-medium text-gray-600">Bottle Barcode:</dt>
                        <dd className="font-mono text-xs text-gray-900">{data.product.bottleBarcode}</dd>
                      </>
                    )}
                    {data.product.caseBarcode && (
                      <>
                        <dt className="font-medium text-gray-600">Case Barcode:</dt>
                        <dd className="font-mono text-xs text-gray-900">{data.product.caseBarcode}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {/* Product Info Summary */}
              <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-5">
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
                <div>
                  <p className="text-xs text-gray-600">Price</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {data.pricing.priceLists.length > 0
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: data.pricing.priceLists[0].currency,
                        }).format(data.pricing.priceLists[0].price)
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Inventory Section */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Inventory</h3>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-800">Total On Hand</p>
                    <p className="mt-1 text-3xl font-bold text-green-900">{data.inventory.totalOnHand}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm text-blue-800">Available to Sell</p>
                    <p className="mt-1 text-3xl font-bold text-blue-900">{data.inventory.totalAvailable}</p>
                  </div>
                </div>

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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            {!loading && !error && data && !isEditMode && (
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  data.product.isArchived
                    ? 'border border-green-600 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border border-red-600 bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                {isArchiving
                  ? 'Processing...'
                  : data.product.isArchived
                    ? '📦 Unarchive Product'
                    : '🗄️ Archive Product'
                }
              </button>
            )}
            {(!loading && !error && data && !isEditMode) || <div />}
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
