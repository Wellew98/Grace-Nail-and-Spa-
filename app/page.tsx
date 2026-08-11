import Image from 'next/image';
import Link from 'next/link';
import { BookButton } from '@/components/book-button';
import { GraceMark } from '@/components/grace-mark';
import { Swatch } from '@/components/swatch';
import { getActiveServices, getBusiness, getOpeningHours } from '@/lib/public-data';
import { summariseOpeningHours } from '@/lib/hours';
import { lacquerFor } from '@/lib/palette';
import { formatDuration, formatZar } from '@/lib/money';
import { formatPhoneForDisplay } from '@/lib/phone';
import { NAIL_PHOTOS, STUDIO_PHOTO } from '@/lib/photos';
import { SITE } from '@/lib/site';

export default async function HomePage() {
  const business = (await getBusiness())!;
  const [allServices, hours] = await Promise.all([
    getActiveServices(business.id),
    getOpeningHours(business.id),
  ]);

  const hoursLine = summariseOpeningHours(hours);

  /**
   * The homepage shows a SELECTION, not the whole menu.
   *
   * The real price list is 43 treatments. Rendered in full this page was 86
   * booking links long — a wall of waxing prices between the hero and the
   * photographs, on the one page where the job is to get a thumb onto "Book a
   * treatment". `/services` is where the full list belongs and it is linked
   * from both blocks.
   *
   * Which ones appear is `sort_order`, which the owner controls in
   * Admin → Setup. That is deliberate: choosing "featured" treatments in code
   * would mean she cannot change her own shop window without a deploy.
   */
  const featured = allServices.slice(0, 6);
  const strip = allServices.slice(0, 10);

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
          banner's too. The photograph is desktop-only: the whole reason the
          hero has never carried an image is that one pushes the button below
          the fold on a phone, and that is still true. -------------------- */}
      <section className="relative isolate overflow-hidden border-b border-gilt-200/70 bg-gradient-to-b from-blush-200 via-blush-100 to-blush-50">
        <div
          aria-hidden="true"
          className="photo-fade pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] lg:block"
        >
          <Image
            src={STUDIO_PHOTO.src}
            alt=""
            fill
            sizes="44vw"
            priority
            className="object-cover object-[60%_center] opacity-60"
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-5 pt-10 pb-14 sm:pt-14 sm:pb-20">
          <GraceMark
            title={business.name}
            className="h-20 w-20 text-aubergine-900 sm:h-28 sm:w-28"
          />

          <p className="mt-7 text-[0.7rem] tracking-[0.28em] text-gilt-600 uppercase">
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

      {/* ---------------- the swatch strip: the signature ----------------
          The treatments, as the colour range. Each stick books its treatment
          directly, so the most decorative thing on the page is also the
          shortest path to the one job the site exists to do. */}
      <section aria-labelledby="range-heading" className="mt-14 sm:mt-20">
        <h2 id="range-heading" className="sr-only">
          Our treatments
        </h2>

        {/* items-start, not items-end: the sticks share a top edge so a
            two-line treatment name cannot shove its swatch out of line.
            Left-aligned to the same container as the hero, scrolling on
            narrow screens rather than centring. */}
        <div className="mx-auto max-w-5xl">
          <ul className="scrollbar-none flex items-start gap-5 overflow-x-auto px-5 pb-2 sm:gap-7">
            {strip.map((service, index) => {
              const lacquer = lacquerFor(service.name);
              return (
                <li key={service.id} className="w-[7.5rem] shrink-0">
                  <Link
                    href={`/book?service=${service.id}`}
                    className="group block text-left"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <span className="swatch-rise block">
                      <Swatch
                        serviceName={service.name}
                        size="stick"
                        className="transition-transform duration-300 group-hover:-translate-y-1.5"
                      />
                    </span>
                    <span
                      className="mt-3 block font-mono text-[0.65rem] tracking-[0.12em] uppercase"
                      style={{ color: lacquer.ink }}
                    >
                      {lacquer.shade}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-aubergine-900">
                      {service.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------------- treatments list ---------------- */}
      <section aria-labelledby="treatments-heading" className="mx-auto mt-20 max-w-5xl px-5 sm:mt-28">
        <div className="flex items-baseline justify-between gap-4 border-b border-gilt-200/70 pb-4">
          <h2 id="treatments-heading" className="font-display text-2xl font-semibold text-aubergine-900">
            Treatments
          </h2>
          <Link
            href="/services"
            className="text-sm text-lacquer-500 underline-offset-4 hover:underline"
          >
            All treatments
          </Link>
        </div>

        <ul>
          {featured.map((service) => (
            <li key={service.id}>
              <Link
                href={`/book?service=${service.id}`}
                className="group flex items-center gap-5 border-b border-blush-200 py-5 transition-colors hover:bg-blush-100/70"
              >
                <Swatch serviceName={service.name} size="chip" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.05rem] leading-tight text-aubergine-900">
                    {service.name}
                  </span>
                  <span className="mt-1 block text-xs tracking-wide text-mauve-400">
                    {formatDuration(service.duration_minutes)}
                  </span>
                </span>
                <span className="tabular text-[0.95rem] font-medium text-aubergine-900">
                  {formatZar(service.price_cents)}
                </span>
                <span
                  aria-hidden="true"
                  className="text-mauve-400 transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/services"
          className="mt-7 inline-block text-sm text-lacquer-500 underline-offset-4 hover:underline"
        >
          See all {allServices.length} treatments and prices
        </Link>
      </section>

      {/* ---------------- the studio ----------------
          The only interior photograph that exists for this project, and the
          first time a visitor can see the room before walking into it. It sits
          after the treatments rather than in the hero on purpose: the hero's
          job is to get someone to /book in one tap, and a large image above it
          pushes that button below the fold on a phone. */}
      <section aria-labelledby="studio-heading" className="mx-auto mt-20 max-w-5xl px-5 sm:mt-28">
        <div className="grid gap-8 sm:grid-cols-2 sm:items-center sm:gap-12">
          <div className="overflow-hidden rounded-2xl bg-blush-100">
            <Image
              src={STUDIO_PHOTO.src}
              alt={STUDIO_PHOTO.alt}
              width={STUDIO_PHOTO.width}
              height={STUDIO_PHOTO.height}
              sizes="(min-width: 640px) 32rem, 100vw"
              className="w-full object-cover"
            />
          </div>

          <div>
            <p className="text-xs tracking-[0.22em] text-gilt-600 uppercase">Our space</p>
            <h2
              id="studio-heading"
              className="font-display mt-4 max-w-[15ch] text-3xl leading-tight font-semibold text-aubergine-900 sm:text-4xl"
            >
              Two stations, a treatment room, and no rush.
            </h2>
            <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-mauve-500">
              We are on Amanda Avenue in Glenanda. Come in for a gel colour on your lunch break, or
              settle in for an hour on the table.
            </p>
            <Link
              href="/gallery"
              className="mt-6 inline-block text-sm text-lacquer-500 underline-offset-4 hover:underline"
            >
              See the studio and our work
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- recent work ----------------
          A scrolling strip rather than a grid: it echoes the swatch strip
          above it, and on a phone it costs one screen instead of four. */}
      <section aria-labelledby="work-heading" className="mt-20 sm:mt-28">
        <div className="mx-auto max-w-5xl px-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="work-heading" className="font-display text-2xl font-semibold text-aubergine-900">
              From the studio
            </h2>
            <Link href="/gallery" className="text-sm text-lacquer-500 underline-offset-4 hover:underline">
              Full gallery
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-5xl">
          <ul className="scrollbar-none flex gap-3 overflow-x-auto px-5 pb-2 sm:gap-4">
            {NAIL_PHOTOS.slice(0, 6).map((photo) => (
              <li key={photo.src} className="w-40 shrink-0 sm:w-52">
                <div className="overflow-hidden rounded-xl bg-blush-100">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes="(min-width: 640px) 13rem, 10rem"
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- closing band ---------------- */}
      <section className="mx-auto mt-20 max-w-5xl px-5 sm:mt-28">
        <div className="rounded-2xl bg-aubergine-900 px-7 py-12 sm:px-12 sm:py-16">
          <h2 className="font-display max-w-[16ch] text-3xl leading-tight font-semibold text-blush-50 sm:text-4xl">
            Pick a time that suits you, not one that suits the diary.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-blush-200/80">
            Live availability for every therapist and every room. If you can see the time, you can
            have it.
          </p>
          <BookButton
            variant="solid"
            className="mt-8 bg-blush-50 text-aubergine-900 hover:bg-blush-100"
          />
        </div>
      </section>
    </>
  );
}
