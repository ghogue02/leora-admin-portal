// Supabase Storage integration for images and attachments

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export class SupabaseStorage {
  private bucketName: string;

  constructor(bucketName: string = 'customer-documents') {
    this.bucketName = bucketName;
  }

  /**
   * Upload base64 image to Supabase Storage
   */
  async uploadBase64Image(
    base64Data: string,
    fileName: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      // Convert base64 to blob
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();

      return await this.uploadBlob(blob, fileName, folder);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload blob/file to Supabase Storage
   */
  async uploadBlob(
    blob: Blob,
    fileName: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      // Generate unique file name
      const timestamp = Date.now();
      const sanitizedName = fileName.replace(/[^a-z0-9.-]/gi, '_');
      const path = folder
        ? `${folder}/${timestamp}-${sanitizedName}`
        : `${timestamp}-${sanitizedName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(path, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(this.bucketName).getPublicUrl(path);

      return {
        success: true,
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(this.bucketName).remove([path]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from(this.bucketName).getPublicUrl(path);

    return publicUrl;
  }

  /**
   * List files in a folder
   */
  async listFiles(folder?: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folder || '', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        throw error;
      }

      return data.map((file) => file.name);
    } catch (error) {
      console.error('List files failed:', error);
      return [];
    }
  }

  /**
   * Create storage bucket if it doesn't exist
   */
  async ensureBucket(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.getBucket(this.bucketName);

      if (error && error.message.includes('not found')) {
        // Create bucket
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        });

        if (createError) {
          throw createError;
        }

        return true;
      }

      return !!data;
    } catch (error) {
      console.error('Bucket creation failed:', error);
      return false;
    }
  }
}

// Default instance for customer documents
export const customerStorage = new SupabaseStorage('customer-documents');

// Helper function to upload business card image
export async function uploadBusinessCard(
  imageData: string,
  customerId: string
): Promise<UploadResult> {
  return customerStorage.uploadBase64Image(
    imageData,
    'business-card.jpg',
    `customers/${customerId}/cards`
  );
}

// Helper function to upload license image
export async function uploadLicenseImage(
  imageData: string,
  customerId: string
): Promise<UploadResult> {
  return customerStorage.uploadBase64Image(
    imageData,
    'license.jpg',
    `customers/${customerId}/licenses`
  );
}
