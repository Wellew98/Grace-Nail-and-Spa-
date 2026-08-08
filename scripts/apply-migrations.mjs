#!/usr/bin/env node
/**
 * Apply the schema, RLS policies and seed data to a Postgres database.
 *
 *   npm run db:migrate                        # uses SUPABASE_DB_URL from .env.local
 *   npm run db:migrate -- <connection-string> # or pass one explicitly
 *
 * Safe to re-run: the seed is keyed on fixed ids with ON CONFLICT DO NOTHING,
 * and the migrations are skipped if their objects already exist.
 *
 * Against a bare Postgres (local development, CI) it first applies
 * supabase/local/0000_local_bootstrap.sql, which stands in for the `auth`
 * schema and the anon/authenticated/service_role roles that a Supabase host
 * provides. Against a real Supabase project it skips that file, because the
 * platform already manages those and recreating them would be wrong.
 */
import { readFileSync, existsSync } from 'node:fs';
import { Client } from 'pg';

const FILES = [
  'supabase/migrations/0001_init.sql',
  'supabase/migrations/0002_rls.sql',
  'supabase/seed.sql',
  // Real opening hours, layered over spec §10's fixture hours. Pass
  // --spec-hours to stop before this and keep the fixture (what the tests use).
  'supabase/seed-production.sql',
];

function loadEnvLocal() {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    if (!process.env[key]) process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}

loadEnvLocal();

const args = process.argv.slice(2);
const specHoursOnly = args.includes('--spec-hours');
const connectionString =
  args.find((arg) => !arg.startsWith('--')) ?? process.env.SUPABASE_DB_URL ?? process.env.TEST_DATABASE_URL;

if (!connectionString) {
  console.error(
    'No connection string.\n' +
      '  Set SUPABASE_DB_URL in .env.local, or pass one:\n' +
      '    npm run db:migrate -- "postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"\n\n' +
      '  Supabase: Project Settings > Database > Connection string > URI',
  );
  process.exit(1);
}

const isRemote = /supabase\.(co|com)|amazonaws/i.test(connectionString);

const client = new Client({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  const { rows } = await client.query('select current_database() as db, version() as version');
  console.log(`Connected to ${rows[0].db}`);

  const hasBtreeGist = await client.query(
    "select 1 from pg_available_extensions where name = 'btree_gist'",
  );
  if (hasBtreeGist.rows.length === 0) {
    // Without this the exclusion constraints cannot be created and double
    // bookings become possible. Fail loudly rather than half-migrating.
    throw new Error('btree_gist is not available on this server. The exclusion constraints need it.');
  }

  // The RLS migration calls auth.uid(). Supabase provides it; a bare Postgres
  // does not, and without the stand-in migration 0002 fails with a bare
  // "schema auth does not exist".
  const hasAuth = await client.query(
    "select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'auth' and p.proname = 'uid'",
  );

  const toApply = specHoursOnly ? FILES.filter((f) => !f.includes('seed-production')) : [...FILES];
  if (specHoursOnly) console.log('  (--spec-hours: keeping §10 fixture hours, skipping the real ones)');
  if (hasAuth.rows.length === 0) {
    if (isRemote) {
      throw new Error(
        'This looks like a Supabase host but auth.uid() is missing. Check the connection string ' +
          'points at your project database and not a bare Postgres.',
      );
    }
    console.log('  (bare Postgres: applying the local auth stand-in first)');
    toApply.unshift('supabase/local/0000_local_bootstrap.sql');
  }

  for (const file of toApply) {
    process.stdout.write(`  ${file} … `);
    try {
      await client.query(readFileSync(file, 'utf8'));
      console.log('ok');
    } catch (error) {
      if (/already exists/i.test(error.message)) {
        console.log('already applied');
      } else {
        console.log('failed');
        throw error;
      }
    }
  }

  const counts = await client.query(
    `select (select count(*) from services)  as services,
            (select count(*) from staff)     as staff,
            (select count(*) from resources) as resources,
            (select count(*) from working_hours) as hours`,
  );
  console.log('\nSeeded:', counts.rows[0]);

  // Print the hours back so a wrong day is obvious now rather than when a
  // customer is turned away.
  const week = await client.query(
    `select wh.day_of_week as dow,
            min(wh.start_time)::text as opens,
            max(wh.end_time)::text   as closes
       from working_hours wh
       join staff s on s.id = wh.staff_id
      group by wh.day_of_week order by wh.day_of_week`,
  );
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = new Map(week.rows.map((r) => [r.dow, r]));
  console.log('\nOpening hours now in the database:');
  for (const dow of [1, 2, 3, 4, 5, 6, 0]) {
    const row = byDay.get(dow);
    console.log(
      `  ${names[dow]}  ${row ? `${row.opens.slice(0, 5)}–${row.closes.slice(0, 5)}` : 'closed'}`,
    );
  }

  const members = await client.query('select count(*)::int as n from business_members');
  if (members.rows[0].n === 0) {
    console.log(
      '\nNext: create the owner in Supabase > Authentication > Add user, then link her:\n' +
        "  insert into business_members (user_id, business_id)\n" +
        "  values ('<auth-user-uuid>', '00000000-0000-4000-8000-0000000000b1');\n" +
        '\nUntil that row exists a signed-in user sees nothing. That is RLS working.',
    );
  }
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
