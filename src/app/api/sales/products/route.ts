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
      'SELECT id, name, description, price, category FROM products WHERE tenant_id = ? AND active = TRUE',
      [session.user.tenantId]
    );

    const products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      category: row.category,
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
