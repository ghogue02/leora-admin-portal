/**
 * Tax Calculator
 *
 * Calculates state-specific taxes for invoices:
 * - Excise tax (per liter for alcohol)
 * - Sales tax (percentage of total)
 */

import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TaxCalculation {
  exciseTax: Decimal;
  salesTax: Decimal;
  totalTax: Decimal;
  taxRate: Decimal;
  perUnit: string;
  taxType: string;
}

/**
 * Virginia Excise Tax Rates (as of 2025)
 * Source: Virginia ABC regulations
 */
export const VA_TAX_RATES = {
  // Wine excise tax: $0.40 per liter
  WINE_EXCISE: new Decimal('0.40'),

  // Sales tax: 5.3% (state) + local
  SALES_TAX_RATE: new Decimal('0.053'),
} as const;

/**
 * Calculate Virginia excise tax on wine
 *
 * VA Law: $0.40 per liter on wine sold in-state
 *
 * @param totalLiters - Total liters on invoice
 * @param isInState - Whether sale is in-state (VA to VA)
 * @returns Excise tax amount
 */
export function calculateVAExciseTax(
  totalLiters: number | Decimal,
  isInState: boolean
): Decimal {
  if (!isInState) {
    return new Decimal(0); // No excise tax on out-of-state sales
  }

  const liters = new Decimal(totalLiters);
  return liters.times(VA_TAX_RATES.WINE_EXCISE);
}

/**
 * Calculate sales tax
 *
 * @param subtotal - Invoice subtotal before tax
 * @param taxRate - Tax rate as decimal (e.g., 0.053 for 5.3%)
 * @returns Sales tax amount
 */
export function calculateSalesTax(
  subtotal: number | Decimal,
  taxRate: number | Decimal = VA_TAX_RATES.SALES_TAX_RATE
): Decimal {
  const amount = new Decimal(subtotal);
  const rate = new Decimal(taxRate);
  return amount.times(rate);
}

/**
 * Calculate all applicable taxes for an invoice
 *
 * @param params - Invoice parameters
 * @returns Complete tax calculation breakdown
 */
export async function calculateInvoiceTaxes(params: {
  tenantId: string;
  customerState: string | null;
  distributorState: string;
  totalLiters: number | Decimal;
  subtotal: number | Decimal;
  includeExcise?: boolean;
  includeSales?: boolean;
}): Promise<TaxCalculation> {
  const {
    tenantId,
    customerState,
    distributorState,
    totalLiters,
    subtotal,
    includeExcise = true,
    includeSales = false, // VA ABC invoices typically don't show sales tax separately
  } = params;

  const isInState = distributorState === customerState;

  // Calculate excise tax (only for in-state sales)
  const exciseTax = includeExcise && distributorState === 'VA'
    ? calculateVAExciseTax(totalLiters, isInState)
    : new Decimal(0);

  // Calculate sales tax (if requested)
  const salesTax = includeSales
    ? calculateSalesTax(subtotal)
    : new Decimal(0);

  const totalTax = exciseTax.plus(salesTax);

  return {
    exciseTax,
    salesTax,
    totalTax,
    taxRate: VA_TAX_RATES.WINE_EXCISE,
    perUnit: 'LITER',
    taxType: 'EXCISE',
  };
}

/**
 * Query tax rules from database for a specific state/type
 *
 * @param tenantId - Tenant ID
 * @param state - State code (e.g., "VA")
 * @param taxType - Tax type (e.g., "EXCISE")
 * @returns Active tax rule or null
 */
export async function getTaxRule(
  tenantId: string,
  state: string,
  taxType: string
): Promise<{
  rate: Decimal;
  perUnit: string | null;
} | null> {
  const now = new Date();

  const rule = await prisma.taxRule.findFirst({
    where: {
      tenantId,
      state,
      taxType,
      effective: { lte: now },
      OR: [
        { expires: { gte: now } },
        { expires: null },
      ],
    },
    orderBy: {
      effective: 'desc',
    },
  });

  if (!rule) {
    return null;
  }

  return {
    rate: rule.rate,
    perUnit: rule.perUnit,
  };
}

/**
 * Calculate tax using database tax rules
 *
 * Falls back to hardcoded rates if no rule found
 *
 * @param params - Tax calculation parameters
 * @returns Tax amount
 */
export async function calculateTaxFromRules(params: {
  tenantId: string;
  state: string;
  taxType: string;
  quantity: number | Decimal; // liters, bottles, cases, or dollars
}): Promise<Decimal> {
  const { tenantId, state, taxType, quantity } = params;

  // Try to get tax rule from database
  const rule = await getTaxRule(tenantId, state, taxType);

  if (rule) {
    return new Decimal(quantity).times(rule.rate);
  }

  // Fallback to hardcoded VA rates
  if (state === 'VA' && taxType === 'EXCISE') {
    return new Decimal(quantity).times(VA_TAX_RATES.WINE_EXCISE);
  }

  // No tax found
  return new Decimal(0);
}

/**
 * Initialize default tax rules for a tenant
 *
 * @param tenantId - Tenant ID
 */
export async function initializeDefaultTaxRules(tenantId: string): Promise<void> {
  const now = new Date();

  // Virginia excise tax on wine
  await prisma.taxRule.upsert({
    where: {
      tenantId_state_taxType: {
        tenantId,
        state: 'VA',
        taxType: 'EXCISE',
      },
    },
    update: {},
    create: {
      tenantId,
      state: 'VA',
      taxType: 'EXCISE',
      rate: VA_TAX_RATES.WINE_EXCISE,
      perUnit: 'LITER',
      effective: now,
    },
  });

  console.log('✅ Default VA tax rules initialized');
}
