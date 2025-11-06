import { InvoiceFormatType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CompleteInvoiceData } from './invoice-data-builder';
import type { InvoiceTemplateSettings } from './template-settings';

const NOW = new Date('2025-01-15T10:30:00Z');

const SAMPLE_CUSTOMER = {
  id: 'sample-customer',
  name: 'Cheesetique Old Town',
  state: 'VA',
  licenseNumber: 'ABC12345',
  accountNumber: 'CUST-001',
  territory: 'DC Metro',
  phone: '(703) 555-0100',
  billingEmail: 'orders@cheesetique.com',
};

const BILLING_ADDRESS = {
  street1: '2411 Mount Vernon Ave',
  street2: null,
  city: 'Alexandria',
  state: 'VA',
  postalCode: '22301',
};

const SHIPPING_ADDRESS = {
  street1: '2411 Mount Vernon Ave',
  street2: 'Suite 200',
  city: 'Alexandria',
  state: 'VA',
  postalCode: '22301',
};

const SAMPLE_LINES = [
  {
    id: 'line-1',
    skuId: 'sku-1',
    quantity: 12,
    unitPrice: new Decimal(14.5),
    casesQuantity: new Decimal(1),
    totalLiters: new Decimal(9),
    lineTotal: new Decimal(174),
    sku: {
      code: 'SKU-001',
      size: '750ml',
      liters: new Decimal(0.75),
      itemsPerCase: 12,
      abcCodeNumber: '289654',
      product: {
        name: 'Compañia de Vinos - Rioja Crianza',
        category: 'Red Wine',
      },
    },
  },
  {
    id: 'line-2',
    skuId: 'sku-2',
    quantity: 6,
    unitPrice: new Decimal(18.75),
    casesQuantity: new Decimal(0.5),
    totalLiters: new Decimal(4.5),
    lineTotal: new Decimal(112.5),
    sku: {
      code: 'SKU-002',
      size: '750ml',
      liters: new Decimal(0.75),
      itemsPerCase: 12,
      abcCodeNumber: '289655',
      product: {
        name: 'Bodega Godelia - Bierzo Blanco',
        category: 'White Wine',
      },
    },
  },
  {
    id: 'line-3',
    skuId: 'sku-3',
    quantity: 4,
    unitPrice: new Decimal(22.0),
    casesQuantity: new Decimal(0.333333),
    totalLiters: new Decimal(3),
    lineTotal: new Decimal(88),
    sku: {
      code: 'SKU-003',
      size: '750ml',
      liters: new Decimal(0.75),
      itemsPerCase: 12,
      abcCodeNumber: '289656',
      product: {
        name: 'Mont Marçal - Cava Brut Rosé',
        category: 'Sparkling',
      },
    },
  },
];

export function buildSampleInvoiceData(
  formatType: InvoiceFormatType,
  templateSettings: InvoiceTemplateSettings
): CompleteInvoiceData {
  const subtotal = SAMPLE_LINES.reduce(
    (sum, line) => sum.plus(line.lineTotal),
    new Decimal(0)
  );

  return {
    invoiceNumber: 'SAMPLE-INV-0001',
    issuedAt: NOW,
    dueDate: new Date('2025-02-14T10:30:00Z'),
    subtotal,
    total: subtotal,
    invoiceFormatType: formatType,
    formatDescription: formatType,
    customer: SAMPLE_CUSTOMER,
    billingAddress: BILLING_ADDRESS,
    shippingAddress: SHIPPING_ADDRESS,
    salesperson: 'Travis Leonard',
    paymentTermsText: 'Net 30',
    shippingMethod: 'Common carrier',
    shipDate: NOW,
    specialInstructions: 'Deliver before noon if possible.',
    poNumber: 'PO-56789',
    totalLiters: SAMPLE_LINES.reduce(
      (sum, line) => sum.plus(line.totalLiters),
      new Decimal(0)
    ),
    exciseTax: new Decimal(0),
    salesTax: new Decimal(0),
    totalTax: new Decimal(0),
    interestRate: new Decimal(0.015),
    collectionTerms: 'Accounts over 30 days past due are subject to a 1.5% monthly finance charge.',
    complianceNotice:
      'Out-of-state shipment—tax-exempt. Retailer responsible for reporting in destination state.',
    orderLines: SAMPLE_LINES,
    wholesalerLicenseNumber: '0903-123456',
    wholesalerPhone: '(540) 555-0198',
    tenantName: 'Well Crafted Wine & Beverage Co.',
    templateSettings,
  };
}
