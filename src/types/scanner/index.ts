// Scanner types for business cards and licenses

export interface BusinessCardData {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  title?: string;
  rawText?: string;
}

export interface LicenseData {
  licenseNumber: string;
  businessName?: string;
  address?: string;
  expirationDate?: string;
  issueDate?: string;
  licenseType?: string;
  rawText?: string;
}

export interface ScanResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number;
  imageUrl?: string;
}

export interface CameraConfig {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
  aspectRatio?: number;
}

export interface OCRConfig {
  provider: 'tesseract' | 'google-vision' | 'aws-textract';
  apiKey?: string;
  language?: string;
  imageFormat?: 'base64' | 'blob' | 'url';
}

export interface ImageTransform {
  rotation: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  brightness?: number;
  contrast?: number;
}
