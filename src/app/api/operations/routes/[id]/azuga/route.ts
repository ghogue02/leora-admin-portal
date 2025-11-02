import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      try {
        const route = await db.deliveryRoute.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
          include: {
            stops: {
              include: {
                order: {
                  include: {
                    customer: {
                      select: {
                        id: true,
                        businessName: true,
                        contactName: true,
                        phone: true,
                        shippingAddress: true,
                        shippingCity: true,
                        shippingState: true,
                        shippingZip: true,
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
                },
              },
              orderBy: {
                stopNumber: "asc",
              },
            },
          },
        });

        if (!route) {
          return NextResponse.json(
            { error: "Route not found" },
            { status: 404 },
          );
        }

        const csvRows: string[] = [
          "Stop #,Customer Name,Contact,Phone,Address,City,State,Zip,Products,Total Items,Estimated Arrival,Notes",
        ];

        route.stops.forEach((stop) => {
          const customer = stop.order.customer;
          const products = stop.order.lines
            .map((line) => `${line.sku.product.name} (${line.quantity})`)
            .join("; ");

          const totalItems = stop.order.lines.reduce((sum, line) => sum + line.quantity, 0);

          const estimatedArrival = stop.estimatedArrival
            ? new Date(stop.estimatedArrival).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          csvRows.push(
            [
              stop.stopNumber,
              customer?.businessName || "Unknown",
              customer?.contactName || "",
              customer?.phone || "",
              customer?.shippingAddress || "",
              customer?.shippingCity || "",
              customer?.shippingState || "",
              customer?.shippingZip || "",
              `"${products}"`,
              totalItems,
              estimatedArrival,
              stop.notes || "",
            ].join(","),
          );
        });

        const csvContent = csvRows.join("\n");
        const filename = `route-${route.routeName}-${new Date().toISOString().split("T")[0]}.csv`;

        await db.routeExport.create({
          data: {
            tenantId,
            orderCount: route.stops.length,
            filename,
            exportedBy: session.user.id,
          },
        });

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } catch (error) {
        console.error("Error exporting route to Azuga:", error);
        return NextResponse.json(
          { error: "Failed to export route" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
