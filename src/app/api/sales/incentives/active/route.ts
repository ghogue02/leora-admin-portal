import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { differenceInDays } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
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

      const now = new Date();

      // Fetch active incentives (between start and end dates)
      const activeIncentives = await db.salesIncentive.findMany({
        where: {
          tenantId,
          isActive: true,
          startDate: {
            lte: now,
          },
          endDate: {
            gte: now,
          },
        },
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          endDate: "asc",
        },
      });

      // Calculate progress for each incentive
      const incentivesWithProgress = await Promise.all(
        activeIncentives.map(async (incentive) => {
          let currentProgress = 0;
          let totalParticipants = 0;
          let rank: number | undefined = undefined;

          // Build base where clause for orders
          const orderWhere: any = {
            tenantId,
            customer: {
              salesRepId: salesRep.id,
            },
            deliveredAt: {
              gte: incentive.startDate,
              lte: incentive.endDate,
            },
            status: {
              not: "CANCELLED",
            },
          };

          switch (incentive.targetMetric) {
            case "revenue": {
              // Calculate revenue from delivered orders
              const revenueData = await db.order.aggregate({
                where: orderWhere,
                _sum: {
                  total: true,
                },
              });
              currentProgress = Number(revenueData._sum.total ?? 0);

              // For competitive metrics, get all reps' progress
              const uniqueReps = await db.customer.findMany({
                where: {
                  tenantId,
                  salesRepId: {
                    not: null,
                  },
                  orders: {
                    some: {
                      deliveredAt: {
                        gte: incentive.startDate,
                        lte: incentive.endDate,
                      },
                      status: {
                        not: "CANCELLED",
                      },
                    },
                  },
                },
                select: {
                  salesRepId: true,
                },
                distinct: ["salesRepId"],
              });

              totalParticipants = uniqueReps.length;

              // Calculate rank by comparing with other reps
              const repRevenues = await Promise.all(
                uniqueReps.map(async (rep) => {
                  const revenue = await db.order.aggregate({
                    where: {
                      tenantId,
                      customer: {
                        salesRepId: rep.salesRepId!,
                      },
                      deliveredAt: {
                        gte: incentive.startDate,
                        lte: incentive.endDate,
                      },
                      status: {
                        not: "CANCELLED",
                      },
                    },
                    _sum: {
                      total: true,
                    },
                  });
                  return {
                    repId: rep.salesRepId!,
                    revenue: Number(revenue._sum.total ?? 0),
                  };
                })
              );

              // Sort by revenue descending and find rank
              repRevenues.sort((a, b) => b.revenue - a.revenue);
              rank = repRevenues.findIndex((r) => r.repId === salesRep.id) + 1;
              break;
            }

            case "cases": {
              // Calculate total cases (sum of order line quantities)
              const casesData = await db.orderLine.aggregate({
                where: {
                  tenantId,
                  order: orderWhere,
                  isSample: false,
                },
                _sum: {
                  quantity: true,
                },
              });
              currentProgress = casesData._sum.quantity ?? 0;

              // Get total participants
              const allRepsCases = await db.customer.findMany({
                where: {
                  tenantId,
                  salesRepId: {
                    not: null,
                  },
                  orders: {
                    some: {
                      deliveredAt: {
                        gte: incentive.startDate,
                        lte: incentive.endDate,
                      },
                      status: {
                        not: "CANCELLED",
                      },
                    },
                  },
                },
                select: {
                  salesRepId: true,
                },
                distinct: ["salesRepId"],
              });

              totalParticipants = allRepsCases.length;

              // Calculate rank
              const repCases = await Promise.all(
                allRepsCases.map(async (rep) => {
                  const cases = await db.orderLine.aggregate({
                    where: {
                      tenantId,
                      order: {
                        customer: {
                          salesRepId: rep.salesRepId!,
                        },
                        deliveredAt: {
                          gte: incentive.startDate,
                          lte: incentive.endDate,
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
                  });
                  return {
                    repId: rep.salesRepId!,
                    cases: cases._sum.quantity ?? 0,
                  };
                })
              );

              repCases.sort((a, b) => b.cases - a.cases);
              rank = repCases.findIndex((r) => r.repId === salesRep.id) + 1;
              break;
            }

            case "new_customers": {
              // Count customers with first order in date range
              const newCustomers = await db.customer.count({
                where: {
                  tenantId,
                  salesRepId: salesRep.id,
                  orders: {
                    some: {
                      isFirstOrder: true,
                      deliveredAt: {
                        gte: incentive.startDate,
                        lte: incentive.endDate,
                      },
                      status: {
                        not: "CANCELLED",
                      },
                    },
                  },
                },
              });
              currentProgress = newCustomers;

              // Get total participants
              const allRepsNewCustomers = await db.customer.findMany({
                where: {
                  tenantId,
                  salesRepId: {
                    not: null,
                  },
                  orders: {
                    some: {
                      isFirstOrder: true,
                      deliveredAt: {
                        gte: incentive.startDate,
                        lte: incentive.endDate,
                      },
                      status: {
                        not: "CANCELLED",
                      },
                    },
                  },
                },
                select: {
                  salesRepId: true,
                },
                distinct: ["salesRepId"],
              });

              totalParticipants = allRepsNewCustomers.length;

              // Calculate rank
              const repNewCustomers = await Promise.all(
                allRepsNewCustomers.map(async (rep) => {
                  const count = await db.customer.count({
                    where: {
                      tenantId,
                      salesRepId: rep.salesRepId!,
                      orders: {
                        some: {
                          isFirstOrder: true,
                          deliveredAt: {
                            gte: incentive.startDate,
                            lte: incentive.endDate,
                          },
                          status: {
                            not: "CANCELLED",
                          },
                        },
                      },
                    },
                  });
                  return {
                    repId: rep.salesRepId!,
                    count,
                  };
                })
              );

              repNewCustomers.sort((a, b) => b.count - a.count);
              rank = repNewCustomers.findIndex((r) => r.repId === salesRep.id) + 1;
              break;
            }

            default:
              currentProgress = 0;
          }

          // Calculate days remaining
          const daysRemaining = differenceInDays(incentive.endDate, now);

          // Determine status
          let status: "active" | "ending_soon" | "almost_there";
          if (daysRemaining < 7) {
            status = "ending_soon";
          } else {
            status = "active";
          }

          // Build description with target info
          let fullDescription = incentive.description || "";
          if (incentive.targetSkuId && incentive.sku) {
            fullDescription += ` (Focus: ${incentive.sku.product.name})`;
          } else if (incentive.targetCategory) {
            fullDescription += ` (Category: ${incentive.targetCategory})`;
          }

          return {
            id: incentive.id,
            name: incentive.name,
            description: fullDescription,
            startDate: incentive.startDate.toISOString(),
            endDate: incentive.endDate.toISOString(),
            targetMetric: incentive.targetMetric,
            currentProgress,
            daysRemaining,
            status,
            rank: totalParticipants > 1 ? rank : undefined,
            totalParticipants: totalParticipants > 1 ? totalParticipants : undefined,
          };
        })
      );

      return NextResponse.json({
        incentives: incentivesWithProgress,
      });
    }
  );
}
