/**
 * Email Open Tracking
 * GET /api/sales/marketing/email/track/open?id=<messageId>
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackEmailOpen } from '@/lib/marketing/email-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get('id');

    if (!messageId) {
      return new NextResponse('Missing message ID', { status: 400 });
    }

    // Track the open
    await trackEmailOpen(messageId);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Still return pixel even on error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    return new NextResponse(pixel, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }
}
