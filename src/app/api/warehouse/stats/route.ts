import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run queries in parallel
    const [
      totalItems,
      itemsWithLocations,
      pendingPickSheets,
      recentPickSheets,
    ] = await Promise.all([
      // Total inventory items
      prisma.inventory.count({
        where: { tenantId: session.user.tenantId },
      }),

      // Items with assigned locations
      prisma.inventory.count({
        where: {
          tenantId: session.user.tenantId,
          pickOrder: { not: null },
        },
      }),

      // Pending pick sheets (READY or PICKING status)
      prisma.pickSheet.count({
        where: {
          tenantId: session.user.tenantId,
          status: { in: ['READY', 'PICKING'] },
        },
      }),

      // Recent completed pick sheets for avg time calculation
      prisma.pickSheet.findMany({
        where: {
          tenantId: session.user.tenantId,
          status: 'PICKED',
          startedAt: { not: null },
          completedAt: { not: null },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 10,
      }),
    ]);

    // Calculate average pick time
    let avgPickTime = 0;
    if (recentPickSheets.length > 0) {
      const totalMinutes = recentPickSheets.reduce((sum, sheet) => {
        const start = new Date(sheet.startedAt!).getTime();
        const end = new Date(sheet.completedAt!).getTime();
        return sum + (end - start) / (1000 * 60); // Convert to minutes
      }, 0);
      avgPickTime = Math.round(totalMinutes / recentPickSheets.length);
    }

    const coveragePercent = totalItems > 0
      ? Math.round((itemsWithLocations / totalItems) * 100)
      : 0;

    return NextResponse.json({
      totalItems,
      itemsWithLocations,
      coveragePercent,
      pickSheetsPending: pendingPickSheets,
      avgPickTime, // in minutes
    });
  } catch (error) {
    console.error('Error fetching warehouse stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouse statistics' },
      { status: 500 }
    );
  }
}
