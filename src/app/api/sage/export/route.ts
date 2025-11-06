/**
 * SAGE Export API - TEMPORARILY DISABLED
 *
 * This endpoint is temporarily disabled while we fix Vercel module resolution issues.
 * The export functionality works locally but fails in Vercel production builds.
 *
 * @route POST /api/sage/export
 * @status 503 Service Unavailable
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';

export const POST = withAdminSession(async (req: NextRequest, ctx) => {
  // TEMPORARY: SAGE export disabled due to Vercel module resolution issue
  // The export-to-sage script works locally but Vercel can't resolve '@/scripts/export-to-sage'
  // This will be re-enabled once the module resolution issue is fixed

  return NextResponse.json(
    {
      error: 'SAGE export temporarily disabled',
      code: 'SAGE_DISABLED',
      details: 'Module resolution issue in Vercel production builds. Feature works locally and will be re-enabled shortly. For now, use the manual export script: npx tsx scripts/export-to-sage.ts',
    },
    { status: 503 }
  );
});
