/**
 * Site-level copy and configuration.
 *
 * NOTE ON NAP: name, address and phone are deliberately NOT in this file.
 * Spec §8 requires them to match the Google Business Profile byte for byte,
 * and the fastest way to break that is to keep a second copy. They live in the
 * `businesses` row and every page reads them from there — footer, contact page
 * and JSON-LD alike. To change them, change that one row.
 */

export const BUSINESS_SLUG = process.env.NEXT_PUBLIC_BUSINESS_SLUG ?? 'grace-nail-and-spa';

export const SITE = {
  tagline: 'Nails, massage and skin',
  /** The promise the whole build is organised around (spec §1). */
  heroLine: 'Book your treatment in under a minute.',
  heroSupport:
    'Pick a treatment, pick a time, done. No messaging back and forth, no waiting for someone to reply.',
  about: {
    lead: 'A small studio, three therapists, and enough time booked for each guest that nobody is rushed.',
    body: [
      'Grace started as two chairs and a folding table. What has not changed since is the length of the appointments — a 60-minute massage here is sixty minutes of massage, with the room turned around properly before the next guest arrives.',
      'Every treatment is done by a qualified therapist. Gel is soaked off, never filed off. Rooms and tools are sanitised between every guest, and we are happy to talk you through exactly how, because you should ask that everywhere you go.',
    ],
  },
  gallery: {
    lead: 'The colour range, and the rooms.',
    note: 'Swatches shown are the shades currently on the shelf. Ask for the full range in studio — we carry more than fits on a page.',
  },
} as const;

export const NAV = [
  { href: '/services', label: 'Treatments' },
  { href: '/about', label: 'About' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
] as const;

/** 0 = Sunday, matching working_hours.day_of_week. */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
