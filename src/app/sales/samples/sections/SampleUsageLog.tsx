"use client";

import { format } from "date-fns";
import Link from "next/link";
import { formatSkuLabel } from "@/lib/utils/format";

type Sample = {
  id: string;
  customer: {
    id: string;
    name: string;
  };
  sku: {
    id: string;
    code: string;
    product: {
      name: string;
      brand?: string;
    };
  };
  quantity: number;
  tastedAt: string;
  feedback?: string;
  needsFollowUp: boolean;
  followedUpAt?: string;
  resultedInOrder: boolean;
};

type SampleUsageLogProps = {
  samples: Sample[];
  onUpdate: () => void;
};

export default function SampleUsageLog({ samples, onUpdate }: SampleUsageLogProps) {
  const handleMarkFollowedUp = async (sampleId: string) => {
    try {
      const response = await fetch(`/api/sales/samples/${sampleId}/follow-up`, {
        method: "PUT",
      });
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error marking follow-up:", error);
    }
  };

  const handleMarkConverted = async (sampleId: string) => {
    try {
      const response = await fetch(`/api/sales/samples/${sampleId}/converted`, {
        method: "PUT",
      });
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error marking conversion:", error);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Sample Usage History</h3>
        <p className="text-sm text-gray-600">Recent sample tastings and customer feedback</p>
      </div>

      {samples.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500">No sample usage recorded yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Click "Log Sample Usage" to record your first tasting
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {samples.map((sample) => (
            <div key={sample.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/sales/customers/${sample.customer.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {sample.customer.name}
                    </Link>
                    <span className="text-sm text-gray-500">
                      {format(new Date(sample.tastedAt), "MMM d, yyyy")}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-900">
                    {formatSkuLabel(
                      {
                        code: sample.sku.code,
                        product: {
                          brand: sample.sku.product.brand,
                          name: sample.sku.product.name,
                        },
                      },
                      { includeCode: false }
                    )}
                    {sample.quantity > 1 && (
                      <span className="ml-2 text-gray-500">({sample.quantity} samples)</span>
                    )}
                  </p>

                  {sample.feedback && (
                    <p className="mt-2 text-sm italic text-gray-600">"{sample.feedback}"</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {sample.needsFollowUp && !sample.followedUpAt && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        Needs Follow-up
                      </span>
                    )}
                    {sample.followedUpAt && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Followed up {format(new Date(sample.followedUpAt), "MMM d")}
                      </span>
                    )}
                    {sample.resultedInOrder && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        ✓ Converted to Order
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {sample.needsFollowUp && !sample.followedUpAt && (
                    <button
                      onClick={() => handleMarkFollowedUp(sample.id)}
                      className="rounded-md border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                      Mark Followed Up
                    </button>
                  )}
                  {!sample.resultedInOrder && (
                    <button
                      onClick={() => handleMarkConverted(sample.id)}
                      className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                    >
                      Mark Converted
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
