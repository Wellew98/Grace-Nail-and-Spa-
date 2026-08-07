import type { Metadata } from 'next';
import Link from 'next/link';
import { BookButton } from '@/components/book-button';
import { Swatch } from '@/components/swatch';
import { getActiveServices, getBusiness, getStaffForService } from '@/lib/public-data';
import { lacquerFor } from '@/lib/palette';
import { formatDuration, formatZar } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Treatments',
  description: 'Massage, facials, gel nails and pedicures. Prices and times, with live booking.',
};

export default async function ServicesPage() {
  const business = (await getBusiness())!;
  const services = await getActiveServices(business.id);

  // Who performs what — a treatment offered by one therapist books up faster,
  // and saying so is more useful than hiding it.
  const therapists = await Promise.all(services.map((service) => getStaffForService(service.id)));

  return (
    <div className="mx-auto max-w-5xl px-5 pt-14 pb-4 sm:pt-20">
      <p className="text-xs tracking-[0.22em] text-gilt-600 uppercase">The range</p>
      <h1 className="font-display mt-4 max-w-[14ch] text-[2.5rem] leading-[1] font-semibold text-aubergine-900 sm:text-6xl">
        Every treatment, every price.
      </h1>
      <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-mauve-500">
        Times shown are the time you are on the table or at the desk. We block extra time behind
        every booking to turn the room around properly, so nobody is hurried out.
      </p>

      <ul className="mt-14">
        {services.map((service, index) => {
          const lacquer = lacquerFor(service.name);
          const staff = therapists[index];

          return (
            <li
              key={service.id}
              className="border-t border-gilt-200/70 py-9 first:border-t-0 sm:py-11"
            >
              <div className="flex gap-5 sm:gap-8">
                <Swatch serviceName={service.name} size="chip" className="mt-1 sm:h-24 sm:w-9" />

                <div className="min-w-0 flex-1">
                  <p
                    className="font-mono text-[0.65rem] tracking-[0.14em] uppercase"
                    style={{ color: lacquer.ink }}
                  >
                    {lacquer.shade}
                  </p>

                  <h2 className="font-display mt-1.5 text-2xl leading-tight font-semibold text-aubergine-900 sm:text-3xl">
                    {service.name}
                  </h2>

                  {service.description && (
                    <p className="mt-3 max-w-lg text-[0.95rem] leading-relaxed text-mauve-500">
                      {service.description}
                    </p>
                  )}

                  <p className="mt-4 text-xs tracking-wide text-mauve-400">
                    {formatDuration(service.duration_minutes)}
                    {staff.length === 1 && ` · with ${staff[0].name}`}
                    {staff.length > 1 && ` · ${staff.length} therapists`}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <span className="tabular font-display text-2xl font-semibold text-aubergine-900">
                      {formatZar(service.price_cents)}
                    </span>
                    <BookButton href={`/book?service=${service.id}`} variant="compact">
                      Book {service.name}
                    </BookButton>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-16 rounded-2xl border border-gilt-200 bg-blush-100 px-7 py-9">
        <h2 className="font-display text-xl font-semibold text-aubergine-900">
          Not sure which to book?
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-mauve-500">
          Tell us what is bothering you and we will point you at the right treatment. No obligation,
          and no upselling.
        </p>
        <Link
          href="/contact"
          className="mt-5 inline-block text-sm text-lacquer-500 underline underline-offset-4 hover:text-lacquer-600"
        >
          Ask us
        </Link>
      </div>
    </div>
  );
}
