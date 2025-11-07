'use client';

import Link from 'next/link';
import {
  CUSTOMER_TYPE_OPTIONS,
  FEATURE_PROGRAM_OPTIONS,
  VOLUME_CAPACITY_OPTIONS,
  CustomerType,
  FeatureProgram,
  VolumeCapacity,
} from '@/types/customer';

type CustomerClassificationCardProps = {
  customerId: string;
  type: CustomerType | null;
  volumeCapacity: VolumeCapacity | null;
  featurePrograms: FeatureProgram[];
};

const formatValue = (value: string | null) => value ?? 'Not set';

export function CustomerClassificationCard({
  customerId,
  type,
  volumeCapacity,
  featurePrograms,
}: CustomerClassificationCardProps) {
  const hasFeaturePrograms = featurePrograms.length > 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customer Classification</h2>
          <p className="text-sm text-gray-500">
            Used for analytics, segmentation, and campaign targeting
          </p>
        </div>
        <Link
          href={`/sales/customers/${customerId}/edit`}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
        >
          Edit Classification
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{formatValue(type)}</p>
          {!type && (
            <p className="mt-1 text-xs text-gray-500">
              Choose one of: {CUSTOMER_TYPE_OPTIONS.join(', ')}
            </p>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Volume Capacity
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {formatValue(volumeCapacity)}
          </p>
          {!volumeCapacity && (
            <p className="mt-1 text-xs text-gray-500">
              Options: {VOLUME_CAPACITY_OPTIONS.join(', ')}
            </p>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Feature Programs
          </p>
          {hasFeaturePrograms ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {featurePrograms.map((program) => (
                <span
                  key={program}
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {program}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No programs selected</p>
          )}
          {!hasFeaturePrograms && (
            <p className="mt-1 text-xs text-gray-500">
              Available: {FEATURE_PROGRAM_OPTIONS.join(', ')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
