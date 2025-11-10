import { NextRequest, NextResponse } from 'next/server';
import { LeadModel } from '@/lib/models/Lead';
import { getServerSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify lead belongs to tenant
    const lead = await LeadModel.findById(params.id, session.user.tenantId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const history = await LeadModel.getStageHistory(params.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching lead history:', error);
    return NextResponse.json({ error: 'Failed to fetch lead history' }, { status: 500 });
  }
}
