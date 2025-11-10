import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/dashboard/widgets/tasks-from-management
 * Retrieve tasks assigned by management for the current sales rep
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get sales rep ID
    const salesRep = await db.salesRep.findUnique({
      where: { userId: session.user.id }
    });

    if (!salesRep) {
      return NextResponse.json({ error: 'Sales rep not found' }, { status: 404 });
    }

    // Fetch tasks assigned by management
    const tasks = await db.task.findMany({
      where: {
        salesRepId: salesRep.id,
        assignedByManagement: true,
        status: { in: ['pending', 'in_progress'] }
      },
      orderBy: [
        { priority: 'desc' },
        { dueAt: 'asc' }
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        status: true,
        priority: true,
        assignedBy: true,
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      tasks: tasks.map(task => ({
        ...task,
        priority: task.priority || 'medium'
      }))
    });
  } catch (error) {
    console.error('Failed to fetch tasks from management:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
