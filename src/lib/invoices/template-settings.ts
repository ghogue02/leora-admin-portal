import { InvoiceFormatType, Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { COLUMN_PRESETS, getColumnPreset, type InvoiceColumnId } from './column-presets';

const BASE_TEMPLATE_VALUES = [
  'STANDARD',
  'VA_ABC_INSTATE_FULL',
  'VA_ABC_INSTATE_CONDENSED',
  'VA_ABC_TAX_EXEMPT',
] as const;

export type InvoiceTemplateBase =
  typeof BASE_TEMPLATE_VALUES[number];

const paletteSchema = z.object({
  tableHeaderBackground: z.string().min(1).default('#FFFFFF'),
  sectionHeaderBackground: z.string().min(1).default('#FFFFFF'),
  accentTextColor: z.string().min(1).default('#000000'),
  borderColor: z.string().min(1).default('#000000'),
});

const optionsSchema = z.object({
  showCustomerIdColumn: z.boolean().default(true),
  signatureStyle: z.enum(['full', 'condensed']).default('full'),
});

const columnSchema = z.object({
  id: z
    .string()
    .min(1)
    .refine(
      (value): value is InvoiceColumnId => COLUMN_PRESETS.some((preset) => preset.id === value),
      'Unknown invoice column id'
    ),
  label: z.string().min(1),
  width: z.number().min(4).max(60),
  align: z.enum(['left', 'center', 'right']).optional(),
  enabled: z.boolean().optional(),
});

const sectionsSchema = z.object({
  showBillTo: z.boolean().default(true),
  showShipTo: z.boolean().default(true),
  showCustomerInfo: z.boolean().default(true),
  showTotals: z.boolean().default(true),
  showSignature: z.boolean().default(true),
  showComplianceNotice: z.boolean().default(true),
});

const headerNoteSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  text: z.string().default(''),
  enabled: z.boolean().default(false),
  position: z.enum(['beforeHeader', 'afterHeader', 'beforeTable', 'afterTable']).default('beforeTable'),
});

const layoutSchema = z.object({
  sections: sectionsSchema.partial().optional(),
  columns: z.array(columnSchema).optional(),
  headerNotes: z.array(headerNoteSchema).optional(),
});

const templateConfigSchema = z.object({
  baseTemplate: z.enum(BASE_TEMPLATE_VALUES).optional(),
  palette: paletteSchema.partial().optional(),
  options: optionsSchema.partial().optional(),
  layout: layoutSchema.optional(),
});

const updatePayloadSchema = z.object({
  baseTemplate: z.enum(BASE_TEMPLATE_VALUES),
  palette: paletteSchema.partial().optional(),
  options: optionsSchema.partial().optional(),
  layout: layoutSchema.optional(),
});

export type InvoiceTemplateColumnConfig = {
  id: InvoiceColumnId;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  enabled: boolean;
};

export type InvoiceTemplateLayout = {
  sections: z.infer<typeof sectionsSchema>;
  columns: InvoiceTemplateColumnConfig[];
  headerNotes: Array<{
    id: string;
    label: string;
    text: string;
    enabled: boolean;
    position: 'beforeHeader' | 'afterHeader' | 'beforeTable' | 'afterTable';
  }>;
};

export type InvoiceTemplateConfig = {
  baseTemplate: InvoiceTemplateBase;
  palette: z.infer<typeof paletteSchema>;
  options: z.infer<typeof optionsSchema>;
  layout: InvoiceTemplateLayout;
};

export interface InvoiceTemplateSettings extends InvoiceTemplateConfig {
  formatType: InvoiceFormatType;
  templateId?: string;
  updatedAt?: Date | null;
}

type PrismaLike = PrismaClient | Prisma.TransactionClient;

const DEFAULT_PALETTE = paletteSchema.parse({});
const DEFAULT_OPTIONS = optionsSchema.parse({});

const DEFAULT_SECTIONS = sectionsSchema.parse({});

const DEFAULT_HEADER_NOTES: InvoiceTemplateLayout['headerNotes'] = [
  {
    id: 'general-note',
    label: 'General Note',
    text: '',
    enabled: false,
    position: 'beforeTable',
  },
];

function columnConfig(
  id: InvoiceColumnId,
  overrides: Partial<Omit<InvoiceTemplateColumnConfig, 'id'>> = {}
): InvoiceTemplateColumnConfig {
  const preset = getColumnPreset(id);
  return {
    id,
    label: overrides.label ?? preset.label,
    width: overrides.width ?? preset.defaultWidth,
    align: overrides.align ?? preset.defaultAlign ?? 'left',
    enabled: overrides.enabled ?? true,
  };
}

const DEFAULT_LAYOUTS: Record<InvoiceFormatType, InvoiceTemplateLayout> = {
  STANDARD: {
    sections: {
      ...DEFAULT_SECTIONS,
      showShipTo: false,
      showCustomerInfo: true,
    },
    columns: [
      columnConfig('quantity', { width: 12 }),
      columnConfig('sku', { width: 16 }),
      columnConfig('productName', { width: 40, label: 'Description' }),
      columnConfig('unitPrice', { width: 15 }),
      columnConfig('lineTotal', { width: 17 }),
    ],
    headerNotes: [...DEFAULT_HEADER_NOTES],
  },
  VA_ABC_INSTATE: {
    sections: {
      ...DEFAULT_SECTIONS,
    },
    columns: [
      columnConfig('quantity', { width: 10, label: 'No. bottles' }),
      columnConfig('size', { width: 9 }),
      columnConfig('abcCode', { width: 12, label: 'Code' }),
      columnConfig('sku', { width: 10 }),
      columnConfig('productName', { width: 35, label: 'Brand & type' }),
      columnConfig('liters', { width: 10 }),
      columnConfig('unitPrice', { width: 7 }),
      columnConfig('lineTotal', { width: 7, label: 'Amount' }),
    ],
    headerNotes: [...DEFAULT_HEADER_NOTES],
  },
  VA_ABC_TAX_EXEMPT: {
    sections: {
      ...DEFAULT_SECTIONS,
    },
    columns: [
      columnConfig('cases', { width: 10, label: 'Total cases' }),
      columnConfig('totalBottles', { width: 10, label: 'Total bottles' }),
      columnConfig('size', { width: 9, label: 'Size (L)' }),
      columnConfig('abcCode', { width: 12, label: 'Code number' }),
      columnConfig('sku', { width: 10, label: 'SKU' }),
      columnConfig('productName', { width: 27, label: 'Brand and type' }),
      columnConfig('liters', { width: 9, label: 'Liters' }),
      columnConfig('bottlePrice', { width: 7, label: 'Price each' }),
      columnConfig('lineTotal', { width: 6, label: 'Amount' }),
    ],
    headerNotes: [...DEFAULT_HEADER_NOTES],
  },
};

function getDefaultLayout(format: InvoiceFormatType): InvoiceTemplateLayout {
  return {
    sections: { ...DEFAULT_LAYOUTS[format].sections },
    columns: DEFAULT_LAYOUTS[format].columns.map((col) => ({ ...col })),
    headerNotes: DEFAULT_LAYOUTS[format].headerNotes.map((note) => ({ ...note })),
  };
}

function mergeLayout(
  format: InvoiceFormatType,
  layout: z.infer<typeof layoutSchema> | null | undefined
): InvoiceTemplateLayout {
  const defaults = getDefaultLayout(format);
  if (!layout) {
    return defaults;
  }

  const sections = {
    ...defaults.sections,
    ...(layout.sections ?? {}),
  };

  const providedColumns = layout.columns ?? [];
  const seen = new Set<InvoiceColumnId>();
  const mergedColumns: InvoiceTemplateColumnConfig[] = [];

  for (const column of providedColumns) {
    const id = column.id as InvoiceColumnId;
    if (!COLUMN_PRESETS.some((preset) => preset.id === id)) {
      continue;
    }
    if (seen.has(id)) continue;
    const preset = getColumnPreset(id);
    const defaultColumn = defaults.columns.find((item) => item.id === id);

    mergedColumns.push({
      id,
      label: column.label ?? defaultColumn?.label ?? preset.label,
      width: column.width ?? defaultColumn?.width ?? preset.defaultWidth,
      align: column.align ?? defaultColumn?.align ?? preset.defaultAlign ?? 'left',
      enabled: column.enabled ?? defaultColumn?.enabled ?? true,
    });
    seen.add(id);
  }

  // Append defaults not present
  for (const defaultColumn of defaults.columns) {
    if (!seen.has(defaultColumn.id)) {
      mergedColumns.push({ ...defaultColumn });
      seen.add(defaultColumn.id);
    }
  }

  // Ensure at least one column
  if (mergedColumns.length === 0) {
    mergedColumns.push(...defaults.columns.map((col) => ({ ...col })));
  }

  const headerNotes = layout.headerNotes
    ? layout.headerNotes.map((note) => ({
        id: note.id,
        label: note.label,
        text: note.text ?? '',
        enabled: note.enabled ?? false,
        position: note.position ?? 'beforeTable',
      }))
    : defaults.headerNotes.map((note) => ({ ...note }));

  return {
    sections,
    columns: mergedColumns,
    headerNotes,
  };
}

const DEFAULT_SETTINGS: Record<InvoiceFormatType, InvoiceTemplateSettings> = {
  STANDARD: {
    formatType: 'STANDARD',
    baseTemplate: 'STANDARD',
    palette: {
      ...DEFAULT_PALETTE,
    },
    options: {
      ...DEFAULT_OPTIONS,
      showCustomerIdColumn: false,
    },
    layout: getDefaultLayout('STANDARD'),
  },
  VA_ABC_INSTATE: {
    formatType: 'VA_ABC_INSTATE',
    baseTemplate: 'VA_ABC_INSTATE_FULL',
    palette: {
      ...DEFAULT_PALETTE,
    },
    options: {
      ...DEFAULT_OPTIONS,
      showCustomerIdColumn: true,
      signatureStyle: 'full',
    },
    layout: getDefaultLayout('VA_ABC_INSTATE'),
  },
  VA_ABC_TAX_EXEMPT: {
    formatType: 'VA_ABC_TAX_EXEMPT',
    baseTemplate: 'VA_ABC_TAX_EXEMPT',
    palette: {
      ...DEFAULT_PALETTE,
    },
    options: {
      ...DEFAULT_OPTIONS,
      showCustomerIdColumn: false,
    },
    layout: getDefaultLayout('VA_ABC_TAX_EXEMPT'),
  },
};

const templateNameForFormat = (format: InvoiceFormatType) => `format:${format}`;

function mergeWithDefaults(
  format: InvoiceFormatType,
  config: Partial<InvoiceTemplateConfig> | null | undefined,
  meta?: { templateId?: string; updatedAt?: Date | null }
): InvoiceTemplateSettings {
  const defaults = DEFAULT_SETTINGS[format];
  const palette = {
    ...defaults.palette,
    ...(config?.palette ?? {}),
  };
  const options = {
    ...defaults.options,
    ...(config?.options ?? {}),
  };
  const layout = mergeLayout(format, config?.layout);

  return {
    formatType: format,
    baseTemplate: config?.baseTemplate ?? defaults.baseTemplate,
    palette,
    options,
    layout,
    templateId: meta?.templateId,
    updatedAt: meta?.updatedAt ?? null,
  };
}

export async function getInvoiceTemplateSettings(
  prisma: PrismaLike,
  tenantId: string,
  formatType: InvoiceFormatType
): Promise<InvoiceTemplateSettings> {
  const existing = await prisma.invoiceTemplate.findFirst({
    where: {
      tenantId,
      name: templateNameForFormat(formatType),
    },
  });

  if (!existing) {
    return DEFAULT_SETTINGS[formatType];
  }

  const parsed = templateConfigSchema.safeParse(existing.config);
  if (!parsed.success) {
    console.warn(
      '[invoice-template-settings] Invalid config encountered, falling back to defaults',
      parsed.error.format()
    );
    return mergeWithDefaults(formatType, null, {
      templateId: existing.id,
      updatedAt: existing.updatedAt,
    });
  }

  return mergeWithDefaults(formatType, parsed.data, {
    templateId: existing.id,
    updatedAt: existing.updatedAt,
  });
}

export async function listInvoiceTemplateSettings(
  prisma: PrismaLike,
  tenantId: string
): Promise<InvoiceTemplateSettings[]> {
  const formats: InvoiceFormatType[] = [
    'STANDARD',
    'VA_ABC_INSTATE',
    'VA_ABC_TAX_EXEMPT',
  ];

  return Promise.all(
    formats.map((format) => getInvoiceTemplateSettings(prisma, tenantId, format))
  );
}

export async function saveInvoiceTemplateSettings(
  prisma: PrismaLike,
  tenantId: string,
  formatType: InvoiceFormatType,
  payload: unknown
): Promise<InvoiceTemplateSettings> {
  const parsed = updatePayloadSchema.parse(payload);
  const name = templateNameForFormat(formatType);

  const merged = mergeWithDefaults(formatType, parsed);
  const config: InvoiceTemplateConfig = {
    baseTemplate: merged.baseTemplate,
    palette: merged.palette,
    options: merged.options,
    layout: merged.layout,
  };

  const record = await prisma.invoiceTemplate.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name,
      },
    },
    update: {
      config,
      formatType,
    },
    create: {
      tenantId,
      name,
      formatType,
      isDefault: true,
      config,
      applicableStates: [],
      applicableLicenseTypes: [],
    },
  });

  return mergeWithDefaults(formatType, parsed, {
    templateId: record.id,
    updatedAt: record.updatedAt,
  });
}

export function resolveBaseTemplateComponent(format: InvoiceFormatType, baseTemplate?: InvoiceTemplateBase) {
  if (baseTemplate === 'VA_ABC_INSTATE_CONDENSED') {
    return 'VA_ABC_INSTATE_CONDENSED';
  }

  if (baseTemplate === 'VA_ABC_INSTATE_FULL') {
    return 'VA_ABC_INSTATE_FULL';
  }

  if (baseTemplate === 'VA_ABC_TAX_EXEMPT') {
    return 'VA_ABC_TAX_EXEMPT';
  }

  if (baseTemplate === 'STANDARD') {
    return 'STANDARD';
  }

  switch (format) {
    case 'VA_ABC_INSTATE':
      return 'VA_ABC_INSTATE_FULL';
    case 'VA_ABC_TAX_EXEMPT':
      return 'VA_ABC_TAX_EXEMPT';
    default:
      return 'STANDARD';
  }
}
