import { prisma } from './prisma';
import type { Product, Sku, AccountType } from '@prisma/client';

export interface ProductWithSkus extends Product {
  skus: Sku[];
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
}

export interface CampaignHTML {
  html: string;
  subject: string;
  preheader?: string;
}

/**
 * Get product recommendations based on segment
 */
export async function getProductRecommendations(
  tenantId: string,
  segment: AccountType | 'ALL',
  limit: number = 6
): Promise<ProductWithSkus[]> {
  // Get top products by revenue for the segment
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      skus: {
        where: { isActive: true },
        orderBy: { pricePerUnit: 'asc' },
        take: 1,
      },
    },
    take: limit,
  });

  return products as ProductWithSkus[];
}

/**
 * Build product campaign HTML
 */
export function buildProductCampaignHTML(
  products: ProductWithSkus[],
  template: CampaignTemplate,
  options: {
    companyName?: string;
    logoUrl?: string;
    contactEmail?: string;
    unsubscribeUrl?: string;
  } = {}
): CampaignHTML {
  const {
    companyName = 'Our Company',
    logoUrl = '',
    contactEmail = 'contact@example.com',
    unsubscribeUrl = '*|UNSUB|*', // Mailchimp merge tag
  } = options;

  // Build product cards HTML
  const productCards = products
    .map((product) => {
      const sku = product.skus[0];
      const price = sku?.pricePerUnit
        ? `$${parseFloat(sku.pricePerUnit.toString()).toFixed(2)}`
        : 'Contact for pricing';

      return `
        <div style="margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="padding: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 20px; color: #111827;">
              ${escapeHtml(product.name)}
            </h3>
            ${product.brand ? `<p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">${escapeHtml(product.brand)}</p>` : ''}
            ${product.description ? `<p style="margin: 0 0 15px 0; color: #374151; line-height: 1.5;">${escapeHtml(product.description)}</p>` : ''}

            ${renderTastingNotes(product.tastingNotes)}
            ${renderFoodPairings(product.foodPairings)}

            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #059669;">
                ${price}
              </p>
              ${sku ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">Size: ${escapeHtml(sku.size || 'N/A')}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Build full email HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(template.name)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; background-color: #059669;">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="max-width: 200px; height: auto;">` : `<h1 style="margin: 0; color: #ffffff; font-size: 28px;">${escapeHtml(companyName)}</h1>`}
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #111827;">
                ${escapeHtml(template.name)}
              </h2>
              <p style="margin: 0 0 30px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                ${escapeHtml(template.description)}
              </p>

              <!-- Products -->
              ${productCards}

              <!-- CTA -->
              <div style="text-align: center; margin-top: 40px;">
                <a href="*|PORTAL_URL|*" style="display: inline-block; padding: 14px 32px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Browse Full Catalog
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f3f4f6; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-align: center;">
                Questions? Contact us at <a href="mailto:${escapeHtml(contactEmail)}" style="color: #059669; text-decoration: none;">${escapeHtml(contactEmail)}</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from these emails
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return {
    html,
    subject: template.name,
    preheader: template.description.slice(0, 100),
  };
}

/**
 * Available campaign templates
 */
export const campaignTemplates: CampaignTemplate[] = [
  {
    id: 'new-arrivals',
    name: 'New Arrivals This Week',
    description: "Check out the latest additions to our collection. These new products are available now and ready to order.",
    template: 'product-showcase',
  },
  {
    id: 'sample-followup',
    name: 'Did You Enjoy Your Samples?',
    description: "We hope you enjoyed the samples from your recent tasting. Here are some products we think you'll love based on your preferences.",
    template: 'product-showcase',
  },
  {
    id: 'seasonal-special',
    name: 'Seasonal Selections',
    description: "Discover our handpicked seasonal favorites, perfect for this time of year. Limited availability.",
    template: 'product-showcase',
  },
  {
    id: 'reengagement',
    name: "We Miss You! Here's What's New",
    description: "It's been a while since your last order. Take a look at what's new and exciting in our catalog.",
    template: 'product-showcase',
  },
  {
    id: 'special-offer',
    name: 'Exclusive Offer Inside',
    description: "As a valued customer, we're excited to share this exclusive offer with you. Don't miss out!",
    template: 'product-showcase',
  },
  {
    id: 'restock-alert',
    name: 'Back in Stock!',
    description: "Great news! Popular items you've ordered before are back in stock. Order now before they're gone again.",
    template: 'product-showcase',
  },
];

/**
 * Get campaign template by ID
 */
export function getCampaignTemplate(templateId: string): CampaignTemplate | undefined {
  return campaignTemplates.find((t) => t.id === templateId);
}

/**
 * Build campaign for specific products
 */
export async function buildProductCampaign(
  tenantId: string,
  productIds: string[],
  templateId: string,
  options?: {
    companyName?: string;
    logoUrl?: string;
    contactEmail?: string;
  }
): Promise<CampaignHTML> {
  const template = getCampaignTemplate(templateId);
  if (!template) {
    throw new Error('Invalid template ID');
  }

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      id: { in: productIds },
    },
    include: {
      skus: {
        where: { isActive: true },
        orderBy: { pricePerUnit: 'asc' },
        take: 1,
      },
    },
  });

  return buildProductCampaignHTML(products as ProductWithSkus[], template, options);
}

// Helper functions

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

function renderTastingNotes(tastingNotes: any): string {
  if (!tastingNotes || typeof tastingNotes !== 'object') return '';

  const notes = Array.isArray(tastingNotes) ? tastingNotes : tastingNotes.notes || [];
  if (notes.length === 0) return '';

  return `
    <div style="margin-bottom: 15px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827; font-size: 14px;">Tasting Notes:</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        ${notes.map((note: string) => escapeHtml(note)).join(', ')}
      </p>
    </div>
  `;
}

function renderFoodPairings(foodPairings: any): string {
  if (!foodPairings || typeof foodPairings !== 'object') return '';

  const pairings = Array.isArray(foodPairings) ? foodPairings : foodPairings.pairings || [];
  if (pairings.length === 0) return '';

  return `
    <div style="margin-bottom: 15px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827; font-size: 14px;">Pairs Well With:</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        ${pairings.map((pairing: string) => escapeHtml(pairing)).join(', ')}
      </p>
    </div>
  `;
}
