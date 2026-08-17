/**
 * The studio's own photographs, from its Google Business Profile.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A MODULE AND NOT A `readdir` OF public/photos
 *
 * Two things have to travel with each file and cannot be derived from it: the
 * alt text, and how much we actually know about where it came from.
 *
 * The alt text matters because these are the only photographs on the site — a
 * gallery of ten unlabelled images is unusable with a screen reader, and
 * "nails-06-hotpink-square.webp" is not a description.
 *
 * The provenance matters because of the rule at the top of `lib/site.ts`: the
 * site makes only claims that can be checked. Five of these carry the studio's
 * own brand card in frame, so they are demonstrably its work. Four do not —
 * one of them is a customer's selfie and one looks like a catalogue photo. So
 * nothing here is captioned "our work". The gallery says where the pictures
 * came from, which is true of all of them, and says nothing about who did the
 * nails, which is not established for four.
 *
 * `docs/source-material/README.md` has the full reasoning. When the owner
 * confirms the four, `ownWork` is the only thing that needs changing.
 * ---------------------------------------------------------------------------
 */

export interface Photo {
  src: string;
  /** Intrinsic size, so next/image can reserve space and never shift layout. */
  width: number;
  height: number;
  /** Describes the image itself. Never a claim about who made it. */
  alt: string;
  /**
   * Is the studio's own brand card visible in the shot?
   *
   * The only evidence available without asking the owner. False does not mean
   * "not theirs" — it means "not established", which is why the site does not
   * assert it either way.
   */
  ownWork: boolean;
}

/** The nail work. Ordered so the strongest shots land first. */
export const NAIL_PHOTOS: Photo[] = [
  {
    src: '/photos/nails-01-ombre-rhinestone.webp',
    width: 1280,
    height: 960,
    alt: 'Long ombre nails in pink and white, finished with rhinestones along the cuticle.',
    ownWork: true,
  },
  {
    src: '/photos/nails-05-red-french-goldfoil.webp',
    width: 765,
    height: 1020,
    alt: 'Almond nails with red french tips and gold foil flecks on two accent nails.',
    ownWork: true,
  },
  {
    src: '/photos/nails-08-red-floral.webp',
    width: 765,
    height: 1020,
    alt: 'Deep red nails with hand-painted floral detail.',
    ownWork: true,
  },
  {
    src: '/photos/nails-02-brown-french-polkadot.webp',
    width: 765,
    height: 1020,
    alt: 'Brown french tips with white polka dots on the accent nails.',
    ownWork: true,
  },
  {
    src: '/photos/nails-09-nude-squoval.webp',
    width: 765,
    height: 1020,
    alt: 'Short nude nails in a soft squoval shape with a glossy finish.',
    ownWork: true,
  },
  {
    src: '/photos/nails-03-nude-ombre-coffin.webp',
    width: 765,
    height: 1020,
    alt: 'Coffin-shaped nails in a nude to white ombre.',
    ownWork: false,
  },
  {
    src: '/photos/nails-06-hotpink-square.webp',
    width: 765,
    height: 1020,
    alt: 'Square nails in a bright hot pink.',
    ownWork: false,
  },
  {
    src: '/photos/nails-07-red-french-coffin.webp',
    width: 720,
    height: 884,
    alt: 'Long coffin nails with bright red french tips.',
    ownWork: false,
  },
  {
    src: '/photos/nails-04-yellow-coffin.webp',
    width: 765,
    height: 1020,
    alt: 'Coffin nails in a soft buttery yellow.',
    ownWork: false,
  },
];

/**
 * The studio itself. One photograph, and the only interior shot in existence
 * for this project — which is why it carries the "our space" section on its own
 * rather than sitting in a grid.
 */
export const STUDIO_PHOTO: Photo = {
  src: '/photos/space-01-reception-and-manicure-stations.webp',
  width: 1152,
  height: 864,
  alt: 'The studio: a wooden reception desk, a green foliage wall and two manicure stations with pink linens.',
  ownWork: true,
};
