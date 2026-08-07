# Grace Nail and Spa

Booking system for a South African day spa. Next.js (App Router) + Postgres/Supabase +
Tailwind, ZAR, `Africa/Johannesburg`.

Built to `spabookingbuildspec1.md`. **Phases 1 and 2 only** — Google Calendar sync,
WhatsApp reminders and deposits (Phases 3–5) are deliberately not built.

---

## Before this goes live

Two things are still placeholders and one screen is unverified. Please read this section.

### 1. NAP is placeholder data

Spec §8 requires name, address and phone to match the Google Business Profile **byte for
byte**. I did not have the real details, so `supabase/seed.sql` ships obvious placeholders:

```
phone     +27821234567
whatsapp  +27821234567
email     hello@gracenailandspa.co.za
address   12 Example Road, Sandton, Johannesburg, 2196
```

They live in **one place only** — the `businesses` row. The footer, the contact page and
the `LocalBusiness` JSON-LD all render from it, so correcting that row corrects everything.
Nothing else needs touching.

### 2. The admin has not been run end to end

The admin uses Supabase Auth, and this build had no Supabase project to point at. The code
compiles, the routes render, and everything the screens read and write is covered by tests
(`tests/admin.test.ts`) — but the signed-in UI itself has never been exercised against a
real session. Treat the first login as a smoke test rather than a formality.

Everything else — the booking engine, availability, the public site, `/book`, `/b/[token]`
— has been run against a real Postgres and a real HTTP server.

### 3. There is no photography

The gallery is built from the treatment colour range rather than stock images, because
borrowed photographs of someone else's studio would misrepresent the room a guest walks
into. When real photos exist, they belong on `/gallery` and on the Google profile.

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the values

# apply to your Supabase project (SQL editor, or psql against the connection string)
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls.sql
supabase/seed.sql

npm run dev
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
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key, gated by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. **Never** `NEXT_PUBLIC_` |
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
