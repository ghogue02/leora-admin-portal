"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivitySampleSelection, SampleListSummary } from "@/types/activities";
import { formatCurrency } from "@/lib/format";

export type SampleItemsSelectorProps = {
  value: ActivitySampleSelection[];
  onChange: (items: ActivitySampleSelection[]) => void;
};

type SkuOption = {
  id: string;
  code: string;
  name: string | null;
  brand: string | null;
  size: string | null;
  unitOfMeasure: string | null;
  price?: number | null;
};

type CatalogSkuResponse = {
  id: string;
  code: string;
  size?: string | null;
  unitOfMeasure?: string | null;
  product?: {
    name?: string | null;
    brand?: string | null;
  } | null;
  priceListItems?: Array<{
    price?: number | string | null;
  } | null> | null;
};

export default function SampleItemsSelector({ value, onChange }: SampleItemsSelectorProps) {
  const [sampleLists, setSampleLists] = useState<SampleListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [items, setItems] = useState<ActivitySampleSelection[]>(value);
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const pendingChangeRef = useRef<ActivitySampleSelection[] | null>(null);
  const hasAutoSeededRef = useRef(false);

  useEffect(() => {
    setItems((current) => (current === value ? current : value));
  }, [value]);

  const selectedListIdRef = useRef<string | null>(null);
  const valueLength = value.length;
  const valueCountRef = useRef<number>(valueLength);

  useEffect(() => {
    selectedListIdRef.current = selectedListId;
  }, [selectedListId]);

  useEffect(() => {
    valueCountRef.current = valueLength;
    if (valueLength === 0) {
      hasAutoSeededRef.current = false;
    }
  }, [valueLength]);

  const updateItems = useCallback(
    (updater: (current: ActivitySampleSelection[]) => ActivitySampleSelection[]) => {
      setItems((current) => {
        const next = updater(current);
        pendingChangeRef.current = next;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (pendingChangeRef.current) {
      onChange(pendingChangeRef.current);
      pendingChangeRef.current = null;
    }
  }, [items, onChange]);

  const mapListToSelections = useCallback(
    (list: SampleListSummary): ActivitySampleSelection[] =>
      list.items.map((item) => ({
        skuId: item.skuId,
        sampleListItemId: item.id,
        name: item.sku?.name ?? "Unknown Item",
        code: item.sku?.code ?? null,
        brand: item.sku?.brand ?? null,
        selected: true,
        feedback: "",
        followUp: item.defaultFollowUp ?? false,
      })),
    []
  );

  const applyListToSelections = useCallback(
    (list: SampleListSummary) => {
      updateItems(() => mapListToSelections(list));
    },
    [mapListToSelections, updateItems]
  );

  const fetchSampleLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const response = await fetch("/api/sales/sample-lists", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const lists: SampleListSummary[] = data.lists ?? [];
        setSampleLists(lists);

        if (lists.length === 0) {
          setSelectedListId(null);
          return;
        }

        const valueCount = valueCountRef.current;
        const currentSelectedId = selectedListIdRef.current;
        const preferredSelection = lists.find((list) => list.isActive) ?? lists[0];
        const nextSelectedId =
          currentSelectedId && lists.some((list) => list.id === currentSelectedId)
            ? currentSelectedId
            : preferredSelection.id;

        setSelectedListId(nextSelectedId);
        selectedListIdRef.current = nextSelectedId;

        if (!hasAutoSeededRef.current && valueCount === 0) {
          hasAutoSeededRef.current = true;
          const nextSelectedList = lists.find((list) => list.id === nextSelectedId) ?? preferredSelection;
          applyListToSelections(nextSelectedList);
        }
      }
    } catch (error) {
      console.error("Failed to load sample lists", error);
    } finally {
      setLoadingLists(false);
    }
  }, [applyListToSelections]);

  useEffect(() => {
    void fetchSampleLists();
  }, [fetchSampleLists]);

  const fetchSkus = useCallback(
    async (search?: string) => {
      setLoadingSkus(true);
      try {
        const params = new URLSearchParams({ limit: "200" });
        if (search) params.set("search", search);
        const response = await fetch(`/api/sales/catalog/skus?${params.toString()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          const mapped: SkuOption[] = (data.skus ?? []).map((sku: CatalogSkuResponse) => {
            const priceEntry = sku.priceListItems?.find((item): item is { price?: number | string | null } => Boolean(item));
            const rawPrice = priceEntry?.price ?? null;
            const numericPrice =
              typeof rawPrice === "number" ? rawPrice : rawPrice != null ? Number(rawPrice) : null;
            const normalizedPrice =
              typeof numericPrice === "number" && Number.isFinite(numericPrice) ? numericPrice : null;

            return {
              id: sku.id,
              code: sku.code,
              name: sku.product?.name ?? null,
              brand: sku.product?.brand ?? null,
              size: sku.size ?? null,
              unitOfMeasure: sku.unitOfMeasure ?? null,
              price: normalizedPrice,
            };
          });
          setSkuOptions(mapped);
        }
      } catch (error) {
        console.error("Failed to load skus", error);
      } finally {
        setLoadingSkus(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchSkus();
  }, [fetchSkus]);

  useEffect(() => {
    const handler = setTimeout(() => {
      void fetchSkus(skuSearch.trim() ? skuSearch : undefined);
    }, 300);
    return () => clearTimeout(handler);
  }, [skuSearch, fetchSkus]);

  const handleSelectList = useCallback(
    (listId: string) => {
      setSelectedListId(listId);
      const list = sampleLists.find((l) => l.id === listId);
      if (!list) {
        return;
      }
      applyListToSelections(list);
    },
    [applyListToSelections, sampleLists]
  );

  const handleToggleItem = useCallback(
    (skuId: string, selected: boolean) => {
      updateItems((current) =>
        current.map((item) =>
          item.skuId === skuId
            ? {
                ...item,
                selected,
              }
            : item
        )
      );
    },
    [updateItems]
  );

  const handleFeedbackChange = useCallback(
    (skuId: string, feedback: string) => {
      updateItems((current) =>
        current.map((item) => (item.skuId === skuId ? { ...item, feedback } : item))
      );
    },
    [updateItems]
  );

  const handleFollowUpChange = useCallback(
    (skuId: string, followUp: boolean) => {
      updateItems((current) =>
        current.map((item) => (item.skuId === skuId ? { ...item, followUp } : item))
      );
    },
    [updateItems]
  );

  const handleRemoveItem = useCallback(
    (skuId: string) => {
      updateItems((current) => current.filter((item) => item.skuId !== skuId));
    },
    [updateItems]
  );

  const handleAddItem = useCallback(
    (sku: SkuOption) => {
      updateItems((current) => {
        if (current.some((item) => item.skuId === sku.id)) {
          return current;
        }
        return [
          ...current,
          {
            skuId: sku.id,
            sampleListItemId: undefined,
            name: sku.name ?? sku.code ?? "Sample Item",
            code: sku.code ?? null,
            brand: sku.brand ?? null,
            selected: true,
            feedback: "",
            followUp: false,
          },
        ];
      });
    },
    [updateItems]
  );

  const handleSetAllFollowUp = useCallback(
    (flag: boolean) => {
      updateItems((current) => current.map((item) => ({ ...item, followUp: flag })));
    },
    [updateItems],
  );

  const handleSaveAsList = useCallback(async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      alert("Select at least one item to save as a sample list.");
      return;
    }

    const name = window.prompt("Name for this sample list?");
    if (!name || !name.trim()) {
      return;
    }

    setSavingList(true);
    try {
      const response = await fetch("/api/sales/sample-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          items: selectedItems.map((item) => ({
            skuId: item.skuId,
            defaultFollowUp: item.followUp,
          })),
          setActive: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const list = data.list as SampleListSummary;
        setSampleLists((prev) => [list, ...prev]);
        setSelectedListId(list.id);
        selectedListIdRef.current = list.id;
        applyListToSelections(list);
      } else {
        console.error("Failed to save sample list", await response.text());
        alert("Failed to save sample list");
      }
    } catch (error) {
      console.error("Failed to save sample list", error);
      alert("Failed to save sample list");
    } finally {
      setSavingList(false);
    }
  }, [applyListToSelections, items]);

  const availableSkuOptions = useMemo(() => {
    const selectedSkuIds = new Set(items.map((item) => item.skuId));
    return skuOptions.filter((option) => !selectedSkuIds.has(option.id));
  }, [items, skuOptions]);

  const displayedSkuOptions = useMemo(() => {
    if (skuSearch.trim()) {
      return availableSkuOptions;
    }
    return availableSkuOptions.slice(0, 25);
  }, [availableSkuOptions, skuSearch]);

  const showingLimitedResults =
    !skuSearch.trim() && availableSkuOptions.length > displayedSkuOptions.length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="sample-list" className="text-sm font-semibold text-gray-700">
            Sample List
          </label>
          {sampleLists.length > 0 ? (
            <select
              id="sample-list"
              value={selectedListId ?? ""}
              onChange={(e) => {
                const listId = e.target.value;
                if (listId) {
                  handleSelectList(listId);
                }
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loadingLists}
            >
              {selectedListId === null && <option value="">Choose list...</option>}
              {sampleLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} {list.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-gray-500">No saved sample lists yet</span>
          )}
          <button
            type="button"
            onClick={() => void fetchSampleLists()}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60"
            disabled={loadingLists}
          >
            {loadingLists ? "Refreshing..." : "Refresh"}
          </button>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <button
          type="button"
          onClick={handleSaveAsList}
          className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={savingList}
        >
          {savingList ? "Saving..." : "Save as Sample List"}
        </button>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <button
            type="button"
            onClick={() => handleSetAllFollowUp(true)}
            className="font-semibold text-amber-700 hover:text-amber-900"
          >
            Flag all for follow-up
          </button>
          <button
            type="button"
            onClick={() => handleSetAllFollowUp(false)}
            className="font-semibold text-gray-500 hover:text-gray-700"
          >
            Clear all flags
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Sample</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Feedback</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Follow-up</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                  No samples selected yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.skuId} className={!item.selected ? "bg-slate-50" : undefined}>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => handleToggleItem(item.skuId, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.name}
                          {item.brand ? ` • ${item.brand}` : ""}
                        </p>
                        <p className="text-xs text-gray-500">
                          SKU {item.code ?? item.skuId.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      rows={2}
                      value={item.feedback}
                      onChange={(e) => handleFeedbackChange(item.skuId, e.target.value)}
                      placeholder="Customer feedback"
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={item.followUp}
                        onChange={(e) => handleFollowUpChange(item.skuId, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Follow-up
                    </label>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.skuId)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4">
        <p className="text-sm font-semibold text-gray-700">Add Sample Item</p>
        <div className="relative">
          <input
            type="text"
            value={skuSearch}
            onChange={(e) => setSkuSearch(e.target.value)}
            placeholder="Search by name, brand, SKU code, or size"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {skuSearch && (
            <button
              type="button"
              onClick={() => setSkuSearch("")}
              className="absolute right-2 top-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white">
          {loadingSkus ? (
            <div className="px-3 py-4 text-sm text-gray-500">Searching...</div>
          ) : displayedSkuOptions.length > 0 ? (
            displayedSkuOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleAddItem(option)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm transition hover:bg-slate-50 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">
                    {option.name ?? option.code ?? "Sample Item"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {option.brand ? `${option.brand} • ` : ""}
                    SKU {option.code}
                    {option.size ? ` • ${option.size}` : ""}
                    {option.unitOfMeasure ? ` • ${option.unitOfMeasure}` : ""}
                  </span>
                </div>
                {option.price != null ? (
                  <span className="text-xs font-semibold text-gray-700">
                    {formatCurrency(option.price, "USD")}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500">
              {skuSearch.trim()
                ? "No matches found. Adjust your search."
                : "Start typing to search for samples."}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Pull items into this activity and capture feedback or mark follow-up requirements. Only
          checked items will be saved.
          {showingLimitedResults ? " Showing first 25 items — refine your search to see more results." : ""}
        </p>
      </div>
    </section>
  );
}
