/**
 * Supabase Storage Service for Image Uploads
 *
 * Handles file uploads to Supabase Storage for image scanning.
 * Uses 'customer-scans' bucket with tenant-based organization.
 *
 * Features:
 * - Upload images to Supabase Storage
 * - Generate public URLs for Claude Vision
 * - Delete images when no longer needed
 * - Tenant-based file organization
 * - File size validation (5MB max)
 * - Automatic filename sanitization
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin access
);

const BUCKET_NAME = 'customer-scans';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload image to Supabase Storage
 *
 * @param file - File to upload
 * @param tenantId - Tenant ID for organization
 * @param scanType - Type of scan (business_card or liquor_license)
 * @returns Public URL to the uploaded file
 *
 * @throws Error if file is too large or upload fails
 *
 * @example
 * const url = await uploadImageToSupabase(file, tenantId, 'business_card');
 * console.log('Uploaded to:', url);
 */
export async function uploadImageToSupabase(
  file: File,
  tenantId: string,
  scanType: 'business_card' | 'liquor_license'
): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 5MB limit (size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Must be JPEG, PNG, or WebP`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${timestamp}-${sanitizedFilename}`;
  const filepath = `${tenantId}/${scanType}/${filename}`;

  try {
    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filepath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no path returned');
    }

    // Get public URL
    const publicUrl = getPublicUrl(data.path);

    console.log(`Uploaded ${file.name} to ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error(
      error instanceof Error
        ? `Upload failed: ${error.message}`
        : 'Upload failed with unknown error'
    );
  }
}

/**
 * Delete image from Supabase Storage
 *
 * @param imageUrl - Public URL of the image to delete
 *
 * @example
 * await deleteImage('https://...supabase.co/storage/v1/object/public/customer-scans/...');
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract filepath from URL
    const urlObj = new URL(imageUrl);
    const pathMatch = urlObj.pathname.match(/\/object\/public\/customer-scans\/(.*)/);

    if (!pathMatch || !pathMatch[1]) {
      throw new Error('Invalid image URL format');
    }

    const filepath = pathMatch[1];

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filepath]);

    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }

    console.log(`Deleted ${filepath}`);

  } catch (error) {
    console.error('Delete failed:', error);
    throw new Error(
      error instanceof Error
        ? `Delete failed: ${error.message}`
        : 'Delete failed with unknown error'
    );
  }
}

/**
 * Get public URL for a file in Supabase Storage
 *
 * @param filepath - Path within the bucket (e.g., "tenant-id/business_card/file.jpg")
 * @returns Public URL to access the file
 *
 * @example
 * const url = getPublicUrl('tenant-123/business_card/1234567890-card.jpg');
 */
export function getPublicUrl(filepath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filepath);

  if (!data?.publicUrl) {
    throw new Error('Failed to generate public URL');
  }

  return data.publicUrl;
}

/**
 * Initialize the customer-scans bucket
 *
 * Call this once during deployment to create the bucket.
 * Safe to call multiple times (will skip if bucket exists).
 *
 * @example
 * // Run during deployment:
 * await initializeStorageBucket();
 */
export async function initializeStorageBucket(): Promise<void> {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`Bucket '${BUCKET_NAME}' already exists`);
      return;
    }

    // Create bucket
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE
    });

    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }

    console.log(`Created bucket '${BUCKET_NAME}'`);

  } catch (error) {
    console.error('Bucket initialization failed:', error);
    throw error;
  }
}

/**
 * List all files in a tenant's scan directory
 *
 * @param tenantId - Tenant ID
 * @param scanType - Optional scan type filter
 * @returns Array of file paths
 */
export async function listTenantScans(
  tenantId: string,
  scanType?: 'business_card' | 'liquor_license'
): Promise<string[]> {
  try {
    const prefix = scanType ? `${tenantId}/${scanType}` : tenantId;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data?.map(file => `${prefix}/${file.name}`) || [];

  } catch (error) {
    console.error('List files failed:', error);
    throw error;
  }
}
