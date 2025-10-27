'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type CustomerSample = {
  customerId: string;
  customerName: string;
  totalSamples: number;
  conversions: number;
  conversionRate: number;
  lastSampleDate: string;
  nextFollowUp: string | null;
  recentSamples: Array<{
    id: string;
    productName: string;
    skuCode: string;
    tastedAt: string;
    converted: boolean;
    feedback: string | null;
  }>;
};

export default function CustomerSampleHistory() {
  const [customers, setCustomers] = useState<CustomerSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  useEffect(() => {
    loadCustomerHistory();
  }, []);

  const loadCustomerHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales/analytics/samples/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Failed to load customer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customer Sample History</h2>
          <p className="text-xs text-gray-500">Timeline and conversion tracking per customer</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading customer data...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              {searchTerm ? 'No customers match your search' : 'No customer sample data'}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.customerId}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-300"
            >
              <button
                onClick={() => toggleCustomer(customer.customerId)}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{customer.customerName}</h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {customer.totalSamples} samples
                    </span>
                    {customer.conversions > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        {customer.conversions} converted
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-gray-500">
                    <span>
                      Conv. Rate: {(customer.conversionRate * 100).toFixed(1)}%
                    </span>
                    <span>
                      Last Sample: {format(new Date(customer.lastSampleDate), 'MMM d, yyyy')}
                    </span>
                    {customer.nextFollowUp && (
                      <span className="text-amber-600">
                        Follow-up: {format(new Date(customer.nextFollowUp), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/sales/customers/${customer.customerId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-md border border-blue-600 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    View Customer
                  </Link>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 transition ${
                      expandedCustomer === customer.customerId ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {expandedCustomer === customer.customerId && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase text-gray-600">
                    Recent Samples
                  </h4>
                  <div className="space-y-2">
                    {customer.recentSamples.map((sample) => (
                      <div
                        key={sample.id}
                        className="flex items-start justify-between rounded-md border border-slate-200 bg-white p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{sample.productName}</p>
                            {sample.converted && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                ✓ Converted
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{sample.skuCode}</p>
                          {sample.feedback && (
                            <p className="mt-2 text-xs italic text-gray-600">
                              "{sample.feedback}"
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(sample.tastedAt), 'MMM d')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/sales/samples/quick-assign?customerId=${customer.customerId}`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Assign New Sample
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
