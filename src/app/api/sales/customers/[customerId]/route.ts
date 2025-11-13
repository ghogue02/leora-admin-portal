import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { hasSalesManagerPrivileges } from "@/lib/sales/role-helpers";
import { subMonths, startOfYear, differenceInDays, addDays } from "date-fns";
import { AccountPriority, TaskStatus } from "@prisma/client";
import { activitySampleItemSelect } from "@/app/api/sales/activities/_helpers";
import {
  CUSTOMER_TYPE_OPTIONS,
  FEATURE_PROGRAM_OPTIONS,
  VOLUME_CAPACITY_OPTIONS,
  CustomerType,
  FeatureProgram,
  VolumeCapacity,
  DeliveryWindow,
} from "@/types/customer";
import { getTenantChannelName } from "@/lib/realtime/channels.server";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

function sanitizeDeliveryWindows(input: unknown): { valid: boolean; value?: DeliveryWindow[]; error?: string } {
  if (typeof input === "undefined") {
    return { valid: false };
  }

  if (input === null) {
    return { valid: true, value: [] };
  }

  if (!Array.isArray(input)) {
    return { valid: false, error: "deliveryWindows must be an array" };
  }

  const cleaned: DeliveryWindow[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return { valid: false, error: "deliveryWindows entries must be objects" };
    }

    const type = (raw as { type?: string }).type;
    if (type === "BEFORE" || type === "AFTER") {
      const time = (raw as { time?: unknown }).time;
      if (!isValidTime(time)) {
        return { valid: false, error: `delivery window ${type} requires valid HH:MM time` };
      }
      cleaned.push({ type, time });
      continue;
    }

    if (type === "BETWEEN") {
      const startTime = (raw as { startTime?: unknown }).startTime;
      const endTime = (raw as { endTime?: unknown }).endTime;
      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return { valid: false, error: "delivery window BETWEEN requires startTime and endTime (HH:MM)" };
      }
      cleaned.push({ type, startTime, endTime });
      continue;
    }

    return { valid: false, error: "deliveryWindows entries must specify a valid type" };
  }

  return { valid: true, value: cleaned };
}

function formatDeliveryWindow(window: DeliveryWindow | undefined): string | null {
  if (!window) return null;
  switch (window.type) {
    case "BEFORE":
      return `Before ${window.time}`;
    case "AFTER":
      return `After ${window.time}`;
    case "BETWEEN":
      return `Between ${window.startTime} - ${window.endTime}`;
    default:
      return null;
  }
}

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
    async ({ db, tenantId, session, roles }) => {
      const { customerId } = await context.params;

      const managerScope = hasSalesManagerPrivileges(roles);
      let salesRep:
        | {
            id: string;
          }
        | null = null;

      if (!managerScope) {
        salesRep = await db.salesRep.findUnique({
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
      if (!managerScope && customer.salesRepId !== salesRep?.id) {
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
        sampleUsageFollowUps,
        contacts,
        firstOrderRecord,
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
                    id: true,
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
          lastOrderedAt: Date | null;
        }>>`
          SELECT
            ol."skuId",
            SUM(ol.quantity)::bigint as "totalCases",
            SUM(ol.quantity * ol."unitPrice")::decimal as revenue,
            COUNT(DISTINCT ol."orderId")::bigint as "orderCount",
            MAX(
              COALESCE(
                o."deliveredAt",
                o."orderedAt",
                o."createdAt"
              )
            ) AS "lastOrderedAt"
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

        // Company-wide top 20 products (last 6 months, calculated on demand)
        db.$queryRaw<Array<{
          skuId: string;
          skuCode: string;
          productName: string;
          brand: string | null;
          category: string | null;
          totalCases: bigint;
          revenue: number;
          orderCount: bigint;
          lastOrderedAt: Date | null;
        }>>`
          SELECT
            s.id AS "skuId",
            s.code AS "skuCode",
            p.name AS "productName",
            p.brand AS "brand",
            p.category AS "category",
            SUM(ol.quantity)::bigint AS "totalCases",
            SUM(ol.quantity * ol."unitPrice")::decimal AS revenue,
            COUNT(DISTINCT ol."orderId")::bigint AS "orderCount",
            MAX(
              COALESCE(
                o."deliveredAt",
                o."orderedAt",
                o."createdAt"
              )
            ) AS "lastOrderedAt"
          FROM "OrderLine" ol
          INNER JOIN "Order" o ON o.id = ol."orderId"
          INNER JOIN "Sku" s ON s.id = ol."skuId"
          INNER JOIN "Product" p ON p.id = s."productId"
          WHERE o."tenantId" = ${tenantId}::uuid
            AND o.status != 'CANCELLED'
            AND COALESCE(o."deliveredAt", o."orderedAt", o."createdAt") >= ${sixMonthsAgo}
            AND ol."isSample" = false
          GROUP BY s.id, s.code, p.name, p.brand, p.category
          ORDER BY revenue DESC
          LIMIT 20
        `,

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
        db.sampleUsage.findMany({
          where: {
            tenantId,
            customerId,
            needsFollowUp: true,
            resultedInOrder: false,
            followedUpAt: null,
          },
          include: {
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
            tastedAt: "asc",
          },
        }),
        db.customerContact.findMany({
          where: {
            tenantId,
            customerId,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        db.order.findFirst({
          where: {
            tenantId,
            customerId,
            status: {
              not: "CANCELLED",
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
            orderedAt: true,
            deliveredAt: true,
          },
        }),
      ]);

      type FollowUpSkuResult = {
        id: string;
        code: string | null;
        size: string | null;
        unitOfMeasure: string | null;
        product: {
          id: string;
          name: string | null;
          brand: string | null;
        } | null;
      };

      const nowTime = new Date();
      const buildSkuPayload = (sku?: FollowUpSkuResult | null) =>
        sku
          ? {
              id: sku.id,
              code: sku.code,
              name: sku.product?.name ?? null,
              brand: sku.product?.brand ?? null,
              unitOfMeasure: sku.unitOfMeasure ?? null,
              size: sku.size ?? null,
            }
          : null;

      const activityFollowUpsSerialized = followUpItems.map((item) => {
        const tastedAt = item.activity?.occurredAt ?? item.createdAt;
        const dueAt = addDays(tastedAt ?? item.createdAt, 7);
        return {
          id: item.id,
          source: "activity" as const,
          activityId: item.activityId,
          sampleItemId: item.id,
          sampleUsageId: null,
          feedback: item.feedback ?? "",
          followUpNeeded: item.followUpNeeded ?? false,
          tastedAt: tastedAt ? tastedAt.toISOString() : null,
          dueAt: dueAt.toISOString(),
          overdue: dueAt.getTime() < nowTime.getTime(),
          description: item.feedback ?? null,
          activity: item.activity
            ? {
                id: item.activity.id,
                subject: item.activity.subject,
                occurredAt: item.activity.occurredAt?.toISOString() ?? null,
              }
            : null,
          sku: buildSkuPayload(item.sku),
        };
      });

      const sampleUsageFollowUpsSerialized = sampleUsageFollowUps.map((usage) => {
        const dueAt = addDays(usage.tastedAt, 7);
        return {
          id: usage.id,
          source: "sample_usage" as const,
          activityId: null,
          sampleItemId: null,
          sampleUsageId: usage.id,
          feedback: usage.feedback ?? "",
          followUpNeeded: usage.needsFollowUp,
          tastedAt: usage.tastedAt.toISOString(),
          dueAt: dueAt.toISOString(),
          overdue: dueAt.getTime() < nowTime.getTime(),
          description: usage.customerResponse ?? usage.feedback ?? null,
          activity: null,
          sku: buildSkuPayload(usage.sku),
        };
      });

      const combinedFollowUps = [...activityFollowUpsSerialized, ...sampleUsageFollowUpsSerialized].sort(
        (a, b) => {
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Date.now();
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Date.now();
          return aDue - bDue;
        },
      );

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
          lastOrderedAt: tp.lastOrderedAt
            ? new Date(tp.lastOrderedAt).toISOString()
            : null,
        };
      });

      // Sort by revenue for "Top 10 by Revenue" (already sorted from query)
      const topByRevenue = [...topProductDetails];

      // Sort by cases for "Top 10 by Volume"
      const topByCases = [...topProductDetails].sort(
        (a, b) => b.totalCases - a.totalCases
      );

      // Product gap analysis - Top 20 company wines not yet ordered
      const customerOrderedSkuIds = new Set<string>();
      orders.forEach((order) => {
        order.lines.forEach((line) => {
          const skuId = line.sku?.id;
          if (skuId) {
            customerOrderedSkuIds.add(skuId);
          }
        });
      });

      const recommendationsRaw = companyTopProducts.filter(
        (tp) => !customerOrderedSkuIds.has(tp.skuId)
      );

      const recommendations = recommendationsRaw.map((tp, index) => ({
        skuId: tp.skuId,
        skuCode: tp.skuCode,
        productName: tp.productName,
        brand: tp.brand,
        category: tp.category,
        rank: index + 1,
        calculationMode: "REVENUE",
        lastOrderedAt: tp.lastOrderedAt
          ? new Date(tp.lastOrderedAt).toISOString()
          : null,
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

      const ordersChannel = getTenantChannelName(tenantId, "orders");
      const firstOrderDateValue =
        firstOrderRecord?.deliveredAt ??
        firstOrderRecord?.orderedAt ??
        firstOrderRecord?.createdAt ??
        null;
      const firstOrderDateIso = firstOrderDateValue
        ? firstOrderDateValue.toISOString()
        : null;

      return NextResponse.json({
        tenantId,
        realtimeChannels: {
          orders: ordersChannel,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
          externalId: customer.externalId,
          riskStatus: customer.riskStatus,
          phone: customer.phone,
          internationalPhone: customer.internationalPhone,
          billingEmail: customer.billingEmail,
          paymentTerms: customer.paymentTerms,
          licenseNumber: customer.licenseNumber,
          deliveryInstructions: customer.deliveryInstructions,
          deliveryMethod: customer.deliveryMethod,
          paymentMethod: customer.paymentMethod,
          defaultWarehouseLocation: customer.defaultWarehouseLocation,
          website: customer.website,
          googlePlaceId: customer.googlePlaceId,
          googlePlaceName: customer.googlePlaceName,
          googleFormattedAddress: customer.googleFormattedAddress,
          googleMapsUrl: customer.googleMapsUrl,
          googleBusinessStatus: customer.googleBusinessStatus,
          googlePlaceTypes: customer.googlePlaceTypes ?? [],
          deliveryWindows: Array.isArray(customer.deliveryWindows)
            ? (customer.deliveryWindows as DeliveryWindow[])
            : [],
          accountPriority: customer.accountPriority,
          accountPriorityManuallySet: customer.accountPriorityManuallySet,
          accountPriorityAutoAssignedAt: customer.accountPriorityAutoAssignedAt
            ? customer.accountPriorityAutoAssignedAt.toISOString()
            : null,
          type: (customer.type as CustomerType | null) ?? null,
          volumeCapacity: (customer.volumeCapacity as VolumeCapacity | null) ?? null,
          featurePrograms: (customer.featurePrograms as FeatureProgram[]) ?? [],
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
          firstOrderDate: firstOrderDateIso,
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
        contacts: contacts.map((contact) => ({
          id: contact.id,
          fullName: contact.fullName,
          role: contact.role,
          phone: contact.phone,
          mobile: contact.mobile,
          email: contact.email,
          notes: contact.notes,
          businessCardUrl: contact.businessCardUrl,
          createdAt: contact.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
        followUps: combinedFollowUps,
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
        name: string;
        accountNumber: string | null;
        billingEmail: string | null;
        phone: string | null;
        paymentTerms: string | null;
        licenseNumber: string | null;
        street1: string | null;
        street2: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        deliveryInstructions: string | null;
        deliveryMethod: string | null;
        paymentMethod: string | null;
        defaultWarehouseLocation: string | null;
        deliveryWindows: DeliveryWindow[];
        defaultDeliveryTimeWindow: string | null;
        type: CustomerType | null;
        volumeCapacity: VolumeCapacity | null;
        featurePrograms: FeatureProgram[];
        accountPriority: AccountPriority | null;
        accountPriorityAutoAssignedAt: Date | null;
        accountPriorityManuallySet: boolean;
      }> = {};

      const editableStringFields = [
        "name",
        "accountNumber",
        "billingEmail",
        "phone",
        "internationalPhone",
        "paymentTerms",
        "licenseNumber",
        "street1",
        "street2",
        "city",
        "state",
        "postalCode",
        "country",
        "deliveryInstructions",
        "deliveryMethod",
        "paymentMethod",
        "defaultWarehouseLocation",
        "website",
        "googlePlaceId",
        "googlePlaceName",
        "googleFormattedAddress",
        "googleMapsUrl",
        "googleBusinessStatus",
      ] as const;

      for (const field of editableStringFields) {
        if (!(field in body)) {
          continue;
        }

        const rawValue = body[field];
        if (rawValue !== null && typeof rawValue !== "string") {
          return NextResponse.json(
            { error: `${field} must be a string or null` },
            { status: 400 }
          );
        }

        const trimmedValue =
          typeof rawValue === "string" ? rawValue.trim() : null;

        if (field === "name") {
          if (!trimmedValue) {
            return NextResponse.json(
              { error: "Customer name is required" },
              { status: 400 }
            );
          }
          updateData.name = trimmedValue;
        } else {
          updateData[field] = trimmedValue;
        }
      }

      if (typeof body.isPermanentlyClosed === "boolean") {
        updateData.isPermanentlyClosed = body.isPermanentlyClosed;

        if (body.isPermanentlyClosed && body.closedReason) {
          updateData.closedReason = body.closedReason;
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, "deliveryWindows")) {
        const windowsResult = sanitizeDeliveryWindows(body.deliveryWindows);
        if (!windowsResult.valid) {
          return NextResponse.json(
            { error: windowsResult.error ?? "Invalid deliveryWindows payload" },
            { status: 400 }
          );
        }

        const sanitized = windowsResult.value ?? [];
        updateData.deliveryWindows = sanitized;
        updateData.defaultDeliveryTimeWindow = sanitized.length
          ? formatDeliveryWindow(sanitized[0])
          : null;
      }

      if (typeof body.type !== "undefined") {
        if (
          body.type !== null &&
          !CUSTOMER_TYPE_OPTIONS.includes(body.type as CustomerType)
        ) {
          return NextResponse.json(
            { error: "Invalid customer type" },
            { status: 400 }
          );
        }
        updateData.type = body.type ?? null;
      }

      if (typeof body.volumeCapacity !== "undefined") {
        if (
          body.volumeCapacity !== null &&
          !VOLUME_CAPACITY_OPTIONS.includes(body.volumeCapacity as VolumeCapacity)
        ) {
          return NextResponse.json(
            { error: "Invalid volume capacity" },
            { status: 400 }
          );
        }
        updateData.volumeCapacity = body.volumeCapacity ?? null;
      }

      if (typeof body.featurePrograms !== "undefined") {
        if (!Array.isArray(body.featurePrograms)) {
          return NextResponse.json(
            { error: "featurePrograms must be an array" },
            { status: 400 }
          );
        }

        const cleanedPrograms = body.featurePrograms
          .filter((program: unknown): program is FeatureProgram =>
            typeof program === "string" &&
            FEATURE_PROGRAM_OPTIONS.includes(program as FeatureProgram)
          )
          .filter((program, index, arr) => arr.indexOf(program) === index);

        if (cleanedPrograms.length !== body.featurePrograms.length) {
          return NextResponse.json(
            { error: "featurePrograms contains invalid entries" },
            { status: 400 }
          );
        }

        updateData.featurePrograms = cleanedPrograms;
      }

      let manualOverrideValue: boolean | undefined;

      if (typeof body.accountPriority !== "undefined") {
        if (
          body.accountPriority !== null &&
          !Object.values(AccountPriority).includes(body.accountPriority as AccountPriority)
        ) {
          return NextResponse.json(
            { error: "Invalid account priority" },
            { status: 400 },
          );
        }
        updateData.accountPriority = body.accountPriority ?? null;
        manualOverrideValue =
          typeof body.accountPriorityManuallySet === "boolean"
            ? body.accountPriorityManuallySet
            : true;
      }

      if (
        typeof manualOverrideValue === "undefined" &&
        typeof body.accountPriorityManuallySet === "boolean"
      ) {
        manualOverrideValue = body.accountPriorityManuallySet;
      }

      if (typeof manualOverrideValue === "boolean") {
        updateData.accountPriorityManuallySet = manualOverrideValue;
        if (!manualOverrideValue) {
          updateData.accountPriorityAutoAssignedAt = new Date();
        }
      }

      if (typeof body.googlePlaceTypes !== "undefined") {
        if (body.googlePlaceTypes === null) {
          updateData.googlePlaceTypes = [];
        } else if (!Array.isArray(body.googlePlaceTypes)) {
          return NextResponse.json(
            { error: "googlePlaceTypes must be an array" },
            { status: 400 }
          );
        } else {
          const cleanedTypes = (body.googlePlaceTypes as unknown[])
            .filter((type): type is string => typeof type === "string")
            .map((type) => type.trim())
            .filter((type, index, arr) => type.length && arr.indexOf(type) === index);
          updateData.googlePlaceTypes = cleanedTypes;
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
