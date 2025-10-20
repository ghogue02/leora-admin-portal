/**
 * CSV Parser Utility
 * Handles parsing CSV files with proper error handling and validation
 */

export interface ParsedCSV<T = Record<string, string>> {
  headers: string[];
  rows: T[];
  errors: CSVError[];
}

export interface CSVError {
  line: number;
  message: string;
  row?: string[];
}

export interface CSVParserOptions {
  delimiter?: string; // Default: auto-detect (comma, semicolon, tab)
  skipEmptyRows?: boolean; // Default: true
  trimWhitespace?: boolean; // Default: true
  validateHeaders?: string[]; // Expected headers
  requiredFields?: string[]; // Fields that must not be empty
}

/**
 * Detect CSV delimiter by analyzing first few lines
 */
function detectDelimiter(text: string): string {
  const lines = text.split('\n').slice(0, 5).filter(line => line.trim());
  if (lines.length === 0) return ',';

  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map(delim => ({
    delim,
    count: lines[0].split(delim).length,
    consistent: lines.every(line => line.split(delim).length === lines[0].split(delim).length)
  }));

  // Find delimiter with most columns and consistent across all lines
  const best = counts
    .filter(c => c.consistent && c.count > 1)
    .sort((a, b) => b.count - a.count)[0];

  return best?.delim || ',';
}

/**
 * Parse a single CSV row, handling quoted fields properly
 */
function parseCSVRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Parse CSV text into structured data
 */
export function parseCSV<T = Record<string, string>>(
  csvText: string,
  options: CSVParserOptions = {}
): ParsedCSV<T> {
  const {
    delimiter = detectDelimiter(csvText),
    skipEmptyRows = true,
    trimWhitespace = true,
    validateHeaders,
    requiredFields = []
  } = options;

  const errors: CSVError[] = [];
  const lines = csvText.split('\n');

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ line: 0, message: 'Empty CSV file' }] };
  }

  // Parse headers
  const headerLine = lines[0].trim();
  if (!headerLine) {
    return { headers: [], rows: [], errors: [{ line: 1, message: 'Missing headers' }] };
  }

  const headers = parseCSVRow(headerLine, delimiter).map(h =>
    trimWhitespace ? h.trim() : h
  );

  // Validate headers if specified
  if (validateHeaders && validateHeaders.length > 0) {
    const missing = validateHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      errors.push({
        line: 1,
        message: `Missing required headers: ${missing.join(', ')}`
      });
    }
  }

  // Parse data rows
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i].trim();

    // Skip empty rows
    if (!line && skipEmptyRows) {
      continue;
    }

    if (!line) {
      errors.push({ line: lineNumber, message: 'Empty row' });
      continue;
    }

    try {
      const fields = parseCSVRow(line, delimiter);

      // Check field count matches headers
      if (fields.length !== headers.length) {
        errors.push({
          line: lineNumber,
          message: `Field count mismatch. Expected ${headers.length}, got ${fields.length}`,
          row: fields
        });
        continue;
      }

      // Build row object
      const row: any = {};
      headers.forEach((header, index) => {
        let value = fields[index];
        if (trimWhitespace) {
          value = value.trim();
        }
        row[header] = value;
      });

      // Validate required fields
      const missingFields = requiredFields.filter(field => !row[field] || row[field] === '');
      if (missingFields.length > 0) {
        errors.push({
          line: lineNumber,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          row: fields
        });
        continue;
      }

      rows.push(row as T);
    } catch (error: any) {
      errors.push({
        line: lineNumber,
        message: `Parse error: ${error.message}`
      });
    }
  }

  return { headers, rows, errors };
}

/**
 * Parse CSV file from File object
 */
export async function parseCSVFile<T = Record<string, string>>(
  file: File,
  options?: CSVParserOptions
): Promise<ParsedCSV<T>> {
  const text = await file.text();
  return parseCSV<T>(text, options);
}

/**
 * Validate CSV structure without full parsing
 */
export function validateCSVStructure(
  csvText: string,
  expectedHeaders: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = csvText.split('\n');

  if (lines.length === 0) {
    errors.push('Empty CSV file');
    return { valid: false, errors };
  }

  const delimiter = detectDelimiter(csvText);
  const headers = parseCSVRow(lines[0].trim(), delimiter).map(h => h.trim());

  // Check for required headers
  const missing = expectedHeaders.filter(h => !headers.includes(h));
  if (missing.length > 0) {
    errors.push(`Missing required headers: ${missing.join(', ')}`);
  }

  // Check for minimum rows
  if (lines.length < 2) {
    errors.push('CSV file must contain at least one data row');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convert parsed CSV rows back to CSV text
 */
export function rowsToCSV<T extends Record<string, any>>(
  headers: string[],
  rows: T[]
): string {
  const escapeCellValue = (value: any): string => {
    const str = String(value ?? '');
    // Escape if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCellValue).join(','),
    ...rows.map(row =>
      headers.map(header => escapeCellValue(row[header])).join(',')
    )
  ];

  return csvLines.join('\n');
}

/**
 * Format CSV errors for display
 */
export function formatCSVErrors(errors: CSVError[]): string {
  if (errors.length === 0) return '';

  return errors.map(err => {
    const prefix = `Line ${err.line}:`;
    if (err.row) {
      return `${prefix} ${err.message}\n  Data: ${err.row.join(', ')}`;
    }
    return `${prefix} ${err.message}`;
  }).join('\n');
}
