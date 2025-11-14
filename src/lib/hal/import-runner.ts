import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

type ImportCsvModule = typeof import('scripts/import-csv-data');
type ImportSalesReportsFn = ImportCsvModule['importSalesReports'];
type ImportSalesOptions = Parameters<ImportSalesReportsFn>[0];

export type ImportSummary = Awaited<ReturnType<ImportSalesReportsFn>>;

function resolveScriptModulePath(moduleName: string) {
  const scriptsDir = path.join(process.cwd(), 'scripts');
  const candidates = ['.ts', '.js', '.mjs', '.cjs'].map((ext) =>
    path.join(scriptsDir, `${moduleName}${ext}`)
  );

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate ${moduleName} script in ${scriptsDir}`);
}

async function importSalesReportsInternal(options: ImportSalesOptions) {
  const modulePath = resolveScriptModulePath('import-csv-data');
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
