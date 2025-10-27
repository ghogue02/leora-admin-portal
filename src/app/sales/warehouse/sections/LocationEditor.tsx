'use client';

import React, { useState, useMemo } from 'react';
import LocationInput from '../components/LocationInput';
import {
  validateLocation,
  type WarehouseConfig,
  DEFAULT_WAREHOUSE_CONFIG,
} from '@/lib/warehouse-validation';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  aisle?: string;
  row?: string;
  shelf?: string;
  bin?: string;
  pickOrder?: number;
  quantityOnHand: number;
}

interface LocationEditorProps {
  config?: WarehouseConfig;
  className?: string;
}

export default function LocationEditor({
  config = DEFAULT_WAREHOUSE_CONFIG,
  className = '',
}: LocationEditorProps) {
  // Mock data - in real app, this would come from API
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      sku: 'KJ-CHARD-750',
      name: 'Kendall-Jackson Chardonnay 750ml',
      aisle: 'A',
      row: '5',
      shelf: 'Middle',
      bin: 'A1',
      pickOrder: 10502,
      quantityOnHand: 48,
    },
    {
      id: '2',
      sku: 'BB-PINOT-750',
      name: 'Bread & Butter Pinot Noir 750ml',
      aisle: 'A',
      row: '5',
      shelf: 'Top',
      pickOrder: 10501,
      quantityOnHand: 36,
    },
    {
      id: '3',
      sku: 'SILVER-CAB-750',
      name: 'Silver Oak Cabernet 750ml',
      quantityOnHand: 24,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [undoStack, setUndoStack] = useState<InventoryItem[][]>([]);

  // Filter inventory based on search
  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory;
    const term = searchTerm.toLowerCase();
    return inventory.filter(
      item =>
        item.sku.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.aisle?.toLowerCase().includes(term)
    );
  }, [inventory, searchTerm]);

  // Handle location change for single item
  const handleLocationChange = (
    itemId: string,
    location: {
      aisle: string;
      row: string;
      shelf: string;
      bin?: string;
      pickOrder?: number;
    }
  ) => {
    setInventory(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              aisle: location.aisle,
              row: location.row,
              shelf: location.shelf,
              bin: location.bin,
              pickOrder: location.pickOrder,
            }
          : item
      )
    );
  };

  // Handle bulk location assignment
  const handleBulkAssign = (location: {
    aisle: string;
    row: string;
    shelf: string;
    bin?: string;
  }) => {
    const validation = validateLocation(location.aisle, location.row, location.shelf, config);
    if (!validation.valid) {
      alert(`Invalid location: ${validation.error}`);
      return;
    }

    // Save for undo
    setUndoStack(prev => [...prev, inventory]);

    setInventory(prev =>
      prev.map(item =>
        selectedItems.has(item.id)
          ? {
              ...item,
              aisle: location.aisle,
              row: location.row,
              shelf: location.shelf,
              bin: location.bin,
              pickOrder: validation.pickOrder,
            }
          : item
      )
    );

    setSelectedItems(new Set());
    setBulkEditMode(false);
  };

  // Toggle item selection
  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select all filtered items
  const selectAll = () => {
    setSelectedItems(new Set(filteredInventory.map(item => item.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Undo last change
  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previous = undoStack[undoStack.length - 1];
      setInventory(previous);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  // Save changes (in real app, this would call API)
  const handleSave = () => {
    console.log('Saving location changes:', inventory);
    alert('Location changes saved successfully!');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by SKU, name, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {selectedItems.size > 0 && (
              <>
                <button
                  onClick={() => setBulkEditMode(true)}
                  className="min-h-[44px] px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Bulk Assign ({selectedItems.size})
                </button>
                <button
                  onClick={clearSelection}
                  className="min-h-[44px] px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Clear
                </button>
              </>
            )}

            <button
              onClick={selectAll}
              className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Select All
            </button>

            {undoStack.length > 0 && (
              <button
                onClick={handleUndo}
                className="min-h-[44px] px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                Undo
              </button>
            )}

            <button
              onClick={handleSave}
              className="min-h-[44px] px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Edit Modal */}
      {bulkEditMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">
              Bulk Assign Location ({selectedItems.size} items)
            </h3>

            <LocationInput
              config={config}
              onChange={(location) => {
                handleBulkAssign(location);
              }}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setBulkEditMode(false)}
                className="min-h-[44px] px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredInventory.length > 0 &&
                      filteredInventory.every(item => selectedItems.has(item.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAll();
                      } else {
                        clearSelection();
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pick Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty On Hand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => (
                <tr
                  key={item.id}
                  className={selectedItems.has(item.id) ? 'bg-blue-50' : ''}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === item.id ? (
                      <div className="max-w-md">
                        <LocationInput
                          value={{
                            aisle: item.aisle,
                            row: item.row,
                            shelf: item.shelf,
                            bin: item.bin,
                          }}
                          config={config}
                          showPickOrder={false}
                          onChange={(location) => handleLocationChange(item.id, location)}
                        />
                      </div>
                    ) : item.aisle && item.row && item.shelf ? (
                      <span className="font-mono">
                        {item.aisle}{item.row}-{item.shelf}
                        {item.bin ? `-${item.bin}` : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.pickOrder || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantityOnHand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                      className="min-h-[36px] px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                    >
                      {editingId === item.id ? 'Done' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInventory.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No items found matching your search.' : 'No inventory items found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
