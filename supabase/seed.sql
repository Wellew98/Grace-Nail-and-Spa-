-- ---------------------------------------------------------------------------
-- Seed data — spec §10
--
-- Fixed UUIDs so the acceptance tests in §9 can reference rows directly
-- without a lookup round-trip. Safe to re-run: everything is ON CONFLICT
-- DO NOTHING keyed on the fixed id.
--
-- §10 claims this configuration "reproduces every edge case in §9 without
-- further setup". Two mapping choices below are what make that true:
--   * Classic Facial is performable by Sarah ONLY  -> test 4 (block Sarah,
--     assert no facial slots) works with no extra setup.
--   * 3 therapists but only 2 massage rooms        -> test 2 (resource
--     contention) works: book two massages at 10:00 and the third therapist
--     is free while no room is.
-- ---------------------------------------------------------------------------

-- ---------- business ----------
-- REAL NAP, taken from the Google Business Profile. Spec §8 requires these to
-- match the profile byte for byte — same words, same order, same punctuation —
-- so do not "tidy" them. This row is the ONLY place NAP lives: the footer, the
-- contact page and the LocalBusiness JSON-LD all render from it.
--
-- GBP as given:
--   Grace Nails and Beauty Spa
--   11 Amanda Ave, Glenanda, Johannesburg, 2091
--   063 352 5374        (E.164 +27633525374; displays back as 063 352 5374)
--   Category: Nail salon
--
-- email is NULL because the profile lists none. The footer and contact page
-- both omit the row rather than inventing an address.
insert into businesses (
  id, name, slug, phone, whatsapp, email, address, google_maps_url,
  timezone, min_notice_minutes, max_advance_days
) values (
  '00000000-0000-4000-8000-0000000000b1',
  'Grace Nails and Beauty Spa',
  'grace-nails-and-beauty-spa',
  '+27633525374',
  '+27633525374',   -- the profile offers wa.me on this number; confirm if a separate line is used
  null,
  '11 Amanda Ave, Glenanda, Johannesburg, 2091',
  -- A Maps search on the exact name + address. Swap for the canonical listing
  -- URL (or set gbp_place_id) once you have it from the profile's Share menu.
  'https://www.google.com/maps/search/?api=1&query=Grace+Nails+and+Beauty+Spa%2C+11+Amanda+Ave%2C+Glenanda%2C+Johannesburg%2C+2091',
  'Africa/Johannesburg',
  120,
  60
) on conflict (id) do update set
  name            = excluded.name,
  slug            = excluded.slug,
  phone           = excluded.phone,
  whatsapp        = excluded.whatsapp,
  email           = excluded.email,
  address         = excluded.address,
  google_maps_url = excluded.google_maps_url;

-- ---------- services (§10) ----------
insert into services (id, business_id, name, description, duration_minutes, turnaround_minutes, price_cents, sort_order) values
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-0000000000b1',
   'Full Body Massage',
   'A full-body Swedish massage to release tension from head to toe.',
   60, 15, 50000, 1),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-0000000000b1',
   'Back & Neck Massage',
   'Focused pressure work on the back, shoulders and neck.',
   30, 10, 28000, 2),
  ('00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-0000000000b1',
   'Classic Facial',
   'Cleanse, exfoliate, steam and mask, finished with a moisturiser for your skin type.',
   45, 10, 35000, 3),
  ('00000000-0000-4000-8000-000000000054', '00000000-0000-4000-8000-0000000000b1',
   'Gel Manicure',
   'Shaping, cuticle work and a long-wear gel colour of your choice.',
   45, 5, 25000, 4),
  ('00000000-0000-4000-8000-000000000055', '00000000-0000-4000-8000-0000000000b1',
   'Pedicure',
   'A soak, scrub and nail tidy, finished with polish.',
   60, 10, 32000, 5)
on conflict (id) do nothing;

-- ---------- staff (§10: three therapists) ----------
insert into staff (id, business_id, name, active) values
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-0000000000b1', 'Sarah',  true),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-0000000000b1', 'Nomsa',  true),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-0000000000b1', 'Lerato', true)
on conflict (id) do nothing;

-- ---------- resources (§10) ----------
insert into resources (id, business_id, name, active) values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-0000000000b1', 'Massage Room 1', true),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-0000000000b1', 'Massage Room 2', true),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-0000000000b1', 'Pedicure Chair', true)
on conflict (id) do nothing;

-- ---------- which resources each service needs (§10) ----------
-- "Massage services require a massage room. Manicure requires nothing.
--  Pedicure requires the chair."
-- Either massage room satisfies a massage — that is the "any one of them"
-- semantics of service_resources.
insert into service_resources (service_id, resource_id) values
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000031'),
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000031'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000055', '00000000-0000-4000-8000-000000000033')
on conflict do nothing;
-- Gel Manicure (…54) intentionally has no rows: it requires no resource.
-- Classic Facial (…53) likewise. §10 assigns rooms only to "massage services";
-- it does not place the facial in a room, so we do not invent one. If the
-- facial should occupy a room, add it here and nothing else changes.

-- ---------- who can perform what (§10) ----------
-- Sarah is the ONLY facial therapist — see header note, this is what makes
-- acceptance test 4 work against the seed as-is.
insert into staff_services (staff_id, service_id) values
  -- Sarah: everything, including the facial
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000051'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000052'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000053'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000054'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000055'),
  -- Nomsa: everything except the facial
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000051'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000052'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000054'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000055'),
  -- Lerato: everything except the facial
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000051'),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000052'),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000054'),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000055')
on conflict do nothing;

-- ---------- working hours (§10) ----------
-- "Tue–Sat 09:00–17:00, Sat 09:00–14:00, closed Sun–Mon."
-- day_of_week: 0 = Sunday. Tue=2 Wed=3 Thu=4 Fri=5 Sat=6.
-- No rows for Sunday(0) or Monday(1) — absence of a row IS closed.
--
-- THESE ARE THE SPEC'S FIXTURE HOURS, NOT THE REAL ONES.
-- The §9 acceptance tests are pinned to this configuration — §10 claims it
-- "reproduces every edge case in §9 without further setup", and it does. The
-- real profile is open seven days until 20:00, which would break the closed-day
-- and end-of-window assertions.
-- supabase/seed-production.sql replaces these with the real hours and is what
-- `npm run db:migrate` applies on top. The test suite applies this file only.
insert into working_hours (staff_id, day_of_week, start_time, end_time)
select s.id, d.dow, '09:00'::time, '17:00'::time
from staff s
cross join (values (2), (3), (4), (5)) as d(dow)
where s.business_id = '00000000-0000-4000-8000-0000000000b1'
  and not exists (
    select 1 from working_hours wh
    where wh.staff_id = s.id and wh.day_of_week = d.dow
  );

insert into working_hours (staff_id, day_of_week, start_time, end_time)
select s.id, 6, '09:00'::time, '14:00'::time
from staff s
where s.business_id = '00000000-0000-4000-8000-0000000000b1'
  and not exists (
    select 1 from working_hours wh
    where wh.staff_id = s.id and wh.day_of_week = 6
  );

-- ---------- owner account ----------
-- Create the owner in Supabase Auth (Dashboard > Authentication > Add user),
-- then link that user to this business so the §7 policies grant admin access:
--
--   insert into business_members (user_id, business_id)
--   values ('<auth-user-uuid>', '00000000-0000-4000-8000-0000000000b1');
--
-- Until that row exists, a logged-in user sees nothing. That is the policy
-- doing its job, not a bug.
