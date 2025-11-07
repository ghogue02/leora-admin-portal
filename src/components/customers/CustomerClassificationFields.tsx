'use client';

import {
  CUSTOMER_TYPE_OPTIONS,
  FEATURE_PROGRAM_OPTIONS,
  VOLUME_CAPACITY_OPTIONS,
  CustomerType,
  FeatureProgram,
  VolumeCapacity,
} from '@/types/customer';
import clsx from 'clsx';

type CustomerClassificationFieldsProps = {
  typeValue: CustomerType | '';
  volumeCapacityValue: VolumeCapacity | '';
  featureProgramsValue: FeatureProgram[];
  onTypeChange: (value: CustomerType | '') => void;
  onVolumeCapacityChange: (value: VolumeCapacity | '') => void;
  onFeatureProgramsChange: (value: FeatureProgram[]) => void;
  disabled?: boolean;
};

function SelectionCard({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full rounded-lg border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60',
        selected
          ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
          : 'border-slate-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
      )}
    >
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export function CustomerClassificationFields({
  typeValue,
  volumeCapacityValue,
  featureProgramsValue,
  onTypeChange,
  onVolumeCapacityChange,
  onFeatureProgramsChange,
  disabled = false,
}: CustomerClassificationFieldsProps) {
  const toggleFeatureProgram = (program: FeatureProgram) => {
    if (featureProgramsValue.includes(program)) {
      onFeatureProgramsChange(featureProgramsValue.filter((item) => item !== program));
    } else {
      onFeatureProgramsChange([...featureProgramsValue, program]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Customer Type
            </h3>
            <p className="text-sm text-gray-500">
              Select the primary way this account does business with us
            </p>
          </div>
          {typeValue && (
            <button
              type="button"
              onClick={() => onTypeChange('')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
              disabled={disabled}
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CUSTOMER_TYPE_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              selected={typeValue === option}
              disabled={disabled}
              onClick={() =>
                onTypeChange(typeValue === option ? '' : (option as CustomerType))
              }
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Volume Capacity
            </h3>
            <p className="text-sm text-gray-500">
              Estimate how much product this account can take on
            </p>
          </div>
          {volumeCapacityValue && (
            <button
              type="button"
              onClick={() => onVolumeCapacityChange('')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
              disabled={disabled}
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {VOLUME_CAPACITY_OPTIONS.map((option) => (
            <SelectionCard
              key={option}
              label={option}
              selected={volumeCapacityValue === option}
              disabled={disabled}
              onClick={() =>
                onVolumeCapacityChange(
                  volumeCapacityValue === option ? '' : (option as VolumeCapacity)
                )
              }
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Feature Programs
            </h3>
            <p className="text-sm text-gray-500">Select all programs that apply</p>
          </div>
          {featureProgramsValue.length > 0 && (
            <button
              type="button"
              onClick={() => onFeatureProgramsChange([])}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
              disabled={disabled}
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {FEATURE_PROGRAM_OPTIONS.map((option) => {
            const selected = featureProgramsValue.includes(option as FeatureProgram);
            return (
              <label
                key={option}
                className={clsx(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                    : 'border-slate-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selected}
                  onChange={() => toggleFeatureProgram(option as FeatureProgram)}
                  disabled={disabled}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
