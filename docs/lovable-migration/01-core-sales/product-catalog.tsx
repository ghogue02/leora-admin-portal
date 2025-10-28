/**
 * LOVABLE MIGRATION - Product Catalog Component
 *
 * Simplified product catalog for customer portal
 * Original: /src/app/portal/catalog/page.tsx
 *
 * FEATURES:
 * - Product grid display
 * - Search and filtering
 * - Add to cart functionality
 * - Live inventory display
 */

'use client';

import { useCallback, useEffect, useState } from "react";
import { Search, ShoppingCart, Plus } from "lucide-react";

type Product = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  pricePerUnit: number | null;
  inventory: {
    totals: {
      available: number;
    };
  };
};

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  const loadCatalog = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/portal/catalog");
      if (!response.ok) throw new Error("Failed to load catalog");

      const data = await response.json();
      setProducts(data.items);
    } catch (err) {
      console.error("Error loading catalog:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredProducts = products.filter((product) =>
    product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = async (skuId: string, quantity: number = 1) => {
    try {
      const response = await fetch("/api/portal/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skuId, quantity }),
      });

      if (!response.ok) throw new Error("Failed to add to cart");

      setCart((prev) => ({
        ...prev,
        [skuId]: (prev[skuId] || 0) + quantity,
      }));
    } catch (err) {
      console.error("Error adding to cart:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-600 mt-2">
            Browse our portfolio and add items to your cart
          </p>
        </div>

        <a
          href="/portal/cart"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ShoppingCart className="w-5 h-5" />
          Cart ({Object.keys(cart).length})
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.skuId} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition">
              {/* Product Image Placeholder */}
              <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No Image</span>
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 line-clamp-2">
                  {product.productName}
                </h3>

                {product.brand && (
                  <p className="text-sm text-gray-600">{product.brand}</p>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{product.size}</span>
                  {product.category && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {product.category}
                    </span>
                  )}
                </div>

                {/* Price and Inventory */}
                <div className="pt-3 border-t border-gray-100">
                  {product.pricePerUnit && (
                    <p className="text-lg font-bold text-gray-900">
                      ${product.pricePerUnit.toFixed(2)}
                    </p>
                  )}

                  <p className="text-sm text-gray-600 mt-1">
                    {product.inventory.totals.available > 0
                      ? `${product.inventory.totals.available} in stock`
                      : "Out of stock"}
                  </p>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => addToCart(product.skuId)}
                  disabled={product.inventory.totals.available === 0}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  <Plus className="w-4 h-4" />
                  {cart[product.skuId] ? `Add More (${cart[product.skuId]})` : "Add to Cart"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
