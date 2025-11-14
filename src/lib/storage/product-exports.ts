import { createClient } from "@supabase/supabase-js";

const EXPORTS_BUCKET = "product-exports";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let bucketInitialized = false;

async function ensureBucket() {
  if (bucketInitialized) return;
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to list storage buckets: ${error.message}`);
  }
  const exists = buckets?.some((bucket) => bucket.name === EXPORTS_BUCKET);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(EXPORTS_BUCKET, {
      public: true,
    });
    if (createError) {
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
  bucketInitialized = true;
}

export async function uploadExportBuffer(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  await ensureBucket();
  const { error } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(EXPORTS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Failed to generate public URL for export");
  }
  return data.publicUrl;
}
