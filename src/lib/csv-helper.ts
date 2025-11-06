/**
 * CSV Export Helper Utility
 * Provides functions for creating CSV files from data
 */

import { formatUTCDate } from './dates';

/**
 * Escape a CSV cell value (handle commas, quotes, newlines)
 */
export function escapeCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If cell contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: string[],
  options: {
    includeHeaders?: boolean;
    transformValue?: (value: any, header: string) => any;
  } = {}
): string {
  const {
    includeHeaders = true,
    transformValue
  } = options;

  const lines: string[] = [];

  // Add headers
  if (includeHeaders) {
    lines.push(headers.map(escapeCellValue).join(','));
  }

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];
      if (transformValue) {
        value = transformValue(value, header);
      }
      return escapeCellValue(value);
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Create CSV with metadata comment header
 */
export function createCSVWithMetadata(
  data: any[],
  headers: string[],
  metadata: {
    exportedBy?: string;
    exportedAt?: Date;
    description?: string;
    filters?: Record<string, any>;
  },
  options?: {
    transformValue?: (value: any, header: string) => any;
  }
): string {
  const lines: string[] = [];

  // Add metadata comments
  if (metadata.description) {
    lines.push(`# ${metadata.description}`);
  }
  if (metadata.exportedBy) {
    lines.push(`# Exported by: ${metadata.exportedBy}`);
  }
  if (metadata.exportedAt) {
    lines.push(`# Exported at: ${metadata.exportedAt.toISOString()}`);
  }
  if (metadata.filters && Object.keys(metadata.filters).length > 0) {
    lines.push(`# Filters: ${JSON.stringify(metadata.filters)}`);
  }
  if (lines.length > 0) {
    lines.push(''); // Empty line after metadata
  }

  // Add CSV content
  lines.push(arrayToCSV(data, headers, options));

  return lines.join('\n');
}

/**
 * Format date for CSV export
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatUTCDate(d); // YYYY-MM-DD in UTC
}

/**
 * Format datetime for CSV export
 */
export function formatDateTimeForCSV(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Format currency for CSV export
 */
export function formatCurrencyForCSV(amount: number | string | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals);
}

/**
 * Format boolean for CSV export
 */
export function formatBooleanForCSV(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
}

/**
 * Create CSV Blob for download
 */
export function createCSVBlob(csvContent: string): Blob {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generate CSV filename with timestamp
 */
export function generateCSVFilename(baseName: string, extension = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${baseName}-${timestamp}.${extension}`;
}

/**
 * Create downloadable CSV response for Next.js API routes
 */
export function createCSVResponse(
  csvContent: string,
  filename: string,
  options: {
    includeMetadata?: boolean;
    exportedBy?: string;
  } = {}
): Response {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const content = BOM + csvContent;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * Parse CSV row into typed object with validation
 */
export function parseCSVRowToObject<T>(
  row: Record<string, string>,
  schema: {
    [K in keyof T]: {
      type: 'string' | 'number' | 'boolean' | 'date';
      required?: boolean;
      validate?: (value: any) => boolean;
      transform?: (value: string) => T[K];
    }
  }
): { data: T | null; errors: string[] } {
  const errors: string[] = [];
  const data: any = {};

  for (const [key, config] of Object.entries(schema) as [keyof T, any][]) {
    const rawValue = row[key as string];

    // Check required
    if (config.required && (!rawValue || rawValue.trim() === '')) {
      errors.push(`Field '${String(key)}' is required`);
      continue;
    }

    if (!rawValue || rawValue.trim() === '') {
      data[key] = null;
      continue;
    }

    // Transform value
    if (config.transform) {
      try {
        data[key] = config.transform(rawValue);
      } catch (error: any) {
        errors.push(`Field '${String(key)}': ${error.message}`);
        continue;
      }
    } else {
      // Default type conversion
      switch (config.type) {
        case 'number':
          const num = parseFloat(rawValue);
          if (isNaN(num)) {
            errors.push(`Field '${String(key)}' must be a number`);
          } else {
            data[key] = num;
          }
          break;
        case 'boolean':
          const lower = rawValue.toLowerCase().trim();
          data[key] = lower === 'true' || lower === 'yes' || lower === '1';
          break;
        case 'date':
          const date = new Date(rawValue);
          if (isNaN(date.getTime())) {
            errors.push(`Field '${String(key)}' must be a valid date`);
          } else {
            data[key] = date;
          }
          break;
        default:
          data[key] = rawValue;
      }
    }

    // Custom validation
    if (config.validate && !config.validate(data[key])) {
      errors.push(`Field '${String(key)}' failed validation`);
    }
  }

  return {
    data: errors.length === 0 ? (data as T) : null,
    errors
  };
}

/**
 * Chunk large arrays for processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
