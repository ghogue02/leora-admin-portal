import type { Prisma, PrismaClient } from "@prisma/client";
import { AzugaAuthType, AzugaIntegrationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/token-encryption";

export type AzugaFeatureFlags = {
  telemetry: boolean;
  routeExport: boolean;
  routeImport: boolean;
  webhook: boolean;
};

export type AzugaSecrets = {
  username: string | null;
  password: string | null;
  apiKey: string | null;
  webhookSecret: string | null;
};

export type AzugaIntegrationConfig = {
  tenantId: string;
  status: AzugaIntegrationStatus;
  authType: AzugaAuthType;
  environment: "production" | "sandbox";
  rateLimitPerMinute: number;
  webhookAuthType: string;
  webhookUrl: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  features: AzugaFeatureFlags;
  secrets: AzugaSecrets;
};

type PrismaDb = PrismaClient | Prisma.TransactionClient;

type LoadOptions = {
  db?: PrismaDb;
  decryptSecrets?: boolean;
};

/**
 * Loads Azuga integration settings for a tenant and optionally decrypts stored secrets.
 * Returns null if the tenant has not configured Azuga yet.
 */
export async function loadAzugaIntegrationConfig(
  tenantId: string,
  options: LoadOptions = {},
): Promise<AzugaIntegrationConfig | null> {
  const { db = prisma, decryptSecrets = false } = options;

  const record = await db.azugaIntegrationSettings.findUnique({
    where: { tenantId },
  });

  if (!record) {
    return null;
  }

  const secrets: AzugaSecrets = {
    username: record.loginUsername ?? null,
    password: null,
    apiKey: null,
    webhookSecret: null,
  };

  if (decryptSecrets) {
    secrets.password = record.encryptedLoginPassword
      ? await decryptToken(record.encryptedLoginPassword)
      : null;
    secrets.apiKey = record.encryptedApiKey ? await decryptToken(record.encryptedApiKey) : null;
    secrets.webhookSecret = record.encryptedWebhookSecret
      ? await decryptToken(record.encryptedWebhookSecret)
      : null;
  }

  return {
    tenantId,
    status: record.status ?? AzugaIntegrationStatus.PENDING,
    authType: record.authType ?? AzugaAuthType.CREDENTIALS,
    environment: (record.environment as "production" | "sandbox") ?? "production",
    rateLimitPerMinute: record.rateLimitPerMinute ?? 1,
    webhookAuthType: record.webhookAuthType ?? "BASIC",
    webhookUrl: record.webhookUrl ?? null,
    lastConnectedAt: record.lastConnectedAt ?? null,
    lastSyncAt: record.lastSyncAt ?? null,
    features: {
      telemetry: record.isTelematicsEnabled ?? false,
      routeExport: record.isRouteExportEnabled ?? true,
      routeImport: record.isRouteImportEnabled ?? false,
      webhook: record.isWebhookEnabled ?? false,
    },
    secrets,
  };
}
