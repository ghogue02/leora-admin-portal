/**
 * SAGE Export API
 *
 * Triggers the SAGE invoice export and returns the CSV file for download.
 * Integrates with the export script at /scripts/export-to-sage.ts
 *
 * @route POST /api/sage/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { exportToSage, SageExportResult } from '@/scripts/export-to-sage';
import { parse, differenceInDays } from 'date-fns';
import { formatUTCDate } from '@/lib/dates';

/**
 * Request body format
 */
interface ExportRequest {
  startDate: string; // ISO 8601 format (YYYY-MM-DD)
  endDate: string;   // ISO 8601 format (YYYY-MM-DD)
}

/**
 * Error response format
 */
interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

/**
 * POST /api/sage/export
 * Export HAL invoices to SAGE accounting format
 *
 * Request Body:
 * {
 *   "startDate": "2025-11-05",
 *   "endDate": "2025-11-05"
 * }
 *
 * Response:
 * - Success (200): CSV file download with Content-Disposition header
 * - Validation Error (400): JSON error response
 * - Server Error (500): JSON error response
 *
 * Authentication:
 * - Requires admin session (sales.admin or admin role)
 * - User must be active
 *
 * Security:
 * - Date range limited to 31 days maximum
 * - Export operations logged to SageExport table
 * - Validation errors logged to SageExportError table
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      // ========================================================================
      // STEP 1: Parse and validate request body
      // ========================================================================

      let requestBody: ExportRequest;

      try {
        requestBody = await request.json();
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Invalid request body. Expected JSON.',
            code: 'INVALID_JSON',
          } as ErrorResponse,
          { status: 400 }
        );
      }

      const { startDate: startDateStr, endDate: endDateStr } = requestBody;

      // Validate required fields
      if (!startDateStr || !endDateStr) {
        return NextResponse.json(
          {
            error: 'Missing required fields: startDate and endDate',
            code: 'MISSING_FIELDS',
            details: 'Both startDate and endDate must be provided in YYYY-MM-DD format',
          } as ErrorResponse,
          { status: 400 }
        );
      }

      // ========================================================================
      // STEP 2: Parse dates
      // ========================================================================

      let startDate: Date;
      let endDate: Date;

      try {
        startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
        startDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC

        endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());
        endDate.setUTCHours(23, 59, 59, 999); // End of day in UTC
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Invalid date format',
            code: 'INVALID_DATE_FORMAT',
            details: 'Dates must be in YYYY-MM-DD format (e.g., "2025-11-05")',
          } as ErrorResponse,
          { status: 400 }
        );
      }

      // Validate parsed dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date values',
            code: 'INVALID_DATE_VALUE',
            details: 'Dates must be valid calendar dates',
          } as ErrorResponse,
          { status: 400 }
        );
      }

      // ========================================================================
      // STEP 3: Validate date range
      // ========================================================================

      if (startDate > endDate) {
        return NextResponse.json(
          {
            error: 'Invalid date range',
            code: 'INVALID_DATE_RANGE',
            details: 'startDate must be before or equal to endDate',
          } as ErrorResponse,
          { status: 400 }
        );
      }

      // Limit date range to 31 days for performance and safety
      const daysDifference = differenceInDays(endDate, startDate);
      if (daysDifference > 31) {
        return NextResponse.json(
          {
            error: 'Date range too large',
            code: 'DATE_RANGE_TOO_LARGE',
            details: `Date range is ${daysDifference} days. Maximum allowed is 31 days.`,
          } as ErrorResponse,
          { status: 400 }
        );
      }

      // ========================================================================
      // STEP 4: Execute export
      // ========================================================================

      console.log(`[SAGE Export API] Starting export for ${tenantId}`);
      console.log(`[SAGE Export API] Date range: ${startDateStr} to ${endDateStr}`);
      console.log(`[SAGE Export API] User: ${user.email} (${user.id})`);

      let exportResult: SageExportResult;

      try {
        exportResult = await exportToSage(
          tenantId,
          startDate,
          endDate,
          user.id
        );
      } catch (error) {
        console.error('[SAGE Export API] Export failed:', error);

        // Check if it's a validation error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isValidationError = errorMessage.includes('validation failed');

        if (isValidationError) {
          // Extract export ID from error message if available
          const exportIdMatch = errorMessage.match(/exportId: ([a-f0-9-]+)/);
          const exportId = exportIdMatch ? exportIdMatch[1] : undefined;

          return NextResponse.json(
            {
              error: 'Export validation failed',
              code: 'VALIDATION_FAILED',
              details: errorMessage,
              exportId,
            } as ErrorResponse & { exportId?: string },
            { status: 400 }
          );
        }

        // Other errors (database, etc.)
        return NextResponse.json(
          {
            error: 'Export failed',
            code: 'EXPORT_FAILED',
            details: errorMessage,
          } as ErrorResponse,
          { status: 500 }
        );
      }

      // ========================================================================
      // STEP 5: Return CSV file
      // ========================================================================

      if (!exportResult.success) {
        return NextResponse.json(
          {
            error: 'Export completed with errors',
            code: 'EXPORT_ERRORS',
            details: 'Export did not complete successfully. Check SageExport table for details.',
            exportId: exportResult.exportId,
          } as ErrorResponse & { exportId: string },
          { status: 500 }
        );
      }

      console.log(`[SAGE Export API] Export successful`);
      console.log(`[SAGE Export API] Export ID: ${exportResult.exportId}`);
      console.log(`[SAGE Export API] Invoices: ${exportResult.invoiceCount}`);
      console.log(`[SAGE Export API] Line items: ${exportResult.recordCount}`);

      // Generate filename: MM.DD.YY-invoices.csv (using UTC to prevent timezone shift)
      const year = String(startDate.getUTCFullYear()).slice(-2);
      const month = String(startDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(startDate.getUTCDate()).padStart(2, '0');
      const fileDate = `${month}.${day}.${year}`;
      const fileName = `${fileDate}-invoices.csv`;

      // Return CSV file with proper headers
      return new NextResponse(exportResult.csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'X-Export-Id': exportResult.exportId,
          'X-Invoice-Count': String(exportResult.invoiceCount),
          'X-Record-Count': String(exportResult.recordCount),
        },
      });

    } catch (error) {
      console.error('[SAGE Export API] Unexpected error:', error);
      console.error('[SAGE Export API] Error details:', error instanceof Error ? error.message : 'Unknown');
      console.error('[SAGE Export API] Error stack:', error instanceof Error ? error.stack : 'No stack');

      return NextResponse.json(
        {
          error: 'An unexpected error occurred',
          code: 'UNEXPECTED_ERROR',
          details: error instanceof Error ? error.message : String(error),
        } as ErrorResponse,
        { status: 500 }
      );
    }
  });
}
