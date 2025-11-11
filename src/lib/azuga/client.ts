import type { AzugaIntegrationConfig } from "./config";

export type AzugaConnectionTestResult =
  | {
      ok: true;
      status: "ready";
      message: string;
    }
  | {
      ok: false;
      status:
        | "not_configured"
        | "pending_status"
        | "missing_credentials"
        | "missing_webhook_secret"
        | "network_disabled";
      message: string;
    };

const AUTH_BASE = "https://auth.azuga.com/azuga-as/oauth2/login/oauthtoken.json";
const API_BASE_DEFAULT = "https://services.azuga.com/azuga-ws-oauth/v3/";

export class AzugaClient {
  constructor(private readonly config: AzugaIntegrationConfig) {}

  /**
   * Placeholder test connection flow until credentials are available.
   * Verifies configuration completeness and indicates whether a real API call can be attempted.
   */
  async testConnection(): Promise<AzugaConnectionTestResult> {
    if (!this.config) {
      return {
        ok: false,
        status: "not_configured",
        message: "Azuga has not been configured for this tenant yet.",
      };
    }

    if (this.config.status === "PENDING" || this.config.status === "DISCONNECTED") {
      return {
        ok: false,
        status: "pending_status",
        message: `Integration status is ${this.config.status}. Supply credentials and mark as CONNECTING to continue.`,
      };
    }

    const missingCreds = this.missingCredentialReasons();
    if (missingCreds.length > 0) {
      return {
        ok: false,
        status: "missing_credentials",
        message: missingCreds.join(" "),
      };
    }

    if (this.config.features.webhook && !this.config.secrets.webhookSecret) {
      return {
        ok: false,
        status: "missing_webhook_secret",
        message: "Webhook support is enabled but no webhook secret has been stored yet.",
      };
    }

    // Until outbound networking is permitted, we short-circuit here.
    const networkRestricted =
      process.env.AZUGA_ALLOW_NETWORK === "true"
        ? false
        : process.env.NETWORK_ACCESS === "restricted";

    if (networkRestricted) {
      return {
        ok: false,
        status: "network_disabled",
        message:
          "Credentials look complete, but this environment does not allow outbound requests to Azuga.",
      };
    }

    // In production we would exchange credentials for a token here.
    // For now we just report readiness.
    return {
      ok: true,
      status: "ready",
      message: `Credentials stored. Use ${AUTH_BASE} with POST username/password and ${API_BASE_DEFAULT} for API calls.`,
    };
  }

  private missingCredentialReasons(): string[] {
    const reasons: string[] = [];

    if (this.config.authType === "CREDENTIALS") {
      if (!this.config.secrets.username) {
        reasons.push("Username is missing.");
      }
      if (!this.config.secrets.password) {
        reasons.push("Password is missing.");
      }
    }

    if (this.config.authType === "API_KEY" && !this.config.secrets.apiKey) {
      reasons.push("API Key is missing.");
    }

    return reasons;
  }
}
