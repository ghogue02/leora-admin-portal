type SageExportModule = typeof import('../../../scripts/export-to-sage');

export async function exportToSage(tenantId: string, startDate: Date, endDate: Date, exportedBy: string) {
  const mod: SageExportModule = await import('../../../scripts/export-to-sage');
  return mod.exportToSage(tenantId, startDate, endDate, exportedBy);
}
