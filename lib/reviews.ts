/**
 * Guest reviews, transcribed from the Google Business Profile.
 *
 * ---------------------------------------------------------------------------
 * WHERE THESE CAME FROM, AND WHY THEY ARE TEXT RATHER THAN SCREENSHOTS
 *
 * The owner supplied five screenshots of the review panel on the profile in
 * August 2026 (four reviews; one was sent twice). The screenshots themselves
 * are not committed, for the same reason the shopfront banner is not: every
 * part of them that matters is transcribed here, and nothing on the site
 * depends on the files. See docs/source-material/README.md.
 *
 * Rebuilding them as text rather than publishing the images was not only a
 * filing decision. A screenshot of a review is a fixed-width picture of small
 * grey type: it cannot reflow on a phone, it cannot be read aloud, it cannot be
 * selected or found, it goes soft on a retina screen, and it carries the
 * reviewer's Google profile photograph, which is a real person's face we have
 * no permission to republish. Set as text it does all of those things properly,
 * and the initial in a disc stands in for the avatar.
 *
 * ---------------------------------------------------------------------------
 * THE QUOTES ARE VERBATIM. DO NOT TIDY THEM.
 *
 * "U made my birthday so relaxing. Thank u.. my sister's enjoyed..." is how it
 * was left, double full stops and all. Correcting the spelling would make it
 * read as copy we wrote about ourselves, which is the one thing a review has to
 * avoid. If a quote has to be shortened, mark the cut with an ellipsis rather
 * than closing the gap silently.
 *
 * ---------------------------------------------------------------------------
 * ⛔ THESE FOUR ARE NOT A RATING FOR THE BUSINESS
 *
 * They are four five-star reviews off a profile that shows 3.7 across 77. The
 * homepage may quote them, because they are real and they are the owner's to
 * quote, but it must not add them up:
 *
 *   - no "rated 5 stars", no average, no review count anywhere in the copy;
 *   - no `aggregateRating` and no `review` in the JSON-LD, which is a separate
 *     and firmer rule already recorded in components/local-business-jsonld.tsx
 *     (Google forbids a site marking up its own ratings about itself);
 *   - the section links out to the profile, so the reader is one tap from all
 *     of them rather than only these.
 *
 * That link is what keeps the section honest. Do not remove it.
 * ---------------------------------------------------------------------------
 */

export interface Review {
  author: string;
  /** Google's own badge on the reviewer, shown where it was shown. */
  localGuide: boolean;
  /** Reviews Google credits to that reviewer. A reader's check on the source. */
  reviewCount: number;
  /** Out of five, as left. */
  rating: number;
  /** Verbatim. Spelling, punctuation and all. See the note above. */
  quote: string;
  /**
   * The year it was left, NOT the relative age Google printed.
   *
   * The screenshots say "6 months ago" and "a year ago", which were true the
   * day they were taken and quietly stop being true afterwards. A year is
   * coarser and stays correct: "6 months ago" from August 2026 is 2026, "a year
   * ago" is 2025. Anything more precise than the year would be invented.
   */
  year: number;
}

/**
 * The lead review, set as the section's pull quote: it is the longest, the most
 * specific, and the only one that names a treatment and a repeat visit.
 *
 * ON THE R100 LINE. The quote mentions paying for "their January special (R100
 * for 45min massage)". It is plainly past tense and tied to a named month, so
 * it reads as a promotion that has been and gone, but it is still a price on
 * the homepage that the price list does not offer. It is quoted in full because
 * that is what she wrote. If the studio would rather it were not there, cut
 * from "and it felt" to "45min massage)" and leave an ellipsis in its place, so
 * the quote still shows it has been shortened.
 */
export const LEAD_REVIEW: Review = {
  author: 'Lindokuhle Magasela',
  localGuide: true,
  reviewCount: 11,
  rating: 5,
  quote:
    'The massage I had was absolutely divine. The ladies were professional and did an amazing job on our full body massages. This was our third time returning for this treatment and it felt like such a bargain because we had paid for their January special (R100 for 45min massage). I would definitely recommend them for full body, foot and back massages. We got more than what we had expected.',
  year: 2026,
};

/**
 * The three short ones, which sit in a row under the lead.
 *
 * Ordered so the row opens on the one that says the most about the work
 * (service, cleanliness, speed, price) and closes on the shortest.
 */
export const SHORT_REVIEWS: Review[] = [
  {
    author: 'Rachel Molongoana',
    localGuide: true,
    reviewCount: 26,
    rating: 5,
    quote:
      'Great customer service, clean space, faster than most places, without compromising quality. Prices are also fair.',
    year: 2025,
  },
  {
    author: 'Neo Maluleka',
    localGuide: true,
    reviewCount: 65,
    rating: 5,
    quote: "U made my birthday so relaxing. Thank u.. my sister's enjoyed... Will b back soon for sure..",
    year: 2025,
  },
  {
    /**
     * Google truncated this one in the panel with its own "…More", so what is
     * quoted is the complete sentence that was visible and not the whole
     * review. The screenshot also carries Google's structured-question label,
     * "Requested style:", which is Google's furniture rather than her words and
     * is left off.
     */
    author: 'Jane Steuart',
    localGuide: false,
    reviewCount: 6,
    rating: 5,
    quote: 'Exactly what I wanted - thank you.',
    year: 2025,
  },
];
