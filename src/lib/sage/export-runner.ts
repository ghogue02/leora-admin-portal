import path from 'path';

export async function exportToSage(tenantId: string, startDate: Date, endDate: Date, exportedBy: string) {
  const modulePath = path.join(process.cwd(), 'scripts/export-to-sage.ts');
  const mod = await import(modulePath);
  return mod.exportToSage(tenantId, startDate, endDate, exportedBy);
}
