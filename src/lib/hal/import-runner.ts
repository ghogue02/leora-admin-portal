import path from 'path';

export type ImportSummary = Awaited<ReturnType<typeof importSalesReportsInternal>>;

async function importSalesReportsInternal(options: any) {
  const modulePath = path.join(process.cwd(), 'scripts/import-csv-data.ts');
  const mod = await import(modulePath);
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
