/**
 * Invoice Format Selector
 *
 * Automatically determines which invoice format to use based on:
 * - Customer state
 * - Distributor state
 * - Customer license type
 * - Regulatory requirements
 */

import { InvoiceFormatType } from '@prisma/client';

export interface FormatSelectionContext {
  customerState: string | null;
  customerLicenseType?: string | null;
  distributorState: string;
  manualOverride?: InvoiceFormatType;
}

/**
 * Determine the appropriate invoice format based on business rules
 *
 * Rules:
 * 1. Manual override takes precedence
 * 2. VA distributor → VA customer = VA_ABC_INSTATE
 * 3. VA distributor → Out-of-state customer = VA_ABC_TAX_EXEMPT
 * 4. All other cases = STANDARD
 *
 * @param context - Customer and distributor state information
 * @returns The appropriate invoice format type
 */
export function determineInvoiceFormat(context: FormatSelectionContext): InvoiceFormatType {
  // Manual override takes precedence
  if (context.manualOverride) {
    return context.manualOverride;
  }

  const { customerState, distributorState } = context;

  // No customer state info = use standard format
  if (!customerState) {
    return 'STANDARD';
  }

  // Virginia-specific rules
  if (distributorState === 'VA') {
    // VA to VA = In-state format
    if (customerState === 'VA') {
      return 'VA_ABC_INSTATE';
    }

    // VA to other state = Tax-exempt format
    return 'VA_ABC_TAX_EXEMPT';
  }

  // Default for all other scenarios
  return 'STANDARD';
}

/**
 * Get human-readable description of invoice format
 *
 * @param formatType - The invoice format type
 * @returns Description string
 */
export function getFormatDescription(formatType: InvoiceFormatType): string {
  switch (formatType) {
    case 'VA_ABC_INSTATE':
      return 'Virginia ABC In-State';
    case 'VA_ABC_TAX_EXEMPT':
      return 'Virginia ABC Tax-Exempt (Out-of-State)';
    case 'STANDARD':
      return 'Standard Invoice';
    default:
      return 'Unknown Format';
  }
}

/**
 * Get required fields for a specific invoice format
 *
 * @param formatType - The invoice format type
 * @returns Array of required field names
 */
export function getRequiredFields(formatType: InvoiceFormatType): string[] {
  const baseFields = ['invoiceNumber', 'issuedAt', 'dueDate', 'customer', 'orderLines'];

  switch (formatType) {
    case 'VA_ABC_INSTATE':
      return [
        ...baseFields,
        'salesperson',
        'paymentTermsText',
        'shippingMethod',
        'shipDate',
        'totalLiters',
        'wholesalerLicenseNumber', // from Tenant
        'wholesalerPhone', // from Tenant
      ];

    case 'VA_ABC_TAX_EXEMPT':
      return [
        ...baseFields,
        'salesperson',
        'paymentTermsText',
        'poNumber',
        'totalLiters',
        'complianceNotice',
      ];

    case 'STANDARD':
    default:
      return baseFields;
  }
}

/**
 * Validate that an invoice has all required fields for its format
 *
 * @param invoice - Invoice object with format type
 * @param tenant - Tenant object (for wholesaler info)
 * @returns Validation result with missing fields
 */
type InvoiceRecord = {
  [key: string]: unknown;
  invoiceFormatType?: InvoiceFormatType | null;
};

type TenantInfo = {
  wholesalerLicenseNumber?: string | null;
  wholesalerPhone?: string | null;
};

export function validateInvoiceFormat(
  invoice: InvoiceRecord,
  tenant?: TenantInfo
): { valid: boolean; missingFields: string[] } {
  const requiredFields = getRequiredFields(invoice.invoiceFormatType || 'STANDARD');
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    // Check tenant fields
    if (field === 'wholesalerLicenseNumber' && !tenant?.wholesalerLicenseNumber) {
      missingFields.push(field);
      continue;
    }
    if (field === 'wholesalerPhone' && !tenant?.wholesalerPhone) {
      missingFields.push(field);
      continue;
    }

    // Check invoice fields
    const value = invoice[field];
    if (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
