'use client';

import { format } from "date-fns";

type Sample = {
  id: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  quantity: number;
  tastedAt: string;
  feedback: string | null;
  needsFollowUp: boolean;
  followedUpAt: string | null;
  resultedInOrder: boolean;
  salesRepName: string;
};

type SampleHistoryProps = {
  samples: Sample[];
};

export default function SampleHistory({ samples }: SampleHistoryProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sample History</h2>
          <p className="text-xs text-gray-500">
            Products sampled with customer feedback
          </p>
        </div>
        <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
          {samples.length} Samples
        </div>
      </div>

      {samples.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-gray-500">No sample history recorded</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">
                      {sample.productName}
                    </h4>
                    {sample.resultedInOrder && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Converted
                      </span>
                    )}
                    {sample.needsFollowUp && !sample.followedUpAt && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Follow-up Needed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {sample.brand} - {sample.skuCode} - Qty: {sample.quantity}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{format(new Date(sample.tastedAt), "MMM d, yyyy")}</p>
                  <p className="mt-1">by {sample.salesRepName}</p>
                </div>
              </div>

              {sample.feedback && (
                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-gray-600">
                    Customer Feedback:
                  </p>
                  <p className="mt-1 text-sm text-gray-900">{sample.feedback}</p>
                </div>
              )}

              {sample.followedUpAt && (
                <div className="mt-2 text-xs text-gray-500">
                  Followed up on{" "}
                  {format(new Date(sample.followedUpAt), "MMM d, yyyy")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
