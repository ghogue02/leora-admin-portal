/**
 * Metrics Definition API Routes
 * Phase 1.1: Metrics Definition System
 *
 * GET  /api/metrics/definitions - List all metric definitions with history
 * POST /api/metrics/definitions - Create new metric definition version
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';
import {
  createMetricDefinitionSchema,
  metricDefinitionQuerySchema,
} from '@/lib/validation/metrics';
import { ZodError } from 'zod';

/**
 * GET /api/metrics/definitions
 * List all metric definitions with optional filters, search, and pagination
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;

    try {
      const { searchParams } = new URL(request.url);

      // Validate and parse query parameters
      const queryResult = metricDefinitionQuerySchema.safeParse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        includeDeprecated: searchParams.get('includeDeprecated'),
        code: searchParams.get('code'),
        search: searchParams.get('search'),
      });

      if (!queryResult.success) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: queryResult.error.errors },
          { status: 400 }
        );
      }

      const { page, limit, includeDeprecated, code, search } = queryResult.data;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.MetricDefinitionWhereInput = {
        tenantId,
      };

      // Filter deprecated unless explicitly requested
      if (!includeDeprecated) {
        where.deprecatedAt = null;
      }

      // Filter by code
      if (code) {
        where.code = code;
      }

      // Search across name and description
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Execute queries in parallel
      const [definitions, totalCount] = await Promise.all([
        db.metricDefinition.findMany({
          where,
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: [
            { code: 'asc' },
            { version: 'desc' },
          ],
          skip,
          take: limit,
        }),
        db.metricDefinition.count({ where }),
      ]);

      return NextResponse.json({
        definitions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching metric definitions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metric definitions' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/metrics/definitions
 * Create a new metric definition (or new version if code exists)
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, user, db } = context;

    try {
      const body = await request.json();

      // Validate request body
      const validationResult = createMetricDefinitionSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validationResult.error.errors },
          { status: 400 }
        );
      }

      const { code, name, description, formula } = validationResult.data;

      // Check if a definition with this code already exists
      const existingDefinition = await db.metricDefinition.findFirst({
        where: {
          tenantId,
          code,
        },
        orderBy: {
          version: 'desc',
        },
      });

      // Determine the next version number
      const nextVersion = existingDefinition ? existingDefinition.version + 1 : 1;

      // Create new metric definition
      const definition = await db.metricDefinition.create({
        data: {
          tenantId,
          code,
          name,
          description,
          formula: formula ? (formula as Prisma.InputJsonValue) : null,
          version: nextVersion,
          createdById: user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(
        {
          definition,
          message: existingDefinition
            ? `Created version ${nextVersion} of metric definition '${code}'`
            : `Created new metric definition '${code}'`
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error creating metric definition:', error);

      // Handle unique constraint violations
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A metric definition with this code and version already exists' },
          { status: 409 }
        );
      }

      // Handle foreign key violations
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid user or tenant reference' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create metric definition' },
        { status: 500 }
      );
    }
  });
}
