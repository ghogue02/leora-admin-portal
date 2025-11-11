/**
 * Image Extraction Service using OpenAI GPT-5 mini vision
 *
 * Extracts structured data from business cards and liquor licenses
 * using OpenAI's multimodal Responses API.
 *
 * Features:
 * - Business card extraction (name, title, company, contact info)
 * - Liquor license extraction (license #, expiry, business name)
 * - Structured JSON output (not text matching)
 * - Error handling and retry logic
 * - Integration with job queue for async processing
 */

import { PrismaClient } from '@prisma/client';
import { getOpenAIClient } from '@/lib/openai-client';

const prisma = new PrismaClient();
const IMAGE_EXTRACTION_MODEL = process.env.IMAGE_EXTRACTION_MODEL ?? 'gpt-5-mini';

/**
 * Extracted data from a business card
 */
export interface BusinessCardData {
  name: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
  confidence: number; // 0-1 scale
}

/**
 * Extracted data from a liquor license
 */
export interface LicenseData {
  licenseNumber: string;
  businessName: string;
  licenseType?: string;
  issuedDate?: string;
  expiryDate?: string;
  state?: string;
  address?: string;
  restrictions?: string;
  notes?: string;
  confidence: number; // 0-1 scale
}

async function runVisionRequest(imageUrl: string, prompt: string, maxOutputTokens = 900): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: IMAGE_EXTRACTION_MODEL,
    reasoning: { effort: 'low' },
    max_output_tokens: maxOutputTokens,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
          {
            type: 'input_image',
            image_url: imageUrl,
          },
        ],
      },
    ],
  });

  const text = (response.output_text ?? []).join('').trim();
  if (!text) {
    throw new Error('OpenAI returned an empty response');
  }

  return text;
}

const BUSINESS_CARD_PROMPT = `Analyze this business card image and extract all contact information.

Return a JSON object with the following structure:
{
  "name": "Full name on the card",
  "title": "Job title/position",
  "company": "Company name",
  "phone": "Phone number (formatted)",
  "email": "Email address",
  "address": "Physical address if shown",
  "website": "Website URL if shown",
  "notes": "Any additional relevant information",
  "confidence": 0.95
}

Guidelines:
- Use exact text from the card, don't invent information
- Format phone numbers as (XXX) XXX-XXXX if possible
- Set confidence based on image quality (0-1 scale)
- If a field is not visible, omit it or set to null
- Include any social media handles in notes
- Return ONLY the JSON object, no other text`;

const LICENSE_PROMPT = `Analyze this liquor license image and extract all license information.

Return a JSON object with the following structure:
{
  "licenseNumber": "License number/ID",
  "businessName": "Business/establishment name",
  "licenseType": "Type of license (e.g., On-Premises, Off-Premises, Wholesale)",
  "issuedDate": "Issue date (YYYY-MM-DD format if possible)",
  "expiryDate": "Expiration date (YYYY-MM-DD format if possible)",
  "state": "State/jurisdiction",
  "address": "Business address",
  "restrictions": "Any restrictions or conditions listed",
  "notes": "Any other relevant information",
  "confidence": 0.95
}

Guidelines:
- Use exact text from the license, don't invent information
- Format dates as YYYY-MM-DD when possible
- Set confidence based on image quality (0-1 scale)
- If a field is not visible, omit it or set to null
- Include permit classes, endorsements in notes
- Return ONLY the JSON object, no other text`;

/**
 * Extract business card information using OpenAI vision
 *
 * @param imageUrl - Public URL to the business card image
 * @returns Structured business card data
 *
 * @example
 * const data = await extractBusinessCard('https://example.com/card.jpg');
 * console.log(data.name, data.email);
 */
export async function extractBusinessCard(imageUrl: string): Promise<BusinessCardData> {
  try {
    const visionResponse = await runVisionRequest(imageUrl, BUSINESS_CARD_PROMPT, 900);

    // Parse JSON response
    const jsonMatch = visionResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI vision response');
    }

    const extractedData = JSON.parse(jsonMatch[0]) as BusinessCardData;

    // Validate required fields
    if (!extractedData.name) {
      throw new Error('Could not extract name from business card');
    }

    return extractedData;

  } catch (error) {
    console.error('Business card extraction failed:', error);
    throw new Error(
      error instanceof Error
        ? `Business card extraction failed: ${error.message}`
        : 'Business card extraction failed with unknown error'
    );
  }
}

/**
 * Extract liquor license information using OpenAI vision
 *
 * @param imageUrl - Public URL to the license image
 * @returns Structured license data
 *
 * @example
 * const data = await extractLiquorLicense('https://example.com/license.jpg');
 * console.log(data.licenseNumber, data.expiryDate);
 */
export async function extractLiquorLicense(imageUrl: string): Promise<LicenseData> {
  try {
    const visionResponse = await runVisionRequest(imageUrl, LICENSE_PROMPT, 900);

    const jsonMatch = visionResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI vision response');
    }

    const extractedData = JSON.parse(jsonMatch[0]) as LicenseData;

    // Validate required fields
    if (!extractedData.licenseNumber || !extractedData.businessName) {
      throw new Error('Could not extract required license information');
    }

    return extractedData;

  } catch (error) {
    console.error('License extraction failed:', error);
    throw new Error(
      error instanceof Error
        ? `License extraction failed: ${error.message}`
        : 'License extraction failed with unknown error'
    );
  }
}

/**
 * Process an image scan job (called by job queue)
 *
 * @param scanId - ImageScan record ID
 *
 * Updates the ImageScan record with:
 * - extractedData (structured JSON)
 * - status (completed or failed)
 * - completedAt timestamp
 * - errorMessage if failed
 */
export async function processImageScan(scanId: string): Promise<void> {
  try {
    // Get scan record
    const scan = await prisma.imageScan.findUnique({
      where: { id: scanId }
    });

    if (!scan) {
      throw new Error(`ImageScan ${scanId} not found`);
    }

    // Extract data based on scan type
    let extractedData: BusinessCardData | LicenseData;

    if (scan.scanType === 'business_card') {
      extractedData = await extractBusinessCard(scan.imageUrl);
    } else if (scan.scanType === 'liquor_license') {
      extractedData = await extractLiquorLicense(scan.imageUrl);
    } else {
      throw new Error(`Unknown scan type: ${scan.scanType}`);
    }

    // Update scan record with results
    await prisma.imageScan.update({
      where: { id: scanId },
      data: {
        extractedData: extractedData as any,
        status: 'completed',
        completedAt: new Date()
      }
    });

    console.log(`Successfully processed image scan ${scanId}`);

  } catch (error) {
    // Update scan record with error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.imageScan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date()
      }
    });

    console.error(`Failed to process image scan ${scanId}:`, errorMessage);
    throw error; // Re-throw for job queue retry logic
  }
}
