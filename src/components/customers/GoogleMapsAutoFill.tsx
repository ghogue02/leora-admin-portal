"use client";

import { useEffect, useMemo, useState } from "react";
import { showError, showSuccess } from "@/lib/toast-helpers";
import type { GooglePlacePrediction, GooglePlaceSuggestion } from "@/lib/maps/googlePlaces";

type GoogleMapsAutoFillProps = {
  variant: "sales" | "admin";
  customerId?: string;
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
  const [suggestions, setSuggestions] = useState<GooglePlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const searchEndpoint = useMemo(
    () => (variant === "sales" ? "/api/sales/customers/places/search" : "/api/admin/customers/places/search"),
    [variant]
  );
  const detailsEndpoint = useMemo(
    () => (variant === "sales" ? "/api/sales/customers/places/details" : "/api/admin/customers/places/details"),
    [variant]
  );
  const geocodeEndpoint = useMemo(() => {
    if (!customerId) return null;
    return variant === "sales"
      ? `/api/sales/customers/${customerId}/places`
      : `/api/admin/customers/${customerId}/places`;
  }, [customerId, variant]);

  useEffect(() => {
    setQuery((prev) => (prev ? prev : defaultQuery ?? ""));
  }, [defaultQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const debounce = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ query: trimmed });
        const response = await fetch(`${searchEndpoint}?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? "Autocomplete failed");
        }
        setSuggestions(payload.suggestions ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Google Maps autocomplete error:", error);
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [query, searchEndpoint]);

  const fetchDetails = async (options: { placeId?: string }) => {
    const effectiveQuery = (query || defaultQuery || "").trim();
    if (!options.placeId && !effectiveQuery) {
      showError("Enter a business name or address before fetching.");
      return;
    }

    setApplying(true);
    try {
      const params = new URLSearchParams();
      if (options.placeId) {
        params.set("placeId", options.placeId);
      } else if (effectiveQuery) {
        params.set("query", effectiveQuery);
      }

      const response = await fetch(`${detailsEndpoint}?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Google Maps lookup failed");
      }

      if (!payload.suggestion) {
        showError("No Google Maps listing found for that search.");
        return;
      }

      onApply(payload.suggestion as GooglePlaceSuggestion, { overwriteExisting });

      if (geocodeEndpoint && options.placeId) {
        const geoParams = new URLSearchParams({ placeId: options.placeId });
        fetch(`${geocodeEndpoint}?${geoParams.toString()}`, { cache: "no-store" }).catch(() => undefined);
      }

      showSuccess(
        "Google Maps data applied",
        overwriteExisting
          ? "Customer fields refreshed from Google Maps."
          : "Missing fields filled using Google Maps data."
      );
    } catch (error) {
      console.error("Google Maps detail fetch error:", error);
      showError(error instanceof Error ? error.message : "Failed to fetch Google Maps data");
    } finally {
      setApplying(false);
    }
  };

  const handleSuggestionClick = (prediction: GooglePlacePrediction) => {
    setQuery(prediction.description);
    setSuggestions([]);
    fetchDetails({ placeId: prediction.placeId });
  };

  return (
    <section className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-emerald-900">
            Search Google Maps
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              placeholder="e.g., Bistro A Mano Baltimore"
              onChange={(event) => setQuery(event.target.value)}
              className="mt-1 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-emerald-200 bg-white text-sm shadow-lg">
                {suggestions.map((prediction) => (
                  <li key={prediction.placeId}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50"
                      onClick={() => handleSuggestionClick(prediction)}
                    >
                      <span className="block font-medium text-gray-900">{prediction.primaryText}</span>
                      <span className="block text-xs text-gray-600">{prediction.secondaryText}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-1 text-xs text-emerald-800">
            We’ll pull the business name, phone, and address directly from Google Maps.
            {searching && <span className="ml-2 text-emerald-600">Searching…</span>}
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
            onClick={() => fetchDetails({})}
            disabled={applying}
            className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {applying ? "Applying…" : "Apply data"}
          </button>
        </div>
      </div>
    </section>
  );
}
