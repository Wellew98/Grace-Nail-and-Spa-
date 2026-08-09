/**
 * Configuration checks behind GET /api/health.
 *
 * Kept out of the route file so it can be unit tested. Testing it through the
 * route is not possible in any useful way: NEXT_PUBLIC_* values are inlined at
 * build time, so overriding them at runtime does nothing and a test would
 * silently assert against whatever was baked in. As a plain function reading
 * process.env, it is testable.
 *
 * Never returns the VALUE of anything — only whether a name is set and what is
 * wrong with it. GET /api/health has to be open, because the auth it would
 * otherwise use is one of the things that might be broken.
 */

export interface Check {
  ok: boolean;
  detail: string;
}

export type EnvName =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'SUPABASE_DB_URL'
  | 'NEXT_PUBLIC_SITE_URL';

/** Just the shape this reads. NodeJS.ProcessEnv demands NODE_ENV, which is noise here. */
export type EnvLike = Record<string, string | undefined>;

export function checkEnvironment(env: EnvLike = process.env): Record<EnvName, Check> {
  const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const dbUrl = env.SUPABASE_DB_URL;
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl
      ? /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(supabaseUrl)
        ? { ok: true, detail: 'set, and shaped like a project URL' }
        : { ok: false, detail: 'set, but not shaped like https://<ref>.supabase.co' }
      : { ok: false, detail: 'missing — the admin cannot sign anyone in' },

    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: checkPublishableKey(publishable),

    SUPABASE_DB_URL: checkDatabaseUrl(dbUrl),

    NEXT_PUBLIC_SITE_URL: siteUrl
      ? /localhost|127\.0\.0\.1/.test(siteUrl)
        ? { ok: false, detail: 'still points at localhost — booking confirmation links would go nowhere' }
        : { ok: true, detail: 'set' }
      : { ok: false, detail: 'missing — confirmation links and JSON-LD need an absolute URL' },
  };
}

function checkPublishableKey(key: string | undefined): Check {
  if (!key) return { ok: false, detail: 'missing — the admin cannot sign anyone in' };

  // Checked FIRST. A secret key here is not a configuration nit: NEXT_PUBLIC_
  // ships it to every visitor, and it bypasses every row-level security policy,
  // so anyone reading the page source could read and edit the whole database.
  if (key.startsWith('sb_secret_') || key.startsWith('service_role')) {
    return {
      ok: false,
      detail:
        'THIS IS A SECRET KEY. It bypasses row-level security and NEXT_PUBLIC_ sends it to every ' +
        'visitor. Replace it with the publishable key and rotate this one in Supabase immediately.',
    };
  }

  // A service-role JWT is also a secret, and looks like any other JWT from the
  // outside. Decode the payload and check the role claim rather than guessing.
  if (key.startsWith('eyJ')) {
    const role = jwtRole(key);
    if (role === 'service_role') {
      return {
        ok: false,
        detail:
          'THIS IS A SERVICE-ROLE KEY. It bypasses row-level security and NEXT_PUBLIC_ sends it ' +
          'to every visitor. Replace it with the anon key and rotate this one immediately.',
      };
    }
    return { ok: true, detail: 'set, and shaped like an anon key' };
  }

  if (key.startsWith('sb_publishable_')) {
    return { ok: true, detail: 'set, and shaped like a publishable key' };
  }

  return { ok: false, detail: 'set, but does not look like a publishable or anon key' };
}

/** Best-effort read of a JWT's `role` claim. Returns null if it is not a JWT. */
function jwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { role?: unknown };
    return typeof parsed.role === 'string' ? parsed.role : null;
  } catch {
    return null;
  }
}

function checkDatabaseUrl(url: string | undefined): Check {
  if (!url) return { ok: false, detail: 'missing — no page that reads data can render' };

  if (/\[YOUR-PASSWORD\]|\[YOUR_PASSWORD\]|<password>/i.test(url)) {
    return { ok: false, detail: 'the password placeholder was never replaced with the real database password' };
  }

  if (!/^postgres(ql)?:\/\//.test(url)) {
    return { ok: false, detail: 'set, but is not a postgres:// URL' };
  }

  if (/db\.[a-z0-9]+\.supabase\.co/i.test(url)) {
    return {
      ok: false,
      detail:
        'this is the DIRECT connection string, which is IPv6-only. Use the Transaction pooler ' +
        'string (Supabase > Connect, port 6543) instead.',
    };
  }

  return { ok: true, detail: 'set, and shaped like a pooled connection string' };
}
