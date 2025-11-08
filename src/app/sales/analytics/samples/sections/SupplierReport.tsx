'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Layers } from 'lucide-react';

type SupplierSummary = {
  supplierId: string;
  supplierName: string;
  totalSamples: number;
  sampleEvents: number;
  conversions: number;
  conversionRate: number;
  revenueGenerated: number;
  averageDaysToOrder: number | null;
  topProducts: Array<{
    skuId: string;
    productName: string;
    skuCode: string | null;
    samples: number;
    conversions: number;
  }>;
};

type SupplierSampleLog = {
  id: string;
  tastedAt: string;
  quantity: number;
  feedback: string | null;
  needsFollowUp: boolean;
  followedUpAt: string | null;
  resultedInOrder: boolean;
  customer: { id: string; name: string } | null;
  salesRepName: string;
  sku: {
    name: string;
    code: string | null;
    brand: string | null;
  };
};

const RANGE_OPTIONS = [
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: '180 Days', value: 180 },
];

export default function SupplierReport() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(90);
  const [activeRange, setActiveRange] = useState<{ start: string; end: string } | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, SupplierSampleLog[]>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const loadSupplierData = useCallback(async (days: number) => {
    setLoading(true);
    const end = new Date();
    const start = subDays(end, days);
    const params = new URLSearchParams({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    });

    try {
      const response = await fetch(`/api/sales/analytics/samples/suppliers?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
        setActiveRange({ start: params.get('startDate')!, end: params.get('endDate')! });
        setDetailMap({});
        setSelectedSupplier(null);
      }
    } catch (error) {
      console.error('Failed to load supplier data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSupplierData(rangeDays);
  }, [loadSupplierData, rangeDays]);

  const handleRangeChange = (days: number) => {
    if (days === rangeDays) return;
    setRangeDays(days);
  };

  const handleToggleSupplier = async (supplierId: string) => {
    if (selectedSupplier === supplierId) {
      setSelectedSupplier(null);
      return;
    }

    setSelectedSupplier(supplierId);

    if (detailMap[supplierId] || !activeRange) {
      return;
    }

    setDetailLoading(supplierId);
    const params = new URLSearchParams(activeRange);
    try {
      const response = await fetch(
        `/api/sales/analytics/samples/suppliers/${supplierId}?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setDetailMap((prev) => ({ ...prev, [supplierId]: data.samples || [] }));
      }
    } catch (error) {
      console.error('Failed to load supplier detail:', error);
    } finally {
      setDetailLoading(null);
    }
  };

  const renderTopProducts = (supplier: SupplierSummary) => (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase text-gray-600">Top Products</p>
      <div className="space-y-2">
        {supplier.topProducts.length === 0 ? (
          <p className="text-xs text-gray-500">No product data.</p>
        ) : (
          supplier.topProducts.map((product) => (
            <div key={product.skuId} className="flex items-center justify-between text-xs">
              <div>
                <p className="font-medium text-gray-900">{product.productName}</p>
                <p className="text-gray-500">{product.skuCode ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-900">{product.samples.toLocaleString()} samples</p>
                <p className="text-gray-500">{product.conversions.toLocaleString()} conversions</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderSampleLog = (supplierId: string) => {
    const rows = detailMap[supplierId];
    if (!rows) {
      return (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          {detailLoading === supplierId ? 'Loading sample log...' : 'No detail available yet.'}
        </div>
      );
    }

    if (rows.length === 0) {
      return <div className="px-4 py-6 text-center text-sm text-gray-500">No samples recorded.</div>;
    }

    return (
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Customer</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Sales Rep</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Feedback</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((sample) => (
              <tr key={sample.id}>
                <td className="px-3 py-2 text-gray-700">
                  {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
                    new Date(sample.tastedAt),
                  )}
                </td>
                <td className="px-3 py-2">
                  {sample.customer ? (
                    <Link
                      href={`/sales/customers/${sample.customer.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {sample.customer.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2 text-gray-700">{sample.salesRepName}</td>
                <td className="px-3 py-2 text-gray-700">
                  <div className="flex flex-col">
                    <span className="font-medium">{sample.sku.name}</span>
                    <span className="text-gray-500">
                      {sample.sku.code ?? '—'} {sample.sku.brand ? `• ${sample.sku.brand}` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {sample.feedback ? `“${sample.feedback}”` : '—'}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {sample.resultedInOrder ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      Converted
                    </span>
                  ) : sample.needsFollowUp ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Follow-up
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      Logged
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Supplier Performance</h2>
          <p className="text-xs text-gray-500">Track ROI for partner suppliers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleRangeChange(option.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                rangeDays === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading supplier data...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-gray-500">No supplier data available for this range.</p>
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.supplierId}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{supplier.supplierName}</h3>
                    <Link
                      href={`/sales/suppliers/${supplier.supplierId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <Layers className="h-3 w-3" />
                      View page
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric label="Samples Pulled" value={supplier.totalSamples} />
                    <Metric label="Conversions" value={supplier.conversions} accent="text-green-600" />
                    <Metric
                      label="Conversion Rate"
                      value={`${(supplier.conversionRate * 100).toFixed(1)}%`}
                      accent="text-blue-600"
                    />
                    <Metric
                      label="Revenue"
                      value={`$${supplier.revenueGenerated.toLocaleString()}`}
                      accent="text-purple-600"
                      sublabel={
                        supplier.averageDaysToOrder != null
                          ? `${supplier.averageDaysToOrder.toFixed(1)} days to order`
                          : undefined
                      }
                    />
                  </div>
                  {selectedSupplier === supplier.supplierId && renderTopProducts(supplier)}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleToggleSupplier(supplier.supplierId)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {selectedSupplier === supplier.supplierId ? 'Hide details' : 'View details'}
                  </button>
                </div>
              </div>

              {selectedSupplier === supplier.supplierId && renderSampleLog(supplier.supplierId)}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-4">
        <p className="text-xs text-gray-700">
          <strong>💡 Tip:</strong> Share these insights with suppliers to justify product placement and
          future sampling support.
        </p>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
  sublabel,
}: {
  label: string;
  value: string | number;
  accent?: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sublabel && <p className="text-[11px] text-gray-500">{sublabel}</p>}
    </div>
  );
}
