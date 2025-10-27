'use client';

import React, { useState } from 'react';
import WarehouseGrid from '../components/WarehouseGrid';
import {
  type WarehouseConfig,
  DEFAULT_WAREHOUSE_CONFIG,
} from '@/lib/warehouse-validation';

interface WarehouseMapProps {
  config?: WarehouseConfig;
  className?: string;
}

export default function WarehouseMap({
  config = DEFAULT_WAREHOUSE_CONFIG,
  className = '',
}: WarehouseMapProps) {
  const [selectedShelf, setSelectedShelf] = useState('Middle');
  const [searchSKU, setSearchSKU] = useState('');
  const [selectedCell, setSelectedCell] = useState<{
    aisle: string;
    row: number;
    shelf: string;
    items?: Array<{ sku: string; name: string; quantity: number }>;
  } | null>(null);

  // Mock inventory data - in real app, this would come from API
  const inventoryData = [
    {
      sku: 'KJ-CHARD-750',
      name: 'Kendall-Jackson Chardonnay 750ml',
      aisle: 'A',
      row: '5',
      shelf: 'Middle',
      quantity: 48,
    },
    {
      sku: 'BB-PINOT-750',
      name: 'Bread & Butter Pinot Noir 750ml',
      aisle: 'A',
      row: '5',
      shelf: 'Top',
      quantity: 36,
    },
    {
      sku: 'SILVER-CAB-750',
      name: 'Silver Oak Cabernet 750ml',
      aisle: 'B',
      row: '10',
      shelf: 'Middle',
      quantity: 24,
    },
    {
      sku: 'CAYMUS-CAB-750',
      name: 'Caymus Cabernet 750ml',
      aisle: 'A',
      row: '3',
      shelf: 'Middle',
      quantity: 18,
    },
    {
      sku: 'OPUS-ONE-750',
      name: 'Opus One 750ml',
      aisle: 'A',
      row: '1',
      shelf: 'Middle',
      quantity: 12,
    },
  ];

  const handleCellClick = (cell: any) => {
    setSelectedCell(cell);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search SKU to Highlight
            </label>
            <input
              type="text"
              placeholder="Enter SKU to find on map..."
              value={searchSKU}
              onChange={(e) => setSearchSKU(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shelf Level
            </label>
            <select
              value={selectedShelf}
              onChange={(e) => setSelectedShelf(e.target.value)}
              className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
            >
              {config.shelfLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warehouse Grid */}
      <WarehouseGrid
        config={config}
        inventoryData={inventoryData}
        selectedShelf={selectedShelf}
        highlightSKU={searchSKU}
        onCellClick={handleCellClick}
      />

      {/* Selected Cell Details */}
      {selectedCell && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              Location: {selectedCell.aisle}{selectedCell.row}-{selectedCell.shelf}
            </h3>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {selectedCell.items && selectedCell.items.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 font-medium">
                {selectedCell.items.length} item(s) in this location
              </div>
              <div className="divide-y divide-gray-200">
                {selectedCell.items.map((item, index) => (
                  <div key={index} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{item.sku}</div>
                      <div className="text-sm text-gray-600">{item.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{item.quantity}</div>
                      <div className="text-xs text-gray-500">units</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p>This location is empty</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
