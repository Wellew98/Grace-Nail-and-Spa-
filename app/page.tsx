import Image from 'next/image';
import Link from 'next/link';
import { BookButton } from '@/components/book-button';
import { GraceMark } from '@/components/grace-mark';
import { Swatch } from '@/components/swatch';
import { getActiveServices, getBusiness, getOpeningHours } from '@/lib/public-data';
import { summariseOpeningHours } from '@/lib/hours';
import { DESTINATION_LACQUERS } from '@/lib/palette';
import { formatPhoneForDisplay } from '@/lib/phone';
import { STUDIO_PHOTO } from '@/lib/photos';
import { SITE } from '@/lib/site';

export default async function HomePage() {
  const business = (await getBusiness())!;
  const [allServices, hours] = await Promise.all([
    getActiveServices(business.id),
    getOpeningHours(business.id),
  ]);

  const hoursLine = summariseOpeningHours(hours);

  /**
   * The four doors off the homepage, in the order a first-time visitor wants
   * them: what it costs, what it looks like, who you are dealing with, how to
   * reach them. Booking is not among them on purpose — it is the hero's button
   * and the button in the header, and it should not queue behind four
   * alternatives.
   *
   * Each is a painted nail in its own shade. The treatment count is read from
   * the database rather than written down, so the door cannot promise a number
   * the price list does not have.
   */
  const destinations = [
    {
      href: '/services',
      label: 'Treatments',
      line: `All ${allServices.length}, with prices`,
      lacquer: DESTINATION_LACQUERS.treatments,
    },
    {
      href: '/gallery',
      label: 'Gallery',
      line: SITE.gallery.lead,
      lacquer: DESTINATION_LACQUERS.gallery,
    },
    {
      href: '/about',
      label: 'About',
      line: 'The studio in Glenanda',
      lacquer: DESTINATION_LACQUERS.about,
    },
    {
      href: '/contact',
      label: 'Contact',
      line: 'Where to find us',
      lacquer: DESTINATION_LACQUERS.contact,
    },
  ];

  return (
    <>
      {/* ---------------- hero ----------------
          Built from the studio's own shopfront banner: the mark, then SCHEDULE
          AN APPOINTMENT in heavy caps, a rose line carrying the hours, and the
          phone number under "get in touch". A customer who has walked past
          11 Amanda Avenue should recognise this page as the same business.

          What the banner cannot do is take the booking, so the headline
          finishes in the site's own serif — "in under a minute" — and the
          button sits directly beneath it.

          The blush wash and the photograph bleeding in from the right are the
          banner's too.

          THE PHOTOGRAPH IS ON PHONES AS WELL NOW. It used to be desktop-only,
          on the rule that an image in the hero pushes the button below the fold
          on a phone. That rule is about images IN THE FLOW; this one is
          absolutely positioned behind the text and adds no height at all, so
          the button has not moved. It is narrower, dimmer and faded harder
          there so the copy still reads over it. ---------------------------- */}
      <section className="relative isolate overflow-hidden border-b border-gilt-200/70 bg-gradient-to-b from-blush-200 via-blush-100 to-blush-50">
        <div
          aria-hidden="true"
          className="photo-fade pointer-events-none absolute inset-y-0 right-0 w-[58%] sm:w-[50%] lg:w-[44%]"
        >
          <Image
            src={STUDIO_PHOTO.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 44vw, (min-width: 640px) 50vw, 58vw"
            priority
            className="object-cover object-[60%_center] opacity-40 sm:opacity-50 lg:opacity-60"
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-5 pt-12 pb-14 sm:pt-16 sm:pb-20">
          {/* The only logo on the page now that the header has given it up, so
              it is bigger than it was and stands on its own line rather than
              being tucked under the header. Left-aligned on the same edge as
              the eyebrow, the headline and the button: it is the first item in
              that column, not a centred crest floating above it. */}
          <GraceMark
            title={business.name}
            className="h-24 w-24 text-aubergine-900 sm:h-32 sm:w-32"
          />

          <p className="mt-8 text-[0.7rem] tracking-[0.28em] text-gilt-600 uppercase sm:mt-10">
            {SITE.heroPlace}
          </p>

          {/* The line break is a max-width in ch on the CAPS span, not on the
              h1: "APPOINTMENT" is wider than any sensible measure at this size,
              so a limit on the h1 would be overridden by that one word and then
              inherited by the serif line, which would wrap for no reason. */}
          <h1 className="mt-3 max-w-xl">
            <span className="block max-w-[12ch] text-[2.3rem] leading-[0.94] font-extrabold tracking-[-0.015em] text-aubergine-900 uppercase sm:text-[3.75rem]">
              {SITE.heroLine}
            </span>
            <span className="font-display mt-3 block text-2xl leading-tight font-semibold text-lacquer-500 sm:text-4xl">
              {SITE.heroPromise}
            </span>
          </h1>

          {/* The hours, on the rose rule the banner prints them on — but read
              from working_hours, so they cannot drift from the footer, the
              JSON-LD or what the booking engine will actually offer. */}
          {hoursLine && (
            <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.7rem] tracking-[0.12em] text-lacquer-600 uppercase">
              <span aria-hidden="true" className="h-px w-8 shrink-0 bg-lacquer-400" />
              <span className="tabular font-mono">{hoursLine}</span>
            </p>
          )}

          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-mauve-500">
            {SITE.heroSupport}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <BookButton />
            <p className="text-sm">
              <span className="block text-[0.68rem] tracking-[0.2em] text-gilt-600 uppercase">
                {SITE.heroContact}
              </span>
              <a
                href={`tel:${business.phone}`}
                className="mt-1 block font-medium text-aubergine-900 underline-offset-4 hover:text-lacquer-500 hover:underline"
              >
                {formatPhoneForDisplay(business.phone)}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- the four doors ----------------
          The homepage used to carry the whole site: a strip of ten treatments,
          six more with prices, the studio photograph, six gallery shots and a
          closing panel. Everything it offered lived on a page of its own as
          well, so the homepage was a duplicate of the site with a hero on top,
          and the one thing it is for — getting a thumb onto "Book a treatment"
          — was competing with about thirty other links.

          It is now the hero and four doors, each one a painted nail in its own
          shade: a nail bar's characteristic object is its colour range, the
          rest of the site is already built out of it, and four of them side by
          side read as a range rather than as four icons.
          ------------------------------------------------------------------ */}
      <nav aria-labelledby="explore-heading" className="mx-auto mt-14 max-w-5xl px-5 sm:mt-20">
        <h2 id="explore-heading" className="text-[0.7rem] tracking-[0.28em] text-gilt-600 uppercase">
          Have a look around
        </h2>

        <ul className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-4 sm:gap-5">
          {destinations.map((destination) => (
            <li key={destination.href}>
              <Link
                href={destination.href}
                className="group flex h-full items-center gap-4 rounded-2xl border border-gilt-200/70 bg-blush-100/60 p-4 transition-colors hover:bg-blush-100 sm:flex-col sm:items-start sm:gap-6 sm:p-6"
              >
                <Swatch
                  serviceName={destination.label}
                  lacquer={destination.lacquer}
                  size="tile"
                  className="transition-transform duration-300 group-hover:-translate-y-1"
                />

                <span className="min-w-0 flex-1 sm:flex-none">
                  <span className="font-display block text-lg leading-tight font-semibold text-aubergine-900">
                    {destination.label}
                  </span>
                  <span className="mt-1.5 block text-sm leading-snug text-mauve-500">
                    {destination.line}
                  </span>
                </span>

                {/* Only on a phone, where the row reads as a list item. In the
                    desktop grid the whole tile is obviously the target. */}
                <span
                  aria-hidden="true"
                  className="text-mauve-400 transition-transform group-hover:translate-x-0.5 sm:hidden"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
