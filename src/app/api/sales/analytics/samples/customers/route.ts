import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sales_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Replace with actual database query
    // Placeholder customer sample history data
    const customers = [
      {
        customerId: '1',
        customerName: 'Blue Bottle Coffee',
        totalSamples: 12,
        conversions: 5,
        conversionRate: 0.42,
        lastSampleDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        recentSamples: [
          {
            id: '1',
            productName: 'Barolo Riserva 2016',
            skuCode: 'WIN-125',
            tastedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            converted: true,
            feedback: 'Customer loved the complexity and aging potential',
          },
          {
            id: '2',
            productName: 'Prosecco Extra Dry',
            skuCode: 'SPA-034',
            tastedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            converted: false,
            feedback: 'Too sweet for their preference',
          },
        ],
      },
      {
        customerId: '2',
        customerName: 'The French Laundry',
        totalSamples: 18,
        conversions: 8,
        conversionRate: 0.44,
        lastSampleDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        nextFollowUp: null,
        recentSamples: [
          {
            id: '3',
            productName: 'Champagne Krug Grande Cuvée',
            skuCode: 'CHA-099',
            tastedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            converted: true,
            feedback: 'Perfect for special occasions menu',
          },
        ],
      },
    ];

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Customer history API error:', error);
    return NextResponse.json(
      { error: 'Failed to load customer history' },
      { status: 500 }
    );
  }
}
