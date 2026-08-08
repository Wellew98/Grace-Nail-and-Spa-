import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { ADMIN_URL, TEST_DB, TEST_URL } from './config';

/**
 * Builds the acceptance-test database once per `vitest run`.
 *
 * These tests run against real Postgres, not a mock. Spec §9 tests 1 and 8
 * assert behaviour that only exists in the database — exclusion constraints
 * and RLS policies — so a fake would assert nothing at all.
 */

function sql(relativePath: string): string {
  return readFileSync(new URL(relativePath, new URL('../../', import.meta.url)), 'utf8');
}

export default async function setup() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  // Drop any leftover from an interrupted run so migrations apply to a clean slate.
  await admin.query(`drop database if exists ${TEST_DB} with (force)`);
  await admin.query(`create database ${TEST_DB}`);
  await admin.end();

  const db = new Client({ connectionString: TEST_URL });
  await db.connect();
  await db.query(sql('supabase/local/0000_local_bootstrap.sql'));
  // The same migrations Supabase applies on merge, in the same order, so the
  // tests exercise the real deployed schema rather than a parallel definition.
  await db.query(sql('supabase/migrations/0001_init.sql'));
  await db.query(sql('supabase/migrations/0002_rls.sql'));
  await db.query(sql('supabase/migrations/0003_business.sql'));
  // §10's example therapists and treatments. Test fixture only — never deployed.
  await db.query(sql('supabase/seed.sql'));
  await db.end();
}
