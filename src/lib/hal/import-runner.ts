import path from 'path';

type ImportCsvModule = typeof import('../../../scripts/import-csv-data');
type ImportSalesReportsFn = ImportCsvModule['importSalesReports'];
type ImportSalesOptions = Parameters<ImportSalesReportsFn>[0];

export type ImportSummary = Awaited<ReturnType<ImportSalesReportsFn>>;

async function importSalesReportsInternal(options: ImportSalesOptions) {
  const mod: ImportCsvModule = await import('../../../scripts/import-csv-data');
  return mod.importSalesReports(options);
}

export async function importHalCsv({
  file,
  tenantId,
  dryRun,
  autoCreateSkus,
  startDate,
  endDate,
}: {
  file: string;
  tenantId: string;
  dryRun: boolean;
  autoCreateSkus: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  const resolvedFile = path.resolve(file);
  return importSalesReportsInternal({
    files: [resolvedFile],
    tenantId,
    dryRun,
    autoCreateSkus,
    startDate,
    endDate,
  });
}

export { importSalesReportsInternal as importSalesReports };
