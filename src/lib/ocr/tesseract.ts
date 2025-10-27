// Tesseract.js OCR integration for client-side processing

import Tesseract from 'tesseract.js';
import type { BusinessCardData, LicenseData, ScanResult } from '@/types/scanner';

export class TesseractOCR {
  private worker: Tesseract.Worker | null = null;

  async initialize(): Promise<void> {
    if (this.worker) return;

    this.worker = await Tesseract.createWorker({
      logger: (m) => console.log('OCR:', m),
    });

    await this.worker.loadLanguage('eng');
    await this.worker.initialize('eng');
  }

  async recognize(imageData: string | File | Blob): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }

    const { data: { text } } = await this.worker!.recognize(imageData);
    return text;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  // Parse business card text
  parseBusinessCard(text: string): BusinessCardData {
    const lines = text.split('\n').filter(line => line.trim());
    const data: BusinessCardData = { rawText: text };

    // Email detection
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/gi;
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) {
      data.email = emails[0].toLowerCase();
    }

    // Phone detection (various formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      data.phone = phoneMatch[0].replace(/\D/g, '');
    }

    // URL detection
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w+/gi;
    const urls = text.match(urlRegex);
    if (urls && urls.length > 0) {
      data.website = urls[0];
    }

    // Name heuristic: Usually first substantial line
    if (lines.length > 0) {
      data.contactName = lines[0].trim();
    }

    // Title heuristic: Often second line
    if (lines.length > 1) {
      const secondLine = lines[1].trim();
      // Check if it's not an email or phone
      if (!emailRegex.test(secondLine) && !phoneRegex.test(secondLine)) {
        data.title = secondLine;
      }
    }

    // Company name heuristic: Look for "Inc", "LLC", "Corp", etc.
    const companyRegex = /(.*?(?:Inc|LLC|Corp|Corporation|Company|Co\.|Ltd|Limited)\.?)/i;
    const companyMatch = text.match(companyRegex);
    if (companyMatch) {
      data.companyName = companyMatch[1].trim();
    }

    // Address heuristic: Look for zip code pattern
    const addressRegex = /\d{5}(?:-\d{4})?/;
    const addressMatch = text.match(addressRegex);
    if (addressMatch) {
      const zipIndex = text.indexOf(addressMatch[0]);
      const addressLines = text.substring(0, zipIndex + addressMatch[0].length);
      const addressStart = addressLines.lastIndexOf('\n', zipIndex - addressMatch[0].length - 1);
      data.address = addressLines.substring(addressStart).trim();
    }

    return data;
  }

  // Parse license placard text
  parseLicense(text: string): LicenseData | null {
    const data: Partial<LicenseData> = { rawText: text };

    // License number patterns (varies by state)
    const licensePatterns = [
      /(?:License|Lic|L)[\s#:]+([A-Z0-9-]{5,20})/i,
      /\b([A-Z]{2,3}[-\s]?\d{4,10})\b/,
      /\b(\d{6,12})\b/,
    ];

    for (const pattern of licensePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.licenseNumber = match[1].replace(/\s+/g, '');
        break;
      }
    }

    if (!data.licenseNumber) {
      return null;
    }

    // Date patterns
    const dateRegex = /(?:Exp|Expiration|Valid Until|Expires?)[\s:]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      data.expirationDate = dateMatch[1];
    }

    // Business name
    const businessRegex = /(.*?(?:Inc|LLC|Corp|Corporation|Company|Co\.|Ltd|Limited|Bar|Restaurant|Liquor Store)\.?)/i;
    const businessMatch = text.match(businessRegex);
    if (businessMatch) {
      data.businessName = businessMatch[1].trim();
    }

    // License type
    const typeRegex = /(?:Type|Class|Category)[\s:]+([A-Z0-9-]+)/i;
    const typeMatch = text.match(typeRegex);
    if (typeMatch) {
      data.licenseType = typeMatch[1];
    }

    return data as LicenseData;
  }

  async scanBusinessCard(imageData: string | File | Blob): Promise<ScanResult<BusinessCardData>> {
    try {
      const text = await this.recognize(imageData);
      const data = this.parseBusinessCard(text);

      return {
        success: true,
        data,
        confidence: this.calculateConfidence(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR failed',
      };
    }
  }

  async scanLicense(imageData: string | File | Blob): Promise<ScanResult<LicenseData>> {
    try {
      const text = await this.recognize(imageData);
      const data = this.parseLicense(text);

      if (!data) {
        return {
          success: false,
          error: 'Could not extract license number',
        };
      }

      return {
        success: true,
        data,
        confidence: data.licenseNumber ? 0.8 : 0.3,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR failed',
      };
    }
  }

  private calculateConfidence(data: BusinessCardData): number {
    let score = 0;
    if (data.email) score += 0.3;
    if (data.phone) score += 0.3;
    if (data.contactName) score += 0.2;
    if (data.companyName) score += 0.2;
    return Math.min(score, 1.0);
  }
}

export const tesseractOCR = new TesseractOCR();
