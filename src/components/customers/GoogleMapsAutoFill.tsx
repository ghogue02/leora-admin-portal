"use client";

import { useEffect, useState } from "react";
import { showError, showSuccess } from "@/lib/toast-helpers";
import type { GooglePlaceSuggestion } from "@/lib/maps/googlePlaces";

type GoogleMapsAutoFillProps = {
  variant: "sales" | "admin";
  customerId: string;
  defaultQuery?: string;
  onApply: (suggestion: GooglePlaceSuggestion, options: { overwriteExisting: boolean }) => void;
};

export function GoogleMapsAutoFill({
  variant,
  customerId,
  defaultQuery,
  onApply,
}: GoogleMapsAutoFillProps) {
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [loading, setLoading] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  useEffect(() => {
    setQuery((prev) => {
      if (prev) {
        return prev;
      }
      return defaultQuery ?? "";
    });
  }, [defaultQuery]);

  const endpoint =
    variant === "sales"
      ? `/api/sales/customers/${customerId}/places`
      : `/api/admin/customers/${customerId}/places`;

  const handleFetch = async () => {
    const effectiveQuery = (query || defaultQuery || "").trim();
    if (!effectiveQuery) {
      showError("Enter a business name or address before fetching.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ query: effectiveQuery });
      const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Google Maps lookup failed");
      }

      if (!payload.suggestion) {
        showError("No Google Maps listing found for that search.");
        return;
      }

      onApply(payload.suggestion as GooglePlaceSuggestion, { overwriteExisting });
      showSuccess(
        "Google Maps data applied",
        overwriteExisting
          ? "Customer fields refreshed from Google Maps."
          : "Missing fields filled using Google Maps data."
      );
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Failed to fetch Google Maps data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-emerald-900">
            Search Google Maps
          </label>
          <input
            type="text"
            value={query}
            placeholder="e.g., Bistro A Mano Baltimore"
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-emerald-800">
            We’ll pull the business name, phone, and address directly from Google Maps.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2 text-xs text-emerald-900">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(event) => setOverwriteExisting(event.target.checked)}
              className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            Overwrite filled fields
          </label>
          <button
            type="button"
            onClick={handleFetch}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Fetching…" : "Fetch from Google Maps"}
          </button>
        </div>
      </div>
    </section>
  );
}
