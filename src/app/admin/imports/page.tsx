"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ImportBatchRecord = {
  id: string;
  dataType: string;
  source: string;
  status: string;
  fileKey: string | null;
  checksum: string | null;
  template: { id: string; name: string } | null;
  initiatedBy:
    | {
        id: string;
        fullName: string | null;
        email: string | null;
      }
    | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  summary: Record<string, unknown> | null;
  _count: { rows: number };
};

type FiltersState = {
  status: "all" | "queued" | "processing" | "completed" | "failed";
  dataType: string;
};

type FormState = {
  dataType: string;
  source: string;
  templateId: string;
  notes: string;
};

export default function AdminImportsPage() {
  const router = useRouter();

  const [batches, setBatches] = useState<ImportBatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>({ status: "all", dataType: "" });
  const [formState, setFormState] = useState<FormState>({
    dataType: "",
    source: "portal.upload",
    templateId: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", "25");
        if (filters.status !== "all") {
          params.set("status", filters.status);
        }
        if (filters.dataType.trim()) {
          params.set("dataType", filters.dataType.trim());
        }

        const response = await fetch(`/api/sales/admin/imports?${params.toString()}`, {
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          window.location.href = "/sales/auth/login?redirect=/admin/imports";
          return;
        }

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload = (await response.json()) as { data: ImportBatchRecord[] };
        setBatches(payload.data ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load import batches.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [filters, refreshIndex]);

  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.dataType.trim()) {
      setError("Data type is required.");
      return;
    }
    if (!formState.source.trim()) {
      setError("Source is required.");
      return;
    }
    if (!selectedFile) {
      setError("Please attach a CSV file to upload.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("dataType", formState.dataType.trim());
      formData.append("source", formState.source.trim());
      if (formState.templateId.trim()) {
        formData.append("templateId", formState.templateId.trim());
      }
      if (formState.notes.trim()) {
        formData.append("notes", formState.notes.trim());
      }

      const response = await fetch("/api/admin/imports/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const errorMessage = body.error || `Failed to create batch (status ${response.status}).`;
        throw new Error(errorMessage);
      }

      setFormState({
        dataType: "",
        source: "portal.upload",
        templateId: "",
        notes: "",
      });
      setSelectedFile(null);
      setFileInputKey((key) => key + 1);
      setRefreshIndex((index) => index + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create import batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const emptyState = !loading && batches.length === 0;

  const statusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-rose-100 text-rose-800";
      case "processing":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formattedBatches = useMemo(() => {
    return batches.map((batch) => ({
      ...batch,
      createdLabel: formatDate(batch.createdAt),
      startedLabel: formatDate(batch.startedAt),
      completedLabel: formatDate(batch.completedAt),
    }));
  }, [batches]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Admin · Imports</p>
          <h1 className="text-2xl font-semibold text-gray-900">Data import oversight</h1>
          <p className="text-sm text-gray-600">
            Track batch uploads and create new import jobs with the portal service account.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRefreshIndex((index) => index + 1)}
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-slate-300"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-slate-300"
          >
            Back to Admin
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Create import batch</h2>
        <p className="text-sm text-gray-600">
          Upload a CSV directly from your computer; we’ll store it in the secure import bucket, checksum it, and register
          the batch for processing.
        </p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleCreateBatch}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Data type<span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
              placeholder="e.g. invoices, orders, payments"
              value={formState.dataType}
              onChange={(event) => handleFormChange("dataType", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Source<span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
              placeholder="e.g. portal.upload, cli.seed"
              value={formState.source}
              onChange={(event) => handleFormChange("source", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Template ID</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
              placeholder="Optional template UUID"
              value={formState.templateId}
              onChange={(event) => handleFormChange("templateId", event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              CSV file<span className="text-rose-500">*</span>
            </label>
            <input
              key={fileInputKey}
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel"
              className="mt-1 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-700"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelectedFile(file ?? null);
              }}
            />
            <p className="mt-1 text-xs text-gray-500">Max 50MB. Supports CSV exports straight from sales reports.</p>
            {selectedFile ? (
              <p className="mt-2 text-xs text-gray-600">
                Selected: {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
              </p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Notes</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
              rows={3}
              placeholder="Optional context shown to operators"
              value={formState.notes}
              onChange={(event) => handleFormChange("notes", event.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60"
            >
              {submitting ? "Creating batch…" : "Create batch"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent batches</h2>
            <p className="text-sm text-gray-600">
              Filter by status or data type to quickly find the latest uploads.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Status</label>
              <select
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as FiltersState["status"] }))}
              >
                <option value="all">All</option>
                <option value="queued">Queued</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Data type</label>
              <input
                type="text"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
                placeholder="Filter"
                value={filters.dataType}
                onChange={(event) => setFilters((prev) => ({ ...prev, dataType: event.target.value }))}
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-6 rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-gray-500">
            Loading batches…
          </div>
        )}

        {emptyState && (
          <div className="mt-6 rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-gray-500">
            No batches have been created yet.
          </div>
        )}

        {!loading && batches.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Data type</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Rows</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Window</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {formattedBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{batch.dataType}</p>
                      <p className="text-xs text-gray-500">
                        {batch.template?.name ? `Template · ${batch.template.name}` : `Batch ${batch.id}`}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <p>{batch.source}</p>
                      {batch.fileKey ? <p className="text-xs text-gray-500 truncate">{batch.fileKey}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(batch.status)}`}
                      >
                        {batch.status}
                      </span>
                      {formatSummary(batch.summary) ? (
                        <p className="mt-1 text-xs text-gray-500">{formatSummary(batch.summary)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-gray-700">{batch._count?.rows ?? 0}</td>
                    <td className="px-4 py-4 text-gray-700">
                      <p>{batch.createdLabel}</p>
                      {batch.checksum ? (
                        <p className="text-xs text-gray-500">Checksum {batch.checksum.slice(0, 8)}…</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <p>Start: {batch.startedLabel || "—"}</p>
                      <p>End: {batch.completedLabel || "—"}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {batch.initiatedBy ? (
                        <>
                          <p>{batch.initiatedBy.fullName || "User"}</p>
                          <p className="text-xs text-gray-500">{batch.initiatedBy.email}</p>
                        </>
                      ) : (
                        <p className="text-gray-500">System</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function formatSummary(summary: Record<string, unknown> | null | undefined) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return "";
  }
  const entries = Object.entries(summary);
  if (entries.length === 0) return "";
  return entries
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}
