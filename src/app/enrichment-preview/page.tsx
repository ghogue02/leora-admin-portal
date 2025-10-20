'use client';

import { useEffect, useState } from 'react';

interface EnrichedProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  tastingNotes: {
    aroma: string;
    palate: string;
    finish: string;
  } | null;
  foodPairings: string[] | null;
  servingInfo: {
    temperature: string;
    decanting: string;
    glassware: string;
  } | null;
  wineDetails: {
    region: string;
    grapeVariety: string;
    vintage: number | null;
    style: string;
    ageability: string;
  } | null;
  enrichedAt: string | null;
  enrichedBy: string | null;
}

export default function EnrichmentPreviewPage() {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<EnrichedProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/enrichment-preview');
      const data = await response.json();
      // Ensure data is an array
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-600">Loading enriched products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🍷 Product Enrichment Preview
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Professional sommelier-quality tasting notes and wine details
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Enriched Products</div>
              <div className="text-3xl font-bold text-purple-600">{products.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 border border-purple-100">
            <div className="text-sm text-gray-600">Total Products</div>
            <div className="text-2xl font-bold text-gray-900">{products.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-red-100">
            <div className="text-sm text-gray-600">Red Wines</div>
            <div className="text-2xl font-bold text-red-600">
              {products.filter(p => p.category?.toLowerCase().includes('red')).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-yellow-100">
            <div className="text-sm text-gray-600">White Wines</div>
            <div className="text-2xl font-bold text-yellow-600">
              {products.filter(p => p.category?.toLowerCase().includes('white') || p.name.toLowerCase().includes('chardonnay') || p.name.toLowerCase().includes('sauvignon')).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-pink-100">
            <div className="text-sm text-gray-600">Sparkling & Rosé</div>
            <div className="text-2xl font-bold text-pink-600">
              {products.filter(p =>
                p.category?.toLowerCase().includes('sparkling') ||
                p.category?.toLowerCase().includes('champagne') ||
                p.category?.toLowerCase().includes('rosé') ||
                p.name.toLowerCase().includes('rosé')
              ).length}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden cursor-pointer"
              onClick={() => setSelectedProduct(product)}
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                <h3 className="text-lg font-bold text-white line-clamp-2">{product.name}</h3>
                {product.brand && (
                  <p className="text-sm text-purple-100 mt-1">{product.brand}</p>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4">
                {/* Category Badge */}
                {product.category && (
                  <div className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mb-3">
                    {product.category}
                  </div>
                )}

                {/* Tasting Note Preview */}
                {product.tastingNotes && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🍷</span>
                      <span className="text-xs font-semibold text-gray-600 uppercase">Aroma</span>
                    </div>
                    <p className="text-sm text-gray-700 italic line-clamp-2">
                      {product.tastingNotes.aroma}
                    </p>
                  </div>
                )}

                {/* Food Pairing Preview */}
                {product.foodPairings && product.foodPairings.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Perfect With
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.foodPairings.slice(0, 2).map((pairing, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
                        >
                          {pairing}
                        </span>
                      ))}
                      {product.foodPairings.length > 2 && (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{product.foodPairings.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-medium text-sm">
                  📖 View Full Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍷</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Enriched Products</h3>
            <p className="text-gray-600">
              Run the seeding script to add enriched products to the database.
            </p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                  {selectedProduct.brand && (
                    <p className="text-purple-100 mt-1">{selectedProduct.brand}</p>
                  )}
                  {selectedProduct.category && (
                    <span className="inline-block mt-2 px-3 py-1 bg-white/20 text-white rounded-full text-sm">
                      {selectedProduct.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {/* Tasting Notes */}
              {selectedProduct.tastingNotes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tasting Notes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Aroma */}
                    <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🍷</span>
                        <h4 className="font-semibold text-purple-900">Aroma</h4>
                      </div>
                      <p className="text-sm text-purple-800">{selectedProduct.tastingNotes.aroma}</p>
                    </div>

                    {/* Palate */}
                    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">👅</span>
                        <h4 className="font-semibold text-red-900">Palate</h4>
                      </div>
                      <p className="text-sm text-red-800">{selectedProduct.tastingNotes.palate}</p>
                    </div>

                    {/* Finish */}
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">✨</span>
                        <h4 className="font-semibold text-amber-900">Finish</h4>
                      </div>
                      <p className="text-sm text-amber-800">{selectedProduct.tastingNotes.finish}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Food Pairings */}
              {selectedProduct.foodPairings && selectedProduct.foodPairings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Perfect Pairings</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.foodPairings.map((pairing, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200"
                      >
                        {pairing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Serving Info */}
              {selectedProduct.servingInfo && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Serving Guide</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-2xl mb-2">🌡️</div>
                      <div className="text-xs font-semibold text-blue-900 uppercase mb-1">Temperature</div>
                      <div className="text-sm text-blue-800">{selectedProduct.servingInfo.temperature}</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <div className="text-2xl mb-2">🍷</div>
                      <div className="text-xs font-semibold text-indigo-900 uppercase mb-1">Decanting</div>
                      <div className="text-sm text-indigo-800">{selectedProduct.servingInfo.decanting}</div>
                    </div>
                    <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                      <div className="text-2xl mb-2">🥂</div>
                      <div className="text-xs font-semibold text-violet-900 uppercase mb-1">Glassware</div>
                      <div className="text-sm text-violet-800">{selectedProduct.servingInfo.glassware}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wine Details */}
              {selectedProduct.wineDetails && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Wine Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Region</div>
                        <div className="text-sm text-gray-900">{selectedProduct.wineDetails.region}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Grape Variety</div>
                        <div className="text-sm text-gray-900">{selectedProduct.wineDetails.grapeVariety}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Style</div>
                        <div className="text-sm text-gray-900">{selectedProduct.wineDetails.style}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Ageability</div>
                        <div className="text-sm text-gray-900">{selectedProduct.wineDetails.ageability}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enrichment Info */}
              {selectedProduct.enrichedBy && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div>Enriched by: <span className="font-medium">{selectedProduct.enrichedBy}</span></div>
                    {selectedProduct.enrichedAt && (
                      <div>Generated: {new Date(selectedProduct.enrichedAt).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
