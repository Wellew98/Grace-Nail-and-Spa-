# Source material from the Google Business Profile

Eleven images pulled from the spa's own GBP. Ten are photographs and live in
`public/photos/`; the eleventh is a price-list poster and lives **here**, not in
`public/` — see below for why.

A twelfth piece of source material — a photograph of the **banner mounted
outside the shop** — arrived separately and is not a file in this repository.
What was taken from it is described under "The shopfront banner" below. It is
where the logo, the hero's wording and the hero's colours now come from.

**The menu has been entered, provisionally** — `supabase/migrations/0006_poster_menu.sql`
puts all 43 services in with the poster's real names and prices, deactivating
the six invented treatments from `0004`. The rows keep the `dddddddd-` prefix so
the sample-menu banner stays up, because the DURATIONS attached to those real
prices are estimates. All 43 were checked against the real availability engine
and return slots.

The photographs are not referenced by any page yet.

Everything in §"Before any of this goes on the site" is still open, and two
pieces of it contradict `docs/HANDOFF.md`. Read it before taking the banner
down.

---

## The shopfront banner

A photograph of the printed banner on the wall outside 11 Amanda Avenue. It is
the first sight of the studio's own **branding** — until it arrived, the site
had a name and no logo, and the design system in `app/globals.css` had been
built from the treatments rather than from anything the business itself uses.

The photograph is not committed: it is a phone shot taken at an angle, half of
it is a wall, and every part of it that matters has been transcribed below or
rebuilt as code. Nothing on the site depends on the file.

### What is on it

| Element | As printed |
|---|---|
| Logo | A cream disc inside a double ring. The word `GRACE` in letterspaced serif caps, a script "Grace" written across the top of them, and `NAILS &BEAUTY SPA` on a rule beneath |
| Message | `SCHEDULE AN APPOINTMENT` — heavy black sans caps, the largest thing on the banner |
| Hours | `MONDAY - SUNDAY \| 9AM - 6PM` — in rose, on its own line under the message |
| Contact | `GET IN TOUCH:` in small dark caps, then `063 352…` in heavy black (the rest is obscured in the photograph) |
| Ground | A blush-pink wash behind a montage of nail, pedicure and facial photographs |

### What was taken from it, and where it went

- **The logo** is redrawn as `components/grace-mark.tsx` and now appears in the
  site header and at the top of the homepage hero. It is a reconstruction in the
  site's own faces, not a tracing — read the note at the top of that file before
  changing it, and **ask the owner for the original artwork**, which would
  replace the drawing outright.
- **"Schedule an appointment"** is now the homepage `h1` (`lib/site.ts`),
  finished in the site's serif with "in under a minute" — the studio's own way
  of asking for the booking, plus the part a printed banner cannot offer.
- **The palette** needed nothing. The blush ground, the rose accent and the
  near-black message on the banner are what `app/globals.css` already had as
  blush, lacquer and aubergine; the hero now uses them in the banner's own
  arrangement.
- **The hours and the phone number** were NOT copied as text. The hero reads
  both out of the database, like the footer does — see the conflict below.

### It confirms the phone number

The banner's `063 352…` matches `HANDOFF.md` §1 and the row in
`0003_business.sql`. That is a second, independent sighting of **063 352 5374**,
against a single sighting of `+27 83-520-4875` on the price poster. The question
in §1 below stands — the poster's number may well be a real second line — but
the number the site uses is now the better evidenced of the two.

### ⚠ It disagrees with the profile about the hours

| Source | Hours |
|---|---|
| Google Business Profile (already in `seed-real-hours.sql`) | Mon–Sat 9am–8pm, Sun 9am–4pm |
| This banner | Monday–Sunday, 9am–6pm |

Both are the studio's own statements, and they cannot both be current. **Ask
which is right, then set it once in Admin → Setup.** The homepage hero, the
footer, the JSON-LD and the booking engine all read the same `working_hours`
rows, so answering it in one place fixes every surface at once — and until it is
answered, the site is at least consistent with itself and with what the diary
will actually offer.

Note that a wrong answer here is not cosmetic: 8pm in the database with a 6pm
closing time in real life means the booking engine will sell slots nobody is
there to work.

---

## The price poster — `price-menu-poster.webp`

A printed menu, "GRACE NAILS & BEAUTY SPA", with a full service list and
prices. This is the first real data we have against `HANDOFF.md` §2, which calls
the invented placeholder menu **the one thing blocking launch**.

### Why it is not in `public/`

`public/` is served — anything there is a live URL on the site. This poster
carries a phone number that does **not** match the confirmed one (below), so
publishing it would put a contradictory contact number on the site under our own
domain. It is reference material for whoever fills in Admin → Setup, and nothing
else.

### Transcribed

Verified against the image, character by character. Poster typos are preserved
in brackets so the transcription can be checked against the original; use the
corrected spelling when entering them.

| Category | Service | Price |
|---|---|---|
| Special package | Massage + Facial + Pedicure | R500 |
| Special package | Full Mani + Full Pedi + Gelish Eyebrows | R500 |
| Nails | Acrylic Overlay & Gel | R200 |
| Nails | Acrylic Tips & Gel | R300 |
| Nails | Acrylic Ombre Tips | R320 |
| Nails | Acrylic French Tips | R250 |
| Nails | Sculpture | R300 |
| Nails | Back Fill | R200 |
| Nails | Normal Nail Hand Polish | R80 |
| Nails | Normal Feet Nail Polish | R80 |
| Manicure *(see note)* | Express Pedi, Normal Paint | R200 |
| Manicure *(see note)* | Full Pedi & Gel | R300 |
| Manicure *(see note)* | Full Pedi & Polish | R250 |
| Add on | Paraffin Dip | R80 |
| Add on | Hot Stone | R50 |
| Art & repair | Nail Art | R10 |
| Art & repair | Nail Repair (one) *[poster: "REAPAIR"]* | R20 |
| Art & repair | Soak Off Gel *[poster: "SOAK OF GEL"]* | R50 |
| Art & repair | Soak Off Acrylic | R50 |
| Gel | Gel Overlay Feet | R200 |
| Gel | Gel Overlay Hand | R200 |
| Gel | Combo Hand & Feet | R400 |
| Massage | Swedish Massage, 60 minutes | R350 |
| Massage | Swedish Massage, 30 minutes *[poster: "MINITES"]* | R200 |
| Massage | Feet Massage, 30 minutes | R150 |
| Eyelash extensions | Classic New Set *(see note)* | R300 |
| Eyelash extensions | One Week Fill | R170 |
| Eyelash extensions | Two Weeks Fill | R200 |
| Eyelash extensions | Three Weeks Fill *[poster: "TREE WEEKS"]* | R250 |
| Eyelash extensions | Lashes Removal | R80 |
| Waxing | Eyebrows | R80 |
| Waxing | Chin | R80 |
| Waxing | Full Face | R150 |
| Waxing | Lip Wax | R80 |
| Waxing | Nose | R50 |
| Waxing | Ears | R50 |
| Waxing | Under Arms | R120 |
| Waxing | Half Arms | R120 |
| Waxing | Full Arms | R150 |
| Waxing | Half Legs | R120 |
| Waxing | Full Legs | R150 |
| Waxing | Bikini Wax | R150 |
| Waxing | Hollywood | R180 |

Also on the poster: **Contact +27 83-520-4875**, Address 11 Amanda Avenue,
Glenanda, 2091, JHB/SA. Footer: "Made with PosterMyWall.com".

**Two notes on the poster's own wording.** The heading reads `MANICURE` but
every service beneath it is a pedicure — that is how the poster prints it, not a
transcription slip; ask which is meant. And `CLASSIC` / `NEW SET` are on
separate lines with R300 against the second, so "Classic New Set at R300" is the
likely reading but not the certain one.

---

## Before any of this goes on the site

Four things, and none of them can be resolved from the image.

### 1. The phone number disagrees with the confirmed one

| Source | Number |
|---|---|
| `HANDOFF.md` §1, byte-for-byte from the GBP, already live in `0003_business.sql` | 063 352 5374 |
| This poster | +27 83-520-4875 |

Could be a second line, could be an old poster. **Do not take the poster's
number over the confirmed one** — the address in `0003_business.sql` is
described as byte-for-byte from the GBP and is what the site, the JSON-LD and
the confirmation emails already use. Ask the owner which is current.

### 2. Every duration is a guess except the three massages

Only the massages carry a length on the poster. `services.duration_minutes` is
`not null` and §6 builds the whole availability grid out of duration plus
turnaround, so `0006` had to supply one for all 43 to make the menu usable at
all. **Each of those needs confirming.** A wrong duration does not fail loudly:
it produces bookings that overlap in real life while looking correct in the
diary.

The estimates are all in `0006_poster_menu.sql`, rounded to the 15-minute
booking grid, and are the single most likely thing in this project to be wrong
right now.

Turnaround per treatment is needed too, and so is which treatments need a room
or a chair (`service_resources`) — a pedicure needs the chair, a hand polish
does not, and the engine has no way to guess.

### 3. Still no therapist names and no room or chair count

Neither is on the poster. `space-01` shows **two manicure stations** and a
reception desk, with no pedicure chair or massage room in frame — suggestive,
not authoritative, and not a substitute for asking.

### 4. Confirm the poster is current

Menus get reprinted and prices drift. None of these 43 services overlaps with
the six placeholder treatments in `0004_demo_data.sql`, so there is no ambiguity
about which set is real once it is confirmed — but confirm it *is* current
first.

Once all four are answered: enter the services in **Admin → Setup**, then run
`npm run db:demo-clear`. The sample-data banner disappears on its own when the
`dddddddd-` rows go (§4 of the handoff) — it is derived from the data, so there
is no flag to remember to switch off.

---

## The photographs — `public/photos/`

Ten images. `HANDOFF.md` outstanding item #8 asks for real photography for
`/gallery`, which until now had none — `lib/site.ts` uses the lacquer-swatch
colour system specifically *because* there were no photographs.

**Provenance is recorded here rather than in the filenames.** Everything under
`public/` is a public URL, and `…-customerselfie.webp` is not a URL to hand a
customer. The filenames are clean and stable; the uncertainty lives in this
table.

| File | Size | What it is | Confidence |
|---|---|---|---|
| `space-01-reception-and-manicure-stations.webp` | 1152×864 | The salon's reception desk, green hedge wall, two manicure stations | **The salon itself.** Verified by eye |
| `nails-01-ombre-rhinestone.webp` | 1280×960 | Ombre with rhinestones | **Salon's own work** — GRACE brand card in frame |
| `nails-02-brown-french-polkadot.webp` | 765×1020 | Brown french with polka dots | **Salon's own work** — brand card in frame |
| `nails-05-red-french-goldfoil.webp` | 765×1020 | Red french, gold foil accent, almond shape | **Salon's own work** — brand card in frame, verified by eye |
| `nails-08-red-floral.webp` | 765×1020 | Red with floral art | **Salon's own work** — brand card in frame |
| `nails-09-nude-squoval.webp` | 765×1020 | Nude squoval | **Salon's own work** — brand card in frame |
| `nails-03-nude-ombre-coffin.webp` | 765×1020 | Nude ombre, coffin shape | Unconfirmed — nothing ties it to this salon |
| `nails-04-yellow-coffin.webp` | 765×1020 | Yellow coffin. Carries a phone-camera watermark ("Hisense Infinity H50S 5G") and reads as a customer's own selfie posted to the GBP | Unconfirmed. Good social-proof texture |
| `nails-06-hotpink-square.webp` | 765×1020 | Hot pink, square | Unconfirmed |
| `nails-07-red-french-coffin.webp` | 720×884 | Red french, coffin | Unconfirmed, and **the most doubtful of the set** — satin backdrop and even studio lighting; looks like a catalogue photo rather than a phone shot. Verified by eye |

### What that means for captions

The five with the brand card can be captioned as the studio's own work. The
other four should not be, until the owner confirms them — `lib/site.ts` sets the
rule that the site makes only claims that are checkable, and "our work" over a
photo that may be a stock image is exactly the class of copy that rule exists to
keep out. `nails-07` in particular should be dropped rather than captioned if
the owner is unsure.

### Where they are likely to be used

- `/gallery` (`app/gallery/`) — the nail shots, once confirmed.
- Homepage hero, or an "our space" block — `space-01`. It is the only interior
  photograph in existence for this project.

Nothing references these files yet; putting them on a page is a separate piece
of work.
