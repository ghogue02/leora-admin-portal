import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { buildCustomerHealthSnapshot } from "@/lib/sales/customer-health-service";

function toCsv(rows: Array<Record<string, string | number | null>>) {
  const header = Object.keys(rows[0] ?? {});
  const escape = (value: string | number | null) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(header.map((key) => escape(row[key])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json({ error: "Sales rep profile not found" }, { status: 404 });
      }

      const snapshot = await buildCustomerHealthSnapshot({
        db,
        tenantId,
        salesRepId: salesRep.id,
        userId: session.user.id,
      });

      const format = request.nextUrl.searchParams.get("format") ?? "json";
      if (format === "csv") {
        if (!snapshot.reportRows.length) {
          return new NextResponse("", {
            status: 204,
          });
        }

        const csv = toCsv(
          snapshot.reportRows.map((row) => ({
            customerId: row.customerId,
            name: row.name,
            accountType: row.accountType ?? "",
            classification: row.classification,
            trailingTwelveRevenue: row.trailingTwelveRevenue.toFixed(2),
            averageMonthlyRevenue: row.averageMonthlyRevenue.toFixed(2),
            last90Revenue: row.last90Revenue.toFixed(2),
            last60Revenue: row.last60Revenue.toFixed(2),
            lastOrderDate: row.lastOrderDate ?? "",
            daysSinceLastOrder: row.daysSinceLastOrder ?? "",
            isDormant: row.isDormant ? "yes" : "no",
            targetStartDate: row.targetStartDate ?? "",
            firstOrderDate: row.firstOrderDate ?? "",
            ttfoDays: row.ttfoDays ?? "",
          }))
        );

        return new NextResponse(csv, {
          status: 200,
          headers: {
            "content-type": "text/csv",
            "content-disposition": "attachment; filename=customer-health-report.csv",
          },
        });
      }

      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        coverage: snapshot.coverage,
        signals: snapshot.signals,
        portfolio: snapshot.portfolio,
        targetPipeline: snapshot.targetPipeline,
        coldLeads: snapshot.coldLeads,
        customers: snapshot.reportRows,
      });
    }
  );
}
