'use client';

type Recommendation = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  rank: number;
  calculationMode: string;
};

type ProductRecommendationsProps = {
  recommendations: Recommendation[];
};

export default function ProductRecommendations({
  recommendations,
}: ProductRecommendationsProps) {
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "REVENUE":
        return "Top by Revenue";
      case "VOLUME":
        return "Top by Volume";
      case "CUSTOMER_COUNT":
        return "Most Popular";
      default:
        return mode;
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Product Recommendations
          </h2>
          <p className="text-xs text-gray-500">
            Top 20 company wines this customer has not yet ordered
          </p>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
          {recommendations.length} Opportunities
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-semibold text-gray-900">
            Great news! This customer has ordered all top products.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            No recommendations at this time.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Top By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recommendations.map((rec) => (
                <tr key={rec.skuId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {rec.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {rec.productName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {rec.brand} - {rec.skuCode}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {rec.category ?? "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {getModeLabel(rec.calculationMode)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-semibold">Sales Tip</p>
          <p className="mt-1 text-xs">
            These are the company's top-performing wines that this customer
            hasn't tried yet. Consider offering samples or highlighting these
            during your next visit.
          </p>
        </div>
      )}
    </section>
  );
}
