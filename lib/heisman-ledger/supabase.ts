import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for read access. Uses the anon key — Row
 * Level Security (supabase/heisman-ledger/schema.sql's read-only policies)
 * does the real access control, per CLAUDE.md's data pattern: "Only the
 * Supabase anon key is prefixed NEXT_PUBLIC_ and shipped to the browser —
 * by design, and only safe because RLS is doing the real access control."
 * Returns null when the project hasn't been created yet, so callers can
 * fall back to the committed static dataset instead of throwing.
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}
