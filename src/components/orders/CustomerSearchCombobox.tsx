'use client';

/**
 * Customer Search Combobox - ENHANCED
 *
 * Fixes frontend agent's Issue #2: Customer dropdown fundamentally broken
 * PLUS: Performance fix - doesn't load all 5000+ customers at once
 *
 * Features:
 * - Search-based loading (API call on search)
 * - Shows recent customers by default
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Visible dropdown options
 * - Loading states
 * - Accessible (ARIA labels)
 */

import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronDown, Search, CheckIcon } from 'lucide-react';
import { debounce } from 'lodash';

export type Customer = {
  id: string;
  name: string;
  territory: string | null;
  accountNumber: string | null;
  requiresPO: boolean;
  defaultWarehouseLocation?: string | null;
  defaultDeliveryTimeWindow?: string | null;
  paymentTerms?: string | null;
  state?: string | null;
  salesRepId?: string | null;
  salesRepName?: string | null;
  deliveryInstructions?: string | null;
  deliveryWindows?: DeliveryWindowInfo[];
  deliveryMethod?: string | null;
  minimumOrderOverride?: number | null;
  minimumOrderOverrideNotes?: string | null;
};

type CustomerApiResult = {
  id: string;
  name: string;
  territory?: string | null;
  accountNumber?: string | null;
  requiresPO?: boolean;
  defaultWarehouseLocation?: string | null;
  defaultDeliveryTimeWindow?: string | null;
  paymentTerms?: string | null;
  state?: string | null;
  address?: {
    state?: string | null;
  } | null;
  salesRepId?: string | null;
  salesRep?: {
    id?: string | null;
    territory?: string | null;
    user?: {
      fullName?: string | null;
    } | null;
  } | null;
  deliveryInstructions?: string | null;
  deliveryWindows?: DeliveryWindowInfo[] | null;
  deliveryMethod?: string | null;
  minimumOrderOverride?: number | string | null;
  minimumOrderOverrideNotes?: string | null;
};

export type DeliveryWindowInfo = {
  type?: 'BEFORE' | 'AFTER' | 'BETWEEN' | null;
  time?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

const toCustomer = (entry: CustomerApiResult): Customer => ({
  id: entry.id,
  name: entry.name,
  territory: entry.territory ?? entry.salesRep?.territory ?? null,
  accountNumber: entry.accountNumber ?? null,
  requiresPO: Boolean(entry.requiresPO),
  defaultWarehouseLocation: entry.defaultWarehouseLocation ?? null,
  defaultDeliveryTimeWindow: entry.defaultDeliveryTimeWindow ?? null,
  paymentTerms: entry.paymentTerms ?? null,
  state: entry.address?.state ?? entry.state ?? null,
  salesRepId: entry.salesRepId ?? entry.salesRep?.id ?? null,
  salesRepName: entry.salesRep?.user?.fullName ?? null,
  deliveryInstructions: entry.deliveryInstructions ?? null,
  deliveryWindows: Array.isArray(entry.deliveryWindows)
    ? entry.deliveryWindows.filter(Boolean)
    : [],
  deliveryMethod: entry.deliveryMethod ?? null,
  minimumOrderOverride:
    entry.minimumOrderOverride === null || typeof entry.minimumOrderOverride === 'undefined'
      ? null
      : Number(entry.minimumOrderOverride),
  minimumOrderOverrideNotes: entry.minimumOrderOverrideNotes ?? null,
});

type Props = {
  value: string;
  onChange: (customer: Customer) => void;
  disabled?: boolean;
  error?: string;
};

export function CustomerSearchCombobox({
  value,
  onChange,
  disabled = false,
  error,
}: Props) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const existingSelectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === value) || null,
    [customers, value],
  );

  // Search customers from API (debounced) - use useRef to prevent recreating
  const searchCustomers = useRef(
    debounce(async (searchQuery: string, setLoadingFn: (val: boolean) => void, setCustomersFn: (val: Customer[]) => void) => {
      setLoadingFn(true);
      try {
        const response = await fetch(`/api/sales/customers/search?q=${encodeURIComponent(searchQuery)}&limit=50`);
        if (!response.ok) throw new Error('Failed to search customers');
        const data = await response.json();
        setCustomersFn((data.customers || []).map(toCustomer));
      } catch (err) {
        console.error('Customer search failed:', err);
        setCustomersFn([]);
      } finally {
        setLoadingFn(false);
      }
    }, 300)
  ).current;

  // Load recent customers on mount
  useEffect(() => {
    searchCustomers('', setLoading, setCustomers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Search when query changes
  useEffect(() => {
    searchCustomers(query, setLoading, setCustomers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]); // Only depend on query

  // Ensure the combobox reflects externally controlled selections (e.g., deep links)
  useEffect(() => {
    if (!value) {
      setSelectedCustomer(null);
      return;
    }

    if (selectedCustomer?.id === value) {
      return;
    }

    if (existingSelectedCustomer) {
      setSelectedCustomer(existingSelectedCustomer);
      return;
    }

    let cancelled = false;

    const loadCustomerById = async (customerId: string) => {
      try {
        const response = await fetch(`/api/sales/customers/${customerId}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (cancelled || !data?.customer) {
          return;
        }

        const customer = data.customer as CustomerApiResult;
        const normalizedCustomer: Customer = toCustomer(customer);

        setSelectedCustomer(normalizedCustomer);
        setCustomers((prev) => {
          if (prev.some((entry) => entry.id === normalizedCustomer.id)) {
            return prev.map((entry) =>
              entry.id === normalizedCustomer.id ? normalizedCustomer : entry,
            );
          }
          return [normalizedCustomer, ...prev].slice(0, 50);
        });
      } catch (error) {
        console.error("Failed to load customer for selection:", error);
      }
    };

    void loadCustomerById(value);

    return () => {
      cancelled = true;
    };
  }, [value, existingSelectedCustomer, selectedCustomer]);

  const handleSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      onChange(customer);
    }
  };

  return (
    <div>
      <Combobox value={value} onChange={handleSelect} disabled={disabled}>
        <div className="relative">
          <div className={`relative w-full cursor-default overflow-hidden rounded-md border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 ${
            error ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-white'
          } ${disabled || loading ? 'cursor-not-allowed bg-gray-100' : ''}`}>
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:outline-none focus:ring-0 bg-transparent"
              displayValue={() => {
                return selectedCustomer
                  ? `${selectedCustomer.name}${selectedCustomer.territory ? ` (${selectedCustomer.territory})` : ''}`
                  : '';
              }}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={loading ? "Searching..." : "Search customer by name, territory, or account..."}
              disabled={disabled}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              ) : (
                <ChevronDown
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              )}
            </Combobox.Button>
          </div>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {loading ? (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    <span>Searching customers...</span>
                  </div>
                </div>
              ) : customers.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <span>No customers found matching {query}</span>
                  </div>
                </div>
              ) : customers.length === 0 ? (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  No customers available
                </div>
              ) : (
                <div className="space-y-0">
                  {query === '' && (
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                      Recent Customers • Showing {customers.length} of 5,000+ (type to search all)
                    </div>
                  )}
                  {query !== '' && (
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                      Search Results • Showing {customers.length} customers
                    </div>
                  )}
                  {customers.map((customer) => (
                    <Combobox.Option
                      key={customer.id}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                        }`
                      }
                      value={customer.id}
                    >
                      {({ selected, active }) => (
                        <div className="relative flex w-full items-center justify-between">
                          <div>
                            <span
                              className={`block truncate ${
                                selected ? 'font-semibold' : 'font-normal'
                              }`}
                            >
                              {customer.name}
                            </span>
                            {customer.territory && (
                              <span className="text-xs text-gray-500">
                                {customer.territory}
                                {customer.accountNumber && ` • ${customer.accountNumber}`}
                              </span>
                            )}
                          </div>
                          {customer.requiresPO && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              PO Required
                            </span>
                          )}
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? 'text-blue-600' : 'text-blue-600'
                              }`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </div>
                      )}
                    </Combobox.Option>
                  ))}
                </div>
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>

      {error && (
        <p className="mt-1 text-sm text-rose-600">
          {error}
        </p>
      )}

      {selectedCustomer && (
        <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="font-medium text-gray-700">Territory:</span>{' '}
              <span className="text-gray-900">{selectedCustomer.territory || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Account:</span>{' '}
              <span className="text-gray-900">{selectedCustomer.accountNumber || 'N/A'}</span>
            </div>
            {selectedCustomer.requiresPO && (
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                  ⚠ PO Number Required for this customer
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
