'use client';

import { useEffect, useState, useMemo } from 'react';
import { SelectedProduct } from './SalesSheetBuilder';

type CatalogProduct = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  priceLists: Array<{
    price: number;
    currency: string;
    priceListName: string;
  }>;
  product?: {
    abv?: number;
    vintage?: string;
    region?: string;
    tastingNotes?: {
      aroma?: string;
      palate?: string;
      finish?: string;
      foodPairings?: string[];
    };
    technicalDetails?: {
      producer?: string;
      grapeVariety?: string;
      appellation?: string;
    };
  };
};

type ProductSelectorProps = {
  selectedProductIds: string[];
  onSelectProduct: (product: SelectedProduct) => void;
};

export function ProductSelector({ selectedProductIds, onSelectProduct }: ProductSelectorProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sales/catalog');
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.items || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !search ||
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase()) ||
        p.skuCode.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const handleSelectProduct = (product: CatalogProduct) => {
    const primaryPrice = product.priceLists[0];

    onSelectProduct({
      skuId: product.skuId,
      skuCode: product.skuCode,
      productName: product.productName,
      brand: product.brand,
      category: product.category,
      size: product.size,
      price: primaryPrice?.price || 0,
      currency: primaryPrice?.currency || 'USD',
      abv: product.product?.abv,
      vintage: product.product?.vintage,
      region: product.product?.region,
      tastingNotes: product.product?.tastingNotes,
      technicalDetails: product.product?.technicalDetails,
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Add Products</h3>

      {/* Search and Filter */}
      <div className="mb-4 space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="max-h-[600px] space-y-2 overflow-y-auto">
          {filteredProducts.map(product => {
            const isSelected = selectedProductIds.includes(product.skuId);
            const primaryPrice = product.priceLists[0];

            return (
              <div
                key={product.skuId}
                className={`rounded-lg border p-3 transition ${
                  isSelected
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-medium text-gray-900">
                      {product.productName}
                    </h4>
                    <p className="truncate text-xs text-gray-600">{product.brand}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{product.skuCode}</span>
                      {product.category && (
                        <>
                          <span>•</span>
                          <span>{product.category}</span>
                        </>
                      )}
                      {primaryPrice && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: primaryPrice.currency,
                            }).format(primaryPrice.price)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectProduct(product)}
                    disabled={isSelected}
                    className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isSelected ? 'Added' : 'Add'}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No products found matching your criteria
            </p>
          )}
        </div>
      )}
    </div>
  );
}
