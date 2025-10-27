import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildProductCampaignHTML,
  getCampaignTemplate,
  buildProductCampaign,
  campaignTemplates,
} from '../campaign-builder';
import type { ProductWithSkus } from '../campaign-builder';

// Mock prisma
vi.mock('../prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
  },
}));

describe('Campaign Builder', () => {
  const mockProducts: ProductWithSkus[] = [
    {
      id: '1',
      tenantId: 'tenant-1',
      supplierId: null,
      name: 'Premium Chardonnay',
      brand: 'Vineyard Estate',
      description: 'A crisp and refreshing white wine',
      category: 'White Wine',
      isSampleOnly: false,
      tastingNotes: { notes: ['Citrus', 'Oak', 'Butter'] },
      foodPairings: { pairings: ['Seafood', 'Chicken', 'Pasta'] },
      servingInfo: null,
      wineDetails: null,
      enrichedAt: null,
      enrichedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      skus: [
        {
          id: 'sku-1',
          tenantId: 'tenant-1',
          productId: '1',
          code: 'CHARD-750',
          size: '750ml',
          unitOfMeasure: 'bottle',
          abv: 13.5,
          casesPerPallet: null,
          pricePerUnit: '25.99',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ],
    },
  ];

  describe('getCampaignTemplate', () => {
    it('should retrieve template by ID', () => {
      const template = getCampaignTemplate('new-arrivals');

      expect(template).toBeDefined();
      expect(template?.id).toBe('new-arrivals');
      expect(template?.name).toBe('New Arrivals This Week');
    });

    it('should return undefined for invalid template ID', () => {
      const template = getCampaignTemplate('invalid-id');
      expect(template).toBeUndefined();
    });

    it('should have all required templates', () => {
      expect(campaignTemplates.length).toBeGreaterThanOrEqual(6);

      const requiredIds = [
        'new-arrivals',
        'sample-followup',
        'seasonal-special',
        'reengagement',
        'special-offer',
        'restock-alert',
      ];

      requiredIds.forEach((id) => {
        const template = getCampaignTemplate(id);
        expect(template).toBeDefined();
      });
    });
  });

  describe('buildProductCampaignHTML', () => {
    it('should build HTML email with product cards', () => {
      const template = getCampaignTemplate('new-arrivals')!;

      const result = buildProductCampaignHTML(mockProducts, template, {
        companyName: 'Test Company',
        contactEmail: 'test@example.com',
      });

      expect(result.html).toContain('Premium Chardonnay');
      expect(result.html).toContain('Vineyard Estate');
      expect(result.html).toContain('$25.99');
      expect(result.html).toContain('750ml');
      expect(result.html).toContain('Test Company');
      expect(result.html).toContain('test@example.com');

      expect(result.subject).toBe('New Arrivals This Week');
      expect(result.preheader).toBeTruthy();
    });

    it('should include tasting notes in HTML', () => {
      const template = getCampaignTemplate('new-arrivals')!;

      const result = buildProductCampaignHTML(mockProducts, template);

      expect(result.html).toContain('Tasting Notes:');
      expect(result.html).toContain('Citrus');
      expect(result.html).toContain('Oak');
      expect(result.html).toContain('Butter');
    });

    it('should include food pairings in HTML', () => {
      const template = getCampaignTemplate('new-arrivals')!;

      const result = buildProductCampaignHTML(mockProducts, template);

      expect(result.html).toContain('Pairs Well With:');
      expect(result.html).toContain('Seafood');
      expect(result.html).toContain('Chicken');
      expect(result.html).toContain('Pasta');
    });

    it('should escape HTML in product data', () => {
      const productsWithHTML: ProductWithSkus[] = [
        {
          ...mockProducts[0],
          name: '<script>alert("xss")</script>',
          description: 'Test & Demo <b>Product</b>',
        },
      ];

      const template = getCampaignTemplate('new-arrivals')!;
      const result = buildProductCampaignHTML(productsWithHTML, template);

      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).toContain('Test &amp; Demo');
    });

    it('should handle products without SKUs gracefully', () => {
      const productsNoSku: ProductWithSkus[] = [
        {
          ...mockProducts[0],
          skus: [],
        },
      ];

      const template = getCampaignTemplate('new-arrivals')!;
      const result = buildProductCampaignHTML(productsNoSku, template);

      expect(result.html).toContain('Premium Chardonnay');
      expect(result.html).toContain('Contact for pricing');
    });

    it('should include Mailchimp merge tags', () => {
      const template = getCampaignTemplate('new-arrivals')!;
      const result = buildProductCampaignHTML(mockProducts, template);

      expect(result.html).toContain('*|UNSUB|*');
      expect(result.html).toContain('*|PORTAL_URL|*');
    });

    it('should be valid HTML structure', () => {
      const template = getCampaignTemplate('new-arrivals')!;
      const result = buildProductCampaignHTML(mockProducts, template);

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html lang="en">');
      expect(result.html).toContain('</html>');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<body>');
    });
  });

  describe('buildProductCampaign', () => {
    it('should build campaign for specific products', async () => {
      const { prisma } = await import('../prisma');
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);

      const result = await buildProductCampaign(
        'tenant-1',
        ['1'],
        'new-arrivals',
        {
          companyName: 'Test Co',
          contactEmail: 'contact@test.com',
        }
      );

      expect(result.html).toContain('Premium Chardonnay');
      expect(result.html).toContain('Test Co');
      expect(result.subject).toBe('New Arrivals This Week');
    });

    it('should throw error for invalid template', async () => {
      await expect(
        buildProductCampaign('tenant-1', ['1'], 'invalid-template')
      ).rejects.toThrow('Invalid template ID');
    });
  });
});
