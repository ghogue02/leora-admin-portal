import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCalendarEventSchema } from "@/types/calendar";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: params.eventId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
            accountType: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: event.id,
      tenantId: event.tenantId,
      userId: event.userId,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      eventType: event.eventType,
      customerId: event.customerId,
      location: event.location,
      createdAt: event.createdAt.toISOString(),
      customer: event.customer,
    });
  } catch (error) {
    console.error("Error fetching calendar event:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar event" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateCalendarEventSchema.parse(body);

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: params.eventId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: params.eventId },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description,
        }),
        ...(validatedData.startTime && {
          startTime: new Date(validatedData.startTime),
        }),
        ...(validatedData.endTime && {
          endTime: new Date(validatedData.endTime),
        }),
        ...(validatedData.eventType && { eventType: validatedData.eventType }),
        ...(validatedData.customerId !== undefined && {
          customerId: validatedData.customerId,
        }),
        ...(validatedData.location !== undefined && {
          location: validatedData.location,
        }),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
          },
        },
      },
    });

    // TODO: Sync update to Google Calendar or Outlook

    return NextResponse.json({
      id: updatedEvent.id,
      tenantId: updatedEvent.tenantId,
      userId: updatedEvent.userId,
      title: updatedEvent.title,
      description: updatedEvent.description,
      startTime: updatedEvent.startTime.toISOString(),
      endTime: updatedEvent.endTime.toISOString(),
      eventType: updatedEvent.eventType,
      customerId: updatedEvent.customerId,
      location: updatedEvent.location,
      createdAt: updatedEvent.createdAt.toISOString(),
      customerName: updatedEvent.customer?.name,
      accountNumber: updatedEvent.customer?.accountNumber,
    });
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return NextResponse.json(
      { error: "Failed to update calendar event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: params.eventId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.calendarEvent.delete({
      where: { id: params.eventId },
    });

    // TODO: Sync deletion to Google Calendar or Outlook

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar event" },
      { status: 500 }
    );
  }
}
