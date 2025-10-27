/**
 * Email Click Tracking
 * GET /api/sales/marketing/email/track/click?id=<messageId>&url=<destination>
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackEmailClick } from '@/lib/marketing/email-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get('id');
    const destination = searchParams.get('url');

    if (!messageId || !destination) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // Track the click
    await trackEmailClick(messageId);

    // Redirect to destination
    return NextResponse.redirect(destination);
  } catch (error) {
    console.error('Error tracking email click:', error);

    // Still redirect on error
    const destination = request.nextUrl.searchParams.get('url');
    if (destination) {
      return NextResponse.redirect(destination);
    }

    return new NextResponse('Error tracking click', { status: 500 });
  }
}
