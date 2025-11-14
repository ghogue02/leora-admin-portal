import {
  Prisma,
  PrismaClient,
  ProductFieldInputType,
  ProductFieldScope,
} from "@prisma/client";

const prisma = new PrismaClient();

type SeedField = {
  key: string;
  label: string;
  section?: string;
  scope: ProductFieldScope;
  inputType: ProductFieldInputType;
  supportsManualEntry?: boolean;
  defaultVisibility?: boolean;
  defaultRequired?: boolean;
  defaultDisplayOrder?: number;
  showInPortalByDefault?: boolean;
  filterableByDefault?: boolean;
  description?: string;
  defaultValue?: unknown;
  options?: Array<{
    label: string;
    value: string;
    sortOrder?: number;
    isDefault?: boolean;
  }>;
};

const seedFields: SeedField[] = [
  {
    key: "product.brand",
    label: "Brand",
    section: "Producer & Supply Chain",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 10,
    showInPortalByDefault: true,
    filterableByDefault: true,
  },
  {
    key: "product.producer",
    label: "Producer",
    section: "Producer & Supply Chain",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 20,
    filterableByDefault: true,
  },
  {
    key: "product.importer",
    label: "Importer",
    section: "Producer & Supply Chain",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 30,
  },
  {
    key: "product.category",
    label: "Category",
    section: "Product Information",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 40,
    showInPortalByDefault: true,
    filterableByDefault: true,
    options: [
      { label: "Red Wine", value: "RED" },
      { label: "White Wine", value: "WHITE" },
      { label: "Rosé", value: "ROSE" },
      { label: "Sparkling", value: "SPARKLING" },
      { label: "Fortified", value: "FORTIFIED" },
      { label: "Spirit", value: "SPIRIT" },
      { label: "Beer", value: "BEER" },
    ],
  },
  {
    key: "product.region",
    label: "Region",
    section: "Geography & Classification",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 50,
    filterableByDefault: true,
  },
  {
    key: "product.appellation",
    label: "Appellation",
    section: "Geography & Classification",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 60,
    filterableByDefault: true,
  },
  {
    key: "product.varietalComposition",
    label: "Varietal Composition",
    section: "Product Information",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.MULTI_SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 70,
    filterableByDefault: true,
  },
  {
    key: "product.farmingPractices",
    label: "Farming Practices",
    section: "Product Information",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.MULTI_SELECT,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 80,
    filterableByDefault: true,
    options: [
      { label: "Organic", value: "ORGANIC" },
      { label: "Biodynamic", value: "BIODYNAMIC" },
      { label: "Sustainable", value: "SUSTAINABLE" },
      { label: "Vegan", value: "VEGAN" },
    ],
  },
  {
    key: "product.lifecycleStatus",
    label: "Lifecycle Status",
    section: "Pricing & Sales",
    scope: ProductFieldScope.PRODUCT,
    inputType: ProductFieldInputType.SELECT,
    supportsManualEntry: false,
    defaultVisibility: true,
    defaultDisplayOrder: 90,
    showInPortalByDefault: true,
    filterableByDefault: true,
    options: [
      { label: "Core", value: "CORE" },
      { label: "New", value: "NEW" },
      { label: "Promotion", value: "PROMO" },
      { label: "Closeout", value: "CLOSEOUT" },
    ],
  },
  {
    key: "pricing.frontline",
    label: "Frontline Price",
    section: "Pricing & Sales",
    scope: ProductFieldScope.PRICING,
    inputType: ProductFieldInputType.DECIMAL,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 100,
    showInPortalByDefault: true,
  },
  {
    key: "pricing.btg",
    label: "BTG Price",
    section: "Pricing & Sales",
    scope: ProductFieldScope.PRICING,
    inputType: ProductFieldInputType.DECIMAL,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 110,
  },
  {
    key: "inventory.available",
    label: "Available Inventory",
    section: "Inventory",
    scope: ProductFieldScope.INVENTORY,
    inputType: ProductFieldInputType.NUMBER,
    supportsManualEntry: false,
    defaultVisibility: true,
    defaultDisplayOrder: 120,
    showInPortalByDefault: true,
  },
  {
    key: "inventory.lowStockThreshold",
    label: "Low Stock Threshold",
    section: "Inventory",
    scope: ProductFieldScope.INVENTORY,
    inputType: ProductFieldInputType.NUMBER,
    supportsManualEntry: true,
    defaultVisibility: false,
    defaultDisplayOrder: 130,
  },
  {
    key: "sales.monthlyGoal",
    label: "Monthly Sales Goal",
    section: "Sales & Marketing",
    scope: ProductFieldScope.SALES,
    inputType: ProductFieldInputType.NUMBER,
    supportsManualEntry: true,
    defaultVisibility: true,
    defaultDisplayOrder: 140,
  },
  {
    key: "sales.closeoutFlag",
    label: "Closeout Flag",
    section: "Sales & Marketing",
    scope: ProductFieldScope.SALES,
    inputType: ProductFieldInputType.BOOLEAN,
    supportsManualEntry: false,
    defaultVisibility: true,
    defaultDisplayOrder: 150,
    showInPortalByDefault: true,
  },
];

async function upsertField(field: SeedField) {
  const definition = await prisma.productFieldDefinition.upsert({
    where: { key: field.key },
    update: {
      label: field.label,
      description: field.description,
      section: field.section,
      scope: field.scope,
      inputType: field.inputType,
      supportsManualEntry: field.supportsManualEntry ?? true,
      defaultVisibility: field.defaultVisibility ?? true,
      defaultRequired: field.defaultRequired ?? false,
      defaultDisplayOrder: field.defaultDisplayOrder,
      showInPortalByDefault: field.showInPortalByDefault ?? false,
      filterableByDefault: field.filterableByDefault ?? false,
      defaultValue: field.defaultValue as Prisma.JsonValue | undefined,
    },
    create: {
      key: field.key,
      label: field.label,
      description: field.description,
      section: field.section,
      scope: field.scope,
      inputType: field.inputType,
      supportsManualEntry: field.supportsManualEntry ?? true,
      defaultVisibility: field.defaultVisibility ?? true,
      defaultRequired: field.defaultRequired ?? false,
      defaultDisplayOrder: field.defaultDisplayOrder,
      showInPortalByDefault: field.showInPortalByDefault ?? false,
      filterableByDefault: field.filterableByDefault ?? false,
      defaultValue: field.defaultValue as Prisma.JsonValue | undefined,
    },
  });

  if (!field.options || field.options.length === 0) {
    return definition;
  }

  const existingOptions = await prisma.productFieldOption.findMany({
    where: { fieldId: definition.id },
    select: { id: true, value: true },
  });
  const desiredValues = new Set(field.options.map((option) => option.value));

  await Promise.all(
    field.options.map((option, index) =>
      prisma.productFieldOption.upsert({
        where: {
          fieldId_value: {
            fieldId: definition.id,
            value: option.value,
          },
        },
        update: {
          label: option.label,
          sortOrder: option.sortOrder ?? index * 10,
          isDefault: option.isDefault ?? false,
          isActive: true,
        },
        create: {
          fieldId: definition.id,
          label: option.label,
          value: option.value,
          sortOrder: option.sortOrder ?? index * 10,
          isDefault: option.isDefault ?? false,
        },
      }),
    ),
  );

  const staleOptionIds = existingOptions
    .filter((option) => !desiredValues.has(option.value))
    .map((option) => option.id);

  if (staleOptionIds.length > 0) {
    await prisma.productFieldOption.updateMany({
      where: { id: { in: staleOptionIds } },
      data: { isActive: false },
    });
  }

  return definition;
}

async function main() {
  console.log("🌱 Seeding product field definitions...");

  for (const field of seedFields) {
    await upsertField(field);
    console.log(`  • ${field.label} (${field.key})`);
  }

  console.log("✅ Product field registry seeded");
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed product fields:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
