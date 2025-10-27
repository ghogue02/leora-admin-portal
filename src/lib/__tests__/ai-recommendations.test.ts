/**
 * Tests for AI recommendations service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProductRecommendations,
  buildRecommendationPrompt,
  type RecommendationContext,
} from '../ai-recommendations';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

describe('AI Recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('buildRecommendationPrompt', () => {
    it('should build a valid prompt with all context', () => {
      const context: RecommendationContext = {
        occasion: 'wine pairing',
        customerNotes: 'Prefers bold reds',
        previousOrders: [
          {
            id: 'order-1',
            createdAt: new Date('2024-01-01'),
            total: 150,
            items: [
              {
                productId: 'prod-1',
                productName: 'Cabernet Sauvignon',
                quantity: 2,
                price: 75,
              },
            ],
          },
        ],
        sampleHistory: [
          {
            id: 'sample-1',
            productId: 'prod-2',
            productName: 'Pinot Noir',
            usedAt: new Date('2024-01-15'),
            feedback: 'positive',
            notes: 'Loved the earthy notes',
          },
        ],
        pricePreference: {
          min: 50,
          max: 150,
          average: 85,
        },
        productPreferences: {
          categories: ['Red Wine'],
          varietals: ['Cabernet Sauvignon', 'Pinot Noir'],
        },
      };

      const availableProducts = [
        { id: 'prod-3', name: 'Merlot Reserve', category: 'Red Wine', price: 90 },
        { id: 'prod-4', name: 'Chardonnay', category: 'White Wine', price: 65 },
      ];

      const { system, user } = buildRecommendationPrompt(
        'customer-123',
        context,
        availableProducts,
        5
      );

      expect(system).toContain('sommelier');
      expect(system).toContain('Well Crafted Wine');
      expect(user).toContain('customer-123');
      expect(user).toContain('wine pairing');
      expect(user).toContain('Prefers bold reds');
      expect(user).toContain('Cabernet Sauvignon');
      expect(user).toContain('Pinot Noir');
      expect(user).toContain('$50-$150');
      expect(user).toContain('Merlot Reserve');
    });

    it('should handle minimal context', () => {
      const context: RecommendationContext = {};
      const availableProducts = [
        { id: 'prod-1', name: 'Test Wine', category: 'Red Wine', price: 50 },
      ];

      const { system, user } = buildRecommendationPrompt(
        'customer-456',
        context,
        availableProducts
      );

      expect(system).toBeDefined();
      expect(user).toContain('customer-456');
      expect(user).toContain('Test Wine');
    });
  });

  describe('getProductRecommendations', () => {
    it('should throw error if API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const context: RecommendationContext = {};
      const availableProducts = [
        { id: 'prod-1', name: 'Test Wine', category: 'Red Wine', price: 50 },
      ];

      await expect(
        getProductRecommendations('customer-123', context, availableProducts)
      ).rejects.toThrow('ANTHROPIC_API_KEY is not configured');
    });

    it('should call Claude API with correct parameters', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'recommend_products',
            input: {
              recommendations: [
                {
                  productId: 'prod-1',
                  reason: 'Matches customer preferences',
                  confidence: 0.85,
                },
              ],
            },
          },
        ],
      });

      // @ts-ignore
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const context: RecommendationContext = {
        occasion: 'seasonal',
      };
      const availableProducts = [
        { id: 'prod-1', name: 'Test Wine', category: 'Red Wine', price: 50 },
      ];

      const result = await getProductRecommendations(
        'customer-123',
        context,
        availableProducts
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'recommend_products',
            }),
          ]),
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        productId: 'prod-1',
        reason: 'Matches customer preferences',
        confidence: 0.85,
      });
    });

    it('should filter recommendations by confidence threshold', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'recommend_products',
            input: {
              recommendations: [
                {
                  productId: 'prod-1',
                  reason: 'High confidence match',
                  confidence: 0.9,
                },
                {
                  productId: 'prod-2',
                  reason: 'Low confidence match',
                  confidence: 0.4,
                },
              ],
            },
          },
        ],
      });

      // @ts-ignore
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const context: RecommendationContext = {};
      const availableProducts = [
        { id: 'prod-1', name: 'Wine 1', category: 'Red Wine', price: 50 },
        { id: 'prod-2', name: 'Wine 2', category: 'Red Wine', price: 60 },
      ];

      const result = await getProductRecommendations(
        'customer-123',
        context,
        availableProducts,
        { minConfidence: 0.6 }
      );

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('prod-1');
    });

    it('should validate product IDs against available products', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'recommend_products',
            input: {
              recommendations: [
                {
                  productId: 'prod-1',
                  reason: 'Valid product',
                  confidence: 0.9,
                },
                {
                  productId: 'invalid-id',
                  reason: 'Invalid product',
                  confidence: 0.8,
                },
              ],
            },
          },
        ],
      });

      // @ts-ignore
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const context: RecommendationContext = {};
      const availableProducts = [
        { id: 'prod-1', name: 'Wine 1', category: 'Red Wine', price: 50 },
      ];

      const result = await getProductRecommendations(
        'customer-123',
        context,
        availableProducts
      );

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('prod-1');
    });

    it('should respect max recommendations limit', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'recommend_products',
            input: {
              recommendations: [
                { productId: 'prod-1', reason: 'Rec 1', confidence: 0.9 },
                { productId: 'prod-2', reason: 'Rec 2', confidence: 0.85 },
                { productId: 'prod-3', reason: 'Rec 3', confidence: 0.8 },
                { productId: 'prod-4', reason: 'Rec 4', confidence: 0.75 },
              ],
            },
          },
        ],
      });

      // @ts-ignore
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const context: RecommendationContext = {};
      const availableProducts = [
        { id: 'prod-1', name: 'Wine 1', category: 'Red Wine', price: 50 },
        { id: 'prod-2', name: 'Wine 2', category: 'Red Wine', price: 60 },
        { id: 'prod-3', name: 'Wine 3', category: 'Red Wine', price: 70 },
        { id: 'prod-4', name: 'Wine 4', category: 'Red Wine', price: 80 },
      ];

      const result = await getProductRecommendations(
        'customer-123',
        context,
        availableProducts,
        { maxRecommendations: 2 }
      );

      expect(result).toHaveLength(2);
    });

    it('should return empty array if no tool use in response', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'No recommendations available',
          },
        ],
      });

      // @ts-ignore
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const context: RecommendationContext = {};
      const availableProducts = [
        { id: 'prod-1', name: 'Wine 1', category: 'Red Wine', price: 50 },
      ];

      const result = await getProductRecommendations(
        'customer-123',
        context,
        availableProducts
      );

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));

      // @ts-ignore
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const context: RecommendationContext = {};
      const availableProducts = [
        { id: 'prod-1', name: 'Wine 1', category: 'Red Wine', price: 50 },
      ];

      await expect(
        getProductRecommendations('customer-123', context, availableProducts)
      ).rejects.toThrow('Failed to get AI recommendations');
    });
  });
});
