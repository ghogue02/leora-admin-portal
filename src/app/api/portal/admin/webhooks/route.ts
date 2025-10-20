import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    supportAlertWebhook: process.env.SUPPORT_ALERT_WEBHOOK || null,
    replayAlertWebhook: process.env.REPLAY_ALERT_WEBHOOK || null,
  });
}
