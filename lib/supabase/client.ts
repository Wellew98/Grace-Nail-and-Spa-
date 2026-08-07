'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client — sign-in and sign-out only.
 *
 * The anon key is public by design and gated by RLS. The service role key must
 * never appear in any file that ships to the browser (spec §7); it is read only
 * inside `server-only` modules.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
