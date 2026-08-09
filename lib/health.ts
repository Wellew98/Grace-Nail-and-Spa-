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
  | 'NEXT_PUBLIC_SITE_URL'
  | 'RESEND_API_KEY'
  | 'BOOKING_FROM_EMAIL'
  | 'OWNER_NOTIFICATION_EMAIL';

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

    RESEND_API_KEY: checkResendKey(env.RESEND_API_KEY),
    BOOKING_FROM_EMAIL: checkFromEmail(env.BOOKING_FROM_EMAIL),
    OWNER_NOTIFICATION_EMAIL: checkOwnerEmail(env.OWNER_NOTIFICATION_EMAIL),
  };
}

/**
 * The three email variables — spec §1.2, which calls this blocking.
 *
 * WHY THESE ARE CHECKED HERE AT ALL. `lib/email.ts` is best-effort by design:
 * it must never throw into the booking write path, because a booking safely in
 * the database must not be reported as a failure just because a provider had a
 * bad minute — the customer would rebook and the spa would have two
 * appointments. The cost of that correct decision is that a misconfigured
 * mailer is *completely silent*. The customer books, receives nothing, and
 * phones to check, which is worse than having no system at all.
 *
 * So the only place that silence can be broken is here. §16 — "GET /api/health
 * first, always" — is the habit this relies on.
 */
function checkResendKey(key: string | undefined): Check {
  if (!key) {
    return {
      ok: false,
      detail:
        'missing — NO email is sent at all. Bookings still save, and neither the customer nor ' +
        'the owner is told. Resend > API Keys.',
    };
  }
  if (!key.startsWith('re_')) {
    return { ok: false, detail: 'set, but a Resend API key starts with re_' };
  }
  return { ok: true, detail: 'set, and shaped like a Resend API key' };
}

/** Accepts a bare address or the `Name <addr@domain>` form Resend also takes. */
function emailAddress(value: string): string {
  return value.match(/<([^>]+)>/)?.[1]?.trim() ?? value.trim();
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function checkFromEmail(value: string | undefined): Check {
  // The trap this check exists for. lib/email.ts falls back to
  // bookings@example.com, which is a domain nobody can verify, so Resend
  // rejects EVERY send with a 403 — while the key itself is perfectly valid.
  // Set the key and forget this one and the system looks configured and
  // delivers nothing.
  if (!value) {
    return {
      ok: false,
      detail:
        'missing — the fallback sender is bookings@example.com, which Resend refuses, so every ' +
        'send fails even with a valid API key. Must be an address on a domain verified in Resend.',
    };
  }

  const address = emailAddress(value);
  if (!looksLikeEmail(address)) {
    return { ok: false, detail: 'set, but is not an email address' };
  }
  if (/@example\.(com|org|net)$/i.test(address)) {
    return { ok: false, detail: 'still the example address — Resend will refuse every send' };
  }
  // Resend's shared test sender only delivers to the account holder's own
  // address. Fine for a smoke test, useless to a customer.
  if (/@resend\.dev$/i.test(address)) {
    return {
      ok: false,
      detail:
        'this is Resend\'s test sender. It only delivers to your own account address, so real ' +
        'customers receive nothing. Verify the spa\'s domain and send from that.',
    };
  }
  return { ok: true, detail: 'set, and shaped like an address on a real domain' };
}

function checkOwnerEmail(value: string | undefined): Check {
  if (!value) {
    return {
      ok: false,
      detail:
        'missing — the owner is not told about new bookings or cancellations. Customers are ' +
        'still emailed; she is not.',
    };
  }
  return looksLikeEmail(emailAddress(value))
    ? { ok: true, detail: 'set' }
    : { ok: false, detail: 'set, but is not an email address' };
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
