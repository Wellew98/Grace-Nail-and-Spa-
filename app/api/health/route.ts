import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { checkEnvironment, type Check } from '@/lib/health';
import { getTransport } from '@/lib/mail';

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

/**
 * Does the mail provider actually accept these credentials?
 *
 * OPT-IN, via `?verify=mail`, for two reasons. It costs an SMTP round trip,
 * and this endpoint is the thing you open when the site is down — it should
 * stay fast. And a Gmail account with an aggressive security posture may treat
 * repeated authentication attempts as worth an alert, which is not something
 * to trigger on every health poll.
 *
 * Worth having at all because the default checks are shape-only: they will
 * happily confirm an App Password is 16 characters while Gmail rejects those
 * particular 16. Since `lib/email.ts` never throws into the write path, the
 * first symptom of that would be an email that silently never arrives — the
 * exact failure §1.2 calls worse than having no system.
 */
async function mailCheck(): Promise<Check> {
  const transport = getTransport();
  if (!transport) {
    return { ok: false, detail: 'no mail transport configured — nothing to verify' };
  }
  if (!transport.verify) {
    return {
      ok: true,
      detail: `${transport.name} offers no credential check that does not send a message — not verified`,
    };
  }
  try {
    return await transport.verify();
  } catch (error) {
    // verify() is meant to return rather than throw; if it throws anyway, that
    // must not take down the one endpoint used to diagnose everything else.
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `could not check the mail credentials: ${message}` };
  }
}

export async function GET(request: Request) {
  const verifyMail = new URL(request.url).searchParams.get('verify') === 'mail';

  const environment = checkEnvironment();
  const [database, mail] = await Promise.all([
    databaseCheck(),
    verifyMail ? mailCheck() : Promise.resolve(null),
  ]);

  const ok =
    Object.values(environment).every((c) => c.ok) && database.ok && (mail ? mail.ok : true);

  return NextResponse.json(
    {
      ok,
      summary: ok ? 'Everything is wired up.' : 'Something is not configured. See the entries marked ok: false.',
      environment,
      database,
      ...(mail ? { mail } : {}),
      hint: 'NEXT_PUBLIC_* values are baked in at build time. After changing them, redeploy.',
      ...(verifyMail
        ? {}
        : { tip: 'Add ?verify=mail to also ask the mail provider whether the credentials work.' }),
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
