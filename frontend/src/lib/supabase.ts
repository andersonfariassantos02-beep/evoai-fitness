import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = window.__EVOAI_CONFIG__?.supabaseUrl?.trim() ?? "";
const supabaseKey = window.__EVOAI_CONFIG__?.supabasePublishableKey?.trim() ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env local.",
    );
  }

  client ??= createClient(supabaseUrl, supabaseKey);
  return client;
}
