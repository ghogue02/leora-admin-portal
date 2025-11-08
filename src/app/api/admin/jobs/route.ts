import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
type JobAction = 'retry' | 'delete';
type JobSortField = 'createdAt' | 'updatedAt' | 'status' | 'type' | 'startedAt' | 'completedAt';

interface JobActionPayload {
  action: JobAction;
  jobIds: string[];
}

const SORTABLE_FIELDS: JobSortField[] = ['createdAt', 'updatedAt', 'status', 'type', 'startedAt', 'completedAt'];

const isJobSortField = (value: string): value is JobSortField => SORTABLE_FIELDS.includes(value as JobSortField);

const buildOrderBy = (field: JobSortField, direction: Prisma.SortOrder): Prisma.JobOrderByWithRelationInput => {
  switch (field) {
    case 'createdAt':
      return { createdAt: direction };
    case 'updatedAt':
      return { updatedAt: direction };
    case 'status':
      return { status: direction };
    case 'type':
      return { type: direction };
    case 'startedAt':
      return { startedAt: direction };
    case 'completedAt':
      return { completedAt: direction };
    default:
      return { createdAt: direction };
  }
};

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error');

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
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder: Prisma.SortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';
    const sortField = isJobSortField(sortBy) ? sortBy : 'createdAt';

    // Build where clause
    const where: Prisma.JobWhereInput = {};

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
      orderBy: buildOrderBy(sortField, sortOrder),
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

  } catch (error: unknown) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs', details: getErrorMessage(error) },
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
    const body = (await request.json()) as JobActionPayload;
    const { action, jobIds } = body;

    if (!action || !jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'action and jobIds are required' },
        { status: 400 }
      );
    }

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

  } catch (error: unknown) {
    console.error('Error processing job action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
