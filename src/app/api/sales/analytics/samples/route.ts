'use server';

import { NextRequest, NextResponse } from 'next/server';
import { endOfDay, parseISO, startOfDay, subDays, isValid } from 'date-fns';
import { withSalesSession } from '@/lib/auth/sales';
import {
  fetchSampleAnalytics,
  type SampleAnalyticsFilters,
} from './_service';

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) {
    return fallback;
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

function parseFilters(searchParams: URLSearchParams): SampleAnalyticsFilters {
  const filter: SampleAnalyticsFilters = {};
  const salesRepId = searchParams.get('salesRepId');
  const supplierId = searchParams.get('supplierId');
  const skuId = searchParams.get('skuId');
  const customerId = searchParams.get('customerId');

  if (salesRepId) filter.salesRepId = salesRepId;
  if (supplierId) filter.supplierId = supplierId;
  if (skuId) filter.skuId = skuId;
  if (customerId) filter.customerId = customerId;

  return filter;
}

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { searchParams } = request.nextUrl;
    const endParam = searchParams.get('endDate');
    const startParam = searchParams.get('startDate');

    const now = new Date();
    const rawEnd = parseDateParam(endParam, now);
    const endDate = endOfDay(rawEnd);
    const defaultStart = subDays(endDate, 90);
    const rawStart = parseDateParam(startParam, defaultStart);
    const startDate = startOfDay(rawStart);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Invalid date range: startDate must be before endDate' },
        { status: 400 }
      );
    }

    const filters = parseFilters(searchParams);

    const analytics = await fetchSampleAnalytics(db, tenantId, {
      startDate,
      endDate,
      filters,
    });

    return NextResponse.json(analytics);
  });
}
