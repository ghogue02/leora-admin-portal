import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/jobs/stats
 * Get job queue statistics and metrics
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel queries for efficiency
    const [
      totalJobs,
      pendingCount,
      processingCount,
      completedToday,
      failedLast24h,
      jobsByType,
      recentJobs,
      avgProcessingTime
    ] = await Promise.all([
      // Total jobs
      prisma.job.count(),

      // Pending jobs
      prisma.job.count({ where: { status: 'pending' } }),

      // Processing jobs
      prisma.job.count({ where: { status: 'processing' } }),

      // Completed today
      prisma.job.count({
        where: {
          status: 'completed',
          completedAt: { gte: today }
        }
      }),

      // Failed in last 24 hours
      prisma.job.count({
        where: {
          status: 'failed',
          createdAt: { gte: last24h }
        }
      }),

      // Jobs by type
      prisma.job.groupBy({
        by: ['type', 'status'],
        _count: true
      }),

      // Recent jobs (last 10)
      prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          completedAt: true
        }
      }),

      // Average processing time (completed jobs in last 24h)
      prisma.job.aggregate({
        where: {
          status: 'completed',
          completedAt: { gte: last24h },
          createdAt: { gte: last24h }
        },
        _avg: {
          attempts: true
        }
      })
    ]);

    // Calculate average processing time from completed jobs
    const completedJobsWithTime = await prisma.job.findMany({
      where: {
        status: 'completed',
        completedAt: { not: null },
        createdAt: { gte: last24h }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    });

    const avgTime = completedJobsWithTime.length > 0
      ? completedJobsWithTime.reduce((sum, job) => {
          const duration = job.completedAt!.getTime() - job.createdAt.getTime();
          return sum + duration;
        }, 0) / completedJobsWithTime.length
      : 0;

    // Format job type statistics
    const typeStats = jobsByType.reduce((acc: any, item) => {
      if (!acc[item.type]) {
        acc[item.type] = { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 };
      }
      acc[item.type][item.status] = item._count;
      acc[item.type].total += item._count;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total: totalJobs,
          pending: pendingCount,
          processing: processingCount,
          completedToday,
          failedLast24h,
          avgProcessingTime: Math.round(avgTime / 1000), // Convert to seconds
          avgAttempts: avgProcessingTime._avg.attempts || 0
        },
        byType: typeStats,
        recent: recentJobs
      }
    });

  } catch (error) {
    console.error('Error fetching job stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
