'use client';

import { Package, Clock } from 'lucide-react';
import { format } from 'date-fns';

type SampleCardProps = {
  product: {
    id: string;
    name: string;
    skuCode: string;
    brand: string;
    imageUrl?: string;
  };
  sampleHistory?: {
    lastSampledDate: string | null;
    totalSamples: number;
  };
  onQuickAssign: () => void;
};

export default function SampleCard({ product, sampleHistory, onQuickAssign }: SampleCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      {/* Product Image */}
      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-16 w-16 text-slate-400" />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {product.brand} • {product.skuCode}
            </p>
          </div>
        </div>

        {/* Sample History Indicator */}
        {sampleHistory && sampleHistory.totalSamples > 0 && (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-2">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="text-blue-700">
                {sampleHistory.totalSamples} sample{sampleHistory.totalSamples !== 1 ? 's' : ''} given
                {sampleHistory.lastSampledDate &&
                  ` • Last: ${format(new Date(sampleHistory.lastSampledDate), 'MMM d')}`}
              </span>
            </div>
          </div>
        )}

        {/* Quick Assign Button */}
        <button
          onClick={onQuickAssign}
          className="mt-3 w-full rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Quick Assign
        </button>
      </div>
    </div>
  );
}
