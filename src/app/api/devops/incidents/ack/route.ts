import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { notifyIncidentAcknowledged } from "@/lib/observability/incidents";

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ user }) => {
    const body = await request.json().catch(() => null);
    const pingId = body?.pingId as string | undefined;
    if (!pingId) {
      return NextResponse.json({ error: "pingId required" }, { status: 400 });
    }

    const ping = await prisma.healthPingLog.update({
      where: { id: pingId },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: user.email,
        acknowledgedByName: user.name,
      },
    }).catch(() => null);

    if (!ping) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    await notifyIncidentAcknowledged(ping.id, { email: user.email, name: user.name });

    return NextResponse.json({ ok: true });
  });
}
