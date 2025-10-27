/**
 * Export History API
 * GET /api/routing/exports - Get export history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExportHistory } from '@/lib/azuga-export';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validate limit
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    // Get export history
    const exports = await getExportHistory(user.tenantId, limit);

    return NextResponse.json({
      exports,
      count: exports.length
    });
  } catch (error) {
    console.error('Export history error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch export history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
