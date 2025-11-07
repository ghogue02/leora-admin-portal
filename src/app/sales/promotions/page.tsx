"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PromotionItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  promotionDiscount: number | null;
  promotionEndDate: string | null;
  isCloseout: boolean;
  price: number | null;
  currency: string;
  inventory: {
    available: number;
    lowStock: boolean;
    outOfStock: boolean;
  };
};

type PromotionsResponse = {
  promotions: PromotionItem[];
  closeouts: PromotionItem[];
};

export default function PromotionsPage() {
  const [data, setData] = useState<PromotionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"promotions" | "closeouts">("promotions");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/sales/promotions", { cache: "no-store" });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Unable to load promotions.");
        }

        const payload = (await response.json()) as PromotionsResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load promotions.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const items = activeTab === "promotions" ? data?.promotions ?? [] : data?.closeouts ?? [];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("promotions")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "promotions"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Promotions ({data?.promotions.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("closeouts")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "closeouts"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Closeouts ({data?.closeouts.length ?? 0})
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
              <div className="h-5 w-1/2 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-gray-600">
          No {activeTab} available at this time. Check back soon for special offers!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const discountPercent = item.promotionDiscount ?? 0;
            const daysRemaining = item.promotionEndDate
              ? Math.ceil(
                  (new Date(item.promotionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                )
              : null;

            return (
              <article
                key={item.skuId}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <header className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.isCloseout
                            ? "bg-orange-100 text-orange-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {item.isCloseout ? "🔥 Closeout" : "⭐ Promotion"}
                      </span>
                      {discountPercent > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-semibold text-gray-900">{item.productName}</h2>
                    <p className="text-sm text-gray-600">{item.brand ?? "Brand TBD"}</p>
                    <p className="text-xs text-gray-500">
                      {item.skuCode} • {item.size ?? "—"}
                    </p>
                  </header>

                  {daysRemaining !== null && daysRemaining >= 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-800">
                        ⏰ {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
                      </p>
                    </div>
                  )}

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Price</dt>
                      <dd className="font-semibold text-gray-900">
                        {item.price
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: item.currency,
                            }).format(item.price)
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Availability</dt>
                      <dd>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.inventory.outOfStock
                              ? "bg-rose-100 text-rose-700"
                              : item.inventory.lowStock
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.inventory.outOfStock
                            ? "Out of stock"
                            : `${item.inventory.available} available`}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <footer className="mt-4">
                  <Link
                    href={`/sales/catalog?sku=${item.skuId}`}
                    className="block w-full rounded-md bg-gray-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    View in catalog
                  </Link>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
