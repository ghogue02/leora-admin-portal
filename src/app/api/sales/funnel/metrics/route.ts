import { NextRequest, NextResponse } from 'next/server';
import { LeadModel } from '@/lib/models/Lead';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters = {
      assignedRepId: searchParams.get('assignedRepId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    const metrics = await LeadModel.getPipelineMetrics(session.user.tenantId, filters);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching pipeline metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline metrics' }, { status: 500 });
  }
}
