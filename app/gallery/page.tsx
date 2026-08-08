import type { Metadata } from 'next';
import Link from 'next/link';
import { BookButton } from '@/components/book-button';
import { getActiveServices, getBusiness } from '@/lib/public-data';
import { lacquerFor } from '@/lib/palette';
import { formatDuration, formatZar } from '@/lib/money';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Our treatments at a glance, each with its own colour. Book any of them online.',
};

/**
 * A gallery for a nail bar is its colour range, so that is what this page is.
 *
 * There is deliberately no stock photography here: borrowed images of someone
 * else's studio would misrepresent the room a guest actually walks into.
 * Studio photographs belong on the Google Business Profile, which is linked,
 * and can be dropped in here once the owner has her own.
 */
export default async function GalleryPage() {
  const business = (await getBusiness())!;
  const services = await getActiveServices(business.id);

  return (
    <div className="mx-auto max-w-5xl px-5 pt-14 pb-4 sm:pt-20">
      <p className="text-xs tracking-[0.22em] text-gilt-600 uppercase">Gallery</p>
      <h1 className="font-display mt-4 max-w-[13ch] text-[2.5rem] leading-[1] font-semibold text-aubergine-900 sm:text-6xl">
        {SITE.gallery.lead}
      </h1>
      <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-mauve-500">
        {SITE.gallery.note}
      </p>

      <ul className="mt-14 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-5">
        {services.map((service) => {
          const lacquer = lacquerFor(service.name);
          return (
            <li key={service.id}>
              <Link href={`/book?service=${service.id}`} className="group block">
                {/* A poured colour tile — the swatch shape at display size. */}
                <span
                  aria-hidden="true"
                  className="swatch block aspect-[3/4] w-full transition-transform duration-300 group-hover:-translate-y-1"
                  style={{
                    ['--swatch' as string]: lacquer.base,
                    ['--swatch-tint' as string]: lacquer.tint,
                  }}
                />
                <span
                  className="mt-3 block font-mono text-[0.65rem] tracking-[0.14em] uppercase"
                  style={{ color: lacquer.ink }}
                >
                  {lacquer.shade}
                </span>
                <span className="mt-1 block text-sm leading-snug text-aubergine-900">
                  {service.name}
                </span>
                <span className="tabular mt-1 block text-xs text-mauve-400">
                  {formatDuration(service.duration_minutes)} · {formatZar(service.price_cents)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-20 border-t border-gilt-200/70 pt-10">
        <h2 className="font-display text-2xl font-semibold text-aubergine-900">The studio</h2>
        <p className="mt-3 max-w-lg text-[0.95rem] leading-relaxed text-mauve-500">
          Photographs of the rooms live on our Google listing, where they sit beside the reviews and
          stay current.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          {business.google_maps_url && (
            <a
              href={business.google_maps_url}
              className="text-sm text-lacquer-500 underline underline-offset-4 hover:text-lacquer-600"
            >
              See the studio on Google
            </a>
          )}
          <BookButton variant="outline" />
        </div>
      </div>
    </div>
  );
}
