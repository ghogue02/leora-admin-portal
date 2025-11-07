import { NextRequest, NextResponse } from "next/server";
import { Prisma, type OrderStatus, OrderUsageType } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";
import { runWithTransaction } from "@/lib/prisma";
import {
  OrderFlowError,
  allocateInventory,
  ensureInventoryAvailability,
  fetchInventorySnapshots,
} from "@/lib/orders";
import { z } from "zod";
import { calculateOrderTotal } from "@/lib/orders/calculations";
import { parseUTCDate } from "@/lib/dates";
import { generateOrderNumber } from "@/lib/orders/order-number-generator";

const DEFAULT_LIMIT = 25;
const OPEN_STATUSES: OrderStatus[] = [
  "SUBMITTED",
  "PARTIALLY_FULFILLED",
  "PENDING",
  "READY_TO_DELIVER",
  "PICKED",
];
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

type OrdersSummary = {
  totalCount: number;
  openTotal: number;
  byStatus: Partial<Record<OrderStatus, { count: number; total: number }>>;
  last30Days: {
    count: number;
    revenue: number;
    avgOrderValue: number;
  };
};

type PriceListItemWithList = Prisma.PriceListItemGetPayload<{
  include: {
    priceList: true;
  };
}>;

type CustomerPricingContext = {
  state: string | null;
  territory: string | null;
  accountNumber: string | null;
  name: string;
};

function priceListMatchesCustomer(priceList: { jurisdictionType: string; jurisdictionValue: string | null }, customer: CustomerPricingContext) {
  const value = (priceList.jurisdictionValue ?? "").trim().toUpperCase();
  const state = (customer.state ?? "").trim().toUpperCase();
  switch (priceList.jurisdictionType) {
    case "STATE":
      return value !== "" && state !== "" && value === state;
    case "FEDERAL_PROPERTY":
      return isFederalPropertyCustomer(customer);
    case "CUSTOM":
      if (!value) return false;
      return [customer.territory, customer.accountNumber, customer.name]
        .filter(Boolean)
        .some((field) => field?.toString().toLowerCase().includes(value.toLowerCase()));
    default:
      return true;
  }
}

function isFederalPropertyCustomer(customer: CustomerPricingContext) {
  const territory = (customer.territory ?? "").toLowerCase();
  const name = customer.name.toLowerCase();
  return (
    territory.includes("federal") ||
    territory.includes("military") ||
    name.includes("air force") ||
    name.includes("naval") ||
    name.includes("army") ||
    name.includes("marine") ||
    name.includes("base")
  );
}

function meetsQuantityBounds(item: PriceListItemWithList, quantity: number) {
  const aboveMin = quantity >= (item.minQuantity ?? 1);
  const belowMax = item.maxQuantity === null || quantity <= item.maxQuantity;
  return aboveMin && belowMax;
}

function selectPriceListItem(
  priceListItems: PriceListItemWithList[],
  quantity: number,
  customer: CustomerPricingContext,
) {
  const sorted = (items: PriceListItemWithList[]) =>
    [...items].sort((a, b) => (b.minQuantity ?? 0) - (a.minQuantity ?? 0));

  const jurisdictionMatches = sorted(
    priceListItems.filter(
      (item) => meetsQuantityBounds(item, quantity) && priceListMatchesCustomer(item.priceList, customer),
    ),
  );
  if (jurisdictionMatches.length > 0) {
    return { item: jurisdictionMatches[0], overrideApplied: false, reason: null as string | null };
  }

  const manualOverrideCandidates = sorted(
    priceListItems.filter(
      (item) => meetsQuantityBounds(item, quantity) && item.priceList.allowManualOverride,
    ),
  );
  if (manualOverrideCandidates.length > 0) {
    return { item: manualOverrideCandidates[0], overrideApplied: true, reason: "manualOverride" as const };
  }

  const fallback = sorted(priceListItems.filter((item) => meetsQuantityBounds(item, quantity)));
  if (fallback.length > 0) {
    return { item: fallback[0], overrideApplied: true, reason: "noJurisdictionMatch" as const };
  }

  return { item: null, overrideApplied: true, reason: "noPriceConfigured" as const };
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || DEFAULT_LIMIT, 100) : DEFAULT_LIMIT;

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Sales rep must be present (enforced by withSalesSession by default)
      const salesRepId = session.user.salesRep?.id;
      if (!salesRepId) {
        return NextResponse.json(
          { error: "Sales rep profile required." },
          { status: 403 },
        );
      }

      // Allow reps to see orders they own via customer assignment or explicit credit
      const where: Prisma.OrderWhereInput = {
        tenantId,
        OR: [
          {
            customer: {
              salesRepId,
            },
          },
          {
            salesRepId,
          },
        ],
      };

      const [orders, grouped, totalCount, openOrdersWithLines, last30DaysOrders] = await Promise.all([
        db.order.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            invoices: {
              select: {
                id: true,
                status: true,
                total: true,
              },
            },
            salesRep: {
              select: {
                id: true,
                territoryName: true,
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            orderedAt: "desc",
          },
          take: limit,
        }),
        db.order.groupBy({
          by: ["status"],
          where,
          _sum: {
            total: true,
          },
          _count: {
            _all: true,
          },
        }),
        db.order.count({ where }),
        // Fetch open orders with lines to calculate totals if needed
        db.order.findMany({
          where: {
            ...where,
            status: {
              in: OPEN_STATUSES,
            },
          },
          include: {
            lines: {
              select: {
                quantity: true,
                unitPrice: true,
              },
            },
          },
        }),
        // Fetch orders from last 30 days for recent performance metrics
        db.order.findMany({
          where: {
            ...where,
            orderedAt: {
              gte: THIRTY_DAYS_AGO,
            },
          },
          select: {
            id: true,
            total: true,
            lines: {
              select: {
                quantity: true,
                unitPrice: true,
              },
            },
          },
        }),
      ]);

      // Calculate open total from order lines if order.total is null (uses shared utility)
      const openTotalFromLines = openOrdersWithLines.reduce((sum, order) => {
        return sum + calculateOrderTotal({ total: order.total, lines: order.lines });
      }, 0);

      // Calculate last 30 days metrics
      const last30DaysCount = last30DaysOrders.length;
      const last30DaysRevenue = last30DaysOrders.reduce((sum, order) => {
        return sum + calculateOrderTotal({ total: order.total, lines: order.lines });
      }, 0);
      const avgOrderValue = last30DaysCount > 0 ? last30DaysRevenue / last30DaysCount : 0;

      const summary = grouped.reduce<OrdersSummary>(
        (acc, group) => {
          acc.byStatus[group.status as OrderStatus] = {
            count: group._count._all,
            total: Number(group._sum.total ?? 0),
          };

          return acc;
        },
        {
          totalCount,
          openTotal: openTotalFromLines,
          byStatus: {},
          last30Days: {
            count: last30DaysCount,
            revenue: last30DaysRevenue,
            avgOrderValue: avgOrderValue,
          },
        },
      );

      return NextResponse.json({
        summary,
        orders: orders.map(serializeOrder),
      });
    }
  );
}

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customer: {
      select: {
        id: true;
        name: true;
      };
    };
    invoices: {
      select: {
        id: true;
        status: true;
        total: true;
      };
    };
    salesRep: {
      select: {
        id: true;
        territoryName: true;
        user: {
          select: {
            fullName: true;
          };
        };
      };
    };
  };
}>;

function serializeOrder(order: OrderWithRelations) {
  const total = order.total ? Number(order.total) : null;
  const invoiceTotals = order.invoices.reduce(
    (acc, invoice) => {
      const value = invoice.total ? Number(invoice.total) : 0;
      acc.byStatus[invoice.status] = (acc.byStatus[invoice.status] ?? 0) + value;
      acc.total += value;
      return acc;
    },
    {
      total: 0,
      byStatus: {} as Record<string, number>,
    },
  );

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderedAt: order.orderedAt,
    deliveryDate: order.deliveryDate,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
        }
      : null,
    total,
    currency: order.currency,
    invoiceTotals,
    salesRep: order.salesRep
      ? {
          id: order.salesRep.id,
          name: order.salesRep.user.fullName,
          territory: order.salesRep.territoryName,
        }
      : null,
  };
}

/**
 * POST /api/sales/orders
 *
 * Direct order creation (replaces cart checkout)
 *
 * Travis's HAL workflow:
 * 1. Validate customer and inventory
 * 2. Create order with delivery settings
 * 3. Allocate inventory with 48-hour expiration
 * 4. Set requiresApproval if insufficient inventory
 * 5. Create activity log
 */

const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  deliveryDate: z.string(), // ISO date string
  warehouseLocation: z.string().min(1),
  deliveryTimeWindow: z.string().optional(),
  poNumber: z.string().optional(),
  specialInstructions: z.string().optional(),
  salesRepId: z.string().uuid().optional(),
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().int().positive(),
      priceOverride: z.object({
        price: z.number().positive(),
        reason: z.string().min(10),
      }).optional(),
      usageType: z.nativeEnum(OrderUsageType).optional(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const orderData = parsed.data;

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const salesRepId = session.user.salesRep?.id;
      if (!salesRepId) {
        return NextResponse.json(
          { error: "Sales rep profile required." },
          { status: 403 },
        );
      }

      // Verify customer belongs to this sales rep
      const customer = await db.customer.findFirst({
        where: {
          id: orderData.customerId,
          tenantId,
          salesRepId,
        },
        select: {
          id: true,
          name: true,
          requiresPO: true,
          territory: true,
          state: true,
          accountNumber: true,
          salesRepId: true,
          salesRep: {
            select: {
              id: true,
              territoryName: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to this sales rep." },
          { status: 404 },
        );
      }

      // Validate PO number if required
      if (customer.requiresPO && !orderData.poNumber?.trim()) {
        return NextResponse.json(
          { error: "PO number is required for this customer." },
          { status: 400 },
        );
      }

      type LightweightSalesRep = {
        id: string;
        territoryName: string | null;
        user: {
          fullName: string;
        };
      };

      let selectedSalesRep: LightweightSalesRep | null = null;
      if (orderData.salesRepId) {
        selectedSalesRep = await db.salesRep.findFirst({
          where: {
            id: orderData.salesRepId,
            tenantId,
            isActive: true,
            orderEntryEnabled: true,
          },
          select: {
            id: true,
            territoryName: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        });

        if (!selectedSalesRep) {
          return NextResponse.json(
            { error: "Selected salesperson is not available for order entry." },
            { status: 400 },
          );
        }
      } else if (customer.salesRepId) {
        selectedSalesRep = await db.salesRep.findFirst({
          where: {
            id: customer.salesRepId,
            tenantId,
          },
          select: {
            id: true,
            territoryName: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        });
      }

      if (!selectedSalesRep && salesRepId) {
        selectedSalesRep = await db.salesRep.findFirst({
          where: {
            id: salesRepId,
            tenantId,
          },
          select: {
            id: true,
            territoryName: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        });
      }

      if (!selectedSalesRep) {
        return NextResponse.json(
          { error: "Unable to determine salesperson for this order." },
          { status: 400 },
        );
      }

      try {
        const result = await runWithTransaction(db, async (tx) => {
          // 1. Fetch SKU details with pricing
          const skus = await tx.sku.findMany({
            where: {
              tenantId,
              id: { in: orderData.items.map(item => item.skuId) },
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                },
              },
              priceListItems: {
                include: {
                  priceList: true,
                },
              },
            },
          });

          const customerPricingContext: CustomerPricingContext = {
            state: customer.state ?? null,
            territory: customer.territory ?? null,
            accountNumber: customer.accountNumber ?? null,
            name: customer.name,
          };

          // 2. Check inventory availability
          const quantityDescriptors = orderData.items.map(item => ({
            skuId: item.skuId,
            quantity: item.quantity,
          }));

          const inventoryMap = await fetchInventorySnapshots(
            tx,
            tenantId,
            quantityDescriptors.map(item => item.skuId),
          );

          // Determine if any items have insufficient inventory
          let requiresApproval = false;
          const inventoryChecks = quantityDescriptors.map(item => {
            const inventories = inventoryMap.get(item.skuId) ?? [];
            const available = inventories.reduce((sum, inv) => {
              return sum + Math.max(0, inv.onHand - inv.allocated);
            }, 0);

            const sufficient = available >= item.quantity;
            if (!sufficient) {
              requiresApproval = true;
            }

            return {
              skuId: item.skuId,
              requested: item.quantity,
              available,
              sufficient,
            };
          });

          // 3. Allocate inventory (this will throw if insufficient)
          let allocationsBySku;
          try {
            // Try to allocate - if fails, we'll catch and still create order as DRAFT
            ensureInventoryAvailability(inventoryMap, quantityDescriptors);
            allocationsBySku = await allocateInventory(tx, inventoryMap, quantityDescriptors);
          } catch (inventoryError) {
            if (inventoryError instanceof OrderFlowError) {
              // Insufficient inventory - create order as DRAFT requiring approval
              requiresApproval = true;
              allocationsBySku = new Map(); // No allocations yet
            } else {
              throw inventoryError;
            }
          }

          // 4. Calculate pricing for each item
          const orderLines = orderData.items.map(item => {
            const sku = skus.find(s => s.id === item.skuId);
            if (!sku) {
              throw new OrderFlowError(`SKU ${item.skuId} not found`, 404);
            }

            const selection = selectPriceListItem(sku.priceListItems, item.quantity, customerPricingContext);

            if (!selection.item) {
              throw new OrderFlowError(`No pricing configured for SKU ${sku.product.name} (${sku.id}).`, 422);
            }

            if (selection.overrideApplied) {
              requiresApproval = true;
            }

            // Check for manual price override
            const hasPriceOverride = !!item.priceOverride;
            if (hasPriceOverride) {
              requiresApproval = true;
            }

            const baseUnitPrice = Number(selection.item.price ?? sku.pricePerUnit ?? 0);
            const effectiveUnitPrice = hasPriceOverride ? item.priceOverride!.price : baseUnitPrice;
            const allocations = allocationsBySku.get(item.skuId) ?? [];

            return {
              tenantId,
              skuId: item.skuId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(effectiveUnitPrice),
              usageType: item.usageType ?? null,
              // Manual price override fields
              priceOverridden: hasPriceOverride,
              overridePrice: hasPriceOverride ? new Prisma.Decimal(item.priceOverride!.price) : null,
              overrideReason: hasPriceOverride ? item.priceOverride!.reason : null,
              overriddenBy: hasPriceOverride ? session.userId : null,
              overriddenAt: hasPriceOverride ? new Date() : null,
              appliedPricingRules: {
                source: hasPriceOverride ? 'manual_price_override' : (selection.overrideApplied ? 'price_list_override' : 'price_list'),
                priceListId: selection.item.priceListId,
                priceListName: selection.item.priceList.name,
                minQuantity: selection.item.minQuantity,
                maxQuantity: selection.item.maxQuantity,
                jurisdictionType: selection.item.priceList.jurisdictionType,
                jurisdictionValue: selection.item.priceList.jurisdictionValue,
                manualOverrideApplied: selection.overrideApplied || hasPriceOverride,
                overrideReason: hasPriceOverride ? item.priceOverride!.reason : selection.reason,
                allowManualOverride: selection.item.priceList.allowManualOverride,
                allocations,
                resolvedAt: new Date().toISOString(),
              },
            };
          });

          // Calculate order total
          const orderTotal = orderLines.reduce((sum, line) => {
            return sum + (line.quantity * Number(line.unitPrice));
          }, 0);

          // 5. Determine order status
          // DRAFT if needs approval, PENDING if inventory sufficient
          const orderStatus = requiresApproval ? 'DRAFT' : 'PENDING';

          // 5.5. Generate order number (Sprint 3 Polish: VA-25-00001 format)
          const orderNumber = await generateOrderNumber(tx, tenantId, orderData.customerId);

          // 6. Create order
          const order = await tx.order.create({
            data: {
              tenantId,
              customerId: orderData.customerId,
              salesRepId: selectedSalesRep.id,
              orderNumber,
              status: orderStatus,
              deliveryDate: orderData.deliveryDate ? parseUTCDate(orderData.deliveryDate) : null,
              warehouseLocation: orderData.warehouseLocation,
              deliveryTimeWindow: orderData.deliveryTimeWindow,
              requiresApproval,
              orderedAt: new Date(),
              total: new Prisma.Decimal(orderTotal.toFixed(2)),
              currency: 'USD',
              lines: {
                create: orderLines,
              },
            },
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
              salesRep: {
                select: {
                  id: true,
                  territoryName: true,
                  user: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
              lines: {
                include: {
                  sku: {
                    include: {
                      product: true,
                    },
                  },
                },
              },
            },
          });

          // 7. Create inventory reservations with 48-hour expiration
          if (allocationsBySku.size > 0) {
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

            await tx.inventoryReservation.createMany({
              data: orderData.items.map(item => ({
                tenantId,
                skuId: item.skuId,
                orderId: order.id,
                quantity: item.quantity,
                expiresAt,
                status: 'ACTIVE',
              })),
            });
          }

          // 8. Create activity log
          const activityType = await tx.activityType.findFirst({
            where: {
              tenantId,
              code: 'ORDER_CREATED',
            },
            select: { id: true },
          });

          if (activityType) {
            const creditedToDifferentRep = selectedSalesRep.id !== salesRepId;
            const salesRepAssignmentNote = creditedToDifferentRep
              ? ` Sales credit assigned to ${selectedSalesRep.user.fullName}.`
              : "";

            await tx.activity.create({
              data: {
                tenantId,
                activityTypeId: activityType.id,
                userId: session.user.id,
                customerId: orderData.customerId,
                orderId: order.id,
                subject: `Order created for ${customer.name}`,
                notes: `Order created by ${session.user.fullName}. Delivery: ${orderData.deliveryDate}. Warehouse: ${orderData.warehouseLocation}.${requiresApproval ? ' Requires manager approval due to insufficient inventory.' : ''}${salesRepAssignmentNote}`,
                occurredAt: new Date(),
              },
            });
          }

          // 9. Update invoice with delivery details if needed
          if (orderData.poNumber || orderData.specialInstructions) {
            const invoice = order.invoices?.[0];
            if (invoice) {
              await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                  poNumber: orderData.poNumber,
                  specialInstructions: orderData.specialInstructions,
                },
              });
            }
          }

          return { order, inventoryChecks };
        });

        return NextResponse.json({
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          status: result.order.status,
          requiresApproval: result.order.requiresApproval,
          total: Number(result.order.total),
          currency: result.order.currency,
          deliveryDate: result.order.deliveryDate,
          salesRepId: selectedSalesRep.id,
           salesRep: result.order.salesRep
             ? {
                 id: result.order.salesRep.id,
                 name: result.order.salesRep.user.fullName,
                 territory: result.order.salesRep.territoryName,
               }
             : {
                 id: selectedSalesRep.id,
                 name: selectedSalesRep.user.fullName,
                 territory: selectedSalesRep.territoryName,
               },
          inventoryStatus: {
            checks: result.inventoryChecks,
            allSufficient: !result.order.requiresApproval,
          },
          message: result.order.requiresApproval
            ? 'Order created but requires manager approval due to insufficient inventory.'
            : 'Order created successfully and is pending processing.',
        });
      } catch (error) {
        if (error instanceof OrderFlowError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Order creation failed:", error);
        return NextResponse.json(
          { error: "Unable to create order." },
          { status: 500 }
        );
      }
    }
  );
}
