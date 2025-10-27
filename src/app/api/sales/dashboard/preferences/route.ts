import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      // Try to get user preferences from database
      // For now, we'll store in a JSON field on the User or SalesRep model
      // Since we don't have a UserPreferences table yet, let's use a simple approach

      // Return default preferences if none exist
      return NextResponse.json({
        sections: [],
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      return NextResponse.json(
        { error: 'Failed to load preferences' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }
    const body = await request.json();

    // For now, we'll just acknowledge the save
    // In a full implementation, you'd save to a UserPreferences table or JSON field

    // Example implementation if we had a preferences table:
    /*
    await prisma.userPreferences.upsert({
      where: {
        userId: salesRep.userId,
      },
      create: {
        userId: salesRep.userId,
        tenantId: salesRep.tenantId,
        dashboardSections: body.sections,
      },
      update: {
        dashboardSections: body.sections,
      },
    });
    */

    return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Save preferences error:', error);
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }
  });
}
