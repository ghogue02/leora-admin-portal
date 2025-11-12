'use client';

import { useState } from 'react';
import { UploadCloud, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

type ApiResponse = {
  ok: boolean;
  stats: {
    invoicesCreated: number;
    invoicesSkipped: number;
    invoicesFailed: number;
    linesCreated: number;
    suppliersCreated: number;
    productsCreated: number;
    skusCreated: number;
    files: Array<{ file: string; invoicesCreated: number; invoicesSkipped: number; invoicesFailed: number }>;
    missingCustomers: Array<[string, number]>;
    missingSkus: Array<[string, number]>;
    errors: string[];
  };
};

export default function HalImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [autoCreateSkus, setAutoCreateSkus] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [result, setResult] = useState<ApiResponse['stats'] | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Select a CSV file before uploading.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', String(dryRun));
    formData.append('autoCreateSkus', String(autoCreateSkus));
    if (startDate) formData.append('startDate', startDate);
    if (endDate) formData.append('endDate', endDate);

    try {
      const response = await fetch('/api/admin/imports/hal', {
        method: 'POST',
        body: formData,
      });

      const json = (await response.json()) as ApiResponse | { error: string };

      if (!response.ok || !('ok' in json)) {
        throw new Error('error' in json ? json.error : 'Import failed');
      }

      setResult(json.stats);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import file.');
      setStatus('error');
    }
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Imports</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">HAL Sales Report Upload</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload the daily HAL CSV and the importer will dedupe invoices, auto-create missing SKUs, and file the
          orders directly in Supabase. Dry-run mode lets you preview counts without writing data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hal-file" className="font-medium">
                HAL export file
              </Label>
              <Input
                id="hal-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-slate-500">The importer expects the 26-column HAL layout.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date (optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date (optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                id="dry-run"
                label="Dry run"
                description="Parse & validate without writing to the database."
                checked={dryRun}
                onCheckedChange={setDryRun}
              />
              <ToggleRow
                id="auto-create-skus"
                label="Auto-create SKUs"
                description="Generate placeholder suppliers/products/SKUs when HAL uses new codes."
                checked={autoCreateSkus}
                onCheckedChange={setAutoCreateSkus}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={status === 'uploading'}>
                {status === 'uploading' ? (
                  'Importing...'
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Import CSV
                  </>
                )}
              </Button>
              {result && !dryRun && (
                <div className="text-xs text-green-700">Import complete – refresh dashboard to see latest totals.</div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryStat label="Invoices created" value={result.invoicesCreated} />
              <SummaryStat label="Invoices skipped" value={result.invoicesSkipped} />
              <SummaryStat label="Invoices failed" value={result.invoicesFailed} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryStat label="Order lines created" value={result.linesCreated} />
              <SummaryStat label="Products created" value={result.productsCreated} />
              <SummaryStat label="SKUs created" value={result.skusCreated} />
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Files</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {result.files.map((entry) => (
                  <li key={entry.file} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-slate-400" />
                      {entry.file}
                    </span>
                    <span className="text-xs text-slate-500">
                      +{entry.invoicesCreated} / skipped {entry.invoicesSkipped} / failed {entry.invoicesFailed}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {(result.missingCustomers.length > 0 || result.missingSkus.length > 0 || result.errors.length > 0) && (
              <div className="space-y-4">
                {result.missingCustomers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Customers not found</h3>
                    <p className="text-xs text-slate-500">Add aliases or new records before re-running the import.</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {result.missingCustomers.map(([name, count]) => (
                        <li key={name}>
                          {name} <span className="text-xs text-slate-500">({count} rows)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.missingSkus.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">SKUs auto-created or missing</h3>
                    <p className="text-xs text-slate-500">
                      Map these to real products for cleaner reporting (Settings → Catalog).
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {result.missingSkus.map(([sku, count]) => (
                        <li key={sku}>
                          {sku} <span className="text-xs text-slate-500">({count} rows)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Errors</h3>
                    <ul className="mt-2 list-inside list-disc text-sm text-rose-700">
                      {result.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li className="text-xs text-slate-500">
                          …and {result.errors.length - 5} more errors (see server logs).
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}
        </Label>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
