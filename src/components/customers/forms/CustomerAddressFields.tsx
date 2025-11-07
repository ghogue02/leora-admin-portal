'use client';

import clsx from 'clsx';

type AddressValues = {
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type CustomerAddressFieldsProps = {
  values: AddressValues;
  onChange: (field: keyof AddressValues, value: string | null) => void;
  disabled?: boolean;
};

export function CustomerAddressFields({
  values,
  onChange,
  disabled = false,
}: CustomerAddressFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-street1">
          Street Address
        </label>
        <input
          id="customer-street1"
          type="text"
          disabled={disabled}
          value={values.street1 ?? ''}
          onChange={(e) => onChange('street1', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-street2">
          Street Address 2
        </label>
        <input
          id="customer-street2"
          type="text"
          disabled={disabled}
          value={values.street2 ?? ''}
          onChange={(e) => onChange('street2', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-city">
          City
        </label>
        <input
          id="customer-city"
          type="text"
          disabled={disabled}
          value={values.city ?? ''}
          onChange={(e) => onChange('city', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-state">
          State
        </label>
        <input
          id="customer-state"
          type="text"
          disabled={disabled}
          value={values.state ?? ''}
          onChange={(e) => onChange('state', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-postal">
          Postal Code
        </label>
        <input
          id="customer-postal"
          type="text"
          disabled={disabled}
          value={values.postalCode ?? ''}
          onChange={(e) => onChange('postalCode', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-country">
          Country
        </label>
        <input
          id="customer-country"
          type="text"
          disabled={disabled}
          value={values.country ?? 'US'}
          onChange={(e) => onChange('country', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>
    </div>
  );
}
