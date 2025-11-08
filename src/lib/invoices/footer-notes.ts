export const DEFAULT_COMPLIANCE_FOOTER_NOTES = [
  'Goods listed received and cash paid in full on date below.',
  'Out-of-state shipment—tax-exempt. Retailer responsible for reporting in destination state.',
  'Accounts over 30 days past due are subject to a 1.5% monthly finance charge.',
];

function sanitizeNotes(notes?: string[] | null): string[] | undefined {
  if (!notes) return undefined;
  const cleaned = notes
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line && line.length));
  return cleaned.length ? cleaned.slice(0, 4) : undefined;
}

export function resolveFooterNotes(
  customNotes?: string[] | null,
  fallbackNotes?: string[]
): string[] {
  const custom = sanitizeNotes(customNotes);
  if (custom && custom.length) {
    return [...new Set(custom)];
  }

  const fallbackClean = sanitizeNotes(fallbackNotes);
  if (fallbackClean && fallbackClean.length) {
    return [...new Set(fallbackClean)];
  }

  return DEFAULT_COMPLIANCE_FOOTER_NOTES;
}
