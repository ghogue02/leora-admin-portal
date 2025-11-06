import { InvoiceFormatType, Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

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

const templateConfigSchema = z.object({
  baseTemplate: z.enum(BASE_TEMPLATE_VALUES).optional(),
  palette: paletteSchema.partial().optional(),
  options: optionsSchema.partial().optional(),
});

const updatePayloadSchema = z.object({
  baseTemplate: z.enum(BASE_TEMPLATE_VALUES),
  palette: paletteSchema.partial().optional(),
  options: optionsSchema.partial().optional(),
});

export type InvoiceTemplateConfig = {
  baseTemplate: InvoiceTemplateBase;
  palette: z.infer<typeof paletteSchema>;
  options: z.infer<typeof optionsSchema>;
};

export interface InvoiceTemplateSettings extends InvoiceTemplateConfig {
  formatType: InvoiceFormatType;
  templateId?: string;
  updatedAt?: Date | null;
}

type PrismaLike = PrismaClient | Prisma.TransactionClient;

const DEFAULT_PALETTE = paletteSchema.parse({});
const DEFAULT_OPTIONS = optionsSchema.parse({});

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

  return {
    formatType: format,
    baseTemplate: config?.baseTemplate ?? defaults.baseTemplate,
    palette,
    options,
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

  const config: InvoiceTemplateConfig = mergeWithDefaults(formatType, parsed);

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
