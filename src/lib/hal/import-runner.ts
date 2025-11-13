import path from 'path';
import { pathToFileURL } from 'url';

type ImportCsvModule = typeof import('scripts/import-csv-data');
type ImportSalesReportsFn = ImportCsvModule['importSalesReports'];
type ImportSalesOptions = Parameters<ImportSalesReportsFn>[0];

export type ImportSummary = Awaited<ReturnType<ImportSalesReportsFn>>;

async function importSalesReportsInternal(options: ImportSalesOptions) {
  const modulePath = path.join(process.cwd(), 'scripts/import-csv-data.ts');
  const mod: ImportCsvModule = await import(
    /* webpackIgnore: true */
    pathToFileURL(modulePath).href
  );
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
