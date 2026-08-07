import Link from 'next/link';
import { BookButton } from '@/components/book-button';
import { Swatch } from '@/components/swatch';
import { getActiveServices, getBusiness } from '@/lib/public-data';
import { lacquerFor } from '@/lib/palette';
import { formatDuration, formatZar } from '@/lib/money';
import { formatPhoneForDisplay } from '@/lib/phone';
import { SITE } from '@/lib/site';

export default async function HomePage() {
  const business = (await getBusiness())!;
  const services = await getActiveServices(business.id);

  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="mx-auto max-w-5xl px-5 pt-14 pb-4 sm:pt-24">
        <p className="text-xs tracking-[0.22em] text-gilt-600 uppercase">{SITE.tagline}</p>

        <h1 className="font-display mt-5 max-w-[13ch] text-[2.75rem] leading-[0.95] font-semibold text-aubergine-900 sm:text-7xl">
          {SITE.heroLine}
        </h1>

        <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-mauve-500">
          {SITE.heroSupport}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <BookButton />
          <a
            href={`tel:${business.phone}`}
            className="text-sm text-mauve-500 underline-offset-4 hover:text-aubergine-900 hover:underline"
          >
            or call {formatPhoneForDisplay(business.phone)}
          </a>
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
            {services.map((service, index) => {
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
          {services.map((service) => (
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
