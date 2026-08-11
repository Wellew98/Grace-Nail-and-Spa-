-- ---------------------------------------------------------------------------
-- The menu from the studio's own printed price poster.
--
-- Source: `docs/source-material/price-menu-poster.webp`, pulled from the Google
-- Business Profile and transcribed line by line against the image. Names and
-- PRICES come from that poster and are the studio's own.
--
-- ⚠ THE DURATIONS DO NOT. The poster gives a length for the three massages and
-- for nothing else, and `duration_minutes` is `not null` because §6 builds the
-- entire availability grid out of it. So every other length below is an
-- ESTIMATE made to get the menu usable while the owner is asked, and a wrong
-- one does not fail loudly — it produces appointments that overlap in real life
-- while looking perfectly correct in the diary. Turnaround, the room and chair
-- mapping, and who performs what are estimates for the same reason.
--
-- THAT IS WHY THESE ROWS KEEP THE `dddddddd-` PREFIX even though the names and
-- prices are real. The prefix is what `lib/public-data.ts` looks for, so the
-- sample-menu banner keeps showing on every page and `npm run db:demo-clear`
-- still removes them. Over-warning is the safe direction: a customer sees a
-- notice that the menu is provisional, which it is, because the times attached
-- to it were guessed.
--
-- WHEN THE OWNER CONFIRMS: correct the durations here (or in Admin → Setup),
-- then re-issue these rows with ordinary uuids so the banner clears. Confirm at
-- the same time that the poster is current and which phone number is right —
-- the poster prints +27 83-520-4875, the business row has 063 352 5374.
-- `docs/source-material/README.md` has the full list of open questions.
--
-- The six invented treatments from 0004 are DEACTIVATED below, not deleted: a
-- real booking may already reference one, the foreign keys are NO ACTION on
-- purpose (§7.1), and a past appointment must keep resolving at the price it
-- was made at.
-- ---------------------------------------------------------------------------

-- ---------- retire the invented menu from 0004 ----------
update services
   set active = false
 where business_id = '00000000-0000-4000-8000-0000000000b1'
   and id in (
     'dddddddd-dddd-4ddd-8ddd-000000000001',
     'dddddddd-dddd-4ddd-8ddd-000000000002',
     'dddddddd-dddd-4ddd-8ddd-000000000003',
     'dddddddd-dddd-4ddd-8ddd-000000000004',
     'dddddddd-dddd-4ddd-8ddd-000000000005',
     'dddddddd-dddd-4ddd-8ddd-000000000006'
   );

-- ---------- the poster's 43 services ----------
--
-- `description` carries the poster's own category and nothing else. The site
-- copy rule in lib/site.ts allows only claims that are checkable against a
-- source, and there is no blurb for any of these — inventing one would be
-- exactly the class of copy that rule exists to keep out.
--
-- Durations are rounded to the 15-minute booking grid (§6) so slots line up.
insert into services (id, business_id, name, description, duration_minutes, turnaround_minutes, price_cents, sort_order) values
  -- Special package
  ('dddddddd-dddd-4ddd-8ddd-000000000101', '00000000-0000-4000-8000-0000000000b1', 'Massage + Facial + Pedicure',              'Special package',    150, 15, 50000, 101),
  ('dddddddd-dddd-4ddd-8ddd-000000000102', '00000000-0000-4000-8000-0000000000b1', 'Full Mani + Full Pedi + Gelish Eyebrows',  'Special package',    150, 15, 50000, 102),

  -- Nails
  ('dddddddd-dddd-4ddd-8ddd-000000000103', '00000000-0000-4000-8000-0000000000b1', 'Acrylic Overlay & Gel',    'Nails',  90, 10, 20000, 103),
  ('dddddddd-dddd-4ddd-8ddd-000000000104', '00000000-0000-4000-8000-0000000000b1', 'Acrylic Tips & Gel',       'Nails',  90, 10, 30000, 104),
  ('dddddddd-dddd-4ddd-8ddd-000000000105', '00000000-0000-4000-8000-0000000000b1', 'Acrylic Ombre Tips',       'Nails', 105, 15, 32000, 105),
  ('dddddddd-dddd-4ddd-8ddd-000000000106', '00000000-0000-4000-8000-0000000000b1', 'Acrylic French Tips',      'Nails',  90, 10, 25000, 106),
  ('dddddddd-dddd-4ddd-8ddd-000000000107', '00000000-0000-4000-8000-0000000000b1', 'Sculpture',                'Nails', 120, 15, 30000, 107),
  ('dddddddd-dddd-4ddd-8ddd-000000000108', '00000000-0000-4000-8000-0000000000b1', 'Back Fill',                'Nails',  75, 10, 20000, 108),
  ('dddddddd-dddd-4ddd-8ddd-000000000109', '00000000-0000-4000-8000-0000000000b1', 'Normal Nail Hand Polish',  'Nails',  30,  5,  8000, 109),
  ('dddddddd-dddd-4ddd-8ddd-000000000110', '00000000-0000-4000-8000-0000000000b1', 'Normal Feet Nail Polish',  'Nails',  30,  5,  8000, 110),

  -- Poster heading reads "MANICURE"; every service under it is a pedicure.
  -- Transcribed as printed — see the note in docs/source-material/README.md.
  ('dddddddd-dddd-4ddd-8ddd-000000000111', '00000000-0000-4000-8000-0000000000b1', 'Express Pedi, Normal Paint', 'Manicure', 45,  5, 20000, 111),
  ('dddddddd-dddd-4ddd-8ddd-000000000112', '00000000-0000-4000-8000-0000000000b1', 'Full Pedi & Gel',            'Manicure', 75, 10, 30000, 112),
  ('dddddddd-dddd-4ddd-8ddd-000000000113', '00000000-0000-4000-8000-0000000000b1', 'Full Pedi & Polish',         'Manicure', 60, 10, 25000, 113),

  -- Add on. These read as modifiers to another treatment rather than
  -- appointments in their own right, but the engine books one service per
  -- appointment (§3: `service_id` is a single non-null column) and the poster
  -- lists them, so they are here and bookable. Deactivate in Admin → Setup if
  -- the owner does not want a standalone 15-minute hot stone booking.
  ('dddddddd-dddd-4ddd-8ddd-000000000114', '00000000-0000-4000-8000-0000000000b1', 'Paraffin Dip', 'Add on', 30, 5, 8000, 114),
  ('dddddddd-dddd-4ddd-8ddd-000000000115', '00000000-0000-4000-8000-0000000000b1', 'Hot Stone',    'Add on', 15, 5, 5000, 115),

  -- Art & repair. Same caveat as the add-ons above.
  ('dddddddd-dddd-4ddd-8ddd-000000000116', '00000000-0000-4000-8000-0000000000b1', 'Nail Art',          'Art & repair', 15, 5, 1000, 116),
  ('dddddddd-dddd-4ddd-8ddd-000000000117', '00000000-0000-4000-8000-0000000000b1', 'Nail Repair (one)', 'Art & repair', 15, 5, 2000, 117),
  ('dddddddd-dddd-4ddd-8ddd-000000000118', '00000000-0000-4000-8000-0000000000b1', 'Soak Off Gel',      'Art & repair', 30, 5, 5000, 118),
  ('dddddddd-dddd-4ddd-8ddd-000000000119', '00000000-0000-4000-8000-0000000000b1', 'Soak Off Acrylic',  'Art & repair', 30, 5, 5000, 119),

  -- Gel
  ('dddddddd-dddd-4ddd-8ddd-000000000120', '00000000-0000-4000-8000-0000000000b1', 'Gel Overlay Feet',    'Gel',  60, 10, 20000, 120),
  ('dddddddd-dddd-4ddd-8ddd-000000000121', '00000000-0000-4000-8000-0000000000b1', 'Gel Overlay Hand',    'Gel',  60, 10, 20000, 121),
  ('dddddddd-dddd-4ddd-8ddd-000000000122', '00000000-0000-4000-8000-0000000000b1', 'Combo Hand & Feet',   'Gel', 120, 15, 40000, 122),

  -- Massage. THE ONLY DURATIONS THE POSTER ACTUALLY STATES.
  ('dddddddd-dddd-4ddd-8ddd-000000000123', '00000000-0000-4000-8000-0000000000b1', 'Swedish Massage, 60 minutes', 'Massage', 60, 15, 35000, 123),
  ('dddddddd-dddd-4ddd-8ddd-000000000124', '00000000-0000-4000-8000-0000000000b1', 'Swedish Massage, 30 minutes', 'Massage', 30, 15, 20000, 124),
  ('dddddddd-dddd-4ddd-8ddd-000000000125', '00000000-0000-4000-8000-0000000000b1', 'Feet Massage, 30 minutes',    'Massage', 30, 10, 15000, 125),

  -- Eyelash extensions. The poster prints "CLASSIC" and "NEW SET" on separate
  -- lines with R300 against the second; read here as one service.
  ('dddddddd-dddd-4ddd-8ddd-000000000126', '00000000-0000-4000-8000-0000000000b1', 'Classic New Set',   'Eyelash extensions', 120, 15, 30000, 126),
  ('dddddddd-dddd-4ddd-8ddd-000000000127', '00000000-0000-4000-8000-0000000000b1', 'One Week Fill',     'Eyelash extensions',  45, 10, 17000, 127),
  ('dddddddd-dddd-4ddd-8ddd-000000000128', '00000000-0000-4000-8000-0000000000b1', 'Two Weeks Fill',    'Eyelash extensions',  60, 10, 20000, 128),
  ('dddddddd-dddd-4ddd-8ddd-000000000129', '00000000-0000-4000-8000-0000000000b1', 'Three Weeks Fill',  'Eyelash extensions',  75, 10, 25000, 129),
  ('dddddddd-dddd-4ddd-8ddd-000000000130', '00000000-0000-4000-8000-0000000000b1', 'Lashes Removal',    'Eyelash extensions',  30,  5,  8000, 130),

  -- Waxing
  ('dddddddd-dddd-4ddd-8ddd-000000000131', '00000000-0000-4000-8000-0000000000b1', 'Eyebrows',   'Waxing', 15,  5,  8000, 131),
  ('dddddddd-dddd-4ddd-8ddd-000000000132', '00000000-0000-4000-8000-0000000000b1', 'Chin',       'Waxing', 15,  5,  8000, 132),
  ('dddddddd-dddd-4ddd-8ddd-000000000133', '00000000-0000-4000-8000-0000000000b1', 'Full Face',  'Waxing', 30,  5, 15000, 133),
  ('dddddddd-dddd-4ddd-8ddd-000000000134', '00000000-0000-4000-8000-0000000000b1', 'Lip Wax',    'Waxing', 15,  5,  8000, 134),
  ('dddddddd-dddd-4ddd-8ddd-000000000135', '00000000-0000-4000-8000-0000000000b1', 'Nose',       'Waxing', 15,  5,  5000, 135),
  ('dddddddd-dddd-4ddd-8ddd-000000000136', '00000000-0000-4000-8000-0000000000b1', 'Ears',       'Waxing', 15,  5,  5000, 136),
  ('dddddddd-dddd-4ddd-8ddd-000000000137', '00000000-0000-4000-8000-0000000000b1', 'Under Arms', 'Waxing', 15,  5, 12000, 137),
  ('dddddddd-dddd-4ddd-8ddd-000000000138', '00000000-0000-4000-8000-0000000000b1', 'Half Arms',  'Waxing', 30,  5, 12000, 138),
  ('dddddddd-dddd-4ddd-8ddd-000000000139', '00000000-0000-4000-8000-0000000000b1', 'Full Arms',  'Waxing', 30,  5, 15000, 139),
  ('dddddddd-dddd-4ddd-8ddd-000000000140', '00000000-0000-4000-8000-0000000000b1', 'Half Legs',  'Waxing', 30,  5, 12000, 140),
  ('dddddddd-dddd-4ddd-8ddd-000000000141', '00000000-0000-4000-8000-0000000000b1', 'Full Legs',  'Waxing', 45, 10, 15000, 141),
  ('dddddddd-dddd-4ddd-8ddd-000000000142', '00000000-0000-4000-8000-0000000000b1', 'Bikini Wax', 'Waxing', 30, 10, 15000, 142),
  ('dddddddd-dddd-4ddd-8ddd-000000000143', '00000000-0000-4000-8000-0000000000b1', 'Hollywood',  'Waxing', 45, 10, 18000, 143)
on conflict (id) do nothing;

-- ---------- who performs what ----------
-- Every therapist is mapped to every treatment, because the poster says nothing
-- about who does what and a service with NO staff row returns zero slots
-- forever — it would appear on the menu and be permanently unbookable, which is
-- worse than a provisional guess. The therapists themselves are still the
-- invented ones from 0004.
insert into staff_services (staff_id, service_id)
select st.id, s.id
  from staff st
  cross join services s
 where st.business_id = '00000000-0000-4000-8000-0000000000b1'
   and st.id::text like 'dddddddd-%'
   and s.id::text like 'dddddddd-dddd-4ddd-8ddd-0000000001%'
on conflict do nothing;

-- ---------- what needs a room or a chair ----------
-- An estimate, and the one most likely to be wrong. Pedicures need a chair and
-- anything a guest lies down for needs the room; everything else is done at the
-- nail desk, which is not modelled as a resource (§3: an empty set means "no
-- resource required" and is correct here, not an oversight).
--
-- Getting this wrong does NOT double-book a room — the exclusion constraints
-- still refuse genuine overlaps. It makes the studio look busier or emptier
-- than it is.
insert into service_resources (service_id, resource_id)
select s.id, r.id
  from services s
  cross join resources r
 where s.id in (
         'dddddddd-dddd-4ddd-8ddd-000000000111',  -- Express Pedi
         'dddddddd-dddd-4ddd-8ddd-000000000112',  -- Full Pedi & Gel
         'dddddddd-dddd-4ddd-8ddd-000000000113',  -- Full Pedi & Polish
         'dddddddd-dddd-4ddd-8ddd-000000000110',  -- Normal Feet Nail Polish
         'dddddddd-dddd-4ddd-8ddd-000000000120'   -- Gel Overlay Feet
       )
   and r.id in (
         'dddddddd-dddd-4ddd-8ddd-000000000031',
         'dddddddd-dddd-4ddd-8ddd-000000000032'
       )
on conflict do nothing;

-- Massages, facials and waxing are done lying down, in the treatment room.
insert into service_resources (service_id, resource_id)
select s.id, 'dddddddd-dddd-4ddd-8ddd-000000000033'::uuid
  from services s
 where s.id in (
         'dddddddd-dddd-4ddd-8ddd-000000000101',  -- Massage + Facial + Pedicure
         'dddddddd-dddd-4ddd-8ddd-000000000123',  -- Swedish 60
         'dddddddd-dddd-4ddd-8ddd-000000000124',  -- Swedish 30
         'dddddddd-dddd-4ddd-8ddd-000000000125',  -- Feet massage
         'dddddddd-dddd-4ddd-8ddd-000000000126',  -- Classic New Set (lashes)
         'dddddddd-dddd-4ddd-8ddd-000000000127',
         'dddddddd-dddd-4ddd-8ddd-000000000128',
         'dddddddd-dddd-4ddd-8ddd-000000000129',
         'dddddddd-dddd-4ddd-8ddd-000000000130',
         'dddddddd-dddd-4ddd-8ddd-000000000133',  -- Full face wax
         'dddddddd-dddd-4ddd-8ddd-000000000138',  -- Half arms
         'dddddddd-dddd-4ddd-8ddd-000000000139',  -- Full arms
         'dddddddd-dddd-4ddd-8ddd-000000000140',  -- Half legs
         'dddddddd-dddd-4ddd-8ddd-000000000141',  -- Full legs
         'dddddddd-dddd-4ddd-8ddd-000000000142',  -- Bikini
         'dddddddd-dddd-4ddd-8ddd-000000000143'   -- Hollywood
       )
on conflict do nothing;
