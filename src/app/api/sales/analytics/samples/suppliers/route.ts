import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sales_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Replace with actual database query
    // Placeholder supplier metrics data
    const suppliers = [
      {
        supplierId: '1',
        supplierName: 'Bordeaux Premium Wines',
        totalSamples: 45,
        conversions: 18,
        conversionRate: 0.40,
        revenueGenerated: 8900.00,
        topProducts: [
          {
            productName: 'Château Margaux 2015',
            skuCode: 'WIN-001',
            samples: 15,
            conversions: 8,
          },
          {
            productName: 'Pauillac Reserve 2017',
            skuCode: 'WIN-012',
            samples: 12,
            conversions: 5,
          },
          {
            productName: 'Saint-Émilion Grand Cru',
            skuCode: 'WIN-023',
            samples: 10,
            conversions: 3,
          },
        ],
      },
      {
        supplierId: '2',
        supplierName: 'Champagne House Collection',
        totalSamples: 35,
        conversions: 12,
        conversionRate: 0.34,
        revenueGenerated: 6200.00,
        topProducts: [
          {
            productName: 'Dom Pérignon 2012',
            skuCode: 'CHA-045',
            samples: 15,
            conversions: 6,
          },
          {
            productName: 'Krug Grande Cuvée',
            skuCode: 'CHA-099',
            samples: 12,
            conversions: 4,
          },
        ],
      },
    ];

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Supplier metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to load supplier metrics' },
      { status: 500 }
    );
  }
}
