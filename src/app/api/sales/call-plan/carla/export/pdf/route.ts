import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { formatUTCDate } from "@/lib/dates";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const callPlanId = searchParams.get("callPlanId");

    if (!callPlanId) {
      return NextResponse.json({ error: "Call plan ID required" }, { status: 400 });
    }

    const includeObjectives = searchParams.get("includeObjectives") === "true";
    const includeNotes = searchParams.get("includeNotes") === "true";

    // Fetch call plan with accounts
    const callPlan = await prisma.weeklyCallPlan.findUnique({
      where: { id: callPlanId },
      include: {
        accounts: {
          include: {
            customer: {
              include: {
                addresses: true,
              },
            },
          },
        },
      },
    });

    if (!callPlan) {
      return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    let y = height - 50;

    // Title
    page.drawText(`Weekly Call Plan - ${new Date(callPlan.weekStart).toLocaleDateString()}`, {
      x: 50,
      y,
      size: 18,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Summary
    page.drawText(`Total Accounts: ${callPlan.accounts.length}`, {
      x: 50,
      y,
      size: 12,
      font: timesRomanFont,
    });
    y -= 40;

    // Account list
    for (const planAccount of callPlan.accounts) {
      const customer = planAccount.customer;
      const address = customer.addresses?.[0];

      // Check if we need a new page
      if (y < 100) {
        page = pdfDoc.addPage([612, 792]);
        y = height - 50;
      }

      // Customer name
      page.drawText(customer.customerName, {
        x: 50,
        y,
        size: 14,
        font: timesRomanBold,
      });
      y -= 20;

      // Address
      if (address) {
        const addressText = `${address.address1}, ${address.city}, ${address.state} ${address.zipCode}`;
        page.drawText(addressText, {
          x: 70,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 15;
      }

      // Contact status
      if (planAccount.contactOutcome) {
        page.drawText(`Status: ${planAccount.contactOutcome}`, {
          x: 70,
          y,
          size: 10,
          font: timesRomanFont,
        });
        y -= 15;
      }

      // Objectives
      if (includeObjectives && planAccount.objectives) {
        page.drawText(`Objectives: ${planAccount.objectives}`, {
          x: 70,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0.8),
        });
        y -= 15;
      }

      // Notes
      if (includeNotes && planAccount.notes) {
        const notesLines = planAccount.notes.match(/.{1,80}/g) || [];
        for (const line of notesLines) {
          page.drawText(`Notes: ${line}`, {
            x: 70,
            y,
            size: 9,
            font: timesRomanFont,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= 12;
        }
      }

      y -= 10; // Space between accounts
    }

    // Footer
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const currentPage = pdfDoc.getPage(i);
      currentPage.drawText(`Page ${i + 1} of ${pageCount}`, {
        x: width - 100,
        y: 30,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="call-plan-${formatUTCDate(new Date(callPlan.weekStart))}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
