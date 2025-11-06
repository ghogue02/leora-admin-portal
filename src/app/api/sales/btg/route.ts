import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { differenceInDays, subMonths } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const now = new Date();
      const ninetyDaysAgo = subMonths(now, 3);

      const orderLines = await db.orderLine.findMany({
        where: {
          tenantId,
          usageType: "BTG",
          order: {
            tenantId,
            status: {
              not: "CANCELLED",
            },
          },
        },
        select: {
          quantity: true,
          order: {
            select: {
              orderedAt: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          sku: {
            select: {
              id: true,
              code: true,
              product: {
                select: {
                  name: true,
                  brand: true,
                  category: true,
                  supplier: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const placements = new Map<
        string,
        {
          category: string | null;
          supplierName: string | null;
          skuId: string;
          skuCode: string;
          productName: string;
          brand: string | null;
          customerId: string;
          customerName: string;
          totalUnits: number;
          orderCount: number;
          recentUnits: number;
          firstOrderDate: Date | null;
          lastOrderDate: Date | null;
        }
      >();

      for (const line of orderLines) {
        const sku = line.sku;
        const customer = line.order?.customer;
        if (!sku || !customer) continue;

        const key = `${sku.id}::${customer.id}`;
        const orderedAt = line.order?.orderedAt ? new Date(line.order.orderedAt) : null;

        let entry = placements.get(key);
        if (!entry) {
          entry = {
            category: sku.product?.category ?? null,
            supplierName: sku.product?.supplier?.name ?? null,
            skuId: sku.id,
            skuCode: sku.code,
            productName: sku.product?.name ?? "Unknown Product",
            brand: sku.product?.brand ?? null,
            customerId: customer.id,
            customerName: customer.name,
            totalUnits: 0,
            orderCount: 0,
            recentUnits: 0,
            firstOrderDate: null,
            lastOrderDate: null,
          };
          placements.set(key, entry);
        }

        entry.totalUnits += line.quantity;
        entry.orderCount += 1;

        if (orderedAt) {
          if (!entry.firstOrderDate || orderedAt < entry.firstOrderDate) {
            entry.firstOrderDate = orderedAt;
          }
          if (!entry.lastOrderDate || orderedAt > entry.lastOrderDate) {
            entry.lastOrderDate = orderedAt;
          }
          if (orderedAt >= ninetyDaysAgo) {
            entry.recentUnits += line.quantity;
          }
        }
      }

      const dataset = Array.from(placements.values()).map((entry) => {
        const monthsActive =
          entry.firstOrderDate && entry.firstOrderDate < now
            ? Math.max(1, Math.ceil(differenceInDays(now, entry.firstOrderDate) / 30))
            : 1;

        const averageMonthlyUnits = entry.totalUnits / monthsActive;
        const lastOrderDateIso = entry.lastOrderDate?.toISOString() ?? null;
        const firstOrderDateIso = entry.firstOrderDate?.toISOString() ?? null;
        const daysSinceLastOrder = entry.lastOrderDate
          ? differenceInDays(now, entry.lastOrderDate)
          : null;

        return {
          category: entry.category ?? "Uncategorized",
          supplierName: entry.supplierName ?? "Unknown Supplier",
          skuId: entry.skuId,
          skuCode: entry.skuCode,
          productName: entry.productName,
          brand: entry.brand,
          customerId: entry.customerId,
          customerName: entry.customerName,
          totalUnits: entry.totalUnits,
          orderCount: entry.orderCount,
          recentUnits: entry.recentUnits,
          averageMonthlyUnits,
          firstOrderDate: firstOrderDateIso,
          lastOrderDate: lastOrderDateIso,
          daysSinceLastOrder,
          isActivePlacement: daysSinceLastOrder !== null ? daysSinceLastOrder <= 90 : false,
        };
      });

      dataset.sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        const supplierCompare = a.supplierName.localeCompare(b.supplierName);
        if (supplierCompare !== 0) return supplierCompare;
        const productCompare = a.productName.localeCompare(b.productName);
        if (productCompare !== 0) return productCompare;
        return a.customerName.localeCompare(b.customerName);
      });

      return NextResponse.json({ data: dataset });
    }
  );
}
