import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const LayoutSchema = z.object({
  layouts: z.object({
    lg: z.array(z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      minW: z.number().optional(),
      minH: z.number().optional()
    })),
    md: z.array(z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      minW: z.number().optional(),
      minH: z.number().optional()
    })),
    sm: z.array(z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      minW: z.number().optional(),
      minH: z.number().optional()
    })),
    xs: z.array(z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      minW: z.number().optional(),
      minH: z.number().optional()
    }))
  })
});

type ResponsiveLayouts = z.infer<typeof LayoutSchema>['layouts'];

const toJsonValue = (layouts: ResponsiveLayouts): Prisma.JsonValue =>
  layouts as unknown as Prisma.JsonValue;

/**
 * GET /api/dashboard/widgets/layout
 * Retrieve saved dashboard layout for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve saved layout from database
    const layoutData = await db.dashboardLayout.findUnique({
      where: { userId: session.user.id }
    });

    if (!layoutData) {
      return NextResponse.json({ layouts: null });
    }

    const parsedLayouts = LayoutSchema.shape.layouts.safeParse(layoutData.layouts);

    return NextResponse.json({
      layouts: parsedLayouts.success ? parsedLayouts.data : null,
      updatedAt: layoutData.updatedAt
    });
  } catch (error) {
    console.error('Failed to retrieve dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve layout' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/widgets/layout
 * Save dashboard layout for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = LayoutSchema.parse(body);

    // Save layout to database (upsert)
    const savedLayout = await db.dashboardLayout.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        layouts: toJsonValue(validated.layouts)
      },
      update: {
        layouts: toJsonValue(validated.layouts),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      updatedAt: savedLayout.updatedAt
    });
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid layout data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save layout' },
      { status: 500 }
    );
  }
}
