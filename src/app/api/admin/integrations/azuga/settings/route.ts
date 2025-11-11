import { NextRequest, NextResponse } from "next/server";
import {
  AzugaAuthType,
  AzugaIntegrationStatus,
  type AzugaIntegrationSettings,
  type Prisma,
} from "@prisma/client";
import { withAdminSession } from "@/lib/auth/admin";
import { encryptToken } from "@/lib/token-encryption";

type UpdateAzugaSettingsPayload = {
  status?: AzugaIntegrationStatus;
  authType?: AzugaAuthType;
  environment?: "production" | "sandbox";
  username?: string | null;
  password?: string | null;
  apiKey?: string | null;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
  webhookAuthType?: "BASIC" | "HEADER";
  rateLimitPerMinute?: number;
  isTelematicsEnabled?: boolean;
  isRouteExportEnabled?: boolean;
  isRouteImportEnabled?: boolean;
  isWebhookEnabled?: boolean;
  notes?: string | null;
};

type SanitizedAzugaSettings = {
  status: AzugaIntegrationStatus;
  authType: AzugaAuthType;
  environment: "production" | "sandbox";
  username: string | null;
  hasPassword: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  webhookAuthType: string;
  webhookUrl: string | null;
  rateLimitPerMinute: number;
  isTelematicsEnabled: boolean;
  isRouteExportEnabled: boolean;
  isRouteImportEnabled: boolean;
  isWebhookEnabled: boolean;
  notes: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  updatedAt: Date | null;
  createdAt: Date | null;
};

const DEFAULT_RESPONSE: SanitizedAzugaSettings = {
  status: AzugaIntegrationStatus.PENDING,
  authType: AzugaAuthType.CREDENTIALS,
  environment: "production",
  username: null,
  hasPassword: false,
  hasApiKey: false,
  hasWebhookSecret: false,
  webhookAuthType: "BASIC",
  webhookUrl: null,
  rateLimitPerMinute: 1,
  isTelematicsEnabled: false,
  isRouteExportEnabled: true,
  isRouteImportEnabled: false,
  isWebhookEnabled: false,
  notes: null,
  lastConnectedAt: null,
  lastSyncAt: null,
  createdAt: null,
  updatedAt: null,
};

const ALLOWED_ENVIRONMENTS = new Set(["production", "sandbox"]);
const ALLOWED_WEBHOOK_AUTH = new Set(["BASIC", "HEADER"]);

function sanitizeSettings(settings: SanitizedAzugaSettings): SanitizedAzugaSettings {
  return {
    ...settings,
    username: settings.username ?? null,
    webhookUrl: settings.webhookUrl ?? null,
    notes: settings.notes ?? null,
  };
}

function serializeSettings(record: AzugaIntegrationSettings): SanitizedAzugaSettings {
  return sanitizeSettings({
    status: record.status ?? AzugaIntegrationStatus.PENDING,
    authType: record.authType ?? AzugaAuthType.CREDENTIALS,
    environment: (record.environment as "production" | "sandbox") ?? "production",
    username: record.loginUsername ?? null,
    hasPassword: Boolean(record.encryptedLoginPassword),
    hasApiKey: Boolean(record.encryptedApiKey),
    hasWebhookSecret: Boolean(record.encryptedWebhookSecret),
    webhookAuthType: record.webhookAuthType ?? "BASIC",
    webhookUrl: record.webhookUrl,
    rateLimitPerMinute: record.rateLimitPerMinute ?? 1,
    isTelematicsEnabled: record.isTelematicsEnabled ?? false,
    isRouteExportEnabled: record.isRouteExportEnabled ?? true,
    isRouteImportEnabled: record.isRouteImportEnabled ?? false,
    isWebhookEnabled: record.isWebhookEnabled ?? false,
    notes: record.notes ?? null,
    lastConnectedAt: record.lastConnectedAt ?? null,
    lastSyncAt: record.lastSyncAt ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  });
}

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const settings = await db.azugaIntegrationSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      return NextResponse.json(DEFAULT_RESPONSE);
    }

    return NextResponse.json(serializeSettings(settings));
  });
}

export async function PUT(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const payload = (await request.json().catch(() => null)) as UpdateAzugaSettingsPayload | null;
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const {
      username,
      password,
      apiKey,
      webhookSecret,
      webhookUrl,
      webhookAuthType,
      environment,
      notes,
      rateLimitPerMinute,
      status,
      authType,
      isTelematicsEnabled,
      isRouteExportEnabled,
      isRouteImportEnabled,
      isWebhookEnabled,
    } = payload;

    let normalizedWebhookUrl: string | null | undefined = undefined;
    if (typeof webhookUrl === "string") {
      const trimmed = webhookUrl.trim();

      if (trimmed.length === 0) {
        normalizedWebhookUrl = null;
      } else {
        try {
          const parsed = new URL(trimmed);
          if (!["https:", "http:"].includes(parsed.protocol)) {
            return NextResponse.json(
              { error: "Webhook URL must start with https:// or http://" },
              { status: 400 },
            );
          }
          normalizedWebhookUrl = parsed.toString();
        } catch {
          return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
        }
      }
    }

    let normalizedRateLimit: number | undefined;
    if (typeof rateLimitPerMinute !== "undefined") {
      if (
        Number.isNaN(rateLimitPerMinute) ||
        typeof rateLimitPerMinute !== "number" ||
        rateLimitPerMinute < 1
      ) {
        return NextResponse.json(
          { error: "rateLimitPerMinute must be a positive number" },
          { status: 400 },
        );
      }
      normalizedRateLimit = Math.floor(rateLimitPerMinute);
    }

    const envValue =
      typeof environment === "string" && ALLOWED_ENVIRONMENTS.has(environment)
        ? (environment as "production" | "sandbox")
        : undefined;

    const statusValue = status ?? undefined;
    const authTypeValue = authType ?? undefined;

    const sharedData: Prisma.AzugaIntegrationSettingsUpdateInput = {
      loginUsername:
        typeof username === "string"
          ? username.trim().length > 0
            ? username.trim()
            : null
          : undefined,
      environment: envValue,
      status: statusValue,
      authType: authTypeValue,
      rateLimitPerMinute: normalizedRateLimit,
      webhookUrl: normalizedWebhookUrl,
      webhookAuthType:
        typeof webhookAuthType === "string" && ALLOWED_WEBHOOK_AUTH.has(webhookAuthType)
          ? webhookAuthType
          : undefined,
      isTelematicsEnabled,
      isRouteExportEnabled,
      isRouteImportEnabled,
      isWebhookEnabled,
      notes:
        typeof notes === "string"
          ? notes.trim().length > 0
            ? notes.trim().slice(0, 2000)
            : null
          : undefined,
    };

    if (typeof password === "string" && password.trim().length > 0) {
      sharedData.encryptedLoginPassword = await encryptToken(password.trim());
    }

    if (typeof apiKey === "string" && apiKey.trim().length > 0) {
      sharedData.encryptedApiKey = await encryptToken(apiKey.trim());
    }

    if (typeof webhookSecret === "string" && webhookSecret.trim().length > 0) {
      sharedData.encryptedWebhookSecret = await encryptToken(webhookSecret.trim());
    }

    const result = await db.azugaIntegrationSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        status: statusValue ?? AzugaIntegrationStatus.PENDING,
        authType: authTypeValue ?? AzugaAuthType.CREDENTIALS,
        environment: envValue ?? "production",
        loginUsername: username?.trim() || null,
        rateLimitPerMinute: normalizedRateLimit ?? 1,
        webhookUrl: normalizedWebhookUrl ?? null,
        webhookAuthType:
          typeof webhookAuthType === "string" && ALLOWED_WEBHOOK_AUTH.has(webhookAuthType)
            ? webhookAuthType
            : "BASIC",
        isTelematicsEnabled: Boolean(isTelematicsEnabled),
        isRouteExportEnabled: typeof isRouteExportEnabled === "boolean" ? isRouteExportEnabled : true,
        isRouteImportEnabled: Boolean(isRouteImportEnabled),
        isWebhookEnabled: Boolean(isWebhookEnabled),
        notes:
          typeof notes === "string"
            ? notes.trim().length > 0
              ? notes.trim().slice(0, 2000)
              : null
            : null,
        encryptedLoginPassword:
          typeof password === "string" && password.trim().length > 0
            ? await encryptToken(password.trim())
            : null,
        encryptedApiKey:
          typeof apiKey === "string" && apiKey.trim().length > 0
            ? await encryptToken(apiKey.trim())
            : null,
        encryptedWebhookSecret:
          typeof webhookSecret === "string" && webhookSecret.trim().length > 0
            ? await encryptToken(webhookSecret.trim())
            : null,
      },
      update: sharedData,
    });

    return NextResponse.json(serializeSettings(result));
  });
}
