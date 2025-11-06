import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subMonths, startOfYear, differenceInDays } from "date-fns";
import { TaskStatus } from "@prisma/client";
import { activitySampleItemSelect } from "@/app/api/sales/activities/_helpers";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { customerId } = await context.params;

      // Get sales rep profile
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      // Get customer with full details
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
        include: {
          salesRep: {
            include: {
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
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      // Verify customer is assigned to this sales rep
      if (customer.salesRepId !== salesRep.id) {
        return NextResponse.json(
          { error: "You do not have access to this customer" },
          { status: 403 }
        );
      }

      const now = new Date();
      const ytdStart = startOfYear(now);
      const sixMonthsAgo = subMonths(now, 6);
      const ninetyDaysAgo = subMonths(now, 3);

      // Fetch all related data in parallel (OPTIMIZED)
      const [
        orders,
        activities,
        samples,
        topProductsRaw,
        companyTopProducts,
        invoices,
        followUpItems,
        tasks,
      ] = await Promise.all([
        // Order history with invoice links (LIMITED to 50 most recent)
        db.order.findMany({
          where: {
            tenantId,
            customerId,
            status: {
              not: "CANCELLED",
            },
          },
          select: {
            id: true,
            orderedAt: true,
            deliveredAt: true,
            status: true,
            total: true,
            lines: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                sku: {
                  select: {
                    code: true,
                    product: {
                      select: {
                        id: true,
                        name: true,
                        brand: true,
                      },
                    },
                  },
                },
              },
            },
            invoices: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                total: true,
                issuedAt: true,
              },
            },
            _count: {
              select: {
                lines: true,
              },
            },
          },
          orderBy: {
            orderedAt: "desc",
          },
          take: 50,
        }),

        // Activity history (LIMITED to 20 most recent)
        db.activity.findMany({
          where: {
            tenantId,
            customerId,
          },
          include: {
            activityType: true,
            user: {
              select: {
                fullName: true,
              },
            },
            order: {
              select: {
                id: true,
                orderedAt: true,
                total: true,
              },
            },
            sampleItems: {
              select: activitySampleItemSelect,
            },
          },
          orderBy: {
            occurredAt: "desc",
          },
          take: 20,
        }),

        // Sample history (LIMITED to 50 most recent)
        db.sampleUsage.findMany({
          where: {
            tenantId,
            customerId,
          },
          include: {
            sku: {
              include: {
                product: true,
              },
            },
            salesRep: {
              include: {
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            tastedAt: "desc",
          },
          take: 50,
        }),

        // Top products with revenue calculation (OPTIMIZED - single query with aggregation)
        db.$queryRaw<Array<{
          skuId: string;
          totalCases: bigint;
          revenue: number;
          orderCount: bigint;
        }>>`
          SELECT
            ol."skuId",
            SUM(ol.quantity)::bigint as "totalCases",
            SUM(ol.quantity * ol."unitPrice")::decimal as revenue,
            COUNT(DISTINCT ol."orderId")::bigint as "orderCount"
          FROM "OrderLine" ol
          INNER JOIN "Order" o ON o.id = ol."orderId"
          WHERE o."customerId" = ${customerId}::uuid
            AND o."tenantId" = ${tenantId}::uuid
            AND o."deliveredAt" >= ${sixMonthsAgo}
            AND o.status != 'CANCELLED'
            AND ol."isSample" = false
          GROUP BY ol."skuId"
          ORDER BY revenue DESC
          LIMIT 10
        `,

        // Company-wide top 20 products (most recent calculation)
        db.topProduct.findMany({
          where: {
            tenantId,
          },
          orderBy: {
            calculatedAt: "desc",
          },
          take: 20,
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
        }),

        // Invoices for account holds/balances
        db.invoice.findMany({
          where: {
            tenantId,
            customerId,
            status: {
              in: ["SENT", "OVERDUE"],
            },
          },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            dueDate: true,
            issuedAt: true,
          },
          orderBy: {
            dueDate: "asc",
          },
        }),

        // Open follow-up sample items
        db.activitySampleItem.findMany({
          where: {
            followUpNeeded: true,
            followUpCompletedAt: null,
            activity: {
              tenantId,
              customerId,
            },
          },
          include: {
            activity: {
              select: {
                id: true,
                subject: true,
                occurredAt: true,
              },
            },
            sku: {
              select: {
                id: true,
                code: true,
                size: true,
                unitOfMeasure: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
        db.task.findMany({
          where: {
            tenantId,
            customerId,
            userId: session.user.id,
            status: TaskStatus.PENDING,
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueAt: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: [
            {
              dueAt: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        }),
      ]);

      // Calculate YTD metrics
      const ytdOrders = orders.filter(
        (o) => o.deliveredAt && o.deliveredAt >= ytdStart
      );
      const ytdRevenue = ytdOrders.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0
      );
      const avgOrderValue =
        ytdOrders.length > 0 ? ytdRevenue / ytdOrders.length : 0;

      // Get SKU details for top products (OPTIMIZED - single batch query)
      const topProductSkuIds = topProductsRaw.map((tp) => tp.skuId);
      const skus = await db.sku.findMany({
        where: {
          id: {
            in: topProductSkuIds,
          },
        },
        include: {
          product: true,
        },
      });

      // Create SKU lookup map for O(1) access
      const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

      // Map top products with SKU details
      const topProductDetails = topProductsRaw.map((tp) => {
        const sku = skuMap.get(tp.skuId);
        return {
          skuId: tp.skuId,
          skuCode: sku?.code ?? "",
          productName: sku?.product.name ?? "",
          brand: sku?.product.brand ?? "",
          totalCases: Number(tp.totalCases),
          revenue: Number(tp.revenue),
          orderCount: Number(tp.orderCount),
        };
      });

      // Sort by revenue for "Top 10 by Revenue" (already sorted from query)
      const topByRevenue = [...topProductDetails];

      // Sort by cases for "Top 10 by Volume"
      const topByCases = [...topProductDetails].sort(
        (a, b) => b.totalCases - a.totalCases
      );

      // Product gap analysis - Top 20 company wines not yet ordered
      const orderedSkuIds = new Set(topProductsRaw.map((tp) => tp.skuId));
      const recommendations = companyTopProducts
        .filter((tp) => !orderedSkuIds.has(tp.skuId))
        .map((tp) => ({
          skuId: tp.skuId,
          skuCode: tp.sku.code,
          productName: tp.sku.product.name,
          brand: tp.sku.product.brand,
          category: tp.sku.product.category,
          rank: tp.rank,
          calculationMode: tp.rankingType,
        }));

      // Calculate days since last order
      const daysSinceLastOrder = customer.lastOrderDate
        ? differenceInDays(now, customer.lastOrderDate)
        : null;

      // Calculate days until expected order
      const daysUntilExpected = customer.nextExpectedOrderDate
        ? differenceInDays(customer.nextExpectedOrderDate, now)
        : null;

      // Outstanding balance
      const outstandingBalance = invoices.reduce(
        (sum, inv) => sum + Number(inv.total ?? 0),
        0
      );

      const btgOrderLines = await db.orderLine.findMany({
        where: {
          tenantId,
          usageType: 'BTG',
          order: {
            customerId,
            status: {
              not: 'CANCELLED',
            },
          },
        },
        select: {
          quantity: true,
          order: {
            select: {
              orderedAt: true,
            },
          },
          sku: {
            select: {
              id: true,
              code: true,
              product: {
                select: {
                  id: true,
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

      const btgSummaryMap = new Map<
        string,
        {
          skuId: string;
          skuCode: string;
          productName: string;
          brand: string | null;
          category: string | null;
          supplierName: string | null;
          totalUnits: number;
          orderCount: number;
          recentUnits: number;
          firstOrderDate: Date | null;
          lastOrderDate: Date | null;
        }
      >();

      for (const line of btgOrderLines) {
        if (!line.sku) continue;
        const key = line.sku.id;
        const orderedAt = line.order?.orderedAt ? new Date(line.order.orderedAt) : null;
        let entry = btgSummaryMap.get(key);
        if (!entry) {
          entry = {
            skuId: line.sku.id,
            skuCode: line.sku.code,
            productName: line.sku.product?.name ?? 'Unknown Product',
            brand: line.sku.product?.brand ?? null,
            category: line.sku.product?.category ?? null,
            supplierName: line.sku.product?.supplier?.name ?? null,
            totalUnits: 0,
            orderCount: 0,
            recentUnits: 0,
            firstOrderDate: null,
            lastOrderDate: null,
          };
          btgSummaryMap.set(key, entry);
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

      const btgPlacements = Array.from(btgSummaryMap.values())
        .map((entry) => {
          const monthsActive =
            entry.firstOrderDate && entry.firstOrderDate < now
              ? Math.max(1, Math.ceil(differenceInDays(now, entry.firstOrderDate) / 30))
              : 1;
          const averageMonthlyUnits = entry.totalUnits / monthsActive;
          const lastOrderDateIso = entry.lastOrderDate?.toISOString() ?? null;
          const firstOrderDateIso = entry.firstOrderDate?.toISOString() ?? null;
          const daysSinceLast = entry.lastOrderDate
            ? differenceInDays(now, entry.lastOrderDate)
            : null;

          return {
            skuId: entry.skuId,
            skuCode: entry.skuCode,
            productName: entry.productName,
            brand: entry.brand,
            category: entry.category,
            supplierName: entry.supplierName,
            totalUnits: entry.totalUnits,
            orderCount: entry.orderCount,
            recentUnits: entry.recentUnits,
            averageMonthlyUnits,
            firstOrderDate: firstOrderDateIso,
            lastOrderDate: lastOrderDateIso,
            daysSinceLastOrder: daysSinceLast,
            isActivePlacement: daysSinceLast !== null ? daysSinceLast <= 90 : false,
          };
        })
        .sort((a, b) => {
          if (a.lastOrderDate && b.lastOrderDate) {
            return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
          }
          if (a.lastOrderDate) return -1;
          if (b.lastOrderDate) return 1;
          return a.productName.localeCompare(b.productName);
        });

      return NextResponse.json({
        customer: {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
          externalId: customer.externalId,
          riskStatus: customer.riskStatus,
          phone: customer.phone,
          billingEmail: customer.billingEmail,
          address: {
            street1: customer.street1,
            street2: customer.street2,
            city: customer.city,
            state: customer.state,
            postalCode: customer.postalCode,
            country: customer.country,
          },
          salesRep: customer.salesRep
            ? {
                id: customer.salesRep.id,
                name: customer.salesRep.user.fullName,
                territory: customer.salesRep.territoryName,
              }
            : null,
          isPermanentlyClosed: customer.isPermanentlyClosed,
          closedReason: customer.closedReason,
        },
        metrics: {
          ytdRevenue,
          totalOrders: ytdOrders.length,
          avgOrderValue,
          lastOrderDate: customer.lastOrderDate?.toISOString() ?? null,
          nextExpectedOrderDate:
            customer.nextExpectedOrderDate?.toISOString() ?? null,
          averageOrderIntervalDays: customer.averageOrderIntervalDays,
          daysSinceLastOrder,
          daysUntilExpected,
          outstandingBalance,
        },
        topProducts: {
          byRevenue: topByRevenue,
          byCases: topByCases,
        },
        recommendations,
        samples: samples.map((sample) => ({
          id: sample.id,
          skuCode: sample.sku.code,
          productName: sample.sku.product.name,
          brand: sample.sku.product.brand,
          quantity: sample.quantity,
          tastedAt: sample.tastedAt.toISOString(),
          feedback: sample.feedback,
          needsFollowUp: sample.needsFollowUp,
          followedUpAt: sample.followedUpAt?.toISOString() ?? null,
          resultedInOrder: sample.resultedInOrder,
          salesRepName: sample.salesRep.user.fullName,
        })),
        activities: activities.map((activity) => ({
          id: activity.id,
          type: activity.activityType.name,
          typeCode: activity.activityType.code,
          subject: activity.subject,
          notes: activity.notes,
          occurredAt: activity.occurredAt.toISOString(),
          followUpAt: activity.followUpAt?.toISOString() ?? null,
          outcome: activity.outcomes?.[0] ?? null,
          outcomes: activity.outcomes ?? [],
          userName: activity.user?.fullName ?? "Unknown",
          relatedOrder: activity.order
            ? {
                id: activity.order.id,
                orderedAt: activity.order.orderedAt?.toISOString() ?? null,
                total: Number(activity.order.total ?? 0),
              }
            : null,
          samples: (activity.sampleItems ?? []).map((item) => ({
            id: item.id,
            skuId: item.skuId,
            sampleListItemId: item.sampleListItemId ?? null,
            feedback: item.feedback ?? "",
            followUpNeeded: item.followUpNeeded ?? false,
            followUpCompletedAt: item.followUpCompletedAt?.toISOString() ?? null,
            sku: item.sku
              ? {
                  id: item.sku.id,
                  code: item.sku.code,
                  name: item.sku.product?.name ?? null,
                  brand: item.sku.product?.brand ?? null,
                  unitOfMeasure: item.sku.unitOfMeasure ?? null,
                  size: item.sku.size ?? null,
                }
              : null,
          })),
        })),
        followUps: followUpItems.map((item) => ({
          id: item.id,
          activityId: item.activityId,
          sampleListItemId: item.sampleListItemId ?? null,
          feedback: item.feedback ?? "",
          followUpNeeded: item.followUpNeeded ?? false,
          createdAt: item.createdAt.toISOString(),
          activity: {
            id: item.activity.id,
            subject: item.activity.subject,
            occurredAt: item.activity.occurredAt.toISOString(),
          },
          sku: item.sku
            ? {
                id: item.sku.id,
                code: item.sku.code,
                name: item.sku.product?.name ?? null,
                brand: item.sku.product?.brand ?? null,
                unitOfMeasure: item.sku.unitOfMeasure ?? null,
                size: item.sku.size ?? null,
              }
            : null,
        })),
        orders: orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderedAt: order.orderedAt?.toISOString() ?? null,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          status: order.status,
          total: Number(order.total ?? 0),
          lineCount: order._count.lines,
          lines: order.lines.map((line) => ({
            id: line.id,
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice),
            sku: line.sku
              ? {
                  code: line.sku.code,
                  product: line.sku.product
                    ? {
                        id: line.sku.product.id,
                        name: line.sku.product.name,
                        brand: line.sku.product.brand,
                      }
                    : null,
                }
              : null,
          })),
          invoices: order.invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            total: Number(inv.total ?? 0),
            issuedAt: inv.issuedAt?.toISOString() ?? null,
          })),
        })),
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          total: Number(inv.total ?? 0),
          dueDate: inv.dueDate?.toISOString() ?? null,
          issuedAt: inv.issuedAt?.toISOString() ?? null,
          daysOverdue: inv.dueDate
            ? Math.max(0, differenceInDays(now, inv.dueDate))
            : 0,
        })),
        btgPlacements,
        tasks: tasks
          .map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description ?? null,
            dueAt: task.dueAt?.toISOString() ?? null,
            status: task.status,
            priority: task.priority ?? null,
            createdAt: task.createdAt.toISOString(),
          }))
          .sort((a, b) => {
            const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
            const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;

            if (dueA !== dueB) {
              return dueA - dueB;
            }

            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }),
      });
    }
  );
}

/**
 * PATCH /api/sales/customers/[customerId]
 * Update customer status (e.g., mark as closed)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { customerId } = await context.params;
      const body = await request.json();

      // Get sales rep profile
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      // Get customer
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      // Verify customer is assigned to this sales rep
      if (customer.salesRepId !== salesRep.id) {
        return NextResponse.json(
          { error: "You do not have access to this customer" },
          { status: 403 }
        );
      }

      // Prepare update data
      const updateData: Partial<{
        isPermanentlyClosed: boolean;
        closedReason: string | null;
      }> = {};

      if (typeof body.isPermanentlyClosed === "boolean") {
        updateData.isPermanentlyClosed = body.isPermanentlyClosed;

        if (body.isPermanentlyClosed && body.closedReason) {
          updateData.closedReason = body.closedReason;
        }
      }

      // Update customer
      const updatedCustomer = await db.customer.update({
        where: { id: customerId },
        data: updateData,
        include: {
          salesRep: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        customer: updatedCustomer,
        message: "Customer updated successfully"
      });
    }
  );
}
