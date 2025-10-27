import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * API endpoint to create automated follow-up tasks for samples
 * This runs as a background job or can be triggered manually
 */
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      // Find all samples from the last 7 days that:
      // 1. Need follow-up
      // 2. Haven't resulted in an order yet
      // 3. Haven't been followed up on yet
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const samplesNeedingFollowUp = await db.sampleUsage.findMany({
        where: {
          tenantId,
          tastedAt: {
            gte: sevenDaysAgo,
          },
          needsFollowUp: true,
          resultedInOrder: false,
          followedUpAt: null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          sku: {
            include: {
              product: {
                select: {
                  name: true,
                  brand: true,
                },
              },
            },
          },
          salesRep: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      const tasksCreated = [];

      for (const sample of samplesNeedingFollowUp) {
        // Check if a task already exists for this sample
        const existingTask = await db.task.findFirst({
          where: {
            tenantId,
            customerId: sample.customerId,
            title: {
              contains: sample.sku.product?.brand || "",
            },
            status: {
              in: ["PENDING", "IN_PROGRESS"],
            },
          },
        });

        // Only create task if one doesn't exist
        if (!existingTask) {
          const dueDate = new Date(sample.tastedAt);
          dueDate.setDate(dueDate.getDate() + 7);

          const task = await db.task.create({
            data: {
              tenantId,
              userId: sample.salesRep.userId || session.user.id,
              customerId: sample.customerId,
              title: `Follow up: ${sample.sku.product?.brand} ${sample.sku.product?.name} sample`,
              description: `Customer ${sample.customer.name} received this sample on ${sample.tastedAt.toLocaleDateString()}. ${
                sample.customerResponse
                  ? `Initial response: ${sample.customerResponse}.`
                  : ""
              } Check if they're ready to place an order.`,
              dueAt: dueDate,
              status: "PENDING",
              priority: "MEDIUM",
            },
          });

          tasksCreated.push(task);
        }
      }

      // Find samples older than 2 weeks with no order - send reminder
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const oldSamplesNoOrder = await db.sampleUsage.findMany({
        where: {
          tenantId,
          tastedAt: {
            lte: twoWeeksAgo,
          },
          resultedInOrder: false,
        },
        include: {
          customer: true,
          sku: {
            include: {
              product: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        tasksCreated: tasksCreated.length,
        samplesNeedingFollowUp: samplesNeedingFollowUp.length,
        oldSamplesNoOrder: oldSamplesNoOrder.length,
        tasks: tasksCreated,
      });
    } catch (error) {
      console.error("Auto follow-up error:", error);
      return NextResponse.json(
        { error: "Failed to create follow-up tasks" },
        { status: 500 }
      );
    }
  });
}

/**
 * GET endpoint to view samples needing follow-up
 */
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [needingFollowUp, noOrderYet, overdue] = await Promise.all([
      // Samples needing follow-up (within 7 days)
      db.sampleUsage.count({
        where: {
          tenantId,
          tastedAt: { gte: sevenDaysAgo },
          needsFollowUp: true,
          resultedInOrder: false,
          followedUpAt: null,
        },
      }),

      // All samples with no order yet
      db.sampleUsage.count({
        where: {
          tenantId,
          resultedInOrder: false,
        },
      }),

      // Samples over 2 weeks old with no order
      db.sampleUsage.count({
        where: {
          tenantId,
          tastedAt: { lte: twoWeeksAgo },
          resultedInOrder: false,
        },
      }),
    ]);

    return NextResponse.json({
      needingFollowUp,
      noOrderYet,
      overdue,
    });
  });
}
