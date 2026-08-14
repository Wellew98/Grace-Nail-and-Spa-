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
 *
 * HOUSE STYLE: NO EM DASHES IN ANYTHING A VISITOR READS. Not here, not in a
 * page, not in a button label, not in an email subject. A comma, a colon or a
 * full stop, every time. This applies to the copy only; the comments in this
 * codebase are full of them and may stay that way. The assistant is told the
 * same rule in lib/ai/system-prompt.ts, since it is the one surface that
 * writes new sentences at runtime.
 * ---------------------------------------------------------------------------
 */
export const SITE = {
  tagline: 'Nail artistry and spa treatments',
  /**
   * The hero headline is the studio's own shopfront line, finished with ours.
   *
   * The banner outside 11 Amanda Avenue says SCHEDULE AN APPOINTMENT in heavy
   * black caps, with the hours and the phone number under it. That is how this
   * business already asks for the booking, in its own words, and a customer who
   * has walked past the shop should recognise the page. `heroPromise` is spec
   * §1's promise — the part the shopfront cannot offer — and the two are set as
   * one sentence: "Schedule an appointment in under a minute."
   */
  heroLine: 'Schedule an appointment',
  heroPromise: 'in under a minute.',
  /** Where the studio is, in the profile's own words. Sits above the headline. */
  heroPlace: 'Glenanda, Johannesburg',
  /** The banner's own words for its phone number. */
  heroContact: 'Get in touch',
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
  /**
   * The homepage's review section. The reviews themselves are in
   * lib/reviews.ts, with the rules about what may and may not be said around
   * them: quoted verbatim, never added up into a rating, always one tap from
   * the full listing.
   *
   * `note` carries that last part and is the reason the section can run at all,
   * so it keeps the link in it. "Quoted as they were left" is doing real work
   * too: it tells the reader why one of them is written in text-speak, which
   * otherwise looks like a typo on our side rather than a guest's own voice.
   */
  reviews: {
    heading: 'In their own words',
    note: 'Four of the reviews on our Google listing, quoted as they were left.',
    link: 'Read them all on Google',
  },
  gallery: {
    lead: 'Our work, and our room.',
    // The photographs are the studio's own, off its Google Business Profile.
    // The line says where they came from and nothing about who did the nails:
    // five of the nine carry the studio's brand card, four are unestablished.
    // See lib/photos.ts.
    note: 'Nail work and the studio itself, straight from our Google listing. The polish range is far bigger than any page. Come and see it, or ask us for a shade.',
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
