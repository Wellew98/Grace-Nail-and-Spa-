import { NailRating } from '@/components/nail-rating';
import type { Review } from '@/lib/reviews';

/**
 * One review, in one of two sizes.
 *
 * `lead` sets the quote in the display serif at pull-quote size with no card
 * around it: the longest review is the section's statement and reads as the
 * page speaking, not as a tile. `card` is a bordered box for the short ones,
 * which sit three across underneath and are read as a set rather than one at a
 * time. Two sizes and no more, on the same rule as the swatch.
 *
 * THE MONOGRAM IS WHERE THE AVATAR WAS. Google's panel puts the reviewer's
 * profile photograph at the top left of every review, and that photograph is a
 * real person's face which is theirs and not ours to republish. An initial in a
 * blush disc holds the same corner and does the same job, which is to make the
 * quote read as a person rather than as a line of copy. It is aria-hidden
 * because the name is right beside it.
 */
export function ReviewQuote({ review, tone }: { review: Review; tone: 'lead' | 'card' }) {
  const lead = tone === 'lead';

  // "Local Guide · 26 reviews · 2025". The badge and the count are Google's own
  // credibility signals about the reviewer, kept because they are the reader's
  // way of telling a real guest from a line we typed. On the year rather than
  // "a year ago", see the note on Review.year.
  const meta = [
    review.localGuide ? 'Local Guide' : null,
    `${review.reviewCount} reviews`,
    String(review.year),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <figure
      className={
        lead ? '' : 'flex h-full flex-col rounded-2xl border border-gilt-200/70 bg-blush-50/80 p-5 sm:p-6'
      }
    >
      <NailRating rating={review.rating} />

      <blockquote
        className={
          lead
            ? 'font-display mt-5 max-w-3xl text-lg leading-snug font-semibold text-aubergine-900 sm:text-[1.45rem] sm:leading-[1.45]'
            : 'mt-4 flex-1 text-[0.95rem] leading-relaxed text-aubergine-800'
        }
      >
        <p>“{review.quote}”</p>
      </blockquote>

      <figcaption className={`flex items-center gap-3 ${lead ? 'mt-6' : 'mt-5'}`}>
        <span
          aria-hidden="true"
          className={`font-display flex shrink-0 items-center justify-center rounded-full border border-gilt-200 bg-blush-200 font-semibold text-aubergine-900 ${
            lead ? 'h-11 w-11 text-base' : 'h-9 w-9 text-sm'
          }`}
        >
          {review.author.charAt(0)}
        </span>

        <span className="min-w-0">
          <span
            className={`block font-medium text-aubergine-900 ${lead ? 'text-base' : 'text-sm'}`}
          >
            {review.author}
          </span>
          <span className="mt-0.5 block text-xs text-mauve-400">{meta}</span>
        </span>
      </figcaption>
    </figure>
  );
}
