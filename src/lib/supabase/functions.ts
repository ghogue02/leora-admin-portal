import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let functionClient: SupabaseClient | null = null;

function getFunctionClient() {
  if (functionClient) {
    return functionClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase function client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  functionClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return functionClient;
}

export async function invokeSupabaseFunction<TResponse = unknown, TBody = Record<string, unknown>>(
  name: string,
  body: TBody,
) {
  const client = getFunctionClient();
  const { data, error } = await client.functions.invoke<TResponse>(name, {
    body,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
