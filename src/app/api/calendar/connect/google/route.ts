import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { encryptToken } from '@/lib/token-encryption';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * GET /api/calendar/connect/google
 * Initiate Google OAuth flow
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: JSON.stringify({
        email: session.user.email,
      }),
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/connect/google
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
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json(
        { error: 'Failed to obtain access tokens' },
        { status: 500 }
      );
    }

    // Encrypt tokens before storing in database
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

    // Store encrypted tokens in database
    await prisma.integrationToken.upsert({
      where: {
        tenantId_provider: {
          tenantId: user.tenantId,
          provider: 'google',
        },
      },
      create: {
        tenantId: user.tenantId,
        provider: 'google',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        metadata: {
          scope: tokens.scope,
          tokenType: tokens.token_type,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        metadata: {
          scope: tokens.scope,
          tokenType: tokens.token_type,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Calendar connected successfully',
    });
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    return NextResponse.json(
      { error: 'Failed to complete OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/connect/google
 * Disconnect Google Calendar integration
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
          provider: 'google',
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}
