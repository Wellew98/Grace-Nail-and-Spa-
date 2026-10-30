-- ---------------------------------------------------------------------------
-- The owner's confirmed price list, supplied 30 October 2026.
--
-- Source: the Grace Nails & Beauty Spa poster (`grace prices.jpeg`, the same
-- menu as `docs/source-material/price-menu-poster.webp`). Every price below was
-- transcribed against the image, line by line. All 43 already matched the
-- prices entered by 0006 — this migration re-asserts them so the database
-- cannot drift from the printed menu, and retires the last three placeholder
-- treatments from 0004 that were still showing on /services.
--
-- NOT taken from this poster:
--   * durations — it states a length only for the three massages, exactly as
--     the earlier poster did, so the estimates in 0006 stand until the owner
--     confirms them;
--   * the phone number — the poster prints +27 83-520-4875, while the confirmed
--     business row uses 063 352 5374. That disagreement is still open.
--
-- The six 0004 placeholder treatments are deactivated, never deleted: a past
-- appointment may still reference one, and §7.1 requires it to keep resolving
-- at the price it was booked at.
-- ---------------------------------------------------------------------------

-- ---------- retire the remaining placeholder menu ----------
-- 0006 already did this, but 000001–000003 were active again in production.
-- Re-asserting it here is deliberate: the poster is the menu.
update services
   set active = false
 where business_id = '00000000-0000-4000-8000-0000000000b1'
   and id in (
     'dddddddd-dddd-4ddd-8ddd-000000000001',  -- Gel Manicure
     'dddddddd-dddd-4ddd-8ddd-000000000002',  -- Express Manicure
     'dddddddd-dddd-4ddd-8ddd-000000000003',  -- Acrylic Full Set
     'dddddddd-dddd-4ddd-8ddd-000000000004',  -- Pedicure
     'dddddddd-dddd-4ddd-8ddd-000000000005',  -- Gel Pedicure
     'dddddddd-dddd-4ddd-8ddd-000000000006'   -- Classic Facial
   );

-- ---------- the poster's 43 prices ----------
update services as s
   set price_cents = v.price_cents
  from (values
    -- Special package
    ('dddddddd-dddd-4ddd-8ddd-000000000101', 50000),  -- Massage + Facial + Pedicure
    ('dddddddd-dddd-4ddd-8ddd-000000000102', 50000),  -- Full Mani + Full Pedi + Gelish Eyebrows

    -- Nails
    ('dddddddd-dddd-4ddd-8ddd-000000000103', 20000),  -- Acrylic Overlay & Gel
    ('dddddddd-dddd-4ddd-8ddd-000000000104', 30000),  -- Acrylic Tips & Gel
    ('dddddddd-dddd-4ddd-8ddd-000000000105', 32000),  -- Acrylic Ombre Tips
    ('dddddddd-dddd-4ddd-8ddd-000000000106', 25000),  -- Acrylic French Tips
    ('dddddddd-dddd-4ddd-8ddd-000000000107', 30000),  -- Sculpture
    ('dddddddd-dddd-4ddd-8ddd-000000000108', 20000),  -- Back Fill
    ('dddddddd-dddd-4ddd-8ddd-000000000109',  8000),  -- Normal Nail Hand Polish
    ('dddddddd-dddd-4ddd-8ddd-000000000110',  8000),  -- Normal Feet Nail Polish

    -- Manicure / pedicure (the poster's heading)
    ('dddddddd-dddd-4ddd-8ddd-000000000111', 20000),  -- Express Pedi, Normal Paint
    ('dddddddd-dddd-4ddd-8ddd-000000000112', 30000),  -- Full Pedi & Gel
    ('dddddddd-dddd-4ddd-8ddd-000000000113', 25000),  -- Full Pedi & Polish

    -- Add on
    ('dddddddd-dddd-4ddd-8ddd-000000000114',  8000),  -- Paraffin Dip
    ('dddddddd-dddd-4ddd-8ddd-000000000115',  5000),  -- Hot Stone

    -- Art & repair
    ('dddddddd-dddd-4ddd-8ddd-000000000116',  1000),  -- Nail Art
    ('dddddddd-dddd-4ddd-8ddd-000000000117',  2000),  -- Nail Repair (one)
    ('dddddddd-dddd-4ddd-8ddd-000000000118',  5000),  -- Soak Off Gel
    ('dddddddd-dddd-4ddd-8ddd-000000000119',  5000),  -- Soak Off Acrylic

    -- Gel
    ('dddddddd-dddd-4ddd-8ddd-000000000120', 20000),  -- Gel Overlay Feet
    ('dddddddd-dddd-4ddd-8ddd-000000000121', 20000),  -- Gel Overlay Hand
    ('dddddddd-dddd-4ddd-8ddd-000000000122', 40000),  -- Combo Hand & Feet

    -- Massage
    ('dddddddd-dddd-4ddd-8ddd-000000000123', 35000),  -- Swedish Massage, 60 minutes
    ('dddddddd-dddd-4ddd-8ddd-000000000124', 20000),  -- Swedish Massage, 30 minutes
    ('dddddddd-dddd-4ddd-8ddd-000000000125', 15000),  -- Feet Massage, 30 minutes

    -- Eyelash extensions
    ('dddddddd-dddd-4ddd-8ddd-000000000126', 30000),  -- Classic New Set
    ('dddddddd-dddd-4ddd-8ddd-000000000127', 17000),  -- One Week Fill
    ('dddddddd-dddd-4ddd-8ddd-000000000128', 20000),  -- Two Weeks Fill
    ('dddddddd-dddd-4ddd-8ddd-000000000129', 25000),  -- Three Weeks Fill
    ('dddddddd-dddd-4ddd-8ddd-000000000130',  8000),  -- Lashes Removal

    -- Waxing
    ('dddddddd-dddd-4ddd-8ddd-000000000131',  8000),  -- Eyebrows
    ('dddddddd-dddd-4ddd-8ddd-000000000132',  8000),  -- Chin
    ('dddddddd-dddd-4ddd-8ddd-000000000133', 15000),  -- Full Face
    ('dddddddd-dddd-4ddd-8ddd-000000000134',  8000),  -- Lip Wax
    ('dddddddd-dddd-4ddd-8ddd-000000000135',  5000),  -- Nose
    ('dddddddd-dddd-4ddd-8ddd-000000000136',  5000),  -- Ears
    ('dddddddd-dddd-4ddd-8ddd-000000000137', 12000),  -- Under Arms
    ('dddddddd-dddd-4ddd-8ddd-000000000138', 12000),  -- Half Arms
    ('dddddddd-dddd-4ddd-8ddd-000000000139', 15000),  -- Full Arms
    ('dddddddd-dddd-4ddd-8ddd-000000000140', 12000),  -- Half Legs
    ('dddddddd-dddd-4ddd-8ddd-000000000141', 15000),  -- Full Legs
    ('dddddddd-dddd-4ddd-8ddd-000000000142', 15000),  -- Bikini Wax
    ('dddddddd-dddd-4ddd-8ddd-000000000143', 18000)   -- Hollywood
  ) as v(id, price_cents)
 where s.id = v.id::uuid
   and s.business_id = '00000000-0000-4000-8000-0000000000b1';
