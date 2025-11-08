"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ArrowLeft } from "lucide-react";

const RANGE_OPTIONS = [
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "180 Days", value: 180 },
];

interface SupplierSummary {
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
}

interface SupplierSampleLog {
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
}

interface SupplierDetailResponse {
  supplier: {
    id: string;
    name: string;
  };
  range: {
    start: string;
    end: string;
  };
  samples: SupplierSampleLog[];
}

type SupplierDetailState = {
  summary: SupplierSummary | null;
  detail: SupplierDetailResponse | null;
  loading: boolean;
  error: string | null;
};

export default function SupplierDetailClient({ supplierId }: { supplierId: string }) {
  const [rangeDays, setRangeDays] = useState(90);
  const [state, setState] = useState<SupplierDetailState>({
    summary: null,
    detail: null,
    loading: true,
    error: null,
  });

  const formattedRange = useMemo(() => {
    if (!state.detail) return "";
    const start = new Date(state.detail.range.start);
    const end = new Date(state.detail.range.end);
    return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
  }, [state.detail]);

  useEffect(() => {
    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const end = new Date();
      const start = subDays(end, rangeDays);
      const params = new URLSearchParams({
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      });

      try {
        const [summaryRes, detailRes] = await Promise.all([
          fetch(`/api/sales/analytics/samples/suppliers?${params.toString()}`),
          fetch(`/api/sales/analytics/samples/suppliers/${supplierId}?${params.toString()}`),
        ]);

        if (!summaryRes.ok || !detailRes.ok) {
          throw new Error("Failed to load supplier data");
        }

        const summaryBody = (await summaryRes.json()) as { suppliers: SupplierSummary[] };
        const detailBody = (await detailRes.json()) as SupplierDetailResponse;
        const summaryRecord = summaryBody.suppliers.find(
          (entry) => entry.supplierId === supplierId,
        );

        setState({
          summary: summaryRecord ?? null,
          detail: detailBody,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Supplier detail load failed", error);
        setState({ summary: null, detail: null, loading: false, error: "Unable to load supplier." });
      }
    };

    void load();
  }, [supplierId, rangeDays]);

  if (state.loading) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-3 text-sm text-gray-600">Loading supplier insights...</p>
        </div>
      </main>
    );
  }

  if (state.error || !state.detail) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{state.error ?? "Supplier data unavailable."}</p>
          <Link href="/sales/analytics/samples" className="mt-3 inline-flex items-center text-sm text-red-700 underline">
            Return to analytics
          </Link>
        </div>
      </main>
    );
  }

  const { detail, summary } = state;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/sales/analytics/samples"
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back to analytics
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{detail.supplier.name}</h1>
            <p className="text-sm text-gray-600">Sampling activity for {formattedRange}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRangeDays(option.value)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  rangeDays === option.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {summary ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Samples Pulled" value={summary.totalSamples.toLocaleString()} />
            <StatCard label="Conversions" value={summary.conversions.toLocaleString()} accent="text-green-600" />
            <StatCard
              label="Conversion Rate"
              value={`${(summary.conversionRate * 100).toFixed(1)}%`}
              accent="text-blue-600"
            />
            <StatCard
              label="Revenue"
              value={`$${summary.revenueGenerated.toLocaleString()}`}
              accent="text-purple-600"
              sublabel={
                summary.averageDaysToOrder != null
                  ? `${summary.averageDaysToOrder.toFixed(1)} days to order`
                  : undefined
              }
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No summary metrics available for this date range.</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Sample Log</h2>
        </div>
        {detail.samples.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            No samples recorded for this supplier in the selected range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
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
                {detail.samples.map((sample) => (
                  <tr key={sample.id}>
                    <td className="px-3 py-2 text-gray-700">
                      {format(new Date(sample.tastedAt), "MMM d, yyyy")}
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
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{sample.salesRepName}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-medium">{sample.sku.name}</span>
                        <span className="text-gray-500">
                          {sample.sku.code ?? "—"}
                          {sample.sku.brand ? ` • ${sample.sku.brand}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {sample.feedback ? `“${sample.feedback}”` : "—"}
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
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
  sublabel,
}: {
  label: string;
  value: string;
  accent?: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}
