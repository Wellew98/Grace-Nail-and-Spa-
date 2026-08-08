#!/usr/bin/env node
/**
 * Remove the placeholder treatments, therapists and rooms added by
 * migrations/0004_demo_data.sql, once the real ones are in.
 *
 *   npm run db:demo-clear                        # uses SUPABASE_DB_URL
 *   npm run db:demo-clear -- <connection-string>
 *
 * Deleting is the right move for placeholders: they were never real, so there is
 * no history worth preserving. But if a genuine booking already points at a demo
 * treatment, the foreign keys refuse the delete (NO ACTION, per §7.1) — this
 * script reports that and deactivates instead, so the booking still resolves and
 * the treatment simply stops being offered.
 *
 * Removing the rows also clears the "Sample menu" banner, because that is
 * derived from the data rather than from a setting.
 */
import { readFileSync, existsSync } from 'node:fs';
import { Client } from 'pg';

const PREFIX = 'dddddddd-%';

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

const connectionString =
  process.argv.slice(2).find((a) => !a.startsWith('--')) ??
  process.env.SUPABASE_DB_URL ??
  process.env.TEST_DATABASE_URL;

if (!connectionString) {
  console.error('No connection string. Set SUPABASE_DB_URL in .env.local, or pass one.');
  process.exit(1);
}

const isRemote = /supabase\.(co|com)|amazonaws/i.test(connectionString);
const client = new Client({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();

  const before = await client.query(
    `select (select count(*)::int from services  where id::text like $1) as services,
            (select count(*)::int from staff     where id::text like $1) as staff,
            (select count(*)::int from resources where id::text like $1) as resources`,
    [PREFIX],
  );
  const counts = before.rows[0];

  if (counts.services + counts.staff + counts.resources === 0) {
    console.log('No demo data found. Nothing to do.');
    process.exit(0);
  }
  console.log('Found demo rows:', counts);

  // Any real bookings pointing at demo rows? Those decide delete vs deactivate.
  const booked = await client.query(
    `select count(*)::int as n from appointments a
      where a.service_id::text like $1
         or a.staff_id::text   like $1
         or a.resource_id::text like $1`,
    [PREFIX],
  );

  if (booked.rows[0].n > 0) {
    console.log(
      `\n${booked.rows[0].n} booking(s) reference demo rows, so they cannot be deleted\n` +
        'without orphaning history. Deactivating instead — they will disappear from\n' +
        '/book but existing bookings keep resolving.',
    );
    await client.query('begin');
    await client.query(`update services  set active = false where id::text like $1`, [PREFIX]);
    await client.query(`update staff     set active = false where id::text like $1`, [PREFIX]);
    await client.query(`update resources set active = false where id::text like $1`, [PREFIX]);
    await client.query('commit');
    console.log(
      '\nDeactivated. Note the "Sample menu" banner stays until the rows are gone,\n' +
        'which is correct — placeholder treatments are still in the database.',
    );
  } else {
    await client.query('begin');
    // Join tables and working_hours cascade from staff/services/resources.
    await client.query(`delete from services  where id::text like $1`, [PREFIX]);
    await client.query(`delete from staff     where id::text like $1`, [PREFIX]);
    await client.query(`delete from resources where id::text like $1`, [PREFIX]);
    await client.query('commit');
    console.log('\nDemo data removed. The "Sample menu" banner is now off.');
  }

  const left = await client.query(
    `select (select count(*)::int from services) as services,
            (select count(*)::int from staff)    as staff`,
  );
  console.log('Remaining:', left.rows[0]);
  if (left.rows[0].staff === 0) {
    console.log('\nNo therapists left, so /book has nothing to offer. Add the real ones in Admin > Setup.');
  }
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error(`\n${error.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
