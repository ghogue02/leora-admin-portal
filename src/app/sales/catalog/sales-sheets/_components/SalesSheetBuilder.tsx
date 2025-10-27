'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProductSelector } from './ProductSelector';
import { SalesSheetPreview } from './SalesSheetPreview';
import { SalesSheetPDFGenerator } from './SalesSheetPDFGenerator';

export type SelectedProduct = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  price: number;
  currency: string;
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
  customText?: string;
};

export type LayoutTemplate = '2-column' | '3-column' | 'single-featured' | '4-grid';

export function SalesSheetBuilder() {
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [layout, setLayout] = useState<LayoutTemplate>('2-column');
  const [sheetTitle, setSheetTitle] = useState('Wine Portfolio Selection');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);

  const handleAddProduct = useCallback((product: SelectedProduct) => {
    setSelectedProducts(prev => {
      if (prev.find(p => p.skuId === product.skuId)) {
        return prev;
      }
      return [...prev, product];
    });
  }, []);

  const handleRemoveProduct = useCallback((skuId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.skuId !== skuId));
  }, []);

  const handleReorderProducts = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedProducts(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const handleUpdateProductText = useCallback((skuId: string, customText: string) => {
    setSelectedProducts(prev =>
      prev.map(p => (p.skuId === skuId ? { ...p, customText } : p))
    );
  }, []);

  const handleGeneratePDF = useCallback(() => {
    setShowPDFGenerator(true);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    const template = {
      layout,
      sheetTitle,
      headerText,
      footerText,
      products: selectedProducts,
    };

    // Save to localStorage for now (could be saved to database later)
    const templates = JSON.parse(localStorage.getItem('salesSheetTemplates') || '[]');
    templates.push({
      id: Date.now().toString(),
      name: sheetTitle || 'Untitled Template',
      createdAt: new Date().toISOString(),
      ...template,
    });
    localStorage.setItem('salesSheetTemplates', JSON.stringify(templates));

    alert('Template saved successfully!');
  }, [layout, sheetTitle, headerText, footerText, selectedProducts]);

  return (
    <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
      {/* Left Panel - Controls */}
      <div className="space-y-6">
        {/* Sheet Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Sheet Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Sheet Title
              </label>
              <input
                type="text"
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Wine Portfolio Selection"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Header Text (Optional)
              </label>
              <textarea
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Add a custom introduction..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Footer Text (Optional)
              </label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Contact information, terms, etc."
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700">
                Layout Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '2-column', label: '2 Column', icon: '▦' },
                  { value: '3-column', label: '3 Column', icon: '▦▦' },
                  { value: 'single-featured', label: 'Featured', icon: '▭' },
                  { value: '4-grid', label: '4 Grid', icon: '▦▦▦' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLayout(option.value as LayoutTemplate)}
                    className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                      layout === option.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm">{option.icon}</div>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Products */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Selected Products ({selectedProducts.length})
            </h3>
            {selectedProducts.length > 0 && (
              <button
                onClick={() => setSelectedProducts([])}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Clear all
              </button>
            )}
          </div>

          {selectedProducts.length === 0 ? (
            <p className="text-xs text-gray-500">
              Add products from the catalog below to start building your sheet.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedProducts.map((product, index) => (
                <div
                  key={product.skuId}
                  className="group rounded-md border border-gray-200 bg-gray-50 p-2 hover:border-gray-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-gray-900">
                        {product.productName}
                      </p>
                      <p className="truncate text-xs text-gray-600">{product.brand}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRemoveProduct(product.skuId)}
                        className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                        aria-label="Remove product"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleGeneratePDF}
            disabled={selectedProducts.length === 0}
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate PDF
          </button>

          <button
            onClick={handleSaveTemplate}
            disabled={selectedProducts.length === 0}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save as Template
          </button>
        </div>
      </div>

      {/* Right Panel - Preview and Product Selector */}
      <div className="space-y-6">
        {/* Preview */}
        {selectedProducts.length > 0 && (
          <SalesSheetPreview
            products={selectedProducts}
            layout={layout}
            sheetTitle={sheetTitle}
            headerText={headerText}
            footerText={footerText}
            onUpdateProductText={handleUpdateProductText}
          />
        )}

        {/* Product Selector */}
        <ProductSelector
          selectedProductIds={selectedProducts.map(p => p.skuId)}
          onSelectProduct={handleAddProduct}
        />
      </div>

      {/* PDF Generator Modal */}
      {showPDFGenerator && (
        <SalesSheetPDFGenerator
          products={selectedProducts}
          layout={layout}
          sheetTitle={sheetTitle}
          headerText={headerText}
          footerText={footerText}
          onClose={() => setShowPDFGenerator(false)}
        />
      )}
    </div>
  );
}
