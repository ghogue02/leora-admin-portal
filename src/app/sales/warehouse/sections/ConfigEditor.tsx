'use client';

import React, { useState } from 'react';
import {
  type WarehouseConfig,
  DEFAULT_WAREHOUSE_CONFIG,
  aisleNumberToLetter,
} from '@/lib/warehouse-validation';

interface ConfigEditorProps {
  initialConfig?: WarehouseConfig;
  onSave?: (config: WarehouseConfig) => void;
  className?: string;
}

export default function ConfigEditor({
  initialConfig = DEFAULT_WAREHOUSE_CONFIG,
  onSave,
  className = '',
}: ConfigEditorProps) {
  const [config, setConfig] = useState<WarehouseConfig>(initialConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (field: keyof WarehouseConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleShelfLevelChange = (index: number, value: string) => {
    const newLevels = [...config.shelfLevels];
    newLevels[index] = value;
    handleChange('shelfLevels', newLevels);
  };

  const addShelfLevel = () => {
    const newLevels = [...config.shelfLevels, `Level ${config.shelfLevels.length + 1}`];
    handleChange('shelfLevels', newLevels);
  };

  const removeShelfLevel = (index: number) => {
    if (config.shelfLevels.length <= 1) {
      alert('Must have at least one shelf level');
      return;
    }
    const newLevels = config.shelfLevels.filter((_, i) => i !== index);
    handleChange('shelfLevels', newLevels);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(config);
    }
    console.log('Saving warehouse config:', config);
    alert('Warehouse configuration saved! All pick orders will be recalculated.');
    setHasChanges(false);
  };

  const handleReset = () => {
    setConfig(initialConfig);
    setHasChanges(false);
  };

  const totalLocations = config.aisleCount * config.rowsPerAisle * config.shelfLevels.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Warehouse Dimensions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Warehouse Dimensions</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Aisles
            </label>
            <input
              type="number"
              min="1"
              max="26"
              value={config.aisleCount}
              onChange={(e) => handleChange('aisleCount', parseInt(e.target.value, 10))}
              className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Current: A through {aisleNumberToLetter(config.aisleCount)} (max 26)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rows Per Aisle
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={config.rowsPerAisle}
              onChange={(e) => handleChange('rowsPerAisle', parseInt(e.target.value, 10))}
              className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              1 to {config.rowsPerAisle} (max 99)
            </p>
          </div>
        </div>
      </div>

      {/* Shelf Levels */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Shelf Levels</h3>
          <button
            onClick={addShelfLevel}
            className="min-h-[44px] px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Level
          </button>
        </div>

        <div className="space-y-3">
          {config.shelfLevels.map((level, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={level}
                  onChange={(e) => handleShelfLevelChange(index, e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Level ${index + 1} name`}
                />
              </div>
              {config.shelfLevels.length > 1 && (
                <button
                  onClick={() => removeShelfLevel(index)}
                  className="min-h-[44px] min-w-[44px] p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove level"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 text-sm text-gray-500">
          Common configurations: Top/Middle/Bottom, Level 1/Level 2/Level 3, or custom names
        </p>
      </div>

      {/* Pick Strategy */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Pick Order Strategy</h3>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="pickStrategy"
              value="aisle_then_row"
              checked={config.pickStrategy === 'aisle_then_row'}
              onChange={(e) => handleChange('pickStrategy', e.target.value)}
              className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Aisle Then Row (Default)</div>
              <div className="text-sm text-gray-600">
                Optimizes for moving through aisles sequentially (A1, A2, A3, B1, B2, B3)
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer hover:bg-gray-50 opacity-50">
            <input
              type="radio"
              name="pickStrategy"
              value="zone_based"
              disabled
              className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Zone Based (Coming Soon)</div>
              <div className="text-sm text-gray-600">
                Groups items by warehouse zones for multi-picker efficiency
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer hover:bg-gray-50 opacity-50">
            <input
              type="radio"
              name="pickStrategy"
              value="optimize_by_frequency"
              disabled
              className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Optimize by Frequency (Coming Soon)</div>
              <div className="text-sm text-gray-600">
                Places high-frequency items in most accessible locations
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Impact Preview */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-blue-900 mb-3">Configuration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-blue-700 font-medium">Total Locations</div>
            <div className="text-2xl font-bold text-blue-900">{totalLocations.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-blue-700 font-medium">Aisles</div>
            <div className="text-2xl font-bold text-blue-900">{config.aisleCount}</div>
          </div>
          <div>
            <div className="text-blue-700 font-medium">Rows/Aisle</div>
            <div className="text-2xl font-bold text-blue-900">{config.rowsPerAisle}</div>
          </div>
          <div>
            <div className="text-blue-700 font-medium">Shelf Levels</div>
            <div className="text-2xl font-bold text-blue-900">{config.shelfLevels.length}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className="min-h-[44px] px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="min-h-[44px] px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {showPreview ? 'Hide' : 'Preview'} Impact
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="min-h-[44px] px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save & Recalculate
        </button>
      </div>

      {/* Preview Warning */}
      {showPreview && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="font-bold text-yellow-900 mb-1">Impact Preview</h4>
              <p className="text-sm text-yellow-800">
                Saving these changes will recalculate pickOrder for all existing inventory locations.
                This may affect current pick sheets and workflows. Consider saving during off-hours.
              </p>
              <div className="mt-3 text-sm text-yellow-800">
                <strong>Estimated impact:</strong> ~{totalLocations} locations will be updated.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
