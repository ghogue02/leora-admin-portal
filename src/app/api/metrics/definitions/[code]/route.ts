/**
 * Metrics Definition API Routes - Code-specific operations
 * Phase 1.1: Metrics Definition System
 *
 * GET    /api/metrics/definitions/[code] - Get current definition for a metric
 * PATCH  /api/metrics/definitions/[code] - Update definition (creates new version)
 * DELETE /api/metrics/definitions/[code] - Deprecate definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';
import { updateMetricDefinitionSchema } from '@/lib/validation/metrics';

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/metrics/definitions/[code]
 * Get the current (non-deprecated) definition for a metric code
 * Optionally include version history
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { code } = await params;

    try {
      const { searchParams } = new URL(request.url);
      const includeHistory = searchParams.get('includeHistory') === 'true';

      // Get current (non-deprecated) definition
      const currentDefinition = await db.metricDefinition.findFirst({
        where: {
          tenantId,
          code,
          deprecatedAt: null,
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
        orderBy: {
          version: 'desc',
        },
      });

      if (!currentDefinition) {
        return NextResponse.json(
          { error: `Metric definition with code '${code}' not found` },
          { status: 404 }
        );
      }

      // Optionally fetch version history
      let history: typeof currentDefinition[] = [];
      if (includeHistory) {
        history = await db.metricDefinition.findMany({
          where: {
            tenantId,
            code,
            version: {
              not: currentDefinition.version,
            },
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
          orderBy: {
            version: 'desc',
          },
        });
      }

      return NextResponse.json({
        definition: currentDefinition,
        history: includeHistory ? history : undefined,
      });
    } catch (error) {
      console.error(`Error fetching metric definition '${code}':`, error);
      return NextResponse.json(
        { error: 'Failed to fetch metric definition' },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/metrics/definitions/[code]
 * Update a metric definition (creates a new version)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, user, db } = context;
    const { code } = await params;

    try {
      const body = await request.json();

      // Validate request body
      const validationResult = updateMetricDefinitionSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validationResult.error.errors },
          { status: 400 }
        );
      }

      const { name, description, formula } = validationResult.data;

      // Ensure at least one field is being updated
      if (!name && !description && formula === undefined) {
        return NextResponse.json(
          { error: 'At least one field must be provided for update' },
          { status: 400 }
        );
      }

      // Get the current definition
      const currentDefinition = await db.metricDefinition.findFirst({
        where: {
          tenantId,
          code,
          deprecatedAt: null,
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!currentDefinition) {
        return NextResponse.json(
          { error: `Metric definition with code '${code}' not found` },
          { status: 404 }
        );
      }

      // Create new version with updated fields
      const newDefinition = await db.metricDefinition.create({
        data: {
          tenantId,
          code,
          name: name ?? currentDefinition.name,
          description: description ?? currentDefinition.description,
          formula: (formula !== undefined ? formula : currentDefinition.formula) as Prisma.InputJsonValue,
          version: currentDefinition.version + 1,
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

      return NextResponse.json({
        definition: newDefinition,
        message: `Created version ${newDefinition.version} of metric definition '${code}'`,
        previousVersion: currentDefinition.version,
      });
    } catch (error: unknown) {
      console.error(`Error updating metric definition '${code}':`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Version conflict. Please retry.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update metric definition' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/metrics/definitions/[code]
 * Deprecate a metric definition (soft delete)
 * Sets deprecatedAt timestamp on the current version
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { code } = await params;

    try {
      // Find the current (non-deprecated) definition
      const currentDefinition = await db.metricDefinition.findFirst({
        where: {
          tenantId,
          code,
          deprecatedAt: null,
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!currentDefinition) {
        return NextResponse.json(
          { error: `Metric definition with code '${code}' not found or already deprecated` },
          { status: 404 }
        );
      }

      // Soft delete by setting deprecatedAt
      const deprecatedDefinition = await db.metricDefinition.update({
        where: {
          id: currentDefinition.id,
        },
        data: {
          deprecatedAt: new Date(),
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

      return NextResponse.json({
        definition: deprecatedDefinition,
        message: `Metric definition '${code}' (version ${deprecatedDefinition.version}) has been deprecated`,
      });
    } catch (error) {
      console.error(`Error deprecating metric definition '${code}':`, error);
      return NextResponse.json(
        { error: 'Failed to deprecate metric definition' },
        { status: 500 }
      );
    }
  });
}
