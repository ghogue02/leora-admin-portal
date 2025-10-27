import { NextRequest, NextResponse } from 'next/server';
import { LeadModel, FunnelStage } from '@/lib/models/Lead';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { stage, notes, winLossReason } = body;

    if (!Object.values(FunnelStage).includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const lead = await LeadModel.updateStage(
      params.id,
      session.user.tenantId,
      stage,
      session.user.id,
      notes,
      winLossReason
    );

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error updating lead stage:', error);
    return NextResponse.json({ error: 'Failed to update lead stage' }, { status: 500 });
  }
}
