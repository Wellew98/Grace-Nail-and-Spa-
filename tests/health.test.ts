import { describe, expect, it } from 'vitest';
import { checkEnvironment, type EnvLike } from '@/lib/health';

/**
 * The checks behind GET /api/health.
 *
 * These exist as a unit test rather than a request against the running app
 * because NEXT_PUBLIC_* values are inlined at build time — overriding them at
 * runtime does nothing, so a test through the route would silently assert
 * against whatever was baked into the build. That is not a hypothetical: it is
 * how the secret-key warning below first appeared to pass while never running.
 */

const good = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://dxweozusaqtymivupswk.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
  SUPABASE_DB_URL: 'postgresql://postgres.ref:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  NEXT_PUBLIC_SITE_URL: 'https://spa-two.vercel.app',
} satisfies EnvLike;

describe('a correctly configured deployment', () => {
  it('passes every check', () => {
    const result = checkEnvironment(good);
    for (const [name, check] of Object.entries(result)) {
      expect(check.ok, `${name}: ${check.detail}`).toBe(true);
    }
  });
});

describe('the secret-key warning', () => {
  // The one check here that is a security control rather than a convenience.
  // NEXT_PUBLIC_ ships this value to every visitor, and a secret key bypasses
  // every RLS policy — so anyone reading the page source could read and edit
  // the whole database.
  it('rejects an sb_secret_ key and says to rotate it', () => {
    const result = checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123' });
    const check = result.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(check.ok).toBe(false);
    expect(check.detail).toMatch(/SECRET KEY/);
    expect(check.detail).toMatch(/rotate/i);
  });

  it('rejects a service-role JWT, which looks like any other JWT from outside', () => {
    // A real service_role key is a JWT whose payload carries role: service_role.
    const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

    const check = checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: token })
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(check.ok).toBe(false);
    expect(check.detail).toMatch(/SERVICE-ROLE KEY/);
  });

  it('accepts a genuine anon JWT', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

    expect(
      checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: token })
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.ok,
    ).toBe(true);
  });
});

describe('the connection string', () => {
  it('rejects the direct string, which is IPv6-only and cannot be reached from Vercel', () => {
    const check = checkEnvironment({
      ...good,
      SUPABASE_DB_URL: 'postgresql://postgres:pw@db.dxweozusaqtymivupswk.supabase.co:5432/postgres',
    }).SUPABASE_DB_URL;

    expect(check.ok).toBe(false);
    expect(check.detail).toMatch(/IPv6-only/);
    expect(check.detail).toMatch(/pooler/i);
  });

  it('catches the password placeholder copied straight from the dashboard', () => {
    const check = checkEnvironment({
      ...good,
      SUPABASE_DB_URL:
        'postgresql://postgres.ref:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
    }).SUPABASE_DB_URL;

    expect(check.ok).toBe(false);
    expect(check.detail).toMatch(/placeholder/i);
  });

  it('reports a missing one as fatal to every page that reads data', () => {
    const check = checkEnvironment({ ...good, SUPABASE_DB_URL: undefined }).SUPABASE_DB_URL;
    expect(check.ok).toBe(false);
    expect(check.detail).toMatch(/missing/);
  });
});

describe('the site URL', () => {
  it('rejects localhost, which would send customers a link to their own machine', () => {
    const check = checkEnvironment({ ...good, NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })
      .NEXT_PUBLIC_SITE_URL;
    expect(check.ok).toBe(false);
    expect(check.detail).toMatch(/localhost/);
  });
});

describe('the project URL', () => {
  it('rejects one that is not shaped like a Supabase project', () => {
    const check = checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_URL: 'dxweozusaqtymivupswk' })
      .NEXT_PUBLIC_SUPABASE_URL;
    expect(check.ok).toBe(false);
  });

  it('accepts a trailing slash, which is easy to paste in', () => {
    expect(
      checkEnvironment({ ...good, NEXT_PUBLIC_SUPABASE_URL: 'https://abc123.supabase.co/' })
        .NEXT_PUBLIC_SUPABASE_URL.ok,
    ).toBe(true);
  });
});
