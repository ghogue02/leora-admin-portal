import path from 'path';
import { pathToFileURL } from 'url';

type SageExportModule = typeof import('scripts/export-to-sage');

export async function exportToSage(tenantId: string, startDate: Date, endDate: Date, exportedBy: string) {
  const modulePath = path.join(process.cwd(), 'scripts/export-to-sage.ts');
  const mod: SageExportModule = await import(
    /* webpackIgnore: true */
    pathToFileURL(modulePath).href
  );
  return mod.exportToSage(tenantId, startDate, endDate, exportedBy);
}
