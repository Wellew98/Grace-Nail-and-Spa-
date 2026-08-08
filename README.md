# Grace Nails and Beauty Spa

Booking system for a South African day spa. Next.js (App Router) + Postgres/Supabase +
Tailwind, ZAR, `Africa/Johannesburg`.

Built to `spabookingbuildspec1.md`. **Phases 1 and 2 only** — Google Calendar sync,
WhatsApp reminders and deposits (Phases 3–5) are deliberately not built.

---

## Before this goes live

NAP is real now. Four things still need the owner. Please read this section.

### 1. ⚠ The therapists and treatments are still sample data

`seed.sql` ships spec §10's example configuration: three therapists named **Sarah, Nomsa and
Lerato**, and five treatments (Full Body Massage R500, Back & Neck R280, Classic Facial R350,
Gel Manicure R250, Pedicure R320).

**None of that came from the business.** The About page lists the therapists by name and the
whole site prices off those numbers, so publishing as-is would put invented staff and invented
prices in front of real customers. This is the one item that genuinely blocks launch.

Because of that, none of it deploys: `seed.sql` is never applied to the hosted project, and
the migration script refuses to apply it to one. A deployed database has the real business row
and an empty treatment list until you add the real treatments and therapists in
**Admin → Setup**. Changing a price there never touches bookings already on the diary (§7.1).

### 2. NAP is live, taken from the profile

| | |
|---|---|
| Name | Grace Nails and Beauty Spa |
| Address | 11 Amanda Ave, Glenanda, Johannesburg, 2091 |
| Phone | 063 352 5374 → stored `+27633525374`, displays `063 352 5374` |
| Email | none on the profile, so stored NULL and omitted from the site |
| Category | Nail salon → JSON-LD `NailSalon` |

These live in **one place only** — the `businesses` row. The footer, the contact page and the
`LocalBusiness` JSON-LD all render from it, so correcting that row corrects everything.

Two follow-ups: the WhatsApp number is assumed to be the same line as the phone (the profile
offers `wa.me` but does not say), and `google_maps_url` is a Maps search on the exact name and
address rather than the canonical listing URL — replace it from the profile's Share menu, or
set `gbp_place_id`.

### 3. ⚠ Confirm Sunday's opening hours

The profile lists Mon–Sat 09:00–20:00 and Sun 09:00–16:00, but Google flagged **Sunday and
Monday** with "Hours might differ" because 9 August is National Women's Day and 10 August is
the observed holiday. So those two rows may be holiday-adjusted rather than the regular week.

Monday matches every other weekday, so it is almost certainly right. **Sunday's shorter 9–4 is
the one to check.** If Sunday is normally closed, delete the Sunday insert in
`supabase/seed-real-hours.sql` — an absent row *is* closed, and nothing else changes.

Public holidays themselves are not modelled in hours; they belong in **Admin → Block**, which
is what §3's `availability_blocks` table is for.

### 4. The admin has not been run end to end

The admin uses Supabase Auth, and this build could not reach a Supabase project — the build
environment's network policy blocks `*.supabase.co`, so no amount of credentials would have
helped. The code compiles, the routes render, and everything the screens read and write is
covered by tests (`tests/admin.test.ts`) — but the signed-in UI itself has never been
exercised against a real session. Treat the first login as a smoke test rather than a
formality.

First run, in order:

1. `npm run db:migrate` against the project connection string.
2. Supabase → Authentication → Add user, to create the owner.
3. The `business_members` insert below, to link her to the business.
4. Sign in at `/admin/login` and confirm Today renders.

Everything else — the booking engine, availability, the public site, `/book`, `/b/[token]`
— has been run against a real Postgres and a real HTTP server.

### 5. There is no photography

The gallery is built from the treatment colour range rather than stock images, because
borrowed photographs of someone else's studio would misrepresent the room a guest walks
into. When real photos exist, they belong on `/gallery` and on the Google profile.

The swatch colours are **this site's way of telling treatments apart** — they are not a
stock list. An earlier draft of the gallery copy said they were "the shades currently on the
shelf", which was not true, and was rewritten.

### A note on the site copy

`lib/site.ts` holds every word of prose. Only two kinds of claim are allowed in it:

1. Claims about the **booking system**, which are true by construction and checkable against
   the code — appointment lengths exclude turnaround, a room is reserved alongside the
   therapist, every confirmation carries a link to move or cancel.
2. Claims drawn from the business's **own Google Business Profile** — the Glenanda location,
   the categories of work, the beauty therapists.

An earlier draft invented a founding story ("started as two chairs and a folding table") and
asserted specific hygiene practice. Both were removed: neither was ours to assert about a real
business. If the owner confirms details like those, add them.

---

## Deploying via the Supabase GitHub integration

The project is connected to this repo, so **merging into the production branch applies
`supabase/migrations/*.sql` to the production database.** Three things follow from that, and
the first two are easy to get wrong.

### What deploys, and what does not

| File | Deploys? |
|---|---|
| `supabase/migrations/0001_init.sql` | ✅ schema and both exclusion constraints |
| `supabase/migrations/0002_rls.sql` | ✅ RLS policies |
| `supabase/migrations/0003_business.sql` | ✅ the real business row and NAP |
| `supabase/seed.sql` | ❌ **never** |
| `supabase/seed-real-hours.sql` | ❌ never |
| `supabase/local/0000_local_bootstrap.sql` | ❌ never, correctly — it fakes Supabase's own auth roles |

Supabase's docs are explicit that `seed.sql` is applied to **preview branches only**, and
preview branches need the Pro plan. So the business row had to move into a migration —
otherwise the schema would deploy with no business at all and every page would render
"No business configured".

The example therapists and treatments stay out of `migrations/` on purpose. They are spec
§10's invented data, and deploying them would advertise staff who don't exist at prices
that aren't yours. `npm run db:migrate --with-sample-data` refuses outright when the
connection string points at a hosted project.

### ⚠ The production branch is a feature branch

It is currently set to `claude/project-doc-8cv2my`. That means **every push to that branch
migrates the production database, with no review step in between.** Normally the production
branch is `main`, so a pull request is the gate.

To add that gate: create `main` from this branch, push it, and change **Production branch
name** to `main` in the Supabase integration settings. Migrations then apply on merge rather
than on every push.

### After the first deploy

Migrations create the schema and the business row, but no therapists or treatments — so
`/book` will correctly have nothing to offer until you add them in **Admin → Setup**.

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the values

# schema + RLS + the business row, to SUPABASE_DB_URL
npm run db:migrate

# for local work, add §10's example therapists and treatments too
npm run db:migrate -- --with-sample-data

npm run dev
```

`db:migrate` is safe to re-run and applies exactly what the GitHub integration applies, so
running it and merging produce the same database. Against a bare Postgres it also applies the
local stand-in for Supabase's `auth` schema; against a hosted project it skips that, and it
refuses `--with-sample-data` outright. To target a database explicitly:

```bash
npm run db:migrate -- "postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
```

Create the owner in Supabase → Authentication → Add user, then link her to the business:

```sql
insert into business_members (user_id, business_id)
values ('<auth-user-uuid>', '00000000-0000-4000-8000-0000000000b1');
```

Until that row exists a signed-in user sees nothing. That is the RLS policy working, not a
bug.

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public key (`sb_publishable_…`), gated by RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Older name for the same thing; either works |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. **Never** `NEXT_PUBLIC_`. Not currently read |
| `SUPABASE_DB_URL` | Postgres connection string for the booking engine — see below |
| `RESEND_API_KEY`, `BOOKING_FROM_EMAIL`, `OWNER_NOTIFICATION_EMAIL` | Confirmation email |
| `NEXT_PUBLIC_SITE_URL` | Absolute URL, used in manage links and JSON-LD |

---

## Tests

The §9 acceptance tests run against a **real Postgres**, not mocks — exclusion constraints
and RLS policies only exist in the database, so a fake would assert nothing.

```bash
# any Postgres 16 with btree_gist; defaults to localhost:5433
export TEST_ADMIN_DATABASE_URL=postgresql://postgres@localhost:5433/postgres
npm test
```

68 tests, ~9s. All twelve §9 cases are covered:

| §9 | Case | Where |
|---|---|---|
| 1 | Concurrency — 20 simultaneous, ten runs | `tests/booking.test.ts` |
| 2 | Resource contention | `tests/availability.test.ts` |
| 3 | Turnaround | `tests/availability.test.ts` |
| 4 | Blocks | `tests/availability.test.ts` |
| 5 | Minimum notice | `tests/availability.test.ts` |
| 6 | Idempotency | `tests/booking.test.ts` |
| 7 | Reschedule | `tests/booking.test.ts` |
| 8 | RLS | `tests/rls.test.ts` |
| 9 | Config immutability | `tests/config.test.ts` |
| 10 | Orphan prevention | `tests/config.test.ts` |
| 11 | Hours conflict | `tests/config.test.ts` |
| 12 | Admin double-book | `tests/booking.test.ts` |

Test 1 asserts against the database directly (`findOverlappingPairs`) rather than trusting
the application's own return values.

---

## Decisions worth knowing about

### Server writes use a direct Postgres connection, not supabase-js

Spec §5 says the write path runs "with the Supabase service role key". It uses a direct
connection instead, for three reasons that come from the spec itself:

1. §6 requires reschedule to cancel and re-create **in one transaction**. supabase-js talks
   to PostgREST over HTTP and cannot open one.
2. §5 step 8 requires catching SQLSTATE `23P01` specifically. `pg` exposes it directly;
   PostgREST reshapes the error.
3. §9 test 1 needs a real connection pool to mean anything.

The security property is unchanged: the module is `server-only`, the credential is never
`NEXT_PUBLIC_`, and the browser never writes to `appointments`. Public reads still go
through the anon key path under RLS, and `tests/rls.test.ts` holds the policies to it.
Full reasoning is in `lib/db.ts`.

### Two things the spec required but did not define

- **`appointments.idempotency_key`** — §5 and §9.6 say the key is "stored", but the §3
  schema has nowhere to put it. Added, nullable, unique per business.
- **`business_members`** — §7 requires policies scoped to "their `business_id`", but §3
  defines no mapping from `auth.uid()` to a business. This is the smallest table that
  closes the gap.

### One advisory lock per business on the write path

`appointments` carries two exclusion constraints, so concurrent inserts can each pass one
and then block on the other's uncommitted index entry, in opposite orders — a real
deadlock, even though neither row is invalid. Postgres resolves it, but only after a full
`deadlock_timeout` (1s) per cycle. Under load those compound: twenty racers on one slot
intermittently took **80 seconds** instead of 8.

Appointment writes now take `pg_advisory_xact_lock` on the business first, so every writer
has the same ordering and no cycle can form. The exclusion constraints remain the
authority — this only removes lock-order nondeterminism. Reasoning is in `lib/booking.ts`.

### Seed choices that make §10's claim true

§10 says its configuration "reproduces every edge case in §9 without further setup". Two
mappings are what make that literally true, and both are commented in `seed.sql`:

- Classic Facial is performable by **Sarah only**, so §9.4 (block Sarah, assert no facial
  slots) works as-is.
- Three therapists but **two** massage rooms, so §9.2 (resource contention) works as-is.

§10 assigns rooms to "massage services" and does not place the facial in one, so the facial
requires no resource. If it should occupy a room, add one row to `service_resources` and
nothing else changes.

---

## Bugs found by testing rather than by reading

Recorded because each one would have been invisible in production for a while.

1. **Inactive resources read as "no resource required".** The availability query filters on
   `r.active`, so a service that *requires* a room returned an empty resource set once every
   room was out of service — which §4 says means "needs no resource". Unlimited concurrent
   bookings with `resource_id NULL`, which never conflicts. Now distinguishes "no
   `service_resources` rows" from "set emptied by filtering".
2. **Deadlock storm** under concurrency (above).
3. **Double-tap regression** that the advisory lock exposed: the second of two in-flight
   requests ran its availability check after the first had committed and reported the
   customer's own booking as "slot taken". Idempotency is now checked inside the
   transaction, after the lock and before availability.
4. **Booking flow defaulted to today**, which is usually past the minimum-notice window, so
   the first thing a customer saw was "nothing left". It now advances to the first day with
   real availability.
5. **Walk-in form built its instant in the browser's timezone** — the naive-local-time
   mistake §12 warns about. The form now sends the wall clock and the server converts.
6. **Seed UUIDs were not RFC 4122 conformant** and failed strict validation at the API
   boundary. Made them valid rather than loosening the validator.

---

## Layout

```
app/
  page.tsx  services/  about/  gallery/  contact/   Phase 1 site
  book/                                             customer booking flow
  b/[token]/                                        cancel + reschedule, no login
  admin/                                            today, week, walk-in, blocks, setup
  api/availability  api/bookings  api/manage/…      route handlers
lib/
  availability.ts     §4 — the slot algorithm
  booking.ts          §5, §6 — write path, cancel, reschedule
  config-guards.ts    §7.1 — what happens to bookings already on the books
  db.ts               pool, transactions, SQLSTATE handling
  time.ts             timezone conversion at the edges
supabase/
  migrations/         schema + RLS
  seed.sql            §10
  local/              test-only stubs for Supabase's auth roles
tests/                the §9 acceptance tests
```

## Not built, by instruction

Payments, deposits, customer accounts, loyalty, analytics, marketing email, multi-tenant
admin UI, chatbot. Phases 3–5. Spec §0 and §8.
