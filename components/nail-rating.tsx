import { RATING_LACQUERS } from '@/lib/palette';
import { Swatch } from '@/components/swatch';

const SCALE = [1, 2, 3, 4, 5];

/**
 * A review's rating, counted in the site's own painted nails.
 *
 * The reviews arrived as screenshots of Google's panel, gold stars and all.
 * Copying the stars onto our page would be dressing our own site up as Google's
 * — and the site already has a mark that does the same job: the swatch is a
 * painted nail, five of them in a row read as a rating by position, and at a
 * nail bar the count is in the right unit.
 *
 * THE STARS ARE STILL THERE FOR A SCREEN READER. The row is aria-hidden and
 * carries a plain "5 out of 5" beside it, because a rating that only exists as
 * five decorative shapes is a rating some readers do not get at all. `dot` is
 * the smallest swatch size, which is what keeps five of them reading as a
 * measure rather than as five more pieces of art on a page that already has
 * photographs.
 */
export function NailRating({ rating, className = '' }: { rating: number; className?: string }) {
  const painted = Math.round(rating);

  // gap-1.5 and not gap-1. At `dot` size, five nails four pixels apart merge
  // into one pink lozenge and stop being countable, which for a rating is the
  // whole job.
  return (
    <p className={`flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">{painted} out of 5</span>
      {SCALE.map((step) => (
        <Swatch
          key={step}
          serviceName="rating"
          size="dot"
          lacquer={step <= painted ? RATING_LACQUERS.painted : RATING_LACQUERS.bare}
        />
      ))}
    </p>
  );
}
