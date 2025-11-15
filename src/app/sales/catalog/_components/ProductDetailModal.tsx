"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type { CatalogItem } from "@/types/catalog";

interface ProductDetailModalProps {
  product: CatalogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

type ProductImage = {
  id: string;
  imageType: "packshot" | "frontLabel" | "backLabel";
  catalogUrl: string;
  storageUrl: string;
  displayOrder: number;
};

type ProductDetails = {
  product: {
    id: string;
    name: string;
    brand: string | null;
    description: string | null;
    manufacturer: string | null;
  };
  sku: {
    code: string;
    size: string | null;
    unitOfMeasure: string | null;
    abv: number | null;
    itemsPerCase: number | null;
    abcCode: string | null;
    bottleBarcode: string | null;
    caseBarcode: string | null;
  };
  images: ProductImage[];
  inventory: {
    totalOnHand: number;
    totalAvailable: number;
    byLocation: Array<{
      location: string;
      onHand: number;
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
    }>;
  };
};

const IMAGE_TYPE_LABELS: Record<string, string> = {
  packshot: "Product Shot",
  frontLabel: "Front Label",
  backLabel: "Back Label",
};

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState(false);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Fetch product details
  useEffect(() => {
    if (!product || !isOpen) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/sales/catalog/${product.skuId}/details`);

        if (!response.ok) {
          throw new Error("Failed to load product details");
        }

        const data = await response.json();
        setDetails(data);
        setSelectedImageIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [product, isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen || !product) return null;

  const currentImage = details?.images[selectedImageIndex];
  const hasMultipleImages = (details?.images.length ?? 0) > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-6 w-64 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">{details?.product.name}</h2>
                  {details?.product.brand && (
                    <p className="mt-1 text-sm font-medium text-gray-600">{details.product.brand}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">SKU: {details?.sku.code}</p>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 active:scale-90"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(95vh - 100px)" }}>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && details && (
            <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr,1fr]">
              {/* Left Column - Image Gallery */}
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {currentImage ? (
                    <div
                      className={`relative aspect-square cursor-zoom-in transition-transform ${
                        imageZoom ? "scale-150" : "scale-100"
                      }`}
                      onClick={() => setImageZoom(!imageZoom)}
                    >
                      <Image
                        src={currentImage.catalogUrl || currentImage.storageUrl}
                        alt={`${details.product.name} - ${IMAGE_TYPE_LABELS[currentImage.imageType] || "Image"}`}
                        fill
                        className="object-contain p-4"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-20 w-20 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">No image available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Type Label */}
                {currentImage && (
                  <div className="text-center">
                    <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                      {IMAGE_TYPE_LABELS[currentImage.imageType] || currentImage.imageType}
                    </span>
                  </div>
                )}

                {/* Thumbnail Gallery */}
                {hasMultipleImages && (
                  <div className="grid grid-cols-3 gap-3">
                    {details.images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                          idx === selectedImageIndex
                            ? "border-indigo-600 shadow-lg"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <Image
                          src={img.catalogUrl || img.storageUrl}
                          alt={IMAGE_TYPE_LABELS[img.imageType] || "Thumbnail"}
                          fill
                          className="object-contain p-2 transition-transform group-hover:scale-110"
                          sizes="150px"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                          <p className="text-xs font-medium text-white">
                            {IMAGE_TYPE_LABELS[img.imageType]?.split(" ")[0] || "Image"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column - Product Details */}
              <div className="space-y-6">
                {/* Description */}
                {details.product.description && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                      Description
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600">{details.product.description}</p>
                  </div>
                )}

                {/* Technical Specifications */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
                    Technical Specifications
                  </h3>
                  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <SpecRow label="Size" value={details.sku.size} />
                    <SpecRow label="Unit of Measure" value={details.sku.unitOfMeasure} />
                    <SpecRow
                      label="Alcohol (ABV)"
                      value={details.sku.abv !== null ? `${details.sku.abv}%` : null}
                    />
                    <SpecRow label="Items per Case" value={details.sku.itemsPerCase?.toString()} />
                    <SpecRow label="ABC Code" value={details.sku.abcCode} />
                    <SpecRow label="Manufacturer" value={details.product.manufacturer} />
                  </div>
                </div>

                {/* Barcodes */}
                {(details.sku.bottleBarcode || details.sku.caseBarcode) && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Barcodes</h3>
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <SpecRow label="Bottle Barcode" value={details.sku.bottleBarcode} mono />
                      <SpecRow label="Case Barcode" value={details.sku.caseBarcode} mono />
                    </div>
                  </div>
                )}

                {/* Inventory */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Inventory</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                      <p className="text-xs font-medium text-green-700">On Hand</p>
                      <p className="mt-1 text-2xl font-bold text-green-900">{details.inventory.totalOnHand}</p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                      <p className="text-xs font-medium text-blue-700">Available</p>
                      <p className="mt-1 text-2xl font-bold text-blue-900">{details.inventory.totalAvailable}</p>
                    </div>
                  </div>

                  {/* Warehouse Locations */}
                  {details.inventory.byLocation.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Location</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">On Hand</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Available</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {details.inventory.byLocation.map((loc, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">{loc.location}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{loc.onHand}</td>
                              <td className="px-3 py-2 text-right font-semibold text-green-600">{loc.available}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                {details.pricing.priceLists.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Pricing</h3>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Price List</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Price</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Min Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {details.pricing.priceLists.map((pl, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">{pl.priceListName}</td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: pl.currency,
                                }).format(pl.price)}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">{pl.minQuantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for specification rows
function SpecRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 py-2 last:border-0">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}
