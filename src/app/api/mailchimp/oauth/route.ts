import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { encryptToken } from '@/lib/token-encryption';

/**
 * GET /api/mailchimp/oauth
 * Initiate Mailchimp OAuth flow
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.MAILCHIMP_CLIENT_ID;
    const redirectUri = process.env.MAILCHIMP_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Mailchimp OAuth not configured' },
        { status: 500 }
      );
    }

    const state = Buffer.from(
      JSON.stringify({
        email: session.user.email,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const authUrl = new URL('https://login.mailchimp.com/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error initiating Mailchimp OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mailchimp/oauth
 * Handle OAuth callback and exchange code for tokens
 */
export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const stateData = state ? JSON.parse(Buffer.from(state, 'base64').toString()) : null;
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

    // Exchange code for access token
    const tokenUrl = 'https://login.mailchimp.com/oauth2/token';
    const clientId = process.env.MAILCHIMP_CLIENT_ID;
    const clientSecret = process.env.MAILCHIMP_CLIENT_SECRET;
    const redirectUri = process.env.MAILCHIMP_REDIRECT_URI;

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri || '',
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Mailchimp token exchange failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Get metadata about the account
    const metadataResponse = await fetch('https://login.mailchimp.com/oauth2/metadata', {
      headers: {
        Authorization: `OAuth ${tokenData.access_token}`,
      },
    });

    const metadata = await metadataResponse.json();

    // Encrypt access token
    const encryptedAccessToken = await encryptToken(tokenData.access_token);

    // Store token in database
    await prisma.integrationToken.upsert({
      where: {
        tenantId_provider: {
          tenantId: user.tenantId,
          provider: 'mailchimp',
        },
      },
      create: {
        tenantId: user.tenantId,
        provider: 'mailchimp',
        accessToken: encryptedAccessToken,
        refreshToken: null, // Mailchimp doesn't use refresh tokens
        expiresAt: null, // Mailchimp tokens don't expire
        metadata: {
          dc: metadata.dc,
          accountId: metadata.accountname,
          apiEndpoint: metadata.api_endpoint,
          loginUrl: metadata.login_url,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        metadata: {
          dc: metadata.dc,
          accountId: metadata.accountname,
          apiEndpoint: metadata.api_endpoint,
          loginUrl: metadata.login_url,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Mailchimp connected successfully',
      metadata: {
        dc: metadata.dc,
        accountId: metadata.accountname,
      },
    });
  } catch (error) {
    console.error('Error handling Mailchimp OAuth callback:', error);
    return NextResponse.json(
      { error: 'Failed to complete OAuth flow', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mailchimp/oauth
 * Disconnect Mailchimp integration
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
          provider: 'mailchimp',
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Mailchimp disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Mailchimp:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Mailchimp' },
      { status: 500 }
    );
  }
}
