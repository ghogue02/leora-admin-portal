import { NextRequest, NextResponse } from "next/server";
import { subMonths } from "date-fns";
import { withSalesSession } from "@/lib/auth/sales";
import { hasSalesManagerPrivileges } from "@/lib/sales/role-helpers";
import {
  aggregateRecentOrderLines,
  type RawRecentOrderLine,
  type CustomerPricingSnapshot,
} from "@/lib/sales/recent-purchase-utils";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

const LOOKBACK_MONTHS = 6;
const MAX_LINES = 250;
const MAX_SUGGESTIONS = 20;

export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const { customerId } = await context.params;
      const salesRepId = session.user.salesRep?.id;
      const managerScope = hasSalesManagerPrivileges(roles);

      if (!salesRepId && !managerScope) {
        return NextResponse.json({ error: "Sales rep profile required." }, { status: 403 });
      }

      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          ...(managerScope ? {} : { salesRepId }),
        },
        select: {
          id: true,
          name: true,
          state: true,
          territory: true,
          accountNumber: true,
        },
      });

      if (!customer) {
        return NextResponse.json({ error: "Customer not found or not assigned to this sales rep." }, { status: 404 });
      }

      const sixMonthsAgo = subMonths(new Date(), LOOKBACK_MONTHS);

      const orderLines = await db.orderLine.findMany({
        where: {
          tenantId,
          order: {
            customerId,
            orderedAt: {
              gte: sixMonthsAgo,
            },
            status: {
              not: "CANCELLED",
            },
          },
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              orderedAt: true,
            },
          },
          sku: {
            select: {
              id: true,
              code: true,
              size: true,
              product: {
                select: {
                  name: true,
                  brand: true,
                },
              },
              priceListItems: {
                where: {
                  tenantId,
                },
                include: {
                  priceList: {
                    select: {
                      id: true,
                      name: true,
                      jurisdictionType: true,
                      jurisdictionValue: true,
                      allowManualOverride: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          order: {
            orderedAt: "desc",
          },
        },
        take: MAX_LINES,
      });

      const normalizedLines: RawRecentOrderLine[] = orderLines
        .filter((line) => line.order?.orderedAt && line.sku)
        .map((line) => ({
          skuId: line.skuId,
          skuCode: line.sku!.code,
          productName: line.sku!.product.name,
          brand: line.sku!.product.brand,
          size: line.sku!.size ?? null,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          overridePrice: line.overridePrice ? Number(line.overridePrice) : null,
          priceOverridden: line.priceOverridden,
          overrideReason: line.overrideReason,
          orderId: line.order!.id,
          orderNumber: line.order!.orderNumber,
          orderedAt: line.order!.orderedAt!.toISOString(),
          priceLists: line.sku!.priceListItems.map((item) => ({
            priceListId: item.priceListId,
            priceListName: item.priceList.name,
            price: Number(item.price),
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity ?? null,
            jurisdictionType: item.priceList.jurisdictionType,
            jurisdictionValue: item.priceList.jurisdictionValue,
            allowManualOverride: item.priceList.allowManualOverride,
          })),
        }));

      const customerPricing: CustomerPricingSnapshot = {
        state: customer.state ?? null,
        territory: customer.territory ?? null,
        accountNumber: customer.accountNumber ?? null,
        name: customer.name,
      };

      const items = aggregateRecentOrderLines(normalizedLines, customerPricing, MAX_SUGGESTIONS);

      return NextResponse.json({ items });
    },
  );
}
