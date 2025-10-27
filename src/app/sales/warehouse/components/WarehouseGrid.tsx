'use client';

import React, { useState } from 'react';
import {
  aisleNumberToLetter,
  type WarehouseConfig,
  DEFAULT_WAREHOUSE_CONFIG,
} from '@/lib/warehouse-validation';

interface GridCell {
  aisle: string;
  row: number;
  shelf: string;
  status: 'empty' | 'low' | 'occupied' | 'disabled';
  itemCount?: number;
  items?: Array<{ sku: string; name: string; quantity: number }>;
}

interface WarehouseGridProps {
  config?: WarehouseConfig;
  inventoryData?: Array<{
    sku: string;
    name: string;
    aisle: string;
    row: string;
    shelf: string;
    quantity: number;
  }>;
  selectedShelf?: string;
  highlightSKU?: string;
  onCellClick?: (cell: GridCell) => void;
  className?: string;
}

export default function WarehouseGrid({
  config = DEFAULT_WAREHOUSE_CONFIG,
  inventoryData = [],
  selectedShelf = 'Middle',
  highlightSKU,
  onCellClick,
  className = '',
}: WarehouseGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'compact' | 'normal' | 'large'>('normal');

  // Build grid data structure
  const buildGridData = (): GridCell[][] => {
    const grid: GridCell[][] = [];

    for (let r = 1; r <= config.rowsPerAisle; r++) {
      const row: GridCell[] = [];

      for (let a = 1; a <= config.aisleCount; a++) {
        const aisle = aisleNumberToLetter(a);

        // Find items in this location
        const itemsInLocation = inventoryData.filter(
          item =>
            item.aisle === aisle &&
            item.row === r.toString() &&
            item.shelf === selectedShelf
        );

        const totalQuantity = itemsInLocation.reduce((sum, item) => sum + item.quantity, 0);

        let status: GridCell['status'] = 'empty';
        if (totalQuantity > 0) {
          status = totalQuantity < 10 ? 'low' : 'occupied';
        }

        row.push({
          aisle,
          row: r,
          shelf: selectedShelf,
          status,
          itemCount: itemsInLocation.length,
          items: itemsInLocation.map(item => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
          })),
        });
      }

      grid.push(row);
    }

    return grid;
  };

  const gridData = buildGridData();

  // Cell size based on zoom
  const cellSizes = {
    compact: 'w-6 h-6',
    normal: 'w-10 h-10',
    large: 'w-16 h-16',
  };

  const cellSize = cellSizes[zoomLevel];

  // Cell color based on status
  const getCellColor = (cell: GridCell, isHighlighted: boolean): string => {
    if (isHighlighted) {
      return 'bg-yellow-400 border-yellow-600 animate-pulse';
    }

    switch (cell.status) {
      case 'occupied':
        return 'bg-green-500 hover:bg-green-600';
      case 'low':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'empty':
        return 'bg-gray-200 hover:bg-gray-300';
      case 'disabled':
        return 'bg-gray-400';
      default:
        return 'bg-gray-200';
    }
  };

  // Check if cell contains highlighted SKU
  const isCellHighlighted = (cell: GridCell): boolean => {
    if (!highlightSKU) return false;
    return cell.items?.some(item => item.sku === highlightSKU) || false;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shelf Level
            </label>
            <select
              value={selectedShelf}
              onChange={(e) => {
                // This would be handled by parent component
                console.log('Shelf changed:', e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {config.shelfLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zoom
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setZoomLevel('compact')}
                className={`px-3 py-2 text-sm border rounded ${
                  zoomLevel === 'compact'
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                -
              </button>
              <button
                onClick={() => setZoomLevel('normal')}
                className={`px-3 py-2 text-sm border rounded ${
                  zoomLevel === 'normal'
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                =
              </button>
              <button
                onClick={() => setZoomLevel('large')}
                className={`px-3 py-2 text-sm border rounded ${
                  zoomLevel === 'large'
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Has Inventory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Low Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded border border-gray-300"></div>
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Disabled</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white p-6 rounded-lg shadow overflow-auto print:overflow-visible">
        <div className="inline-block min-w-full">
          {/* Column Headers (Aisles) */}
          <div className="flex mb-2">
            <div className={`${cellSize} flex items-center justify-center font-bold text-sm`}>
              Row
            </div>
            {Array.from({ length: config.aisleCount }, (_, i) => (
              <div
                key={i}
                className={`${cellSize} flex items-center justify-center font-bold text-sm`}
              >
                {aisleNumberToLetter(i + 1)}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {gridData.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {/* Row Header */}
              <div
                className={`${cellSize} flex items-center justify-center font-bold text-sm border-r-2 border-gray-300`}
              >
                {rowIndex + 1}
              </div>

              {/* Cells */}
              {row.map((cell, cellIndex) => {
                const cellKey = `${cell.aisle}-${cell.row}-${cell.shelf}`;
                const isHovered = hoveredCell === cellKey;
                const isHighlighted = isCellHighlighted(cell);

                return (
                  <div
                    key={cellIndex}
                    className={`${cellSize} border border-gray-300 ${getCellColor(
                      cell,
                      isHighlighted
                    )} cursor-pointer transition-colors relative`}
                    onClick={() => onCellClick?.(cell)}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${cell.aisle}${cell.row}-${cell.shelf}: ${cell.itemCount || 0} items`}
                  >
                    {/* Hover Tooltip */}
                    {isHovered && cell.items && cell.items.length > 0 && (
                      <div className="absolute z-10 bg-gray-900 text-white text-xs rounded p-2 shadow-lg left-full ml-2 top-0 w-48">
                        <div className="font-bold mb-1">
                          {cell.aisle}{cell.row}-{cell.shelf}
                        </div>
                        <div className="space-y-1">
                          {cell.items.slice(0, 3).map((item, i) => (
                            <div key={i} className="truncate">
                              {item.sku}: {item.quantity}
                            </div>
                          ))}
                          {cell.items.length > 3 && (
                            <div className="text-gray-400">
                              +{cell.items.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
