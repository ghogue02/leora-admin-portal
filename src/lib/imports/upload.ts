"use server";

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const IMPORTS_BUCKET = process.env.IMPORTS_BUCKET ?? "data-imports";
const IMPORT_MAX_BYTES = Number(process.env.IMPORT_MAX_FILE_SIZE ?? 50 * 1024 * 1024); // 50MB default

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL must be set to upload import files.");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set to upload import files.");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

let bucketReadyPromise: Promise<void> | null = null;

async function ensureBucketReady() {
  if (bucketReadyPromise) {
    return bucketReadyPromise;
  }

  bucketReadyPromise = (async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      throw new Error(`Failed to list storage buckets: ${error.message}`);
    }

    const exists = buckets?.some((bucket) => bucket.name === IMPORTS_BUCKET);
    if (exists) {
      return;
    }

    const { error: bucketError } = await supabase.storage.createBucket(IMPORTS_BUCKET, {
      public: false,
      fileSizeLimit: IMPORT_MAX_BYTES,
    });
    if (bucketError) {
      throw new Error(`Failed to create storage bucket "${IMPORTS_BUCKET}": ${bucketError.message}`);
    }
  })().catch((error) => {
    bucketReadyPromise = null;
    throw error;
  });

  return bucketReadyPromise;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9.\-_]+/gi, "_").slice(-200);
}

export type UploadedImportFile = {
  fileKey: string;
  checksum: string;
  size: number;
  contentType: string;
  downloadUrl: string | null;
};

export async function uploadImportFile(file: File, tenantId: string): Promise<UploadedImportFile> {
  if (!tenantId) {
    throw new Error("Tenant ID is required for file uploads.");
  }

  if (file.size === 0) {
    throw new Error("File is empty.");
  }

  if (file.size > IMPORT_MAX_BYTES) {
    const maxMb = (IMPORT_MAX_BYTES / 1024 / 1024).toFixed(1);
    throw new Error(`File is too large. Maximum allowed size is ${maxMb}MB.`);
  }

  await ensureBucketReady();

  const allowedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
    "text/plain",
  ];

  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const timestamp = Date.now();
  const filename = sanitizeFilename(file.name || "upload.csv");
  const path = `${tenantId}/imports/${timestamp}-${checksum.slice(0, 8)}-${filename}`;

  const { error: uploadError } = await supabase.storage.from(IMPORTS_BUCKET).upload(path, buffer, {
    contentType: file.type || "text/csv",
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(IMPORTS_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1 hour temporary URL for UI reference

  if (signedUrlError) {
    // Continue without signed URL; file is stored and referenced by key.
    return {
      fileKey: path,
      checksum,
      size: file.size,
      contentType: file.type || "text/csv",
      downloadUrl: null,
    };
  }

  return {
    fileKey: path,
    checksum,
    size: file.size,
    contentType: file.type || "text/csv",
    downloadUrl: signedUrlData?.signedUrl ?? null,
  };
}

export type DownloadedImportFile = {
  buffer: Buffer;
  size: number;
  contentType: string | null;
};

export async function downloadImportFile(fileKey: string): Promise<DownloadedImportFile> {
  if (!fileKey) {
    throw new Error("fileKey is required to download import file.");
  }

  await ensureBucketReady();

  const { data, error } = await supabase.storage.from(IMPORTS_BUCKET).download(fileKey);
  if (error) {
    throw new Error(`Failed to download file "${fileKey}": ${error.message}`);
  }
  if (!data) {
    throw new Error(`File "${fileKey}" returned no data.`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = typeof data.type === "string" ? data.type : null;

  return {
    buffer,
    size: buffer.length,
    contentType,
  };
}
