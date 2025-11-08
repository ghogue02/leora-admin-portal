import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { encryptToken } from '@/lib/token-encryption';

const SCOPES = ['Calendars.Read', 'Calendars.ReadWrite', 'offline_access'];

/**
 * GET /api/calendar/connect/outlook
 * Initiate Outlook OAuth flow
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const msalConfig = {
      auth: {
        clientId: process.env.OUTLOOK_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}`,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET!,
      },
    };

    const pca = new ConfidentialClientApplication(msalConfig);

    const authCodeUrlParameters = {
      scopes: SCOPES,
      redirectUri: process.env.OUTLOOK_REDIRECT_URI!,
      state: JSON.stringify({
        email: session.user.email,
      }),
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Outlook OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/connect/outlook
 * Handle OAuth callback and store tokens
 */
export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const stateData = state ? JSON.parse(state) : null;
    const userEmail = stateData?.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Exchange code for tokens
    const msalConfig = {
      auth: {
        clientId: process.env.OUTLOOK_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}`,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET!,
      },
    };

    const pca = new ConfidentialClientApplication(msalConfig);

    const tokenRequest = {
      code,
      scopes: SCOPES,
      redirectUri: process.env.OUTLOOK_REDIRECT_URI!,
    };

    const response = await pca.acquireTokenByCode(tokenRequest);

    if (!response.accessToken) {
      return NextResponse.json(
        { error: 'Failed to obtain access token' },
        { status: 500 }
      );
    }

    // Encrypt tokens before storing in database
    const encryptedAccessToken = await encryptToken(response.accessToken);
    const encryptedRefreshToken = response.refreshToken
      ? await encryptToken(response.refreshToken)
      : null;

    // Store encrypted tokens in database
    await prisma.integrationToken.upsert({
      where: {
        tenantId_provider: {
          tenantId: user.tenantId,
          provider: 'outlook',
        },
      },
      create: {
        tenantId: user.tenantId,
        provider: 'outlook',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: response.expiresOn || null,
        metadata: {
          scopes: response.scopes,
          tokenType: response.tokenType,
          account: response.account,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: response.expiresOn || null,
        metadata: {
          scopes: response.scopes,
          tokenType: response.tokenType,
          account: response.account,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Outlook Calendar connected successfully',
    });
  } catch (error) {
    console.error('Error handling Outlook OAuth callback:', error);
    return NextResponse.json(
      { error: 'Failed to complete OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/connect/outlook
 * Disconnect Outlook Calendar integration
 */
export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.integrationToken.delete({
      where: {
        tenantId_provider: {
          tenantId: user.tenantId,
          provider: 'outlook',
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Outlook Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Outlook Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Outlook Calendar' },
      { status: 500 }
    );
  }
}
