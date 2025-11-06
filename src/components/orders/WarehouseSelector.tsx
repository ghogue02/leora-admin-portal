'use client';

/**
 * Warehouse Selector Component
 *
 * Dropdown for selecting warehouse location (Travis's HAL requirement)
 * - Baltimore
 * - Warrenton
 * - Storage
 * - (Future: dynamic from database)
 */

import { useEffect, useState } from 'react';

type Props = {
  value: string;
  onChange: (location: string) => void;
  disabled?: boolean;
  showInventoryCounts?: boolean;
};

type WarehouseOption = {
  value: string;
  label: string;
  inventoryCount?: number;
};

export function WarehouseSelector({
  value,
  onChange,
  disabled = false,
  showInventoryCounts = false,
}: Props) {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([
    { value: 'Baltimore', label: 'Baltimore' },
    { value: 'Warrenton', label: 'Warrington' },
    { value: 'Storage', label: 'Storage' },
  ]);

  // Optional: Load inventory counts
  useEffect(() => {
    if (!showInventoryCounts) return;

    async function loadInventoryCounts() {
      try {
        // TODO: Create API endpoint to get inventory counts per warehouse
        // const response = await fetch('/api/warehouse/inventory-counts');
        // const data = await response.json();
        // Update warehouses with counts
      } catch (err) {
        console.error('Failed to load inventory counts:', err);
      }
    }

    void loadInventoryCounts();
  }, [showInventoryCounts]);

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        <option value="">Select warehouse</option>
        {warehouses.map(warehouse => (
          <option key={warehouse.value} value={warehouse.value}>
            {warehouse.label}
            {warehouse.inventoryCount !== undefined && ` (${warehouse.inventoryCount} SKUs)`}
          </option>
        ))}
      </select>

      {value && (
        <p className="mt-1 text-xs text-gray-500">
          Orders from <strong>{value}</strong> warehouse
        </p>
      )}
    </div>
  );
}
