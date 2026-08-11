/**
 * Site-level copy and configuration.
 *
 * NOTE ON NAP: name, address and phone are deliberately NOT in this file.
 * Spec §8 requires them to match the Google Business Profile byte for byte,
 * and the fastest way to break that is to keep a second copy. They live in the
 * `businesses` row and every page reads them from there — footer, contact page
 * and JSON-LD alike. To change them, change that one row.
 */

export const BUSINESS_SLUG = process.env.NEXT_PUBLIC_BUSINESS_SLUG ?? 'grace-nails-and-beauty-spa';

/**
 * Site copy.
 *
 * ---------------------------------------------------------------------------
 * GROUND RULES FOR EDITING THIS FILE
 *
 * Only two kinds of claim are allowed here:
 *
 *   1. Claims about the BOOKING SYSTEM, which are true by construction and can
 *      be checked against the code — appointment lengths exclude turnaround,
 *      a room is reserved alongside the therapist, every confirmation carries a
 *      link to move or cancel.
 *   2. Claims drawn from the business's OWN Google Business Profile description
 *      and listing — the location, the categories of work, the therapists.
 *
 * Anything else is an unverifiable claim about a real business. An earlier draft
 * of this file invented a founding story ("started as two chairs and a folding
 * table") and asserted specific hygiene practice; both were removed because
 * neither was ours to assert. If the owner confirms details like those, add
 * them — until then, do not.
 * ---------------------------------------------------------------------------
 */
export const SITE = {
  tagline: 'Nail artistry and spa treatments',
  /** The promise the whole build is organised around (spec §1). */
  heroLine: 'Book your treatment in under a minute.',
  heroSupport:
    'Pick a treatment, pick a time, done. No messaging back and forth, no waiting for someone to reply.',
  about: {
    // Drawn from the profile description: Glenanda, nail artistry and spa
    // treatments, beauty therapists, sessions tailored to the guest.
    lead: 'A beauty studio in Glenanda, from precision nail work to unhurried spa treatments.',
    body: [
      'Grace Nails and Beauty Spa sits in the heart of Glenanda, in the south of Johannesburg. Our beauty therapists take each session as its own thing rather than a slot to be filled, whether you are in for a gel colour or an hour on the table.',
      'Appointments are the length they say they are. The time it takes to turn a room around afterwards is booked separately, behind your appointment, so it never comes out of yours.',
    ],
  },
  gallery: {
    lead: 'Our work, and our room.',
    // The photographs are the studio's own, off its Google Business Profile.
    // The line says where they came from and nothing about who did the nails:
    // five of the nine carry the studio's brand card, four are unestablished.
    // See lib/photos.ts.
    note: 'Nail work and the studio itself, straight from our Google listing. The polish range is far bigger than any page — come and see it, or ask us for a shade.',
  },
} as const;

export const NAV = [
  { href: '/services', label: 'Treatments' },
  { href: '/about', label: 'About' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * Shown at the foot of /privacy. Bump it whenever that page's substance
 * changes — not for a typo. A notice carrying a date it has outgrown is worse
 * than one carrying no date, because it invites the reader to trust it.
 */
export const PRIVACY_LAST_UPDATED = 'August 2026';

/** 0 = Sunday, matching working_hours.day_of_week. */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
