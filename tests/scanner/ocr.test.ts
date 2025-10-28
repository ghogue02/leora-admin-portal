import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TesseractOCR } from '@/lib/ocr/tesseract';

describe('OCR Processing', () => {
  let ocr: TesseractOCR;

  beforeAll(async () => {
    ocr = new TesseractOCR();
    await ocr.initialize();
  });

  afterAll(async () => {
    await ocr.terminate();
  });

  describe('Business Card Parsing', () => {
    it('should extract email from business card text', () => {
      const text = `
        John Doe
        Senior Sales Manager
        ACME Corporation
        john.doe@acme.com
        (555) 123-4567
        123 Main St, New York, NY 10001
      `;

      const result = ocr.parseBusinessCard(text);

      expect(result.email).toBe('john.doe@acme.com');
      expect(result.contactName).toBe('John Doe');
    });

    it('should extract phone number in various formats', () => {
      const formats = [
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '5551234567',
        '+1 555-123-4567',
      ];

      formats.forEach((phone) => {
        const text = `John Doe\n${phone}`;
        const result = ocr.parseBusinessCard(text);

        expect(result.phone).toBeDefined();
        expect(result.phone?.replace(/\D/g, '')).toMatch(/^1?5551234567$/);
      });
    });

    it('should extract company name with various suffixes', () => {
      const companies = [
        'ACME Corp.',
        'Tech Solutions Inc',
        'Global Services LLC',
        'Enterprises Limited',
        'Trading Company',
      ];

      companies.forEach((company) => {
        const text = `John Doe\nCEO\n${company}`;
        const result = ocr.parseBusinessCard(text);

        expect(result.companyName).toContain(company.split(' ')[0]);
      });
    });

    it('should extract website URL', () => {
      const text = `
        John Doe
        www.acme.com
        john@acme.com
      `;

      const result = ocr.parseBusinessCard(text);

      expect(result.website).toBe('www.acme.com');
    });

    it('should extract address with zip code', () => {
      const text = `
        John Doe
        ACME Corp
        123 Main Street
        New York, NY 10001
      `;

      const result = ocr.parseBusinessCard(text);

      expect(result.address).toContain('10001');
    });

    it('should handle missing fields gracefully', () => {
      const text = 'John Doe';
      const result = ocr.parseBusinessCard(text);

      expect(result.contactName).toBe('John Doe');
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it('should calculate confidence score', () => {
      const completeText = `
        John Doe
        CEO
        ACME Corporation
        john.doe@acme.com
        (555) 123-4567
      `;

      const incompleteText = 'John Doe';

      const completeResult = ocr.parseBusinessCard(completeText);
      const incompleteResult = ocr.parseBusinessCard(incompleteText);

      // Complete data should have higher confidence
      expect(
        ocr['calculateConfidence'](completeResult)
      ).toBeGreaterThan(
        ocr['calculateConfidence'](incompleteResult)
      );
    });
  });

  describe('License Parsing', () => {
    it('should extract license number in standard format', () => {
      const text = `
        State Liquor License
        License #: ABC-123456
        Business: Joe's Bar & Grill
        Expires: 12/31/2025
      `;

      const result = ocr.parseLicense(text);

      expect(result).toBeDefined();
      expect(result?.licenseNumber).toBe('ABC-123456');
    });

    it('should extract license number with state prefix', () => {
      const formats = [
        'CA-12345678',
        'NY 98765432',
        'TX-456789',
      ];

      formats.forEach((licenseNum) => {
        const text = `License: ${licenseNum}`;
        const result = ocr.parseLicense(text);

        expect(result).toBeDefined();
        expect(result?.licenseNumber).toBeDefined();
      });
    });

    it('should extract numeric-only license numbers', () => {
      const text = 'License Number: 123456789';
      const result = ocr.parseLicense(text);

      expect(result).toBeDefined();
      expect(result?.licenseNumber).toBe('123456789');
    });

    it('should extract expiration date', () => {
      const text = `
        License: ABC-123
        Expiration Date: 12/31/2025
      `;

      const result = ocr.parseLicense(text);

      expect(result).toBeDefined();
      expect(result?.expirationDate).toContain('12/31/2025');
    });

    it('should extract business name', () => {
      const text = `
        License: ABC-123
        Issued to: Main Street Liquors LLC
        Valid Until: 12/31/2025
      `;

      const result = ocr.parseLicense(text);

      expect(result).toBeDefined();
      expect(result?.businessName).toContain('Liquors');
    });

    it('should extract license type', () => {
      const text = `
        License: ABC-123
        Type: On-Premises
        Category: Retail
      `;

      const result = ocr.parseLicense(text);

      expect(result).toBeDefined();
      expect(result?.licenseType).toBeDefined();
    });

    it('should return null for invalid license text', () => {
      const text = 'This is just random text';
      const result = ocr.parseLicense(text);

      expect(result).toBeNull();
    });

    it('should handle multiple license number patterns', () => {
      const patterns = [
        'License #: ABC-123456',
        'Lic No. XYZ789',
        'L 456-789-012',
      ];

      patterns.forEach((pattern) => {
        const result = ocr.parseLicense(pattern);
        expect(result).toBeDefined();
        expect(result?.licenseNumber).toBeDefined();
      });
    });
  });

  describe('Field Extraction Edge Cases', () => {
    it('should handle multiple email addresses', () => {
      const text = `
        John Doe
        john.doe@acme.com
        info@acme.com
      `;

      const result = ocr.parseBusinessCard(text);

      // Should extract the first email
      expect(result.email).toBe('john.doe@acme.com');
    });

    it('should handle mixed case emails', () => {
      const text = 'John.Doe@ACME.COM';
      const result = ocr.parseBusinessCard(text);

      expect(result.email).toBe('john.doe@acme.com');
    });

    it('should ignore non-email text with @ symbol', () => {
      const text = 'Contact us @ our office';
      const result = ocr.parseBusinessCard(text);

      expect(result.email).toBeUndefined();
    });

    it('should handle international phone formats', () => {
      const text = '+1-555-123-4567';
      const result = ocr.parseBusinessCard(text);

      expect(result.phone).toBeDefined();
    });

    it('should handle messy OCR text', () => {
      const text = `
        J0hn  D0e
        j0hn.d0e@acme.c0m
        (555) l23-4567
      `;

      const result = ocr.parseBusinessCard(text);

      // Should still extract recognizable patterns
      expect(result.contactName).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should return 1.0 for complete business card', () => {
      const data = {
        contactName: 'John Doe',
        email: 'john@acme.com',
        phone: '5551234567',
        companyName: 'ACME Corp',
        rawText: 'Complete card',
      };

      const confidence = ocr['calculateConfidence'](data);

      expect(confidence).toBe(1.0);
    });

    it('should return lower confidence for missing email', () => {
      const data = {
        contactName: 'John Doe',
        phone: '5551234567',
        companyName: 'ACME Corp',
        rawText: 'No email',
      };

      const confidence = ocr['calculateConfidence'](data);

      expect(confidence).toBeLessThan(1.0);
      expect(confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should return 0.2 for name only', () => {
      const data = {
        contactName: 'John Doe',
        rawText: 'Name only',
      };

      const confidence = ocr['calculateConfidence'](data);

      expect(confidence).toBe(0.2);
    });
  });
});
