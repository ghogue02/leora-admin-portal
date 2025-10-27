'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Package, GripVertical } from 'lucide-react';

interface Product {
  id: string;
  itemNumber: string;
  description: string;
  category: string;
  supplier: string;
  price: number;
  imageUrl?: string;
}

interface ProductSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxProducts?: number;
}

export function ProductSelector({
  selectedIds,
  onChange,
  maxProducts = 10
}: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, categoryFilter, supplierFilter]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter) params.set('category', categoryFilter);
      if (supplierFilter) params.set('supplier', supplierFilter);

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProducts = products.filter(p => selectedIds.includes(p.id));
  const availableProducts = products.filter(p => !selectedIds.includes(p.id));

  const handleToggle = (productId: string) => {
    if (selectedIds.includes(productId)) {
      onChange(selectedIds.filter(id => id !== productId));
    } else if (selectedIds.length < maxProducts) {
      onChange([...selectedIds, productId]);
    }
  };

  const handleRemove = (productId: string) => {
    onChange(selectedIds.filter(id => id !== productId));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newOrder = [...selectedIds];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    onChange(newOrder);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            <SelectItem value="wine">Wine</SelectItem>
            <SelectItem value="spirits">Spirits</SelectItem>
            <SelectItem value="beer">Beer</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
          </SelectContent>
        </Select>

        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All suppliers</SelectItem>
            <SelectItem value="supplier1">Supplier 1</SelectItem>
            <SelectItem value="supplier2">Supplier 2</SelectItem>
            <SelectItem value="supplier3">Supplier 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              Selected Products ({selectedProducts.length}/{maxProducts})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
            >
              Clear All
            </Button>
          </div>

          <div className="space-y-2">
            {selectedIds.map((id, index) => {
              const product = products.find(p => p.id === id);
              if (!product) return null;

              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.description}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted-foreground/10 rounded flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {product.itemNumber}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Products */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Available Products</h3>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading products...
          </div>
        ) : availableProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No products found
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
            {availableProducts.map((product) => (
              <div
                key={product.id}
                className={`border rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors ${
                  selectedIds.length >= maxProducts ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => handleToggle(product.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    disabled={!selectedIds.includes(product.id) && selectedIds.length >= maxProducts}
                    className="mt-1"
                  />

                  <div className="flex-1">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.description}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-24 bg-muted-foreground/10 rounded mb-2 flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    <p className="font-medium text-sm line-clamp-2">{product.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {product.itemNumber}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">${product.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedIds.length >= maxProducts && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum of {maxProducts} products selected
        </p>
      )}
    </div>
  );
}
