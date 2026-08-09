import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { checkEnvironment, type Check } from '@/lib/health';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — is this deployment wired up correctly?
 *
 * Reading a hosting platform's runtime logs on a phone, while the site is down,
 * is a miserable way to find out that one environment variable is wrong. This
 * answers the same question in a browser tab.
 *
 * Returns no value of any variable, no database host or username, and no raw
 * driver error — only whether each name is set, and a category for what went
 * wrong. That keeps it safe to open without auth, which it must be, since the
 * auth it would use is one of the things that might be broken.
 */

async function databaseCheck(): Promise<Check & { businessName?: string; treatments?: number }> {
  try {
    const result = await getPool().query(
      `select (select name from businesses limit 1) as name,
              (select count(*)::int from services where active) as treatments`,
    );
    const row = result.rows[0];
    if (!row?.name) {
      return { ok: false, detail: 'connected, but there is no business row — migrations may not have run' };
    }
    return { ok: true, detail: 'connected', businessName: row.name, treatments: row.treatments };
  } catch (error) {
    // lib/db.ts already turns connection failures into plain English. Anything
    // else is reported by class only, never verbatim.
    const message = error instanceof Error ? error.message : String(error);
    const known = /IPv6-only|PAUSED|Password rejected|not set|Could not resolve|Timed out/i.test(message);
    return { ok: false, detail: known ? message.split('\n')[0] : 'could not query the database' };
  }
}

export async function GET() {
  const environment = checkEnvironment();
  const database = await databaseCheck();
  const ok = Object.values(environment).every((c) => c.ok) && database.ok;

  return NextResponse.json(
    {
      ok,
      summary: ok ? 'Everything is wired up.' : 'Something is not configured. See the entries marked ok: false.',
      environment,
      database,
      hint: 'NEXT_PUBLIC_* values are baked in at build time. After changing them, redeploy.',
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
