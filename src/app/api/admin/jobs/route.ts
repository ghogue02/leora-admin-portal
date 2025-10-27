import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/jobs
 * List jobs with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { error: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const total = await prisma.job.count({ where });

    // Get jobs with pagination and sorting
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/jobs
 * Retry failed jobs in bulk
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobIds } = body;

    if (action === 'retry') {
      // Reset failed jobs to pending status
      const result = await prisma.job.updateMany({
        where: {
          id: { in: jobIds },
          status: 'failed'
        },
        data: {
          status: 'pending',
          error: null
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          updated: result.count
        }
      });
    }

    if (action === 'delete') {
      // Delete completed or failed jobs
      const result = await prisma.job.deleteMany({
        where: {
          id: { in: jobIds },
          status: { in: ['completed', 'failed'] }
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          deleted: result.count
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing job action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
