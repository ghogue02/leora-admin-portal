export type OrderUsageCode = 'BTG' | 'WINE_CLUB' | 'SUPPLIER_EVENT' | 'OTHER_ONE_OFF';

export const ORDER_USAGE_OPTIONS: Array<{
  value: OrderUsageCode;
  label: string;
  helper?: string;
  longLabel?: string;
}> = [
  {
    value: 'BTG',
    label: 'BTG',
    helper: 'High-velocity menu placement (By the Glass)',
    longLabel: 'BTG (By the Glass)',
  },
  {
    value: 'WINE_CLUB',
    label: 'Wine Club',
    helper: 'Allocated for subscription or club shipments',
    longLabel: 'Wine Club',
  },
  {
    value: 'SUPPLIER_EVENT',
    label: 'Supplier Event',
    helper: 'Allocated for tastings, dinners, or promo events',
    longLabel: 'Supplier Event',
  },
  {
    value: 'OTHER_ONE_OFF',
    label: 'Other 1× Sale',
    helper: 'Unique one-time sales activity',
    longLabel: 'Other 1× Sale',
  },
];

export const ORDER_USAGE_LABELS: Record<OrderUsageCode, string> = ORDER_USAGE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.longLabel ?? option.label;
    return acc;
  },
  {} as Record<OrderUsageCode, string>,
);

export function isValidOrderUsage(value: string | null | undefined): value is OrderUsageCode {
  return value != null && (ORDER_USAGE_LABELS as Record<string, string>)[value] !== undefined;
}
