import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.execute(
      'SELECT id, name, email, territory FROM sales_reps WHERE tenant_id = ? AND active = TRUE',
      [session.user.tenantId]
    );

    const reps = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      territory: row.territory,
    }));

    return NextResponse.json(reps);
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    return NextResponse.json({ error: 'Failed to fetch sales reps' }, { status: 500 });
  }
}
