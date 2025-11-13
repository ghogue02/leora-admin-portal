import { NextRequest, NextResponse } from "next/server";
import { endOfWeek, format } from "date-fns";
import { withSalesSession } from "@/lib/auth/sales";
import { hasSalesManagerPrivileges } from "@/lib/sales/role-helpers";

const CSV_HEADER = [
  "Customer Name",
  "Customer ID",
  "Last Order Date",
  "SKU",
  "Product Name",
  "Quantity",
  "Unit Price",
  "Line Total",
].join(",");

function escapeCsv(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session, roles }) => {
    const salesRepId = session.user.salesRep?.id;
    const managerScope = hasSalesManagerPrivileges(roles);
    if (!salesRepId && !managerScope) {
      return NextResponse.json(
        { error: "Sales rep profile not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const requestedSalesRepId = managerScope ? request.nextUrl.searchParams.get("salesRepId") : null;

    // Find customers due to order using same filters as dashboard widget
    const dueCustomers = await db.customer.findMany({
      where: {
        tenantId,
        ...(managerScope
          ? requestedSalesRepId
            ? { salesRepId: requestedSalesRepId }
            : {}
          : { salesRepId }),
        isPermanentlyClosed: false,
        nextExpectedOrderDate: {
          lte: currentWeekEnd,
        },
        riskStatus: {
          in: ["HEALTHY", "AT_RISK_CADENCE"],
        },
      },
      select: {
        id: true,
        name: true,
        lastOrderDate: true,
      },
      orderBy: {
        nextExpectedOrderDate: "asc",
      },
    });

    const rows: string[] = [];

    for (const customer of dueCustomers) {
      const lastOrder = await db.order.findFirst({
        where: {
          tenantId,
          customerId: customer.id,
          status: {
            not: "CANCELLED",
          },
        },
        orderBy: {
          orderedAt: "desc",
        },
        include: {
          lines: {
            include: {
              sku: {
                select: {
                  code: true,
                  product: {
                    select: {
                      name: true,
                      brand: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!lastOrder || lastOrder.lines.length === 0) {
        rows.push(
          [
            escapeCsv(customer.name),
            escapeCsv(customer.id),
            escapeCsv(customer.lastOrderDate ? new Date(customer.lastOrderDate).toISOString() : ""),
            "",
            "",
            "",
            "",
            "",
          ].join(",")
        );
        continue;
      }

      lastOrder.lines.forEach((line) => {
        const quantity = Number(line.quantity ?? 0);
        const unitPrice = Number(line.unitPrice ?? 0);
        const lineTotal = quantity * unitPrice;
        const skuLabel = line.sku?.code ?? "";
        const productName =
          line.sku?.product?.name ??
          (line.sku?.product?.brand ? `${line.sku.product.brand} SKU` : "") ??
          "";

        rows.push(
          [
            escapeCsv(customer.name),
            escapeCsv(customer.id),
            escapeCsv(lastOrder.orderedAt ? lastOrder.orderedAt.toISOString() : customer.lastOrderDate),
            escapeCsv(skuLabel),
            escapeCsv(productName),
            escapeCsv(quantity),
            escapeCsv(unitPrice.toFixed(2)),
            escapeCsv(lineTotal.toFixed(2)),
          ].join(",")
        );
      });
    }

    const csvContent = [CSV_HEADER, ...rows].join("\n");
    const filename = `customers-due-export-${format(now, "yyyyMMdd")}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
