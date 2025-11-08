import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { withSalesSession } from "@/lib/auth/sales";
import {
  SampleTechSheetDocument,
  TechSheetItem,
  TechSheetItemPriceTable,
} from "@/lib/pdf/sample-tech-sheet";


const requestSchema = z.object({
  priceListIds: z.array(z.string().uuid()).min(1).max(5),
  layout: z.enum(["multi", "single"]).default("multi"),
  hideDiscountAbove: z.number().int().min(1).max(5000).optional(),
});

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const ensureArrayOfStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : null))
      .filter(Boolean) as string[];
  }
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((entry) => (typeof entry === "string" ? entry : null))
      .filter(Boolean) as string[];
  }
  return [];
};

const coerceDescription = (value: unknown, fallback?: string | null) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "text" in (value as Record<string, unknown>)) {
    const textValue = (value as Record<string, unknown>).text;
    if (typeof textValue === "string") return textValue;
  }
  if (Array.isArray(value)) {
    const joined = value.map((entry) => (typeof entry === "string" ? entry : "")).join(" ");
    if (joined.trim().length > 0) return joined;
  }
  return fallback ?? null;
};

const extractImageUrl = (
  product: Prisma.ProductGetPayload<{ include: { supplier: true } }> | null | undefined,
  sku: Prisma.SkuGetPayload<{ include: { product: true } }> | null | undefined
): string | null => {
  if (product?.imageUrl) return product.imageUrl;
  if (sku?.imageUrl) return sku.imageUrl;
  if (product?.tastingNotes && typeof product.tastingNotes === "object") {
    const notes = product.tastingNotes as Record<string, unknown>;
    if (typeof notes.imageUrl === "string") return notes.imageUrl;
  }
  return null;
};

const extractWineDetail = (value: unknown, key: string): string | null => {
  if (!value || typeof value !== "object") return null;
  const detail = (value as Record<string, unknown>)[key];
  return typeof detail === "string" ? detail : null;
};

export async function POST(request: NextRequest, { params }: { params: { listId: string } }) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const salesRepId = session.user.salesRep?.id;
    if (!salesRepId) {
      return NextResponse.json(
        { error: "Sales representative profile required." },
        { status: 403 },
      );
    }

    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { priceListIds, layout, hideDiscountAbove } = parsed.data;

    const [priceLists, sampleList, tenant, salesRep] = await Promise.all([
      db.priceList.findMany({
        where: { tenantId, id: { in: priceListIds } },
      }),
      db.sampleList.findFirst({
        where: { id: params.listId, tenantId, salesRepId },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
            include: {
              sku: {
                include: {
                  product: {
                    include: {
                      supplier: { select: { name: true } },
                    },
                  },
                  priceListItems: {
                    where: { priceListId: { in: priceListIds } },
                    orderBy: { minQuantity: "asc" },
                  },
                },
              },
            },
          },
        },
      }),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          slug: true,
          wholesalerPhone: true,
        },
      }),
      db.salesRep.findUnique({
        where: { id: salesRepId },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    if (priceLists.length !== priceListIds.length) {
      return NextResponse.json(
        { error: "One or more price lists were not found." },
        { status: 404 },
      );
    }

    if (!sampleList) {
      return NextResponse.json({ error: "Sample list not found." }, { status: 404 });
    }

    if (!tenant || !salesRep) {
      return NextResponse.json({ error: "Unable to load profile context." }, { status: 400 });
    }

    const priceListOrder = new Map(priceListIds.map((id, idx) => [id, idx]));
    const orderedPriceLists = [...priceLists].sort(
      (a, b) => (priceListOrder.get(a.id) ?? 0) - (priceListOrder.get(b.id) ?? 0),
    );

    const tenantBaseUrl = tenant.slug
      ? `https://${tenant.slug}.leora.app`
      : "https://app.leora.io";

    const items: TechSheetItem[] = await Promise.all(
      sampleList.items.map(async (item) => {
        const { sku } = item;
        const { product } = sku;
        const caseMultiplier = sku.itemsPerCase ?? 12;

        const priceTables: TechSheetItemPriceTable[] = orderedPriceLists.map((list) => {
          const tiers = sku.priceListItems
            .filter((tier) => tier.priceListId === list.id)
            .map((tier) => {
              const minQuantity = tier.minQuantity ?? 1;
              return {
                minQuantity,
                maxQuantity: tier.maxQuantity ?? null,
                pricePerBottle: Number(tier.price),
                pricePerCase: Number.isFinite(caseMultiplier)
                  ? Number(tier.price) * caseMultiplier
                  : null,
              };
            })
            .filter((tier) => {
              const minQuantity = tier.minQuantity ?? 1;
              return hideDiscountAbove ? minQuantity <= hideDiscountAbove : true;
            });

          return {
            priceListId: list.id,
            priceListName: list.name,
            currency: list.currency,
            tiers,
          };
        });

        const description = coerceDescription(product.description, item.notes);
        const tastingNotes = ensureArrayOfStrings(product.tastingNotes).slice(0, 4);
        const foodPairings = ensureArrayOfStrings(product.foodPairings).slice(0, 4);
        const wineDetails = product.wineDetails;

        let qrCode: string | null = null;
        try {
          const qrUrl = `${tenantBaseUrl}/catalog/${encodeURIComponent(sku.code)}`;
          qrCode = await QRCode.toDataURL(qrUrl, { margin: 0, width: 120 });
        } catch (error) {
          console.error("Failed to generate QR code for sample:", error);
        }

        return {
          id: item.id,
          name: product.name,
          brand: product.brand,
          skuCode: sku.code,
          size: sku.size,
          unitOfMeasure: sku.unitOfMeasure,
          type: product.style ?? product.category ?? null,
          category: product.category,
          supplierName: product.supplier?.name ?? null,
          description,
          notes: item.notes,
          priceTables,
          tastingNotes,
          foodPairings,
          region: extractWineDetail(wineDetails, "region"),
          grape: extractWineDetail(wineDetails, "grape"),
          vintage: typeof product.vintage === "number" ? product.vintage : null,
          abv: typeof sku.abv === "number" ? sku.abv : null,
          imageUrl: extractImageUrl(product, sku),
          qrCode,
        };
      }),
    );

    const document = (
      <SampleTechSheetDocument
        company={{
          name: tenant.name,
          website: tenant.slug ? `https://${tenant.slug}.leora.app` : undefined,
          phone: tenant.wholesalerPhone ?? undefined,
        }}
        salesperson={{
          name: salesRep.user.fullName,
          email: salesRep.user.email,
          phone: undefined,
        }}
        listName={sampleList.name}
        generatedAt={new Date()}
        priceLists={orderedPriceLists.map((list) => ({
          id: list.id,
          name: list.name,
          currency: list.currency,
        }))}
        items={items}
        layout={layout}
        hideAboveQuantity={hideDiscountAbove}
      />
    );

    const buffer = await pdf(document).toBuffer();
    const safeName =
      sanitizeFileName(`${sampleList.name}-${orderedPriceLists.map((p) => p.name).join("-")}`) ||
      "tech-sheet";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
