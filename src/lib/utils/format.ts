export function formatCurrency(amount: number): string {
  const roundedAmount = Math.round(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatPercentage(value: number, decimals: number = 0): string {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  const rounded = Math.round(value);
  return `${rounded.toFixed(Math.max(decimals, 0))}%`;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const roundedValue = Math.round(value);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedValue);
}

type ProductInfo = {
  brand?: string | null;
  name?: string | null;
};

type SkuInfo = {
  code?: string | null;
  product?: ProductInfo | null;
};

type FormatSkuLabelOptions = {
  includeCode?: boolean;
  separator?: string;
};

const LETTER_PATTERN = /[a-z]/i;

const DEFAULT_SKU_LABEL_OPTIONS: Required<FormatSkuLabelOptions> = {
  includeCode: true,
  separator: ' • ',
};

function normalizeProductText(value?: string | null): string {
  if (!value) {
    return '';
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  // Ignore strings that have no alphabetic characters (e.g., "0 0 0.750 0.00")
  if (!LETTER_PATTERN.test(cleaned)) {
    return '';
  }

  return cleaned;
}

export function formatSkuLabel(
  sku: SkuInfo,
  options: FormatSkuLabelOptions = DEFAULT_SKU_LABEL_OPTIONS
): string {
  const resolvedOptions = { ...DEFAULT_SKU_LABEL_OPTIONS, ...options };

  const code = sku.code?.trim() ?? '';
  const brand = normalizeProductText(sku.product?.brand);
  const name = normalizeProductText(sku.product?.name);

  const labelParts: string[] = [];

  if (brand && name) {
    const nameStartsWithBrand = name.toLowerCase().startsWith(brand.toLowerCase());
    if (!nameStartsWithBrand && brand.toLowerCase() !== name.toLowerCase()) {
      labelParts.push(brand);
    }
  } else if (brand) {
    labelParts.push(brand);
  }

  if (name) {
    labelParts.push(name);
  }

  if (labelParts.length === 0 && code) {
    labelParts.push(code);
  }

  const label = labelParts.join(resolvedOptions.separator);
  const labelIsCodeOnly = labelParts.length === 1 && labelParts[0] === code;

  if (!resolvedOptions.includeCode || !code || labelIsCodeOnly) {
    return label;
  }

  return `${label} (${code})`;
}
