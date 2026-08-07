import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client bound to the signed-in owner's session.
 *
 * This uses the ANON key, never the service role key. Everything read through
 * it is filtered by the RLS policies in migration 0002, which is exactly what
 * spec §7 asks for: the owner's access is "scoped to their business_id,
 * enforced in the policy — never in application code".
 *
 * Writes to `appointments` do NOT go through here. They go through the
 * transactional path in lib/booking.ts, as §7 requires.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The admin needs Supabase Auth — copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
