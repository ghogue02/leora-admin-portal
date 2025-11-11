/**
 * Unit Tests for Image Extraction Service
 *
 * Tests OpenAI vision integration with mocked API calls.
 * Validates business card and license extraction logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BusinessCardData, LicenseData } from '../image-extraction';

const mockResponsesCreate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/openai-client', () => ({
  getOpenAIClient: () => ({
    responses: {
      create: mockResponsesCreate,
    },
  }),
}));

// Mock Prisma
const mockPrismaUpdate = vi.hoisted(() => vi.fn());
const mockPrismaFindUnique = vi.hoisted(() => vi.fn());
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    imageScan: {
      update: mockPrismaUpdate,
      findUnique: mockPrismaFindUnique
    }
  }))
}));

// Import after mocks
import { extractBusinessCard, extractLiquorLicense, processImageScan } from '../image-extraction';

describe('Image Extraction Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsesCreate.mockReset();
  });

  describe('extractBusinessCard', () => {
    it('should extract business card data successfully', async () => {
      // Mock OpenAI vision response
      const mockResponse = {
        output_text: [
          JSON.stringify({
            name: 'John Smith',
            title: 'Sales Director',
            company: 'Wine Co',
            phone: '(555) 123-4567',
            email: 'john@wineco.com',
            address: '123 Main St, NY',
            website: 'www.wineco.com',
            confidence: 0.95
          })
        ]
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      const result = await extractBusinessCard('https://example.com/card.jpg');

      expect(result).toMatchObject({
        name: 'John Smith',
        title: 'Sales Director',
        company: 'Wine Co',
        email: 'john@wineco.com'
      });
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini',
          max_output_tokens: 900
        })
      );
    });

    it('should throw error if name is missing', async () => {
      const mockResponse = {
        output_text: [
          JSON.stringify({
            company: 'Wine Co',
            email: 'info@wineco.com',
            confidence: 0.7
          })
        ]
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      await expect(
        extractBusinessCard('https://example.com/card.jpg')
      ).rejects.toThrow('Could not extract name');
    });

    it('should throw error if JSON parsing fails', async () => {
      const mockResponse = {
        output_text: ['Invalid JSON response']
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      await expect(
        extractBusinessCard('https://example.com/card.jpg')
      ).rejects.toThrow('No JSON found');
    });

    it('should handle OpenAI API errors', async () => {
      mockResponsesCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(
        extractBusinessCard('https://example.com/card.jpg')
      ).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('extractLiquorLicense', () => {
    it('should extract license data successfully', async () => {
      const mockResponse = {
        output_text: [
          JSON.stringify({
            licenseNumber: 'ABC-123456',
            businessName: 'Best Liquor Store',
            licenseType: 'Off-Premises',
            issuedDate: '2024-01-15',
            expiryDate: '2025-01-14',
            state: 'NY',
            address: '456 Oak Ave, New York, NY',
            restrictions: 'No Sunday sales',
            confidence: 0.92
          })
        ]
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      const result = await extractLiquorLicense('https://example.com/license.jpg');

      expect(result).toMatchObject({
        licenseNumber: 'ABC-123456',
        businessName: 'Best Liquor Store',
        licenseType: 'Off-Premises'
      });
      expect(result.expiryDate).toBe('2025-01-14');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should throw error if required fields are missing', async () => {
      const mockResponse = {
        output_text: [
          JSON.stringify({
            licenseType: 'Off-Premises',
            state: 'NY',
            confidence: 0.6
          })
        ]
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      await expect(
        extractLiquorLicense('https://example.com/license.jpg')
      ).rejects.toThrow('Could not extract required license information');
    });

    it('should handle malformed response', async () => {
      const mockResponse = {
        output: [
          {
            type: 'message',
            content: [],
          },
        ],
        output_text: [],
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      await expect(
        extractLiquorLicense('https://example.com/license.jpg')
      ).rejects.toThrow('OpenAI returned an empty response');
    });
  });

  describe('processImageScan', () => {
    it('should process business card scan successfully', async () => {
      const mockScan = {
        id: 'scan-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        imageUrl: 'https://example.com/card.jpg',
        scanType: 'business_card',
        status: 'processing',
        extractedData: {}
      };

      const mockExtractedData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        confidence: 0.95
      };

      mockPrismaFindUnique.mockResolvedValue(mockScan);
      mockResponsesCreate.mockResolvedValue({
        output_text: [JSON.stringify(mockExtractedData)],
      });
      mockPrismaUpdate.mockResolvedValue({});

      await processImageScan('scan-123');

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'scan-123' },
        data: expect.objectContaining({
          status: 'completed',
          extractedData: expect.any(Object)
        })
      });
    });

    it('should process license scan successfully', async () => {
      const mockScan = {
        id: 'scan-456',
        tenantId: 'tenant-1',
        userId: 'user-1',
        imageUrl: 'https://example.com/license.jpg',
        scanType: 'liquor_license',
        status: 'processing',
        extractedData: {}
      };

      const mockExtractedData = {
        licenseNumber: 'XYZ-789',
        businessName: 'Wine Shop',
        confidence: 0.9
      };

      mockPrismaFindUnique.mockResolvedValue(mockScan);
      mockResponsesCreate.mockResolvedValue({
        output_text: [JSON.stringify(mockExtractedData)],
      });
      mockPrismaUpdate.mockResolvedValue({});

      await processImageScan('scan-456');

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'scan-456' },
        data: expect.objectContaining({
          status: 'completed'
        })
      });
    });

    it('should handle extraction failure and update status', async () => {
      const mockScan = {
        id: 'scan-789',
        imageUrl: 'https://example.com/card.jpg',
        scanType: 'business_card'
      };

      mockPrismaFindUnique.mockResolvedValue(mockScan);
      mockResponsesCreate.mockRejectedValue(new Error('Extraction failed'));

      await expect(processImageScan('scan-789')).rejects.toThrow();

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'scan-789' },
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: expect.stringContaining('Extraction failed')
        })
      });
    });

    it('should throw error if scan not found', async () => {
      mockPrismaFindUnique.mockResolvedValue(null);

      await expect(processImageScan('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw error for unknown scan type', async () => {
      const mockScan = {
        id: 'scan-999',
        imageUrl: 'https://example.com/unknown.jpg',
        scanType: 'unknown_type'
      };

      mockPrismaFindUnique.mockResolvedValue(mockScan);

      await expect(processImageScan('scan-999')).rejects.toThrow('Unknown scan type');
    });
  });

  describe('Edge Cases', () => {
    it('should handle low confidence scores', async () => {
      const mockResponse = {
        output_text: [
          JSON.stringify({
            name: 'Blurry Name',
            email: 'unclear@example.com',
            confidence: 0.4
          })
        ]
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      const result = await extractBusinessCard('https://example.com/blurry.jpg');

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.name).toBe('Blurry Name');
    });

    it('should handle partial data extraction', async () => {
      const mockResponse = {
        output_text: [
          JSON.stringify({
            name: 'John Partial',
            confidence: 0.85
          })
        ]
      };

      mockResponsesCreate.mockResolvedValue(mockResponse);

      const result = await extractBusinessCard('https://example.com/partial.jpg');

      expect(result.name).toBe('John Partial');
      expect(result.email).toBeUndefined();
      expect(result.company).toBeUndefined();
    });
  });
});
