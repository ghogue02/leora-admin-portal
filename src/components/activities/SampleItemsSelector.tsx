"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function SampleItemsSelector({ value, onChange }: SampleItemsSelectorProps) {
  const [sampleLists, setSampleLists] = useState<SampleListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [items, setItems] = useState<ActivitySampleSelection[]>(value);
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [savingList, setSavingList] = useState(false);

  useEffect(() => {
    setItems(value);
  }, [value]);

  const fetchSampleLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const response = await fetch("/api/sales/sample-lists", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setSampleLists(data.lists ?? []);
      }
    } catch (error) {
      console.error("Failed to load sample lists", error);
    } finally {
      setLoadingLists(false);
    }
  }, []);

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
          const mapped: SkuOption[] = (data.skus ?? []).map((sku: any) => ({
            id: sku.id,
            code: sku.code,
            name: sku.product?.name ?? null,
            brand: sku.product?.brand ?? null,
            size: sku.size ?? null,
            unitOfMeasure: sku.unitOfMeasure ?? null,
            price: sku.priceListItems?.[0]?.price ?? null,
          }));
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

  const updateItems = useCallback(
    (updater: (current: ActivitySampleSelection[]) => ActivitySampleSelection[]) => {
      setItems((current) => {
        const next = updater(current);
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  const handleSelectList = useCallback(
    (listId: string) => {
      setSelectedListId(listId);
      const list = sampleLists.find((l) => l.id === listId);
      if (!list) {
        return;
      }
      const seeded = list.items.map<ActivitySampleSelection>((item) => ({
        skuId: item.skuId,
        sampleListItemId: item.id,
        name: item.sku?.name ?? "Unknown Item",
        code: item.sku?.code ?? null,
        brand: item.sku?.brand ?? null,
        selected: true,
        feedback: "",
        followUp: item.defaultFollowUp ?? false,
      }));
      updateItems(() => seeded);
    },
    [sampleLists, updateItems]
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
        // Align items with saved list ids
        updateItems(() =>
          list.items.map((item) => ({
            skuId: item.skuId,
            sampleListItemId: item.id,
            name: item.sku?.name ?? "Unknown Item",
            code: item.sku?.code ?? null,
            brand: item.sku?.brand ?? null,
            selected: true,
            feedback: "",
            followUp: item.defaultFollowUp ?? false,
          }))
        );
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
  }, [items, updateItems]);

  const availableSkuOptions = useMemo(() => {
    const selectedSkuIds = new Set(items.map((item) => item.skuId));
    return skuOptions.filter((option) => !selectedSkuIds.has(option.id));
  }, [items, skuOptions]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="sample-list" className="text-sm font-semibold text-gray-700">
            Sample List
          </label>
          <select
            id="sample-list"
            value={selectedListId ?? ""}
            onChange={(e) => handleSelectList(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loadingLists}
          >
            <option value="">Choose list...</option>
            {sampleLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} {list.isActive ? "(Active)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void fetchSampleLists()}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            disabled={loadingLists}
          >
            Refresh
          </button>
        </div>
        <button
          type="button"
          onClick={handleSaveAsList}
          className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
          disabled={savingList}
        >
          {savingList ? "Saving..." : "Save as Sample List"}
        </button>
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

      <div className="rounded-lg border border-dashed border-slate-300 p-4">
        <p className="text-sm font-semibold text-gray-700">Add Sample Item</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={skuSearch}
            onChange={(e) => setSkuSearch(e.target.value)}
            placeholder="Search by name, brand, or SKU code"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="relative flex-1">
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onChange={(e) => {
                const sku = availableSkuOptions.find((option) => option.id === e.target.value);
                if (sku) {
                  handleAddItem(sku);
                }
                e.currentTarget.value = "";
              }}
              value=""
              disabled={loadingSkus}
            >
              <option value="">Select item...</option>
              {availableSkuOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.brand ? `${option.brand} ` : ""}
                  {option.name ?? option.code}
                  {option.size ? ` • ${option.size}` : ""}
                  {option.price ? ` • ${formatCurrency(Number(option.price), "USD")}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Pull items into this activity and capture feedback or mark follow-up requirements. Only
          checked items will be saved.
        </p>
      </div>
    </section>
  );
}
