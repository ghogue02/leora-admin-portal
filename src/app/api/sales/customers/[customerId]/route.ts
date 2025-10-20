import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subMonths, startOfYear, differenceInDays } from "date-fns";

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

      // Fetch all related data in parallel
      const [
        orders,
        activities,
        samples,
        topProducts,
        companyTopProducts,
        invoices,
      ] = await Promise.all([
        // Order history with invoice links
        db.order.findMany({
          where: {
            tenantId,
            customerId,
            status: {
              not: "CANCELLED",
            },
          },
          include: {
            lines: {
              include: {
                sku: {
                  include: {
                    product: true,
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
          },
          orderBy: {
            deliveredAt: "desc",
          },
          take: 50,
        }),

        // Activity history
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
          },
          orderBy: {
            occurredAt: "desc",
          },
          take: 20,
        }),

        // Sample history
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
        }),

        // Top products for this customer (by revenue & volume)
        db.orderLine.groupBy({
          by: ["skuId"],
          where: {
            tenantId,
            order: {
              customerId,
              deliveredAt: {
                gte: sixMonthsAgo,
              },
              status: {
                not: "CANCELLED",
              },
            },
            isSample: false,
          },
          _sum: {
            quantity: true,
          },
          _count: {
            id: true,
          },
        }),

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

      // Get detailed top products with revenue calculation
      const topProductDetails = await Promise.all(
        topProducts.slice(0, 10).map(async (tp) => {
          const sku = await db.sku.findUnique({
            where: { id: tp.skuId },
            include: {
              product: true,
            },
          });

          // Calculate revenue for this SKU
          const orderLines = await db.orderLine.findMany({
            where: {
              tenantId,
              skuId: tp.skuId,
              order: {
                customerId,
                deliveredAt: {
                  gte: sixMonthsAgo,
                },
                status: {
                  not: "CANCELLED",
                },
              },
              isSample: false,
            },
            select: {
              quantity: true,
              unitPrice: true,
            },
          });

          const revenue = orderLines.reduce(
            (sum, line) =>
              sum + line.quantity * Number(line.unitPrice),
            0
          );

          return {
            skuId: tp.skuId,
            skuCode: sku?.code ?? "",
            productName: sku?.product.name ?? "",
            brand: sku?.product.brand ?? "",
            totalCases: tp._sum.quantity ?? 0,
            revenue,
            orderCount: tp._count.id,
          };
        })
      );

      // Sort by revenue for "Top 10 by Revenue"
      const topByRevenue = [...topProductDetails].sort(
        (a, b) => b.revenue - a.revenue
      );

      // Sort by cases for "Top 10 by Volume"
      const topByCases = [...topProductDetails].sort(
        (a, b) => b.totalCases - a.totalCases
      );

      // Product gap analysis - Top 20 company wines not yet ordered
      const orderedSkuIds = new Set(topProducts.map((tp) => tp.skuId));
      const recommendations = companyTopProducts
        .filter((tp) => !orderedSkuIds.has(tp.skuId))
        .map((tp) => ({
          skuId: tp.skuId,
          skuCode: tp.sku.code,
          productName: tp.sku.product.name,
          brand: tp.sku.product.brand,
          category: tp.sku.product.category,
          rank: tp.rank,
          calculationMode: tp.calculationMode,
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
          outcome: activity.outcome,
          userName: activity.user?.fullName ?? "Unknown",
          relatedOrder: activity.order
            ? {
                id: activity.order.id,
                orderedAt: activity.order.orderedAt?.toISOString() ?? null,
                total: Number(activity.order.total ?? 0),
              }
            : null,
        })),
        orders: orders.map((order) => ({
          id: order.id,
          orderedAt: order.orderedAt?.toISOString() ?? null,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          status: order.status,
          total: Number(order.total ?? 0),
          lineCount: order.lines.length,
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
      });
    }
  );
}
