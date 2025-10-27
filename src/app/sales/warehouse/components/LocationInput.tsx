'use client';

import React, { useState, useEffect } from 'react';
import {
  validateLocation,
  aisleNumberToLetter,
  shelfNumberToName,
  type WarehouseConfig,
  DEFAULT_WAREHOUSE_CONFIG,
} from '@/lib/warehouse-validation';

interface LocationInputProps {
  value?: {
    aisle?: string;
    row?: string;
    shelf?: string;
    bin?: string;
  };
  onChange?: (location: {
    aisle: string;
    row: string;
    shelf: string;
    bin?: string;
    pickOrder?: number;
  }) => void;
  config?: WarehouseConfig;
  disabled?: boolean;
  showPickOrder?: boolean;
  className?: string;
}

export default function LocationInput({
  value = {},
  onChange,
  config = DEFAULT_WAREHOUSE_CONFIG,
  disabled = false,
  showPickOrder = true,
  className = '',
}: LocationInputProps) {
  const [aisle, setAisle] = useState(value.aisle || '');
  const [row, setRow] = useState(value.row || '');
  const [shelf, setShelf] = useState(value.shelf || '');
  const [bin, setBin] = useState(value.bin || '');
  const [validation, setValidation] = useState<{
    valid: boolean;
    error?: string;
    pickOrder?: number;
  }>({ valid: true });

  // Generate aisle options (A-Z based on config)
  const aisleOptions = Array.from({ length: config.aisleCount }, (_, i) =>
    aisleNumberToLetter(i + 1)
  );

  // Generate row options (1 to rowsPerAisle)
  const rowOptions = Array.from({ length: config.rowsPerAisle }, (_, i) =>
    (i + 1).toString()
  );

  // Validate and notify parent on change
  useEffect(() => {
    if (aisle && row && shelf) {
      const result = validateLocation(aisle, row, shelf, config);
      setValidation(result);

      if (result.valid && onChange) {
        onChange({
          aisle,
          row,
          shelf,
          bin: bin || undefined,
          pickOrder: result.pickOrder,
        });
      }
    } else {
      setValidation({ valid: true }); // Empty is valid (not yet filled)
    }
  }, [aisle, row, shelf, bin, config, onChange]);

  const inputBaseClass =
    'min-h-[44px] px-3 py-2 border rounded-md text-base focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed';
  const validClass = validation.valid
    ? 'border-gray-300 focus:ring-blue-500'
    : 'border-red-500 focus:ring-red-500 bg-red-50';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Aisle Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aisle
          </label>
          <select
            value={aisle}
            onChange={(e) => setAisle(e.target.value)}
            disabled={disabled}
            className={`${inputBaseClass} ${validClass} w-full`}
          >
            <option value="">Select</option>
            {aisleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Row Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Row
          </label>
          <select
            value={row}
            onChange={(e) => setRow(e.target.value)}
            disabled={disabled}
            className={`${inputBaseClass} ${validClass} w-full`}
          >
            <option value="">Select</option>
            {rowOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Shelf Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shelf
          </label>
          <select
            value={shelf}
            onChange={(e) => setShelf(e.target.value)}
            disabled={disabled}
            className={`${inputBaseClass} ${validClass} w-full`}
          >
            <option value="">Select</option>
            {config.shelfLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Bin Input (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bin (Optional)
          </label>
          <input
            type="text"
            value={bin}
            onChange={(e) => setBin(e.target.value)}
            disabled={disabled}
            placeholder="e.g., A1"
            className={`${inputBaseClass} ${validClass} w-full`}
            maxLength={10}
          />
        </div>
      </div>

      {/* Validation Feedback */}
      {!validation.valid && validation.error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {validation.error}
        </div>
      )}

      {/* Pick Order Preview */}
      {showPickOrder && validation.valid && validation.pickOrder && (
        <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 p-2 rounded">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Location: <strong>{aisle}{row}-{shelf}</strong>
            {bin && `-${bin}`} | Pick Order: <strong>{validation.pickOrder}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
