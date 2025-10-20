import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { logSalesRepUpdate } from "@/lib/audit/log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const { id: repId } = await params;

      // Fetch sales rep with full details
      const salesRep = await db.salesRep.findUnique({
        where: {
          id: repId,
          tenantId,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          customers: {
            where: {
              isPermanentlyClosed: false,
            },
            select: {
              id: true,
              lastOrderDate: true,
            },
          },
          productGoals: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              periodStart: "desc",
            },
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
      }

      // Get date ranges
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const fortyFiveDaysAgo = new Date(now);
      fortyFiveDaysAgo.setDate(now.getDate() - 45);

      // Get YTD performance
      const ytdStats = await db.order.aggregate({
        where: {
          tenantId,
          customer: {
            salesRepId: repId,
          },
          deliveredAt: {
            gte: yearStart,
          },
          status: {
            not: "CANCELLED",
          },
        },
        _sum: {
          total: true,
        },
        _count: true,
      });

      // Count active customers (ordered in last 45 days)
      const activeCustomers = salesRep.customers.filter(customer => {
        if (!customer.lastOrderDate) return false;
        return new Date(customer.lastOrderDate) >= fortyFiveDaysAgo;
      }).length;

      const ytdRevenue = Number(ytdStats._sum.total ?? 0);
      const annualQuota = Number(salesRep.annualRevenueQuota ?? 0);
      const annualQuotaPercent = annualQuota > 0 ? (ytdRevenue / annualQuota) * 100 : 0;

      return NextResponse.json({
        rep: {
          id: salesRep.id,
          userId: salesRep.userId,
          territoryName: salesRep.territoryName,
          deliveryDay: salesRep.deliveryDay,
          weeklyRevenueQuota: salesRep.weeklyRevenueQuota
            ? Number(salesRep.weeklyRevenueQuota)
            : null,
          monthlyRevenueQuota: salesRep.monthlyRevenueQuota
            ? Number(salesRep.monthlyRevenueQuota)
            : null,
          quarterlyRevenueQuota: salesRep.quarterlyRevenueQuota
            ? Number(salesRep.quarterlyRevenueQuota)
            : null,
          annualRevenueQuota: salesRep.annualRevenueQuota
            ? Number(salesRep.annualRevenueQuota)
            : null,
          weeklyCustomerQuota: salesRep.weeklyCustomerQuota,
          sampleAllowancePerMonth: salesRep.sampleAllowancePerMonth,
          isActive: salesRep.isActive,
          user: salesRep.user,
          performance: {
            ytdRevenue,
            ytdOrders: ytdStats._count,
            annualQuotaPercent,
            customersAssigned: salesRep.customers.length,
            activeCustomers,
          },
          productGoals: salesRep.productGoals.map(goal => ({
            id: goal.id,
            skuId: goal.skuId,
            productCategory: goal.productCategory,
            targetRevenue: goal.targetRevenue ? Number(goal.targetRevenue) : null,
            targetCases: goal.targetCases,
            periodStart: goal.periodStart.toISOString(),
            periodEnd: goal.periodEnd.toISOString(),
            sku: goal.sku
              ? {
                  code: goal.sku.code,
                  product: goal.sku.product,
                }
              : undefined,
          })),
        },
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { id: repId } = await params;

      // Verify rep exists and belongs to tenant
      const existingRep = await db.salesRep.findUnique({
        where: {
          id: repId,
          tenantId,
        },
      });

      if (!existingRep) {
        return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
      }

      const body = await request.json();

      // Validate quota values
      if (body.weeklyRevenueQuota !== undefined && body.weeklyRevenueQuota !== null) {
        if (body.weeklyRevenueQuota < 0) {
          return NextResponse.json(
            { error: "Weekly revenue quota must be >= 0" },
            { status: 400 }
          );
        }
      }

      if (body.monthlyRevenueQuota !== undefined && body.monthlyRevenueQuota !== null) {
        if (body.monthlyRevenueQuota < 0) {
          return NextResponse.json(
            { error: "Monthly revenue quota must be >= 0" },
            { status: 400 }
          );
        }
      }

      if (body.quarterlyRevenueQuota !== undefined && body.quarterlyRevenueQuota !== null) {
        if (body.quarterlyRevenueQuota < 0) {
          return NextResponse.json(
            { error: "Quarterly revenue quota must be >= 0" },
            { status: 400 }
          );
        }
      }

      if (body.annualRevenueQuota !== undefined && body.annualRevenueQuota !== null) {
        if (body.annualRevenueQuota < 0) {
          return NextResponse.json(
            { error: "Annual revenue quota must be >= 0" },
            { status: 400 }
          );
        }
      }

      if (body.weeklyCustomerQuota !== undefined && body.weeklyCustomerQuota !== null) {
        if (body.weeklyCustomerQuota < 0) {
          return NextResponse.json(
            { error: "Weekly customer quota must be >= 0" },
            { status: 400 }
          );
        }
      }

      if (body.sampleAllowancePerMonth !== undefined && body.sampleAllowancePerMonth !== null) {
        if (body.sampleAllowancePerMonth < 0) {
          return NextResponse.json(
            { error: "Sample allowance must be >= 0" },
            { status: 400 }
          );
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (body.territoryName !== undefined) updateData.territoryName = body.territoryName;
      if (body.deliveryDay !== undefined) updateData.deliveryDay = body.deliveryDay;
      if (body.weeklyRevenueQuota !== undefined)
        updateData.weeklyRevenueQuota = body.weeklyRevenueQuota;
      if (body.monthlyRevenueQuota !== undefined)
        updateData.monthlyRevenueQuota = body.monthlyRevenueQuota;
      if (body.quarterlyRevenueQuota !== undefined)
        updateData.quarterlyRevenueQuota = body.quarterlyRevenueQuota;
      if (body.annualRevenueQuota !== undefined)
        updateData.annualRevenueQuota = body.annualRevenueQuota;
      if (body.weeklyCustomerQuota !== undefined)
        updateData.weeklyCustomerQuota = body.weeklyCustomerQuota;
      if (body.sampleAllowancePerMonth !== undefined)
        updateData.sampleAllowancePerMonth = body.sampleAllowancePerMonth;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;

      // Update sales rep
      const updatedRep = await db.salesRep.update({
        where: {
          id: repId,
        },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Log to AuditLog
      await logSalesRepUpdate(db, {
        tenantId,
        userId: session.user.id,
        salesRepId: repId,
        changes: updateData,
        metadata: {
          updatedBy: session.user.email,
          updatedByName: session.user.fullName,
        },
      });

      return NextResponse.json({
        rep: {
          id: updatedRep.id,
          userId: updatedRep.userId,
          territoryName: updatedRep.territoryName,
          deliveryDay: updatedRep.deliveryDay,
          weeklyRevenueQuota: updatedRep.weeklyRevenueQuota
            ? Number(updatedRep.weeklyRevenueQuota)
            : null,
          monthlyRevenueQuota: updatedRep.monthlyRevenueQuota
            ? Number(updatedRep.monthlyRevenueQuota)
            : null,
          quarterlyRevenueQuota: updatedRep.quarterlyRevenueQuota
            ? Number(updatedRep.quarterlyRevenueQuota)
            : null,
          annualRevenueQuota: updatedRep.annualRevenueQuota
            ? Number(updatedRep.annualRevenueQuota)
            : null,
          weeklyCustomerQuota: updatedRep.weeklyCustomerQuota,
          sampleAllowancePerMonth: updatedRep.sampleAllowancePerMonth,
          isActive: updatedRep.isActive,
          user: updatedRep.user,
        },
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}
