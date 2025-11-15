/**
 * Inventory Depletion Forecast API
 * CRM-91: Returns inventory sell-out predictions based on sales velocity
 *
 * GET /api/sales/manager/inventory-forecast
 *
 * Query Parameters:
 * - category?: string - Filter by product category
 * - brand?: string - Filter by brand (supplier proxy)
 * - urgency?: string - Filter by urgency level (critical|warning|normal|stable|infinite)
 * - sortBy?: string - Sort field (default: urgency + daysUntilStockout)
 * - limit?: number - Max results (default: 100)
 * - offset?: number - Pagination offset
 *
 * Response:
 * {
 *   forecasts: DepletionForecast[],
 *   summary: DepletionSummary,
 *   pagination: { total, limit, offset, hasMore }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';
import {
  calculateAllDepletionForecasts,
  generateDepletionSummary,
} from '@/lib/inventory/depletion-forecast';
import type { DepletionFilters, DepletionUrgency } from '@/types/inventory-forecast';

export async function GET(request: NextRequest) {
  return withSalesSession(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url);

    // Build filters from query params
    const filters: DepletionFilters = {};

    const category = searchParams.get('category');
    if (category) filters.category = category;

    const brand = searchParams.get('brand');
    if (brand) filters.brand = brand;

    const urgency = searchParams.get('urgency');
    if (urgency) {
      filters.urgency = urgency.split(',') as DepletionUrgency[];
    }

    const searchTerm = searchParams.get('search');
    if (searchTerm) filters.searchTerm = searchTerm;

    const minDays = searchParams.get('minDays');
    if (minDays) filters.minDaysUntilStockout = parseInt(minDays, 10);

    const maxDays = searchParams.get('maxDays');
    if (maxDays) filters.maxDaysUntilStockout = parseInt(maxDays, 10);

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Calculate forecasts
    const allForecasts = await calculateAllDepletionForecasts(
      session.tenantId,
      filters
    );

    // Generate summary
    const summary = generateDepletionSummary(allForecasts);

    // Apply pagination
    const paginatedForecasts = allForecasts.slice(offset, offset + limit);

    return NextResponse.json({
      forecasts: paginatedForecasts,
      summary,
      pagination: {
        total: allForecasts.length,
        limit,
        offset,
        hasMore: offset + limit < allForecasts.length,
      },
    });
  } catch (error) {
    console.error('Inventory forecast API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate inventory forecasts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
  });
}
