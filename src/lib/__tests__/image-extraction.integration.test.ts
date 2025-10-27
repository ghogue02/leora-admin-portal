import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import type { Database } from '@/types/supabase';

// Mock implementations
vi.mock('@supabase/supabase-js');
vi.mock('@anthropic-ai/sdk');

describe('Image Extraction Integration Tests', () => {
  let supabase: ReturnType<typeof createClient<Database>>;
  let anthropic: Anthropic;
  let mockImageBuffer: Buffer;

  beforeEach(() => {
    // Setup Supabase mock
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Setup Anthropic mock
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Create mock image buffer (1x1 PNG)
    mockImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Business Card Extraction', () => {
    it('should extract complete business card data accurately', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            name: 'John Smith',
            title: 'Sales Manager',
            company: 'Wine Distributors LLC',
            email: 'john.smith@winedist.com',
            phone: '555-123-4567',
            address: '123 Wine St, Napa, CA 94558',
            website: 'www.winedist.com'
          })
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      const result = await extractBusinessCard(mockImageBuffer);

      expect(result.name).toBe('John Smith');
      expect(result.email).toBe('john.smith@winedist.com');
      expect(result.phone).toBe('555-123-4567');
      expect(result.company).toBe('Wine Distributors LLC');
    });

    it('should handle partial data extraction gracefully', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            name: 'Jane Doe',
            email: 'jane@example.com'
            // Missing: phone, company, address
          })
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      const result = await extractBusinessCard(mockImageBuffer);

      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
      expect(result.phone).toBeUndefined();
      expect(result.company).toBeUndefined();
    });

    it('should handle invalid image format', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(extractBusinessCard(invalidBuffer)).rejects.toThrow();
    });

    it('should retry on Claude API errors', async () => {
      vi.mocked(anthropic.messages.create)
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ name: 'Success After Retry' })
          }]
        } as any);

      const result = await extractBusinessCard(mockImageBuffer, { maxRetries: 3 });

      expect(result.name).toBe('Success After Retry');
      expect(anthropic.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should validate and parse JSON response correctly', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: '{"name": "Test", "email": "test@example.com"}'
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      const result = await extractBusinessCard(mockImageBuffer);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
    });

    it('should handle malformed JSON in Claude response', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: 'This is not valid JSON { name: broken'
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      await expect(extractBusinessCard(mockImageBuffer)).rejects.toThrow('Invalid JSON');
    });

    it('should process async job queue correctly', async () => {
      const scanId = 'scan_123';

      // Create scan record
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: scanId, status: 'pending' },
          error: null
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: scanId, status: 'completed' },
          error: null
        })
      } as any);

      // Enqueue job
      const job = await enqueueImageScan(scanId, mockImageBuffer);
      expect(job.id).toBe(scanId);
      expect(job.status).toBe('pending');

      // Process job
      await processImageScanJob(scanId);

      // Check status
      const status = await getImageScanStatus(scanId);
      expect(status).toBe('completed');
    });

    it('should handle concurrent scan processing', async () => {
      const scanIds = Array.from({ length: 10 }, (_, i) => `scan_${i}`);

      const promises = scanIds.map(id =>
        processImageScanJob(id)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.status).toBe('completed');
      });
    });
  });

  describe('License Extraction', () => {
    it('should extract liquor license data accurately', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            licenseNumber: 'ABC-123-456',
            businessName: 'Main Street Liquor',
            licenseType: 'Type 21 - Off-Sale General',
            expirationDate: '2025-12-31',
            address: '456 Main St, San Francisco, CA 94102',
            restrictions: ['No sales after 2 AM']
          })
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      const result = await extractLicense(mockImageBuffer);

      expect(result.licenseNumber).toBe('ABC-123-456');
      expect(result.businessName).toBe('Main Street Liquor');
      expect(result.licenseType).toContain('Type 21');
    });

    it('should validate license expiration date format', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            licenseNumber: 'ABC-789',
            expirationDate: '12/31/2025' // Should normalize to ISO format
          })
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      const result = await extractLicense(mockImageBuffer);

      expect(result.expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should flag expired licenses', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            licenseNumber: 'ABC-OLD',
            expirationDate: '2020-01-01'
          })
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      const result = await extractLicense(mockImageBuffer);

      expect(result.isExpired).toBe(true);
      expect(result.warnings).toContain('License has expired');
    });
  });

  describe('Error Handling', () => {
    it('should handle Claude API timeout', async () => {
      vi.mocked(anthropic.messages.create).mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(extractBusinessCard(mockImageBuffer, { timeout: 50 }))
        .rejects.toThrow('Timeout');
    });

    it('should handle Claude API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      vi.mocked(anthropic.messages.create).mockRejectedValue(rateLimitError);

      await expect(extractBusinessCard(mockImageBuffer))
        .rejects.toThrow('Rate limit');
    });

    it('should handle invalid API key', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;

      vi.mocked(anthropic.messages.create).mockRejectedValue(authError);

      await expect(extractBusinessCard(mockImageBuffer))
        .rejects.toThrow('Invalid API key');
    });

    it('should handle file size too large', async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB

      await expect(extractBusinessCard(largeBuffer))
        .rejects.toThrow('File size exceeds maximum');
    });
  });

  describe('Performance', () => {
    it('should extract data within 10 seconds', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ name: 'Fast Extraction' })
        }]
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue(mockResponse as any);

      const start = Date.now();
      await extractBusinessCard(mockImageBuffer);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000);
    });

    it('should handle batch processing efficiently', async () => {
      const images = Array.from({ length: 5 }, () => mockImageBuffer);

      const start = Date.now();
      await Promise.all(images.map(img => extractBusinessCard(img)));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(15000); // 5 images in <15s
    });
  });
});

// Helper functions (would be imported from actual implementation)
async function extractBusinessCard(
  imageBuffer: Buffer,
  options?: { maxRetries?: number; timeout?: number }
): Promise<any> {
  // Implementation placeholder
  throw new Error('Not implemented');
}

async function extractLicense(imageBuffer: Buffer): Promise<any> {
  // Implementation placeholder
  throw new Error('Not implemented');
}

async function enqueueImageScan(scanId: string, imageBuffer: Buffer): Promise<any> {
  // Implementation placeholder
  throw new Error('Not implemented');
}

async function processImageScanJob(scanId: string): Promise<any> {
  // Implementation placeholder
  throw new Error('Not implemented');
}

async function getImageScanStatus(scanId: string): Promise<string> {
  // Implementation placeholder
  throw new Error('Not implemented');
}
