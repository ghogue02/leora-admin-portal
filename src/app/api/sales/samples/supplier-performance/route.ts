import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      // Get all sample usage with related data
      const samples = await db.sampleUsage.findMany({
        where: {
          tenantId,
        },
        include: {
          sku: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  supplierId: true,
                  supplier: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Get order data for samples that converted
      const sampleIds = samples.map((s) => s.id);
      const orders = await db.order.findMany({
        where: {
          tenantId,
          items: {
            some: {
              // Match by SKU and customer
              skuId: {
                in: samples.map((s) => s.skuId),
              },
            },
          },
        },
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      supplierId: true,
                      brand: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Group samples by supplier
      const supplierMap = new Map<
        string,
        {
          supplierId: string;
          supplierName: string;
          brand: string;
          samples: any[];
          orders: any[];
        }
      >();

      // Process samples
      for (const sample of samples) {
        const supplier = sample.sku.product?.supplier;
        const supplierId = supplier?.id || "unknown";
        const supplierName = supplier?.name || "Unknown Supplier";
        const brand = sample.sku.product?.brand || "Unknown Brand";

        if (!supplierMap.has(supplierId)) {
          supplierMap.set(supplierId, {
            supplierId,
            supplierName,
            brand,
            samples: [],
            orders: [],
          });
        }

        supplierMap.get(supplierId)!.samples.push(sample);
      }

      // Process orders and link to suppliers
      for (const order of orders) {
        for (const item of order.items) {
          const supplierId = item.sku.product?.supplierId;
          if (supplierId && supplierMap.has(supplierId)) {
            const supplierData = supplierMap.get(supplierId)!;

            // Check if this order relates to a sample
            const relatedSample = supplierData.samples.find(
              (s) =>
                s.customerId === order.customerId &&
                s.skuId === item.skuId &&
                new Date(order.createdAt) >= new Date(s.tastedAt)
            );

            if (relatedSample) {
              supplierData.orders.push({
                order,
                item,
                sample: relatedSample,
              });
            }
          }
        }
      }

      // Calculate performance metrics for each supplier
      const supplierPerformance = Array.from(supplierMap.values()).map((supplier) => {
        const totalSamples = supplier.samples.length;
        const tastingsCount = supplier.samples.filter((s) => s.feedback).length;
        const ordersCount = supplier.orders.length;
        const conversionRate = totalSamples > 0 ? (ordersCount / totalSamples) * 100 : 0;

        // Calculate revenue generated
        const revenueGenerated = supplier.orders.reduce((sum, orderData) => {
          const itemRevenue = orderData.item.price * orderData.item.quantity;
          return sum + itemRevenue;
        }, 0);

        // Calculate average days to order
        const daysToOrder = supplier.orders
          .map((orderData) => {
            const sampleDate = new Date(orderData.sample.tastedAt);
            const orderDate = new Date(orderData.order.createdAt);
            const days = Math.floor(
              (orderDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return days;
          })
          .filter((days) => days >= 0);

        const averageDaysToOrder =
          daysToOrder.length > 0
            ? daysToOrder.reduce((sum, days) => sum + days, 0) / daysToOrder.length
            : 0;

        // Find top product
        const productSampleCounts = new Map<string, { name: string; samples: number; orders: number }>();

        for (const sample of supplier.samples) {
          const productName = `${sample.sku.product?.brand} ${sample.sku.product?.name}`;
          const current = productSampleCounts.get(productName) || { name: productName, samples: 0, orders: 0 };
          current.samples++;

          // Check if this sample led to an order
          if (supplier.orders.some(o => o.sample.id === sample.id)) {
            current.orders++;
          }

          productSampleCounts.set(productName, current);
        }

        const topProduct = Array.from(productSampleCounts.values())
          .sort((a, b) => b.samples - a.samples)[0];

        return {
          supplierId: supplier.supplierId,
          supplierName: supplier.supplierName,
          brand: supplier.brand,
          totalSamples,
          tastingsCount,
          ordersCount,
          conversionRate,
          revenueGenerated,
          averageDaysToOrder,
          topProduct,
        };
      });

      // Sort by total samples descending
      supplierPerformance.sort((a, b) => b.totalSamples - a.totalSamples);

      return NextResponse.json({
        success: true,
        suppliers: supplierPerformance,
        summary: {
          totalSuppliers: supplierPerformance.length,
          totalSamples: supplierPerformance.reduce((sum, s) => sum + s.totalSamples, 0),
          totalOrders: supplierPerformance.reduce((sum, s) => sum + s.ordersCount, 0),
          totalRevenue: supplierPerformance.reduce((sum, s) => sum + s.revenueGenerated, 0),
        },
      });
    } catch (error) {
      console.error("Supplier performance error:", error);
      return NextResponse.json(
        { error: "Failed to load supplier performance" },
        { status: 500 }
      );
    }
  });
}
