import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

type SageExportModule = typeof import('scripts/export-to-sage');

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

export async function exportToSage(tenantId: string, startDate: Date, endDate: Date, exportedBy: string) {
  const modulePath = resolveScriptModulePath('export-to-sage');
  const mod: SageExportModule = await import(
    /* webpackIgnore: true */
    pathToFileURL(modulePath).href
  );
  return mod.exportToSage(tenantId, startDate, endDate, exportedBy);
}
