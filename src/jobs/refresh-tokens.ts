/**
 * Token Refresh Job
 *
 * Automatically refreshes OAuth tokens before they expire.
 * Run this as a cron job every hour.
 *
 * Usage:
 *   node --loader ts-node/esm src/jobs/refresh-tokens.ts
 *
 * Or with cron:
 *   0 * * * * cd /path/to/app && node src/jobs/refresh-tokens.ts
 */

import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import prisma from '@/lib/prisma';
import { encryptToken, decryptToken } from '@/lib/token-encryption';

interface RefreshResult {
  provider: string;
  tenantId: string;
  success: boolean;
  error?: string;
}

/**
 * Refresh Google Calendar tokens
 */
async function refreshGoogleToken(
  tenantId: string,
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null
): Promise<RefreshResult> {
  try {
    if (!encryptedRefreshToken) {
      return {
        provider: 'google',
        tenantId,
        success: false,
        error: 'No refresh token available',
      };
    }

    const refreshToken = await decryptToken(encryptedRefreshToken);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('No access token in refresh response');
    }

    // Encrypt new tokens
    const newEncryptedAccessToken = await encryptToken(credentials.access_token);
    const newEncryptedRefreshToken = credentials.refresh_token
      ? await encryptToken(credentials.refresh_token)
      : encryptedRefreshToken;

    // Update in database
    await prisma.integrationToken.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google',
        },
      },
      data: {
        accessToken: newEncryptedAccessToken,
        refreshToken: newEncryptedRefreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        metadata: {
          scope: credentials.scope,
          tokenType: credentials.token_type,
        },
      },
    });

    console.log(`✓ Refreshed Google token for tenant ${tenantId}`);

    return {
      provider: 'google',
      tenantId,
      success: true,
    };
  } catch (error) {
    console.error(`✗ Failed to refresh Google token for tenant ${tenantId}:`, error);
    return {
      provider: 'google',
      tenantId,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Refresh Microsoft Outlook tokens
 */
async function refreshOutlookToken(
  tenantId: string,
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null
): Promise<RefreshResult> {
  try {
    if (!encryptedRefreshToken) {
      return {
        provider: 'outlook',
        tenantId,
        success: false,
        error: 'No refresh token available',
      };
    }

    const refreshToken = await decryptToken(encryptedRefreshToken);

    const msalConfig = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      },
    };

    const pca = new ConfidentialClientApplication(msalConfig);

    const tokenRequest = {
      refreshToken,
      scopes: ['https://graph.microsoft.com/Calendars.ReadWrite'],
    };

    const response = await pca.acquireTokenByRefreshToken(tokenRequest);

    if (!response?.accessToken) {
      throw new Error('No access token in refresh response');
    }

    // Encrypt new tokens
    const newEncryptedAccessToken = await encryptToken(response.accessToken);
    const newEncryptedRefreshToken = response.refreshToken
      ? await encryptToken(response.refreshToken)
      : encryptedRefreshToken;

    // Update in database
    await prisma.integrationToken.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'outlook',
        },
      },
      data: {
        accessToken: newEncryptedAccessToken,
        refreshToken: newEncryptedRefreshToken,
        expiresAt: response.expiresOn || new Date(Date.now() + 3600 * 1000),
        metadata: {
          scope: response.scopes?.join(' '),
          tokenType: response.tokenType,
          account: response.account?.username,
        },
      },
    });

    console.log(`✓ Refreshed Outlook token for tenant ${tenantId}`);

    return {
      provider: 'outlook',
      tenantId,
      success: true,
    };
  } catch (error) {
    console.error(`✗ Failed to refresh Outlook token for tenant ${tenantId}:`, error);
    return {
      provider: 'outlook',
      tenantId,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Main refresh job
 */
async function refreshAllTokens() {
  console.log('Starting token refresh job...');

  try {
    // Find all tokens expiring in the next 24 hours
    const expiringTokens = await prisma.integrationToken.findMany({
      where: {
        expiresAt: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
          gt: new Date(), // Not already expired
        },
        refreshToken: {
          not: null,
        },
        provider: {
          in: ['google', 'outlook'],
        },
      },
    });

    console.log(`Found ${expiringTokens.length} tokens to refresh`);

    const results: RefreshResult[] = [];

    for (const token of expiringTokens) {
      let result: RefreshResult;

      if (token.provider === 'google') {
        result = await refreshGoogleToken(
          token.tenantId,
          token.accessToken,
          token.refreshToken
        );
      } else if (token.provider === 'outlook') {
        result = await refreshOutlookToken(
          token.tenantId,
          token.accessToken,
          token.refreshToken
        );
      } else {
        continue;
      }

      results.push(result);

      // Small delay between refreshes to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log('\n=== Token Refresh Summary ===');
    console.log(`Total: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed refreshes:');
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.provider} (${r.tenantId}): ${r.error}`);
        });
    }

    console.log('\nToken refresh job completed');
  } catch (error) {
    console.error('Fatal error in token refresh job:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  refreshAllTokens()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { refreshAllTokens };
