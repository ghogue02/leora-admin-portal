'use client';

import { SelectedProduct, LayoutTemplate } from './SalesSheetBuilder';

type SalesSheetPreviewProps = {
  products: SelectedProduct[];
  layout: LayoutTemplate;
  sheetTitle: string;
  headerText: string;
  footerText: string;
  onUpdateProductText: (skuId: string, text: string) => void;
};

export function SalesSheetPreview({
  products,
  layout,
  sheetTitle,
  headerText,
  footerText,
  onUpdateProductText,
}: SalesSheetPreviewProps) {
  const getGridClass = () => {
    switch (layout) {
      case '2-column':
        return 'grid-cols-1 md:grid-cols-2';
      case '3-column':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '4-grid':
        return 'grid-cols-2 md:grid-cols-4';
      case 'single-featured':
        return 'grid-cols-1';
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </span>
      </div>

      {/* Sheet Preview - simulates how PDF will look */}
      <div className="rounded-lg border border-gray-300 bg-white p-8 shadow-inner">
        {/* Header */}
        <header className="mb-6 border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">{sheetTitle}</h1>
          {headerText && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{headerText}</p>
          )}
        </header>

        {/* Products Grid */}
        <div className={`grid gap-6 ${getGridClass()}`}>
          {products.map((product) => (
            <div
              key={product.skuId}
              className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${
                layout === 'single-featured' ? 'flex flex-col md:flex-row gap-4' : ''
              }`}
            >
              {/* Product placeholder image */}
              <div
                className={`flex items-center justify-center rounded-md bg-gradient-to-br from-purple-100 to-indigo-100 ${
                  layout === 'single-featured'
                    ? 'h-48 w-full md:h-auto md:w-48 flex-shrink-0'
                    : 'mb-3 h-32'
                }`}
              >
                <span className="text-4xl">🍷</span>
              </div>

              <div className="flex-1">
                {/* Product Info */}
                <div className="mb-3">
                  <h3 className={`font-bold text-gray-900 ${layout === 'single-featured' ? 'text-xl' : 'text-base'}`}>
                    {product.productName}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{product.brand}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {product.vintage && <span className="rounded bg-gray-200 px-2 py-0.5">{product.vintage}</span>}
                    {product.region && <span className="rounded bg-gray-200 px-2 py-0.5">{product.region}</span>}
                    {product.abv && <span className="rounded bg-gray-200 px-2 py-0.5">{product.abv}% ABV</span>}
                  </div>
                </div>

                {/* Tasting Notes - Compact */}
                {product.tastingNotes && (
                  <div className="mb-3 space-y-1.5 text-xs">
                    {product.tastingNotes.aroma && (
                      <p className="leading-relaxed text-gray-700">
                        <span className="font-semibold text-purple-900">Aroma:</span> {product.tastingNotes.aroma}
                      </p>
                    )}
                    {product.tastingNotes.palate && (
                      <p className="leading-relaxed text-gray-700">
                        <span className="font-semibold text-red-900">Palate:</span> {product.tastingNotes.palate}
                      </p>
                    )}
                    {product.tastingNotes.finish && (
                      <p className="leading-relaxed text-gray-700">
                        <span className="font-semibold text-amber-900">Finish:</span> {product.tastingNotes.finish}
                      </p>
                    )}
                  </div>
                )}

                {/* Food Pairings */}
                {product.tastingNotes?.foodPairings && product.tastingNotes.foodPairings.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-semibold text-gray-700">Food Pairings:</p>
                    <div className="flex flex-wrap gap-1">
                      {product.tastingNotes.foodPairings.map((pairing, idx) => (
                        <span key={idx} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          {pairing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="text-xs font-medium text-gray-600">Price per unit</span>
                  <span className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: product.currency,
                    }).format(product.price)}
                  </span>
                </div>

                {/* Custom Text Editor */}
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Custom notes (optional)
                  </label>
                  <textarea
                    value={product.customText || ''}
                    onChange={(e) => onUpdateProductText(product.skuId, e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                    placeholder="Add custom description or notes..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {footerText && (
          <footer className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-xs leading-relaxed text-gray-600">{footerText}</p>
          </footer>
        )}
      </div>
    </div>
  );
}
