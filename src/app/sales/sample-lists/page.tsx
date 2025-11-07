"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { SampleListSummary } from "@/types/activities";

type SampleListRecord = SampleListSummary & {
  createdAt?: string;
  updatedAt?: string;
};

type PriceListOption = {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
};

type SkuOption = {
  id: string;
  code: string;
  name: string | null;
  brand: string | null;
  size: string | null;
  unitOfMeasure: string | null;
};

export default function SampleListsPage() {
  const [lists, setLists] = useState<SampleListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTechSheetModal, setShowTechSheetModal] = useState(false);
  const [selectedList, setSelectedList] = useState<SampleListRecord | null>(null);
  const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);
  const [loadingPriceLists, setLoadingPriceLists] = useState(false);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales/sample-lists", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load sample lists");
      const data = await response.json();
      setLists(data.lists ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load sample lists");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPriceLists = useCallback(async () => {
    setLoadingPriceLists(true);
    try {
      const response = await fetch("/api/sales/price-lists", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load price lists");
      const data = await response.json();
      setPriceLists(
        (data.priceLists ?? []).map((list: any) => ({
          id: list.id,
          name: list.name,
          currency: list.currency,
          isDefault: Boolean(list.isDefault),
        })),
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to load price lists");
    } finally {
      setLoadingPriceLists(false);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    void loadPriceLists();
  }, [loadPriceLists]);

  useEffect(() => {
    if (!selectedList) return;
    const latest = lists.find((list) => list.id === selectedList.id);
    if (latest && latest !== selectedList) {
      setSelectedList(latest);
    }
  }, [lists, selectedList]);

  const handleSetActive = async (list: SampleListRecord) => {
    try {
      const response = await fetch(`/api/sales/sample-lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!response.ok) throw new Error("Failed to set list active");
      toast.success(`"${list.name}" is now your active sample list`);
      void loadLists();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update sample list");
    }
  };

  const handleDelete = async (list: SampleListRecord) => {
    if (!confirm(`Delete sample list "${list.name}"?`)) return;
    try {
      const response = await fetch(`/api/sales/sample-lists/${list.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete list");
      toast.success("Sample list deleted");
      setLists((prev) => prev.filter((item) => item.id !== list.id));
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete list");
    }
  };

  const openTechSheetModal = (list: SampleListRecord) => {
    setSelectedList(list);
    setShowTechSheetModal(true);
  };

  const handleListPreferencesUpdate = (listId: string, preferredPriceListIds: string[]) => {
    setLists((prev) =>
      prev.map((entry) =>
        entry.id === listId ? { ...entry, preferredPriceListIds } : entry,
      ),
    );
  };

  const defaultPriceListId = useMemo(() => {
    if (priceLists.length === 0) return "";
    const preferred = priceLists.find((list) => list.isDefault);
    return (preferred ?? priceLists[0]).id;
  }, [priceLists]);

  const priceListLookup = useMemo(
    () => new Map(priceLists.map((list) => [list.id, list])),
    [priceLists],
  );

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sales/samples"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Samples
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create List
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading sample lists...
          </div>
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900">No sample lists yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Create a list of SKUs once and reuse it for every ride-along, price sheet, or tech sheet export.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Start a Sample List
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lists.map((list) => (
            <article key={list.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{list.name}</h2>
                    {list.isActive && (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {list.items.length} item{list.items.length === 1 ? "" : "s"} • Last updated{" "}
                    {list.updatedAt ? format(new Date(list.updatedAt), "MMM d, yyyy") : "recently"}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(list)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label={`Delete ${list.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 divide-y divide-gray-100">
                {list.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.sku?.name ?? "SKU"}</p>
                      <p className="text-xs text-gray-500">{item.sku?.brand ?? item.sku?.code}</p>
                    </div>
                    <span className="text-xs text-gray-400">{item.sku?.code}</span>
                  </div>
                ))}
                {list.items.length > 4 && (
                  <p className="pt-2 text-xs text-gray-400">
                    +{list.items.length - 4} more item{list.items.length - 4 === 1 ? "" : "s"}
                  </p>
                )}
              </div>

              {list.preferredPriceListIds && list.preferredPriceListIds.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  Default price lists:{" "}
                  {list.preferredPriceListIds
                    .map((id) => priceListLookup.get(id)?.name ?? "Price List")
                    .join(", ")}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => openTechSheetModal(list)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Tech Sheet
                </button>
                {!list.isActive && (
                  <button
                    onClick={() => handleSetActive(list)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-blue-600 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Make Active
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateListModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
          }}
          onCreated={() => {
            setShowCreateModal(false);
            void loadLists();
          }}
          creating={creating}
          setCreating={setCreating}
          priceLists={priceLists}
          defaultPriceListId={defaultPriceListId}
          loadingPriceLists={loadingPriceLists}
        />
      )}

      {showTechSheetModal && selectedList && (
        <TechSheetModal
          open={showTechSheetModal}
          list={selectedList}
          priceLists={priceLists}
          defaultPriceListId={defaultPriceListId}
          loadingPriceLists={loadingPriceLists}
          onClose={() => {
            setSelectedList(null);
            setShowTechSheetModal(false);
          }}
          onPreferencesUpdated={handleListPreferencesUpdate}
        />
      )}
    </main>
  );
}

type CreateListModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  creating: boolean;
  setCreating: (value: boolean) => void;
  priceLists: PriceListOption[];
  defaultPriceListId: string;
  loadingPriceLists: boolean;
};

function CreateListModal({
  open,
  onClose,
  onCreated,
  creating,
  setCreating,
  priceLists,
  defaultPriceListId,
  loadingPriceLists,
}: CreateListModalProps) {
  const [name, setName] = useState("");
  const [setActive, setSetActive] = useState(true);
  const [skuResults, setSkuResults] = useState<SkuOption[]>([]);
  const [selected, setSelected] = useState<SkuOption[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [preferredPriceListIds, setPreferredPriceListIds] = useState<string[]>(
    defaultPriceListId ? [defaultPriceListId] : [],
  );

  const fetchSkus = useCallback(
    async (query?: string) => {
      setLoadingSkus(true);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (query) params.set("search", query);
        const response = await fetch(`/api/sales/catalog/skus?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load products");
        const data = await response.json();
        const mapped: SkuOption[] = (data.skus ?? []).map((sku: any) => ({
          id: sku.id,
          code: sku.code,
          name: sku.product?.name ?? sku.code,
          brand: sku.product?.brand ?? null,
          size: sku.size,
          unitOfMeasure: sku.unitOfMeasure,
        }));
        setSkuResults(mapped);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load catalog SKUs");
      } finally {
        setLoadingSkus(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchSkus();
  }, [fetchSkus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSkus(skuSearch.trim() ? skuSearch : undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [skuSearch, fetchSkus]);

  const computeDefaultPriceListSelection = () => {
    const defaults = priceLists.filter((list) => list.isDefault).map((list) => list.id);
    if (defaults.length > 0) {
      return defaults;
    }
    if (defaultPriceListId) {
      return [defaultPriceListId];
    }
    if (priceLists.length > 0) {
      return [priceLists[0].id];
    }
    return [];
  };

  useEffect(() => {
    if (!open) return;
    setPreferredPriceListIds(computeDefaultPriceListSelection());
  }, [defaultPriceListId, priceLists, open]);

  const togglePreferredPriceList = (id: string) => {
    setPreferredPriceListIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const resetForm = () => {
    setName("");
    setSetActive(true);
    setSelected([]);
    setSkuSearch("");
    setPreferredPriceListIds(computeDefaultPriceListSelection());
  };

  const addSku = (sku: SkuOption) => {
    setSelected((prev) => (prev.some((item) => item.id === sku.id) ? prev : [...prev, sku]));
  };

  const removeSku = (id: string) => {
    setSelected((prev) => prev.filter((item) => item.id !== id));
  };

  const moveSku = (index: number, direction: "up" | "down") => {
    setSelected((prev) => {
      const next = [...prev];
      const newIndex = direction === "up" ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selected.length === 0) {
      toast.error("Add at least one SKU to your sample list");
      return;
    }

    if (priceLists.length > 0 && preferredPriceListIds.length === 0) {
      toast.error("Select at least one price list");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/sales/sample-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          setActive,
          items: selected.map((sku) => ({
            skuId: sku.id,
          })),
          preferredPriceListIds,
        }),
      });

      if (!response.ok) throw new Error("Creation failed");

      toast.success("Sample list created");
      resetForm();
      onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create sample list");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create Sample List</h2>
            <p className="text-sm text-gray-500">
              Give the list a name, select SKUs, and save it for repeated use.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 p-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900">List name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 6 November 2025 Ride Along"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={setActive}
                  onChange={(e) => setSetActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Make this my active list by default
              </label>
              <div>
                <label className="text-sm font-semibold text-gray-900">
                  Default price lists
                </label>
                {loadingPriceLists ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading price lists...
                  </div>
                ) : priceLists.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No price lists available yet. Add pricing data to enable exports.
                  </p>
                ) : (
                  <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-2">
                    {priceLists.map((list) => (
                      <label key={list.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          checked={preferredPriceListIds.includes(list.id)}
                          onChange={() => togglePreferredPriceList(list.id)}
                        />
                        <span>
                          {list.name}{" "}
                          <span className="text-xs text-gray-400">{list.currency}</span>
                        </span>
                        {list.isDefault && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                            Tenant default
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  These price lists will be selected automatically when exporting tech sheets.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-semibold text-gray-800">Tip</p>
                <p className="mt-1">
                  Use active lists to auto-populate sampling activities and quick-assign flows.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">Search catalog</label>
              <input
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                placeholder="Search by product or SKU code"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                {loadingSkus ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading catalog...
                  </div>
                ) : skuResults.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-gray-500">No matches</p>
                ) : (
                  skuResults.map((sku) => (
                    <button
                      key={sku.id}
                      type="button"
                      onClick={() => addSku(sku)}
                      className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{sku.name}</p>
                        <p className="text-xs text-gray-500">
                          {sku.brand ? `${sku.brand} • ` : ""}
                          {sku.code}
                        </p>
                      </div>
                      <span className="text-xs text-blue-600">Add</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <h3 className="text-sm font-semibold text-gray-900">Selected items</h3>
            {selected.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No SKUs added yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {selected.map((sku, index) => (
                  <li key={sku.id} className="flex items-center justify-between px-4 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sku.name}</p>
                      <p className="text-xs text-gray-500">
                        {sku.brand ? `${sku.brand} • ` : ""}
                        {sku.code}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveSku(index, "up")}
                        disabled={index === 0}
                        className="rounded-md border border-gray-200 p-1 text-gray-500 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSku(index, "down")}
                        disabled={index === selected.length - 1}
                        className="rounded-md border border-gray-200 p-1 text-gray-500 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSku(sku.id)}
                        className="rounded-md border border-gray-200 p-1 text-red-500"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Save list
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type TechSheetModalProps = {
  open: boolean;
  list: SampleListRecord;
  priceLists: PriceListOption[];
  defaultPriceListId: string;
  loadingPriceLists: boolean;
  onClose: () => void;
  onPreferencesUpdated: (listId: string, preferredPriceListIds: string[]) => void;
};

function TechSheetModal({
  open,
  list,
  priceLists,
  defaultPriceListId,
  loadingPriceLists,
  onClose,
  onPreferencesUpdated,
}: TechSheetModalProps) {
  const [selectedPriceListIds, setSelectedPriceListIds] = useState<string[]>([]);
  const [layout, setLayout] = useState<"multi" | "single">("multi");
  const [hideAbove, setHideAbove] = useState("12");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const listPreferred = Array.isArray(list.preferredPriceListIds) ? list.preferredPriceListIds : [];
    const validPreferred = listPreferred.filter((id) => priceLists.some((pl) => pl.id === id));
    if (validPreferred.length > 0) {
      setSelectedPriceListIds(validPreferred);
    } else if (defaultPriceListId) {
      setSelectedPriceListIds([defaultPriceListId]);
    } else if (priceLists.length > 0) {
      setSelectedPriceListIds([priceLists[0].id]);
    } else {
      setSelectedPriceListIds([]);
    }
  }, [list.preferredPriceListIds, priceLists, defaultPriceListId, open, list]);

  if (!open) return null;

  const toggleSelectedPriceList = (id: string) => {
    setSelectedPriceListIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, idx) => value === sortedB[idx]);
  };

  const handleDownload = async () => {
    if (selectedPriceListIds.length === 0) {
      toast.error("Choose at least one price list to continue");
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch(`/api/sales/sample-lists/${list.id}/tech-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceListIds: selectedPriceListIds,
          layout,
          hideDiscountAbove: hideAbove ? Number(hideAbove) : undefined,
        }),
      });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = list.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.href = url;
      link.download = `${safeName || "tech-sheet"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Tech sheet exported");

      const stored = Array.isArray(list.preferredPriceListIds) ? list.preferredPriceListIds : [];
      if (!arraysEqual(selectedPriceListIds, stored)) {
        const persistResponse = await fetch(`/api/sales/sample-lists/${list.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredPriceListIds: selectedPriceListIds }),
        });
        if (persistResponse.ok) {
          onPreferencesUpdated(list.id, selectedPriceListIds);
        } else {
          console.warn("Failed to persist preferred price lists for sample list", list.id);
        }
      }

      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Unable to generate tech sheet");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generate Tech Sheet</h2>
            <p className="text-sm text-gray-500">{list.name}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="space-y-4 p-6">
              <div>
                <label className="text-sm font-semibold text-gray-900">Price list</label>
                {loadingPriceLists ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading price lists...
                  </div>
                ) : (
                  <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-2">
                    {priceLists.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No price lists available. Add pricing data to export tech sheets.
                      </p>
                    ) : (
                      priceLists.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            checked={selectedPriceListIds.includes(option.id)}
                            onChange={() => toggleSelectedPriceList(option.id)}
                          />
                          <span>
                            {option.name}{" "}
                            <span className="text-xs text-gray-400">{option.currency}</span>
                          </span>
                          {option.isDefault && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                              Tenant default
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  We'll remember these selections the next time you export this list.
                </p>
              </div>

          <div>
            <label className="text-sm font-semibold text-gray-900">Layout</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLayout("multi")}
                className={`rounded-md border px-4 py-3 text-sm ${
                  layout === "multi"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                Multi-item per page (fast)
              </button>
              <button
                type="button"
                onClick={() => setLayout("single")}
                className={`rounded-md border px-4 py-3 text-sm ${
                  layout === "single"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                One item per page (detailed)
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-900">Hide quantity discounts above</label>
            <input
              type="number"
              min="1"
              value={hideAbove}
              onChange={(e) => setHideAbove(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 12"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use this to only show frontline pricing for small accounts.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || selectedPriceListIds.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading && <Loader2 className="h-4 w-4 animate-spin" />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
