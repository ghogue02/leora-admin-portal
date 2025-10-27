import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Fetch last 10 audit log entries with user information
    const recentActivities = await prisma.auditLog.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Format the activities for display
    const formattedActivities = recentActivities.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      timestamp: log.createdAt,
      user: {
        id: log.user?.id,
        name: log.user?.fullName || 'Unknown User',
        email: log.user?.email,
      },
      details: log.newValues ? JSON.parse(log.newValues as string) : null,
      description: generateDescription(log),
    }));

    return NextResponse.json({
      activities: formattedActivities,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activities', success: false },
      { status: 500 }
    );
  }
}

// Helper function to generate human-readable descriptions
function generateDescription(log: any): string {
  const user = log.user?.fullName || 'Unknown User';
  const entity = log.entityType?.toLowerCase() || 'item';
  const action = log.action?.toLowerCase() || 'modified';

  switch (action) {
    case 'create':
      return `${user} created a new ${entity}`;
    case 'update':
      return `${user} updated ${entity}`;
    case 'delete':
      return `${user} deleted ${entity}`;
    case 'login':
      return `${user} logged in`;
    case 'logout':
      return `${user} logged out`;
    default:
      return `${user} performed ${action} on ${entity}`;
  }
}
