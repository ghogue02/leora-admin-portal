import { Buffer } from "node:buffer";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { SUPPORT_TICKET_ATTACHMENT_BUCKET } from "@/lib/support-tickets";

let bucketVerified = false;

function requireAdminClient() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase admin client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}

export async function ensureSupportTicketAttachmentBucket() {
  if (bucketVerified) return;
  const client = requireAdminClient();

  const { data, error } = await client.storage.getBucket(SUPPORT_TICKET_ATTACHMENT_BUCKET);
  if (error && error.message && !error.message.toLowerCase().includes("not found")) {
    throw error;
  }
  if (!data) {
    const { error: createError } = await client.storage.createBucket(SUPPORT_TICKET_ATTACHMENT_BUCKET, {
      public: false,
    });
    if (createError) {
      // If bucket already exists due to race, ignore unique violation.
      const message = createError.message?.toLowerCase() ?? "";
      if (!message.includes("already exists")) {
        throw createError;
      }
    }
  }

  bucketVerified = true;
}

export async function uploadSupportTicketAttachment(params: {
  path: string;
  file: File;
  contentType?: string | null;
}) {
  const client = requireAdminClient();
  await ensureSupportTicketAttachmentBucket();

  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await client.storage
    .from(SUPPORT_TICKET_ATTACHMENT_BUCKET)
    .upload(params.path, buffer, {
      contentType: params.contentType ?? params.file.type ?? "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw error;
  }
}

export async function createSupportTicketAttachmentSignedUrl(path: string, expiresIn = 300) {
  const client = requireAdminClient();
  await ensureSupportTicketAttachmentBucket();

  const { data, error } = await client.storage
    .from(SUPPORT_TICKET_ATTACHMENT_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw error ?? new Error("Unable to generate signed URL.");
  }

  return data.signedUrl;
}

export async function deleteSupportTicketAttachment(path: string) {
  const client = requireAdminClient();
  await ensureSupportTicketAttachmentBucket();

  const { error } = await client.storage.from(SUPPORT_TICKET_ATTACHMENT_BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}
