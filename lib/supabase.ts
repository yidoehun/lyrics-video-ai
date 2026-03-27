import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabaseAnonKey!);
  }

  return browserClient;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}
