import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateMailchimpConnection } from '@/lib/mailchimp';

type IntegrationUsageStats = {
  label: string;
  value: string;
};

type IntegrationStatus = {
  connected: boolean;
  status: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  error?: string;
  usageStats?: IntegrationUsageStats;
};

type IntegrationKey = 'google-calendar' | 'outlook-calendar' | 'mailchimp' | 'mapbox';
type CalendarProvider = 'google' | 'outlook';

const mapProviderToKey = (provider: string): IntegrationKey | null => {
  if (provider === 'google') return 'google-calendar';
  if (provider === 'outlook') return 'outlook-calendar';
  if (provider === 'mailchimp') return 'mailchimp';
  if (provider === 'mapbox') return 'mapbox';
  return null;
};

/**
 * GET /api/integrations/status
 * Get status of all configured integrations
 */
export async function GET() {
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

    // Get all integration tokens for this tenant
    const tokens = await prisma.integrationToken.findMany({
      where: {
        tenantId: user.tenantId,
      },
      select: {
        provider: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    // Build status object for each integration
    const status: Record<IntegrationKey, IntegrationStatus> = {
      'google-calendar': {
        connected: false,
        status: 'inactive',
      },
      'outlook-calendar': {
        connected: false,
        status: 'inactive',
      },
      mailchimp: {
        connected: false,
        status: 'inactive',
      },
      mapbox: {
        connected: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        status: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? 'active' : 'inactive',
        usageStats: {
          label: 'Configured via Environment',
          value: 'API Key Set',
        },
      },
    };

    // Update status based on found tokens
    for (const token of tokens) {
      const isExpired = token.expiresAt && token.expiresAt < new Date();

      const integrationKey = mapProviderToKey(token.provider);
      if (!integrationKey) {
        continue;
      }

      status[integrationKey] = {
        connected: true,
        status: isExpired ? 'error' : 'active',
        lastSync: token.updatedAt,
        ...(isExpired && {
          error: 'Token expired - please reconnect',
        }),
      };

      // Add provider-specific stats
      if (token.provider === 'google' || token.provider === 'outlook') {
        const provider = token.provider as CalendarProvider;
        const eventCount = await prisma.calendarEvent.count({
          where: {
            tenantId: user.tenantId,
            userId: user.id,
            provider,
          },
        });

        const upcomingCount = await prisma.calendarEvent.count({
          where: {
            tenantId: user.tenantId,
            userId: user.id,
            provider,
            startTime: {
              gte: new Date(),
            },
          },
        });

        status[integrationKey].usageStats = {
          label: 'Synced Events',
          value: `${upcomingCount} upcoming / ${eventCount} total`,
        };
      }

      if (token.provider === 'mailchimp' && token.metadata) {
        const metadata = token.metadata as Record<string, unknown>;
        status.mailchimp.usageStats = {
          label: 'Account',
          value:
            (metadata.accountId as string | undefined) ||
            (metadata.dc as string | undefined) ||
            'Connected',
        };
      }
    }

    // Test Mailchimp connection if connected
    if (status.mailchimp.connected && process.env.MAILCHIMP_API_KEY) {
      try {
        const isValid = await validateMailchimpConnection();
        if (!isValid) {
          status.mailchimp.status = 'error';
          status.mailchimp.error = 'Connection test failed';
        }
      } catch (connectionError) {
        console.error('Mailchimp connection validation failed:', connectionError);
        status.mailchimp.status = 'error';
        status.mailchimp.error = 'API connection failed';
      }
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting integration status:', error);
    return NextResponse.json(
      { error: 'Failed to get integration status' },
      { status: 500 }
    );
  }
}
