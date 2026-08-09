# Handoff — Grace Nails and Beauty Spa

Written at the end of the build session. Everything a new session needs in order to
continue without re-deriving what was already decided, or undoing it by accident.

**Read `README.md` for how to run and deploy. This file is for context: what is done,
what is deliberately the way it is, and what is left.**

---

## 1. Where things stand

Spec: `spabookingbuildspec1.md`. **Phases 1 and 2 are complete.** The spec says to stop
there and hand back for review, so Phases 3–5 (Google Calendar sync, WhatsApp reminders,
deposits) are deliberately not built.

| | Status |
|---|---|
| Booking engine (§3–§7.1) | Done. 79 tests green against real Postgres |
| Public site (§8 Phase 1) | Done and deployed |
| `/book`, `/b/[token]` (§5, §6) | Done and deployed |
| Admin (§7) | Done, deployed, **signed into and confirmed working** |
| §9 acceptance tests, all 12 | Passing. Test 8 also re-verified against the live project |
| Supabase → GitHub deploy | Working. Migrations apply on push |
| Vercel | Deployed and serving |

### What is live right now

- **Database**: Supabase project `dxweozusaqtymivupswk`, `eu-west-1`. Schema, RLS,
  business row and placeholder menu all applied.
- **Real NAP** (§8, byte-for-byte from the Google Business Profile):
  Grace Nails and Beauty Spa · 11 Amanda Ave, Glenanda, Johannesburg, 2091 · 063 352 5374
- **Hours**: Mon–Sat 09:00–20:00, Sun 09:00–16:00. Confirmed by the owner — the shorter
  Sunday is the real week, not a Women's Day adjustment.
- **Placeholder menu** (see §4 below): 6 treatments, 3 therapists, 3 resources.

---

## 2. THE ONE THING BLOCKING LAUNCH

**The treatments and therapists in production are invented.**

```
Gel Manicure      45min R320      Naledi
Express Manicure  30min R180      Precious
Acrylic Full Set  90min R480      Zanele
Pedicure          60min R350
Gel Pedicure      75min R420
Classic Facial    45min R380
```

None of this came from the business. It exists so the site could be shown before the real
list arrived. **Every page currently displays a banner saying so** — see §4.

To finish: get the real treatment names, lengths and prices, the real therapists, and which
rooms/chairs exist. Enter them in **Admin → Setup**, then run `npm run db:demo-clear`.

---

## 3. Decisions that must not be casually reversed

Each of these looks like it could be simplified. Each one has a failure mode behind it.

### The exclusion constraints are the authority, not the app

`appointments` carries two gist exclusion constraints (`no_staff_overlap`,
`no_resource_overlap`). The application also re-checks availability before inserting.
**Both are required and neither is redundant** — §5 steps 2 and 8. The re-check gives a good
message in the common case; the constraint is what makes it correct when two people tap the
same slot a millisecond apart.

### One advisory lock per business on the write path

`lib/booking.ts` takes `pg_advisory_xact_lock` as the first statement of every booking
transaction. Reason: with two exclusion constraints, concurrent inserts can each pass one and
block on the other's uncommitted index entry in opposite orders — a real deadlock. Postgres
resolves it only after a full `deadlock_timeout` (1s) per cycle, and under load those
compound. Twenty racers on one slot intermittently took **80 seconds** instead of 8.

It is `_xact_` (transaction-scoped) deliberately, so it is safe through a transaction-mode
pooler. A session-scoped lock would break on Supabase's pooler.

### Server writes use `pg`, not `supabase-js`

Spec §5 says "with the Supabase service role key". We use a direct Postgres connection.
Three reasons from the spec itself: §6 needs a real transaction (PostgREST cannot open one),
§5 step 8 needs the raw SQLSTATE, §9.1 needs a real pool. Security property is unchanged —
`server-only`, never `NEXT_PUBLIC_`, browser never writes appointments. Full reasoning in
`lib/db.ts`.

### `pg` must stay in `serverExternalPackages`

`next.config.ts` declares it. Without it the build passes and the **runtime 500s**, because
`pg` reaches for optional `pg-native` / `pg-cloudflare` through conditional requires that
break in a serverless bundle. This cost a live outage.

### `proxy.ts`, not `middleware.ts`

Next 16 renamed the convention. The old filename ran through a compatibility path and
produced `MIDDLEWARE_INVOCATION_FAILED` in production. The file is also wrapped in a
try/catch with a **dynamic** `@supabase/ssr` import, so a failure costs an early logout
rather than a 500 — a static import that fails to initialise throws before any handler code
runs, where a try/catch around the body would never catch it.

### Two schema additions the spec required but did not define

- **`appointments.idempotency_key`** — §5 and §9.6 say the key is "stored", §3 has nowhere
  to put it.
- **`business_members`** — §7 scopes policies to "their `business_id`" but defines no
  mapping from `auth.uid()` to a business.

### The site copy rule

`lib/site.ts` documents it at the top. Only two kinds of claim are allowed: claims about the
**booking system** (true by construction, checkable against the code) and claims from the
business's **own Google Business Profile**. An earlier draft invented a founding story and
asserted hygiene practice; both were removed. Do not reintroduce that class of copy.

---

## 4. The placeholder-data mechanism

- Lives in `supabase/migrations/0004_demo_data.sql`. All rows use the id prefix
  `dddddddd-`.
- `lib/public-data.ts` → `hasDemoData()` detects that prefix, and `components/demo-banner.tsx`
  renders on every page while any exist.
- **The banner is derived from the data, not a flag.** A flag has to be remembered and fails
  in the wrong direction — forget it and invented prices ship with nothing saying so. This
  way the banner cannot outlive the data or be left switched off.
- Remove with `npm run db:demo-clear`. It deletes when nothing references the rows, and
  **deactivates instead** when a real booking already points at one, so the booking keeps
  resolving at the price it was made at (§7.1). Both paths were exercised.

---

## 5. Seed files — which is which

Three files, easy to confuse:

| File | Purpose | Reaches production? |
|---|---|---|
| `migrations/0003_business.sql` | Real business row and NAP | **Yes** |
| `migrations/0004_demo_data.sql` | Placeholder menu | **Yes**, on purpose, with the banner |
| `seed.sql` | Spec §10's example data | **No** — tests and local only |
| `seed-real-hours.sql` | Real week over §10's fixture | **No** — local only |
| `local/0000_local_bootstrap.sql` | Fakes Supabase's auth roles | **No** — bare Postgres only |

Supabase's GitHub integration applies **`supabase/migrations/*.sql` only**; `seed.sql` is
documented as preview-branch-only and preview branches need the Pro plan. That is why the
business row had to be a migration.

`seed.sql` keeps §10's fixture hours (Tue–Sat, closing 17:00) because the §9 tests are pinned
to them. The real week has no closed weekday and a later last slot, which would break the
closed-day and end-of-window assertions. **Do not "fix" seed.sql to match reality.**
`tests/helpers/global-setup.ts` deliberately skips `0004`.

---

## 6. Bugs found and fixed — do not reintroduce

Each was found by testing or deploying, not by reading.

1. **Inactive resources read as "no resource required".** The availability query filters on
   `r.active`, so a service that *requires* a room returned an empty resource set once every
   room was inactive — and §4 reads an empty set as "needs no resource". It offered slots
   with `resource_id NULL`, which never conflicts, so one room could be booked without limit.
   `lib/availability.ts` now distinguishes "no `service_resources` rows" from "set emptied by
   filtering".
2. **Deadlock storm** under contention — see §3.
3. **Double-tap regression** that the advisory lock exposed: the second of two in-flight
   requests ran its availability check after the first committed and reported the customer's
   own booking as "slot taken". Idempotency is now checked **inside** the transaction, after
   the lock and before availability.
4. **Booking flow defaulted to today**, usually past the minimum-notice window, so the first
   thing a customer saw was "nothing left". It now advances to the first day with real
   availability.
5. **Walk-in form built its instant in the browser's timezone** — the naive-local-time mistake
   §12 warns about. The form sends wall-clock; the server converts.
6. **Seed UUIDs were not RFC 4122 conformant** and failed strict validation at the API
   boundary.
7. **`pg` not externalised** — production 500s. See §3.
8. **`middleware.ts` crashing the site.** See §3.
9. **A test that never ran.** The health check's secret-key warning appeared to pass while
   asserting against build-time-inlined values. `NEXT_PUBLIC_*` cannot be overridden at
   runtime — that is why `lib/health.ts` is a pure function with unit tests rather than
   something tested through a request.

---

## 7. Diagnosing a broken deployment

**`GET /api/health` first.** It reports which env vars are set, what is wrong with the ones
that are not, and whether the database answers — without exposing any value. It encodes the
mistakes that actually cost time here:

- the direct connection string (IPv6-only, unreachable from Vercel)
- `[YOUR-PASSWORD]` left unreplaced
- `NEXT_PUBLIC_SITE_URL` still localhost
- **a secret key pasted into the public variable** — a security control, not a nit:
  `NEXT_PUBLIC_` ships it to every visitor and it bypasses every RLS policy

`SUPABASE_DB_URL` must be the **transaction pooler** string (`pooler.supabase.com`, port
6543), not `db.<ref>.supabase.co`. A real outage was caused by a missing colon between
username and password — the driver parsed the password as part of the username and sent no
password at all.

---

## 8. Known environment quirks (this container)

- **Postgres dies when the container recycles.** Restart:
  ```bash
  SP=<scratchpad>/pgdata
  chmod 755 /tmp/claude-0 /tmp/claude-0/-home-user-* <scratchpad>
  su nobody -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D $SP -o '-p 5433 -k /tmp' -l $SP/pg.log start"
  ```
  The `chmod` matters — `nobody` needs to traverse the path.
- **Network egress is allowlisted.** `*.supabase.co`, `*.pooler.supabase.com` and
  `api.supabase.com` were added. `google.com` / `share.google` are blocked, so Google
  Business Profile links cannot be fetched — ask for details as text.
- **Raw Postgres (port 6543) cannot be reached from here at all** — the proxy only tunnels
  HTTPS. Supabase's REST API works, so use that to inspect production data.
- Long-running commands are sometimes killed (exit 144). Re-run; it is not a real failure.

---

## 9. Outstanding

**Blocking launch**

1. Real treatments, therapists and resources (§2 above).

**Should do**

2. **Rotate the database password.** It was pasted into a chat transcript during debugging.
   Supabase → Settings → Database → Reset database password, update `SUPABASE_DB_URL` in
   Vercel, redeploy.
3. **Move the Supabase production branch off the feature branch.** It is set to
   `claude/project-doc-8cv2my`, so every push migrates production with no review step. Create
   `main`, point Supabase and Vercel at it, and merges become the gate.
4. Confirm whether WhatsApp is a separate line from the phone number.
5. Replace `google_maps_url` with the canonical listing URL, or set `gbp_place_id`.
6. Set `RESEND_API_KEY`, `BOOKING_FROM_EMAIL`, `OWNER_NOTIFICATION_EMAIL` — confirmation
   email is built and silently no-ops without them.
7. Real photography for `/gallery`.

**Explicitly out of scope** — Phases 3–5, and everything in spec §0's non-goals: payments,
customer accounts, loyalty, analytics, marketing email, multi-tenant admin UI, chatbot.

---

## 10. Orientation

```
lib/availability.ts     §4 — the slot algorithm. 15-min grid, occupancy = duration + turnaround
lib/booking.ts          §5, §6 — write path, cancel, reschedule. The advisory lock lives here
lib/config-guards.ts    §7.1 — what happens to bookings already on the books
lib/db.ts               pool, transactions, SQLSTATE handling, connection diagnosis
lib/health.ts           the checks behind /api/health
lib/time.ts             timezone conversion at the edges
lib/site.ts             every word of prose, and the rule for what may be claimed
app/admin/              today · week · walk-in · blocks · settings
tests/                  the §9 acceptance tests, against real Postgres
```

Design: the organising device is a **lacquer swatch** — a nail bar's characteristic object is
its colour range, and there is no photography. Each treatment carries its own colour across
the whole site. Palette and reasoning are at the top of `app/globals.css`.

**Run the tests before changing anything in `lib/`.** They are the specification made
executable, and several of them exist because the obvious implementation was wrong.
