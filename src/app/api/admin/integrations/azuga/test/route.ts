import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { loadAzugaIntegrationConfig } from "@/lib/azuga/config";
import { AzugaClient } from "@/lib/azuga/client";

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId }) => {
    try {
      const config = await loadAzugaIntegrationConfig(tenantId, {
        decryptSecrets: true,
      });

      if (!config) {
        return NextResponse.json(
          { ok: false, status: "not_configured", message: "No Azuga settings stored for this tenant." },
          { status: 200 },
        );
      }

      const client = new AzugaClient(config);
      const result = await client.testConnection();
      return NextResponse.json(result, { status: result.ok ? 200 : 200 });
    } catch (error) {
      console.error("Azuga test connection failed:", error);
      return NextResponse.json(
        { ok: false, status: "error", message: "Unexpected error while testing connection." },
        { status: 500 },
      );
    }
  });
}
