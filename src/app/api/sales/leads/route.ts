import { NextRequest, NextResponse } from 'next/server';
import { LeadModel } from '@/lib/models/Lead';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters = {
      stage: searchParams.get('stage') || undefined,
      assignedRepId: searchParams.get('assignedRepId') || undefined,
      leadSource: searchParams.get('leadSource') || undefined,
      interestLevel: searchParams.get('interestLevel') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const leads = await LeadModel.findAll(session.user.tenantId, filters);
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const lead = await LeadModel.create({
      ...body,
      tenantId: session.user.tenantId,
      currentStage: body.currentStage || 'lead',
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
