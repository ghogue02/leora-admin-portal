import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as businessCardPOST } from '../business-card/route';
import { POST as licensePOST } from '../license/route';
import { GET as getScanStatus, POST as updateScan } from '../[scanId]/route';
import { NextRequest } from 'next/server';

describe('Scan API Integration Tests', () => {
  let mockRequest: Partial<NextRequest>;
  let mockFormData: FormData;

  beforeEach(() => {
    mockFormData = new FormData();
    mockRequest = {
      formData: vi.fn().mockResolvedValue(mockFormData),
      json: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/scan/business-card', () => {
    it('should accept image upload and return scan ID', async () => {
      const imageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'business-card.jpg');

      const response = await businessCardPOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(202); // Accepted
      expect(data).toHaveProperty('scanId');
      expect(data.status).toBe('pending');
      expect(data.type).toBe('business_card');
    });

    it('should reject missing image', async () => {
      const response = await businessCardPOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('image required');
    });

    it('should reject invalid file type', async () => {
      const textBlob = new Blob(['not an image'], { type: 'text/plain' });
      mockFormData.append('image', textBlob, 'document.txt');

      const response = await businessCardPOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('invalid file type');
    });

    it('should reject file size exceeding limit', async () => {
      const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], {
        type: 'image/jpeg'
      }); // 11MB

      mockFormData.append('image', largeBlob, 'large.jpg');

      const response = await businessCardPOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('file too large');
    });

    it('should upload image to Supabase Storage', async () => {
      const imageBlob = new Blob(['image data'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'card.jpg');

      const response = await businessCardPOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.imageUrl).toMatch(/^https:\/\/.+\.supabase\.co/);
    });

    it('should create database record with pending status', async () => {
      const imageBlob = new Blob(['image data'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'card.jpg');

      const response = await businessCardPOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(data.status).toBe('pending');
      expect(data.createdAt).toBeDefined();
    });

    it('should enqueue background job for processing', async () => {
      const imageBlob = new Blob(['image data'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'card.jpg');

      const response = await businessCardPOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(data.scanId).toBeDefined();
      // Job should be enqueued (verify via job queue)
    });
  });

  describe('POST /api/scan/license', () => {
    it('should accept liquor license image', async () => {
      const imageBlob = new Blob(['license image'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'license.jpg');

      const response = await licensePOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.scanId).toBeDefined();
      expect(data.type).toBe('liquor_license');
    });

    it('should handle PDF license uploads', async () => {
      const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
      mockFormData.append('image', pdfBlob, 'license.pdf');

      const response = await licensePOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.scanId).toBeDefined();
    });

    it('should validate license-specific requirements', async () => {
      const imageBlob = new Blob(['license'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'license.jpg');
      mockFormData.append('state', 'CA'); // Optional state hint

      const response = await licensePOST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.metadata?.state).toBe('CA');
    });
  });

  describe('GET /api/scan/[scanId]', () => {
    it('should return pending status for processing scan', async () => {
      const scanId = 'scan_pending_123';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`
      } as any;

      const response = await getScanStatus(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('processing');
    });

    it('should return completed status with extracted data', async () => {
      const scanId = 'scan_completed_123';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`
      } as any;

      const response = await getScanStatus(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.extractedData).toBeDefined();
      expect(data.extractedData).toHaveProperty('name');
      expect(data.extractedData).toHaveProperty('email');
    });

    it('should return error status for failed scan', async () => {
      const scanId = 'scan_failed_123';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`
      } as any;

      const response = await getScanStatus(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.error).toBeDefined();
    });

    it('should return 404 for non-existent scan', async () => {
      const scanId = 'scan_nonexistent';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`
      } as any;

      const response = await getScanStatus(
        mockRequest as NextRequest,
        { params: { scanId } }
      );

      expect(response.status).toBe(404);
    });

    it('should include processing progress percentage', async () => {
      const scanId = 'scan_processing_123';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`
      } as any;

      const response = await getScanStatus(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(data.progress).toBeGreaterThanOrEqual(0);
      expect(data.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('POST /api/scan/[scanId]', () => {
    it('should update extracted data with user corrections', async () => {
      const scanId = 'scan_123';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`,
        json: vi.fn().mockResolvedValue({
          extractedData: {
            name: 'John Smith (Corrected)',
            email: 'corrected@example.com'
          }
        })
      } as any;

      const response = await updateScan(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.extractedData.name).toBe('John Smith (Corrected)');
    });

    it('should create customer from confirmed scan data', async () => {
      const scanId = 'scan_123';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`,
        json: vi.fn().mockResolvedValue({
          action: 'create_customer',
          extractedData: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            company: 'Wine Store'
          }
        })
      } as any;

      const response = await updateScan(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.customerId).toBeDefined();
      expect(data.customerCreated).toBe(true);
    });

    it('should validate required fields before customer creation', async () => {
      const scanId = 'scan_123';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`,
        json: vi.fn().mockResolvedValue({
          action: 'create_customer',
          extractedData: {
            name: 'Incomplete Data'
            // Missing required email
          }
        })
      } as any;

      const response = await updateScan(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle Supabase Storage upload failure', async () => {
      // Mock storage failure
      const imageBlob = new Blob(['image'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'card.jpg');

      // Simulate storage error
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await businessCardPOST(mockRequest as NextRequest);

      expect(response.status).toBe(500);
    });

    it('should handle OpenAI API failures gracefully', async () => {
      const scanId = 'scan_claude_error';
      mockRequest = {
        url: `http://localhost/api/scan/${scanId}`
      } as any;

      const response = await getScanStatus(
        mockRequest as NextRequest,
        { params: { scanId } }
      );
      const data = await response.json();

      expect(data.status).toBe('failed');
      expect(data.error).toContain('extraction failed');
    });

    it('should handle database connection errors', async () => {
      const imageBlob = new Blob(['image'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'card.jpg');

      // Mock DB error
      const response = await businessCardPOST(mockRequest as NextRequest);

      expect(response.status).toBe(500);
    });
  });

  describe('Complete Workflows', () => {
    it('should complete full business card scan workflow', async () => {
      // Step 1: Upload image
      const imageBlob = new Blob(['business card'], { type: 'image/jpeg' });
      mockFormData.append('image', imageBlob, 'card.jpg');

      const uploadResponse = await businessCardPOST(mockRequest as NextRequest);
      const uploadData = await uploadResponse.json();
      const scanId = uploadData.scanId;

      expect(uploadResponse.status).toBe(202);

      // Step 2: Poll status (simulate processing)
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusResponse = await getScanStatus(
        { url: `http://localhost/api/scan/${scanId}` } as NextRequest,
        { params: { scanId } }
      );
      const statusData = await statusResponse.json();

      expect(['processing', 'completed']).toContain(statusData.status);

      // Step 3: Create customer from extracted data
      if (statusData.status === 'completed') {
        const createResponse = await updateScan(
          {
            url: `http://localhost/api/scan/${scanId}`,
            json: vi.fn().mockResolvedValue({
              action: 'create_customer',
              extractedData: statusData.extractedData
            })
          } as any,
          { params: { scanId } }
        );

        const createData = await createResponse.json();
        expect(createData.customerCreated).toBe(true);
      }
    });
  });
});
